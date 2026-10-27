import { isDeepStrictEqual } from "node:util";
import { freezeRecord, runTrial } from "./engine";
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
  const matchedConditions = {
    engine: a.engineVersion === b.engineVersion,
    network: isDeepStrictEqual(a.network, b.network),
    experiment: isDeepStrictEqual(a.experiment, b.experiment),
    stimulus: isDeepStrictEqual(a.experiment.stimulus, b.experiment.stimulus),
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
  const mismatches = Object.entries(matchedConditions)
    .filter(([, matched]) => !matched)
    .map(([name]) => name);
  if (mismatches.length) {
    throw new Error(`Cannot compare unmatched trials: ${mismatches.join(", ")}`);
  }

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
    provenance: {
      matchedConditions,
      deltaConvention: "PERTURBED_MINUS_CONTROL",
    },
  });
}

export function runExperiment(
  network: NetworkDefinition,
  spec: ExperimentSpec,
): ExperimentComparison {
  return compareTrials(
    runTrial(network, spec, "CONTROL"),
    runTrial(network, spec, "PERTURBED"),
  );
}
