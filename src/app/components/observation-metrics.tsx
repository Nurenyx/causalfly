import type { MeasuredExperimentResult as WebExperimentResult } from "@/lib/web/contracts";
import { isStimulusResponse } from "@/lib/experiment/semantics";
import { crossing, signed } from "@/lib/web/dashboard";
import { measurementLabels } from "@/lib/web/display-labels";
import { MeasuredDeltaCard } from "./measured-delta-card";

/** Presentation of engine-produced comparison values, never interpreter claims. */
export function ObservationMetrics({ result, compact = false }: { result: WebExperimentResult; compact?: boolean }) {
  const { control, perturbed, deltas } = result.measuredEvidence;
  const environment = isStimulusResponse(result.spec);
  const perturbedLabel = environment ? "TEST" : "INTERVENTION";
  return <div className={`measured-deltas${compact ? "" : " observation-metrics"}`}>
    <MeasuredDeltaCard label={measurementLabels.outputPeakActivity.label} technicalLabel={measurementLabels.outputPeakActivity.technical} control={control.outputPeakActivity} perturbed={perturbed.outputPeakActivity} perturbedLabel={perturbedLabel} delta={`Δ ${signed(deltas.outputPeakActivity)}`} note="Peak output · normalized activity" />
    <MeasuredDeltaCard label={measurementLabels.outputThresholdCrossingStep.label} technicalLabel={measurementLabels.outputThresholdCrossingStep.technical} control={crossing(control.outputThresholdCrossingStep)} perturbed={crossing(perturbed.outputThresholdCrossingStep)} perturbedLabel={perturbedLabel} delta={deltas.outputThresholdCrossingSteps === null ? "N/A" : `Δ ${signed(deltas.outputThresholdCrossingSteps)}`} note={deltas.outputThresholdCrossingSteps === null ? "Not comparable · a crossing was not reached" : `Simulation steps · ${environment ? "test − control" : "intervention − control"}`} tone="amber" />
    <MeasuredDeltaCard label={measurementLabels.outcome.label} technicalLabel={measurementLabels.outcome.technical} control={control.outcome === "THRESHOLD_REACHED" ? "Reached" : "Not reached"} perturbed={perturbed.outcome === "THRESHOLD_REACHED" ? "Reached" : "Not reached"} perturbedLabel={perturbedLabel} delta={deltas.outcomeChanged ? "Changed" : "Unchanged"} note="Output threshold · deterministic outcome" tone={deltas.outcomeChanged ? "red" : "green"} />
  </div>;
}
