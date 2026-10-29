"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { dataSources, type DataSourceKind, type FruitFlyEvidence, type FruitFlySnapshot } from "@/lib/sources/contracts";
import type { ExecutionMode, MeasuredExperimentResult as WebExperimentResult } from "@/lib/web/contracts";
import type { Workspace } from "@/lib/web/dashboard";
import type { ObservationalMetaState } from "@/lib/web/observational-contracts";
import { assistantActions, captureAssistantQuestion, observationalBoundary, syntheticAssistantAnswer, workspaceLabels, type AssistantAction, type AssistantAnswer, type AssistantQuestion } from "@/lib/web/assistant";
import { observationalRequestKey } from "@/lib/web/observational-action";
import { observationalAnalysis } from "@/lib/web/observational-analysis";
import { Badge } from "./workspace-ui";
import { MetaRequestLabel } from "./meta-request-label";

interface Props {
  investigationQuestion?: string;
  pendingTask?: string;
  workflowContext?: { stage: string; identity: string; next: string; onNext: () => void };
  source: DataSourceKind; workspace: Workspace; snapshot: FruitFlySnapshot; frames: readonly FruitFlyEvidence[]; now: number | null;
  result: WebExperimentResult | null; mode: ExecutionMode | null; meta: ObservationalMetaState; busy: boolean;
  onAnalyze: (question: string, snapshot: FruitFlySnapshot, frames: readonly FruitFlyEvidence[]) => Promise<void>;
  onNavigate: (workspace: Workspace) => void; onSynthetic: () => void; onDesign: (question: string) => void;
  onFullAnalysis: () => void;
}

function NetworkMark() {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 16 12 5l8 22 8-11M4 16h24M12 5l8 22" /><circle cx="4" cy="16" r="2.5" /><circle cx="12" cy="5" r="2.5" /><circle cx="20" cy="27" r="2.5" /><circle cx="28" cy="16" r="2.5" /></svg>;
}

export function AssistantLocalAnswer({ answer }: { answer: AssistantAnswer }) {
  return <div className="assistant-answer">
    <div className="assistant-answer-label"><Badge tone="cyan">LOCAL / DETERMINISTIC</Badge><small>Evidence first</small></div>
    <section><h3>WHAT THE EVIDENCE SHOWS</h3><p>{answer.summary}</p>{answer.facts.length > 0 && <ul>{answer.facts.map((fact, i) => <li key={i}>{fact}</li>)}</ul>}</section>
    <section className="assistant-limits"><h3>LIMITATIONS</h3><p>{answer.limitations}</p></section>
    <section><h3>WHAT TO TEST NEXT</h3><p>{answer.next}</p></section>
    <small className="assistant-provenance">{answer.provenance}</small>
  </div>;
}

