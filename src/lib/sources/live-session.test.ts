import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { connectomeHash, FruitFlyNormalizer } from "./fruitfly-protocol";
import { type FruitFlyEvidence, type FruitFlySnapshot } from "./contracts";
import { activityRaster, activitySeries, createLiveConnection, emptyLiveSession, frameAgeMs, LIVE_FRAME_LIMIT, LIVE_STALE_AFTER_MS, receiveSnapshot, sessionObservations, sessionStatus, sessionTimeline, type TelemetrySubscription } from "./live-session";

const now = Date.parse("2026-10-27T16:00:00Z");
function evidence(sequence = 1, sessionId = "8c66e194-3693-4ae5-942a-886d819b08bc", overrides = {}): FruitFlyEvidence {
  const normalizer = new FruitFlyNormalizer();
  normalizer.accept({ version: 1, type: "observatoryHello", dataset: "male-cns:v1.0", connectomeSha256: connectomeHash,
    neurons: 176422, edges: 6287749, neuronIds: true, spikeEventsAvailable: true, synapticTransmissionEvents: false,
    edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL", maxDisplaySpikes: 512, maxDisplayEdges: 256 }, new Date(now).toISOString());
  return normalizer.accept({ version: 1, type: "observatoryFrame", sessionId, sequence, simulationMs: sequence * 50,
    neuralTick: sequence, totalSpikeEvents: 3364, activeNeuronCount: 724, displaySpikeEvents: 2, displayTruncated: true,
    droppedDisplayFrames: 0, droppedSubscriberMessages: 0, spikeDisplaySemantics: "EXACT_SPIKES_FIRST_N_FILTERED",
    edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL",
    spikeEvents: [{ neuronId: 10000000001, spikeTimeMs: sequence * 50 - 1 }, { neuronId: 10000000002, spikeTimeMs: sequence * 50 }],
    decodedMotor: [{ name: "jump", value: .4321234567 }, { name: "yaw", value: -.123456789 }],
    inputSequence: sequence, inputFresh: true, motorMode: "ESCAPE", ...overrides }, new Date(now + sequence).toISOString())!;
}
const snapshot = (value: FruitFlyEvidence | null = evidence(), state: FruitFlySnapshot["state"] = "DATA RECEIVED"): FruitFlySnapshot => ({ source: "FRUITFLY_XR", state, message: "Validated test stream", evidence: value });

test("rolling display history is bounded, ordered and preserves exact frozen evidence", () => {
  let session = emptyLiveSession();
  const records = Array.from({ length: LIVE_FRAME_LIMIT + 15 }, (_, i) => evidence(i + 1));
  const before = JSON.stringify(records);
  for (const record of records) session = receiveSnapshot(session, snapshot(record));
  assert.equal(session.frames.length, LIVE_FRAME_LIMIT);
  assert.deepEqual(session.frames.map((f) => f.telemetry.sequence), Array.from({ length: LIVE_FRAME_LIMIT }, (_, i) => i + 16));
  assert.equal(session.frames.at(-1), records.at(-1));
  assert.equal(session.snapshot.evidence, records.at(-1));
  assert.equal(JSON.stringify(records), before);
  assert.ok(Object.isFrozen(session.snapshot.evidence));
});

test("connection notifications, duplicate snapshots and late same-session frames add no samples", () => {
  const original = receiveSnapshot(emptyLiveSession(), snapshot(evidence(4)));
  let session = receiveSnapshot(original, snapshot(original.snapshot.evidence, "CONNECTED"));
  session = receiveSnapshot(session, snapshot(evidence(3)));
  session = receiveSnapshot(session, snapshot(null, "DISCONNECTED"));
  assert.equal(session.frames, original.frames);
  assert.equal(session.snapshot.evidence, original.snapshot.evidence);
  assert.equal(session.frames.length, 1);
});

test("reconnect retains the last snapshot until a new valid frame; new sessions reset plots", () => {
  const first = receiveSnapshot(emptyLiveSession(), snapshot(evidence(5)));
  let next = receiveSnapshot(first, snapshot(null, "DISCONNECTED"));
  next = receiveSnapshot(next, snapshot(null, "CONNECTING"));
  next = receiveSnapshot(next, snapshot(null, "CONNECTED"));
  assert.equal(next.snapshot.evidence, first.snapshot.evidence);
  assert.equal(sessionStatus(next.snapshot, now + 10).live, false);
  next = receiveSnapshot(next, snapshot(evidence(6)));
  assert.equal(sessionStatus(next.snapshot, now + 10).live, true);
  next = receiveSnapshot(next, snapshot(evidence(1, "08f6310f-b69a-4a1e-a471-e64be859c166")));
  assert.equal(next.frames.length, 1);
  assert.equal(next.snapshot.evidence!.telemetry.sequence, 1);
});

test("freshness expires at five seconds even if no further stream notifications arrive", () => {
  const value = evidence();
  const received = Date.parse(value.receivedAt);
  assert.equal(sessionStatus(snapshot(value), received + LIVE_STALE_AFTER_MS - 1).label, "LIVE DATA");
  const stale = sessionStatus(snapshot(value), received + LIVE_STALE_AFTER_MS);
  assert.equal(stale.label, "STALE");
  assert.equal(stale.live, false);
  assert.equal(stale.historical, true);
  assert.equal(snapshot(value).evidence, value);
});

test("empty, waiting, stale-open, disconnected and error states never claim LIVE DATA", () => {
  const value = evidence();
  for (const [state, e, expected] of [
    ["DISCONNECTED", null, "DISCONNECTED"], ["CONNECTING", null, "CONNECTING"],
    ["CONNECTED", null, "WAITING FOR DATA"], ["CONNECTED", value, "STALE"],
    ["DISCONNECTED", value, "DISCONNECTED"], ["ERROR", value, "ERROR"],
    ["CONNECTING", value, "CONNECTING"],
  ] as const) {
    const status = sessionStatus(snapshot(e, state), now + 10);
    assert.equal(status.label, expected);
    assert.equal(status.live, false);
    assert.equal(status.historical, Boolean(e));
  }
  assert.equal(frameAgeMs(null, now), null);
  assert.equal(frameAgeMs({ ...value, receivedAt: "invalid" }, now), null);
  assert.equal(sessionStatus(snapshot(value), now - 100).live, false);
});

test("session observations are exact deterministic facts with honest truncation and input labels", () => {
  assert.deepEqual(sessionObservations(null), []);
  assert.deepEqual(sessionObservations(evidence()), [
    "3,364 simulated spike events were reported in the latest tick.", "Motor decoder state is ESCAPE.",
    "Display data is truncated to 2 events.", "Input reference is fresh.",
  ]);
  const missing = sessionObservations(evidence(1, undefined, { inputSequence: -1, inputFresh: false, droppedDisplayFrames: 3, droppedSubscriberMessages: 2 }));
  assert.ok(missing.includes("No input reference was reported."));
  assert.ok(missing.includes("The producer reports 3 dropped display frames and 2 subscriber drops."));
  assert.ok(sessionObservations(evidence(1, undefined, { inputFresh: false })).includes("Input reference is not fresh."));
  assert.ok(sessionObservations(evidence(1, undefined, { totalSpikeEvents: 2, displayTruncated: false })).includes("All 2 spike events in this tick are included in the display data."));
});

test("plot values and categorical raster positions use only supplied ticks, IDs and model times", () => {
  const frames = [evidence(2), evidence(5)];
  const before = JSON.stringify(frames);
  assert.deepEqual(activitySeries(frames), [{ sequence: 2, tick: 2, spikes: 3364, active: 724 }, { sequence: 5, tick: 5, spikes: 3364, active: 724 }]);
  const raster = activityRaster(frames);
  assert.deepEqual(raster.ids, [10000000001, 10000000002]);
  assert.deepEqual(raster.points.map((p) => [p.neuronId, p.modelMs, p.row, p.sequence]), [[10000000001, 99, 0, 2], [10000000002, 100, 1, 2], [10000000001, 249, 0, 5], [10000000002, 250, 1, 5]]);
  assert.equal(JSON.stringify(frames), before);
});

test("raster stays bounded and discloses the supplied IDs omitted from the view", () => {
  const frames = Array.from({ length: 40 }, (_, i) => evidence(i + 1, undefined, {
    spikeEvents: Array.from({ length: 100 }, (_, j) => ({ neuronId: 1000 + j, spikeTimeMs: (i + 1) * 50 })), displaySpikeEvents: 100,
  }));
  const raster = activityRaster(frames);
  assert.equal(raster.totalIds, 100);
  assert.equal(raster.ids.length, 64);
  assert.equal(raster.points.length, 24 * 64);
  assert.ok(raster.points.every((p) => p.sequence >= 17));
  const empty = activityRaster([evidence(1, undefined, { totalSpikeEvents: 0, displaySpikeEvents: 0, spikeEvents: [], displayTruncated: false })]);
  assert.deepEqual(empty, { ids: [], totalIds: 0, points: [] });
});

test("timeline reports only received frames and observed decoder changes, without filling gaps", () => {
  const frames = [evidence(1, undefined, { motorMode: "IDLE" }), evidence(4), evidence(8)];
  const events = sessionTimeline(frames);
  assert.deepEqual(events.map((e) => e.sequence), [1, 4, 8]);
  assert.deepEqual(events.map((e) => e.label), ["Frame 1 received", "IDLE → ESCAPE", "Frame 8 received"]);
  assert.equal(events[1].modelMs, 200);
  assert.equal(events[1].receivedAt, frames[1].receivedAt);
  assert.equal(events[1].detail, "Input reference 4");
  assert.equal(sessionTimeline(Array.from({ length: 20 }, (_, i) => evidence(i + 1))).length, 6);
  assert.deepEqual(sessionTimeline([]), []);
});

test("display derivation preserves structural provenance and the simulated recording boundary", () => {
  const record = evidence();
  const session = receiveSnapshot(emptyLiveSession(), snapshot(record));
  activitySeries(session.frames); activityRaster(session.frames); sessionTimeline(session.frames); sessionObservations(record);
  assert.equal(session.snapshot.evidence!.provenance, record.provenance);
  assert.equal(record.provenance.dataset, "male-cns:v1.0");
  assert.equal(record.provenance.connectomeSha256, connectomeHash);
  assert.equal(record.provenance.dynamics, "SIMULATED");
  assert.equal(record.provenance.experimentalRecording, false);
});

class MockSubscription implements TelemetrySubscription {
  onmessage: TelemetrySubscription["onmessage"] = null;
  onerror: TelemetrySubscription["onerror"] = null;
  closes = 0;
  close() { this.closes++; }
  receive(value: FruitFlySnapshot) { this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(value) })); }
  fail() { this.onerror?.(new Event("error")); }
}

