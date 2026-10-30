import test from "node:test";
import assert from "node:assert/strict";
import { stimulusDraft } from "./stimulus-draft";
import { demoExperimentSpec } from "../experiment/demo";
import { offlinePerceptionFixture } from "../perception/fixture";
import type { GuidedDesign } from "./contracts";
const design: GuidedDesign = { id: "draft", researchQuestion: "test", mode: "FAKE META CLIENT", runtimeCalls: [], spec: demoExperimentSpec };
test("synthetic amplitude persists before design and across replacement design IDs", () => {
  assert.equal(stimulusDraft(undefined, .6).amplitude, .6);
  assert.deepEqual(stimulusDraft(design, .6), { amplitude: .6, stale: true, locked: false });
  const redesigned = { ...design, id: "new-design", spec: { ...design.spec, stimulus: { amplitude: .6 } } };
  assert.deepEqual(stimulusDraft(redesigned, .6), { amplitude: .6, stale: false, locked: false });
  assert.equal(stimulusDraft(undefined, .6).amplitude, .6, "Navigating without a design cannot reset the saved draft");
});
test("changed input invalidates a retained design without mutating it or earlier evidence", () => {
  const before = JSON.stringify(design);
  assert.equal(stimulusDraft(design, .35).stale, true);
  assert.equal(stimulusDraft(design, 1).stale, false);
  assert.equal(JSON.stringify(design), before);
});
test("measured SAM amplitude wins over synthetic draft and remains locked", () => {
  const perceptionInput = offlinePerceptionFixture("locked");
  assert.deepEqual(stimulusDraft({ ...design, perceptionInput }, .2), { amplitude: .64, stale: false, locked: true });
});
