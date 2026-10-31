import assert from "node:assert/strict";
import test from "node:test";
import { brainStimulus, configuredBrainEndpoint, ExperimentalBrainAdapter, type BrainSocket } from "./fruitfly-closed-loop";
import { connectomeHash } from "./fruitfly-protocol";
import { AutonomyEngine, type NeuralDrive, type SensorFrame } from "../web/autonomy";
const sessionId = "00000000-0000-4000-8000-000000000001";
const sensors: SensorFrame = { front: 1, left: 1, right: 1, boundary: 1, stimulusDistance: 2, stimulusDirection: .5, stimulusIntensity: .5 };
const stimulus = { x: 0, z: -2, radius: .22, intensity: 1 };
const hello = { version: 1, type: "hello", sessionId, dataset: "male-cns:v1.0", sha256: connectomeHash, neurons: 176422, edges: 6287749, dtMs: .5, tickMs: 50, gain: .65, seed: 20260903 };
function fixture(configuration = { endpoint: "ws://127.0.0.1:8765/brain/v1", production: false }) {
  let now = 1000; const sends: string[] = []; const drives: (NeuralDrive | null)[] = []; let closed = false;
  const listeners = new Map<string, (event: { data: string }) => void>();
  const socket = { bufferedAmount: 0, send: (json: string) => sends.push(json), close: () => { closed = true; }, addEventListener: (name: string, listener: (event: { data: string }) => void) => listeners.set(name, listener) } as unknown as BrainSocket;
  const adapter = new ExperimentalBrainAdapter(drive => drives.push(drive), () => now, url => { assert.equal(url, configuration.endpoint); return socket; }, () => 2000, configuration);
  const message = (value: unknown) => listeners.get("message")!({ data: JSON.stringify(value) });
  const output = (extra: Record<string, unknown> = {}) => ({ version: 1, type: "telemetry", sessionId, sequence: 1, inputSequence: 1, capturedMs: 1000, simulationMs: 50, inputFresh: true, inputAgeMs: 10, computeMs: 25, realTimeFactor: 2, lagMs: 0, takeoff: 0, activeNeurons: 2, spikes: 1, totalSpikes: 1, status: "OK", motorMode: "ESCAPE", jump: true, escape: true, sensoryProvenance: "PROXY", decisionProvenance: "CONNECTOME", embodimentProvenance: "SCRIPTED", landingProvenance: "SCRIPTED", populations: [{ name: "DNp01", count: 2, hz: 10, spikes: 1 }], channels: [{ name: "jump", value: 1 }], ...extra });
  return { adapter, drives, sends, message, output, socket, setNow: (value: number) => { now = value; }, closed: () => closed };
}
test("brain adapter sends the actual required protocol, correct units/sign and bounded derivative", () => {
  const input = brainStimulus(sessionId, 1, 1000, sensors, stimulus, { distance: .3, capturedMs: 950 });
  assert.deepEqual(Object.keys(input).sort(), ["version", "type", "sessionId", "sequence", "capturedMs", "tracked", "azimuthDeg", "elevationDeg", "angularSizeDeg", "expansionDegPerS", "sensoryProvenance"].sort());
  assert.equal(input.sensoryProvenance, "PROXY"); assert.ok(input.azimuthDeg < 0); assert.ok(input.expansionDegPerS > 0);
  const empty = brainStimulus(sessionId, 2, 1050, sensors, null, null); assert.equal(empty.tracked, false); assert.equal(empty.expansionDegPerS, 0);
});
test("no input before verified hello; publication capped at 20Hz with exact raw provenance", () => {
  const f = fixture(); f.adapter.publish(sensors, stimulus); assert.equal(f.sends.length, 0);
  f.message(hello); f.adapter.publish(sensors, stimulus); f.adapter.publish(sensors, stimulus); assert.equal(f.sends.length, 1);
  f.setNow(1050); f.adapter.publish(sensors, stimulus); assert.equal(f.sends.length, 2);
  assert.equal(f.adapter.evidence().messages.length, 3); assert.equal(JSON.parse(f.sends[0]).sessionId, sessionId);
});
test("identity mismatch fails closed", () => {
  const f = fixture(); f.message({ ...hello, gain: .7 }); assert.equal(f.closed(), true); assert.equal(f.drives.at(-1), null);
});
test("real decoder jump with DNp01 spike drives ESCAPE with input lineage", () => {
  const f = fixture(); f.message(hello); f.adapter.publish(sensors, stimulus); f.message(f.output());
  assert.equal(f.drives.at(-1)?.decoder, "ESCAPE"); assert.equal(f.drives.at(-1)?.reference?.transport, "brain/v1"); assert.equal(f.drives.at(-1)?.reference?.inputSequence, 1);
});
test("latched mode without actual jump/spike cannot fabricate a fresh escape", () => {
  const f = fixture(); f.message(hello); f.adapter.publish(sensors, stimulus); f.message(f.output({ jump: false })); assert.equal(f.drives.at(-1)?.decoder, null);
  f.message(f.output({ sequence: 2, simulationMs: 100, populations: [] })); assert.equal(f.drives.at(-1)?.decoder, null);
});
test("stale/unreferenced output, session mismatch and out-of-order outputs fail safely", () => {
  for (const extra of [{ inputSequence: 10 }, { inputFresh: false }, { capturedMs: 999 }, { inputAgeMs: 501 }, { totalSpikes: 0 }]) {
    const f = fixture(); f.message(hello); f.adapter.publish(sensors, stimulus); f.message(f.output(extra)); assert.equal(f.drives.at(-1), null);
  }
  const f = fixture(); f.message(hello); f.adapter.publish(sensors, stimulus); f.setNow(1800); f.message(f.output()); assert.equal(f.drives.at(-1), null);
  const g = fixture(); g.message(hello); g.adapter.publish(sensors, stimulus); g.message(g.output()); g.message(g.output()); assert.equal(g.closed(), true);
  const h = fixture(); h.message(hello); h.adapter.publish(sensors, stimulus); h.message(h.output({ sessionId: "00000000-0000-4000-8000-000000000002" })); assert.equal(h.closed(), true);
});
test("closed adapter ignores late callbacks and cannot send; timeout clears neural drive", () => {
  const f = fixture(); f.message(hello); f.adapter.close(); const count = f.drives.length; f.message(f.output()); f.adapter.publish(sensors, stimulus); assert.equal(f.drives.length, count); assert.equal(f.sends.length, 0);
  const g = fixture(); g.setNow(7000); g.adapter.publish(sensors, stimulus); assert.equal(g.closed(), true); assert.equal(g.drives.at(-1), null);
});
test("backpressure ends the experimental trial without growing a queue", () => {
  const f = fixture(); f.message(hello); Object.assign(f.socket, { bufferedAmount: 5000 }); f.adapter.publish(sensors, stimulus); assert.equal(f.closed(), true); assert.equal(f.sends.length, 0);
});

