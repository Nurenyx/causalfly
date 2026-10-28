"use client";

import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { WebExperimentResponse, WebStatus } from "@/lib/web/contracts";
import { workspaceReducer, type Workspace } from "@/lib/web/dashboard";
import { Badge } from "./components/workspace-ui";
import { SourceAnalysisWorkspace } from "./components/source-analysis-workspace";
import { EvidenceView, ExperimentMetadata } from "./components/evidence-view";
import { DataSourcePanel, useFruitFlySource } from "./components/data-source-panel";
import { FruitFlyEvidenceView } from "./components/fruitfly-evidence";
import { LiveSessionWorkspace } from "./components/live-session";
import { ObservatoryPreview, ResearchWorkflow } from "./components/observatory-preview";
import { FruitFlyLanding } from "./components/fruitfly-observatory";
import { fruitFlyExampleQuestion } from "@/lib/web/observational-question";
import { dataSources, type DataSourceKind } from "@/lib/sources/contracts";
import { createObservationalAction } from "@/lib/web/observational-action";
import type { ObservationalMetaState } from "@/lib/web/observational-contracts";
import { CausalFlyAssistant } from "./components/causalfly-assistant";

const defaultQuestion = "Does silencing primary_a reduce the synthetic output peak and delay threshold crossing?";
const workspaces: { id: Workspace; label: string; icon: string; description: string }[] = [
  { id: "observatory", label: "Observatory", icon: "◉", description: "Design your next experiment" },
  { id: "live", label: "Live Session", icon: "◌", description: "Live connectome observatory" },
  { id: "compare", label: "Compare", icon: "⇄", description: "Control vs Intervention" },
  { id: "scientist", label: "AI Scientist", icon: "✧", description: "Scientific analysis" },
  { id: "evidence", label: "Evidence", icon: "▤", description: "How this result was produced" },
];
const stages = ["Designing experiment with Meta", "Running deterministic control", "Running deterministic perturbation", "Comparing measured evidence", "Interpreting results with Meta"];

