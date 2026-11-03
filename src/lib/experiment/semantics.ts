import type { ExperimentComparison, ExperimentSpec, ExperimentType, FixtureDecoder, TrialResult } from "./types";

export const experimentTypeOf = (spec: Pick<ExperimentSpec, "experimentType"> | { readonly id: string; readonly experimentType?: ExperimentType }): ExperimentType => spec.experimentType ?? "NEURAL_INTERVENTION";
export const isStimulusResponse = (spec: Pick<ExperimentSpec, "experimentType"> | { readonly id: string; readonly experimentType?: ExperimentType }) => experimentTypeOf(spec) === "STIMULUS_RESPONSE";
export const trialAmplitude = (trial: TrialResult) => trial.provenance.stimulus?.amplitude ?? trial.provenance.experiment.stimulus.amplitude;
export function decodeFixtureOutput(output: number, threshold: number): FixtureDecoder {
  return output >= threshold ? "ESCAPE" : output > 0 ? "WALK" : "IDLE";
}
export function validComparison(provenance: ExperimentComparison["provenance"]) {
  const m = provenance.matchedConditions;
  return m.engine && m.network && m.experiment && m.seed && m.maxSteps && m.outputThreshold &&
    (provenance.experimentType === "STIMULUS_RESPONSE"
      ? !m.stimulus && !m.onlyDeclaredPerturbationDiffers && provenance.onlyDeclaredStimulusDiffers === true
      : m.stimulus && m.onlyDeclaredPerturbationDiffers);
}
export function experimentConditions(spec: Pick<ExperimentSpec,"experimentType"|"perturbation"|"stimulus">) {
  const environment = isStimulusResponse(spec);
  return {
    environment,
    type: environment ? "STIMULUS RESPONSE" : "NEURAL INTERVENTION",
    second: environment ? "TEST" : "INTERVENTION",
    changed: environment ? "Stimulus" : spec.perturbation?.targetNodeId.replaceAll("_", " ") ?? "Pathway",
    control: environment ? "No stimulus" : "Intact network",
    test: environment ? "Looming stimulus" : "Silenced pathway",
    controlAmplitude: environment ? 0 : spec.stimulus.amplitude,
    testAmplitude: spec.stimulus.amplitude,
    held: environment ? "Network identical · no neural intervention" : `Stimulus identical · ${spec.stimulus.amplitude.toFixed(1)} in both runs`,
  };
}
