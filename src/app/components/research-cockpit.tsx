import type { ReactNode } from "react";
import type { ExecutionMode, GuidedDesign, MeasuredExperimentResult } from "@/lib/web/contracts";
import type { PerceptionRecord } from "@/lib/perception/contracts";
import { resultSummary } from "@/lib/web/result-summary";
import { crossing } from "@/lib/web/dashboard";
import { nodeLabel, signalValue } from "@/lib/web/display-labels";
import { MetaRequestLabel } from "./meta-request-label";
import { DesignReview } from "./guided-workflow";
import { ExperimentTrust } from "./experiment-trust";

function excerpt(value: string, length = 130) {
  if (value.length <= length) return value;
  return `${value.slice(0, value.lastIndexOf(" ", length) > 0 ? value.lastIndexOf(" ", length) : length)}…`;
}

/** The scientist is a presentation of the existing explicit design/interpret actions. */
export function CockpitScientist({ design, result, mode, pending, question, strength, perception, perceptionMode, onRun, onExplain, onNext, onAnalysis }: {
  design?: GuidedDesign; result: MeasuredExperimentResult | null; mode: ExecutionMode | null;
  pending: string; question: string; strength: number; perception?: PerceptionRecord; perceptionMode: boolean;
  onRun: () => void; onExplain: () => void; onNext: (question: string) => void; onAnalysis: () => void;
}) {
  const busy = Boolean(pending), live = mode === "META LIVE", analysis = result?.analysis;
  const unaccepted = perceptionMode && perception && perception.id !== design?.perceptionInput?.id;
  let action: ReactNode;
  if (perceptionMode && (!perception || unaccepted)) {
    action = <p className="scientist-direction">{perception ? "Use the measured stimulus in the world panel to prepare this test." : "Choose a short clip in the world panel, then analyze with SAM 3.1."}</p>;
  } else if (!design) {
    action = <><button className="primary-button" type="submit" form="cockpit-question-form" disabled={busy || !question.trim() || !mode} aria-busy={pending === "design"}><MetaRequestLabel pending={pending === "design"} task="design">Design with Meta ↗</MetaRequestLabel></button><small>Explicit request · review before running</small></>;
  } else if (!result) {
    action = <div className="embodied-run-action"><button className="primary-button" type="button" disabled={busy} aria-busy={pending === "run"} onClick={onRun}>{pending === "run" ? "Running matched conditions…" : "Approve & Run Experiment"}</button><small>Same input · only the declared pathway changes</small></div>;
  } else if (!analysis) {
    action = <><button className="primary-button" type="button" disabled={busy || !mode} aria-busy={pending === "interpret"} onClick={onExplain}><MetaRequestLabel pending={pending === "interpret"} task="explain">Explain with Meta ↗</MetaRequestLabel></button><small>AI interprets; the engine measures</small></>;
  } else {
    action = <><button type="button" className="primary-button" disabled={busy} onClick={() => onNext(analysis.nextExperiment.researchQuestion)}>Use as next test ↗</button><small>Proposal · requires a new design and your approval</small></>;
  }
  return <aside className="cockpit-scientist" id="demo-understand" aria-label="Meta AI Scientist" aria-busy={pending === "design" || pending === "interpret"}>
    <header><span className="scientist-glyph" aria-hidden="true">✧</span><div><h2>META AI SCIENTIST</h2><p>{live ? "MUSE / ON DEMAND" : mode ? "OFFLINE / FIXED TEMPLATE" : "CONFIGURATION NEEDED"}</p></div></header>
    <div className="scientist-sections">
      {perception && !analysis && <section className="scientist-perception"><span className="cockpit-kicker">PERCEPTION / {perception.mode === "SAM LIVE" ? "META SAM 3.1" : "OFFLINE GEOMETRY"}</span><p>{perception.mode === "SAM LIVE" ? "SAM tracked the object." : "Fixture track retained; no live detection."} CausalFly derived a <strong className="cyan-text">{perception.measurement.amplitude.toFixed(3)}</strong> stimulus.</p></section>}
      {!result && <section id="demo-design"><span className="cockpit-kicker">EXPERIMENT DESIGN</span><h3>{design ? `Silence ${nodeLabel(design.spec.perturbation.targetNodeId)}.` : "One question. One controlled test."}</h3><p>{design ? "Matched input. Intact control vs one silenced pathway." : "Meta proposes the intervention. You approve. CausalFly measures."}</p>{design && <><span className="scientist-validation">✓ DESIGN CHECKED</span><details className="cockpit-design-details"><summary>Review Meta design & settings</summary><DesignReview design={design} stimulusAmplitude={strength} busy={busy} onRun={onRun} /></details></>}</section>}
      {result && <section className="scientist-meaning"><span className="cockpit-kicker">{analysis ? live ? "INTERPRETED WITH META MUSE" : "OFFLINE AI TEMPLATE" : "ENGINE MEASUREMENT"}</span><h3>{analysis ? "Why it matters" : "What changed?"}</h3><p>{analysis ? excerpt(analysis.interpretation) : resultSummary(result).headline}</p><small>{analysis ? live ? "Meta interpretation · not a measurement" : "Offline template · not a live Meta response" : "Measured facts · this synthetic test only"}</small></section>}
      {analysis && <section className="scientist-next next-experiment"><span className="cockpit-kicker">{live ? "NEXT TEST PROPOSED BY META MUSE" : "OFFLINE NEXT-TEST TEMPLATE"}</span><h3>What should we test next?</h3><p className="next-question">{analysis.nextExperiment.researchQuestion}</p></section>}
      {!design && !perception && <div className="scientist-loop" aria-label="Experiment roles"><div><span>01</span><p><strong>Meta designs</strong><small>A testable intervention</small></p></div><div><span>02</span><p><strong>Engine measures</strong><small>Matched control + intervention</small></p></div><div><span>03</span><p><strong>Meta interprets</strong><small>Evidence → next question</small></p></div></div>}
    </div>
    <div className="scientist-action">{action}</div>
    {analysis && <button type="button" className="text-button scientist-technical" onClick={onAnalysis}>VIEW TECHNICAL ANALYSIS ↗</button>}
    <p className="scientist-provider-note">{live ? "No model calls on navigation." : mode ? "OFFLINE DEMO · Fixed template · no live Meta request." : "Configure Meta on the server to enable design and interpretation."}</p>
  </aside>;
}

