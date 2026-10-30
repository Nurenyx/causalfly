import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ExecutionMode, GuidedDesign, MeasuredExperimentResult } from "@/lib/web/contracts";
import type { PerceptionSession } from "@/lib/web/perception-session";
import type { RunDiagnostics } from "@/lib/web/flight-recorder-types";
import { EmbodiedExperiment } from "./embodied-experiment";
import { ComparisonMeasurements } from "./compare-dashboard";
import { ScientistView } from "./ai-scientist";
import { EvidenceView } from "./evidence-view";
import { PerceptionPanel } from "./perception-panel";
import { CockpitReadouts, CockpitScientist } from "./research-cockpit";

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
  onStimulus?: (perceptionId: string | null, receipt?: string) => void;
  onDesignPerception?: (perceptionId: string, receipt?: string) => void;
  perceptionSession?: PerceptionSession;
  onPerceptionSession?: Dispatch<SetStateAction<PerceptionSession>>;
  onPerceptionFailure?: (message: string, diagnostics?: RunDiagnostics) => void;
  perceptionWorkflowError?: string;
  actionError?: { target: string; detail: string };
  onPerceptionBusy?: (busy: boolean) => void;
  onExplain: () => void;
  onNext: (question: string) => void;
  onCompare: () => void;
  onConnectome: () => void;
}

