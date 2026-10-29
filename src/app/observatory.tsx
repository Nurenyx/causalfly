"use client";

import { useReducer, useRef, useState } from "react";
import Link from "next/link";
import type { GuidedResponse, WebStatus } from "@/lib/web/contracts";
import { workspaceReducer, type Workspace } from "@/lib/web/dashboard";
import { workflowProgress } from "@/lib/web/workflow-progress";
import { Badge } from "./components/workspace-ui";
import { EvidenceView } from "./components/evidence-view";
import { DataSourcePanel, useFruitFlySource } from "./components/data-source-panel";
import { FruitFlyEvidenceView } from "./components/fruitfly-evidence";
import { LiveSessionWorkspace } from "./components/live-session";
import { ObservatoryPreview } from "./components/observatory-preview";
import { FruitFlyScientist } from "./components/fruitfly-analysis";
import { CompareDashboard } from "./components/compare-dashboard";
import { ScientistView } from "./components/ai-scientist";
import { WorkflowProgress, CompareRequirements, DesignReview } from "./components/guided-workflow";
import { fruitFlyExampleQuestion } from "@/lib/web/observational-question";
import { dataSources, type DataSourceKind } from "@/lib/sources/contracts";
import { createObservationalAction } from "@/lib/web/observational-action";
import type { ObservationalMetaState } from "@/lib/web/observational-contracts";
import { CausalFlyAssistant } from "./components/causalfly-assistant";

const defaultQuestion = "Does silencing primary_a reduce the synthetic output peak and delay threshold crossing?";
const navigation: { id: Workspace; label: string; icon: string }[] = [
  { id: "observatory", label: "Experiment", icon: "◉" }, { id: "live", label: "Live Session", icon: "◌" }, { id: "evidence", label: "Evidence", icon: "▤" },
];

