import type { NetworkDefinition, PerturbationSpec } from "./types";

export function validatePerturbation(
  network: NetworkDefinition,
  perturbation: PerturbationSpec,
): void {
  if (perturbation.type !== "silence") {
    throw new Error(`Unsupported perturbation type: ${perturbation.type}`);
  }
  if (!network.nodes.some((node) => node.id === perturbation.targetNodeId)) {
    throw new Error(`Unknown perturbation target: ${perturbation.targetNodeId}`);
  }
}

/** Called at initialization and after every synchronous update. */
export function applyPerturbation(
  activity: Record<string, number>,
  perturbation: PerturbationSpec | null,
): void {
  if (perturbation) activity[perturbation.targetNodeId] = 0;
}
