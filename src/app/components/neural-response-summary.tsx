import type { CompactTrialSummary } from "@/lib/meta/compact-evidence";
import { crossing } from "@/lib/web/dashboard";
import type { resultSummary } from "@/lib/web/result-summary";

/** Stored trial facts and the shared existing display summary, never a new calculation. */
export function NeuralResponseSummary({ trial, summary, outcomeChanged }: {
  trial: CompactTrialSummary;
  summary: ReturnType<typeof resultSummary>;
  outcomeChanged: boolean;
}) {
  return <section className="neural-response-facts" aria-label="Measured neural response">
    <h4>MEASURED RESPONSE</h4>
    <small>Retained trial totals · not current-step output</small>
    <dl>
      <div><dt>Peak normalized output</dt><dd data-measure="peak" data-value={trial.outputPeakActivity} title={String(trial.outputPeakActivity)}>{trial.outputPeakActivity.toFixed(3)}</dd></div>
      <div><dt>Response step</dt><dd data-measure="response-step" data-value={trial.outputThresholdCrossingStep ?? ""}>{crossing(trial.outputThresholdCrossingStep)}</dd></div>
      <div><dt>Threshold</dt><dd data-measure="outcome" data-value={trial.outcome}>{trial.outcome === "THRESHOLD_REACHED" ? "Reached" : "Not reached"}</dd></div>
      <div><dt>Motor execution</dt><dd>{trial.outcome === "THRESHOLD_REACHED" ? "Takeoff escape" : trial.outputPeakActivity === 0 ? "Grounded idle" : "Grounded walk"}</dd></div>
    </dl>
    <div className="neural-response-delta"><h4>{trial.condition === "TEST" ? "TEST VS CONTROL" : "INTERVENTION VS CONTROL"}</h4><strong>{summary.signal}</strong><p>{summary.response} · {outcomeChanged ? "Outcome changed" : "Outcome unchanged"}</p></div>
    <small>Simulation steps, not biological time. Motor execution is procedural.</small>
  </section>;
}
