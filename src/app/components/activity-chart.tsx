import type { CompactTrialSummary } from "@/lib/meta/compact-evidence";
import { activityAtStep, activitySeries } from "@/lib/web/dashboard";

const colors = ["#42dff5", "#aa9aff", "#f4c66e", "#ff679e"];
const dashes = [undefined, "7 3", "2 4", undefined];

export function ActivityChart({ trial, step, maxStep, maxValue }: { trial: CompactTrialSummary; step: number; maxStep: number; maxValue: number }) {
  const series = activitySeries(trial);
  const sample = activityAtStep(trial, step);
  const x = (value: number) => 51 + value / maxStep * 497;
  const y = (value: number) => 171 - value / maxValue * 136;
  const ticks = Array.from(new Set([0, Math.round(maxStep / 4), Math.round(maxStep / 2), Math.round(maxStep * .75), maxStep]));
  return <figure className="activity-figure">
    <figcaption><span>ACTIVITY TRACE</span><span>Shared axes · recorded samples</span></figcaption>
    <svg className="activity-chart" viewBox="0 0 580 220" role="img" aria-label={`${trial.condition} normalized activity by simulation step. Current step ${step}. Recorded samples only; gaps are not interpolated.`}>
      <text x="51" y="17" className="axis-title">Normalized activity</text>
      {[0, .25, .5, .75, 1].map((fraction) => <g key={fraction}><line x1="51" y1={y(maxValue * fraction)} x2="548" y2={y(maxValue * fraction)} className="chart-grid" /><text x="40" y={y(maxValue * fraction) + 4} textAnchor="end">{Number((maxValue * fraction).toPrecision(4))}</text></g>)}
      {ticks.map((value) => <g key={value}><line x1={x(value)} y1="35" x2={x(value)} y2="171" className="chart-grid vertical" /><text x={x(value)} y="190" textAnchor="middle">{value}</text></g>)}
      <line x1={x(step)} x2={x(step)} y1="30" y2="174" className="chart-playhead" />
      {series.map((line, index) => <g key={line.id} style={{ color: colors[index] }}>
        <path fill="none" stroke="currentColor" strokeWidth={line.id === "motor" ? 3.2 : 2.5} strokeLinejoin="round" strokeDasharray={dashes[index]} d={line.points.map((point, i) => `${i === 0 || point.step !== line.points[i - 1].step + 1 ? "M" : "L"}${x(point.step)},${y(point.value)}`).join(" ")} />
        {line.points.map((point) => <circle key={point.step} cx={x(point.step)} cy={y(point.value)} r={point.step === step ? 5 : 3} fill={point.step === step ? "#f0f8ff" : "currentColor"} stroke="currentColor" strokeWidth="2"><title>{line.id}: step {point.step}, normalized activity {point.value}</title></circle>)}
      </g>)}
      <text x="300" y="215" textAnchor="middle" className="axis-title">Simulation step</text>
    </svg>
    <div className="chart-legend">{series.map((line, i) => <span key={line.id}><svg width="18" height="8" aria-hidden="true"><line x1="0" x2="18" y1="4" y2="4" stroke={colors[i]} strokeWidth="3" strokeDasharray={dashes[i]} /></svg>{line.id}<b>{sample?.nodes[line.id] ?? "—"}</b></span>)}</div>
    <p className="trace-note">{trial.activity.length} retained / {trial.traceSelection.originalStepCount} raw samples · {trial.traceSelection.omittedZeroStepCount} zero samples omitted · window 0–{trial.maxSteps}</p>
  </figure>;
}
