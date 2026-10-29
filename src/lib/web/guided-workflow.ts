import "server-only";
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

const requestSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("design"), researchQuestion: researchQuestionSchema, perceptionId: z.string().uuid().optional(), perceptionReceipt: z.string().max(MAX_PERCEPTION_RECEIPT).optional() }),
  z.strictObject({ action: z.literal("run"), id: z.string().uuid(), stimulusAmplitude: z.number().min(0).max(1).multipleOf(0.05).optional() }),
  z.strictObject({ action: z.literal("interpret"), id: z.string().uuid() }),
  z.strictObject({ action: z.literal("stimulus"), id: z.string().uuid(), perceptionId: z.string().uuid().nullable(), perceptionReceipt: z.string().max(MAX_PERCEPTION_RECEIPT).optional() }),
]);
type RecordEntry = { design: GuidedDesign; evidence?: EvidencePayload; result?: MeasuredExperimentResult; expires: number; pending?: boolean; variants?: Map<number, string> };
// Opaque capabilities, bounded process-local retention. Never accept client-supplied evidence.
const records = new Map<string, RecordEntry>();
const ttl = 2 * 60 * 60 * 1000;

export async function runGuidedAction(input: unknown, deps: { env?: MetaEnvironment; createClient?: (env: MetaEnvironment) => MetaClient } = {}): Promise<GuidedResponse> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, kind: "validation", error: "Choose design with a question, or run / interpret with a retained design ID." };
  for (const [id, entry] of records) if (entry.expires < Date.now() && !entry.pending) records.delete(id);
  const action = parsed.data;
  let requestedPerception;
  if ((action.action === "design" || action.action === "stimulus") && action.perceptionId) {
    try { requestedPerception = retainedPerception(action.perceptionId, action.perceptionReceipt); }
    catch (error) { return { ok: false, kind: "validation", error: error instanceof PerceptionRetentionError ? error.message : "Unable to verify this stimulus. Re-analyze the video." }; }
    if (!requestedPerception) return { ok: false, kind: "validation", error: "Perception result is unavailable after a server restart or expiry. Re-analyze the video, then retry." };
  }
  let entry = action.action === "design" ? undefined : records.get(action.id);
  if (action.action !== "design" && !entry) return { ok: false, kind: "validation", error: "This design expired or the server restarted. Design the experiment again; displayed evidence remains available for inspection." };
  if (entry?.pending) return { ok: false, kind: "validation", error: "This experiment already has an explicit request in progress." };
  if (action.action === "stimulus" && entry) {
    const perceptionInput = requestedPerception;
    const parent = entry.design;
    const amplitude = perceptionInput?.measurement.amplitude ?? parent.stimulusOverride?.originalAmplitude ?? parent.spec.stimulus.amplitude;
    const { spec } = validateExperimentProposal({ ...parent.spec, id: `stimulus-${randomUUID()}`, stimulus: { amplitude } }, syntheticDemoNetwork);
    const design: GuidedDesign = freezeRecord({ researchQuestion: parent.researchQuestion, mode: parent.mode, id: randomUUID(), spec,
      runtimeCalls: parent.runtimeCalls.filter(call => call.task === "design"),
      ...(perceptionInput ? { perceptionInput, stimulusOverride: { sourceDesignId: parent.stimulusOverride?.sourceDesignId ?? parent.id, originalAmplitude: parent.stimulusOverride?.originalAmplitude ?? parent.spec.stimulus.amplitude, amplitude } } : {}) });
    if (records.size >= 100) { const oldest = [...records].find(([id, value]) => id !== action.id && !value.pending); if (oldest) records.delete(oldest[0]); }
    records.set(design.id, { design, expires: Date.now() + ttl });
    // Acceptance creates a draft. It never executes the engine or calls Muse.
    return { ok: true, design };
  }
  if (action.action === "run" && entry?.design.perceptionInput && action.stimulusAmplitude !== undefined && action.stimulusAmplitude !== entry.design.spec.stimulus.amplitude) {
    return { ok: false, kind: "validation", error: "A SAM-derived amplitude is fixed by CausalFly geometry. Switch to Synthetic to adjust it manually." };
  }
  if (action.action === "run" && entry && action.stimulusAmplitude !== undefined && action.stimulusAmplitude !== entry.design.spec.stimulus.amplitude) {
    // Explicit approval forks a validated design; earlier evidence and analysis stay frozen.
    const parent = entry;
    const amplitude = action.stimulusAmplitude;
    const cachedId = parent.variants?.get(amplitude);
    entry = cachedId ? records.get(cachedId) : undefined;
    if (!entry) {
      const { spec } = validateExperimentProposal({ ...parent.design.spec, id: `stimulus-${randomUUID()}`, stimulus: { amplitude } }, syntheticDemoNetwork);
      const design = freezeRecord({ ...parent.design, id: randomUUID(), spec, stimulusOverride: { sourceDesignId: parent.design.stimulusOverride?.sourceDesignId ?? parent.design.id, originalAmplitude: parent.design.stimulusOverride?.originalAmplitude ?? parent.design.spec.stimulus.amplitude, amplitude } });
      if (records.size >= 100) { const oldest = [...records].find(([id, value]) => id !== action.id && !value.pending); if (oldest) records.delete(oldest[0]); }
      entry = { design, expires: Date.now() + ttl };
      records.set(design.id, entry);
      parent.variants ??= new Map();
      parent.variants.set(amplitude, design.id);
    }
  }
  if (action.action === "run" && entry) {
    if (entry.pending) return { ok: false, kind: "validation", error: "This experiment already has an explicit request in progress." };
    if (!entry.result) {
      entry.evidence = createEvidencePayload({ researchQuestion: entry.design.researchQuestion, networkDefinition: syntheticDemoNetwork, experimentSpec: entry.design.spec, perceptionInput: entry.design.perceptionInput });
      const compact = createCompactEvidence(entry.evidence);
      entry.result = freezeRecord({ researchQuestion: compact.researchQuestion, mode: entry.design.mode, spec: entry.design.spec, measuredEvidence: compact.comparison, provenance: compact.provenance, runtimeCalls: entry.design.runtimeCalls, ...(entry.design.perceptionInput ? { perceptionInput: entry.design.perceptionInput } : {}), ...(entry.design.stimulusOverride ? { stimulusOverride: entry.design.stimulusOverride } : {}) });
    }
    return { ok: true, design: entry.design, result: entry.result };
  }
  if (action.action === "interpret" && !entry?.evidence) return { ok: false, kind: "validation", error: "Approve and run the design first. Interpretation requires immutable engine measurements." };
  if (entry?.result?.analysis) return { ok: true, design: entry.design, result: entry.result };
  const env = deps.env ?? readMetaEnvironment();
  let client: MetaClient;
  try { client = (deps.createClient ?? configuredClient)(env); }
  catch { return { ok: false, kind: "configuration", error: "Meta configuration is invalid. Correct the server configuration; no fake fallback was used." }; }
  if (entry) entry.pending = true;
  const requestedAt = new Date().toISOString();
  const audit = (): RuntimeCall => ({ task: action.action === "design" ? "design" : "interpret", mode: client.mode, model: client.mode === "META LIVE" ? env.META_MODEL?.trim() ?? "Model unavailable" : "FakeMetaClient / offline template", requestedAt, completedAt: new Date().toISOString() });
  try {
    if (action.action === "design") {
      const { spec: proposed } = await designExperiment(client, { researchQuestion: action.researchQuestion, networkDefinition: syntheticDemoNetwork, perceptionInput: requestedPerception });
      // The model sees the fixed input; only CausalFly assigns its authoritative amplitude.
      const spec = requestedPerception ? validateExperimentProposal({ ...proposed, stimulus: { amplitude: requestedPerception.measurement.amplitude } }, syntheticDemoNetwork).spec : proposed;
      const id = randomUUID();
      const design = freezeRecord({ id, researchQuestion: action.researchQuestion, mode: client.mode, spec, runtimeCalls: [audit()], ...(requestedPerception ? { perceptionInput: requestedPerception, stimulusOverride: { sourceDesignId: id, originalAmplitude: proposed.stimulus.amplitude, amplitude: spec.stimulus.amplitude } } : {}) });
      if (records.size >= 100) { const oldest = [...records].find(([, value]) => !value.pending); if (oldest) records.delete(oldest[0]); }
      records.set(design.id, { design, expires: Date.now() + ttl });
      return { ok: true, design };
    }
    const analysis = await interpretEvidence(client, entry!.evidence!);
    entry!.result = freezeRecord({ ...entry!.result!, mode: client.mode, analysis, runtimeCalls: [...entry!.design.runtimeCalls, audit()] });
    return { ok: true, design: entry!.design, result: entry!.result };
  } catch (error) { return { ok: false, kind: "provider", error: safeWebProviderError(error) }; }
  finally { if (entry) entry.pending = false; }
}
