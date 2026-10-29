import type { CompactTrialSummary } from "../meta/compact-evidence";
import { activityAtStep } from "./dashboard";

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
    stimulus: step === 0 ? experiment.stimulus.amplitude : 0,
    thresholdReached: output === null ? null : output >= experiment.outputThreshold,
    target: appliedPerturbation?.targetNodeId ?? null,
  };
}

/** Future visual perception boundary. No provider or live perception is enabled. */
export interface PerceptionObservation {
  frameId: string;
  stimulus: { kind: "looming"; confidence: number; normalizedIntensity: number } | null;
}
export interface PerceptionAdapter {
  observe(frame: ImageBitmap): Promise<PerceptionObservation>;
}
