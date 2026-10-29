import { useRef } from "react";
import type { ExecutionMode, GuidedDesign, MeasuredExperimentResult } from "@/lib/web/contracts";
import { resultSummary } from "@/lib/web/result-summary";
import { DesignReview } from "./guided-workflow";
import { FixtureTopology } from "./observatory-preview";
import { ComparisonMeasurements } from "./compare-dashboard";
import { ResultStory } from "./result-story";
import { Badge } from "./workspace-ui";

interface Props {
  question: string;
  design?: GuidedDesign;
  result: MeasuredExperimentResult | null;
  pending: string;
  mode: ExecutionMode | null;
  onQuestion: (question: string) => void;
  onDemo: () => void;
  onDesign: () => void;
  onRun: () => void;
  onExplain: () => void;
  onNext: (question: string) => void;
  onCompare: () => void;
  onAnalysis: () => void;
  onEvidence: () => void;
  onConnectome: () => void;
}

/** Presentation over the existing reducer, approval gate, measurements and Meta workflow. */
export function GuidedExperiment(props: Props) {
  const { question, design, result, pending, mode } = props;
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const busy = Boolean(pending);
  const currentDesign = design?.researchQuestion.trim() === question.trim() ? design : undefined;
  const currentResult = currentDesign ? result : null;
  const active = pending === "design" ? "design" : pending === "run" ? "test" : pending === "interpret" || currentResult?.analysis ? "understand" : currentResult ? "test" : currentDesign ? "design" : "ask";
  const progress = [
    { id: "ask", label: "ASK", detail: "Choose a what-if question", complete: Boolean(currentDesign), ready: true, target: "demo-question" },
    { id: "design", label: "DESIGN", detail: "Meta proposes. You approve.", complete: Boolean(currentDesign), ready: Boolean(question.trim()), target: "demo-design" },
    { id: "test", label: "TEST", detail: "Measure before and after", complete: Boolean(currentResult), ready: Boolean(currentDesign), target: "demo-result" },
    { id: "understand", label: "UNDERSTAND", detail: "Explain. Choose the next test.", complete: Boolean(currentResult?.analysis), ready: Boolean(currentResult), target: "demo-understand" },
  ];
  function focusQuestion() {
    props.onQuestion("");
    requestAnimationFrame(() => questionInput.current?.focus());
  }
  return <div className="demo-experiment">
    <nav className="demo-progress" aria-label="Guided experiment progress"><ol>{progress.map((stage, i) => <li key={stage.id} data-complete={stage.complete} data-active={active === stage.id}><button type="button" aria-current={active === stage.id ? "step" : undefined} onClick={() => document.getElementById(stage.target)?.scrollIntoView({ block: "start", behavior: "smooth" })}><span>{stage.complete ? "✓" : `0${i + 1}`}</span><div><strong>{stage.label}</strong><small>{stage.complete ? "COMPLETE" : active === stage.id ? "ACTIVE" : stage.ready ? "READY" : "LOCKED"}</small><p>{stage.detail}</p></div></button></li>)}</ol></nav>

    {!currentDesign && <section className="demo-hero" aria-labelledby="demo-title"><div className="demo-hero-copy"><span className="eyebrow cyan-text">ASK → TEST → UNDERSTAND</span><h1 id="demo-title">Discover what changes<br /><em>a neural system.</em></h1><p>Ask a question. CausalFly designs a controlled experiment, measures what changes, and uses Meta AI to explain the evidence.</p><div className="demo-actions"><button className="primary-button" type="button" disabled={busy || !mode} onClick={props.onDemo}>{pending === "design" ? "Meta is designing…" : "Run Demo Experiment"}<span aria-hidden="true">↗</span></button><button className="secondary-button" type="button" disabled={busy} onClick={focusQuestion}>Ask Your Own Question</button></div><small>Starts Meta design. You approve the experiment before it runs.</small><button className="text-button demo-xr-link" type="button" disabled={busy} onClick={props.onConnectome}>Explore a real connectome simulation →</button></div><div className="demo-hero-network"><Badge tone="cyan">THE TEST NETWORK</Badge><FixtureTopology /><p>Two routes carry a signal. What happens when one part is silenced?</p></div></section>}

    {!currentDesign ? <section className="demo-question" id="demo-question" aria-label="Ask a research question"><form onSubmit={event => { event.preventDefault(); props.onDesign(); }}><label htmlFor="research-question">What would you like to find out?</label><textarea ref={questionInput} id="research-question" disabled={busy} required rows={2} maxLength={8000} value={question} onChange={event => props.onQuestion(event.target.value)} aria-describedby="demo-question-help" /><div className="demo-question-footer"><p id="demo-question-help">Try the suggested question or write your own.</p><button className="primary-button" type="submit" disabled={busy || !question.trim() || !mode}>{pending === "design" ? "Designing with Meta…" : "Design with Meta"} ↗</button></div></form>{!mode && <small>Configure Meta on the server to enable experiment design.</small>}{!question.trim() && <small>Enter a question to enable design.</small>}</section> : <div className="demo-current-question"><div><span className="eyebrow">YOUR QUESTION</span><p>{currentDesign.researchQuestion}</p></div><button className="text-button" type="button" disabled={busy} onClick={focusQuestion}>Ask another question ↗</button></div>}

    {mode === "FAKE META CLIENT" && <p className="demo-mode-note">OFFLINE DEMO · Fixed validated test and template explanation. Arbitrary questions do not change the fake designer’s proposal.</p>}

    {pending && <div className="demo-request" role="status" aria-live="polite"><span className="spinner" /><div><strong>{pending === "design" ? "Meta is designing your test" : pending === "run" ? "Running control + intervention" : "Meta is explaining the measured evidence"}</strong><p>{pending === "run" ? "The deterministic engine measures both matched conditions." : "Explicit AI request in progress. Measurements remain separate."}</p></div></div>}

    {currentDesign && !currentResult && <div id="demo-design"><DesignReview design={currentDesign} busy={busy} onRun={props.onRun} /><div className="demo-design-network"><FixtureTopology /><p>Declared synthetic topology · design preview · no measured activity yet.</p></div></div>}

    {currentResult && <>
      <div id="demo-result"><ResultStory result={currentResult} emphasis /></div>
      <GuidedUnderstanding result={currentResult} busy={busy} enabled={Boolean(mode)} onExplain={props.onExplain} onNext={props.onNext} onAnalysis={props.onAnalysis} />
      <section className="demo-neural-evidence" aria-labelledby="demo-evidence-heading"><div className="demo-section-heading"><div><span className="eyebrow cyan-text">MEASURED BY CAUSALFLY</span><h2 id="demo-evidence-heading">See how the signal moves through both tests.</h2><p>Replay the recorded activity in both conditions. Every value comes from the engine.</p></div><button type="button" className="text-button" disabled={busy} onClick={props.onCompare}>View detailed comparison →</button></div><ComparisonMeasurements key={currentDesign?.id ?? currentResult.spec.id} result={currentResult} guided onEvidence={props.onEvidence} /></section>
      <div className="demo-detail-links"><button type="button" disabled={busy} onClick={props.onCompare}>View detailed comparison →</button><button type="button" disabled={busy} onClick={props.onAnalysis}>View full AI analysis →</button><button type="button" disabled={busy} onClick={props.onEvidence}>Inspect raw evidence →</button></div>
    </>}
    {!currentDesign && result && <div className="demo-retained-result"><Badge tone="muted">PREVIOUS TEST RETAINED</Badge><p>The previous result remains available while you prepare a new question.</p><button type="button" className="text-button" disabled={busy} onClick={props.onCompare}>View previous comparison →</button></div>}
  </div>;
}

