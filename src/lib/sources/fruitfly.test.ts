import assert from "node:assert/strict";
import test from "node:test";
import { connectomeHash, FruitFlyNormalizer } from "./fruitfly-protocol";
import { connectFruitFly, fruitFlyStream } from "./fruitfly-bridge";
import { dataSources, disconnectedFruitFly, type FruitFlySnapshot } from "./contracts";
import { measurementLabels } from "../web/display-labels";
import { runWebExperiment } from "../web/workflow";
import { FakeMetaClient } from "../meta/fake-client";
import { GET } from "../../app/api/sources/fruitfly/route";

// Offline fixtures follow ResearchProtocol.java and ResearchHub.buildFrame.
const hello = {
  version: 1, type: "observatoryHello", dataset: "male-cns:v1.0", connectomeSha256: connectomeHash,
  neurons: 176422, edges: 6287749, neuronIds: true, spikeEventsAvailable: true,
  synapticTransmissionEvents: false, edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL",
  maxDisplaySpikes: 512, maxDisplayEdges: 256,
};
const frame = {
  version: 1, type: "observatoryFrame", sessionId: "8c66e194-3693-4ae5-942a-886d819b08bc",
  sequence: 1, simulationMs: 50, neuralTick: 1, totalSpikeEvents: 1,
  activeNeuronCount: 4, displaySpikeEvents: 1, displayTruncated: false,
  droppedDisplayFrames: 0, droppedSubscriberMessages: 0,
  spikeDisplaySemantics: "EXACT_SPIKES_FIRST_N_FILTERED", edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL",
  spikeEvents: [{ neuronId: 10000000001, spikeTimeMs: 49.5, hasSoma: false, somaX: 0, neuronType: "not consumed" }],
  decodedMotor: [{ name: "jump", value: 1 }, { name: "yaw", value: -.123456789 }],
  inputSequence: -1, inputFresh: false, motorMode: "ESCAPE",
};
const endpoint = "ws://127.0.0.1:8766/observatory/v1";
const receivedAt = "2026-10-27T12:00:00.000Z";

class MockSocket extends EventTarget {
  closes = 0;
  close() { this.closes++; this.dispatchEvent(new Event("close")); }
  open() { this.dispatchEvent(new Event("open")); }
  receive(message: unknown) { this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(message) })); }
}
function bridge(options: { handshakeTimeoutMs?: number; staleAfterMs?: number } = {}) {
  const socket = new MockSocket();
  const snapshots: FruitFlySnapshot[] = [];
  const disconnect = connectFruitFly((snapshot) => snapshots.push(snapshot), {
    endpoint, createSocket: (url) => { assert.equal(url, endpoint); return socket; }, now: () => new Date(receivedAt), ...options,
  });
  return { socket, snapshots, disconnect, last: () => snapshots.at(-1)! };
}

test("synthetic source remains READY and its deterministic evidence is unchanged", async () => {
  assert.equal(dataSources.SYNTHETIC_FIXTURE.status, "READY");
  const response = await runWebExperiment({ researchQuestion: "Test synthetic fixture" }, { env: {}, createClient: () => new FakeMetaClient() });
  assert.ok(response.ok);
  assert.equal(response.result.provenance.source, "deterministic-engine");
  assert.equal(response.result.measuredEvidence.control.outputPeakActivity, 1);
  assert.equal(response.result.measuredEvidence.perturbed.outputPeakActivity, .5);
});

test("verified telemetry is explicitly external, simulated and never a living-fly recording", () => {
  const normalizer = new FruitFlyNormalizer();
  assert.equal(normalizer.accept(hello, receivedAt), null);
  const evidence = normalizer.accept(frame, receivedAt)!;
  assert.equal(evidence.source, "FRUITFLY_XR");
  assert.notEqual(evidence.source, dataSources.SYNTHETIC_FIXTURE.kind);
  assert.equal(evidence.provenance.dynamics, "SIMULATED");
  assert.equal(evidence.provenance.experimentalRecording, false);
  assert.equal(evidence.provenance.dataset, hello.dataset);
  assert.equal(evidence.provenance.connectomeSha256, connectomeHash);
  assert.equal(evidence.receivedAt, receivedAt);
  assert.ok(Object.isFrozen(evidence.telemetry.spikeEvents));
});

