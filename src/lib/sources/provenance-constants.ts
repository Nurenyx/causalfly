/**
 * Provenance constants and verified scientific dataset references for CausalFly.
 *
 * NOTE: Runtime-measured values and live simulation states must come from
 * their respective deterministic engines or telemetry streams.
 *
 * Source Authority:
 * Berg et al. (2026)
 * "Sexual dimorphism in the complete Drosophila male central nervous system connectome"
 * Cell 189(18), September 3, 2026. DOI: 10.1016/j.cell.2026.08.015
 */

export const SCIENTIFIC_PROVENANCE = {
  dataset: "male-cns:v1.0",
  citation: {
    authors: "Berg et al.",
    year: 2026,
    title: "Sexual dimorphism in the complete Drosophila male central nervous system connectome",
    journal: "Cell",
    volume: "189",
    issue: "18",
    date: "September 3, 2026",
    doi: "10.1016/j.cell.2026.08.015",
  },
  primaryCounts: {
    publishedCnsNeurons: 166700,
    uniqueCellTypes: 11710,
    synapticConnections: "124.2M",
    graphEdges: "25.58M",
    connectedNeurons: 166483,
    disconnectedNeurons: 217,
    thresholdedEdgesAt5Synapses: "~6.24M",
    thresholdedNeuronsAt5Synapses: 165536,
  },
  internalCounts: {
    mappedSomaCoordinates: 141781,
    loadedStructuralGraphNodes: 176422,
    loadedThresholdedStructuralEdges: 6287749,
  },
  anatomicalDisclosure: {
    visualMesh: "TuragaLab/flybody (female Drosophila anatomical model; Vaxenburg et al., Nature 2025)",
    neuralSource: "male-cns:v1.0 (published male Drosophila CNS connectome simulation)",
    sexMatchNotice: "Female anatomical visual mesh; male CNS neural simulation. Visual anatomy is not sex-matched.",
  },
  conciseIdentity: {
    tag: "male-cns:v1.0",
    summary: "Published male Drosophila CNS connectome",
    dynamics: "Simulated dynamics",
  },
} as const;
