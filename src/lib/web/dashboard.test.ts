import assert from "node:assert/strict";
import test from "node:test";
import { demoExperimentSpec } from "../experiment/demo";
import { syntheticDemoNetwork } from "../experiment/network";
import { runExperiment } from "../experiment/compare";
import { createEvidencePayload } from "../meta/evidence";
import { createCompactEvidence } from "../meta/compact-evidence";
import { FakeMetaClient } from "../meta/fake-client";
import { activityAtStep, activitySeries, crossing, displayObservation, playbackSteps, propagationTiming, workspaceReducer, type WorkspaceState } from "./dashboard";
import { runWebExperiment } from "./workflow";

function evidence(overrides: Partial<typeof demoExperimentSpec> = {}) {
  const spec = { ...demoExperimentSpec, ...overrides };
  const comparison = runExperiment(syntheticDemoNetwork, spec);
  return { comparison, compact: createCompactEvidence(createEvidencePayload({ researchQuestion: "Synthetic test question", networkDefinition: syntheticDemoNetwork, experimentSpec: spec })) };
}

test("chart series preserve exact recorded values and step numbers across amplitudes", () => {
  for (const amplitude of [0, .17, .8, 1]) {
    const { comparison, compact } = evidence({ stimulus: { amplitude }, maxSteps: 100 });
    for (const condition of ["control", "perturbed"] as const) {
      const trial = compact.comparison[condition];
      for (const line of activitySeries(trial)) {
        assert.equal(line.points.length, trial.activity.length);
        assert.deepEqual(line.points, trial.activity.map((sample) => ({ step: sample.step, value: comparison[condition].activity[sample.step].nodes[line.id] })));
      }
    }
  }
});

test("chart data contains only node ids, computational steps and measured activity", () => {
  const { compact } = evidence();
  const trial = compact.comparison.control;
  const before = JSON.stringify(trial);
  const series = activitySeries(trial);
  for (const line of series) {
    assert.deepEqual(Object.keys(line), ["id", "points"]);
    assert.ok(trial.provenance.network.nodes.some((node) => node.id === line.id));
    for (const point of line.points) assert.deepEqual(Object.keys(point), ["step", "value"]);
  }
  propagationTiming(trial);
  assert.equal(JSON.stringify(trial), before);
});

test("chart series never expand compacted zeros into invented samples", () => {
  const { compact } = evidence({ maxSteps: 1000 });
  const trial = compact.comparison.control;
  assert.ok(trial.activity.length < trial.traceSelection.originalStepCount);
  assert.deepEqual(activitySeries(trial)[0].points.map((point) => point.step), trial.activity.map((sample) => sample.step));
});

test("playback synchronizes exact retained steps without expanding compacted samples", () => {
  for (const maxSteps of [0, 1, 4, 1000]) {
    const { compact } = evidence({ maxSteps });
    const { control, perturbed } = compact.comparison;
    const before = JSON.stringify(compact);
    const steps = playbackSteps(control, perturbed);
    assert.deepEqual(steps, [...new Set([...control.activity, ...perturbed.activity].map((sample) => sample.step))].sort((a, b) => a - b));
    for (const step of steps) {
      for (const trial of [control, perturbed]) {
        assert.equal(activityAtStep(trial, step), trial.activity.find((sample) => sample.step === step) ?? null);
      }
    }
    assert.equal(activityAtStep(control, -1), null);
    assert.equal(activityAtStep(control, maxSteps + 1), null);
    assert.equal(JSON.stringify(compact), before);
  }
});

test("playback reports missing samples rather than carrying forward activity", () => {
  const { compact } = evidence({ maxSteps: 1000 });
  const trial = compact.comparison.control;
  const final = trial.activity.at(-1)!;
  assert.equal(activityAtStep(trial, final.step), final);
  assert.equal(activityAtStep(trial, final.step + 1), null);
  assert.ok(!playbackSteps(trial, compact.comparison.perturbed).includes(1000));
});

