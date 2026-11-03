import type { MeasuredExperimentResult } from "./contracts";
import { isStimulusResponse } from "../experiment/semantics";

/** Deterministic display arithmetic only. No new measurements or model claims. */
export function resultSummary(result: MeasuredExperimentResult) {
  const { control, perturbed, deltas } = result.measuredEvidence;
  const percentage = control.outputPeakActivity > 0 ? (perturbed.outputPeakActivity - control.outputPeakActivity) / control.outputPeakActivity * 100 : null;
  const format = (value: number) => Number(Math.abs(value).toPrecision(3)).toString();
  const environment = isStimulusResponse(result.spec);
  const signal = environment ? `Stimulus evoked output ${perturbed.outputPeakActivity.toPrecision(3)}` : percentage === null ? "No baseline signal to compare" : percentage === 0 ? "Signal unchanged" : `Signal ${percentage < 0 ? "reduced" : "increased"} ${format(percentage)}%`;
  const delay = deltas.outputThresholdCrossingSteps;
  const response = environment ? `Test threshold ${perturbed.outputThresholdCrossingStep === null ? "not reached" : `reached at step ${perturbed.outputThresholdCrossingStep}`}; control threshold not reached` : delay === null ? "Response timing not comparable" : delay === 0 ? "Response timing unchanged" : `Response ${delay > 0 ? "delayed" : "earlier"} by ${Math.abs(delay)} ${Math.abs(delay) === 1 ? "step" : "steps"}`;
  const headline = deltas.outputPeakActivity < 0 && delay !== null && delay > 0
    ? "Silencing one pathway weakened the signal and made it arrive later."
    : `${signal}. ${response}.`;
  return { signal, response, percentage, headline, detail: "Peak output signal relative to control. Response means first output-threshold crossing; steps are simulation updates, not seconds." };
}