test("normal streaming makes no Meta or fetch request and opens only the existing SSE route", () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = () => { assert.fail("No fetch or Meta request is allowed"); };
  try {
    let session = emptyLiveSession();
    const subscription = new MockSubscription();
    const urls: string[] = [];
    const connection = createLiveConnection((s) => { session = receiveSnapshot(session, s); }, (url) => { urls.push(url); return subscription; });
    assert.deepEqual(urls, []);
    connection.connect();
    subscription.receive(snapshot(null, "CONNECTED"));
    for (let i = 1; i <= 180; i++) subscription.receive(snapshot(evidence(i)));
    sessionObservations(session.snapshot.evidence);
    assert.deepEqual(urls, ["/api/sources/fruitfly"]);
    assert.equal(session.frames.length, LIVE_FRAME_LIMIT);
    assert.equal(session.snapshot.evidence!.telemetry.sequence, 180);
    connection.dispose();
    assert.equal(subscription.closes, 1);
  } finally { globalThis.fetch = oldFetch; }
});

test("disconnect and reconnect preserve the snapshot and ignore callbacks from the old subscription", () => {
  let session = emptyLiveSession();
  const sockets: MockSubscription[] = [];
  const connection = createLiveConnection((s) => { session = receiveSnapshot(session, s); }, () => { const s = new MockSubscription(); sockets.push(s); return s; });
  connection.connect(); sockets[0].receive(snapshot(evidence(1)));
  connection.disconnect();
  assert.equal(session.snapshot.state, "DISCONNECTED");
  assert.equal(session.snapshot.evidence!.telemetry.sequence, 1);
  connection.connect();
  sockets[0].receive(snapshot(evidence(99))); sockets[0].fail();
  assert.equal(session.snapshot.state, "CONNECTING");
  assert.equal(session.snapshot.evidence!.telemetry.sequence, 1);
  sockets[1].receive(snapshot(null, "CONNECTED")); sockets[1].receive(snapshot(evidence(2)));
  assert.equal(session.snapshot.state, "DATA RECEIVED");
  assert.equal(session.snapshot.evidence!.telemetry.sequence, 2);
  sockets[1].fail();
  assert.equal(session.snapshot.state, "DISCONNECTED");
  assert.equal(session.frames.length, 2);
  connection.dispose();
});

