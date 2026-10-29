import { ResultStory } from "./result-story";
import { useEffect, useState } from "react";
import type { MeasuredExperimentResult as WebExperimentResult } from "@/lib/web/contracts";
import type { CompactTrialSummary } from "@/lib/meta/compact-evidence";
import { crossing, playbackSteps } from "@/lib/web/dashboard";
import { SyntheticNetworkViz } from "./synthetic-network-viz";
import { ActivityChart } from "./activity-chart";
import { PropagationTimeline } from "./propagation-timeline";
import { AiScientistRail } from "./ai-scientist";
import { Badge } from "./workspace-ui";
import { ExperimentPlayback } from "./experiment-playback";
import { ObservationMetrics } from "./observation-metrics";
import { measurementLabels } from "@/lib/web/display-labels";

function ConditionPanel({ trial, step, maxStep, maxValue }: { trial: CompactTrialSummary; step: number; maxStep: number; maxValue: number }) {
  return <article className={`condition-panel ${trial.condition.toLowerCase()}`} aria-label={`${trial.condition} measurements`}>
    <header className="condition-header"><h3 title={trial.condition}><span className="status-dot" />{trial.condition === "CONTROL" ? "BEFORE / CONTROL" : "AFTER / INTERVENTION"}</h3><span>{trial.provenance.appliedPerturbation ? `silence / ${trial.provenance.appliedPerturbation.targetNodeId}` : "baseline / intact network"}</span></header>
    <SyntheticNetworkViz trial={trial} step={step} />
    <ActivityChart trial={trial} step={step} maxStep={maxStep} maxValue={maxValue} />
    <dl className="condition-summary"><div><dt title={measurementLabels.outputPeakActivity.technical}>{measurementLabels.outputPeakActivity.label}</dt><dd>{trial.outputPeakActivity}</dd></div><div><dt title={measurementLabels.outputThresholdCrossingStep.technical}>{measurementLabels.outputThresholdCrossingStep.label}</dt><dd>{crossing(trial.outputThresholdCrossingStep)}</dd></div><div><dt title={measurementLabels.outcome.technical}>{measurementLabels.outcome.label}</dt><dd className="condition-outcome">{trial.outcome === "THRESHOLD_REACHED" ? "Threshold reached" : "Threshold not reached"}</dd></div></dl>
  </article>;
}

export function ComparisonMeasurements({ result, onEvidence, guided = false }: { result: WebExperimentResult; onEvidence: () => void; guided?: boolean }) {
  const { control, perturbed, provenance } = result.measuredEvidence;
  const steps = playbackSteps(control, perturbed);
  const [index, setIndex] = useState(() => Math.max(0, steps.indexOf(control.activity.find((sample) => sample.nodes[control.provenance.network.outputNodeId] === control.outputPeakActivity)?.step ?? steps[0])));
  const [playing, setPlaying] = useState(false);
  const step = steps[index];
  const maxStep = Math.max(1, steps.at(-1) ?? 1);
  const maxValue = Math.max(1, ...[control, perturbed].flatMap((trial) => trial.activity.flatMap((sample) => Object.values(sample.nodes))));
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % steps.length), 1100);
    return () => window.clearInterval(timer);
  }, [playing, steps.length]);
  const matched = Object.values(provenance.matchedConditions).every(Boolean);
  return <div className={`compare-center${guided ? " demo-comparison" : ""}`}>
      <div className="compare-title"><h2>Silencing <span className="intervention-target">{result.spec.perturbation.targetNodeId}</span></h2><Badge tone={matched ? "green" : "red"}>{matched ? "✓ MATCHED CONDITIONS" : "CONDITION MISMATCH"}</Badge></div>
      {!guided && <p className="compare-question"><span>HYPOTHESIS</span>{result.spec.hypothesis}</p>}
      <ExperimentPlayback steps={steps} index={index} playing={playing} onToggle={() => setPlaying((value) => !value)} onSeek={(next) => { setPlaying(false); setIndex(next); }} />
      <div className="condition-grid"><ConditionPanel trial={control} step={step} maxStep={maxStep} maxValue={maxValue} /><ConditionPanel trial={perturbed} step={step} maxStep={maxStep} maxValue={maxValue} /></div>
      {guided ? <details className="demo-measurement-details"><summary>Inspect measured deltas & signal timeline</summary><ObservationMetrics result={result} compact /><PropagationTimeline result={result} step={step} /></details> : <><div className="measured-heading"><h2>Measured deltas</h2><span>PERTURBED − CONTROL</span></div><ObservationMetrics result={result} compact /><PropagationTimeline result={result} step={step} /></>}
      <div className="evidence-link-bar"><span>{matched ? "✓ Engine measurements · matched condition provenance" : "Condition mismatch · inspect provenance"}</span><button type="button" className="text-button" onClick={onEvidence}>Inspect evidence ↗</button></div>
  </div>;
}


/** Advanced comparison remains available; the guided page composes the same measurements. */
export function CompareDashboard({ result, onNext, onFullAnalysis, onEvidence, onExplain, explainDisabled }: { result: WebExperimentResult; onNext: (question: string) => void; onFullAnalysis: () => void; onEvidence: () => void; onExplain?: () => void; explainDisabled?: boolean }) {
  return <div className="experiment-result"><ResultStory result={result} /><div className="compare-layout"><ComparisonMeasurements result={result} onEvidence={onEvidence} /><AiScientistRail result={result} onNext={onNext} onFullAnalysis={onFullAnalysis} onExplain={onExplain} explainDisabled={explainDisabled} /></div></div>;
}
