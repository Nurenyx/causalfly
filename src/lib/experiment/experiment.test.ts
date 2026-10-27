import assert from "node:assert/strict";
import { test } from "node:test";
import { compareTrials, runExperiment } from "./compare";
import { demoExperimentSpec, runDemoExperiment } from "./demo";
import { ENGINE_VERSION, runTrial } from "./engine";
import { syntheticDemoNetwork } from "./network";
import type { ExperimentSpec, NetworkDefinition } from "./types";

test("identical experiments and serialized results are deterministic", () => {
  const first = runDemoExperiment();
  const second = runDemoExperiment();
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test("both trials use the exact same network and experiment inputs", () => {
  const { control, perturbed, provenance } = runDemoExperiment();
  assert.deepEqual(control.provenance.network, syntheticDemoNetwork);
  assert.deepEqual(control.provenance.network, perturbed.provenance.network);
  assert.deepEqual(control.provenance.experiment, demoExperimentSpec);
  assert.deepEqual(control.provenance.experiment, perturbed.provenance.experiment);
  assert.equal(control.provenance.appliedPerturbation, null);
  assert.deepEqual(
    perturbed.provenance.appliedPerturbation,
    demoExperimentSpec.perturbation,
  );
  assert.ok(Object.values(provenance.matchedConditions).every(Boolean));
});

test("silencing holds at every sample and changes downstream measured activity", () => {
  const { control, perturbed, deltas } = runDemoExperiment();
  assert.ok(perturbed.activity.every(({ nodes }) => nodes.primary_a === 0));
  assert.equal(control.activity[1].nodes.primary_a, 1);
  assert.equal(control.activity[2].nodes.primary_b, 1);
  assert.equal(perturbed.activity[2].nodes.primary_b, 0);
  assert.deepEqual(control.activity.map(({ nodes }) => nodes.motor), [0, 0, 0, 1, 0.5, 0, 0]);
  assert.deepEqual(perturbed.activity.map(({ nodes }) => nodes.motor), [0, 0, 0, 0, 0.5, 0, 0]);
  assert.equal(control.outputPeakActivity, 1);
  assert.equal(perturbed.outputPeakActivity, 0.5);
  assert.equal(control.outputThresholdCrossingStep, 3);
  assert.equal(perturbed.outputThresholdCrossingStep, 4);
  assert.equal(deltas.outputPeakActivity, -0.5);
  assert.equal(deltas.outputThresholdCrossingSteps, 1);
});

test("deltas are derived from supplied trial values across different experiments", () => {
  // Shorten the alternate route and lower the pulse: neither demo delta applies.
  const network: NetworkDefinition = {
    ...syntheticDemoNetwork,
    edges: syntheticDemoNetwork.edges
      .filter((edge) => edge.from !== "alternate_c")
      .map((edge) => edge.to === "alternate_c" ? { ...edge, to: "motor" } : edge),
  };
  const spec: ExperimentSpec = {
    ...demoExperimentSpec,
    stimulus: { amplitude: 0.25 },
    outputThreshold: 0.1,
  };
  const control = runTrial(network, spec, "CONTROL");
  const perturbed = runTrial(network, spec, "PERTURBED");
  const { deltas } = compareTrials(control, perturbed);
  assert.equal(deltas.outputPeakActivity, perturbed.outputPeakActivity - control.outputPeakActivity);
  assert.equal(deltas.outputPeakActivity, -0.25);
  assert.equal(deltas.outputThresholdCrossingSteps, 0);
  assert.equal(deltas.outcomeChanged, control.outcome !== perturbed.outcome);
});

test("missing threshold crossing produces null latency and a changed outcome", () => {
  const { control, perturbed, deltas } = runExperiment(syntheticDemoNetwork, {
    ...demoExperimentSpec,
    outputThreshold: 0.75,
  });
  assert.equal(control.outcome, "THRESHOLD_REACHED");
  assert.equal(perturbed.outputThresholdCrossingStep, null);
  assert.equal(perturbed.outcome, "THRESHOLD_NOT_REACHED");
  assert.equal(deltas.outputThresholdCrossingSteps, null);
  assert.equal(deltas.outcomeChanged, true);
});

test("zero transitions retain step 0 and both absent crossings stay null", () => {
  const { control, perturbed, deltas } = runExperiment(syntheticDemoNetwork, {
    ...demoExperimentSpec,
    maxSteps: 0,
  });
  assert.equal(control.activity.length, 1);
  assert.equal(control.activity[0].nodes.stimulus, 1);
  assert.equal(control.outputPeakActivity, 0);
  assert.equal(control.outputThresholdCrossingStep, null);
  assert.equal(perturbed.outputThresholdCrossingStep, null);
  assert.equal(deltas.outputThresholdCrossingSteps, null);
  assert.equal(deltas.outcomeChanged, false);
});

test("the engine sums before clamping and propagates synchronously", () => {
  const network: NetworkDefinition = {
    ...syntheticDemoNetwork,
    nodes: [{ id: "stimulus" }, { id: "a" }, { id: "b" }, { id: "motor" }],
    edges: [
      { from: "stimulus", to: "a", weight: 0.8 },
      { from: "stimulus", to: "b", weight: 0.8 },
      { from: "stimulus", to: "motor", weight: -1 },
      { from: "a", to: "motor", weight: 2 },
      { from: "b", to: "motor", weight: -1 },
    ],
  };
  const trial = runTrial(network, {
    ...demoExperimentSpec,
    perturbation: { type: "silence", targetNodeId: "b" },
  }, "CONTROL");
  assert.deepEqual(trial.activity.map(({ nodes }) => nodes.motor), [0, 0, 0.8, 0, 0, 0, 0]);
  assert.equal(trial.activity[1].nodes.stimulus, 0); // pulse, not sustained drive
  const perturbed = runTrial(network, trial.provenance.experiment, "PERTURBED");
  assert.equal(perturbed.activity[2].nodes.motor, 1); // 1.6 is clamped to 1
});

test("input and output targets are silenced including the initial state", () => {
  for (const targetNodeId of ["stimulus", "motor"]) {
    const { perturbed } = runExperiment(syntheticDemoNetwork, {
      ...demoExperimentSpec,
      perturbation: { type: "silence", targetNodeId },
    });
    assert.ok(perturbed.activity.every(({ nodes }) => nodes[targetNodeId] === 0));
    assert.equal(perturbed.outputPeakActivity, 0);
  }
});

test("step 0 crossing is preserved when input and output are the same node", () => {
  const trial = runTrial({
    ...syntheticDemoNetwork,
    outputNodeId: "stimulus",
  }, demoExperimentSpec, "CONTROL");
  assert.equal(trial.outputThresholdCrossingStep, 0);
  assert.equal(trial.outcome, "THRESHOLD_REACHED");
});

test("an invalid perturbation target fails clearly, even for CONTROL", () => {
  for (const condition of ["CONTROL", "PERTURBED"] as const) {
    assert.throws(() => runTrial(syntheticDemoNetwork, {
      ...demoExperimentSpec,
      perturbation: { type: "silence", targetNodeId: "missing_node" },
    }, condition), /Unknown perturbation target: missing_node/);
  }
});

test("results carry explicit synthetic fixture and condition provenance", () => {
  const comparison = runDemoExperiment();
  for (const trial of [comparison.control, comparison.perturbed]) {
    assert.equal(trial.provenance.engineVersion, ENGINE_VERSION);
    assert.equal(trial.provenance.condition, trial.condition);
    assert.equal(trial.provenance.network.id, "synthetic-two-pathway-v1");
    assert.equal(trial.provenance.network.provenance.kind, "synthetic-fixture");
    assert.match(trial.provenance.network.provenance.description, /not a biological model/);
  }
});

test("results are detached and frozen without freezing caller-owned inputs", () => {
  const spec = { ...demoExperimentSpec, stimulus: { amplitude: 1 } };
  const network = {
    ...syntheticDemoNetwork,
    edges: syntheticDemoNetwork.edges.map((edge) => ({ ...edge })),
  };
  const trial = runTrial(network, spec, "CONTROL");
  spec.stimulus.amplitude = 0;
  network.edges[0].weight = 0;
  assert.equal(trial.provenance.experiment.stimulus.amplitude, 1);
  assert.equal(trial.provenance.network.edges[0].weight, 1);
  assert.equal(trial.outputPeakActivity, 1);
  assert.ok(Object.isFrozen(trial));
  assert.ok(Object.isFrozen(trial.activity[0].nodes));
  assert.ok(Object.isFrozen(trial.provenance.network.edges[0]));
  assert.equal(Reflect.set(trial, "outputPeakActivity", 0), false);
});

test("comparison rejects mismatched inputs rather than silently computing deltas", async (t) => {
  const { control, perturbed } = runDemoExperiment();
  const mismatchedSpecs: [string, ExperimentSpec][] = [
    ["stimulus", { ...demoExperimentSpec, stimulus: { amplitude: 0.8 } }],
    ["seed", { ...demoExperimentSpec, seed: 2 }],
    ["maxSteps", { ...demoExperimentSpec, maxSteps: 5 }],
    ["outputThreshold", { ...demoExperimentSpec, outputThreshold: 0.3 }],
    ["experiment", { ...demoExperimentSpec, hypothesis: "A different hypothesis" }],
    ["experiment", { ...demoExperimentSpec, perturbation: { type: "silence", targetNodeId: "primary_b" } }],
  ];
  for (const [field, spec] of mismatchedSpecs) {
    await t.test(`changed ${field}`, () => {
      assert.throws(() => compareTrials(control, runTrial(syntheticDemoNetwork, spec, "PERTURBED")), new RegExp(`unmatched trials:.*${field}`));
    });
  }
  await t.test("changed network weights with the same network id", () => {
    const network = {
      ...syntheticDemoNetwork,
      edges: syntheticDemoNetwork.edges.map((edge) => ({ ...edge, weight: edge.weight * 0.9 })),
    };
    assert.throws(() => compareTrials(control, runTrial(network, demoExperimentSpec, "PERTURBED")), /unmatched trials:.*network/);
  });
  await t.test("changed engine", () => {
    assert.throws(() => compareTrials(control, {
      ...perturbed,
      provenance: { ...perturbed.provenance, engineVersion: "other-engine" },
    }), /unmatched trials:.*engine/);
  });
  await t.test("wrong condition order", () => {
    assert.throws(() => compareTrials(perturbed, control), /onlyDeclaredPerturbationDiffers/);
  });
  await t.test("undeclared intervention", () => {
    assert.throws(() => compareTrials(control, {
      ...perturbed,
      provenance: { ...perturbed.provenance, appliedPerturbation: null },
    }), /onlyDeclaredPerturbationDiffers/);
  });
});

test("invalid numeric parameters and network definitions fail clearly", () => {
  const invalidSpecs: [Partial<ExperimentSpec>, RegExp][] = [
    [{ stimulus: { amplitude: NaN } }, /Stimulus amplitude/],
    [{ stimulus: { amplitude: -0.1 } }, /Stimulus amplitude/],
    [{ stimulus: { amplitude: 1.1 } }, /Stimulus amplitude/],
    [{ maxSteps: -1 }, /maxSteps/],
    [{ maxSteps: 1.5 }, /maxSteps/],
    [{ seed: Infinity }, /Seed/],
    [{ outputThreshold: 0 }, /Output threshold/],
    [{ outputThreshold: 1.1 }, /Output threshold/],
    [{ outputThreshold: NaN }, /Output threshold/],
  ];
  for (const [override, error] of invalidSpecs) {
    assert.throws(() => runExperiment(syntheticDemoNetwork, { ...demoExperimentSpec, ...override }), error);
  }
  const invalidNetworks: [Partial<NetworkDefinition>, RegExp][] = [
    [{ nodes: [] }, /unique, non-empty/],
    [{ nodes: [...syntheticDemoNetwork.nodes, { id: "motor" }] }, /unique, non-empty/],
    [{ inputNodeId: "missing" }, /input and output/],
    [{ edges: [{ from: "missing", to: "motor", weight: 1 }] }, /unknown node/],
    [{ edges: [{ from: "stimulus", to: "motor", weight: Infinity }] }, /finite/],
  ];
  for (const [override, error] of invalidNetworks) {
    assert.throws(() => runExperiment({ ...syntheticDemoNetwork, ...override }, demoExperimentSpec), error);
  }
});
