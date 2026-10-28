/** The source boundary is separate from Meta execution mode and experiment evidence. */
export type DataSourceKind = "SYNTHETIC_FIXTURE" | "FRUITFLY_XR";

export const dataSources = {
  SYNTHETIC_FIXTURE: { kind: "SYNTHETIC_FIXTURE", label: "Synthetic Fixture", description: "Deterministic engineering network", status: "READY" },
  FRUITFLY_XR: { kind: "FRUITFLY_XR", label: "FruitFly XR", description: "Connectome-backed simulation telemetry" },
} as const;

export type FruitFlyConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "DATA RECEIVED" | "ERROR";

export interface FruitFlyEvidence {
  source: "FRUITFLY_XR";
  receivedAt: string; // CausalFly receipt time, never represented as simulation time.
  provenance: {
    structuralSource: "Published male Drosophila CNS connectome: male-cns:v1.0";
    dataset: "male-cns:v1.0";
    connectomeSha256: string;
    neurons: number;
    edges: number;
    dynamics: "SIMULATED";
    generator: "FruitFly XR brain server";
    experimentalRecording: false;
    transport: "observatory/v1";
  };
  telemetry: {
    sessionId: string;
    sequence: number;
    simulationMs: number;
    neuralTick: number;
    totalSpikeEvents: number; // Events in this tick, despite the upstream field name.
    activeNeuronCount: number; // Includes subthreshold/refractory/pending-input neurons.
    displaySpikeEvents: number;
    displayTruncated: boolean;
    droppedDisplayFrames: number;
    droppedSubscriberMessages: number;
    spikeDisplaySemantics: "EXACT_SPIKES_FIRST_N_FILTERED";
    edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL";
    spikeEvents: { neuronId: number; spikeTimeMs: number }[];
    decodedMotor: { name: string; value: number }[];
    inputSequence: number;
    inputFresh: boolean;
    motorMode: string;
  };
}

/** Only allowlisted telemetry crosses the server/browser boundary. */
export interface FruitFlySnapshot {
  /** Opaque reference to validated server retention; contains no provider information. */
  retentionId?: string;
  source: "FRUITFLY_XR";
  state: FruitFlyConnectionState;
  message: string;
  evidence: FruitFlyEvidence | null;
}

export function disconnectedFruitFly(): FruitFlySnapshot {
  return { source: "FRUITFLY_XR", state: "DISCONNECTED", message: "Connect to receive read-only simulation telemetry.", evidence: null };
}