/** Display arithmetic and recorded validation only; never a confidence score. */
export function CockpitReadouts({ result, design, perceived }: { result: MeasuredExperimentResult | null; design?: GuidedDesign; perceived: boolean }) {
  const summary = result && resultSummary(result);
  const evidence = result?.measuredEvidence, diagnostics = result?.diagnostics ?? design?.diagnostics;
  const validation = diagnostics?.manifest.validation;
  const matched = validation?.sameInputs && validation.sameParameters && validation.interventionApplied;
  const run = result?.run_id ?? design?.run_id ?? diagnostics?.manifest.run_id;
  const timeline = [
    ["PERCEIVE", perceived, perceived ? "Retained track" : "Synthetic input"],
    ["DESIGN", Boolean(design), "Validated design"],
    ["RUN", Boolean(result), "Engine measurement"],
    ["INTERPRET", Boolean(result?.analysis), "AI interpretation"],
  ] as const;
  return <section className="cockpit-analytics" aria-label="Experiment measurements" id="demo-result" data-result={Boolean(result)}>
    <header className="cockpit-result-heading"><div><span className="cockpit-kicker">{result ? "MEASURED BY CAUSALFLY / CONTROL → INTERVENTION" : "MEASUREMENT DECK / AWAITING APPROVAL"}</span><h2>{summary ? summary.signal : "Change one pathway. See what changes."}</h2></div><span className={result ? "instrument-status complete" : "instrument-status"}>{result ? "✓ MATCHED RUNS COMPLETE" : "○ NO MEASUREMENT YET"}</span></header>
    <div className="cockpit-readouts">
      <article><h3>SIGNAL</h3><div className="readout-pair"><strong title={evidence?.control.outputPeakActivity.toString()}>{signalValue(evidence?.control.outputPeakActivity)}</strong><span>→</span><strong title={evidence?.perturbed.outputPeakActivity.toString()}>{signalValue(evidence?.perturbed.outputPeakActivity)}</strong></div><small>Peak output · normalized · rounded display</small>{evidence && <div className="readout-bars" aria-hidden="true">{[evidence.control, evidence.perturbed].map((trial, i) => <i key={i} style={{ width: `${trial.outputPeakActivity / Math.max(evidence.control.outputPeakActivity, evidence.perturbed.outputPeakActivity, 1) * 100}%` }} />)}</div>}</article>
      <article><h3>RESPONSE</h3><div className="readout-response"><strong>{evidence ? crossing(evidence.control.outputThresholdCrossingStep) : "—"}</strong><span>→</span><strong>{evidence ? crossing(evidence.perturbed.outputThresholdCrossingStep) : "—"}</strong></div><small>{summary?.response ?? "First output-threshold crossing"}</small><small>Simulation steps · not biological time</small></article>
      <article><h3>OUTCOME</h3><strong className="readout-outcome">{evidence ? evidence.perturbed.outcome === "THRESHOLD_REACHED" ? evidence.control.outcome === "THRESHOLD_REACHED" ? "Threshold still reached" : "Threshold reached" : "Threshold not reached" : "Awaiting test"}</strong><small>{evidence ? evidence.deltas.outcomeChanged ? "Changed under intervention" : "Unchanged" : "Control + intervention required"}</small></article>
      <article className="readout-trust"><h3>EXPERIMENT TRUST</h3><p className={matched ? "validated-text" : ""}>{result ? matched ? "✓ Matched conditions" : "◇ Inspect conditions" : "○ Awaiting matched runs"}</p><p className={validation?.measurementsImmutable ? "validated-text" : ""}>{result ? validation?.measurementsImmutable ? "✓ Engine measured" : "◇ Engine evidence available" : "○ Awaiting engine measurement"}</p><small>◇ {result?.analysis ? "AI interpretation retained" : "AI interpretation not requested"}</small><small>⚠ REAL-FLY VALIDATION — Not established</small></article>
    </div>
    <footer className="cockpit-recorder"><div className="cockpit-run"><span>FLIGHT RECORDER</span><code title={run}>{run ?? "Run ID assigned on explicit request"}</code></div><ol aria-label="Run timeline">{timeline.map(([label, complete, detail]) => <li key={label} data-complete={complete}><span>{complete ? "✓" : "○"}</span><strong>{label}</strong><small>{complete ? detail : label === "PERCEIVE" && !design?.perceptionInput ? "Optional" : "Pending"}</small></li>)}</ol></footer>
    {result?.diagnostics && <details className="cockpit-trust-details"><summary>VIEW PROVENANCE / VALIDATION & DIAGNOSTICS</summary><ExperimentTrust diagnostics={result.diagnostics} /></details>}
  </section>;
}
