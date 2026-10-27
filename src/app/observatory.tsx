"use client";

import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { WebExperimentResponse, WebStatus } from "@/lib/web/contracts";
import { workspaceReducer, type Workspace } from "@/lib/web/dashboard";
import { Badge } from "./components/workspace-ui";
import { CompareDashboard } from "./components/compare-dashboard";
import { ScientistView } from "./components/ai-scientist";
import { EvidenceView, ExperimentMetadata } from "./components/evidence-view";

const defaultQuestion = "Does silencing primary_a reduce the synthetic output peak and delay threshold crossing?";
const workspaces: { id: Workspace; label: string; icon: string; description: string }[] = [
  { id: "observatory", label: "Observatory", icon: "◉", description: "Design your next experiment" },
  { id: "compare", label: "Compare", icon: "⇄", description: "Control vs Perturbation" },
  { id: "scientist", label: "AI Scientist", icon: "✧", description: "Scientific analysis" },
  { id: "evidence", label: "Evidence", icon: "▤", description: "Provenance & experiment configuration" },
];
const stages = ["Designing experiment with Meta", "Running deterministic control", "Running deterministic perturbation", "Comparing measured evidence", "Interpreting results with Meta"];

export default function Observatory({ initialStatus }: { initialStatus: WebStatus }) {
  const [{ workspace, question, result }, dispatch] = useReducer(workspaceReducer, { workspace: "observatory", question: defaultQuestion, result: null });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialStatus.error ?? "");
  const [notice, setNotice] = useState("");
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const focusQuestion = useRef(false);
  const inFlight = useRef(false);
  const mode = result?.mode ?? initialStatus.mode;
  const current = workspaces.find((view) => view.id === workspace)!;

  useEffect(() => {
    if (focusQuestion.current && workspace === "observatory") {
      focusQuestion.current = false;
      questionRef.current?.focus();
    } else mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [workspace]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/experiments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ researchQuestion: question }) });
      const data = await response.json() as WebExperimentResponse;
      if (!data.ok) setError(data.error);
      else if (!response.ok) setError("The experiment could not be completed. Please retry.");
      else {
        dispatch({ type: "completed", result: data.result });
        setNotice("Experiment complete. Compare workspace opened with measured evidence and AI interpretation.");
      }
    } catch {
      setError("Unable to reach CausalFly. Check your connection and retry.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function navigate(next: Workspace) { dispatch({ type: "navigate", workspace: next }); }
  function useNextQuestion(next: string) {
    focusQuestion.current = true;
    dispatch({ type: "next-question", question: next });
    setNotice("Next question loaded. Review it, then choose Design & Run Experiment.");
  }

  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to workspace</a>
    <aside className="sidebar" aria-label="CausalFly navigation">
      <Link className="brand" href="/" aria-label="CausalFly home"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 16 12 5l8 22 8-11M4 16h24M12 5l8 22" /><circle cx="4" cy="16" r="3" /><circle cx="12" cy="5" r="3" /><circle cx="20" cy="27" r="3" /><circle cx="28" cy="16" r="3" /></svg><span>CAUSALFLY<small>causal observatory</small></span></Link>
      <span className="sidebar-caption">WORKSPACE</span>
      <nav aria-label="Experiment workspaces">{workspaces.map((view) => <button key={view.id} type="button" aria-current={workspace === view.id ? "page" : undefined} className={workspace === view.id ? "active" : ""} onClick={() => navigate(view.id)} disabled={pending}><span aria-hidden="true">{view.icon}</span>{view.label}{workspace === view.id && <i aria-hidden="true" />}</button>)}</nav>
      <div className="source-card"><span className="sidebar-caption">DATA SOURCE</span><div className="source-icon" aria-hidden="true">⌘</div><strong>Synthetic Fixture</strong><span className="ready-label"><span className="status-dot" />READY</span><p>Deterministic engineering network</p><div className="source-boundary">Meta proposes & interprets.<br />The engine measures.</div></div>
      <div className="sidebar-footer"><span className="sidebar-caption">META MODEL API</span><Badge tone={mode === "META LIVE" ? "amber" : "muted"}>{mode === "META LIVE" ? "LIVE CONFIGURED" : mode === "FAKE META CLIENT" ? "OFFLINE / FAKE" : "CONFIGURATION NEEDED"}</Badge><p>{mode === "META LIVE" ? "Connection checked when you submit" : "No provider request on page load"}</p></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><span className="breadcrumb">EXPERIMENT <span>/</span> {current.label.toUpperCase()}</span><h1>{current.description}</h1></div><div className="header-badges"><Badge tone={mode === "META LIVE" ? "amber" : "muted"}>{mode ?? "META CONFIGURATION NEEDED"}</Badge><Badge tone="cyan">SYNTHETIC FIXTURE</Badge></div></header>
      {result && workspace !== "observatory" && <div className="metadata-bar"><span className="eyebrow">EXPERIMENT</span><ExperimentMetadata result={result} /></div>}
      <div className="sr-only" role="status">{notice}</div>
      <main id="main" ref={mainRef} tabIndex={-1} className={`main-content ${workspace === "compare" && result ? "compare-content" : ""}`} aria-label={`${current.label} workspace`}>
        {workspace === "observatory" ? <>
          <div className="page-intro"><span className="eyebrow cyan-text">THE CAUSAL OBSERVATORY</span><h2>Ask. Intervene. Understand.</h2><p>From a research question to reproducible evidence, with an AI scientist in the loop.</p></div>
          <section id="research" className="panel question-panel" aria-labelledby="question-label">
            <div className="question-heading"><label id="question-label" htmlFor="research-question"><span className="section-index">01</span>Research question</label><span className="eyebrow">START WITH A HYPOTHESIS</span></div>
            <form onSubmit={submit}><textarea ref={questionRef} id="research-question" name="researchQuestion" required maxLength={8000} rows={2} value={question} onChange={(event) => dispatch({ type: "question", question: event.target.value })} disabled={pending} aria-describedby="question-help" /><div className="form-footer"><p id="question-help">A single silence intervention. A matched control. An evidence-based comparison.</p><button className="primary-button" type="submit" disabled={pending || !question.trim()}>{pending ? <><span className="spinner" /> RUNNING EXPERIMENT</> : <>DESIGN & RUN EXPERIMENT <span aria-hidden="true">↗</span></>}</button></div></form>
            {mode === "FAKE META CLIENT" && <p className="fake-note">FAKE META CLIENT · Offline demo specification and template interpretation; arbitrary questions do not change the proposed experiment.</p>}
          </section>
          {error && <div className="error-panel" role="alert"><strong>Experiment unavailable</strong><p>{error}</p></div>}
          {pending ? <section className="panel loading-panel" role="status" aria-live="polite" aria-busy="true"><div><span className="spinner" /><h2>Scientific workflow in progress</h2></div><p>{mode === "FAKE META CLIENT" ? "Using the offline fake client for design and interpretation." : "The server is running the complete experiment. This may take a few minutes."} Results appear together when complete; stage completion is not streamed.</p><ol>{stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span>{mode === "FAKE META CLIENT" ? stage.replace("with Meta", "with fake client") : stage}</li>)}</ol></section> : result ? <div className="return-to-result panel"><div><Badge tone="green">EXPERIMENT AVAILABLE</Badge><p>Your measured comparison is ready to explore.</p></div><button type="button" className="secondary-button" onClick={() => navigate("compare")}>Open Compare ↗</button></div> : <div className="observatory-guide"><div><span>01 / DESIGN</span><h3>Start with a question</h3><p>Meta proposes a validated experiment specification.</p></div><div><span>02 / MEASURE</span><h3>Isolate the intervention</h3><p>The engine runs control and perturbation with matched conditions.</p></div><div><span>03 / INTERPRET</span><h3>Follow the evidence</h3><p>Compare real traces, then explore AI interpretation and provenance.</p></div></div>}
        </> : result ? workspace === "compare" ? <CompareDashboard result={result} onNext={useNextQuestion} onFullAnalysis={() => navigate("scientist")} onEvidence={() => navigate("evidence")} /> : workspace === "scientist" ? <ScientistView result={result} onNext={useNextQuestion} /> : <EvidenceView result={result} /> : <section className="empty-state"><div className="empty-orbit" aria-hidden="true">{current.icon}</div><span className="eyebrow">{current.label.toUpperCase()}</span><h2>Begin with an experiment.</h2><p>Run a research question to explore measured comparisons, scientific analysis, and provenance.</p><button type="button" className="primary-button" onClick={() => { focusQuestion.current = true; navigate("observatory"); }}>Go to Observatory ↗</button></section>}
      </main>
      <footer className="scientific-disclaimer"><span aria-hidden="true">◇</span>Synthetic engineering fixture — not a biological model or Drosophila finding.</footer>
    </div>
  </div>;
}
