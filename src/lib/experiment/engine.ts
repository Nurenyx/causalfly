import { validateNetwork } from "./network";
import { applyPerturbation, validatePerturbation } from "./perturbation";
import { decodeFixtureOutput, isStimulusResponse } from "./semantics";
import type {
  Condition,
  ExperimentSpec,
  NetworkDefinition,
  TrialResult,
} from "./types";

export const ENGINE_VERSION = "weighted-synchronous-v1";

function validateExperiment(spec: ExperimentSpec): void {
  if (!spec.id.trim() || !spec.hypothesis.trim()) {
    throw new Error("Experiment id and hypothesis must be non-empty.");
  }
  if (
    !Number.isFinite(spec.stimulus.amplitude) ||
    spec.stimulus.amplitude < 0 ||
    spec.stimulus.amplitude > 1
  ) {
    throw new Error("Stimulus amplitude must be finite and between 0 and 1.");
  }
  if (!Number.isSafeInteger(spec.seed)) {
    throw new Error("Seed must be a safe integer.");
  }
  if (!Number.isSafeInteger(spec.maxSteps) || spec.maxSteps < 0) {
    throw new Error("maxSteps must be a non-negative safe integer.");
  }
  if (
    !Number.isFinite(spec.outputThreshold) ||
    spec.outputThreshold <= 0 ||
    spec.outputThreshold > 1
  ) {
    throw new Error("Output threshold must be finite and in (0, 1].");
  }
}

/** Freeze detached measured records so consumers cannot overwrite engine output. */
export function freezeRecord<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freezeRecord);
    Object.freeze(value);
  }
  return value;
}

/**
 * Step 0 contains the input pulse. Every subsequent step reads ONLY the prior
 * state: a_i(t+1) = clamp(sum_j(a_j(t) * w_ji), 0, 1).
 * There is no persistence, noise, or implicit restimulation. Each edge costs one
 * step. Silence overrides step 0 and every update before activity propagates.
 */
export function runTrial(
  network: NetworkDefinition,
  spec: ExperimentSpec,
  condition: Condition,
): TrialResult {
  validateNetwork(network);
  validateExperiment(spec);
  const environment = isStimulusResponse(spec);
  if (environment) {
    if (spec.perturbation !== null || spec.stimulus.amplitude <= 0) throw new Error("Stimulus response requires positive test input and no neural intervention.");
  } else {
    if (!spec.perturbation) throw new Error("A neural intervention must declare a perturbation.");
    validatePerturbation(network, spec.perturbation);
  }
  if (condition !== "CONTROL" && condition !== (environment ? "TEST" : "PERTURBED")) {
    throw new Error(`Unknown condition: ${condition}`);
  }

  const appliedPerturbation =
    condition === "PERTURBED" ? spec.perturbation : null;
  const amplitude = environment && condition === "CONTROL" ? 0 : spec.stimulus.amplitude;
  const emptyState = (): Record<string, number> =>
    Object.fromEntries(network.nodes.map((node) => [node.id, 0]));
  let current = emptyState();
  current[network.inputNodeId] = amplitude;
  applyPerturbation(current, appliedPerturbation);

  const activity: { step: number; nodes: Record<string, number>; decoder?: import("./types").FixtureDecoder }[] = [];
  let outputPeakActivity = 0;
  let outputThresholdCrossingStep: number | null = null;

  for (let step = 0; step <= spec.maxSteps; step++) {
    const output = current[network.outputNodeId];
    activity.push({ step, nodes: current, ...(spec.experimentType ? { decoder: decodeFixtureOutput(output, spec.outputThreshold) } : {}) });
    outputPeakActivity = Math.max(outputPeakActivity, output);
    if (outputThresholdCrossingStep === null && output >= spec.outputThreshold) {
      outputThresholdCrossingStep = step;
    }
    if (step === spec.maxSteps) break;

    const next = emptyState();
    for (const edge of network.edges) {
      next[edge.to] += current[edge.from] * edge.weight;
    }
    for (const node of network.nodes) {
      next[node.id] = Math.max(0, Math.min(1, next[node.id]));
      if (!Number.isFinite(next[node.id])) {
        throw new Error(`Non-finite activation at node ${node.id}.`);
      }
    }
    applyPerturbation(next, appliedPerturbation);
    current = next;
  }

  return freezeRecord({
    condition,
    activity,
    outputPeakActivity,
    outputThresholdCrossingStep,
    outcome:
      outputThresholdCrossingStep === null
        ? "THRESHOLD_NOT_REACHED"
        : "THRESHOLD_REACHED",
    provenance: {
      engineVersion: ENGINE_VERSION,
      condition,
      network: structuredClone(network),
      experiment: structuredClone(spec),
      appliedPerturbation: structuredClone(appliedPerturbation),
      ...(spec.experimentType ? { stimulus: { amplitude } } : {}),
    },
  });
}
