import test from "node:test";
import assert from "node:assert/strict";
import { demoExperimentSpec } from "../experiment/demo";
import { syntheticDemoNetwork } from "../experiment/network";
import { createEvidencePayload } from "../meta/evidence";
import { createCompactEvidence } from "../meta/compact-evidence";
import { resultSummary } from "./result-summary";
import type { MeasuredExperimentResult } from "./contracts";

function measured(amplitude = 1, maxSteps = 6): MeasuredExperimentResult {
  const spec = { ...demoExperimentSpec, stimulus: { amplitude }, maxSteps };
  const compact = createCompactEvidence(createEvidencePayload({ researchQuestion: "Test", networkDefinition: syntheticDemoNetwork, experimentSpec: spec }));
  return { researchQuestion: "Test", mode: "FAKE META CLIENT", spec, measuredEvidence: compact.comparison, provenance: compact.provenance };
}
test("plain-English summary derives percentage and delay without changing engine evidence", () => {
  const result = measured(); const original = JSON.stringify(result);
  assert.equal(resultSummary(result).signal, "Signal reduced 50%");
  assert.equal(resultSummary(result).response, "Response delayed by 1 step");
  assert.equal(resultSummary(result).headline, "Silencing this part of the network weakened the output signal and delayed the response.");
  assert.equal(JSON.stringify(result), original);
});
test("zero baseline and absent threshold crossings never become percentages or zero latency", () => {
  assert.equal(resultSummary(measured(0)).percentage, null);
  assert.equal(resultSummary(measured(0)).signal, "No baseline signal to compare");
  assert.equal(resultSummary(measured(0)).response, "Response timing not comparable");
  assert.equal(resultSummary(measured(1, 3)).response, "Response timing not comparable");
  assert.doesNotMatch(resultSummary(measured(1, 3)).headline, /delayed the response/);
});
