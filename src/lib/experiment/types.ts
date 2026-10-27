export type Condition = "CONTROL" | "PERTURBED";

export interface NetworkDefinition {
  readonly id: string;
  readonly provenance: {
    readonly kind: string;
    readonly description: string;
  };
  readonly nodes: readonly { readonly id: string }[];
  readonly edges: readonly {
    readonly from: string;
    readonly to: string;
    readonly weight: number;
  }[];
  readonly inputNodeId: string;
  readonly outputNodeId: string;
}

export interface PerturbationSpec {
  readonly type: "silence";
  readonly targetNodeId: string;
}

export interface ExperimentSpec {
  readonly id: string;
  readonly hypothesis: string;
  /** A single pulse at step 0; there is no continuing external drive. */
  readonly stimulus: { readonly amplitude: number };
  /** Recorded for reproducibility; v1 has no random operations. */
  readonly seed: number;
  /** Number of transitions after the initial state (maxSteps + 1 samples). */
  readonly maxSteps: number;
  readonly outputThreshold: number;
  readonly perturbation: PerturbationSpec;
}

export type Outcome = "THRESHOLD_REACHED" | "THRESHOLD_NOT_REACHED";

export interface TrialResult {
  readonly condition: Condition;
  readonly activity: readonly {
    readonly step: number;
    readonly nodes: Readonly<Record<string, number>>;
  }[];
  readonly outputPeakActivity: number;
  readonly outputThresholdCrossingStep: number | null;
  readonly outcome: Outcome;
  readonly provenance: {
    readonly engineVersion: string;
    readonly condition: Condition;
    /** Detached snapshots of all inputs, not just their display names. */
    readonly network: NetworkDefinition;
    readonly experiment: ExperimentSpec;
    readonly appliedPerturbation: PerturbationSpec | null;
  };
}

export interface ExperimentComparison {
  readonly control: TrialResult;
  readonly perturbed: TrialResult;
  readonly deltas: {
    /** All numeric deltas are PERTURBED minus CONTROL. */
    readonly outputPeakActivity: number;
    /** Null if either trial never crosses; absence is not zero latency. */
    readonly outputThresholdCrossingSteps: number | null;
    readonly outcomeChanged: boolean;
  };
  readonly provenance: {
    readonly matchedConditions: {
      readonly engine: boolean;
      readonly network: boolean;
      readonly experiment: boolean;
      readonly stimulus: boolean;
      readonly seed: boolean;
      readonly maxSteps: boolean;
      readonly outputThreshold: boolean;
      readonly onlyDeclaredPerturbationDiffers: boolean;
    };
    readonly deltaConvention: "PERTURBED_MINUS_CONTROL";
  };
}