test("malformed transport data and startup errors preserve the latest snapshot and publish fixed errors", () => {
  let session = emptyLiveSession();
  const socket = new MockSubscription();
  const connection = createLiveConnection((s) => { session = receiveSnapshot(session, s); }, () => socket);
  connection.connect(); socket.receive(snapshot());
  socket.onmessage?.(new MessageEvent("message", { data: "private-secret-not-json" }));
  assert.equal(session.snapshot.state, "ERROR");
  assert.ok(session.snapshot.evidence);
  assert.ok(!JSON.stringify(session).includes("private-secret"));
  assert.equal(socket.closes, 1);
  const fail = createLiveConnection((s) => { session = receiveSnapshot(session, s); }, () => { throw new Error("private-secret"); });
  fail.connect();
  assert.equal(session.snapshot.state, "ERROR");
  assert.ok(session.snapshot.evidence);
  assert.ok(!JSON.stringify(session).includes("private-secret"));
});

test("terminal server states close the stream and retain the latest snapshot", () => {
  for (const state of ["ERROR", "DISCONNECTED"] as const) {
    let session = emptyLiveSession();
    const socket = new MockSubscription();
    const connection = createLiveConnection((s) => { session = receiveSnapshot(session, s); }, () => socket);
    connection.connect(); socket.receive(snapshot()); socket.receive(snapshot(null, state));
    assert.equal(session.snapshot.state, state);
    assert.ok(session.snapshot.evidence);
    assert.equal(socket.closes, 1);
    socket.receive(snapshot(evidence(2)));
    assert.equal(session.snapshot.state, state);
  }
});

