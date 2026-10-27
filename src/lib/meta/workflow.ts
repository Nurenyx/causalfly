import { freezeRecord } from "../experiment/engine";
import type { NetworkDefinition } from "../experiment/types";
import { LiveMetaClient, readMetaEnvironment, type MetaClient, type MetaEnvironment } from "./client";
import { designExperiment } from "./experiment-designer";
import { createEvidencePayload } from "./evidence";
import { FakeMetaClient } from "./fake-client";
import { interpretEvidence } from "./scientific-interpreter";

export function createMetaClient(
  mode: "auto" | "fake" | "live" = "auto",
  env: MetaEnvironment = readMetaEnvironment(),
): MetaClient {
  if (mode === "fake") return new FakeMetaClient();
  const hasAnyConfiguration = [env.META_API_KEY, env.META_BASE_URL, env.META_MODEL]
    .some((value) => Boolean(value?.trim()));
  // Partial live configuration is an error, never a silent fake fallback.
  if (mode === "live" || hasAnyConfiguration) return new LiveMetaClient(env);
  return new FakeMetaClient();
}

export async function runAiExperiment(client: MetaClient, input: {
  researchQuestion: string;
  networkDefinition: NetworkDefinition;
}) {
  const snapshot = structuredClone(input);
  const { proposal, spec } = await designExperiment(client, snapshot);
  const evidence = createEvidencePayload({ ...snapshot, experimentSpec: spec });
  const analysis = await interpretEvidence(client, evidence);
  return freezeRecord({ mode: client.mode, proposal, spec, evidence, analysis });
}
