import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import { syntheticDemoNetwork } from "../experiment/network";
import { freezeRecord } from "../experiment/engine";
import { readMetaEnvironment, type MetaClient, type MetaEnvironment } from "../meta/client";
import { createCompactEvidence } from "../meta/compact-evidence";
import { researchQuestionSchema } from "../meta/schemas";
import { createMetaClient, runAiExperiment } from "../meta/workflow";
import type { WebExperimentResponse, WebStatus } from "./contracts";

const inputSchema = z.strictObject({ researchQuestion: researchQuestionSchema });
const configurationError = "Meta Model API configuration is incomplete or invalid. Configure the server or use offline fake mode.";

export function configuredClient(env: MetaEnvironment): MetaClient {
  return createMetaClient(process.env.CAUSALFLY_FAKE_META === "1" ? "fake" : "auto", env);
}

/** Configuration status only; constructing a client never makes a provider call. */
export function getWebStatus(): WebStatus {
  try {
    return { mode: configuredClient(readMetaEnvironment()).mode };
  } catch {
    return { mode: null, error: configurationError };
  }
}

/** Fixed public messages, never SDK messages, bodies, headers or prompts. */
export function safeWebProviderError(error: unknown): string {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return "Meta Model API timed out. Please retry.";
  }
  if (error instanceof OpenAI.APIError && (error.status === 401 || error.status === 403)) {
    return "Meta Model API authentication failed. Check the server configuration.";
  }
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
  let client: MetaClient;
  try {
    client = (dependencies.createClient ?? configuredClient)(dependencies.env ?? readMetaEnvironment());
  } catch {
    return { ok: false, kind: "configuration", error: configurationError };
  }
  try {
    const result = await runAiExperiment(client, {
      researchQuestion: parsed.data.researchQuestion,
      networkDefinition: syntheticDemoNetwork,
    });
    const compact = createCompactEvidence(result.evidence);
    return freezeRecord({
      ok: true as const,
      result: {
        mode: result.mode,
        researchQuestion: compact.researchQuestion,
        spec: result.spec,
        measuredEvidence: compact.comparison,
        provenance: compact.provenance,
        analysis: result.analysis,
      },
    });
  } catch (error: unknown) {
    return { ok: false, kind: "provider", error: safeWebProviderError(error) };
  }
}
