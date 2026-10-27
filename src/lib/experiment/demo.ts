import { runExperiment } from "./compare";
import { syntheticDemoNetwork } from "./network";
import type { ExperimentComparison, ExperimentSpec } from "./types";

export const demoExperimentSpec: ExperimentSpec = {
  id: "synthetic-primary-silencing-v1",
  hypothesis:
    "Silencing primary_a will reduce the synthetic motor peak and delay threshold crossing through the alternate pathway.",
  stimulus: { amplitude: 1 },
  seed: 1,
  maxSteps: 6,
  outputThreshold: 0.4,
  perturbation: { type: "silence", targetNodeId: "primary_a" },
};

export function runDemoExperiment(): ExperimentComparison {
  return runExperiment(syntheticDemoNetwork, demoExperimentSpec);
}
