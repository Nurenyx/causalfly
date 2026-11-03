import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup as render } from "react-dom/server";
import { createEvidencePayload } from "../../lib/meta/evidence";
import { createCompactEvidence } from "../../lib/meta/compact-evidence";
import { syntheticDemoNetwork } from "../../lib/experiment/network";
import { demoExperimentSpec } from "../../lib/experiment/demo";
import { resultSummary } from "../../lib/web/result-summary";
import type { MeasuredExperimentResult } from "../../lib/web/contracts";
import { NeuralResponseSummary } from "./neural-response-summary";

function fixture(amplitude = 1): MeasuredExperimentResult {
  const evidence = createCompactEvidence(createEvidencePayload({ researchQuestion: "Silence Primary A?", networkDefinition: syntheticDemoNetwork, experimentSpec: { ...demoExperimentSpec, stimulus: { amplitude } } }));
  return { researchQuestion: evidence.researchQuestion, mode: "FAKE META CLIENT", spec: evidence.experimentSpec, measuredEvidence: evidence.comparison, provenance: evidence.provenance };
}
test("response facts use the selected retained trial and shared authoritative comparison", () => {
  const result = fixture(); const original = JSON.stringify(result);
  for (const condition of ["control", "perturbed"] as const) {
    const trial = result.measuredEvidence[condition];
    const html = render(<NeuralResponseSummary trial={trial} summary={resultSummary(result)} outcomeChanged={result.measuredEvidence.deltas.outcomeChanged} />);
    assert.match(html, new RegExp(`data-measure="peak" data-value="${trial.outputPeakActivity}"`));
    assert.ok(html.includes(trial.outputPeakActivity.toFixed(3)));
    assert.ok(html.includes(`Step ${trial.outputThresholdCrossingStep}`));
    assert.match(html, /Signal reduced 50%/); assert.match(html, /Response delayed by 1 step/); assert.match(html, /Outcome unchanged/);
    assert.match(html, /Retained trial totals · not current-step output/); assert.match(html, /Motor execution is procedural/);
  }
  assert.equal(JSON.stringify(result), original);
});
test("a non-crossing retained trial never claims a response step or takeoff", () => {
  const result = fixture(.1); const trial = result.measuredEvidence.perturbed;
  assert.equal(trial.outputThresholdCrossingStep, null);
  const html = render(<NeuralResponseSummary trial={trial} summary={resultSummary(result)} outcomeChanged={result.measuredEvidence.deltas.outcomeChanged} />);
  assert.match(html, /data-measure="response-step" data-value=""/); assert.match(html, /Not reached/); assert.match(html, /Grounded walk/);
  assert.doesNotMatch(html, /Takeoff escape|Step null|Step 0/);
});
