import test from "node:test";
import assert from "node:assert/strict";
import { disconnectedFruitFly } from "./contracts";
import { testerLiveState } from "./tester-live-state";
import { sessionStatus } from "./live-session";
import { validatedRecording } from "./validated-recording";
import original from "../../../docs/review/sprint-6b/recorded-evidence.json";

test("tester states distinguish backend availability, fresh telemetry and recorded replay", () => {
  const base = disconnectedFruitFly();
  assert.equal(testerLiveState(base, Date.now()), "OFFLINE");
  assert.equal(testerLiveState({ ...base, state: "CONNECTING" }, Date.now()), "CONNECTING");
  assert.equal(testerLiveState({ ...base, state: "CONNECTED" }, Date.now()), "READY");
  assert.equal(testerLiveState({ ...base, state: "ERROR" }, Date.now()), "ERROR");
  const evidence = validatedRecording()[0], now = Date.parse(evidence.receivedAt);
  const snapshot = { ...base, state: "DATA RECEIVED" as const, evidence };
  assert.equal(testerLiveState(snapshot, now), "RUNNING");
  assert.equal(testerLiveState(snapshot, now + 5001), "READY");
  const recorded = { ...snapshot, presentation: "RECORDED_REPLAY" as const };
  assert.equal(testerLiveState(recorded, now), "RECORDED_REPLAY");
  assert.equal(sessionStatus(recorded, now).live, false);
  assert.equal(sessionStatus(recorded, now).connected, false);
});
test("recorded playback retains exact original evidence, model times and provenance", () => {
  const frames = validatedRecording();
  assert.deepEqual(frames, original);
  assert.equal(frames.length, 4); assert.equal(frames.at(-1)!.telemetry.simulationMs, 200);
  assert.ok(Object.isFrozen(frames)); assert.ok(Object.isFrozen(frames[0].telemetry));
});
