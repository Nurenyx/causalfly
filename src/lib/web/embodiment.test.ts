import assert from "node:assert/strict";
import test from "node:test";
import { advanceEmbodiedPlayback, embodiedFrame, embodimentAtStep, loomingPose } from "./embodiment";
import { createCompactEvidence } from "../meta/compact-evidence";
import { createEvidencePayload } from "../meta/evidence";
import { syntheticDemoNetwork } from "../experiment/network";
import { demoExperimentSpec } from "../experiment/demo";

const { comparison: { control, perturbed } } = createCompactEvidence(createEvidencePayload({ researchQuestion: "Silence the primary pathway", networkDefinition: syntheticDemoNetwork, experimentSpec: demoExperimentSpec }));

test("embodiment selects the same recorded step for stimulus, output and threshold", () => {
  const before = JSON.stringify([control, perturbed]);
  assert.equal(embodimentAtStep(control, 0).stimulus, 1);
  assert.equal(embodimentAtStep(control, 1).stimulus, 0);
  assert.equal(embodimentAtStep(control, 3).output, 1);
  assert.equal(embodimentAtStep(perturbed, 3).output, 0);
  assert.equal(embodimentAtStep(perturbed, 3).thresholdReached, false);
  assert.equal(embodimentAtStep(perturbed, 4).output, .5);
  assert.equal(embodimentAtStep(perturbed, 4).thresholdReached, true);
  assert.equal(embodimentAtStep(perturbed, 4).target, "primary_a");
  assert.equal(JSON.stringify([control, perturbed]), before);
});

test("missing samples stay unknown and zero stimulus stays zero", () => {
  const missing = embodimentAtStep({ ...control, activity: [] }, 3);
  assert.equal(missing.output, null);
  assert.equal(missing.thresholdReached, null);
  assert.equal(missing.input, null);
  assert.equal(missing.stimulus, 0);
  const quiet = createCompactEvidence(createEvidencePayload({ researchQuestion: "No stimulus", networkDefinition: syntheticDemoNetwork, experimentSpec: { ...demoExperimentSpec, stimulus: { amplitude: 0 } } })).comparison.control;
  assert.equal(embodimentAtStep(quiet, 0).stimulus, 0);
  assert.equal(embodimentAtStep(quiet, 0).output, 0);
  assert.equal(embodimentAtStep(quiet, 0).thresholdReached, false);
});

test("single-fly playback visits control then intervention and stops; comparison stays synchronized", () => {
  const steps = [0, 1, 3, 4, 5];
  let state = { cursor: 0, playing: true, pass: 0 };
  const frames = [];
  while (state.playing) {
    frames.push(embodiedFrame(steps, state.cursor, false));
    state = advanceEmbodiedPlayback(state, steps.length, false);
  }
  assert.deepEqual(frames.map(f => [f.condition, f.step]), ["control", "perturbed"].flatMap(condition => steps.map(step => [condition, step])));
  assert.equal(state.cursor, 9);
  assert.equal(advanceEmbodiedPlayback(state, steps.length, false), state, "Pause freezes the recorded cursor");
  assert.deepEqual(embodiedFrame(steps, 3, true), { condition: "control", step: 4, index: 3 });
  assert.equal(advanceEmbodiedPlayback({ cursor: 4, playing: true, pass: 0 }, 5, true).playing, false);
});

test("looming pose approaches and expands only for the declared stimulus, without changing evidence", () => {
  const before = JSON.stringify(control);
  const start = loomingPose(embodimentAtStep(control, 0).stimulus, 0);
  const finish = loomingPose(embodimentAtStep(control, 0).stimulus, 1);
  assert.ok(finish.z > start.z && finish.radius > start.radius);
  assert.equal(loomingPose(0, 1).visible, false);
  assert.deepEqual(loomingPose(1, 2), finish);
  assert.equal(JSON.stringify(control), before);
});