test("raw simulation quantities survive normalization without mutation, conversion or invented units", () => {
  const before = JSON.stringify(frame);
  const normalizer = new FruitFlyNormalizer();
  normalizer.accept(hello, receivedAt);
  const telemetry = normalizer.accept(frame, receivedAt)!.telemetry;
  assert.equal(JSON.stringify(frame), before);
  assert.deepEqual(telemetry.decodedMotor, frame.decodedMotor);
  assert.deepEqual(telemetry.spikeEvents, [{ neuronId: 10000000001, spikeTimeMs: 49.5 }]);
  for (const field of ["sequence", "simulationMs", "totalSpikeEvents", "activeNeuronCount", "inputSequence"] as const) assert.equal(telemetry[field], frame[field]);
  assert.ok(!JSON.stringify(telemetry).includes("Hz"));
});

test("unknown fields and error details cannot leak endpoint configuration or secrets", () => {
  const secret = "server-secret-sentinel";
  const normalizer = new FruitFlyNormalizer();
  normalizer.accept({ ...hello, authorization: secret, endpoint }, receivedAt);
  const evidence = normalizer.accept({ ...frame, authorization: secret, endpoint, providerError: secret }, receivedAt);
  for (const text of [secret, endpoint, "authorization", "providerError"]) assert.ok(!JSON.stringify(evidence).includes(text));
  const snapshots: FruitFlySnapshot[] = [];
  connectFruitFly((snapshot) => snapshots.push(snapshot), { endpoint, createSocket: () => { throw new Error(`${secret} ${endpoint}`); } });
  assert.equal(snapshots.at(-1)!.state, "ERROR");
  assert.ok(!JSON.stringify(snapshots).includes(secret));
  assert.ok(!JSON.stringify(snapshots).includes(endpoint));
});

test("unverified structural identity and missing required hello fields fail safely", () => {
  for (const invalid of [null, {}, { ...hello, version: 2 }, { ...hello, dataset: "synthetic" }, { ...hello, connectomeSha256: "0".repeat(64) }, { ...hello, neurons: undefined }, { ...hello, synapticTransmissionEvents: true }]) {
    assert.throws(() => new FruitFlyNormalizer().accept(invalid, receivedAt));
  }
  assert.throws(() => new FruitFlyNormalizer().accept(frame, receivedAt));
});

test("every consumed frame field is required and malformed external values are rejected", () => {
  const invalidFrames: unknown[] = Object.keys(frame).map((key) => ({ ...frame, [key]: undefined }));
  invalidFrames.push(null, {}, { ...frame, simulationMs: "50" }, { ...frame, simulationMs: Infinity }, { ...frame, sequence: 1.5 }, { ...frame, sessionId: endpoint }, { ...frame, displaySpikeEvents: 512 }, { ...frame, decodedMotor: [{ name: "Authorization", value: 1 }] }, { ...frame, decodedMotor: [{ name: "jump", value: NaN }] }, { ...frame, spikeEvents: [{ neuronId: Number.MAX_SAFE_INTEGER + 1, spikeTimeMs: 1 }] }, { ...frame, spikeEvents: [{ neuronId: 1, spikeTimeMs: 51 }] }, { ...frame, edgeDisplaySemantics: "CAUSAL_TRANSMISSION" });
  for (const invalid of invalidFrames) {
    const normalizer = new FruitFlyNormalizer();
    normalizer.accept(hello, receivedAt);
    assert.throws(() => normalizer.accept(invalid, receivedAt));
  }
});

