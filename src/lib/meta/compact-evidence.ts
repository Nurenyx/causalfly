import { freezeRecord } from "../experiment/engine";
import type { ExperimentComparison, TrialResult } from "../experiment/types";
import { assertEngineEvidence, type EvidencePayload } from "./evidence";

/** A selection of recorded samples, never a replacement for a full TrialResult. */
export interface CompactTrialSummary extends Omit<TrialResult, "activity"> {
  readonly activity: TrialResult["activity"];
  readonly maxSteps: number;
  readonly traceSelection: {
    readonly rule: "all-nonzero-steps-and-first-final-quiescent-step";
    readonly originalStepCount: number;
    readonly omittedZeroStepCount: number;
  };
}

export interface CompactEvidencePayload extends Omit<EvidencePayload, "comparison"> {
  readonly comparison: Omit<ExperimentComparison, "control" | "perturbed"> & {
    readonly control: CompactTrialSummary;
    readonly perturbed: CompactTrialSummary;
  };
}

function compactTrial(trial: TrialResult): CompactTrialSummary {
  const activity: TrialResult["activity"][number][] = [];
  let lastActiveIndex = -1;
  trial.activity.forEach((sample, index) => {
    // Inspect every node, not just the output. No epsilon, rounding or renumbering.
    if (Object.values(sample.nodes).some((value) => value !== 0)) {
      activity.push(sample);
      lastActiveIndex = index;
    }
  });
  // If the entire trial is zero, retain its initial recorded quiescent sample.
  const finalQuiescent = trial.activity[lastActiveIndex + 1];
  if (finalQuiescent) activity.push(finalQuiescent);

  return {
    ...trial,
    activity,
    maxSteps: trial.provenance.experiment.maxSteps,
    traceSelection: {
      rule: "all-nonzero-steps-and-first-final-quiescent-step",
      originalStepCount: trial.activity.length,
      omittedZeroStepCount: trial.activity.length - activity.length,
    },
  };
}

/** Derive a frozen view only from locally issued, immutable engine evidence. */
export function createCompactEvidence(evidence: EvidencePayload): CompactEvidencePayload {
  assertEngineEvidence(evidence);
  return freezeRecord({
    ...evidence,
    comparison: {
      ...evidence.comparison,
      control: compactTrial(evidence.comparison.control),
      perturbed: compactTrial(evidence.comparison.perturbed),
    },
  });
}
