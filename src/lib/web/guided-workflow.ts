import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { freezeRecord } from "../experiment/engine";
import { syntheticDemoNetwork } from "../experiment/network";
import { designExperiment } from "../meta/experiment-designer";
import { createEvidencePayload, type EvidencePayload } from "../meta/evidence";
import { createCompactEvidence } from "../meta/compact-evidence";
import { interpretEvidence } from "../meta/scientific-interpreter";
import { researchQuestionSchema } from "../meta/schemas";
import { readMetaEnvironment, type MetaClient, type MetaEnvironment } from "../meta/client";
import { configuredClient, safeWebProviderError } from "./workflow";
import type { GuidedDesign, GuidedResponse, MeasuredExperimentResult, RuntimeCall } from "./contracts";

const requestSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("design"), researchQuestion: researchQuestionSchema }),
  z.strictObject({ action: z.literal("run"), id: z.string().uuid() }),
  z.strictObject({ action: z.literal("interpret"), id: z.string().uuid() }),
]);
type RecordEntry = { design: GuidedDesign; evidence?: EvidencePayload; result?: MeasuredExperimentResult; expires: number; pending?: boolean };
// Opaque capabilities, bounded process-local retention. Never accept client-supplied evidence.
const records = new Map<string, RecordEntry>();
const ttl = 2 * 60 * 60 * 1000;

export async function runGuidedAction(input: unknown, deps: { env?: MetaEnvironment; createClient?: (env: MetaEnvironment) => MetaClient } = {}): Promise<GuidedResponse> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, kind: "validation", error: "Choose design with a question, or run / interpret with a retained design ID." };
  for (const [id, entry] of records) if (entry.expires < Date.now() && !entry.pending) records.delete(id);
  const action = parsed.data;
  const entry = action.action === "design" ? undefined : records.get(action.id);
  if (action.action !== "design" && !entry) return { ok: false, kind: "validation", error: "This design expired or the server restarted. Design the experiment again; displayed evidence remains available for inspection." };
  if (entry?.pending) return { ok: false, kind: "validation", error: "This experiment already has an explicit request in progress." };
  if (action.action === "run" && entry) {
    if (!entry.result) {
      entry.evidence = createEvidencePayload({ researchQuestion: entry.design.researchQuestion, networkDefinition: syntheticDemoNetwork, experimentSpec: entry.design.spec });
      const compact = createCompactEvidence(entry.evidence);
      entry.result = freezeRecord({ researchQuestion: compact.researchQuestion, mode: entry.design.mode, spec: entry.design.spec, measuredEvidence: compact.comparison, provenance: compact.provenance, runtimeCalls: entry.design.runtimeCalls });
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
      const { spec } = await designExperiment(client, { researchQuestion: action.researchQuestion, networkDefinition: syntheticDemoNetwork });
      const design = freezeRecord({ id: randomUUID(), researchQuestion: action.researchQuestion, mode: client.mode, spec, runtimeCalls: [audit()] });
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