test("serialized display data contains no secrets, invented movement, anatomy or biological units", () => {
  const value = evidence(1, undefined, { apiKey: "private-secret", endpoint: "ws://private-host/observatory/v1", velocity: 22, heading: 30, stimulus: 42 });
  const session = receiveSnapshot(emptyLiveSession(), { ...snapshot(value), ...{ apiKey: "private-secret", endpoint: "ws://private-host/observatory/v1" } });
  const serialized = JSON.stringify({ session, series: activitySeries(session.frames), raster: activityRaster(session.frames), timeline: sessionTimeline(session.frames), observations: sessionObservations(value) });
  assert.doesNotMatch(serialized, /private-secret|private-host|apiKey|endpoint|velocity|heading|stimulus|somaX|somaY|somaZ|Hz|mm\/s|m\/s|biological firing rate|real neural activity/);
  const ui = readFileSync("src/app/components/live-session.tsx", "utf8");
  assert.doesNotMatch(ui, /Hz|mm\/s|m\/s|velocity|heading|escape trajectory|stimulus expansion rate|biological firing rate|real neural activity/);
  assert.match(ui, /Not recordings from a living fly/);
  assert.match(ui, /onClick=\{onInterpret \?\? onEvidence\}/);
  assert.match(ui, /Meta requires a question and frozen retained evidence/);
  assert.doesNotMatch(ui, /fetch\(|\.complete\(/);
});


test("new investigation excludes prior telemetry and reconnect preserves its observation boundary", async () => {
  const { frameIdentity, investigationWindow, interpretationBelongsToObservation } = await import("../web/investigation");
  const { workspaceReducer } = await import("../web/dashboard");
  const old = evidence(1);
  const received = receiveSnapshot(emptyLiveSession(), snapshot(old));
  const state = workspaceReducer({ workspace: "live", question: "Synthetic", result: null }, { type: "fruitfly-ask", question: "New observation?", startedAt: new Date(now + 1).toISOString(), excluded: received.frames.map(frameIdentity) });
  assert.equal(investigationWindow(received.snapshot, received.frames, state.observation).snapshot.evidence, null);
  assert.equal(investigationWindow(received.snapshot, received.frames, state.observation).frames.length, 0);
  const oldInterpretation = { analysis: { exactQuestion: state.fruitFlyAskedQuestion }, evidence: { sessionId: old.telemetry.sessionId, frames: [{ sequence: old.telemetry.sequence }] } } as import("../web/observational-contracts").ObservationalResult;
  assert.equal(interpretationBelongsToObservation(oldInterpretation, state.fruitFlyAskedQuestion, investigationWindow(received.snapshot, received.frames, state.observation).frames), false);
  const disconnected = receiveSnapshot(received, snapshot(null, "DISCONNECTED"));
  assert.equal(disconnected.snapshot.evidence, old);
  assert.equal(sessionStatus(disconnected.snapshot, now + 2).live, false);
  assert.equal(sessionStatus(disconnected.snapshot, now + 2).historical, true);
  const reconnected = receiveSnapshot(disconnected, snapshot(evidence(2)));
  const rebound = workspaceReducer(state, { type: "fruitfly-session", sessionId: reconnected.snapshot.evidence!.telemetry.sessionId });
  assert.equal(rebound.observation, state.observation);
  assert.equal(rebound.fruitFlyAskedQuestion, state.fruitFlyAskedQuestion);
  const active = investigationWindow(reconnected.snapshot, reconnected.frames, rebound.observation);
  assert.deepEqual(active.frames.map(frame => frame.telemetry.sequence), [2]);
  assert.equal(active.snapshot.evidence, reconnected.snapshot.evidence);
  const replay = { ...old, receivedAt: new Date(now + 100).toISOString() };
  assert.equal(investigationWindow(snapshot(replay), [replay], rebound.observation).snapshot.evidence, null);
});

test("configured auto-connect opens the existing read-only protocol and no unconfigured stream is fabricated", () => {
  let session = emptyLiveSession(), opens = 0;
  const socket = new MockSubscription();
  const connection = createLiveConnection(s => { session = receiveSnapshot(session, s); }, url => { opens++; assert.equal(url, "/api/sources/fruitfly"); return socket; });
  connection.autoConnect(false); assert.equal(opens, 0); assert.equal(session.snapshot.state, "ERROR");
  assert.match(session.snapshot.message, /No research\/brain-server endpoint is configured/); assert.equal(session.snapshot.evidence, null);
  connection.autoConnect(true); connection.autoConnect(true); assert.equal(opens, 1); assert.equal(session.snapshot.state, "CONNECTING"); assert.equal(session.frames.length, 0);
  socket.receive(snapshot(null, "CONNECTED")); assert.equal(sessionStatus(session.snapshot, now).label, "WAITING FOR DATA");
  assert.equal(session.snapshot.evidence, null); connection.dispose();
});