function GuidedUnderstanding({ result, busy, enabled, onExplain, onNext, onAnalysis }: {
  result: MeasuredExperimentResult; busy: boolean; enabled: boolean; onExplain: () => void; onNext: (question: string) => void; onAnalysis: () => void;
}) {
  const analysis = result.analysis;
  const measured = resultSummary(result);
  const explanation = analysis?.interpretation;
  const excerpt = explanation && explanation.length > 420 ? `${explanation.slice(0, explanation.lastIndexOf(" ", 420))}…` : explanation;
  return <section className="demo-understanding" id="demo-understand" aria-label="Understand with CausalFly AI"><header><div><span className="eyebrow amber-text">CAUSALFLY AI · POWERED BY META</span><h2>{analysis ? "From a measured change to the next question." : "You’ve seen the change. What does it mean?"}</h2></div><Badge tone="amber">{analysis ? result.mode === "META LIVE" ? "INTERPRETED BY META AI" : "OFFLINE AI TEMPLATE" : "EXPLICIT REQUEST ONLY"}</Badge></header>{!analysis ? <div className="demo-explain-action"><p>Meta can explain this evidence, identify what it cannot tell us, and propose the next experiment.</p><button className="primary-button" type="button" disabled={busy || !enabled} onClick={onExplain}>{busy ? "Request in progress…" : "Explain with Meta"} ↗</button>{!enabled && <small>Configure Meta on the server to request an explanation.</small>}</div> : <div className="demo-explanation-grid"><section><span className="demo-explanation-index">01</span><h3>What changed?</h3><p>{measured.signal}. {measured.response}.</p><small>Measured by CausalFly · this synthetic test only</small></section><section><span className="demo-explanation-index">02</span><h3>Why it matters</h3><p>{excerpt}</p>{explanation !== excerpt && <details><summary>Read the complete interpretation</summary><p>{explanation}</p></details>}<details className="demo-limits"><summary>Limits & other possible explanations</summary><ul>{[...analysis.limitations, ...analysis.confounders].map((item, i) => <li key={i}>{item}</li>)}</ul></details><small>{result.mode === "META LIVE" ? "Interpreted by Meta AI" : "Offline template · not a live Meta response"}</small></section><section className="demo-next-experiment next-experiment"><span className="demo-explanation-index">03</span><h3>Meta proposes the next test</h3><p className="next-question">{analysis.nextExperiment.researchQuestion}</p><p>{analysis.nextExperiment.rationale}</p><small>Proposal · not a measured finding</small><button type="button" className="secondary-button" disabled={busy} onClick={() => onNext(analysis.nextExperiment.researchQuestion)}>Use as Next Question ↗</button></section></div>}{analysis && <button className="text-button" type="button" onClick={onAnalysis}>View full AI analysis →</button>}</section>;
}
