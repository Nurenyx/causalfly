import type { CompactTrialSummary } from "../meta/compact-evidence";
import { activityAtStep } from "./dashboard";
import { decodeFixtureOutput, trialAmplitude } from "../experiment/semantics";

export interface EmbodiedPlayback { cursor: number; playing: boolean; pass: number }

/** One clock: control, then intervention. Comparison reuses the same recorded step. */
export function embodiedFrame(steps: number[], cursor: number, compare: boolean) {
  const index = steps.length ? cursor % steps.length : 0;
  return { index, step: steps[index] ?? 0, condition: !compare && cursor >= steps.length && steps.length > 0 ? "perturbed" as const : "control" as const };
}

export function advanceEmbodiedPlayback(state: EmbodiedPlayback, stepCount: number, compare: boolean): EmbodiedPlayback {
  if (!state.playing || !stepCount) return state;
  const last = stepCount * (compare ? 1 : 2) - 1;
  return state.cursor < last ? { ...state, cursor: state.cursor + 1 } : { ...state, playing: false };
}

/** Illustrative approach within the step-zero pulse; these are scene units, not measurements. */
export function loomingPose(stimulus: number, progress: number) {
  const phase = Math.max(0, Math.min(1, progress));
  return { visible: stimulus > 0, z: -5.8 + phase * 2.7, radius: .2 + stimulus * (.25 + phase * .9) };
}

/** Presentation values selected from evidence. Missing samples stay unknown. */
export function embodimentAtStep(trial: CompactTrialSummary, step: number) {
  const sample = activityAtStep(trial, step);
  const { network, experiment, appliedPerturbation } = trial.provenance;
  const input = sample?.nodes[network.inputNodeId] ?? null;
  const output = sample?.nodes[network.outputNodeId] ?? null;
  return {
    input, output,
    // The fixture declares a single external pulse at step zero.
    stimulus: step === 0 ? trialAmplitude(trial) : 0,
    thresholdReached: output === null ? null : output >= experiment.outputThreshold,
    target: appliedPerturbation?.targetNodeId ?? null,
  };
}

/** Pure visual controller: scene units, never measured body positions or biomechanics.
 * A recorded threshold crossing commits takeoff; subsequent steps execute/recover
 * that command even if the one-pulse decoder returns to IDLE. Seeking is exact.
 */
export function recordedMotorFrame(trial: CompactTrialSummary, step: number) {
  const signal = embodimentAtStep(trial, step);
  const sample = trial.activity.findLast(s=>s.step<=step);
  const output = sample?.nodes[trial.provenance.network.outputNodeId];
  const decoder = output === undefined ? null : sample?.decoder ?? decodeFixtureOutput(output,trial.provenance.experiment.outputThreshold);
  const onset = trial.outputThresholdCrossingStep;
  const triggered = onset !== null && step >= onset;
  const walks = trial.activity.filter(s=>s.step<=step && decodeFixtureOutput(s.nodes[trial.provenance.network.outputNodeId],trial.provenance.experiment.outputThreshold)==="WALK").length;
  const age = triggered ? step-onset : 0;
  const phase = triggered ? age<=2 ? "TAKEOFF_ESCAPE" : age<=4 ? "RECOVERY" : "GROUNDED" : "GROUNDED";
  const pose = triggered
    ? {x:0,y:age<=2 ? .85+age*.4 : age===3 ? .8 : age===4 ? .2 : 0,z:Math.min(4.1,1.1+age*1.1),pitch:age<=2 ? -.35 : 0}
    : {x:0,y:0,z:walks*.22,pitch:0};
  return {...signal,retainedOutput:output ?? null,decoder,decoderStep:sample?.step ?? null,onset:triggered?onset:null,phase,pose,displacement:Math.hypot(pose.x,pose.y,pose.z)};
}

/** Cumulative procedural history from retained steps only, with an explicit origin. */
export function recordedMotorTrail(trial: CompactTrialSummary, step: number) {
  return [{x:0,y:0,z:0},...trial.activity.filter(s=>s.step<=step).map(s=>recordedMotorFrame(trial,s.step).pose)];
}

/** Future visual perception boundary. No provider or live perception is enabled. */
export interface PerceptionObservation {
  frameId: string;
  stimulus: { kind: "looming"; confidence: number; normalizedIntensity: number } | null;
}
export interface PerceptionAdapter {
  observe(frame: ImageBitmap): Promise<PerceptionObservation>;
}