test("ordering is checked within sessions while display gaps and new sessions are accepted", () => {
  const normalizer = new FruitFlyNormalizer();
  normalizer.accept(hello, receivedAt);
  normalizer.accept(frame, receivedAt);
  assert.throws(() => normalizer.accept(frame, receivedAt));
  const later = { ...frame, sequence: 4, neuralTick: 4, simulationMs: 200, droppedDisplayFrames: 2 };
  assert.equal(normalizer.accept(later, receivedAt)!.telemetry.sequence, 4);
  assert.equal(normalizer.accept({ ...frame, sessionId: "08f6310f-b69a-4a1e-a471-e64be859c166" }, receivedAt)!.telemetry.sequence, 1);
});

test("disconnected and failed sockets never claim CONNECTED; open alone is not DATA RECEIVED", () => {
  assert.equal(disconnectedFruitFly().state, "DISCONNECTED");
  const b = bridge();
  assert.equal(b.last().state, "CONNECTING");
  b.socket.dispatchEvent(new Event("error"));
  b.socket.open(); // Delayed events after failure must not revive connection state.
  b.socket.receive(hello);
  assert.equal(b.last().state, "ERROR");
  assert.ok(!b.snapshots.some((snapshot) => snapshot.state === "CONNECTED" || snapshot.state === "DATA RECEIVED"));
  const c = bridge();
  c.socket.open();
  assert.equal(c.last().state, "CONNECTED");
  assert.equal(c.last().evidence, null);
  c.disconnect();
  assert.equal(c.last().state, "DISCONNECTED");
});

test("mock read-only source advances honest states and retains explicitly historical evidence on close", () => {
  const b = bridge();
  b.socket.open(); b.socket.receive(hello);
  b.socket.receive({ version: 1, type: "observatoryScaffoldChunk", somaPoints: [] });
  assert.equal(b.last().evidence, null);
  b.socket.receive(frame);
  assert.equal(b.last().state, "DATA RECEIVED");
  const evidence = b.last().evidence;
  b.socket.close();
  assert.equal(b.last().state, "DISCONNECTED");
  assert.equal(b.last().evidence, evidence);
  assert.match(b.last().message, /last received snapshot/);
  b.socket.receive({ ...frame, sequence: 2 });
  assert.equal(b.last().state, "DISCONNECTED");
});

test("malformed/binary/oversized telemetry closes the instrument without leaking its payload", () => {
  for (const data of ["{", "secret-server-payload", new ArrayBuffer(2), "x".repeat(1_000_001), JSON.stringify(frame)]) {
    const b = bridge(); b.socket.open();
    b.socket.dispatchEvent(new MessageEvent("message", { data }));
    assert.equal(b.last().state, "ERROR");
    assert.equal(b.last().evidence, null);
    assert.equal(b.socket.closes, 1);
    assert.ok(!JSON.stringify(b.snapshots).includes("secret-server-payload"));
  }
});

test("invalid or missing endpoint never opens a guessed control connection", () => {
  for (const url of ["", "http://localhost/observatory/v1", "ws://localhost:8765/brain/v1", "ws://user:secret@localhost/observatory/v1", `${endpoint}?key=secret`]) {
    const snapshots: FruitFlySnapshot[] = [];
    connectFruitFly((snapshot) => snapshots.push(snapshot), { endpoint: url, createSocket: () => { assert.fail("must not open"); } });
    assert.equal(snapshots.at(-1)!.state, "ERROR");
    assert.ok(!JSON.stringify(snapshots).includes("secret"));
  }
});

test("handshake timeout and stale telemetry do not remain DATA RECEIVED", async () => {
  const b = bridge({ handshakeTimeoutMs: 5 });
  b.socket.open();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(b.last().state, "ERROR");
  const c = bridge({ staleAfterMs: 5 });
  c.socket.open(); c.socket.receive(hello); c.socket.receive(frame);
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(c.last().state, "CONNECTED");
  assert.match(c.last().message, /no recent frames/);
  c.disconnect();
});

