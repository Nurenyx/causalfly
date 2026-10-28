import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ANATOMY_HASH, parseAnatomy } from "./anatomy";
import { ACTIVITY_EMPHASIS, anatomyRenderTransform, buildConnectomeStructure, classifyConnectomeActivity } from "./connectome-view";
import { emptyLiveSession, receiveSnapshot, sessionStatus } from "./live-session";
import type { FruitFlyEvidence, FruitFlySnapshot } from "./contracts";

const anatomy = () => parseAnatomy({ dataset: "male-cns:v1.0", connectomeSha256: ANATOMY_HASH, coordinateSemantics: "RAW_NEUPRINT_VOXEL_XYZ_ORIENTATION_UNSPECIFIED", capturedAt: "2026-10-27T12:00:00Z", count: 3, points: [[10, 0, 10, 20], [20, 10, 30, 50], [30, 20, 50, 80]] });
const frame = (sequence: number, ids: number[], sessionId = "test-session") => ({ telemetry: { sessionId, sequence, neuralTick: sequence * 10, spikeEvents: ids.map(neuronId => ({ neuronId, spikeTimeMs: sequence * 50 })) } });

test("3D transform centers bounds with one uniform scale and a rigid axis conversion", () => {
  const a = anatomy(), t = anatomyRenderTransform(a);
  assert.deepEqual(t.min, [0, 10, 20]); assert.deepEqual(t.max, [20, 50, 80]);
  assert.deepEqual(t.center, [10, 30, 50]); assert.equal(t.scale, 2 / 60);
  assert.deepEqual(t.apply([10, 30, 50]), [0, -0, -0]);
  const low = t.apply([0, 10, 20]), high = t.apply([20, 50, 80]);
  assert.equal(high[0] - low[0], 20 * t.scale);
  assert.equal(high[1] - low[1], -40 * t.scale);
  assert.equal(high[2] - low[2], -60 * t.scale);
  assert.equal(Math.hypot(...high.map((v, i) => v - low[i])), Math.hypot(20, 40, 60) * t.scale);
});

test("3D buffers preserve every source coordinate and never mutate source data", () => {
  const a = anatomy(), before = JSON.stringify(a), s = buildConnectomeStructure(a);
  assert.equal(s.positions.length, 9); assert.equal(s.count, 3);
  assert.deepEqual([...s.lookup], [[10, 0], [20, 1], [30, 2]]);
  assert.equal(s.lookup.get(99), undefined);
  a.points.forEach((p, i) => assert.deepEqual([...s.positions.slice(i * 3, i * 3 + 3)], [...new Float32Array(s.transform.apply([p[1], p[2], p[3]]))]));
  assert.equal(JSON.stringify(a), before);
  assert.deepEqual(buildConnectomeStructure(a).positions, s.positions);
});

test("single-coordinate normalization stays finite without inventing locations", () => {
  const s = buildConnectomeStructure({ ...anatomy(), count: 1, points: [[1, 5, 5, 5]] });
  assert.deepEqual([...s.positions], [0, -0, -0]); assert.ok(Number.isFinite(s.transform.scale));
});

test("telemetry mapping counts unique supplied IDs; missing IDs get no substitute", () => {
  const s = buildConnectomeStructure(anatomy());
  const frames = [frame(1, [10, 10, 20, 99, 99])], before = JSON.stringify(frames);
  const activity = classifyConnectomeActivity(s, frames);
  assert.equal(activity.mapped, 2); assert.equal(activity.unmapped, 1);
  assert.deepEqual(activity.current.map(p => p.id), [10, 20]); assert.deepEqual(activity.recent, []);
  assert.equal(activity.current[0].index, s.lookup.get(10));
  assert.equal(JSON.stringify(frames), before);
});

