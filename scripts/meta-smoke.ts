import { z } from "zod";
import { LiveMetaClient, readLiveConfiguration, readMetaEnvironment } from "../src/lib/meta/client";
import { formatMetaProviderError } from "../src/lib/meta/provider-errors";
import { smokeResponseSchema, validateSmokeResponse } from "../src/lib/meta/smoke";
import { loadProjectEnvironment } from "./load-environment";

async function main() {
  loadProjectEnvironment();
  const env = readMetaEnvironment();
  let config;
  try {
    config = readLiveConfiguration(env);
  } catch (error: unknown) {
    // The shared parser reports variable names and rules, never their values.
    console.error(error instanceof Error ? error.message : "Invalid Meta configuration.");
    process.exitCode = 1;
    return;
  }

  try {
    const client = new LiveMetaClient(env, undefined, { retry: false });
    const raw = await client.complete({
      // The live client ignores this legacy task label; no experiment is run.
      task: "design",
      system: 'Return only the JSON object {"status":"ok"}, with no additional fields or text.',
      inputJson: '{"status":"ok"}',
      responseSchema: z.toJSONSchema(smokeResponseSchema),
    });
    validateSmokeResponse(raw);
  } catch (error: unknown) {
    console.error(formatMetaProviderError(error) ?? 'META LIVE smoke test failed: request failed or response was not exactly {"status":"ok"}.');
    process.exitCode = 1;
    return;
  }

  console.log(`META LIVE\nmodel: ${config.model}\nstatus: ok`);
}

void main();
