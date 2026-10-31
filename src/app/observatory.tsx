"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { DiagnosticVisibilityProvider } from "./components/diagnostic-visibility";
import type { GuidedResponse, WebStatus } from "@/lib/web/contracts";
import { workspaceReducer, type Workspace } from "@/lib/web/dashboard";
import { workflowProgress } from "@/lib/web/workflow-progress";
import { EvidenceView } from "./components/evidence-view";
import { DataSourcePanel, useFruitFlySource } from "./components/data-source-panel";
import { FruitFlyEvidenceView } from "./components/fruitfly-evidence";
import { LiveSessionWorkspace } from "./components/live-session";
import { GuidedExperiment } from "./components/guided-experiment";
import { FruitFlyScientist } from "./components/fruitfly-analysis";
import { CompareDashboard } from "./components/compare-dashboard";
import { ScientistView } from "./components/ai-scientist";
import { CompareRequirements } from "./components/guided-workflow";
import { fruitFlyExampleQuestion } from "@/lib/web/observational-question";
import { sessionStatus } from "@/lib/sources/live-session";
import { type DataSourceKind } from "@/lib/sources/contracts";
import { createObservationalAction } from "@/lib/web/observational-action";
import type { ObservationalMetaState } from "@/lib/web/observational-contracts";
import { CausalFlyAssistant } from "./components/causalfly-assistant";
import { InvestigationQuestion } from "./components/investigation-question";
import { MetaRequestLabel } from "./components/meta-request-label";
import { WorkflowErrorNotice, type WorkflowFailure } from "./components/workflow-error-notice";
import { initialPerceptionSession } from "@/lib/web/perception-session";
import type { FlyModelKind } from "@/lib/web/fly-model";
import type { RunDiagnostics } from "@/lib/web/flight-recorder-types";
import { RunDiagnosticsDetails } from "./components/experiment-trust";
import { HomeOverview } from "./components/home-overview";
import { WorkspaceNavigation } from "./components/workspace-navigation";
import { MetaStatus, FruitFlyStatus } from "./components/status-indicator";
import { LiveConnectomeProgress, liveStepAvailable, permittedLiveStep, type LiveConnectomeStep } from "./components/live-connectome-progress";
import { frameIdentity, investigationWindow, interpretationBelongsToObservation } from "@/lib/web/investigation";

const defaultQuestion = "What happens if I silence the primary pathway?";

