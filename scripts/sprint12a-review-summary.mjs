import { createHash } from 'node:crypto';

const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Engineering acceptance summary, not a substitute for the full UI evidence export. */
function summarizeEvidence(evidence) {
  const trajectory = evidence.trajectory;
  if (!trajectory) return evidence;
  const selected = [trajectory[0], trajectory.find(f => f.decision.state === 'ESCAPE' && (f.after.altitude ?? 0) > .15), trajectory.find(f => f.motor.phase === 'RECOVERY'), trajectory.at(-1)].filter(Boolean);
  return {
    schemaVersion: evidence.schemaVersion, config: evidence.config, timestep: evidence.timestep,
    ticks: evidence.ticks, checkpoint: evidence.checkpoint, droppedWallSeconds: evidence.droppedWallSeconds,
    retainedInputs: evidence.inputs.length, retainedTrajectoryFrames: trajectory.length,
    inputSha256: sha256(evidence.inputs), trajectorySha256: sha256(trajectory),
    maximumAltitude: Math.max(0, ...trajectory.map(f => f.after.altitude ?? 0)),
    maximumSpeed: Math.max(0, ...trajectory.map(f => f.after.speed)),
    uniquePositions: new Set(trajectory.map(f => `${f.after.x.toFixed(4)},${f.after.z.toFixed(4)}`)).size,
    representativeFrames: [...new Map(selected.map(frame => [frame.tick, frame])).values()],
    disclosure: evidence.disclosure,
  };
}
function summarizeRecording(recording) {
  return { ...recording, conditions: recording.conditions.map(summarizeEvidence) };
}
export function compactAcceptanceTrace(trace) {
  return {
    ...trace,
    artifactScope: 'Compact engineering review summary with hashes and representative frames. Full checkpoint/input/trajectory evidence remains available through the UI export; this summary alone is not a complete replay file.',
    exploration: summarizeRecording(trace.exploration),
    matched: summarizeRecording(trace.matched),
    completed: summarizeRecording(trace.completed),
    neural: summarizeRecording(trace.neural),
  };
}
