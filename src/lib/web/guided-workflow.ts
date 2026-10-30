import "server-only";
import { metaFailureCode } from "../meta/failure";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { freezeRecord } from "../experiment/engine";
import { syntheticDemoNetwork } from "../experiment/network";
import { designExperiment } from "../meta/experiment-designer";
import { createEvidencePayload, type EvidencePayload } from "../meta/evidence";
import { createCompactEvidence } from "../meta/compact-evidence";
import { interpretEvidence } from "../meta/scientific-interpreter";
import { researchQuestionSchema, validateExperimentProposal } from "../meta/schemas";
import { readMetaEnvironment, type MetaClient, type MetaEnvironment } from "../meta/client";
import { configuredClient, safeWebProviderError } from "./workflow";
import type { GuidedDesign, GuidedResponse, MeasuredExperimentResult, RuntimeCall } from "./contracts";
import { MAX_PERCEPTION_RECEIPT, PerceptionRetentionError, retainedPerception } from "../perception/store";
import { FlightRecorder, perceptionRecorder } from "./flight-recorder";

const requestSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("design"), researchQuestion: researchQuestionSchema, stimulusAmplitude: z.number().min(0).max(1).multipleOf(.05).optional(), nextFromId: z.string().uuid().optional(), perceptionId: z.string().uuid().optional(), perceptionReceipt: z.string().max(MAX_PERCEPTION_RECEIPT).optional() }),
  z.strictObject({ action: z.literal("run"), id: z.string().uuid(), stimulusAmplitude: z.number().min(0).max(1).multipleOf(0.05).optional() }),
  z.strictObject({ action: z.literal("interpret"), id: z.string().uuid() }),
  z.strictObject({ action: z.literal("stimulus"), id: z.string().uuid(), perceptionId: z.string().uuid().nullable(), perceptionReceipt: z.string().max(MAX_PERCEPTION_RECEIPT).optional() }),
]);
type RecordEntry = { recorder: FlightRecorder; design: GuidedDesign; evidence?: EvidencePayload; result?: MeasuredExperimentResult; expires: number; pending?: boolean; variants?: Map<number, string> };
// Opaque capabilities, bounded process-local retention. Never accept client-supplied evidence.
const records = new Map<string, RecordEntry>();
const ttl = 2 * 60 * 60 * 1000;

