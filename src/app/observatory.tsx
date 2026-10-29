"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import type { GuidedResponse, WebStatus } from "@/lib/web/contracts";
import { workspaceReducer, type Workspace } from "@/lib/web/dashboard";
import { workflowProgress } from "@/lib/web/workflow-progress";
import { Badge } from "./components/workspace-ui";
import { EvidenceView } from "./components/evidence-view";
import { DataSourcePanel, useFruitFlySource } from "./components/data-source-panel";
import { FruitFlyEvidenceView } from "./components/fruitfly-evidence";
import { LiveSessionWorkspace } from "./components/live-session";
import { GuidedExperiment } from "./components/guided-experiment";
import { FruitFlyScientist } from "./components/fruitfly-analysis";
import { CompareDashboard } from "./components/compare-dashboard";
import { ScientistView } from "./components/ai-scientist";
import { WorkflowProgress, CompareRequirements } from "./components/guided-workflow";
import { fruitFlyExampleQuestion } from "@/lib/web/observational-question";
import { dataSources, type DataSourceKind } from "@/lib/sources/contracts";
import { createObservationalAction } from "@/lib/web/observational-action";
import type { ObservationalMetaState } from "@/lib/web/observational-contracts";
import { CausalFlyAssistant } from "./components/causalfly-assistant";
import { InvestigationQuestion } from "./components/investigation-question";
import { MetaRequestLabel } from "./components/meta-request-label";
import { WorkflowErrorNotice, type WorkflowFailure } from "./components/workflow-error-notice";
import { initialPerceptionSession } from "@/lib/web/perception-session";
import type { RunDiagnostics } from "@/lib/web/flight-recorder-types";
import { RunDiagnosticsDetails } from "./components/experiment-trust";

const defaultQuestion = "What happens if I silence the primary pathway?";
const navigation: { id: Workspace; label: string; icon: string }[] = [
  { id: "observatory", label: "Experiment", icon: "◉" }, { id: "live", label: "Live Connectome", icon: "◌" }, { id: "evidence", label: "Evidence", icon: "▤" },
];

