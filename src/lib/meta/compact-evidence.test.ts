import assert from "node:assert/strict";
import { test } from "node:test";
import { runExperiment } from "../experiment/compare";
import { demoExperimentSpec } from "../experiment/demo";
import { syntheticDemoNetwork } from "../experiment/network";
import type { ExperimentSpec } from "../experiment/types";
import { createCompactEvidence } from "./compact-evidence";
import { createEvidencePayload } from "./evidence";
import { FakeMetaClient } from "./fake-client";
import { interpretEvidence } from "./scientific-interpreter";

function makeEvidence(overrides: Partial<ExperimentSpec> = {}) {
  return createEvidencePayload({
    researchQuestion: "How does silencing an internal node affect synthetic output?",
    networkDefinition: syntheticDemoNetwork,
    experimentSpec: { ...demoExperimentSpec, maxSteps: 100, ...overrides },
  });
}

test("compact evidence retains every non-zero node sample exactly, including tiny and output-zero activity", () => {
  for (const amplitude of [0, 1e-12, 1]) {
    for (const targetNodeId of ["primary_a", "primary_b", "alternate_a", "alternate_b", "alternate_c"]) {
      const evidence = makeEvidence({ stimulus: { amplitude }, perturbation: { type: "silence", targetNodeId } });
      const compact = createCompactEvidence(evidence);
      for (const condition of ["control", "perturbed"] as const) {
        const full = evidence.comparison[condition];
        const summary = compact.comparison[condition];
        const meaningful = full.activity.filter(({ nodes }) => Object.values(nodes).some((value) => value !== 0));
        assert.deepEqual(
          summary.activity.filter(({ nodes }) => Object.values(nodes).some((value) => value !== 0)),
          meaningful,
        );
        for (const sample of summary.activity) {
          assert.deepEqual(sample, full.activity.find(({ step }) => step === sample.step));
        }
        if (amplitude > 0) {
          assert.equal(summary.activity[0].nodes.motor, 0);
          assert.equal(summary.activity[0].nodes.stimulus, amplitude);
        }
      }
    }
  }
});

test("compact evidence keeps one final quiescent sample and omits the remaining zero tail", (t) => {
  const evidence = makeEvidence();
  const compact = createCompactEvidence(evidence);
  for (const condition of ["control", "perturbed"] as const) {
    const summary = compact.comparison[condition];
    assert.equal(evidence.comparison[condition].activity.length, 101);
    assert.deepEqual(summary.activity.map(({ step }) => step), [0, 1, 2, 3, 4, 5]);
    assert.ok(Object.values(summary.activity.at(-1)!.nodes).every((value) => value === 0));
    assert.equal(summary.maxSteps, 100);
    assert.equal(summary.traceSelection.originalStepCount, 101);
    assert.equal(summary.traceSelection.omittedZeroStepCount, 95);
  }
  const rawBytes = Buffer.byteLength(JSON.stringify(evidence));
  const compactBytes = Buffer.byteLength(JSON.stringify(compact));
  assert.ok(compactBytes < rawBytes);
  t.diagnostic(`maxSteps=100: 202 raw samples -> 12 compact samples; evidence JSON ${rawBytes} -> ${compactBytes} bytes`);
});

test("compact measurements and deltas equal the full TrialResults for reached and absent crossings", () => {
  for (const amplitude of [0, 0.2, 1]) {
    const evidence = makeEvidence({ stimulus: { amplitude } });
    const compact = createCompactEvidence(evidence);
    for (const condition of ["control", "perturbed"] as const) {
      const full = evidence.comparison[condition];
      const summary = compact.comparison[condition];
      assert.equal(summary.condition, full.condition);
      assert.equal(summary.outputPeakActivity, full.outputPeakActivity);
      assert.equal(summary.outputThresholdCrossingStep, full.outputThresholdCrossingStep);
      assert.equal(summary.outcome, full.outcome);
    }
    assert.deepEqual(compact.comparison.deltas, evidence.comparison.deltas);
    assert.deepEqual(compact.experimentSpec, evidence.experimentSpec);
  }
});

