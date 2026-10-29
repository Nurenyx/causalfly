import { useRef, useState } from "react";
import type { ExecutionMode, GuidedDesign, MeasuredExperimentResult } from "@/lib/web/contracts";
import { resultSummary } from "@/lib/web/result-summary";
import { DesignReview } from "./guided-workflow";
import { EmbodiedExperiment } from "./embodied-experiment";
import { ComparisonMeasurements } from "./compare-dashboard";
import { ResultStory } from "./result-story";
import { Badge } from "./workspace-ui";
import { MetaRequestLabel } from "./meta-request-label";
import { ScientistView } from "./ai-scientist";
import { EvidenceView } from "./evidence-view";

interface Props {
  question: string;
  design?: GuidedDesign;
  result: MeasuredExperimentResult | null;
  pending: string;
  mode: ExecutionMode | null;
  onQuestion: (question: string) => void;
  onDemo: () => void;
  onDesign: () => void;
  onRun: (strength?: number) => void;
  onExplain: () => void;
  onNext: (question: string) => void;
  onCompare: () => void;
  onConnectome: () => void;
}

/** Presentation over the existing reducer, approval gate, measurements and Meta workflow. */
export function GuidedExperiment(props: Props) {
  const { question, design, result, pending, mode } = props;
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const evidenceDetails = useRef<HTMLDetailsElement>(null);
  const [details, setDetails] = useState({ comparison: false, analysis: false, evidence: false });
  const [inputDraft, setInputDraft] = useState<{ designId: string; value: number } | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const busy = Boolean(pending);
  const currentDesign = design?.researchQuestion.trim() === question.trim() ? design : undefined;
  const currentResult = currentDesign ? result : null;
  const strength = inputDraft && inputDraft.designId === currentDesign?.id ? inputDraft.value : currentDesign?.spec.stimulus.amplitude ?? 1;
  const active = pending === "design" ? "design" : pending === "run" ? "test" : pending === "interpret" || currentResult?.analysis ? "understand" : currentResult ? "test" : currentDesign ? "design" : "ask";
  const progress = [
    { id: "ask", label: "ASK", detail: "Choose a what-if question", complete: Boolean(currentDesign), ready: true, target: "demo-question" },
    { id: "design", label: "META DESIGNS", detail: "Review → approve", complete: Boolean(currentDesign), ready: Boolean(question.trim()), target: "demo-design" },
    { id: "test", label: "WATCH + MEASURE", detail: "Control → intervention", complete: Boolean(currentResult), ready: Boolean(currentDesign), target: "demo-watch" },
    { id: "understand", label: "META EXPLAINS", detail: "Explain → try next", complete: Boolean(currentResult?.analysis), ready: Boolean(currentResult), target: "demo-understand" },
  ];
  function focusQuestion() {
    props.onQuestion("");
    requestAnimationFrame(() => questionInput.current?.focus());
  }
  function approveRun() { setAutoPlay(true); props.onRun(strength); }
  function showEvidence() {
    if (evidenceDetails.current) evidenceDetails.current.open = true;
    requestAnimationFrame(() => evidenceDetails.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }
  return <div className="demo-experiment" data-measured={Boolean(currentResult)}>
    <nav className="demo-progress" aria-label="Guided experiment progress"><ol>{progress.map((stage, i) => <li key={stage.id} data-complete={stage.complete} data-active={active === stage.id}><button type="button" aria-current={active === stage.id ? "step" : undefined} onClick={() => document.getElementById(stage.target)?.scrollIntoView({ block: "start", behavior: "smooth" })}><span>{stage.complete ? "✓" : `0${i + 1}`}</span><div><strong>{stage.label}</strong><small>{stage.complete ? "COMPLETE" : active === stage.id ? "ACTIVE" : stage.ready ? "READY" : "LOCKED"}</small><p>{stage.detail}</p></div></button></li>)}</ol></nav>

    {!currentDesign ? <section className="demo-question hero-question" id="demo-question" aria-label="Ask a research question"><form onSubmit={event => { event.preventDefault(); if (!busy) props.onDesign(); }}><div><span className="eyebrow amber-text">META AI — EXPERIMENT DESIGN</span><label htmlFor="research-question">Ask what changes a nervous system.</label><textarea ref={questionInput} id="research-question" disabled={busy} required rows={2} maxLength={8000} value={question} onChange={event => props.onQuestion(event.target.value)} aria-describedby="demo-question-help" /></div><div className="hero-question-action"><button className="primary-button" type="submit" disabled={busy || !question.trim() || !mode} aria-busy={pending === "design"}><MetaRequestLabel pending={pending === "design"} task="design">Design with Meta ↗</MetaRequestLabel></button><p id="demo-question-help">Meta AI turns your question into a controlled test.</p><button className="text-button" type="button" disabled={busy} onClick={focusQuestion}>Ask Your Own Question</button></div></form>{!mode && <small>Configure Meta on the server to enable experiment design.</small>}{!question.trim() && <small>Enter a question to enable design.</small>}</section> : <div className="demo-current-question"><div><span className="eyebrow">YOUR QUESTION</span><p>{currentDesign.researchQuestion}</p></div><button className="text-button" type="button" disabled={busy} onClick={focusQuestion}>Ask another question ↗</button></div>}

    {mode === "FAKE META CLIENT" && <p className="demo-mode-note">OFFLINE DEMO · Fixed design & explanation template · no live Meta request.</p>}

    {currentDesign && <div id="demo-design" className="embodied-design-strip"><span className="amber-text">{currentDesign.mode === "META LIVE" ? "DESIGNED WITH META MUSE" : "OFFLINE DESIGN TEMPLATE"}</span><span className="cyan-text">CONTROL / Network unchanged</span><span aria-hidden="true">vs</span><span className="magenta-text">INTERVENTION / Silence {currentDesign.spec.perturbation.targetNodeId.replaceAll("_", " ")}</span>{!currentResult && <details><summary>Review Meta design & settings</summary><DesignReview design={currentDesign} stimulusAmplitude={strength} busy={busy} onRun={approveRun} /></details>}</div>}

    <EmbodiedExperiment key={`${currentDesign?.id ?? "preview"}-${currentResult ? "recorded" : "draft"}`} result={currentResult} design={currentDesign} busy={busy} strength={strength} autoPlay={autoPlay} onStrength={value => { if (currentDesign) setInputDraft({ designId: currentDesign.id, value }); }} onRun={approveRun} />

    {currentResult && <div className="demo-measured-stage">
      <div id="demo-result"><ResultStory result={currentResult} emphasis /></div>
      <GuidedUnderstanding result={currentResult} busy={busy} explaining={pending === "interpret"} enabled={Boolean(mode)} onExplain={props.onExplain} onNext={props.onNext} />
      <div className="demo-advanced" aria-label="Advanced experiment details">
        <details onToggle={event => { const open = event.currentTarget.open; setDetails(previous => ({ ...previous, comparison: open })); }}><summary>View detailed comparison</summary>{details.comparison && <ComparisonMeasurements result={currentResult} onEvidence={showEvidence} />}</details>
        <details onToggle={event => { const open = event.currentTarget.open; setDetails(previous => ({ ...previous, analysis: open })); }}><summary>View full analysis</summary>{details.analysis && <ScientistView result={currentResult} onNext={props.onNext} />}</details>
        <details ref={evidenceDetails} onToggle={event => { const open = event.currentTarget.open; setDetails(previous => ({ ...previous, evidence: open })); }}><summary>Inspect provenance & raw evidence</summary>{details.evidence && <EvidenceView result={currentResult} />}</details>
      </div>
    </div>}
    {!currentDesign && result && <div className="demo-retained-result"><Badge tone="muted">PREVIOUS TEST RETAINED</Badge><p>The previous result remains available while you prepare a new question.</p><button type="button" className="text-button" disabled={busy} onClick={props.onCompare}>View previous comparison →</button></div>}
    <button className="text-button demo-xr-link" type="button" disabled={busy} onClick={props.onConnectome}>Explore a real connectome simulation →</button>
  </div>;
}

function GuidedUnderstanding({ result, busy, explaining, enabled, onExplain, onNext }: {
  result: MeasuredExperimentResult; busy: boolean; explaining: boolean; enabled: boolean; onExplain: () => void; onNext: (question: string) => void;
}) {
  const analysis = result.analysis;
  const measured = resultSummary(result);
  const explanation = analysis?.interpretation;
  const excerpt = explanation && explanation.length > 160 ? `${explanation.slice(0, Math.max(0, explanation.lastIndexOf(" ", 160)) || 160)}…` : explanation;
  const live = result.mode === "META LIVE";
  return <section className="demo-understanding" id="demo-understand" aria-label="Understand the evidence"><header><div><span className="eyebrow amber-text">META MUSE / EVIDENCE INTERPRETATION</span><h2>{analysis ? "Evidence → understanding → next test." : "What does this change mean?"}</h2></div>{!live && analysis && <Badge tone="amber">OFFLINE AI TEMPLATE</Badge>}</header>{!analysis ? <div className="demo-explain-action"><p>Ask Meta to interpret the measurements and propose the next test.</p><button className="primary-button" type="button" disabled={busy || !enabled} aria-busy={explaining} onClick={onExplain}><MetaRequestLabel pending={explaining} task="explain">Explain with Meta ↗</MetaRequestLabel></button><small>Explicit request only · AI interprets; the engine measures.</small>{!enabled && <small>Configure Meta on the server to request an explanation.</small>}</div> : <div className="demo-explanation-grid"><section><span className="demo-explanation-index">01 / MEASURED BY CAUSALFLY</span><h3>What changed?</h3><p>{measured.signal}. {measured.response}.</p><small>Measured facts · this synthetic test only</small></section><section><span className="demo-explanation-index">02 / {live ? "INTERPRETED WITH META MUSE" : "OFFLINE INTERPRETATION TEMPLATE"}</span><h3>Why it matters</h3><p>{excerpt}</p>{explanation !== excerpt && <details><summary>Read the complete interpretation</summary><p>{explanation}</p></details>}<details className="demo-limits"><summary>Limitations & alternative explanations</summary><ul>{[...analysis.limitations, ...analysis.confounders].map((item, i) => <li key={i}>{item}</li>)}</ul></details><small>{live ? "Meta interpretation · not a measurement" : "Offline template · not a live Meta response"}</small></section><section className="demo-next-experiment next-experiment"><span className="demo-explanation-index">03 / {live ? "NEXT TEST PROPOSED BY META MUSE" : "OFFLINE NEXT-TEST TEMPLATE"}</span><h3>What should we test next?</h3><p className="next-question">{analysis.nextExperiment.researchQuestion}</p><details><summary>Why this test?</summary><p>{analysis.nextExperiment.rationale}</p></details><small>Proposal · requires a new design and your approval</small><button type="button" className="secondary-button" disabled={busy} onClick={() => onNext(analysis.nextExperiment.researchQuestion)}>Use as Next Question ↗</button></section></div>}</section>;
}
