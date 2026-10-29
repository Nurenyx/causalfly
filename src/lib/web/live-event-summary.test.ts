import assert from "node:assert/strict";
import test from "node:test";
import { disconnectedFruitFly, type FruitFlyEvidence } from "../sources/contracts";
import { liveEventSummary } from "./live-event-summary";

// Minimal offline received-frame fixtures; never supplied to the product runtime.
const frame = (neuralTick: number, motorMode: string, totalSpikeEvents = 0, sessionId = "session") => ({ telemetry: { sessionId, neuralTick, sequence: neuralTick, simulationMs: neuralTick * 50, motorMode, totalSpikeEvents } } as FruitFlyEvidence);
const snapshot = (evidence: FruitFlyEvidence) => ({ ...disconnectedFruitFly(), evidence });

test("received decoder change outranks counts and does not invent gap contents or causal meaning", () => {
  const frames = [frame(3, "IDLE", 900), frame(7, "ESCAPE", 10), frame(8, "ESCAPE", 2000)];
  const before = JSON.stringify(frames);
  const summary = liveEventSummary(snapshot(frames[2]), frames)!;
  assert.equal(summary.label, "DECODER CHANGE / RETAINED WINDOW");
  assert.equal(summary.headline, "The simulated decoder changed from IDLE to ESCAPE across received ticks 3–7.");
  assert.doesNotMatch(summary.headline, /caused|successful|because|movement/);
  assert.equal(JSON.stringify(frames), before);
});

test("fallback peak uses received totals, keeps zero, and excludes other sessions", () => {
  const frames = [frame(1, "ESCAPE", 9999, "other-session"), frame(3, "IDLE", 400), frame(8, "IDLE", 200)];
  const summary = liveEventSummary(snapshot(frames[2]), frames)!;
  assert.equal(summary.label, "HIGHEST RECEIVED SPIKE COUNT");
  assert.match(summary.headline, /400 simulated spike events at tick 3/);
  assert.doesNotMatch(summary.headline, /ESCAPE|9,999/);
  const zero = frame(1, "IDLE");
  assert.match(liveEventSummary(snapshot(zero), [])!.headline, /0 simulated spike events/);
  assert.equal(liveEventSummary(disconnectedFruitFly(), frames), null);
});

test("summary respects the snapshot cutoff, sorts received frames, and includes a snapshot missing from history", () => {
  const first = frame(1, "IDLE", 100);
  const latest = frame(3, "ESCAPE", 200);
  const future = frame(5, "WALK", 5000);
  const summary = liveEventSummary(snapshot(latest), [future, first, first])!;
  assert.match(summary.headline, /IDLE to ESCAPE across received ticks 1–3/);
  assert.doesNotMatch(summary.headline, /WALK|5,000/);
});