export default function Observatory({ initialStatus }: { initialStatus: WebStatus }) {
  const [{ workspace, question, design, result, fruitFlyQuestion = fruitFlyExampleQuestion, fruitFlyAskedQuestion }, dispatch] = useReducer(workspaceReducer, { workspace: "observatory", question: defaultQuestion, result: null });
  const [pending, setPending] = useState("");
  const [source, setSource] = useState<DataSourceKind>("SYNTHETIC_FIXTURE");
  const fruitFly = useFruitFlySource();
  const [fruitFlyMeta, setFruitFlyMeta] = useState<ObservationalMetaState>({ pending: false });
  const [analyzeFruitFly] = useState(() => createObservationalAction(setFruitFlyMeta));
  const [error, setError] = useState(initialStatus.error ?? "");
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const external = source === "FRUITFLY_XR";
  const mode = initialStatus.mode;
  const hasTelemetry = Boolean(fruitFly.snapshot.evidence);
  const currentSession = fruitFly.snapshot.evidence?.telemetry.sessionId;
  const currentMeta = fruitFlyMeta.result?.evidence.sessionId === currentSession && fruitFlyMeta.result?.analysis.exactQuestion === fruitFlyAskedQuestion && Boolean(fruitFlyMeta.result);
  const stages = workflowProgress({ external, workspace, question, design, result, hasTelemetry, hasQuestion: Boolean(fruitFlyAskedQuestion), hasMeta: currentMeta, pending });
  const activeStage = workspace === "compare" ? "COMPARE" : workspace === "scientist" ? "INTERPRET" : workspace === "evidence" ? "EVIDENCE" : workspace === "live" ? "OBSERVE" : stages.find(s => s.state === "ACTIVE")?.label ?? "ASK / DESIGN";
  const identity = external ? currentSession ?? "Awaiting session" : design?.spec.id ?? "New experiment";
  const busy = Boolean(pending);

  function navigate(next: Workspace) { dispatch({ type: "navigate", workspace: next }); }
  function selectSource(next: DataSourceKind) { if (next === "SYNTHETIC_FIXTURE") fruitFly.disconnect(); setSource(next); setError(""); }
  function useNextQuestion(next: string) { dispatch({ type: "next-question", question: next }); setNotice("Proposed follow-up loaded. Request a new design explicitly; the current experiment remains retained until a new design succeeds."); }
  async function execute(action: "design" | "run" | "interpret") {
    if (inFlight.current || external || (action !== "design" && !design)) return;
    inFlight.current = true; setPending(action); setError("");
    try {
      const response = await fetch("/api/experiments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "design" ? { action, researchQuestion: question } : { action, id: design!.id }) });
      const data = await response.json() as GuidedResponse;
      if (!data.ok) setError(data.error);
      else if (!response.ok) setError("Request failed. Retained evidence is unchanged.");
      else if (action === "design") { dispatch({ type: "designed", design: data.design }); setNotice("Design validated. Review the proposal and approve the matched run."); }
      else if (data.result) { dispatch({ type: action === "interpret" ? "interpreted" : "completed", result: data.result }); setNotice(action === "run" ? "Measured comparison ready. Meta has not interpreted these results yet." : "Interpretation and follow-up proposal ready. Measurements remain unchanged."); }
    } catch { setError("Unable to reach CausalFly. Retry the explicit action; retained evidence is unchanged."); }
    finally { inFlight.current = false; setPending(""); }
  }
  const analysisEnabled = Boolean(mode && fruitFlyAskedQuestion?.trim() && fruitFly.snapshot.evidence && fruitFly.snapshot.retentionId);
  function analyzeObservation() { if (analysisEnabled) void analyzeFruitFly(fruitFlyAskedQuestion!, fruitFly.snapshot, fruitFly.frames); }
  const needsDesign = !design || question.trim() !== design.researchQuestion.trim();
  const nextLabel = external ? !fruitFlyAskedQuestion ? "Save session question" : !hasTelemetry ? "Connect / observe session" : !currentMeta ? "Review local interpretation" : "Inspect evidence & proposal" : needsDesign ? "Design with Meta" : !result ? "Approve & run matched experiment" : !result.analysis ? "Analyze with Meta" : "Inspect evidence";
  function nextAction() {
    if (external) navigate(!fruitFlyAskedQuestion ? "observatory" : !hasTelemetry ? "live" : "scientist");
    else if (needsDesign) { if (workspace === "observatory") void execute("design"); else navigate("observatory"); }
    else if (!result) { if (workspace === "observatory") void execute("run"); else navigate("observatory"); }
    else if (!result.analysis) void execute("interpret");
    else navigate("evidence");
  }
  const metaProps = { state: fruitFlyMeta, enabled: analysisEnabled, onAnalyze: analyzeObservation };

  return <div className={`app-shell instrument-shell guided-shell${workspace === "live" ? " live-shell" : ""}`}>
    <a href="#main" className="skip-link">Skip to workspace</a>
    <aside className="sidebar" aria-label="CausalFly navigation">
      <Link className="brand" href="/" aria-label="CausalFly home"><span>◈</span><span>Causal<span className="brand-accent">Fly</span><small>Scientific experiment<br />workbench</small></span></Link>
      <span className="sidebar-caption">RESEARCH WORKSPACE</span>
      <nav aria-label="Experiment workspaces">{navigation.map(view => <button key={view.id} type="button" aria-label={view.label} aria-current={(workspace === view.id || view.id === "observatory" && ["compare", "scientist"].includes(workspace)) ? "page" : undefined} className={(workspace === view.id || view.id === "observatory" && ["compare", "scientist"].includes(workspace)) ? "active" : ""} onClick={() => navigate(view.id)}><span aria-hidden="true">{view.icon}</span><span>{view.label}</span></button>)}</nav>
      <DataSourcePanel source={source} snapshot={fruitFly.snapshot} disabled={busy} onSelect={selectSource} onConnect={fruitFly.connect} onDisconnect={fruitFly.disconnect} />
      {busy && <p className="trace-note">Source selection pauses while the explicit experiment request completes.</p>}
      <div className="workflow-role-key"><span className="eyebrow">EVIDENCE FIRST</span><p className="cyan-text">◈ Engine measures</p><p className="amber-text">✧ Meta reasons</p><p>Ask CausalFly guides you through both.</p></div>
      <div className="sidebar-footer"><span className="sidebar-caption">META MUSE / RUNTIME</span><Badge tone={mode === "META LIVE" ? "amber" : "muted"}>{mode ?? "CONFIGURATION NEEDED"}</Badge><p>Designer · Interpreter · Next-experiment planner</p><small>Explicit requests only</small></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><span className="breadcrumb">{external ? "OBSERVATIONAL SESSION" : "CONTROLLED EXPERIMENT"} / {activeStage}</span><h1>{external ? "Observe. Trace. Test next." : "Ask. Test. Understand."}</h1><p className="workflow-identity">{identity}</p></div><div className="header-badges"><Badge tone={mode === "META LIVE" ? "amber" : "muted"}>{mode ?? "META CONFIGURATION NEEDED"}</Badge><Badge tone="cyan">{dataSources[source].label.toUpperCase()}</Badge></div></header>
      <WorkflowProgress stages={stages} onNavigate={navigate} />
      <div className="workflow-next"><div><span className="eyebrow">{busy ? "REQUEST IN PROGRESS" : "RECOMMENDED NEXT ACTION"}</span><p>{busy ? `${pending.toUpperCase()} · ${pending === "run" ? "Deterministic engine only" : "Explicit model request"}` : nextLabel}</p></div><button type="button" className="primary-button" disabled={busy || !external && !result?.analysis && !mode && Boolean(!design || result)} onClick={nextAction}>{busy ? "Working…" : nextLabel} ↗</button></div>
      {!mode && <p className="workflow-notice">Meta configuration is required for design or interpretation. Existing measurements remain inspectable.</p>}
      {notice && <p className="workflow-notice" role="status">{notice}</p>}
      {error && <div className="error-panel" role="alert"><strong>Action could not complete</strong><p>{error}</p></div>}
      <main id="main" tabIndex={-1} className="main-content" aria-label={`${activeStage} workspace`}>
        {external ? <>
          {workspace === "compare" ? <CompareRequirements external onNext={() => navigate("evidence")} /> : workspace === "evidence" ? <><FruitFlyEvidenceView snapshot={fruitFly.snapshot} />{fruitFlyMeta.result && <details className="panel"><summary>Frozen Meta interpretation / proposal provenance</summary><p>Analysis belongs to session {fruitFlyMeta.result.evidence.sessionId}; inspect its exact frozen window.</p><pre>{JSON.stringify(fruitFlyMeta.result, null, 2)}</pre></details>}</> : workspace === "scientist" ? <FruitFlyScientist snapshot={fruitFly.snapshot} frames={fruitFly.frames} now={fruitFly.now} question={fruitFlyAskedQuestion} meta={metaProps} onLive={() => navigate("live")} onEvidence={() => navigate("evidence")} /> : <>
            {workspace === "observatory" && <section className="panel session-question"><form onSubmit={event => { event.preventDefault(); dispatch({ type: "fruitfly-ask", question: fruitFlyQuestion, hasEvidence: hasTelemetry }); }}><label htmlFor="fruitfly-question">ASK / What should this session help you understand?</label><textarea id="fruitfly-question" value={fruitFlyQuestion} onChange={e => dispatch({ type: "fruitfly-question", question: e.target.value })} maxLength={8000} required rows={2} /><button className="primary-button" type="submit" disabled={!fruitFlyQuestion.trim()}>Save session question ↗</button><small>Local action. No model call. {hasTelemetry ? "Continue to local interpretation." : "Then connect and observe a simulation."}</small>{!fruitFlyQuestion.trim() && <small>Enter a question to continue.</small>}</form></section>}
            <LiveSessionWorkspace snapshot={fruitFly.snapshot} frames={fruitFly.frames} now={fruitFly.now} onEvidence={() => navigate("evidence")} onConnect={fruitFly.connect} onDisconnect={fruitFly.disconnect} onInterpret={() => navigate(fruitFlyAskedQuestion ? "scientist" : "observatory")} />
            <p className="trace-note">XR PREVIEW · The current bridge supplies no video or image feed. Published soma geometry and received telemetry are shown above.</p>
          </>}
        </> : workspace === "live" ? <section className="panel"><h2>Observe a connectome simulation.</h2><p>Live Session uses the FruitFly XR read-only telemetry source. Your synthetic experiment stays retained when switching sources.</p><button type="button" className="primary-button" onClick={() => selectSource("FRUITFLY_XR")}>Select FruitFly XR ↗</button></section> : workspace === "compare" ? result ? <CompareDashboard key={design?.id ?? result.spec.id} result={result} onNext={useNextQuestion} onFullAnalysis={() => navigate("scientist")} onEvidence={() => navigate("evidence")} /> : <CompareRequirements external={false} design={design} onNext={() => navigate("observatory")} /> : workspace === "scientist" ? result ? <ScientistView result={result} onNext={useNextQuestion} /> : <CompareRequirements external={false} design={design} onNext={() => navigate("observatory")} /> : workspace === "evidence" ? result ? <EvidenceView result={result} /> : <CompareRequirements external={false} design={design} onNext={() => navigate("observatory")} /> : <>
          <div className="experiment-intro"><span className="eyebrow cyan-text">A QUESTION BECOMES A CONTROLLED TEST</span><p>Meta designs. You approve. The engine measures. Meta interprets the evidence.</p></div>
          <div className="design-workspace"><div><section className="panel question-panel"><form onSubmit={event => { event.preventDefault(); void execute("design"); }}><label htmlFor="research-question">01 / Research question</label><textarea id="research-question" required maxLength={8000} rows={3} value={question} onChange={event => dispatch({ type: "question", question: event.target.value })} aria-describedby="question-help" /><div className="form-footer"><p id="question-help">Single silence intervention · matched conditions · validated specification</p><button className="primary-button" type="submit" disabled={busy || !question.trim() || !mode}>{pending === "design" ? "Designing…" : "Design with Meta"} ↗</button></div>{!question.trim() && <small>Enter a research question to enable design.</small>}{mode === "FAKE META CLIENT" && <p className="fake-note">OFFLINE FAKE TEMPLATE · The demo designer uses a fixed specification; arbitrary questions do not change it.</p>}</form></section>
          {design && <DesignReview design={design} busy={busy} onRun={() => void execute("run")} />}
          <ObservatoryPreview result={result} onCompare={() => navigate("compare")} /></div>
          <aside className="panel workflow-scientist"><span className="eyebrow amber-text">META MUSE / SCIENTIST</span><h2>From question<br />to next experiment.</h2><ol><li><strong>01 / EXPERIMENT DESIGNER</strong><p>Turns your question into a constrained, validated specification.</p><Badge tone={design ? "green" : "amber"}>{design ? "DESIGN RETAINED" : "AWAITING REQUEST"}</Badge></li><li><strong>02 / SCIENTIFIC INTERPRETER</strong><p>Assesses hypothesis support from immutable engine evidence.</p><Badge tone={result ? "green" : "muted"}>{result ? "EVIDENCE READY" : "REQUIRES MATCHED RUN"}</Badge></li><li><strong>03 / NEXT-EXPERIMENT PLANNER</strong><p>Returns a bounded follow-up proposal with the interpretation.</p><Badge tone={result?.analysis ? "green" : "muted"}>{result?.analysis ? "PROPOSAL READY" : "REQUIRES INTERPRETATION"}</Badge></li></ol><p className="trace-note">Proposals and interpretations are model-authored. Measurements come only from the deterministic engine.</p><button type="button" className="text-button" onClick={() => navigate("compare")}>Check comparison requirements ↗</button></aside></div>
        </>}
      </main>
      <footer className="scientific-disclaimer">◇ {external ? "FruitFly XR · published connectome structure with simulated dynamics; not recordings from a living fly." : "Synthetic engineering fixture · not a biological model or Drosophila finding."}</footer>
    </div>
    <CausalFlyAssistant source={source} workspace={workspace} snapshot={fruitFly.snapshot} frames={fruitFly.frames} now={fruitFly.now} result={result} mode={mode} meta={fruitFlyMeta} busy={busy} onAnalyze={analyzeFruitFly} onNavigate={navigate} onSynthetic={() => selectSource("SYNTHETIC_FIXTURE")} onDesign={useNextQuestion} workflowContext={{ stage: activeStage, identity, next: nextLabel, onNext: nextAction }} onFullAnalysis={question => { if (external && question) dispatch({ type: "fruitfly-ask", question, hasEvidence: true }); else navigate("scientist"); }} />
  </div>;
}