test("compaction is deterministic, frozen, and leaves full engine evidence unchanged", () => {
  const evidence = makeEvidence();
  const original = JSON.stringify(evidence);
  const compact = createCompactEvidence(evidence);
  assert.deepEqual(createCompactEvidence(evidence), compact);
  assert.equal(Reflect.set(compact.comparison.control.activity[0].nodes, "motor", 99), false);
  assert.equal(Reflect.set(compact.comparison.control.activity, "length", 0), false);
  assert.equal(Reflect.set(compact.comparison.control.traceSelection, "omittedZeroStepCount", 0), false);
  assert.equal(JSON.stringify(evidence), original);
  assert.equal(evidence.comparison.control.activity.length, 101);
  assert.equal(evidence.comparison.perturbed.activity.length, 101);
  assert.deepEqual(evidence.comparison, runExperiment(syntheticDemoNetwork, evidence.experimentSpec));
});

test("compact evidence preserves all provenance, declared and applied perturbations, and matched conditions", () => {
  const evidence = makeEvidence();
  const compact = createCompactEvidence(evidence);
  assert.deepEqual(compact.provenance, evidence.provenance);
  assert.deepEqual(compact.comparison.provenance, evidence.comparison.provenance);
  assert.deepEqual(compact.experimentSpec.perturbation, evidence.experimentSpec.perturbation);
  for (const condition of ["control", "perturbed"] as const) {
    assert.deepEqual(compact.comparison[condition].provenance, evidence.comparison[condition].provenance);
    assert.equal(compact.comparison[condition].provenance.experiment.maxSteps, 100);
  }
  assert.equal(compact.comparison.control.provenance.appliedPerturbation, null);
  assert.deepEqual(compact.comparison.perturbed.provenance.appliedPerturbation, demoExperimentSpec.perturbation);
  assert.ok(Object.values(compact.comparison.provenance.matchedConditions).every(Boolean));
});

test("short observation windows retain all available activity without inventing a quiescent step", () => {
  for (const maxSteps of [0, 1, 2, 3, 4, 5]) {
    const evidence = makeEvidence({ maxSteps });
    const compact = createCompactEvidence(evidence);
    for (const condition of ["control", "perturbed"] as const) {
      assert.deepEqual(compact.comparison[condition].activity, evidence.comparison[condition].activity);
      assert.equal(compact.comparison[condition].maxSteps, maxSteps);
      assert.equal(compact.comparison[condition].traceSelection.omittedZeroStepCount, 0);
    }
  }
});

test("an entirely quiescent trial keeps its recorded initial sample and null crossing", () => {
  const evidence = makeEvidence({ stimulus: { amplitude: 0 } });
  const compact = createCompactEvidence(evidence);
  for (const condition of ["control", "perturbed"] as const) {
    assert.deepEqual(compact.comparison[condition].activity, [evidence.comparison[condition].activity[0]]);
    assert.equal(compact.comparison[condition].outputThresholdCrossingStep, null);
    assert.equal(compact.comparison[condition].traceSelection.omittedZeroStepCount, 100);
  }
});

test("compaction rejects arbitrary or deserialized records at the existing evidence gate", () => {
  assert.throws(() => createCompactEvidence(structuredClone(makeEvidence())), /immutable payload/);
});

test("the interpreter receives only compact traces while the caller retains full TrialResults", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Network prohibited"); });
  const evidence = makeEvidence();
  const original = JSON.stringify(evidence);
  const fake = new FakeMetaClient();
  let calls = 0;
  await interpretEvidence({
    mode: fake.mode,
    async complete(request) {
      calls++;
      const payload = JSON.parse(request.inputJson);
      const { eligiblePerturbationTargetIds, ...received } = payload;
      assert.deepEqual(received, createCompactEvidence(evidence));
      assert.equal(eligiblePerturbationTargetIds.length, 5);
      assert.equal(received.comparison.control.activity.length, 6);
      assert.equal(received.comparison.perturbed.activity.length, 6);
      return fake.complete(request);
    },
  }, evidence);
  assert.equal(calls, 1);
  assert.equal(JSON.stringify(evidence), original);
});