test("first propagation timing equals the full deterministic trace for every eligible target", () => {
  for (const targetNodeId of ["primary_a", "primary_b", "alternate_a", "alternate_b", "alternate_c"]) {
    const { comparison, compact } = evidence({ perturbation: { type: "silence", targetNodeId } });
    for (const condition of ["control", "perturbed"] as const) {
      const timing = propagationTiming(compact.comparison[condition]);
      for (const node of timing) {
        assert.equal(node.step, comparison[condition].activity.find((sample) => sample.nodes[node.id] !== 0)?.step ?? null);
        assert.equal(node.silenced, condition === "perturbed" && node.id === targetNodeId);
      }
    }
  }
});

test("zero stimulus produces no fabricated propagation and distinguishes silence from inactivity", () => {
  const { compact } = evidence({ stimulus: { amplitude: 0 } });
  const timing = propagationTiming(compact.comparison.perturbed);
  assert.ok(timing.every((node) => node.step === null));
  assert.deepEqual(timing.filter((node) => node.silenced).map((node) => node.id), [demoExperimentSpec.perturbation.targetNodeId]);
});

test("short observation windows do not invent activation outside measured steps", () => {
  const { compact } = evidence({ maxSteps: 1 });
  assert.equal(propagationTiming(compact.comparison.control).find((node) => node.id === "motor")?.step, null);
  assert.equal(crossing(compact.comparison.control.outputThresholdCrossingStep), "Not reached");
});

test("step zero and tiny non-zero activations remain exact", () => {
  const { compact } = evidence({ stimulus: { amplitude: 1e-12 }, maxSteps: 0 });
  const trial = compact.comparison.control;
  assert.equal(propagationTiming(trial).find((node) => node.id === "stimulus")?.step, 0);
  assert.equal(propagationTiming(trial).find((node) => node.id === "primary_a")?.step, null);
  assert.deepEqual(activitySeries(trial).find((line) => line.id === "motor")?.points, [{ step: 0, value: 0 }]);
  const longer = evidence({ stimulus: { amplitude: 1e-12 } });
  assert.equal(propagationTiming(longer.compact.comparison.control).find((node) => node.id === "motor")?.step, 3);
  assert.equal(activitySeries(longer.compact.comparison.control).find((line) => line.id === "motor")?.points.find((point) => point.step === 3)?.value, 1e-12);
});

test("successful workspace result maps unchanged evidence to Compare", async () => {
  const response = await runWebExperiment({ researchQuestion: "Test synthetic fixture" }, { env: {}, createClient: () => new FakeMetaClient() });
  assert.ok(response.ok);
  const state: WorkspaceState = { workspace: "observatory", question: "original", result: null };
  const next = workspaceReducer(state, { type: "completed", result: response.result });
  assert.equal(next.workspace, "compare");
  assert.equal(next.result, response.result);
  assert.equal(state.result, null);
  for (const workspace of ["observatory", "compare", "scientist", "evidence"] as const) {
    const navigated = workspaceReducer(next, { type: "navigate", workspace });
    assert.equal(navigated.workspace, workspace);
    assert.equal(navigated.result, response.result);
  }
});

test("next-question archives result, releases active evidence, and performs no submission", async (t) => {
  const response = await runWebExperiment({ researchQuestion: "Test synthetic fixture" }, { env: {}, createClient: () => new FakeMetaClient() });
  assert.ok(response.ok);
  t.mock.method(globalThis, "fetch", async () => { assert.fail("next-question navigation must not submit"); });
  const question = response.result.analysis.nextExperiment.researchQuestion;
  for (const workspace of ["compare", "scientist"] as const) {
    const next = workspaceReducer({ workspace, question: "previous", result: response.result }, { type: "next-question", question });
    assert.equal(next.workspace, "observatory");
    assert.equal(next.question, question);
    assert.equal(next.result, null);
    assert.equal(next.history?.[0].result, response.result);
    assert.equal(next.design, undefined);
  }
});

test("display transformations only alias internal labels without changing values", () => {
  assert.equal(displayObservation("outputPeakActivity: 0.17; outputThresholdCrossingSteps: null; maxSteps: 1000"), "Peak output: 0.17; Threshold-crossing delta: null; Observation window: 1000");
  assert.equal(crossing(null), "Not reached");
  assert.equal(crossing(0), "Step 0");
});
