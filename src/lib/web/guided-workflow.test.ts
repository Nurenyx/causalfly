import test from "node:test";
import assert from "node:assert/strict";
import { runGuidedAction } from "./guided-workflow";
import { FakeMetaClient } from "../meta/fake-client";
import type { MetaClient, MetaRequest } from "../meta/client";
import { comparisonRequirements, workflowProgress } from "./workflow-progress";
import { workspaceReducer } from "./dashboard";

function fixture() {
  const calls: string[] = [];
  const fake = new FakeMetaClient();
  const client: MetaClient = { mode: fake.mode, complete(request: MetaRequest) { calls.push(request.task); return fake.complete(request); } };
  return { calls, deps: { env: {}, createClient: () => client } };
}

test("design, approved run and explicit interpretation are isolated; repeated requests are idempotent", async () => {
  const { calls, deps } = fixture();
  const designed = await runGuidedAction({ action: "design", researchQuestion: "Does silencing primary_a change output?" }, deps);
  assert.ok(designed.ok); assert.equal(designed.result, undefined); assert.deepEqual(calls, ["design"]);
  const early = await runGuidedAction({ action: "interpret", id: designed.design.id }, deps);
  assert.equal(early.ok, false); assert.deepEqual(calls, ["design"]);
  const run = await runGuidedAction({ action: "run", id: designed.design.id }, { createClient: () => { throw new Error("Engine execution must never construct Meta"); } });
  assert.ok(run.ok && run.result); assert.equal(run.result.analysis, undefined);
  assert.ok(Object.values(run.result.measuredEvidence.provenance.matchedConditions).every(Boolean));
  const before = JSON.stringify(run.result.measuredEvidence);
  const interpreted = await runGuidedAction({ action: "interpret", id: designed.design.id }, deps);
  assert.ok(interpreted.ok && interpreted.result?.analysis); assert.deepEqual(calls, ["design", "interpret"]);
  assert.equal(JSON.stringify(interpreted.result.measuredEvidence), before);
  assert.equal(run.result.analysis, undefined); assert.ok(Object.isFrozen(interpreted.result.measuredEvidence));
  assert.equal(interpreted.result.runtimeCalls?.length, 2);
  await runGuidedAction({ action: "run", id: designed.design.id }, deps);
  await runGuidedAction({ action: "interpret", id: designed.design.id }, deps);
  assert.deepEqual(calls, ["design", "interpret"]);
  assert.ok(comparisonRequirements(false, designed.design, run.result).every(r => r.status === "satisfied"));
});

test("arbitrary client evidence and unknown IDs cannot reach interpretation", async () => {
  const { calls, deps } = fixture();
  for (const input of [{ action: "interpret", id: "00000000-0000-4000-8000-000000000000" }, { action: "run", id: "bad", evidence: {} }, { action: "design", researchQuestion: " " }]) {
    assert.equal((await runGuidedAction(input, deps)).ok, false);
  }
  assert.deepEqual(calls, []);
});

test("provider failure preserves measurements and never silently falls back", async () => {
  const { deps } = fixture();
  const d = await runGuidedAction({ action: "design", researchQuestion: "A bounded fixture experiment" }, deps);
  assert.ok(d.ok);
  const run = await runGuidedAction({ action: "run", id: d.design.id }, deps); assert.ok(run.ok);
  const failed = await runGuidedAction({ action: "interpret", id: d.design.id }, { env: {}, createClient: () => ({ mode: "META LIVE", complete: async () => { throw new Error("Offline injected provider failure"); } }) });
  assert.equal(failed.ok, false);
  const retained = await runGuidedAction({ action: "run", id: d.design.id }, deps); assert.ok(retained.ok);
  assert.equal(retained.result, run.result); assert.equal(retained.result?.analysis, undefined);
});

test("duplicate in-flight analysis cannot issue a second model request", async () => {
  const { deps } = fixture();
  const d = await runGuidedAction({ action: "design", researchQuestion: "Controlled fixture test" }, deps); assert.ok(d.ok);
  await runGuidedAction({ action: "run", id: d.design.id }, deps);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const slow = { env: {}, createClient: () => ({ mode: "FAKE META CLIENT" as const, complete: async (r: MetaRequest) => { calls++; await gate; return new FakeMetaClient().complete(r); } }) };
  const first = runGuidedAction({ action: "interpret", id: d.design.id }, slow);
  const duplicate = await runGuidedAction({ action: "interpret", id: d.design.id }, slow);
  assert.equal(duplicate.ok, false); assert.equal(calls, 1); release(); assert.ok((await first).ok);
});

