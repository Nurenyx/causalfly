import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { retainScene, retainedScene } from "./scene-store";
import { offlineScene, type SceneRecord } from "./scene";
const record = (): SceneRecord => ({ id: randomUUID(), run_id: "test", model: "calibration-scene-v1", provider: "CausalFly fixture", mode: "OFFLINE SCENE-UNDERSTANDING FIXTURE", mediaSha256: "test", result: structuredClone(offlineScene) });
test("scene retention snapshots candidates immutably instead of trusting browser edits", () => {
  const input = record(); const retained = retainScene(input);
  input.result.candidates[0].samPrompt = "tampered";
  assert.equal(retainedScene(input.id)?.result.candidates[0].samPrompt, "red square");
  assert.equal(Object.isFrozen(retained.result.candidates[0]), true);
});
test("expired scenes fail closed and bounded retention evicts the oldest entry", t => {
  let now = Date.now(); t.mock.method(Date, "now", () => now);
  const old = retainScene(record()); now += 2 * 60 * 60 * 1000 + 1;
  assert.equal(retainedScene(old.id), undefined);
  const first = retainScene(record());
  for (let i = 0; i < 100; i++) retainScene(record());
  assert.equal(retainedScene(first.id), undefined);
});
