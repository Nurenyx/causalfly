import "server-only";
import { z } from "zod";
import { freezeRecord } from "../experiment/engine";
import { readMetaEnvironment, type MetaClient, type MetaEnvironment } from "../meta/client";
import { createObservationalEvidence } from "../meta/observational-evidence";
import { interpretObservationalEvidence } from "../meta/observational-interpreter";
import { researchQuestionSchema } from "../meta/schemas";
import { configuredClient, safeWebProviderError } from "./workflow";
import type { WebObservationalResponse } from "./observational-contracts";

const inputSchema = z.strictObject({ researchQuestion: researchQuestionSchema, retentionId: z.uuid(),
  sessionId: z.string().min(1).max(200), sequences: z.array(z.number().int().nonnegative()).min(1).max(120) });

export async function runWebObservation(input: unknown, dependencies: {
  env?: MetaEnvironment; createClient?: (env: MetaEnvironment) => MetaClient; now?: number;
} = {}): Promise<WebObservationalResponse> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, kind: "validation", error: "Submit an exact question and a retained FruitFly evidence reference." };
  let evidence;
  try { evidence = createObservationalEvidence(parsed.data.researchQuestion, parsed.data, dependencies.now); }
  catch { return { ok: false, kind: "evidence", error: "This evidence window is no longer retained on the server. Reconnect to receive validated telemetry, then retry." }; }
  let client;
  try { client = (dependencies.createClient ?? configuredClient)(dependencies.env ?? readMetaEnvironment()); }
  catch { return { ok: false, kind: "configuration", error: "Meta Model API configuration is incomplete or invalid. Check the server configuration." }; }
  try {
    const analysis = await interpretObservationalEvidence(client, evidence);
    return freezeRecord({ ok: true as const, result: { mode: client.mode, evidence, analysis } });
  } catch (error) {
    return { ok: false, kind: "provider", error: safeWebProviderError(error).replace("The experiment", "The observational analysis") };
  }
}
