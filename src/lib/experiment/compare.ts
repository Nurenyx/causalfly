import { isDeepStrictEqual } from "node:util";
import { freezeRecord, runTrial } from "./engine";
import { experimentTypeOf, isStimulusResponse, trialAmplitude, validComparison } from "./semantics";
import type {
  ExperimentComparison,
  ExperimentSpec,
  NetworkDefinition,
  TrialResult,
} from "./types";

/** Reject unmatched records instead of presenting confounded differences. */
export function compareTrials(
  control: TrialResult,
  perturbed: TrialResult,
): ExperimentComparison {
  const a = control.provenance;
  const b = perturbed.provenance;
  const environment = isStimulusResponse(a.experiment);
  const matchedConditions = {
    engine: a.engineVersion === b.engineVersion,
    network: isDeepStrictEqual(a.network, b.network),
    experiment: isDeepStrictEqual(a.experiment, b.experiment),
    stimulus: trialAmplitude(control) === trialAmplitude(perturbed),
    seed: a.experiment.seed === b.experiment.seed,
    maxSteps: a.experiment.maxSteps === b.experiment.maxSteps,
    outputThreshold: a.experiment.outputThreshold === b.experiment.outputThreshold,
    onlyDeclaredPerturbationDiffers:
      control.condition === "CONTROL" &&
      a.condition === "CONTROL" &&
      perturbed.condition === "PERTURBED" &&
      b.condition === "PERTURBED" &&
      a.appliedPerturbation === null &&
      isDeepStrictEqual(b.appliedPerturbation, a.experiment.perturbation),
  };
  const provenance = {
    matchedConditions,
    ...(a.experiment.experimentType ? { experimentType: experimentTypeOf(a.experiment) } : {}),
    ...(environment ? { onlyDeclaredStimulusDiffers: control.condition === "CONTROL" && a.condition === "CONTROL" && perturbed.condition === "TEST" && b.condition === "TEST" && a.appliedPerturbation === null && b.appliedPerturbation === null && trialAmplitude(control) === 0 && trialAmplitude(perturbed) === a.experiment.stimulus.amplitude && trialAmplitude(perturbed) > 0 } : {}),
    deltaConvention: environment ? "TEST_MINUS_CONTROL" as const : "PERTURBED_MINUS_CONTROL" as const,
  };
  if (!validComparison(provenance)) throw new Error(`Cannot compare unmatched trials: ${Object.entries(matchedConditions).filter(([, value])=>!value).map(([key])=>key).join(", ")}`);

  const controlStep = control.outputThresholdCrossingStep;
  const perturbedStep = perturbed.outputThresholdCrossingStep;
  return freezeRecord({
    control,
    perturbed,
    deltas: {
      outputPeakActivity:
        perturbed.outputPeakActivity - control.outputPeakActivity,
      outputThresholdCrossingSteps:
        controlStep === null || perturbedStep === null
          ? null
          : perturbedStep - controlStep,
      outcomeChanged: control.outcome !== perturbed.outcome,
    },
    provenance,
  });
}

export function runExperiment(
  network: NetworkDefinition,
  spec: ExperimentSpec,
): ExperimentComparison {
  return compareTrials(
    runTrial(network, spec, "CONTROL"),
    runTrial(network, spec, isStimulusResponse(spec) ? "TEST" : "PERTURBED"),
  );
}
