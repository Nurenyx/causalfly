import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { AutonomyEngine, MAX_TICKS, replayAutonomy, scheduledStimulus, behaviourSourceLabels } from "./autonomy";
import { AutonomyTrajectoryReplay } from "./autonomy-replay";
const empty = () => null;

test("continuous exploration advances past 60 seconds with bounded checkpointed retention", () => {
  const engine = new AutonomyEngine({ mode: "exploration" });
  for (let i = 0; i < 2450; i++) engine.advance(.05, scheduledStimulus);
  assert.equal(engine.tick, 2450); assert.equal(engine.complete, false); assert.equal(engine.paused, false);
  const evidence = engine.evidence();
  assert.ok(new Set(evidence.trajectory.map(frame => `${frame.after.x.toFixed(4)},${frame.after.z.toFixed(4)}`)).size > 10, "Exploration keeps moving after 60 seconds");
  assert.equal(evidence.checkpoint.tick, 2400); assert.equal(evidence.inputs.length, 50); assert.equal(evidence.trajectory.length, 50);
  assert.deepEqual(replayAutonomy(evidence).evidence(), evidence);
});
test("controlled trial still stops at exactly 60 seconds", () => {
  const engine = new AutonomyEngine({ mode: "trial" });
  for (let i = 0; i < 1400; i++) engine.advance(.05, empty);
  assert.equal(engine.tick, MAX_TICKS); assert.equal(engine.complete, true); assert.equal(engine.paused, true);
});
test("ESCAPE has visible engineered height, pitch and rapid acceleration, followed by recovery", () => {
  const engine = new AutonomyEngine({ mode: "trial" });
  for (let i = 0; i < 240; i++) engine.advance(.05, scheduledStimulus);
  const trajectory = engine.trajectory(), airborne = trajectory.filter(frame => (frame.after.altitude ?? 0) > .2);
  assert.ok(airborne.length > 0); assert.ok(airborne.some(frame => (frame.after.pitch ?? 0) < -.1));
  assert.ok(trajectory.some(frame => frame.decision.state === "ESCAPE" && frame.after.speed > .7));
  assert.ok(trajectory.filter(frame => frame.decision.state === "ESCAPE").every(frame => frame.decision.source === "SYNTHETIC_NEURAL_MODEL" && frame.motor.execution === "CAUSALFLY_PROCEDURAL_CONTROLLER" && frame.decision.trigger?.decoder === "ESCAPE"));
  assert.ok((engine.state.altitude ?? 0) < .01); assert.notEqual(engine.frame?.decision.state, "ESCAPE");
});
test("brief live decoder trigger produces a finite aerial response with original source lineage", () => {
  const engine = new AutonomyEngine({ source: "fruitfly" });
  const drive = { source: "FRUITFLY_XR" as const, activity: null, decoder: "ESCAPE", reference: { sessionId: "mock", sequence: 1, inputSequence: 1, receivedAt: new Date().toISOString(), transport: "observatory/v1" } };
  engine.step({ stimulus: null, neural: drive });
  for (let i = 0; i < 9; i++) engine.step({ stimulus: null, neural: null });
  assert.equal(engine.frame?.neural.source, "NONE"); assert.equal(engine.frame?.decision.source, "FRUITFLY_DECODER");
  assert.equal(engine.frame?.decision.trigger?.reference?.sequence, 1); assert.ok((engine.state.altitude ?? 0) > .2);
  assert.equal(engine.frame?.motor.execution, "CAUSALFLY_PROCEDURAL_CONTROLLER");
  for (let i = 0; i < 12; i++) engine.step({ stimulus: null, neural: null });
  assert.equal(engine.frame?.motor.phase, "RECOVERY"); assert.equal(engine.frame?.motor.trigger?.reference?.sequence, 1);
  for (let i = 0; i < 150; i++) engine.step({ stimulus: null, neural: null });
  assert.notEqual(engine.frame?.decision.state, "ESCAPE"); assert.ok((engine.state.altitude ?? 0) < .01);
});
test("replay consumes exact retained trajectory and never advances or changes the engine", () => {
  const engine = new AutonomyEngine(); for (let i = 0; i < 100; i++) engine.advance(.05, scheduledStimulus);
  engine.setPaused(true); const before = engine.evidence(); const player = new AutonomyTrajectoryReplay([engine.trajectory()]);
  assert.equal(player.available, true); assert.deepEqual(player.frames[0], before.trajectory[0]);
  player.playing = true; player.advance(.1); assert.equal(player.cursor, 2); assert.deepEqual(player.frames[0], before.trajectory[2]);
  player.playing = false; player.advance(.2); assert.equal(player.cursor, 2);
  player.restart(); assert.equal(player.cursor, 0); assert.deepEqual(engine.evidence(), before);
  const code = readFileSync("src/lib/web/autonomy-replay.ts", "utf8"); assert.doesNotMatch(code, /new AutonomyEngine|\.step\(|\.observe\(|\.complete\(|fetch\(/);
});
test("replay unavailable for absent trajectory; baseline locomotion stays explicitly engineered", () => {
  assert.equal(new AutonomyTrajectoryReplay([]).available, false);
  assert.equal(behaviourSourceLabels.BASELINE_AUTONOMOUS_POLICY, "Baseline autonomous policy");
  assert.equal(behaviourSourceLabels.FRUITFLY_DECODER, "Live connectome decoder");
  const ui = readFileSync("src/app/components/autonomy-panel.tsx", "utf8");
  assert.match(ui, /Replay unavailable: no retained motion trajectory yet/); assert.match(ui, /Trial complete/);
  assert.match(ui, /Baseline locomotion is engineered/); assert.doesNotMatch(ui, /fetch\(|from ["'][^"']*meta\//);
});
test("escape cancellation on pause/disconnect remains an exact replayable input", () => {
  const engine = new AutonomyEngine(); for(let i=0;i<70;i++) engine.advance(.05,scheduledStimulus);
  engine.setPaused(true); engine.setPaused(false); for(let i=0;i<10;i++) engine.advance(.05,scheduledStimulus);
  assert.ok(engine.evidence().inputs.some(input => input.cancelEscape));
  assert.deepEqual(replayAutonomy(engine.evidence()).evidence(),engine.evidence());
});

test("synthetic speed modulation does not relabel baseline locomotion as neural state selection", async () => {
  const { decide, sense, DEFAULT_ARENA } = await import("./autonomy");
  const sensors = { ...sense({ x: 0, z: .8, heading: 0, speed: 0 }, DEFAULT_ARENA, null), front: 2 };
  const decision = decide(sensors, { source: "SYNTHETIC_FIXTURE", activity: .5, decoder: null, reference: null }, 100, 12);
  assert.equal(decision.source, "BASELINE_AUTONOMOUS_POLICY"); assert.equal(decision.motor.modulationSource, "SYNTHETIC_NEURAL_MODEL");
});