export default function Observatory({ initialStatus }: { initialStatus: WebStatus }) {
  const [home, setHome] = useState(true);
  const [requestedLiveStep, setLiveStep] = useState<LiveConnectomeStep>("question");
  const [{ workspace, question, design, result, history, investigationId, nextFromId, observation, fruitFlyQuestion = fruitFlyExampleQuestion, fruitFlyAskedQuestion: retainedQuestion }, dispatch] = useReducer(workspaceReducer, { workspace: "observatory", question: defaultQuestion, result: null });
  const [syntheticAmplitude, setSyntheticAmplitude] = useState(1);
  const [flyModel, setFlyModel] = useState<FlyModelKind>("anatomical");
  const [pending, setPending] = useState("");
  const [source, setSource] = useState<DataSourceKind>("SYNTHETIC_FIXTURE");
  const fruitFly = useFruitFlySource(!home && workspace === "live" && source === "FRUITFLY_XR", initialStatus.researchConfigured === true);
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
  const activeObservation = investigationWindow(fruitFly.snapshot, fruitFly.frames, observation);
  const historicalFrames = fruitFly.frames.filter(frame => !activeObservation.frames.includes(frame));
  const hasTelemetry = Boolean(activeObservation.snapshot.evidence);
  const liveStep = permittedLiveStep(requestedLiveStep, Boolean(retainedQuestion), hasTelemetry);
  const connectionStatus = sessionStatus(fruitFly.snapshot, fruitFly.now ?? 0);
  const connectionLabel = fruitFly.snapshot.state === "ERROR" ? "CONNECTION ERROR" : fruitFly.snapshot.state === "CONNECTING" ? "CONNECTING" : connectionStatus.historical ? "LAST SNAPSHOT" : connectionStatus.live ? "CONNECTED" : connectionStatus.connected ? "WAITING FOR DATA" : "DISCONNECTED";
  const currentSession = fruitFly.snapshot.evidence?.telemetry.sessionId;
  const fruitFlyAskedQuestion = retainedQuestion;
  const currentMeta = interpretationBelongsToObservation(fruitFlyMeta.result, fruitFlyAskedQuestion, activeObservation.frames);
  const effectiveDesign = unavailableDesignId === design?.id ? undefined : design;
  const hasCurrentDesign = effectiveDesign?.researchQuestion.trim() === question.trim() && (Boolean(effectiveDesign?.perceptionInput) || effectiveDesign?.spec.stimulus.amplitude === syntheticAmplitude);
  const stages = workflowProgress({ external, workspace, question, design: effectiveDesign, result, hasTelemetry, hasQuestion: Boolean(fruitFlyAskedQuestion), hasMeta: Boolean(currentMeta), pending });
  const activeStage = !external && workspace === "observatory" ? pending === "perception" ? "INPUT" : pending === "design" ? "DESIGN" : pending === "run" ? "TEST" : pending === "interpret" || result?.analysis && hasCurrentDesign ? "UNDERSTAND" : result && hasCurrentDesign ? "TEST" : hasCurrentDesign ? "DESIGN" : "ASK" : workspace === "compare" ? "COMPARE" : workspace === "scientist" ? "INTERPRET" : workspace === "evidence" ? "EVIDENCE" : workspace === "live" ? "OBSERVE" : stages.find(s => s.state === "ACTIVE")?.label ?? "ASK / DESIGN";
  const identity = external ? `Investigation ${observation?.id ?? "not submitted"} / ${currentSession ?? "Awaiting session"}` : `Investigation ${investigationId ?? 0} / ${effectiveDesign?.spec.id ?? "Awaiting design"}`;
  const busy = Boolean(pending);
  useEffect(() => { if (currentSession) dispatch({ type: "fruitfly-session", sessionId: currentSession }); }, [currentSession]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [workspace]);
  useEffect(() => () => { if (perceptionSession.url) URL.revokeObjectURL(perceptionSession.url); }, [perceptionSession.url]);

  function navigate(next: Workspace) {
    setHome(false); setNotice("");
    if (external && next === "scientist") { setLiveStep("understand"); next = "live"; }
    dispatch({ type: "navigate", workspace: next });
  }
  function openWorkspace(next: Workspace) {
    if (next === "live") setSource("FRUITFLY_XR");
    if (next === "observatory") setSource("SYNTHETIC_FIXTURE");
    navigate(next);
  }
  function selectSource(next: DataSourceKind) {
    setSource(next); setError(""); setNotice("");
    if (!home && workspace !== "evidence") { setLiveStep("question"); navigate(next === "FRUITFLY_XR" ? "live" : "observatory"); }
  }
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
    const requestInvestigationId = action === "design" ? (investigationId ?? 0) + 1 : investigationId;
    if (action === "design") dispatch({ type: "begin", question: researchQuestion });
    inFlight.current = true; setPending(action); setError(""); setErrorTarget(""); setFailure(undefined);
    const selectedId = perceptionId ?? (action === "design" && perceptionSession.source === "perception" ? perceptionSession.analysis?.perception.id : undefined);
    const selectedReceipt = receipt ?? (selectedId === perceptionSession.analysis?.perception.id ? perceptionSession.analysis?.receipt : undefined);
    try {
      const response = await fetch("/api/experiments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "design" ? { action, researchQuestion, ...(!selectedId ? { stimulusAmplitude: stimulusAmplitude ?? syntheticAmplitude } : {}), ...(nextFromId ? { nextFromId } : {}), ...(selectedId ? { perceptionId: selectedId, ...(selectedReceipt ? { perceptionReceipt: selectedReceipt } : {}) } : {}) } : { action, id: design!.id, ...(action === "stimulus" ? { perceptionId: perceptionId ?? null, ...(selectedReceipt ? { perceptionReceipt: selectedReceipt } : {}) } : {}), ...(action === "run" && stimulusAmplitude !== undefined && stimulusAmplitude !== design!.spec.stimulus.amplitude ? { stimulusAmplitude } : {}) }) });
      const data = await response.json() as GuidedResponse;
      if (!data.ok) reportFailure(action, data.error, data.diagnostics);
      else if (!response.ok) reportFailure(action, "Request failed. Retained evidence is unchanged.");
      else if (action === "design" || action === "stimulus") { dispatch({ type: "designed", design: data.design, investigationId: requestInvestigationId }); setNotice(action === "stimulus" ? "Stimulus accepted into a fresh validated design. Approve to run; no experiment or interpretation has run yet." : "Design validated. Approve to run."); }
      else if (data.result) { dispatch(action === "run" ? { type: "completed", investigationId: requestInvestigationId, result: data.result, design: data.design, workspace: "observatory" } : { type: "interpreted", investigationId: requestInvestigationId, result: data.result, workspace: "observatory" }); setNotice(action === "run" ? "Measurement ready. Play control, then intervention." : "Interpretation ready. Choose the next test."); }
      if (data.ok && data.diagnostics) dispatch({ type: "diagnostics", diagnostics: data.diagnostics });
    } catch { reportFailure(action, "Unable to reach CausalFly. Retry the explicit action; retained evidence is unchanged."); }
    finally { inFlight.current = false; setPending(""); }
  }
  const analysisEnabled = Boolean(mode && fruitFlyAskedQuestion?.trim() && activeObservation.snapshot.evidence && activeObservation.snapshot.retentionId);
  function analyzeObservation() { if (analysisEnabled) void analyzeFruitFly(fruitFlyAskedQuestion!, activeObservation.snapshot, activeObservation.frames); }
  const needsDesign = !design || unavailableDesignId === design.id || question.trim() !== design.researchQuestion.trim() || !design.perceptionInput && design.spec.stimulus.amplitude !== syntheticAmplitude;
  const pendingStimulus = perceptionSession.source === "perception" && perceptionSession.analysis?.perception.id !== design?.perceptionInput?.id ? perceptionSession.analysis : undefined;
  const nextLabel = external ? !fruitFlyAskedQuestion ? "Set Investigation Question" : !hasTelemetry ? "Connect / observe session" : !currentMeta ? "Review local interpretation" : "View proposed next experiment" : needsDesign ? pendingStimulus ? "Design experiment with this stimulus" : "Design with Meta" : pendingStimulus ? "Use as Experiment Stimulus" : !result ? "Review experiment approval" : !result.analysis ? "Explain with Meta" : "View proposed next experiment";
  function nextAction() {
    if (external) {
      if (!fruitFlyAskedQuestion) { navigate("live"); requestAnimationFrame(() => document.getElementById("fruitfly-question")?.focus()); }
      else navigate(!hasTelemetry ? "live" : "scientist");
    }
    else if (needsDesign) { if (workspace === "observatory") void execute("design"); else navigate("observatory"); }
    else if (pendingStimulus) { if (workspace === "observatory") void execute("stimulus", question, undefined, pendingStimulus.perception.id, pendingStimulus.receipt); else navigate("observatory"); }
    else if (!result) { navigate("observatory"); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".scientist-action .embodied-run-action button")?.focus()); }
    else if (!result.analysis) void execute("interpret");
    else { navigate("observatory"); requestAnimationFrame(() => document.querySelector(".next-experiment")?.scrollIntoView({ block: "center", behavior: "smooth" })); }
  }
  const metaProps = { state: currentMeta || fruitFlyMeta.pending || fruitFlyMeta.error ? fruitFlyMeta : { pending: false }, enabled: analysisEnabled, onAnalyze: analyzeObservation };

  const primaryWorkspace = home ? undefined : workspace === "compare" || workspace === "scientist" ? external ? "live" : "observatory" : workspace;
  return <DiagnosticVisibilityProvider value={initialStatus.developerDiagnostics ?? false}><div className={`app-shell instrument-shell guided-shell workspace-shell${home ? " home-shell" : workspace === "live" ? " live-shell" : ""}${!home && !external && workspace === "observatory" ? " cockpit-shell" : ""}`}>
    {failure && !external && <WorkflowErrorNotice key={failure.id} failure={failure} onDismiss={() => setFailure(undefined)} onLocate={locateFailure} />}
    <a href="#main" className="skip-link">Skip to workspace</a>
    <aside className="sidebar" aria-label="CausalFly navigation">
      <Link className="brand" href="/" aria-label="CausalFly home" aria-current={home ? "page" : undefined} onClick={event => { event.preventDefault(); setHome(true); window.scrollTo({ top: 0, behavior: "instant" }); }}><span>◈</span><span>Causal<span className="brand-accent">Fly</span><small>Scientific experiment<br />workbench</small></span></Link>
      <span className="sidebar-caption">RESEARCH WORKSPACE</span>
      <WorkspaceNavigation active={primaryWorkspace} disabled={busy} onNavigate={openWorkspace} />
      <DataSourcePanel source={source} snapshot={fruitFly.snapshot} disabled={busy} onSelect={selectSource} onConnect={fruitFly.connect} onDisconnect={fruitFly.disconnect} />
      {busy && <p className="trace-note">Navigation and source selection pause while the explicit experiment request completes.</p>}
      <details className="sidebar-how"><summary>How CausalFly works</summary><p>CausalFly runs and measures controlled tests. Meta designs and interprets on request. Live connectome simulation supplies observational simulation data.</p></details>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><span className="breadcrumb">{home ? "CAUSALFLY / OVERVIEW" : workspace === "evidence" ? "RETAINED RECORDS / PROVENANCE" : external ? `LIVE CONNECTOME / ${liveStep.toUpperCase()}` : `CONTROLLED MODEL / ${activeStage}`}</span><h1>{home ? "Welcome to CausalFly" : workspace === "evidence" ? "Evidence" : external ? "A brain map in motion." : workspace === "observatory" ? "Research cockpit" : "Explore cause and effect."}</h1><p className="workflow-identity">{home ? "Ask → Test → Understand" : workspace === "evidence" ? "Measurements, source records and AI interpretation — traceable and separate." : external ? "Published structure · observational simulation telemetry" : "An AI scientist for embodied neural experiments."}</p></div><div className="header-badges"><MetaStatus mode={mode} disabled={initialStatus.metaDisabled} working={fruitFlyMeta.pending || ["design", "interpret"].includes(pending)} /><FruitFlyStatus snapshot={fruitFly.snapshot} now={fruitFly.now} /></div></header>
      {!home && external && workspace === "live" && <p className="workflow-notice" role="status"><strong>{connectionLabel}</strong> · {fruitFly.snapshot.message}</p>}
      {!home && workspace === "live" && <LiveConnectomeProgress step={liveStep} questionRetained={Boolean(fruitFlyAskedQuestion)} evidenceAvailable={hasTelemetry} onStep={step => { if (!liveStepAvailable(step, Boolean(fruitFlyAskedQuestion), hasTelemetry)) return; setLiveStep(step); if (step === "question") requestAnimationFrame(() => document.getElementById("fruitfly-question")?.focus()); }} />}
      {!home && workspace !== "evidence" && workspace !== "observatory" && workspace !== "live" && <div className="workflow-next"><div><span className="eyebrow">{busy ? "REQUEST IN PROGRESS" : "NEXT"}</span><p>{nextLabel}</p></div><button type="button" className="primary-button" disabled={busy || !mode} onClick={nextAction}><MetaRequestLabel pending={busy && pending !== "run"} task={pending === "design" ? "design" : "explain"}>{nextLabel} ↗</MetaRequestLabel></button></div>}
      {!mode && <p className="workflow-notice">Meta configuration is required for design or interpretation. Existing measurements remain inspectable.</p>}
      {!home && workspace === "observatory" && notice && <p className="workflow-notice" role="status">{notice}</p>}
      {error && <div className="error-panel" role="alert"><strong>Action could not complete</strong><p>{error}</p>{failure?.diagnostics ? <RunDiagnosticsDetails diagnostics={failure.diagnostics} /> : failure?.run_id && <details><summary>Run reference</summary><p>Run: <code>{failure.run_id}</code></p></details>}</div>}
      <main id="main" tabIndex={-1} className="main-content" aria-label={home ? "Home overview" : `${primaryWorkspace === "live" ? "Live Connectome" : activeStage} workspace`}>
        {home ? <HomeOverview disabled={busy} onOpen={openWorkspace} /> : external ? <>
          {workspace === "compare" ? <CompareRequirements external onNext={() => navigate("evidence")} /> : workspace === "evidence" ? <><p className="workflow-notice">{fruitFlyAskedQuestion ? `ACTIVE INVESTIGATION - ${fruitFlyAskedQuestion}` : "No question submitted"}{!hasTelemetry && " · No evidence observed for this question yet."}</p><FruitFlyEvidenceView snapshot={activeObservation.snapshot} question={fruitFlyAskedQuestion} />{historicalFrames.length > 0 && <details className="panel"><summary>HISTORICAL / RETAINED RECORDS · unrelated to the active question</summary><FruitFlyEvidenceView snapshot={{ ...fruitFly.snapshot, evidence: historicalFrames.at(-1)!, state: "DISCONNECTED", message: "Historical context only. No current activity is claimed." }} /></details>}{currentMeta && fruitFlyMeta.result && <details className="panel"><summary>Frozen Meta interpretation / proposal provenance</summary><p>Analysis belongs to session {fruitFlyMeta.result.evidence.sessionId}; inspect its exact frozen window.</p><pre>{JSON.stringify(fruitFlyMeta.result, null, 2)}</pre></details>}</> : liveStep === "understand" ? <FruitFlyScientist snapshot={activeObservation.snapshot} frames={activeObservation.frames} now={fruitFly.now} question={fruitFlyAskedQuestion} meta={metaProps} onLive={() => setLiveStep("observe")} onEvidence={() => navigate("evidence")} /> : <>
            <InvestigationQuestion question={fruitFlyQuestion} setQuestion={fruitFlyAskedQuestion} hasEvidence={hasTelemetry} onChange={question => dispatch({ type: "fruitfly-question", question })} onSet={() => { dispatch({ type: "fruitfly-ask", question: fruitFlyQuestion, sessionId: currentSession, startedAt: new Date().toISOString(), excluded: fruitFly.frames.map(frameIdentity) }); setFruitFlyMeta({ pending: false }); setLiveStep("observe"); }} />
            {fruitFly.snapshot.evidence && !hasTelemetry && <p className="workflow-notice">Retained telemetry is historical context for this question. Active observation requires a newly received frame.</p>}
            {liveStep === "observe" && fruitFlyAskedQuestion ? <LiveSessionWorkspace snapshot={fruitFly.snapshot} frames={fruitFly.frames} now={fruitFly.now} onEvidence={() => navigate("evidence")} onConnect={fruitFly.connect} onDisconnect={fruitFly.disconnect} onInterpret={() => setLiveStep("understand")} /> : <section className="panel"><p>Set an investigation question first. The research connection can receive data while you define the question; earlier frames will remain historical context.</p></section>}
            <p className="trace-note">XR PREVIEW · The current bridge supplies no video or image feed. Published soma geometry and received telemetry are shown above.</p>
          </>}
        </> : workspace === "live" ? <section className="panel"><h2>Observe a connectome simulation.</h2><p>Live Session uses the Live connectome simulation read-only telemetry source. Your synthetic experiment stays retained when switching sources.</p><button type="button" className="primary-button" onClick={() => selectSource("FRUITFLY_XR")}>Select Live connectome simulation ↗</button></section> : workspace === "compare" ? result ? <CompareDashboard key={design?.id ?? result.spec.id} result={result} onNext={useNextQuestion} onFullAnalysis={() => navigate("scientist")} onExplain={() => void execute("interpret")} explainDisabled={busy || !mode} explaining={pending === "interpret"} onEvidence={() => navigate("evidence")} /> : <CompareRequirements external={false} design={design} onNext={() => navigate("observatory")} /> : workspace === "scientist" ? result ? <ScientistView result={result} onNext={useNextQuestion} /> : <CompareRequirements external={false} design={design} onNext={() => navigate("observatory")} /> : workspace === "evidence" ? <>{result ? <>{Boolean(history?.length) && <p className="eyebrow">ACTIVE INVESTIGATION</p>}<EvidenceView result={result} /></> : <section className="panel evidence-purpose">{Boolean(history?.length) && <p className="eyebrow">ACTIVE INVESTIGATION</p>}<h2>Verify what happened.</h2><p className="submitted-question">{question}</p><p>Engine measurements, source provenance and AI interpretation remain separate.</p><p>This question has not been tested yet. Design and run this investigation to collect evidence.</p><button type="button" className="primary-button" onClick={() => navigate("observatory")}>Return to Experiment &#8599;</button></section>}{history?.map((record, index) => <details className="panel" key={index}><summary>HISTORICAL / RETAINED RECORDS - {record.result.researchQuestion}</summary><EvidenceView result={record.result} /></details>)}</> : <>
          <GuidedExperiment question={question} design={effectiveDesign} result={result} pending={pending} mode={mode} amplitude={syntheticAmplitude} onAmplitude={setSyntheticAmplitude} flyModel={flyModel} onFlyModel={setFlyModel}
            perceptionSession={perceptionSession} onPerceptionSession={setPerceptionSession}
            perceptionWorkflowError={errorTarget === "perception-source" ? error : undefined}
            actionError={error ? { target: errorTarget, detail: error } : undefined}
            onPerceptionFailure={(message, diagnostics) => reportFailure("perception", message, diagnostics)}
            onDesignPerception={(id, receipt) => void execute("design", question, undefined, id, receipt)}
            onStimulus={(id, receipt) => void execute("stimulus", question, undefined, id, receipt)}
            onPerceptionBusy={value => { inFlight.current = value; setPending(value ? "perception" : ""); if (value) { setError(""); setFailure(undefined); } }}
            onQuestion={question => dispatch({ type: "question", question })}
            onDemo={() => { void execute("design", defaultQuestion); }}
            onDesign={amplitude => void execute("design", question, amplitude)} onRun={strength => void execute("run", question, strength)} onExplain={() => void execute("interpret")}
            onNext={useNextQuestion} onCompare={() => navigate("compare")}
            onConnectome={() => { selectSource("FRUITFLY_XR"); navigate("live"); }} />
        </>}
      </main>
      {!home && <footer className="scientific-disclaimer">◇ {external ? "Live connectome simulation · published connectome structure with simulated dynamics; not recordings from a living fly." : "Synthetic engineering fixture · not a biological model or Drosophila finding."}</footer>}
    </div>
    {!home && <CausalFlyAssistant key={`${source}:${external ? observation?.id ?? 0 : `${investigationId ?? 0}:${design?.id ?? "no-design"}`}`} investigationQuestion={external ? fruitFlyAskedQuestion : undefined} pendingTask={pending} source={source} workspace={workspace} snapshot={activeObservation.snapshot} frames={activeObservation.frames} now={fruitFly.now} result={result} mode={mode} meta={fruitFlyMeta} busy={busy} onAnalyze={analyzeFruitFly} onNavigate={navigate} onSynthetic={() => selectSource("SYNTHETIC_FIXTURE")} onDesign={useNextQuestion} workflowContext={{ stage: activeStage, identity, next: nextLabel, onNext: nextAction }} onFullAnalysis={() => navigate("scientist")} />}
  </div></DiagnosticVisibilityProvider>;
}