export async function runGuidedAction(input: unknown, deps: { env?: MetaEnvironment; createClient?: (env: MetaEnvironment) => MetaClient } = {}): Promise<GuidedResponse> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    const id = input && typeof input === "object" && "id" in input && typeof input.id === "string" ? input.id : undefined;
    const recorder = id ? records.get(id)?.recorder : undefined;
    recorder?.event("error.recorded", { code: "request.validation" });
    return { ok: false, kind: "validation", error: "Choose design with a question, or run / interpret with a retained design ID.", ...(recorder ? { run_id: recorder.run_id, diagnostics: recorder.snapshot() } : {}) };
  }
  for (const [id, entry] of records) if (entry.expires < Date.now() && !entry.pending) records.delete(id);
  const action = parsed.data;
  if (action.action === "design" && action.perceptionId && action.stimulusAmplitude !== undefined) return { ok: false, kind: "validation", error: "SAM-derived input is measured and locked. Do not supply a synthetic amplitude with a perception result." };
  let entry = action.action === "design" ? undefined : records.get(action.id);
  let recorder = entry?.recorder ?? new FlightRecorder();
  const fail = (kind: "validation" | "configuration" | "provider", error: string, code = `${action.action}.${kind}`): GuidedResponse => {
    recorder.event("error.recorded", { code });
    return { ok: false, kind, error, run_id: recorder.run_id, diagnostics: recorder.snapshot() };
  };
  let requestedPerception;
  if ((action.action === "design" || action.action === "stimulus") && action.perceptionId) {
    try { requestedPerception = retainedPerception(action.perceptionId, action.perceptionReceipt); }
    catch (error) { return fail("validation", error instanceof PerceptionRetentionError ? error.message : "Unable to verify this stimulus. Re-analyze the video."); }
    if (!requestedPerception) return fail("validation", "Perception result is unavailable after a server restart or expiry. Re-analyze the video, then retry.");
  }
  if (action.action === "design") {
    const parent = action.nextFromId ? records.get(action.nextFromId) : undefined;
    if (parent?.result?.analysis?.nextExperiment.researchQuestion === action.researchQuestion) recorder = new FlightRecorder(parent.recorder);
    else if (requestedPerception) recorder = perceptionRecorder(requestedPerception);
    recorder.question(action.researchQuestion);
    recorder.perception(requestedPerception);
    if (requestedPerception) recorder.event("stimulus.accepted", { perceptionId: requestedPerception.id, amplitude: requestedPerception.measurement.amplitude });
  }
  if (action.action !== "design" && !entry) return fail("validation", "This design expired or the server restarted. Design the experiment again; displayed evidence remains available for inspection.");
  if (entry?.pending) return fail("validation", "This experiment already has an explicit request in progress.");
  if (action.action === "stimulus" && entry) {
    const perceptionInput = requestedPerception;
    const parent = entry.design;
    recorder = new FlightRecorder(entry.recorder);
    recorder.question(parent.researchQuestion);
    recorder.perception(perceptionInput);
    const amplitude = perceptionInput?.measurement.amplitude ?? parent.stimulusOverride?.originalAmplitude ?? parent.spec.stimulus.amplitude;
    const { spec } = validateExperimentProposal({ ...parent.spec, id: `stimulus-${randomUUID()}`, stimulus: { amplitude } }, syntheticDemoNetwork);
    recorder.spec(spec);
    recorder.event("stimulus.accepted", { amplitude, ...(perceptionInput ? { perceptionId: perceptionInput.id } : {}) });
    const design: GuidedDesign = freezeRecord({ run_id: recorder.run_id, diagnostics: recorder.snapshot(), researchQuestion: parent.researchQuestion, mode: parent.mode, id: randomUUID(), spec,
      runtimeCalls: parent.runtimeCalls.filter(call => call.task === "design"),
      ...(perceptionInput ? { perceptionInput, stimulusOverride: { sourceDesignId: parent.stimulusOverride?.sourceDesignId ?? parent.id, originalAmplitude: parent.stimulusOverride?.originalAmplitude ?? parent.spec.stimulus.amplitude, amplitude } } : {}) });
    if (records.size >= 100) { const oldest = [...records].find(([id, value]) => id !== action.id && !value.pending); if (oldest) records.delete(oldest[0]); }
    records.set(design.id, { recorder, design, expires: Date.now() + ttl });
    // Acceptance creates a draft. It never executes the engine or calls Muse.
    return { ok: true, design };
  }
  if (action.action === "run" && entry?.design.perceptionInput && action.stimulusAmplitude !== undefined && action.stimulusAmplitude !== entry.design.spec.stimulus.amplitude) {
    return fail("validation", "A SAM-derived amplitude is fixed by CausalFly geometry. Switch to Synthetic to adjust it manually.");
  }
  if (action.action === "run" && entry && action.stimulusAmplitude !== undefined && action.stimulusAmplitude !== entry.design.spec.stimulus.amplitude) {
    // Explicit approval forks a validated design; earlier evidence and analysis stay frozen.
    const parent = entry;
    const amplitude = action.stimulusAmplitude;
    const cachedId = parent.variants?.get(amplitude);
    entry = cachedId ? records.get(cachedId) : undefined;
    if (!entry) {
      const { spec } = validateExperimentProposal({ ...parent.design.spec, id: `stimulus-${randomUUID()}`, stimulus: { amplitude } }, syntheticDemoNetwork);
      recorder = new FlightRecorder(parent.recorder);
      recorder.question(parent.design.researchQuestion); recorder.spec(spec);
      recorder.event("stimulus.accepted", { amplitude });
      const design = freezeRecord({ ...parent.design, run_id: recorder.run_id, diagnostics: recorder.snapshot(), id: randomUUID(), spec, stimulusOverride: { sourceDesignId: parent.design.stimulusOverride?.sourceDesignId ?? parent.design.id, originalAmplitude: parent.design.stimulusOverride?.originalAmplitude ?? parent.design.spec.stimulus.amplitude, amplitude } });
      if (records.size >= 100) { const oldest = [...records].find(([id, value]) => id !== action.id && !value.pending); if (oldest) records.delete(oldest[0]); }
      entry = { recorder, design, expires: Date.now() + ttl };
      records.set(design.id, entry);
      parent.variants ??= new Map();
      parent.variants.set(amplitude, design.id);
    }
  }
  if (action.action === "run" && entry) {
    recorder = entry.recorder;
    if (entry.pending) return fail("validation", "This experiment already has an explicit request in progress.");
    if (!entry.result) {
      recorder.event("experiment.approved", { designId: entry.design.id });
      try {
        entry.evidence = createEvidencePayload({ run_id: recorder.run_id, researchQuestion: entry.design.researchQuestion, networkDefinition: syntheticDemoNetwork, experimentSpec: entry.design.spec, perceptionInput: entry.design.perceptionInput });
        recorder.measured(entry.evidence);
      } catch { return fail("validation", "The engine could not complete this experiment. Review the design and retry.", "engine.execution_failed"); }
      const compact = createCompactEvidence(entry.evidence);
      entry.result = freezeRecord({ run_id: recorder.run_id, diagnostics: recorder.snapshot(), researchQuestion: compact.researchQuestion, mode: entry.design.mode, spec: entry.design.spec, measuredEvidence: compact.comparison, provenance: compact.provenance, runtimeCalls: entry.design.runtimeCalls, ...(entry.design.perceptionInput ? { perceptionInput: entry.design.perceptionInput } : {}), ...(entry.design.stimulusOverride ? { stimulusOverride: entry.design.stimulusOverride } : {}) });
    }
    return { ok: true, design: entry.design, result: entry.result, diagnostics: recorder.snapshot() };
  }
  if (action.action === "interpret" && !entry?.evidence) return fail("validation", "Approve and run the design first. Interpretation requires immutable engine measurements.");
  if (entry?.result?.analysis) return { ok: true, design: entry.design, result: entry.result, diagnostics: recorder.snapshot() };
  const env = deps.env ?? readMetaEnvironment();
  let client: MetaClient;
  try { client = (deps.createClient ?? configuredClient)(env); }
  catch (error) {
    const code = metaFailureCode(error) === "CONFIGURATION_DISABLED" ? "CONFIGURATION_DISABLED" : "CONFIGURATION_INVALID";
    if (action.action === "design") recorder.event("meta.design.failed", { code });
    else recorder.interpretation("failed");
    return fail("configuration", code === "CONFIGURATION_DISABLED" ? safeWebProviderError(error) : "Meta configuration is invalid. Correct the server configuration; no fake fallback was used.", code);
  }
  if (entry) entry.pending = true;
  const requestedAt = new Date().toISOString();
  const model = client.mode === "META LIVE" ? env.META_MODEL?.trim() ?? "Model unavailable" : "FakeMetaClient / offline template";
  recorder.model(action.action === "design" ? "design" : "interpret", model, client.mode);
  if (action.action === "design") recorder.event("meta.design.requested", { model, mode: client.mode });
  else recorder.interpretation("requested");
  const audit = (): RuntimeCall => ({ task: action.action === "design" ? "design" : "interpret", mode: client.mode, model: client.mode === "META LIVE" ? env.META_MODEL?.trim() ?? "Model unavailable" : "FakeMetaClient / offline template", requestedAt, completedAt: new Date().toISOString() });
  try {
    if (action.action === "design") {
      const { spec: proposed } = await designExperiment(client, { researchQuestion: action.researchQuestion, networkDefinition: syntheticDemoNetwork, perceptionInput: requestedPerception, syntheticAmplitude: action.stimulusAmplitude });
      // The model sees the fixed input; only CausalFly assigns its authoritative amplitude.
      const amplitude = requestedPerception?.measurement.amplitude ?? action.stimulusAmplitude;
      const spec = amplitude === undefined ? proposed : validateExperimentProposal({ ...proposed, stimulus: { amplitude } }, syntheticDemoNetwork).spec;
      if (action.stimulusAmplitude !== undefined) recorder.event("stimulus.accepted", { amplitude: action.stimulusAmplitude, code: "user_selected_synthetic_input" });
      const id = randomUUID();
      recorder.spec(spec); recorder.event("meta.design.completed", { designId: id });
      const design = freezeRecord({ run_id: recorder.run_id, diagnostics: recorder.snapshot(), id, researchQuestion: action.researchQuestion, mode: client.mode, spec, runtimeCalls: [audit()], ...(requestedPerception ? { perceptionInput: requestedPerception } : {}), ...(amplitude !== undefined ? { stimulusOverride: { sourceDesignId: id, originalAmplitude: proposed.stimulus.amplitude, amplitude: spec.stimulus.amplitude } } : {}) });
      if (records.size >= 100) { const oldest = [...records].find(([, value]) => !value.pending); if (oldest) records.delete(oldest[0]); }
      records.set(design.id, { recorder, design, expires: Date.now() + ttl });
      return { ok: true, design };
    }
    const analysis = await interpretEvidence(client, entry!.evidence!);
    recorder.interpretation("completed", analysis);
    entry!.result = freezeRecord({ ...entry!.result!, diagnostics: recorder.snapshot(), mode: client.mode, analysis, runtimeCalls: [...entry!.design.runtimeCalls, audit()] });
    return { ok: true, design: entry!.design, result: entry!.result };
  } catch (error) {
    if (action.action === "design") recorder.event(error instanceof z.ZodError || error instanceof Error && error.message === "Meta response must be a complete JSON object; no experiment or analysis accepted." ? "meta.design.rejected" : "meta.design.failed", { code: metaFailureCode(error) });
    else recorder.interpretation("failed");
    return fail("provider", safeWebProviderError(error), metaFailureCode(error));
  }
  finally { if (entry) entry.pending = false; }
}