export default function Observatory({ initialStatus }: { initialStatus: WebStatus }) {
  const [{ workspace, question, result, fruitFlyQuestion = fruitFlyExampleQuestion, fruitFlyAskedQuestion }, dispatch] = useReducer(workspaceReducer, { workspace: "observatory", question: defaultQuestion, result: null });
  const [pending, setPending] = useState(false);
  const [source, setSource] = useState<DataSourceKind>("SYNTHETIC_FIXTURE");
  const fruitFly = useFruitFlySource();
  const [fruitFlyMeta, setFruitFlyMeta] = useState<ObservationalMetaState>({ pending: false });
  const [analyzeFruitFly] = useState(() => createObservationalAction(setFruitFlyMeta));
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
    if (inFlight.current || source !== "SYNTHETIC_FIXTURE") return;
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
  function selectSource(next: DataSourceKind) {
    if (next === "SYNTHETIC_FIXTURE") fruitFly.disconnect();
    setSource(next);
  }
  function useNextQuestion(next: string) {
    focusQuestion.current = true;
    dispatch({ type: "next-question", question: next });
    setNotice("Next question loaded. Review it, then choose Design & Run Experiment.");
  }

  return <div className={`app-shell instrument-shell${workspace === "live" ? " live-shell" : ""}`}>
    <a href="#main" className="skip-link">Skip to workspace</a>
    <aside className="sidebar" aria-label="CausalFly navigation">
      <Link className="brand" href="/" aria-label="CausalFly home"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 16 12 5l8 22 8-11M4 16h24M12 5l8 22" /><circle cx="4" cy="16" r="3" /><circle cx="12" cy="5" r="3" /><circle cx="20" cy="27" r="3" /><circle cx="28" cy="16" r="3" /></svg><span><>Causal<span className="brand-accent">Fly</span></><small>Connectome Experiment<br />Observatory</small></span></Link>
      <span className="sidebar-caption">WORKSPACE</span>
      <nav aria-label="Experiment workspaces">{workspaces.map((view) => <button key={view.id} type="button" aria-current={workspace === view.id ? "page" : undefined} aria-label={view.label} aria-describedby={source === "FRUITFLY_XR" && view.id === "compare" ? "compare-requirement" : undefined} className={workspace === view.id ? "active" : ""} onClick={() => navigate(view.id)} disabled={pending}><span aria-hidden="true">{view.icon}</span><span className="nav-route-copy">{view.label}{source === "FRUITFLY_XR" && view.id === "compare" && <small id="compare-requirement">Requires matched trials</small>}</span>{workspace === view.id && <i aria-hidden="true" />}</button>)}</nav>
      <DataSourcePanel source={source} snapshot={fruitFly.snapshot} disabled={pending} onSelect={selectSource} onConnect={fruitFly.connect} onDisconnect={fruitFly.disconnect} />
      <div className="sidebar-footer"><span className="sidebar-caption">META MODEL API</span><Badge tone={mode === "META LIVE" ? "amber" : "muted"}>{mode === "META LIVE" ? "LIVE CONFIGURED" : mode === "FAKE META CLIENT" ? "OFFLINE / FAKE" : "CONFIGURATION NEEDED"}</Badge><p>{mode === "META LIVE" ? "Connection checked when you submit" : "No provider request on page load"}</p></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><span className="breadcrumb">EXPERIMENT <span>/</span> {current.label.toUpperCase()}</span><h1>{source === "FRUITFLY_XR" && workspace === "compare" ? "Controlled comparison / matched trials required" : source === "FRUITFLY_XR" && workspace === "scientist" ? "Observational simulation analysis" : source === "FRUITFLY_XR" && workspace === "observatory" ? "Question the simulation" : current.description}</h1></div><div className="header-badges"><Badge tone={mode === "META LIVE" ? "amber" : "muted"}>{mode ?? "META CONFIGURATION NEEDED"}</Badge><Badge tone="cyan">{dataSources[source].label.toUpperCase()}</Badge></div></header>
      {source === "SYNTHETIC_FIXTURE" && result && workspace !== "observatory" && <div className="metadata-bar"><span className="eyebrow">EXPERIMENT</span><ExperimentMetadata result={result} /></div>}
      <div className="sr-only" role="status">{notice}</div>
      <main id="main" ref={mainRef} tabIndex={-1} className={`main-content ${source === "SYNTHETIC_FIXTURE" && workspace === "compare" && result ? "compare-content" : ""}`} aria-label={`${current.label} workspace`}>
        {workspace === "compare" || workspace === "scientist" ? <SourceAnalysisWorkspace source={source} workspace={workspace} result={result} snapshot={fruitFly.snapshot} frames={fruitFly.frames} now={fruitFly.now} fruitFlyQuestion={fruitFlyAskedQuestion} fruitFlyMeta={{ state: fruitFlyMeta, enabled: Boolean(fruitFlyAskedQuestion?.trim() && fruitFly.snapshot.evidence && fruitFly.snapshot.retentionId), onAnalyze: () => { if (fruitFlyAskedQuestion) void analyzeFruitFly(fruitFlyAskedQuestion, fruitFly.snapshot, fruitFly.frames); } }} onNext={useNextQuestion} onFullAnalysis={() => navigate("scientist")} onEvidence={() => navigate("evidence")} onLive={() => navigate("live")} onSynthetic={() => selectSource("SYNTHETIC_FIXTURE")} onStart={() => { focusQuestion.current = true; navigate("observatory"); }} /> : workspace === "live" ? source === "FRUITFLY_XR" ? <LiveSessionWorkspace snapshot={fruitFly.snapshot} frames={fruitFly.frames} now={fruitFly.now} onEvidence={() => navigate("evidence")} onConnect={fruitFly.connect} onDisconnect={fruitFly.disconnect} /> : <section className="empty-state"><div className="empty-orbit" aria-hidden="true">◌</div><span className="eyebrow">LIVE SESSION</span><h2>Follow a FruitFly XR simulation.</h2><p>Live telemetry requires FruitFly XR. Select the source, connect, and start a trial with its existing client.</p><button type="button" className="primary-button" onClick={() => selectSource("FRUITFLY_XR")}>Select FruitFly XR ↗</button></section> : source === "FRUITFLY_XR" ? workspace === "evidence" ? <FruitFlyEvidenceView snapshot={fruitFly.snapshot} /> : <FruitFlyLanding snapshot={fruitFly.snapshot} frames={fruitFly.frames} now={fruitFly.now} question={fruitFlyQuestion} onQuestion={(question) => dispatch({ type: "fruitfly-question", question })} onAsk={() => dispatch({ type: "fruitfly-ask", question: fruitFlyQuestion, hasEvidence: Boolean(fruitFly.snapshot.evidence) })} onConnect={fruitFly.connect} onLive={() => navigate("live")} onEvidence={() => navigate("evidence")} /> : workspace === "observatory" ? <>
          <div className="page-intro"><span className="eyebrow cyan-text">THE CAUSAL OBSERVATORY</span><h2>Ask. Intervene. Understand.</h2><p>Turn a research question into a controlled experiment and reproducible evidence.</p></div>
          <ResearchWorkflow />
          <section id="research" className="panel question-panel" aria-labelledby="question-label">
            <div className="question-heading"><label id="question-label" htmlFor="research-question"><span className="section-index">01</span>Research question</label><span className="eyebrow">START WITH A HYPOTHESIS</span></div>
            <form onSubmit={submit}><textarea ref={questionRef} id="research-question" name="researchQuestion" required maxLength={8000} rows={2} value={question} onChange={(event) => dispatch({ type: "question", question: event.target.value })} disabled={pending} aria-describedby="question-help" /><div className="form-footer"><p id="question-help">A single silence intervention. A matched control. An evidence-based comparison.</p><button className="primary-button" type="submit" disabled={pending || !question.trim()}>{pending ? <><span className="spinner" /> RUNNING EXPERIMENT</> : <>DESIGN & RUN EXPERIMENT <span aria-hidden="true">↗</span></>}</button></div></form>
            {mode === "FAKE META CLIENT" && <p className="fake-note">FAKE META CLIENT · Offline demo specification and template interpretation; arbitrary questions do not change the proposed experiment.</p>}
          </section>
          {error && <div className="error-panel" role="alert"><strong>Experiment unavailable</strong><p>{error}</p></div>}
          {pending ? <section className="panel loading-panel" role="status" aria-live="polite" aria-busy="true"><div><span className="spinner" /><h2>Scientific workflow in progress</h2></div><p>{mode === "FAKE META CLIENT" ? "Using the offline fake client for design and interpretation." : "The server is running the complete experiment. This may take a few minutes."} Results appear together when complete; stage completion is not streamed.</p><ol>{stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span>{mode === "FAKE META CLIENT" ? stage.replace("with Meta", "with fake client") : stage}</li>)}</ol></section> : <ObservatoryPreview result={result} onCompare={() => navigate("compare")} />}
        </> : result ? <EvidenceView result={result} /> : <section className="empty-state"><div className="empty-orbit" aria-hidden="true">{current.icon}</div><span className="eyebrow">{current.label.toUpperCase()}</span><h2>Begin with an experiment.</h2><p>Run a research question to explore measured comparisons, scientific analysis, and provenance.</p><button type="button" className="primary-button" onClick={() => { focusQuestion.current = true; navigate("observatory"); }}>Go to Observatory ↗</button></section>}
      </main>
      <footer className="scientific-disclaimer"><span aria-hidden="true">◇</span>{source === "SYNTHETIC_FIXTURE" ? "Synthetic engineering fixture — not a biological model or Drosophila finding." : "FruitFly XR — published connectome structure with simulated dynamics; not recordings from a living fly."}</footer>
    </div>
    <CausalFlyAssistant source={source} workspace={workspace} snapshot={fruitFly.snapshot} frames={fruitFly.frames} now={fruitFly.now} result={result} mode={mode} meta={fruitFlyMeta} busy={pending} onAnalyze={analyzeFruitFly} onNavigate={navigate} onSynthetic={() => selectSource("SYNTHETIC_FIXTURE")} onDesign={useNextQuestion} onFullAnalysis={(question) => {
      if (source === "FRUITFLY_XR" && question) dispatch({ type: "fruitfly-ask", question, hasEvidence: true });
      else navigate("scientist");
    }} />
  </div>;
}