test("HTTP stream uses no-store and abort/cancel releases the socket", async () => {
  const abort = new AbortController();
  const socket = new MockSocket();
  const stream = fruitFlyStream(abort.signal, { endpoint, createSocket: () => socket });
  const reader = stream.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /CONNECTING/);
  abort.abort();
  assert.equal(socket.closes, 1);
  assert.equal((await reader.read()).done, true);
  const response = GET(new Request("http://localhost/api/sources/fruitfly", { signal: AbortSignal.abort() }));
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-type"), "text/event-stream");
  const cancelledSocket = new MockSocket();
  const cancelled = fruitFlyStream(new AbortController().signal, { endpoint, createSocket: () => cancelledSocket });
  await cancelled.cancel();
  assert.equal(cancelledSocket.closes, 1);
});

test("a slow HTTP consumer gets only the latest telemetry rather than an unbounded backlog", async () => {
  const socket = new MockSocket();
  const stream = fruitFlyStream(new AbortController().signal, { endpoint, createSocket: () => socket });
  socket.open(); socket.receive(hello);
  for (let sequence = 1; sequence <= 100; sequence++) socket.receive({ ...frame, sequence, neuralTick: sequence, simulationMs: sequence * 50 });
  const reader = stream.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /CONNECTING/);
  const latest = new TextDecoder().decode((await reader.read()).value);
  assert.equal(JSON.parse(latest.slice(6)).evidence.telemetry.sequence, 100);
  await reader.cancel();
  assert.equal(socket.closes, 1);
});

test("external source selection cannot enter the synthetic experiment or Meta evidence gate", async () => {
  const response = await runWebExperiment({ researchQuestion: "Test external source", source: "FRUITFLY_XR", telemetry: frame }, { createClient: () => { assert.fail("must not create Meta client"); } });
  assert.ok(!response.ok);
  assert.equal(response.kind, "validation");
});

test("plain-language labels preserve raw result names, values, analysis and evidence", async () => {
  const response = await runWebExperiment({ researchQuestion: "Test synthetic fixture" }, { env: {}, createClient: () => new FakeMetaClient() });
  assert.ok(response.ok);
  const before = JSON.stringify(response.result);
  const trial = response.result.measuredEvidence.control;
  const display = [
    { label: measurementLabels.outputPeakActivity.label, value: trial.outputPeakActivity },
    { label: measurementLabels.outputThresholdCrossingStep.label, value: trial.outputThresholdCrossingStep },
    { label: measurementLabels.outcome.label, value: trial.outcome },
  ];
  assert.deepEqual(display.map((item) => item.label), ["Signal strength", "Response delay", "Target reached?"]);
  assert.deepEqual(display.map((item) => item.value), [1, 3, "THRESHOLD_REACHED"]);
  assert.equal(JSON.stringify(response.result), before);
});


test("unavailable observatory produces explicit ERROR with zero fabricated telemetry", () => {
  const b = bridge();
  b.socket.dispatchEvent(new Event("error"));
  assert.equal(b.last().state, "ERROR");
  assert.equal(b.last().evidence, null);
  assert.ok(b.snapshots.every(snapshot => snapshot.evidence === null));
});

test("available observatory accepts validated frames and disconnect preserves source provenance", () => {
  const b = bridge();
  b.socket.open();
  b.socket.receive(hello);
  b.socket.receive(frame);
  assert.equal(b.last().state, "DATA RECEIVED");
  const received = b.last().evidence;
  assert.ok(received);
  assert.equal(received.telemetry.sessionId, frame.sessionId);
  assert.equal(received.provenance.transport, "observatory/v1");
  b.disconnect();
  assert.equal(b.last().state, "DISCONNECTED");
  assert.equal(b.last().evidence, received);
});