test("current and recent are actual received frames, with newest occurrence winning", () => {
  const s = buildConnectomeStructure(anatomy());
  const a = classifyConnectomeActivity(s, [frame(1, [10]), frame(8, [10, 20]), frame(100, [30, 99])]);
  assert.deepEqual(a.current.map(p => [p.id, p.sequence, p.tick, p.emphasis]), [[30, 100, 1000, 1]]);
  assert.deepEqual(a.recent.map(p => [p.id, p.age, p.emphasis]), [[10, 1, .48], [20, 1, .48]]);
  assert.equal(a.unmapped, 1); assert.equal(a.receivedFrames, 3);
  assert.ok([...a.current, ...a.recent].every(p => [1, 8, 100].includes(p.sequence)));
});

test("recency is bounded to four received frames, without clock-based or invented activity", () => {
  const s = buildConnectomeStructure(anatomy());
  const a = classifyConnectomeActivity(s, [frame(1, [30]), frame(2, [10]), frame(3, [20]), frame(4, []), frame(5, [])]);
  assert.deepEqual(a.current, []);
  assert.deepEqual(a.recent.map(p => [p.id, p.age, p.emphasis]), [[20, 2, ACTIVITY_EMPHASIS[2]], [10, 3, ACTIVITY_EMPHASIS[3]]]);
  assert.equal(a.receivedFrames, 4);
  assert.ok(!a.recent.some(p => p.id === 30));
  assert.deepEqual(classifyConnectomeActivity(s, []), { current: [], recent: [], mapped: 0, unmapped: 0, receivedFrames: 0 });
});

test("session boundaries never carry previous-session activity", () => {
  const a = classifyConnectomeActivity(buildConnectomeStructure(anatomy()), [frame(1, [10], "old"), frame(1, [20], "new")]);
  assert.deepEqual(a.current.map(p => p.id), [20]); assert.deepEqual(a.recent, []);
});

test("stale, disconnect and reconnect transitions preserve the exact final received activity", () => {
  const s = buildConnectomeStructure(anatomy());
  // Display-only fixture; transport validation is covered by fruitfly/live-session tests.
  const evidence = { ...frame(1, [10, 99]), receivedAt: "2026-10-28T12:00:00Z" } as FruitFlyEvidence;
  const snapshot = (state: FruitFlySnapshot["state"], e: FruitFlyEvidence | null): FruitFlySnapshot => ({ source: "FRUITFLY_XR", state, evidence: e, message: "offline fixture" });
  let session = receiveSnapshot(emptyLiveSession(), snapshot("DATA RECEIVED", evidence));
  const before = classifyConnectomeActivity(s, session.frames);
  assert.equal(sessionStatus(session.snapshot, Date.parse(evidence.receivedAt) + 4999).live, true);
  assert.equal(sessionStatus(session.snapshot, Date.parse(evidence.receivedAt) + 5000).historical, true);
  for (const state of ["CONNECTED", "DISCONNECTED", "CONNECTING", "CONNECTED"] as const) {
    const oldFrames = session.frames;
    session = receiveSnapshot(session, snapshot(state, null));
    assert.equal(session.frames, oldFrames); assert.equal(session.snapshot.evidence, evidence);
    assert.deepEqual(classifyConnectomeActivity(s, session.frames), before);
  }
});

test("full published asset produces exactly 141781 structural vertices with reliable exact ID mapping", () => {
  const a = parseAnatomy(JSON.parse(readFileSync("public/anatomy/male-cns-v1.json", "utf8")));
  const before = JSON.stringify(a), s = buildConnectomeStructure(a);
  assert.equal(s.count, 141781); assert.equal(s.positions.length, 425343); assert.equal(s.lookup.size, 141781);
  assert.deepEqual(s.transform.min, [2468, 4758, 10154]); assert.deepEqual(s.transform.max, [93668, 68996, 134531]);
  assert.deepEqual(s.transform.center, [48068, 36877, 72342.5]); assert.equal(s.transform.scale, 2 / 124377);
  const ids = [a.points[0][0], a.points.at(-1)![0]];
  assert.deepEqual(classifyConnectomeActivity(s, [frame(1, ids)]).current.map(p => p.id), ids);
  assert.equal(JSON.stringify(a), before);
});
