import { syntheticDemoNetwork } from "../src/lib/experiment/network";
import { createMetaClient, runAiExperiment } from "../src/lib/meta/workflow";
import { loadProjectEnvironment } from "./load-environment";

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !["--fake", "--live"].includes(args[0]))) {
    throw new Error("Usage: npm run experiment:ai-demo -- [--fake|--live]");
  }
  loadProjectEnvironment();
  const mode = args[0] === "--fake" ? "fake" : args[0] === "--live" ? "live" : "auto";
  const client = createMetaClient(mode);
  console.log(`CausalFly AI experiment demo — ${client.mode}`);
  console.log("Synthetic engineering fixture only; no biological claims.\n");
  const researchQuestion = "Does silencing primary_a reduce the synthetic output peak and delay threshold crossing?";
  const result = await runAiExperiment(client, { researchQuestion, networkDefinition: syntheticDemoNetwork });
  const sections = [
    ["1. RESEARCH QUESTION", researchQuestion],
    ["2. AI-PROPOSED EXPERIMENT", result.proposal],
    ["3. VALIDATED EXPERIMENTSPEC", result.spec],
    ["4. CONTROL RESULT", result.evidence.comparison.control],
    ["5. PERTURBED RESULT", result.evidence.comparison.perturbed],
    ["6. MEASURED DELTAS", result.evidence.comparison.deltas],
    ["7. AI SCIENTIST (downstream interpretation)", result.analysis],
  ];
  for (const [label, value] of sections) {
    console.log(label);
    console.log(typeof value === "string" ? value : JSON.stringify(value, null, 2));
    console.log();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "AI experiment failed.");
  process.exitCode = 1;
});
