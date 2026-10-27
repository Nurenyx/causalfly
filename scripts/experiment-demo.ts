import { runDemoExperiment } from "../src/lib/experiment/demo";

const comparison = runDemoExperiment();
console.log("CausalFly synthetic engineering fixture - no biological claims\n");
for (const trial of [comparison.control, comparison.perturbed]) {
  console.log(trial.condition);
  console.log(`peak output: ${trial.outputPeakActivity}`);
  console.log(`threshold crossing: ${trial.outputThresholdCrossingStep ?? "not reached"}`);
  console.log(`outcome: ${trial.outcome}\n`);
}
console.log("DELTA (PERTURBED minus CONTROL)");
console.log(`peak activity: ${comparison.deltas.outputPeakActivity}`);
console.log(
  `latency (steps): ${comparison.deltas.outputThresholdCrossingSteps ?? "not comparable (threshold not reached)"}`,
);
console.log(`outcome changed: ${comparison.deltas.outcomeChanged}`);
console.log(
  `matched conditions: ${Object.values(comparison.provenance.matchedConditions).every(Boolean)}\n`,
);
console.log("STRUCTURED JSON");
console.log(JSON.stringify(comparison, null, 2));