test("observational evidence never unlocks causal comparison; state transitions preserve records", async () => {
  const { deps } = fixture();
  const d = await runGuidedAction({ action: "design", researchQuestion: "State preservation" }, deps); assert.ok(d.ok);
  let state = workspaceReducer({ workspace: "observatory", question: "State preservation", result: null }, { type: "designed", design: d.design });
  for (const workspace of ["live", "compare", "scientist", "evidence", "observatory"] as const) {
    state = workspaceReducer(state, { type: "navigate", workspace }); assert.equal(state.design, d.design);
    const stages = workflowProgress({ ...state, question: state.question, external: true, hasTelemetry: true, hasQuestion: true, hasMeta: true, pending: "" });
    assert.equal(stages.find(s => s.id === "compare")?.state, "LOCKED");
  }
  assert.equal(comparisonRequirements(true).filter(r => r.status === "satisfied").length, 0);
  const stages = workflowProgress({ ...state, external: false, hasTelemetry: false, hasQuestion: false, hasMeta: false, pending: "" });
  assert.equal(stages.find(s => s.id === "run")?.state, "READY");
  assert.equal(stages.find(s => s.id === "compare")?.state, "LOCKED");
});

test("approved stimulus strength forks validated immutable evidence without another Meta call", async () => {
  const { calls, deps } = fixture();
  const original = await runGuidedAction({ action: "design", researchQuestion: "Silence the primary pathway" }, deps); assert.ok(original.ok);
  const first = await runGuidedAction({ action: "run", id: original.design.id }, deps); assert.ok(first.ok && first.result);
  const interpreted = await runGuidedAction({ action: "interpret", id: original.design.id }, deps); assert.ok(interpreted.ok && interpreted.result?.analysis);
  const before = JSON.stringify(interpreted.result);
  const noMeta = { createClient: () => { throw new Error("Changing stimulus must only execute the engine"); } };
  const changed = await runGuidedAction({ action: "run", id: original.design.id, stimulusAmplitude: .6 }, noMeta);
  assert.ok(changed.ok && changed.result);
  assert.notEqual(changed.design.id, original.design.id);
  assert.notEqual(changed.design.spec.id, original.design.spec.id);
  assert.equal(changed.design.spec.stimulus.amplitude, .6);
  assert.deepEqual(changed.design.spec.perturbation, original.design.spec.perturbation);
  assert.equal(changed.result.measuredEvidence.control.outputPeakActivity, .6);
  assert.equal(changed.result.measuredEvidence.perturbed.outputPeakActivity, .3);
  assert.equal(changed.result.measuredEvidence.perturbed.outputThresholdCrossingStep, null);
  assert.equal(changed.result.analysis, undefined, "Old interpretation cannot follow changed measurements");
  assert.ok(Object.values(changed.result.measuredEvidence.provenance.matchedConditions).every(Boolean));
  for (const trial of [changed.result.measuredEvidence.control, changed.result.measuredEvidence.perturbed]) {
    assert.equal(trial.provenance.experiment.stimulus.amplitude, .6);
    assert.equal(trial.activity[0].nodes.stimulus, .6);
  }
  assert.deepEqual(changed.result.stimulusOverride, { sourceDesignId: original.design.id, originalAmplitude: 1, amplitude: .6 });
  const repeated = await runGuidedAction({ action: "run", id: original.design.id, stimulusAmplitude: .6 }, noMeta); assert.ok(repeated.ok);
  assert.equal(repeated.result, changed.result, "Duplicate approved runs reuse retained evidence");
  const retained = await runGuidedAction({ action: "run", id: original.design.id }, noMeta); assert.ok(retained.ok);
  assert.equal(retained.result, interpreted.result);
  assert.equal(JSON.stringify(retained.result), before);
  assert.ok(Object.isFrozen(changed.result.measuredEvidence));
  assert.deepEqual(calls, ["design", "interpret"]);
  const state = workspaceReducer({ workspace: "observatory", question: original.design.researchQuestion, design: original.design, result: first.result }, { type: "completed", result: changed.result, design: changed.design, workspace: "observatory" });
  assert.equal(state.design, changed.design);
  assert.equal(state.result, changed.result);
});

test("invalid stimulus adjustments cannot execute or reach Meta; zero stimulus stays a real zero-input run", async () => {
  const { calls, deps } = fixture();
  const designed = await runGuidedAction({ action: "design", researchQuestion: "A bounded stimulus test" }, deps); assert.ok(designed.ok);
  for (const stimulusAmplitude of [-.1, 1.1, .123, NaN, Infinity, "0.5"]) {
    const response = await runGuidedAction({ action: "run", id: designed.design.id, stimulusAmplitude }, deps);
    assert.equal(response.ok, false);
  }
  const zero = await runGuidedAction({ action: "run", id: designed.design.id, stimulusAmplitude: 0 }, deps); assert.ok(zero.ok && zero.result);
  assert.equal(zero.result.measuredEvidence.control.outputPeakActivity, 0);
  assert.equal(zero.result.measuredEvidence.perturbed.outputPeakActivity, 0);
  assert.equal(zero.result.measuredEvidence.control.outcome, "THRESHOLD_NOT_REACHED");
  assert.deepEqual(calls, ["design"]);
});
