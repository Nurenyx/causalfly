import { syntheticDemoNetwork } from "../src/lib/experiment/network";
import { createCompactEvidence } from "../src/lib/meta/compact-evidence";
import { formatMetaProviderError } from "../src/lib/meta/provider-errors";
import { createMetaClient, runAiExperiment, type AiExperimentStage } from "../src/lib/meta/workflow";
import { loadProjectEnvironment } from "./load-environment";

let currentStage: AiExperimentStage | undefined;

async function main() {
  const args = process.argv.slice(2);
  const modeArgs = args.filter((arg) => arg === "--fake" || arg === "--live");
  if (args.some((arg) => !["--fake", "--live", "--raw"].includes(arg)) ||
      new Set(args).size !== args.length || modeArgs.length > 1) {
    throw new Error("Usage: npm run experiment:ai-demo -- [--fake|--live] [--raw]");
  }
  loadProjectEnvironment();
  const mode = modeArgs[0] === "--fake" ? "fake" : modeArgs[0] === "--live" ? "live" : "auto";
  const client = createMetaClient(mode);
  console.log(`CausalFly AI experiment demo - ${client.mode}`);
  console.log("Synthetic engineering fixture only; no biological claims.\n");
  const researchQuestion = "Does silencing primary_a reduce the synthetic output peak and delay threshold crossing?";
  const result = await runAiExperiment(client, { researchQuestion, networkDefinition: syntheticDemoNetwork }, (stage) => {
    currentStage = stage;
    console.log(stage);
  });
  const compact = createCompactEvidence(result.evidence);
  const sections: [string, unknown][] = [
    ["1. RESEARCH QUESTION", researchQuestion],
    ["2. AI-PROPOSED EXPERIMENT", result.proposal],
    ["3. COMPACT CONTROL SUMMARY", compact.comparison.control],
    ["4. COMPACT PERTURBED SUMMARY", compact.comparison.perturbed],
    ["5. MEASURED DELTAS", {
      ...compact.comparison.deltas,
      provenance: compact.comparison.provenance,
    }],
    ["6. AI SCIENTIST (downstream interpretation)", result.analysis],
  ];
  if (args.includes("--raw")) {
    sections.push(["7. FULL RAW TRIALRESULTS (complete activity traces)", result.evidence.comparison]);
  }
  for (const [label, value] of sections) {
    console.log(label);
    console.log(typeof value === "string" ? value : JSON.stringify(value, null, 2));
    console.log();
  }
}

main().catch((error: unknown) => {
  if (currentStage) console.error(`${currentStage} failed.`);
  console.error(formatMetaProviderError(error) ?? (error instanceof Error ? error.message : "AI experiment failed."));
  process.exitCode = 1;
});
