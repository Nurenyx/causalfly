import "server-only";
import { configuredEndpoint } from "../sources/fruitfly-bridge";
import { metaFailureCode } from "../meta/failure";
import { developerDiagnosticsEnabled } from "./diagnostic-policy";
import { z } from "zod";
import { syntheticDemoNetwork } from "../experiment/network";
import { freezeRecord } from "../experiment/engine";
import { readMetaEnvironment, type MetaClient, type MetaEnvironment } from "../meta/client";
import { createCompactEvidence } from "../meta/compact-evidence";
import { researchQuestionSchema } from "../meta/schemas";
import { createMetaClient } from "../meta/workflow";
import { designExperiment } from "../meta/experiment-designer";
import { createEvidencePayload } from "../meta/evidence";
import { interpretEvidence } from "../meta/scientific-interpreter";
import { FlightRecorder } from "./flight-recorder";
import type { WebExperimentResponse, WebStatus } from "./contracts";

const inputSchema = z.strictObject({ researchQuestion: researchQuestionSchema });
const configurationError = "Meta Model API configuration is incomplete or invalid. Configure the server or use offline fake mode.";

export function configuredClient(env: MetaEnvironment): MetaClient {
  return createMetaClient(env.CAUSALFLY_FAKE_META === "1" ? "fake" : "auto", env);
}

/** Configuration status only; constructing a client never makes a provider call. */
export function getWebStatus(): WebStatus {
  let researchConfigured = false;
  try { configuredEndpoint(process.env.FRUITFLY_XR_OBSERVATORY_URL); researchConfigured = true; } catch { /* No configured research endpoint. */ }
  try {
    return { researchConfigured, mode: configuredClient(readMetaEnvironment()).mode, developerDiagnostics: developerDiagnosticsEnabled() };
  } catch (error) {
    return { researchConfigured, mode: null, metaDisabled: metaFailureCode(error) === "CONFIGURATION_DISABLED", error: metaFailureCode(error) === "CONFIGURATION_DISABLED" ? safeWebProviderError(error) : configurationError, developerDiagnostics: developerDiagnosticsEnabled() };
  }
}

/** Fixed public messages, never SDK messages, bodies, headers or prompts. */
export function safeWebProviderError(error: unknown): string {
  const code = metaFailureCode(error);
  if (code === "CONFIGURATION_DISABLED") return "Live Meta is disabled on this server. Enable it explicitly or choose the offline fixture.";
  if (code === "PROVIDER_TIMEOUT") return "Meta Model API timed out. Please retry.";
  if (code === "AUTHENTICATION_FAILED") return "Meta Model API authentication failed. Check the server configuration.";
  if (code === "PROVIDER_RATE_LIMIT") return "Meta is temporarily rate limited. Wait a moment, then retry.";
  if (code === "REQUEST_CANCELLED") return "The Meta request was cancelled. Retry when ready.";
  if (code === "INVALID_PROVIDER_RESPONSE" || code === "SCHEMA_VALIDATION_FAILED") return "Meta returned an invalid design or interpretation. No output was accepted. Retry the explicit action.";
  return "The experiment could not be completed. Please retry. If this persists, check the server configuration.";
}

/** Thin adapter around the existing scientific loop; injection is server-only. */
export async function runWebExperiment(
  input: unknown,
  dependencies: { env?: MetaEnvironment; createClient?: (env: MetaEnvironment) => MetaClient } = {},
): Promise<WebExperimentResponse> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, kind: "validation", error: "Enter a research question between 1 and 8,000 characters." };
  }
  const recorder = new FlightRecorder();
  recorder.question(parsed.data.researchQuestion);
  const fail = (kind: "configuration" | "provider", error: string): WebExperimentResponse => {
    recorder.event("error.recorded", { code: kind });
    return { ok: false, kind, error, run_id: recorder.run_id, diagnostics: recorder.snapshot() };
  };
  const env = dependencies.env ?? readMetaEnvironment();
  let client: MetaClient;
  try {
    client = (dependencies.createClient ?? configuredClient)(env);
  } catch (error) {
    recorder.event("meta.design.failed", { code: metaFailureCode(error) === "CONFIGURATION_DISABLED" ? "CONFIGURATION_DISABLED" : "CONFIGURATION_INVALID" });
    return fail("configuration", metaFailureCode(error) === "CONFIGURATION_DISABLED" ? safeWebProviderError(error) : configurationError);
  }
  let stage: "design" | "engine" | "interpret" = "design";
  const model = client.mode === "META LIVE" ? env.META_MODEL?.trim() ?? "Model unavailable" : "FakeMetaClient / offline template";
  try {
    recorder.model("design", model, client.mode); recorder.event("meta.design.requested", { model, mode: client.mode });
    const { spec } = await designExperiment(client, {
      researchQuestion: parsed.data.researchQuestion,
      networkDefinition: syntheticDemoNetwork,
    });
    recorder.spec(spec); recorder.event("meta.design.completed");
    stage = "engine";
    // This legacy endpoint explicitly requests the complete workflow in one action.
    recorder.event("experiment.approved", { code: "explicit.complete_workflow_request" });
    const evidence = createEvidencePayload({ run_id: recorder.run_id, researchQuestion: parsed.data.researchQuestion, networkDefinition: syntheticDemoNetwork, experimentSpec: spec });
    recorder.measured(evidence);
    stage = "interpret";
    recorder.model("interpret", model, client.mode); recorder.interpretation("requested");
    const analysis = await interpretEvidence(client, evidence);
    recorder.interpretation("completed", analysis);
    const compact = createCompactEvidence(evidence);
    return freezeRecord({
      ok: true as const,
      result: {
        run_id: recorder.run_id,
        diagnostics: recorder.snapshot(),
        mode: client.mode,
        researchQuestion: compact.researchQuestion,
        spec,
        measuredEvidence: compact.comparison,
        provenance: compact.provenance,
        analysis,
      },
    });
  } catch (error: unknown) {
    if (stage === "design") recorder.event(error instanceof z.ZodError || error instanceof Error && error.message === "Meta response must be a complete JSON object; no experiment or analysis accepted." ? "meta.design.rejected" : "meta.design.failed");
    if (stage === "interpret") recorder.interpretation("failed");
    recorder.event("error.recorded", { code: metaFailureCode(error) });
    return fail("provider", safeWebProviderError(error));
  }
}
