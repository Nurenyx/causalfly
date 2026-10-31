import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { AutonomyEngine, scheduledStimulus, MAX_TICKS, replayAutonomy } from "./autonomy";
import { phenotypeSummary, recordedPath } from "./autonomy-presentation";

function matched() {
  const runs = [new AutonomyEngine(), new AutonomyEngine({ silenced: true })];
  for (let i = 0; i < MAX_TICKS; i++) for (const run of runs) run.advance(.05, scheduledStimulus);
  return runs;
}
test("phenotype summary distinguishes measured takeoff and completed grounded intervention", () => {
  const [control, intervention] = matched();
  const before = JSON.stringify(control.evidence());
  const a = phenotypeSummary(control.trajectory(), true), b = phenotypeSummary(intervention.trajectory(), true);
  assert.equal(a.label, "ESCAPE"); assert.equal(a.detail, "Aerial takeoff recorded"); assert.ok(a.peakAltitude! > .8);
  assert.equal(b.label, "NO ESCAPE RECORDED"); assert.equal(b.peakAltitude, 0);
  assert.equal(JSON.stringify(control.evidence()), before);
  assert.deepEqual(replayAutonomy(control.evidence()).evidence(), control.evidence());
});
test("empty or incomplete evidence never fabricates no-escape or aerial phenotype", () => {
  assert.equal(phenotypeSummary([], true).label, "NO RETAINED EVIDENCE");
  const run = new AutonomyEngine(); run.advance(.05, () => null);
  assert.equal(phenotypeSummary(run.trajectory(), false).label, "OBSERVING");
  assert.equal(phenotypeSummary(run.trajectory(), true).label, "OBSERVING", "Sparse evidence cannot prove the whole window");
  const frame = structuredClone(run.frame!); frame.decision.state = "ESCAPE";
  assert.equal(phenotypeSummary([frame], true).detail, "Escape selected; no clear takeoff recorded");
  delete frame.after.altitude;
  assert.equal(phenotypeSummary([frame], true).peakAltitude, null);
  assert.equal(phenotypeSummary([frame], true).detail, "Escape selected; takeoff height unavailable");
});
test("matched conditions share initial state, seed, stimulus schedule and window, with only silencing changed", () => {
  const [a, b] = matched();
  assert.deepEqual({ ...a.config, silenced: true }, b.config);
  assert.deepEqual(a.evidence().inputs.map(i => i.stimulus), b.evidence().inputs.map(i => i.stimulus));
  assert.equal(a.tick, b.tick); assert.equal(a.tick, MAX_TICKS);
});
test("ESCAPE moves upward and away from a directional threat before finite recovery", () => {
  const run = new AutonomyEngine({ source: "fruitfly", initial: { x: 0, z: 0, heading: Math.PI, speed: 0 }, arena: { radius: 5, bodyRadius: .48, obstacles: [] } });
  const stimulus = { x: 0, z: -2, radius: .2, intensity: 1 };
  run.step({ stimulus, neural: { source: "FRUITFLY_XR", activity: null, decoder: "ESCAPE", reference: null } });
  for (let i = 0; i < 100; i++) run.step({ stimulus, neural: null });
  const airborne = run.trajectory().filter(f => f.decision.state === "ESCAPE");
  assert.ok(Math.max(...airborne.map(f => f.after.altitude ?? 0)) > .8);
  assert.ok(airborne.at(-1)!.after.z > .5, "Moves away from threat at negative Z");
  assert.ok((run.state.altitude ?? 0) < .01);
});
test("trajectory cues use only retained positions through the displayed replay cursor", () => {
  const [run] = matched(), frames = run.trajectory(), before = JSON.stringify(frames);
  const path = recordedPath(frames, 100);
  assert.ok(path.length > 2); assert.deepEqual(path.at(-1), frames[99].after);
  for (const point of path) assert.ok(frames.slice(0, 100).some(f => JSON.stringify(point) === JSON.stringify(f.before) || JSON.stringify(point) === JSON.stringify(f.after)));
  assert.deepEqual(recordedPath([], 100), []); assert.deepEqual(recordedPath(frames, 0), []);
  assert.equal(JSON.stringify(frames), before);
});
test("presentation preserves provider isolation, source labels, and explicit replay contract", () => {
  const ui = readFileSync("src/app/components/autonomy-panel.tsx", "utf8");
  for (const label of ["REPLAY MODE", "Replay recorded experiment", "does not", "Motor execution: CausalFly procedural controller", "Simulated connectome activity", "ONE THING CHANGED"]) assert.ok(ui.toLowerCase().includes(label.toLowerCase()));
  assert.doesNotMatch(ui, /fetch\(|from ["'][^"']*meta\//);
});