export function CausalFlyAssistant(props: Props) {
  const { source, workspace, snapshot, frames, now, result, mode, meta, busy, onAnalyze, onNavigate, onSynthetic, onDesign, onFullAnalysis } = props;
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<DataSourceKind, string>>({ FRUITFLY_XR: "", SYNTHETIC_FIXTURE: "" });
  const [fruitFlyAsked, setFruitFlyAsked] = useState<AssistantQuestion | null>(null);
  const [syntheticAsked, setSyntheticAsked] = useState<{ question: string; answer: AssistantAnswer } | null>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const external = source === "FRUITFLY_XR";
  const history = observationalAnalysis(snapshot, frames, now ?? 0).history;
  const retained = external ? `${history.length} retained frame${history.length === 1 ? "" : "s"}` : result ? "Matched experiment retained" : "No experiment retained";
  const frozenKey = fruitFlyAsked ? observationalRequestKey(fruitFlyAsked.question, fruitFlyAsked.snapshot, fruitFlyAsked.frames) : undefined;
  const matchingMeta = frozenKey && meta.requestKey === frozenKey ? meta : undefined;
  const provider = matchingMeta?.result;
  const asked = external ? fruitFlyAsked?.question : syntheticAsked?.question;
  const answer: AssistantAnswer | null = external ? fruitFlyAsked ? {
    summary: fruitFlyAsked.answer.summary, facts: fruitFlyAsked.answer.facts,
    limitations: fruitFlyAsked.answer.missing ?? "Received frames only; gaps are unknown. Observational telemetry cannot establish causal effects, biological activity or successful escape.",
    next: "Collect same-session frames spanning the change. A controlled experiment would be required to test that causally.",
    provenance: fruitFlyAsked.answer.evidenceWindow ? `Frozen local window · session ${fruitFlyAsked.answer.evidenceWindow.sessionId} · sequences ${fruitFlyAsked.answer.evidenceWindow.sequences.join(", ")}` : "No retained evidence at submission. Receive telemetry, then submit again.",
  } : null : syntheticAsked?.answer ?? null;

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  function close() { setOpen(false); requestAnimationFrame(() => launcher.current?.focus({ preventScroll: true })); }
  function ask(question: string) {
    if (!question.trim() || question.length > 8000) return;
    if (external) setFruitFlyAsked(captureAssistantQuestion(question, snapshot, frames, now ?? 0));
    else setSyntheticAsked({ question, answer: syntheticAssistantAnswer(question, result) });
    setDrafts(previous => ({ ...previous, [source]: question }));
    requestAnimationFrame(() => scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" }));
  }
  function submit(event: FormEvent) { event.preventDefault(); ask(drafts[source]); }
  function act(action: AssistantAction) {
    if (busy) return;
    if (action.question) ask(action.question);
    else if (action.workspace) onNavigate(action.workspace);
    else if (action.synthetic) onSynthetic();
    else if (action.design) { onDesign(drafts.SYNTHETIC_FIXTURE.trim() || result?.researchQuestion || "Does silencing primary_a change the synthetic output?"); close(); }
  }

  return <>
    <button ref={launcher} type="button" className="assistant-launcher" aria-label="Ask CausalFly" aria-haspopup="dialog" aria-expanded={open} aria-controls="causalfly-assistant" onClick={() => setOpen(true)}><NetworkMark /><span>Ask CausalFly</span></button>
    <dialog ref={dialog} id="causalfly-assistant" className="assistant-drawer" aria-labelledby="assistant-title" onCancel={event => { event.preventDefault(); close(); }} onClose={() => setOpen(false)} onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), textarea:not(:disabled), a[href], [tabindex='0']")].filter(el => el.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onClick={event => {
      if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); }
    }}>
      <header className="assistant-header"><div className="assistant-brand"><NetworkMark /><div><span className="eyebrow">EVIDENCE & NEXT STEPS</span><h2 id="assistant-title">Ask CausalFly</h2></div></div><button type="button" className="assistant-close" onClick={close} aria-label="Close CausalFly Assistant" autoFocus>×</button></header>
      <dl className="assistant-context" aria-label="Assistant context">
        <div><dt>SOURCE</dt><dd>{dataSources[source].label}</dd></div><div><dt>CONTEXT / STAGE</dt><dd>{props.workflowContext?.stage ?? workspaceLabels[workspace]}</dd></div>
        {props.workflowContext && <div><dt>EXPERIMENT / SESSION</dt><dd>{props.workflowContext.identity}</dd></div>}
        {external && props.investigationQuestion && <div><dt>INVESTIGATION QUESTION</dt><dd className="exact-question">{props.investigationQuestion}</dd></div>}
        <div><dt>EVIDENCE</dt><dd>{retained}</dd></div><div><dt>META STATUS</dt><dd>{mode === "META LIVE" ? "Live configured · on demand" : mode === "FAKE META CLIENT" ? "Offline / fake client" : "Configuration needed"}</dd></div>
      </dl>
      <div className="assistant-analysis-status"><span className={matchingMeta?.pending ? "assistant-status-dot pending" : "assistant-status-dot"} /><span>{external && matchingMeta?.pending ? "Meta analysis in progress · frozen window" : "Local / deterministic · Meta requires explicit action"}</span></div>
      <div className="assistant-scroll" ref={scroll}>
        {!external && result?.analysis && <section className="assistant-meta"><Badge tone="amber">{result.mode === "META LIVE" ? "META GENERATED" : "OFFLINE FAKE TEMPLATE"}</Badge><h3>EXPLANATION FOR THIS TEST</h3><p>{result.analysis.interpretation}</p><details><summary>Proposed next experiment</summary><p>{result.analysis.nextExperiment.researchQuestion}</p><small>Proposal, not a measurement. Review before requesting a new design.</small><button type="button" className="text-button" onClick={() => { onDesign(result.analysis!.nextExperiment.researchQuestion); close(); }}>Use as next question ↗</button></details></section>}
        {props.workflowContext && <section className="assistant-start"><span className="eyebrow amber-text">RECOMMENDED NEXT ACTION</span><p>Meta designs and explains on request. CausalFly measures the evidence.</p><button type="button" className="primary-button" disabled={busy} aria-busy={busy} onClick={() => { props.workflowContext!.onNext(); if (external || !["Design with Meta", "Explain with Meta"].includes(props.workflowContext!.next)) close(); }}><MetaRequestLabel pending={busy && props.pendingTask !== "run"} task={props.pendingTask === "design" ? "design" : "explain"}>{busy ? "Running experiment…" : props.workflowContext.next} ↗</MetaRequestLabel></button></section>}
        <section className="assistant-start"><span className="eyebrow cyan-text">{external ? "OBSERVE. QUESTION. VERIFY." : "ASK. INTERVENE. UNDERSTAND."}</span><h3>{external ? workspace === "compare" ? "Matched trials come first." : "Follow the evidence." : "From question to experiment."}</h3><p>{external ? workspace === "compare" ? "Controlled comparison requires matched trials. Retained FruitFly telemetry does not supply a matched control and intervention." : "A quick read of your retained simulation evidence, with its limits in view." : "Explore the fixture, inspect measurements, or prepare a validated experiment."}</p>
          {external && props.investigationQuestion && <button type="button" className="text-button" onClick={() => ask(props.investigationQuestion!)}>Ask about my investigation question ↗</button>}
          <div className="assistant-actions">{assistantActions(source, workspace, Boolean(result)).map(action => <button type="button" key={action.label} onClick={() => act(action)} disabled={busy}><span>{action.label}</span><span aria-hidden="true">↗</span></button>)}</div>
        </section>
        {answer && <div className="assistant-response" aria-live="polite" aria-atomic="false"><div className="assistant-question"><span className="eyebrow">QUESTION / FROZEN AT SUBMISSION</span><p>{asked}</p></div><AssistantLocalAnswer answer={answer} />
          {external && fruitFlyAsked && <section className="assistant-meta" aria-label="Optional Meta analysis" aria-busy={Boolean(matchingMeta?.pending)}>
            <div className="assistant-meta-heading"><span className="eyebrow amber-text">OPTIONAL INTERPRETATION</span><Badge tone="amber">{provider?.mode === "META LIVE" ? "META MUSE / LIVE" : provider ? "OFFLINE / FAKE TEMPLATE" : "EXPLICIT ACTION ONLY"}</Badge></div>
            <p>{provider ? "Validated response for this exact question and frozen window." : "Send this exact question and frozen retained window through the existing Meta scientist."}</p>
            {!provider && <button type="button" className="primary-button" disabled={!frozenKey || meta.pending || !mode} aria-busy={Boolean(matchingMeta?.pending)} onClick={() => { void onAnalyze(fruitFlyAsked.question, fruitFlyAsked.snapshot, fruitFlyAsked.frames); }}><MetaRequestLabel pending={Boolean(matchingMeta?.pending)} task="explain">{matchingMeta?.error ? "Retry Meta analysis" : "Explain with Meta"}</MetaRequestLabel></button>}
            {!frozenKey && <small>Server-retained evidence is required. Receive telemetry and submit again.</small>}
            {meta.pending && !matchingMeta?.pending && <small>Another explicit analysis is in progress.</small>}
            {matchingMeta?.error && <p role="alert" className="assistant-error">{matchingMeta.error} Your frozen local evidence is preserved.</p>}
            {provider && <><section><h3>INTERPRETATION</h3><p>{provider.analysis.interpretation}</p><Badge tone="amber">{provider.analysis.evidenceSufficiency}</Badge></section><section className="assistant-limits"><h3>LIMITATIONS</h3><ul>{provider.analysis.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul></section><section><h3>WHAT TO TEST NEXT</h3><p>{provider.analysis.nextExperiment.title}</p><p>{provider.analysis.nextExperiment.rationale}</p><small>SUGGESTION / NOT A FINDING</small></section></>}
          </section>}
          <div className="assistant-inline-nav"><button type="button" disabled={busy} onClick={() => onFullAnalysis()}>{external ? "Open investigation analysis" : "Open full analysis"} ↗</button><button type="button" disabled={busy} onClick={() => onNavigate("evidence")}>Inspect evidence ↗</button>{!external && <button type="button" disabled={busy} onClick={() => { onDesign(asked!); close(); }}>Review question in Experiment ↗</button>}</div>
        </div>}
        <p className="assistant-boundary">{external ? observationalBoundary : "AI proposes and interprets. Deterministic systems measure. Immutable evidence remains in the detailed workspaces. This fixture is not a biological model."}</p>
      </div>
      <form className="assistant-composer" onSubmit={submit}><label htmlFor="assistant-question">Ask about {external ? "retained simulation evidence" : "this experiment"}</label><div><textarea id="assistant-question" rows={2} maxLength={8000} required value={drafts[source]} onChange={event => setDrafts(previous => ({ ...previous, [source]: event.target.value }))} placeholder={external ? "Ask about the retained simulation evidence…" : "Ask about this experiment…"} /><button type="submit" aria-label="Submit question locally" disabled={!drafts[source].trim()}><span aria-hidden="true">↑</span></button></div><small>Local answer first. Submitting never calls Meta.</small></form>
    </dialog>
  </>;
}
