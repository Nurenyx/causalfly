import type { MeasuredExperimentResult } from "@/lib/web/contracts";
import { resultSummary } from "@/lib/web/result-summary";
import { Badge } from "./workspace-ui";
export function ResultStory({ result }: { result: MeasuredExperimentResult }) {
  const summary = resultSummary(result);
  const { control, perturbed } = result.measuredEvidence;
  const scale = Math.max(control.outputPeakActivity, perturbed.outputPeakActivity, 1);
  return <section className="result-story" aria-label="Measured result"><div><Badge tone="cyan">ENGINE MEASURED</Badge><h2>{summary.signal}.</h2><p>{summary.response}.</p><small>In this synthetic test only.</small></div><div className="signal-bars" aria-label="Measured peak output before and after">{[{ label: "Before / control", value: control.outputPeakActivity, tone: "control" }, { label: "After / silenced", value: perturbed.outputPeakActivity, tone: "intervention" }].map(row => <div key={row.tone} data-tone={row.tone}><span>{row.label}</span><div><i style={{ width: `${row.value / scale * 100}%` }} /></div><strong>{row.value}</strong></div>)}<details><summary>What these numbers mean</summary><p>{summary.detail} Percentage rounded to three significant figures.</p></details></div></section>;
}
