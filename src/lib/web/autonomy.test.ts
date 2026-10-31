import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { AutonomyEngine, DEFAULT_ARENA, FIXED_DT, MAX_TICKS, decide, replayAutonomy, scheduledStimulus, sense, type NeuralDrive } from "./autonomy";
import { autonomyRecording } from "./autonomy-recorder";
import { runTrial } from "../experiment/engine";
import { syntheticDemoNetwork } from "../experiment/network";
import { demoExperimentSpec } from "../experiment/demo";
import type { FruitFlySnapshot } from "../sources/contracts";

const quiet: NeuralDrive = { source: "NONE", activity: null, decoder: null, reference: null };
function run(silenced = false, ticks = 240) {
  const e = new AutonomyEngine({ seed: 12, silenced });
  for (let i = 0; i < ticks; i++) e.advance(FIXED_DT, scheduledStimulus);
  return e;
}
function xr(sequence = 1, receivedAt = 1001, sessionId = "session-a"): FruitFlySnapshot {
  // Projection of a normalized observatory frame; wire validation is tested in fruitfly.test.ts.
  return { source: "FRUITFLY_XR", state: "DATA RECEIVED", message: "fixture", evidence: {
    source: "FRUITFLY_XR", receivedAt: new Date(receivedAt).toISOString(),
    provenance: { structuralSource: "Published male Drosophila CNS connectome: male-cns:v1.0", dataset: "male-cns:v1.0", connectomeSha256: "fixture", neurons: 176422, edges: 6287749, dynamics: "SIMULATED", generator: "FruitFly XR brain server", experimentalRecording: false, transport: "observatory/v1" },
    telemetry: { sessionId, sequence, simulationMs: sequence * 50, neuralTick: sequence, totalSpikeEvents: 1, activeNeuronCount: 1, displaySpikeEvents: 1, displayTruncated: false, droppedDisplayFrames: 0, droppedSubscriberMessages: 0, spikeDisplaySemantics: "EXACT_SPIKES_FIRST_N_FILTERED", edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL", spikeEvents: [{ neuronId: 1, spikeTimeMs: 50 }], decodedMotor: [{ name: "jump", value: 1 }], inputSequence: sequence, inputFresh: true, motorMode: "ESCAPE" },
  } };
}

test("autonomy advances, explores and changes position without motor input", () => {
  const e = run(); assert.notDeepEqual(e.state, e.config.initial);
  const states = new Set<string>(e.evidence().samples.map(f => f.decision.state));
  for (const state of ["IDLE", "EXPLORE", "WALK", "TURN_LEFT", "TURN_RIGHT", "AVOID", "ESCAPE"]) assert.ok(states.has(state), state);
});
test("bounded fixed timestep gives identical state at 30, 60 and 144 render FPS", () => {
  const results = [30, 60, 144].map(fps => { const e = new AutonomyEngine(); for (let i = 0; i < fps * 10; i++) e.advance(1 / fps, scheduledStimulus); return e.evidence(); });
  assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
});
test("same seed and exact inputs replay every scientific sample", () => {
  const e = run(); assert.deepEqual(e.evidence(), run().evidence());
  assert.deepEqual(replayAutonomy(e.evidence()).evidence(), e.evidence());
  assert.notDeepEqual(new AutonomyEngine({ seed: 13 }).config, e.config);
});
test("real obstacle geometry ahead selects AVOID", () => {
  const arena = { ...DEFAULT_ARENA, obstacles: [{ x: 0, z: -.9, radius: .24 }] };
  const sensors = sense({ x: 0, z: 0, heading: 0, speed: 0 }, arena, null);
  assert.ok(sensors.front < .45); assert.equal(decide(sensors, quiet, 30, 12).state, "AVOID");
});
test("left/right geometric asymmetry reverses the avoidance turn", () => {
  const sensors = sense({ x: 0, z: 0, heading: 0, speed: 0 }, DEFAULT_ARENA, null);
  assert.equal(decide({ ...sensors, front: .1, left: .8, right: .2 }, quiet, 30, 12).motor.turnDrive, 1);
  assert.equal(decide({ ...sensors, front: .1, left: .2, right: .8 }, quiet, 30, 12).motor.turnDrive, -1);
});
test("ESCAPE overrides exploration and AVOID, with local collision steering retained", () => {
  const sensors = { ...sense({ x: 0, z: 0, heading: 0, speed: 0 }, DEFAULT_ARENA, null), front: .1 };
  const d = decide(sensors, { ...quiet, source: "SYNTHETIC_FIXTURE", decoder: "ESCAPE" }, 50, 12);
  assert.equal(d.state, "ESCAPE"); assert.equal(d.source, "SYNTHETIC_NEURAL_MODEL"); assert.equal(d.motor.escapeDrive, 1); assert.ok(d.motor.turnDrive !== 0);
});
test("FruitFly ESCAPE maps to motor execution with session/sequence provenance", () => {
  const e = new AutonomyEngine({ source: "fruitfly" }, 1000); e.observe(xr(), 1002); e.advance(.05, () => null);
  assert.equal(e.frame?.decision.state, "ESCAPE"); assert.equal(e.frame?.decision.source, "FRUITFLY_DECODER");
  assert.equal(e.frame?.neural.reference?.sequence, 1); assert.equal(e.frame?.neural.reference?.transport, "observatory/v1");
  assert.ok(e.frame!.after.speed > 0); assert.deepEqual(replayAutonomy(e.evidence()).frame, e.frame);
});
test("disconnect clears neural influence without fabricating synthetic activity", () => {
  const e = new AutonomyEngine({ source: "fruitfly" }, 1000); e.observe(xr(), 1002); e.advance(.05, () => null);
  e.observe({ ...xr(), state: "DISCONNECTED" }, 1003); e.advance(.05, () => null);
  assert.equal(e.frame?.neural.source, "NONE"); assert.equal(e.frame?.neural.activity, null); assert.notEqual(e.frame?.decision.state, "ESCAPE");
});
test("stale, wrong-session, reused and pre-reset telemetry cannot control a new session", () => {
  const e = new AutonomyEngine({ source: "fruitfly" }, 1000);
  e.observe(xr(), 2000); e.advance(.05, () => null); assert.equal(e.frame?.neural.source, "NONE");
  e.observe(xr(2, 2001), 2002); e.advance(.05, () => null); assert.equal(e.frame?.decision.state, "ESCAPE");
  e.observe(xr(3, 2003, "session-b"), 2004); e.advance(.05, () => null); assert.equal(e.frame?.neural.source, "NONE");
  e.reset(3000); e.observe(xr(4, 2005), 3001); e.advance(.05, () => null); assert.equal(e.frame?.neural.source, "NONE");
});
test("a repeated sequence cannot refresh the motor lease", () => {
  const e = new AutonomyEngine({ source: "fruitfly" }, 1000); e.observe(xr(), 1002);
  for (let i = 0; i < 20; i++) { e.observe(xr(), 1002 + i * 20); e.advance(.05, () => null); }
  assert.equal(e.frame?.neural.source, "NONE");
});
test("pause prevents advancement; reset restores canonical neural, motor and recording state", () => {
  const e = run(); const before = e.evidence(); e.setPaused(true); e.advance(.2, scheduledStimulus); assert.deepEqual(e.evidence(), before);
  e.setPaused(false); e.advance(.05, scheduledStimulus); assert.equal(e.tick, before.ticks + 1);
  e.reset(); assert.deepEqual(e.evidence(), new AutonomyEngine().evidence()); assert.deepEqual(e.state, e.config.initial);
});
test("synthetic silence changes escape phenotype and control returns to lower arousal", () => {
  const c = run(), p = run(true);
  assert.ok(c.evidence().samples.some(f => f.decision.state === "ESCAPE"));
  assert.ok(p.evidence().samples.every(f => f.decision.state !== "ESCAPE"));
  assert.notDeepEqual(c.state, p.state); assert.notEqual(c.frame?.decision.state, "ESCAPE");
  assert.deepEqual(c.evidence().inputs, p.evidence().inputs); // exact same moving external object, not equal sensed feedback
});
test("motor movement is bounded and cannot cross arena or obstacle collision geometry", () => {
  const e = run(false, MAX_TICKS);
  for (const f of e.evidence().samples) {
    assert.ok(Math.hypot(f.after.x, f.after.z) <= DEFAULT_ARENA.radius - DEFAULT_ARENA.bodyRadius + 1e-9);
    for (const o of DEFAULT_ARENA.obstacles) assert.ok(Math.hypot(f.after.x - o.x, f.after.z - o.z) >= o.radius + DEFAULT_ARENA.bodyRadius - 1e-9);
    assert.ok(Math.hypot(f.after.x - f.before.x, f.after.z - f.before.z) <= 1.4 * FIXED_DT + 1e-9);
  }
});
test("catchup and recording are bounded; evidence snapshots are detached and frozen", () => {
  const e = new AutonomyEngine(); e.advance(10, () => null); assert.equal(e.tick, 5); assert.equal(e.evidence().droppedWallSeconds, 9.75);
  for (let i = 0; i < 2000; i++) e.advance(.05, () => null);
  assert.equal(e.tick, MAX_TICKS); assert.equal(e.paused, true); assert.equal(e.evidence().inputs.length, MAX_TICKS);
  assert.deepEqual(replayAutonomy(e.evidence()).evidence(), e.evidence());
  assert.ok(Object.isFrozen(e.evidence().samples)); assert.ok(e.evidence().samples.length <= MAX_TICKS);
});
test("autonomy cannot change deterministic approved experiment measurements", () => {
  const before = runTrial(syntheticDemoNetwork, demoExperimentSpec, "CONTROL"); run(); run(true);
  assert.deepEqual(runTrial(syntheticDemoNetwork, demoExperimentSpec, "CONTROL"), before);
});
test("autonomy recorder declares client trust separately from retained neural evidence", () => {
  const evidence = run().evidence(); const recording = autonomyRecording([evidence], null);
  assert.equal(recording.trust, "CLIENT_GENERATED_EXPERIMENTAL_CONTROLLER"); assert.deepEqual(recording.conditions[0], evidence);
});
test("autonomy modules have no provider or perception imports; both render paths are retained", () => {
  for (const file of ["src/lib/web/autonomy.ts", "src/lib/sources/fruitfly-closed-loop.ts", "src/app/components/autonomy-panel.tsx"]) {
    const code = readFileSync(file, "utf8"); assert.doesNotMatch(code, /from ["'][^"']*(?:meta\/|perception\/)|fetch\(/);
  }
  const renderer = readFileSync("src/app/components/high-fidelity-fly.tsx", "utf8");
  assert.match(renderer, /model === "lightweight"/); assert.match(renderer, /<FlyModel/);
  assert.match(readFileSync("src/app/components/embodied-world.tsx", "utf8"), /<AutonomousFly/);
});
