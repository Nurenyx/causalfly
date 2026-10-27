import type { NetworkDefinition } from "./types";

/** Engineering test fixture only. These nodes have no biological identities. */
export const syntheticDemoNetwork: NetworkDefinition = {
  id: "synthetic-two-pathway-v1",
  provenance: {
    kind: "synthetic-fixture",
    description:
      "Hand-authored engineering demonstration network; not a biological model or connectome dataset.",
  },
  nodes: [
    { id: "stimulus" },
    { id: "primary_a" },
    { id: "primary_b" },
    { id: "alternate_a" },
    { id: "alternate_b" },
    { id: "alternate_c" },
    { id: "motor" },
  ],
  edges: [
    { from: "stimulus", to: "primary_a", weight: 1 },
    { from: "primary_a", to: "primary_b", weight: 1 },
    { from: "primary_b", to: "motor", weight: 1 },
    { from: "stimulus", to: "alternate_a", weight: 0.5 },
    { from: "alternate_a", to: "alternate_b", weight: 1 },
    { from: "alternate_b", to: "alternate_c", weight: 1 },
    { from: "alternate_c", to: "motor", weight: 1 },
  ],
  inputNodeId: "stimulus",
  outputNodeId: "motor",
};

export function validateNetwork(network: NetworkDefinition): void {
  if (
    !network.id.trim() ||
    !network.provenance.kind.trim() ||
    !network.provenance.description.trim()
  ) {
    throw new Error("Network id and provenance must be non-empty.");
  }
  const ids = new Set(network.nodes.map((node) => node.id));
  if (
    ids.size === 0 ||
    ids.size !== network.nodes.length ||
    network.nodes.some((node) => !node.id.trim())
  ) {
    throw new Error("Network must contain unique, non-empty node IDs.");
  }
  if (!ids.has(network.inputNodeId) || !ids.has(network.outputNodeId)) {
    throw new Error("Network input and output must reference existing nodes.");
  }
  for (const edge of network.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      throw new Error(`Edge ${edge.from} -> ${edge.to} references an unknown node.`);
    }
    if (!Number.isFinite(edge.weight)) {
      throw new Error("Edge weights must be finite numbers.");
    }
  }
}