test("production brain configuration accepts secure endpoints; never falls back to localhost", () => {
  assert.equal(configuredBrainEndpoint("wss://brain.example/brain/v1", true), "wss://brain.example/brain/v1");
  for (const endpoint of [undefined, "", "not a URL", "wss:brain.example/brain/v1", "ws://127.0.0.1:8765/brain/v1", "ws://brain.example/brain/v1", "wss://brain.example/observatory/v1", "wss://brain.example/brain/v1/", " wss://brain.example/brain/v1", "wss://brain.example/brain/ v1"]) {
    assert.equal(configuredBrainEndpoint(endpoint, true), null, endpoint);
  }
});
test("development permits only the supported local ws endpoints or configured wss", () => {
  for (const host of ["localhost", "127.0.0.1"]) assert.equal(configuredBrainEndpoint(`ws://${host}:8765/brain/v1`, false), `ws://${host}:8765/brain/v1`);
  assert.equal(configuredBrainEndpoint("wss://brain.example/brain/v1", false), "wss://brain.example/brain/v1");
  for (const endpoint of [undefined, "ws://brain.example:8765/brain/v1", "ws://localhost:8080/brain/v1"]) assert.equal(configuredBrainEndpoint(endpoint, false), null);
});
test("credentials, query strings and fragments are rejected without leaking into evidence", () => {
  for (const suffix of ["?token=private", "#private", "?", "#"]) assert.equal(configuredBrainEndpoint(`wss://brain.example/brain/v1${suffix}`, true), null);
  for (const endpoint of ["wss://user:private@brain.example/brain/v1", "wss://user@brain.example/brain/v1", "wss://brain.example/brain/v1?token=private"]) {
    const adapter = new ExperimentalBrainAdapter(() => {}, () => 0, () => { assert.fail("Invalid configuration must not open a socket"); }, () => 0, { endpoint, production: true });
    assert.equal(adapter.evidence().endpoint, null);
    assert.doesNotMatch(JSON.stringify(adapter.evidence()), /private|token=|user@/);
  }
});
test("invalid or unavailable brain input leaves baseline autonomy running without fabricated neural output", () => {
  for (const endpoint of [undefined, "ws://127.0.0.1:8765/brain/v1", "wss://brain.example/brain/v1"]) {
    const engine = new AutonomyEngine({ source: "fruitfly", mode: "exploration" }, 0);
    const drives: (NeuralDrive | null)[] = [];
    const adapter = new ExperimentalBrainAdapter(drive => { drives.push(drive); if (drive) engine.acceptBrain(drive); else engine.disconnect(); }, () => 0, () => { throw new Error("Unavailable host with private details"); }, () => 0, { endpoint, production: true });
    adapter.publish(sensors, stimulus);
    for (let tick = 0; tick < 50; tick++) engine.advance(.05, () => null);
    assert.equal(engine.tick, 50);
    assert.equal(engine.frame?.decision.source, "BASELINE_AUTONOMOUS_POLICY");
    assert.equal(engine.frame?.motor.execution, "CAUSALFLY_PROCEDURAL_CONTROLLER");
    assert.ok(drives.every(drive => drive === null));
    assert.match(adapter.status, /Live connectome control unavailable/);
    assert.doesNotMatch(adapter.status, /private details/);
  }
});
test("secure transport evidence preserves live decoder versus procedural motor provenance", () => {
  const f = fixture({ endpoint: "wss://brain.example/brain/v1", production: true });
  assert.equal(f.adapter.evidence().endpoint, "wss://brain.example/brain/v1"); f.message(hello); f.adapter.publish(sensors, stimulus); f.message(f.output());
  const drive = f.drives.at(-1)!;
  const engine = new AutonomyEngine({ source: "fruitfly" }, 1999);
  engine.acceptBrain(drive); engine.advance(.05, () => null);
  assert.equal(engine.frame?.decision.source, "FRUITFLY_DECODER");
  assert.equal(engine.frame?.motor.execution, "CAUSALFLY_PROCEDURAL_CONTROLLER");
  assert.equal(drive.source, "FRUITFLY_XR");
  assert.equal(drive.reference?.transport, "brain/v1");
});
test("browser brain configuration is independent of observatory and imports no provider client", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("./fruitfly-closed-loop.ts", import.meta.url), "utf8");
  assert.match(source, /process\.env\.NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL/);
  assert.doesNotMatch(source, /process\.env\.FRUITFLY_XR_OBSERVATORY_URL|from ["'][^"']*(?:meta|sam|fruitfly-bridge)/i);
  const bridge = readFileSync(new URL("./fruitfly-bridge.ts", import.meta.url), "utf8");
  assert.match(bridge, /import "server-only"/);
  assert.match(bridge, /process\.env\.FRUITFLY_XR_OBSERVATORY_URL/);
  assert.doesNotMatch(bridge, /NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL/);
});