/** One cockpit over the existing reducer, approval gate, measurements and Meta workflow. */
export function GuidedExperiment(props: Props) {
  const { question, design, result, pending, mode } = props;
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const evidenceDetails = useRef<HTMLDetailsElement>(null);
  const analysisDetails = useRef<HTMLDetailsElement>(null);
  const [details, setDetails] = useState({ comparison: false, analysis: false, evidence: false });
  const [inputDraft, setInputDraft] = useState<{ designId: string; value: number } | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const busy = Boolean(pending);
  const currentDesign = design?.researchQuestion.trim() === question.trim() ? design : undefined;
  const currentResult = currentDesign ? result : null;
  const strength = inputDraft && inputDraft.designId === currentDesign?.id ? inputDraft.value : currentDesign?.spec.stimulus.amplitude ?? 1;
  const realWorld = props.perceptionSession?.source === "perception" || Boolean(currentDesign?.perceptionInput);
  const perception = props.perceptionSession?.analysis?.perception ?? currentDesign?.perceptionInput;
  const perceived = Boolean(perception);
  const active = pending === "perception" ? "perceive" : pending === "design" ? "design" : pending === "run" ? "run" : pending === "interpret" || currentResult ? "understand" : currentDesign ? "run" : realWorld ? perceived ? "design" : "perceive" : "ask";
  const progress = [
    { id: "ask", label: "ASK", complete: Boolean(currentDesign), target: "demo-question", detail: "Research question" },
    { id: "perceive", label: "PERCEIVE", complete: realWorld && perceived, target: "perception-source", detail: realWorld ? "Video → stimulus" : "Optional / synthetic input" },
    { id: "design", label: "DESIGN", complete: Boolean(currentDesign), target: "demo-understand", detail: "Meta proposes" },
    { id: "run", label: "RUN", complete: Boolean(currentResult), target: "demo-watch", detail: "Engine measures" },
    { id: "understand", label: "UNDERSTAND", complete: Boolean(currentResult?.analysis), target: "demo-understand", detail: "Meta interprets" },
  ];
  function focusQuestion() {
    props.onQuestion("");
    requestAnimationFrame(() => questionInput.current?.focus());
  }
  function approveRun() { setAutoPlay(true); props.onRun(strength); }
  function showDisclosure(ref: { current: HTMLDetailsElement | null }) {
    if (ref.current) ref.current.open = true;
    requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }
  const scientist = <CockpitScientist design={currentDesign} result={currentResult} mode={mode} pending={pending} question={question} strength={strength} perception={realWorld ? perception : undefined} perceptionMode={realWorld} onRun={approveRun} onExplain={props.onExplain} onNext={props.onNext} onAnalysis={() => showDisclosure(analysisDetails)} />;
  const source = <PerceptionPanel compact accepted={currentDesign?.perceptionInput} hasDesign={Boolean(currentDesign)} busy={busy} accepting={pending === "stimulus"} designing={pending === "design"} measured={Boolean(currentResult)} session={props.perceptionSession} onSession={props.onPerceptionSession} onFailure={props.onPerceptionFailure} workflowError={props.perceptionWorkflowError} onDesign={props.onDesignPerception} onRun={() => { const control = document.querySelector<HTMLButtonElement>(".scientist-action .embodied-run-action button"); control?.focus(); }} onBusy={props.onPerceptionBusy ?? (() => {})} onUse={props.onStimulus ?? (() => {})} />;
  return <div className="research-cockpit" data-measured={Boolean(currentResult)} data-perception-mode={realWorld} data-stage={active}>
    <section className="cockpit-command" id="demo-question" aria-label="Research question">
      <form id="cockpit-question-form" onSubmit={event => { event.preventDefault(); if (!busy && !currentDesign) props.onDesign(); }}><label className="cockpit-kicker" htmlFor="research-question">{currentDesign ? "QUESTION UNDER TEST" : "ASK WHAT CHANGES A NERVOUS SYSTEM"}</label><textarea ref={questionInput} id="research-question" aria-label="Ask what changes a nervous system." disabled={busy} required rows={1} maxLength={8000} value={question} onChange={event => props.onQuestion(event.target.value)} /></form>
      <div className="cockpit-command-state"><span className={currentResult ? "validated-text" : "cyan-text"}>{pending ? `${pending.toUpperCase()} / IN PROGRESS` : currentResult ? "MEASUREMENT COMPLETE" : currentDesign ? "DESIGN VALIDATED / AWAITING APPROVAL" : "READY FOR YOUR QUESTION"}</span><button className="text-button" type="button" disabled={busy} onClick={focusQuestion}>{currentDesign ? "Ask another question ↗" : "Ask Your Own Question ↗"}</button></div>
    </section>
    <nav className="cockpit-progress" aria-label="Guided experiment progress"><ol>{progress.map((stage, i) => <li key={stage.id} data-complete={stage.complete} data-active={active === stage.id}><button type="button" aria-current={active === stage.id ? "step" : undefined} onClick={() => { const el = document.getElementById(stage.target); el?.scrollIntoView({ block: "nearest", behavior: "smooth" }); if (stage.id === "ask") questionInput.current?.focus({ preventScroll: true }); }}><span>{stage.complete ? "✓" : `0${i + 1}`}</span><strong>{stage.label}</strong><small>{stage.detail}</small></button></li>)}</ol></nav>
    {props.actionError && ["demo-question", "demo-watch", "demo-understand"].includes(props.actionError.target) && <p className="error-panel" id="experiment-action-error">{props.actionError.detail}</p>}
    <EmbodiedExperiment key={`${currentDesign?.id ?? "preview"}-${currentResult ? "recorded" : "draft"}`} result={currentResult} design={currentDesign} busy={busy} strength={strength} autoPlay={autoPlay} scientist={scientist} source={source} onStrength={value => { if (currentDesign) setInputDraft({ designId: currentDesign.id, value }); }} onRun={approveRun} />
    <CockpitReadouts result={currentResult} design={currentDesign} perceived={realWorld && perceived} />
    {currentResult && <div className="cockpit-advanced" aria-label="Advanced experiment details">
      <details onToggle={event => { const open = event.currentTarget.open; setDetails(previous => ({ ...previous, comparison: open })); }}><summary>View detailed comparison</summary>{details.comparison && <ComparisonMeasurements result={currentResult} onEvidence={() => showDisclosure(evidenceDetails)} />}</details>
      <details ref={analysisDetails} onToggle={event => { const open = event.currentTarget.open; setDetails(previous => ({ ...previous, analysis: open })); }}><summary>VIEW TECHNICAL ANALYSIS</summary>{details.analysis && <ScientistView result={currentResult} onNext={props.onNext} />}</details>
      <details ref={evidenceDetails} onToggle={event => { const open = event.currentTarget.open; setDetails(previous => ({ ...previous, evidence: open })); }}><summary>INSPECT EVIDENCE</summary>{details.evidence && <EvidenceView result={currentResult} />}</details>
    </div>}
    {!currentDesign && result && <div className="cockpit-retained"><span>PREVIOUS TEST RETAINED</span><button type="button" className="text-button" disabled={busy} onClick={props.onCompare}>View previous comparison →</button></div>}
    <div className="cockpit-boundary"><p>CONTROLLED MODEL · Synthetic engineering fixture. REAL-FLY VALIDATION — Not established.</p><button className="text-button" type="button" disabled={busy} onClick={props.onConnectome}>Connectome observatory / simulated dynamics ↗</button></div>
  </div>;
}