export default function Observatory({ initialStatus }: { initialStatus: WebStatus }) {
  const [{ workspace, question, design, result, fruitFlyQuestion = fruitFlyExampleQuestion, fruitFlyAskedQuestion: retainedQuestion, fruitFlyQuestionSessionId }, dispatch] = useReducer(workspaceReducer, { workspace: "observatory", question: defaultQuestion, result: null });
  const [pending, setPending] = useState("");
  const [source, setSource] = useState<DataSourceKind>("SYNTHETIC_FIXTURE");
  const fruitFly = useFruitFlySource();
  const [fruitFlyMeta, setFruitFlyMeta] = useState<ObservationalMetaState>({ pending: false });
  const [analyzeFruitFly] = useState(() => createObservationalAction(setFruitFlyMeta));
  const [error, setError] = useState(initialStatus.error ?? "");
  const [failure, setFailure] = useState<WorkflowFailure>();
  const [errorTarget, setErrorTarget] = useState("");
  const [unavailableDesignId, setUnavailableDesignId] = useState<string>();
  const [perceptionSession, setPerceptionSession] = useState(initialPerceptionSession);
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const external = source === "FRUITFLY_XR";
  const mode = initialStatus.mode;
  const hasTelemetry = Boolean(fruitFly.snapshot.evidence);
  const currentSession = fruitFly.snapshot.evidence?.telemetry.sessionId;
  const fruitFlyAskedQuestion = !fruitFlyQuestionSessionId || fruitFlyQuestionSessionId === currentSession ? retainedQuestion : undefined;
  const currentMeta = fruitFlyMeta.result?.evidence.sessionId === currentSession && fruitFlyMeta.result?.analysis.exactQuestion === fruitFlyAskedQuestion && Boolean(fruitFlyMeta.result);
  const effectiveDesign = unavailableDesignId === design?.id ? undefined : design;
  const hasCurrentDesign = effectiveDesign?.researchQuestion.trim() === question.trim();
  const stages = workflowProgress({ external, workspace, question, design: effectiveDesign, result, hasTelemetry, hasQuestion: Boolean(fruitFlyAskedQuestion), hasMeta: currentMeta, pending });
  const activeStage = !external && workspace === "observatory" ? pending === "perception" ? "PERCEIVE" : pending === "design" ? "DESIGN" : pending === "run" ? "TEST" : pending === "interpret" || result?.analysis && hasCurrentDesign ? "UNDERSTAND" : result && hasCurrentDesign ? "TEST" : hasCurrentDesign ? "DESIGN" : "ASK" : workspace === "compare" ? "COMPARE" : workspace === "scientist" ? "INTERPRET" : workspace === "evidence" ? "EVIDENCE" : workspace === "live" ? "OBSERVE" : stages.find(s => s.state === "ACTIVE")?.label ?? "ASK / DESIGN";
  const identity = external ? currentSession ?? "Awaiting session" : effectiveDesign?.spec.id ?? "New experiment";
  const busy = Boolean(pending);
  const phase = external && !fruitFlyAskedQuestion ? "ASK" : workspace === "scientist" || workspace === "evidence" ? "UNDERSTAND" : workspace === "live" || workspace === "compare" || design && question.trim() === design.researchQuestion.trim() && workspace === "observatory" ? "TEST" : "ASK";
  useEffect(() => { if (currentSession) dispatch({ type: "fruitfly-session", sessionId: currentSession }); }, [currentSession]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [workspace]);
  useEffect(() => () => { if (perceptionSession.url) URL.revokeObjectURL(perceptionSession.url); }, [perceptionSession.url]);

  useEffect(() => {
    const target = result ? "demo-result" : design?.perceptionInput ? "demo-watch" : design ? "demo-design" : undefined;
    if (target) document.getElementById(target)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [design, result]);

  function navigate(next: Workspace) { dispatch({ type: "navigate", workspace: next }); }
  function selectSource(next: DataSourceKind) { if (next === "SYNTHETIC_FIXTURE") fruitFly.disconnect(); setSource(next); setError(""); setNotice(""); }
  function useNextQuestion(next: string) { dispatch({ type: "next-question", question: next }); setNotice("Next question ready. Request a new Meta design."); requestAnimationFrame(() => document.getElementById("demo-question")?.scrollIntoView({ block: "start", behavior: "smooth" })); }
  function reportFailure(task: string, detail: string, diagnostics?: RunDiagnostics) {
    if (diagnostics) dispatch({ type: "diagnostics", diagnostics });
    const designRecovery = /design expired|Design the experiment again/i.test(detail);
    const perceptionRecovery = /receipt|can no longer verify|perception result.*(?:restart|expir|unavailable)|re-analyze/i.test(detail);
    if (designRecovery) setUnavailableDesignId(design?.id);
    const target = designRecovery ? "demo-question" : task === "perception" || task === "stimulus" || perceptionRecovery ? "perception-source" : task === "design" ? "demo-question" : task === "interpret" ? "demo-understand" : "demo-watch";
    const summary = designRecovery ? "Experiment design expired. Design it again with the retained stimulus." : perceptionRecovery ? "Perception could not be verified. Re-analyze the video." : task === "design" ? "Meta experiment design failed. Retry." : task === "stimulus" ? "Unable to use this stimulus." : task === "perception" ? "Video analysis failed. Review & retry." : task === "interpret" ? "Meta interpretation failed. Retry." : "Experiment could not run. Retry.";
    const run_id = diagnostics?.manifest.run_id ?? design?.run_id ?? (task === "perception" ? perceptionSession.analysis?.perception.run_id : undefined);
    setError(detail); setErrorTarget(target); setFailure({ id: Date.now(), summary, detail, target, run_id, diagnostics });
  }
  function locateFailure() {
    if (!failure) return;
    navigate("observatory");
    if (failure.target === "perception-source") setPerceptionSession(current => ({ ...current, source: "perception", editing: /verify|restart|expiry|expired|unavailable/i.test(failure.detail) ? true : current.editing }));
    requestAnimationFrame(() => {
      const section = document.getElementById(failure.target);
      section?.scrollIntoView({ block: "start", behavior: "smooth" });
      section?.setAttribute("tabindex", "-1"); section?.focus({ preventScroll: true });
    });
  }
  async function execute(action: "design" | "run" | "interpret" | "stimulus", researchQuestion = question, stimulusAmplitude?: number, perceptionId?: string | null, receipt?: string) {
    if (inFlight.current || external || (action !== "design" && !design)) return;
    inFlight.current = true; setPending(action); setError(""); setErrorTarget(""); setFailure(undefined);
    const selectedId = perceptionId ?? (action === "design" && perceptionSession.source === "perception" ? perceptionSession.analysis?.perception.id : undefined);
    const selectedReceipt = receipt ?? (selectedId === perceptionSession.analysis?.perception.id ? perceptionSession.analysis?.receipt : undefined);
    try {
      const response = await fetch("/api/experiments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "design" ? { action, researchQuestion, ...(result?.analysis?.nextExperiment.researchQuestion === researchQuestion ? { nextFromId: design?.id } : {}), ...(selectedId ? { perceptionId: selectedId, ...(selectedReceipt ? { perceptionReceipt: selectedReceipt } : {}) } : {}) } : { action, id: design!.id, ...(action === "stimulus" ? { perceptionId: perceptionId ?? null, ...(selectedReceipt ? { perceptionReceipt: selectedReceipt } : {}) } : {}), ...(action === "run" && stimulusAmplitude !== undefined && stimulusAmplitude !== design!.spec.stimulus.amplitude ? { stimulusAmplitude } : {}) }) });
      const data = await response.json() as GuidedResponse;
      if (!data.ok) reportFailure(action, data.error, data.diagnostics);
      else if (!response.ok) reportFailure(action, "Request failed. Retained evidence is unchanged.");
      else if (action === "design" || action === "stimulus") { dispatch({ type: "designed", design: data.design }); setNotice(action === "stimulus" ? "Stimulus accepted into a fresh validated design. Approve to run; no experiment or interpretation has run yet." : "Design validated. Approve to run."); }
      else if (data.result) { dispatch(action === "run" ? { type: "completed", result: data.result, design: data.design, workspace: "observatory" } : { type: "interpreted", result: data.result, workspace: "observatory" }); setNotice(action === "run" ? "Measurement ready. Play control, then intervention." : "Interpretation ready. Choose the next test."); }
      if (data.ok && data.diagnostics) dispatch({ type: "diagnostics", diagnostics: data.diagnostics });
    } catch { reportFailure(action, "Unable to reach CausalFly. Retry the explicit action; retained evidence is unchanged."); }
    finally { inFlight.current = false; setPending(""); }
  }
  const analysisEnabled = Boolean(mode && fruitFlyAskedQuestion?.trim() && fruitFly.snapshot.evidence && fruitFly.snapshot.retentionId);
  function analyzeObservation() { if (analysisEnabled) void analyzeFruitFly(fruitFlyAskedQuestion!, fruitFly.snapshot, fruitFly.frames); }
  const needsDesign = !design || unavailableDesignId === design.id || question.trim() !== design.researchQuestion.trim();
  const pendingStimulus = perceptionSession.source === "perception" && perceptionSession.analysis?.perception.id !== design?.perceptionInput?.id ? perceptionSession.analysis : undefined;
  const nextLabel = external ? !fruitFlyAskedQuestion ? "Set Investigation Question" : !hasTelemetry ? "Connect / observe session" : !currentMeta ? "Review local interpretation" : "View proposed next experiment" : needsDesign ? pendingStimulus ? "Design experiment with this stimulus" : "Design with Meta" : pendingStimulus ? "Use as Experiment Stimulus" : !result ? "Approve & Run Experiment" : !result.analysis ? "Explain with Meta" : "View proposed next experiment";
  function nextAction() {
    if (external) {
      if (!fruitFlyAskedQuestion) { navigate("live"); requestAnimationFrame(() => document.getElementById("fruitfly-question")?.focus()); }
      else navigate(!hasTelemetry ? "live" : "scientist");
    }
    else if (needsDesign) { if (workspace === "observatory") void execute("design"); else navigate("observatory"); }
    else if (pendingStimulus) { if (workspace === "observatory") void execute("stimulus", question, undefined, pendingStimulus.perception.id, pendingStimulus.receipt); else navigate("observatory"); }
    else if (!result) { if (workspace === "observatory") void execute("run"); else navigate("observatory"); }
    else if (!result.analysis) void execute("interpret");
    else { navigate("observatory"); requestAnimationFrame(() => document.querySelector(".next-experiment")?.scrollIntoView({ block: "center", behavior: "smooth" })); }
  }
  const metaProps = { state: currentMeta || fruitFlyMeta.pending || fruitFlyMeta.error ? fruitFlyMeta : { pending: false }, enabled: analysisEnabled, onAnalyze: analyzeObservation };

  return <div className={`app-shell instrument-shell guided-shell${workspace === "live" ? " live-shell" : ""}`}>
    {failure && !external && <WorkflowErrorNotice key={failure.id} failure={failure} onDismiss={() => setFailure(undefined)} onLocate={locateFailure} />}
    <a href="#main" className="skip-link">Skip to workspace</a>
    <aside className="sidebar" aria-label="CausalFly navigation">
      <Link className="brand" href="/" aria-label="CausalFly home"><span>◈</span><span>Causal<span className="brand-accent">Fly</span><small>Scientific experiment<br />workbench</small></span></Link>
      <span className="sidebar-caption">RESEARCH WORKSPACE</span>
      <nav aria-label="Experiment workspaces">{navigation.map(view => <button key={view.id} type="button" aria-label={view.label} disabled={busy} aria-current={(workspace === view.id || view.id === "observatory" && ["compare", "scientist"].includes(workspace)) ? "page" : undefined} className={(workspace === view.id || view.id === "observatory" && ["compare", "scientist"].includes(workspace)) ? "active" : ""} onClick={() => { if (view.id === "live") selectSource("FRUITFLY_XR"); else if (view.id === "observatory") selectSource("SYNTHETIC_FIXTURE"); navigate(view.id); }}><span aria-hidden="true">{view.icon}</span><span>{view.label}</span></button>)}</nav>
      <DataSourcePanel source={source} snapshot={fruitFly.snapshot} disabled={busy} onSelect={selectSource} onConnect={fruitFly.connect} onDisconnect={fruitFly.disconnect} />
      {busy && <p className="trace-note">Navigation and source selection pause while the explicit experiment request completes.</p>}
      <div className="workflow-role-key"><span className="eyebrow">EVIDENCE FIRST</span><p className="cyan-text">◈ Engine measures</p><p className="amber-text">✧ Meta reasons</p><p>Ask CausalFly guides you through both.</p></div>
      <div className="sidebar-footer"><span className="sidebar-caption">META MUSE / RUNTIME</span><Badge tone={mode === "META LIVE" ? "amber" : "muted"}>{mode ?? "CONFIGURATION NEEDED"}</Badge><p>Designer · Interpreter · Next-experiment planner</p><small>Explicit requests only</small></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><span className="breadcrumb">{external ? "OBSERVATIONAL SESSION" : "CONTROLLED EXPERIMENT"} / {activeStage}</span><h1>{workspace === "evidence" ? "Evidence" : external ? "A brain map in motion." : workspace === "observatory" ? "CausalFly Experiment" : "Explore cause and effect."}</h1><p className="workflow-identity">{external ? "Watch a simulated brain. Ask what to test next." : "Change one signal. Measure the difference. Decide what to test next."}</p></div><div className="header-badges"><Badge tone={mode === "META LIVE" ? "amber" : "muted"}>{mode ?? "META CONFIGURATION NEEDED"}</Badge><Badge tone="cyan">{dataSources[source].label.toUpperCase()}</Badge></div></header>
      {(external || workspace !== "observatory") && <WorkflowProgress stages={stages} phase={phase} external={external} onNavigate={navigate} />}
      {workspace !== "observatory" && workspace !== "live" && <div className="workflow-next"><div><span className="eyebrow">{busy ? "REQUEST IN PROGRESS" : "NEXT"}</span><p>{busy ? `${pending.toUpperCase()} · ${pending === "run" ? "Deterministic engine only" : "Explicit model request"}` : nextLabel}</p></div><button type="button" className="primary-button" disabled={busy || !external && needsDesign && (!question.trim() || !mode) || !external && Boolean(result && !result.analysis && !mode)} aria-busy={busy} onClick={nextAction}><MetaRequestLabel pending={busy && pending !== "run"} task={pending === "design" ? "design" : "explain"}>{busy ? "Running experiment…" : nextLabel} ↗</MetaRequestLabel></button></div>}
      {external && fruitFlyAskedQuestion && workspace !== "evidence" && <p className="workflow-investigation"><span className="eyebrow">INVESTIGATION QUESTION{currentSession ? " / RETAINED SESSION" : " / AWAITING SESSION"}</span><span>{fruitFlyAskedQuestion}</span></p>}
      {!mode && <p className="workflow-notice">Meta configuration is required for design or interpretation. Existing measurements remain inspectable.</p>}
      {notice && <p className="workflow-notice" role="status">{notice}</p>}
      {error && <div className="error-panel" role="alert"><strong>Action could not complete</strong><p>{error}</p>{failure?.diagnostics ? <RunDiagnosticsDetails diagnostics={failure.diagnostics} /> : failure?.run_id && <details><summary>Run reference</summary><p>Run: <code>{failure.run_id}</code></p></details>}</div>}
      <main id="main" tabIndex={-1} className="main-content" aria-label={`${activeStage} workspace`}>
        {external ? <>
          {workspace === "compare" ? <CompareRequirements external onNext={() => navigate("evidence")} /> : workspace === "evidence" ? <><FruitFlyEvidenceView snapshot={fruitFly.snapshot} question={fruitFlyAskedQuestion} />{fruitFlyMeta.result && <details className="panel"><summary>Frozen Meta interpretation / proposal provenance</summary><p>Analysis belongs to session {fruitFlyMeta.result.evidence.sessionId}; inspect its exact frozen window.</p><pre>{JSON.stringify(fruitFlyMeta.result, null, 2)}</pre></details>}</> : workspace === "scientist" ? <FruitFlyScientist snapshot={fruitFly.snapshot} frames={fruitFly.frames} now={fruitFly.now} question={fruitFlyAskedQuestion} meta={metaProps} onLive={() => navigate("live")} onEvidence={() => navigate("evidence")} /> : <>
            <InvestigationQuestion question={fruitFlyQuestion} setQuestion={fruitFlyAskedQuestion} hasEvidence={hasTelemetry} onChange={question => dispatch({ type: "fruitfly-question", question })} onSet={() => dispatch({ type: "fruitfly-ask", question: fruitFlyQuestion, sessionId: currentSession })} />
            <LiveSessionWorkspace snapshot={fruitFly.snapshot} frames={fruitFly.frames} now={fruitFly.now} onEvidence={() => navigate("evidence")} onConnect={fruitFly.connect} onDisconnect={fruitFly.disconnect} onInterpret={() => { if (fruitFlyAskedQuestion) navigate("scientist"); else { document.getElementById("fruitfly-question")?.focus(); } }} />
            <p className="trace-note">XR PREVIEW · The current bridge supplies no video or image feed. Published soma geometry and received telemetry are shown above.</p>
          </>}
        </> : workspace === "live" ? <section className="panel"><h2>Observe a connectome simulation.</h2><p>Live Session uses the FruitFly XR read-only telemetry source. Your synthetic experiment stays retained when switching sources.</p><button type="button" className="primary-button" onClick={() => selectSource("FRUITFLY_XR")}>Select FruitFly XR ↗</button></section> : workspace === "compare" ? result ? <CompareDashboard key={design?.id ?? result.spec.id} result={result} onNext={useNextQuestion} onFullAnalysis={() => navigate("scientist")} onExplain={() => void execute("interpret")} explainDisabled={busy || !mode} explaining={pending === "interpret"} onEvidence={() => navigate("evidence")} /> : <CompareRequirements external={false} design={design} onNext={() => navigate("observatory")} /> : workspace === "scientist" ? result ? <ScientistView result={result} onNext={useNextQuestion} /> : <CompareRequirements external={false} design={design} onNext={() => navigate("observatory")} /> : workspace === "evidence" ? result ? <EvidenceView result={result} /> : <section className="panel evidence-purpose"><h2>Verify what happened.</h2><p>Engine measurements, source provenance and AI interpretation remain separate.</p><p>No experiment evidence retained yet.</p><button type="button" className="primary-button" onClick={() => navigate("observatory")}>Return to Experiment ↗</button></section> : <>
          <GuidedExperiment question={question} design={effectiveDesign} result={result} pending={pending} mode={mode}
            perceptionSession={perceptionSession} onPerceptionSession={setPerceptionSession}
            perceptionWorkflowError={errorTarget === "perception-source" ? error : undefined}
            actionError={error ? { target: errorTarget, detail: error } : undefined}
            onPerceptionFailure={(message, diagnostics) => reportFailure("perception", message, diagnostics)}
            onDesignPerception={(id, receipt) => void execute("design", question, undefined, id, receipt)}
            onStimulus={(id, receipt) => void execute("stimulus", question, undefined, id, receipt)}
            onPerceptionBusy={value => { inFlight.current = value; setPending(value ? "perception" : ""); if (value) { setError(""); setFailure(undefined); } }}
            onQuestion={question => dispatch({ type: "question", question })}
            onDemo={() => { dispatch({ type: "question", question: defaultQuestion }); void execute("design", defaultQuestion); }}
            onDesign={() => void execute("design")} onRun={strength => void execute("run", question, strength)} onExplain={() => void execute("interpret")}
            onNext={useNextQuestion} onCompare={() => navigate("compare")}
            onConnectome={() => { selectSource("FRUITFLY_XR"); navigate("live"); }} />
        </>}
      </main>
      <footer className="scientific-disclaimer">◇ {external ? "FruitFly XR · published connectome structure with simulated dynamics; not recordings from a living fly." : "Synthetic engineering fixture · not a biological model or Drosophila finding."}</footer>
    </div>
    <CausalFlyAssistant investigationQuestion={external ? fruitFlyAskedQuestion : undefined} pendingTask={pending} source={source} workspace={workspace} snapshot={fruitFly.snapshot} frames={fruitFly.frames} now={fruitFly.now} result={result} mode={mode} meta={fruitFlyMeta} busy={busy} onAnalyze={analyzeFruitFly} onNavigate={navigate} onSynthetic={() => selectSource("SYNTHETIC_FIXTURE")} onDesign={useNextQuestion} workflowContext={{ stage: activeStage, identity, next: nextLabel, onNext: nextAction }} onFullAnalysis={() => navigate("scientist")} />
  </div>;
}
