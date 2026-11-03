"use client";

import { useRef, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { ExecutionMode, GuidedDesign, MeasuredExperimentResult } from "@/lib/web/contracts";
import type { PerceptionSession } from "@/lib/web/perception-session";
import type { RunDiagnostics } from "@/lib/web/flight-recorder-types";
import { EmbodiedExperiment } from "./embodied-experiment";
import { ComparisonMeasurements } from "./compare-dashboard";
import { ScientistView } from "./ai-scientist";
import { EvidenceView } from "./evidence-view";
import { PerceptionPanel } from "./perception-panel";
import { CockpitReadouts, CockpitScientist, CompletedResultSummary } from "./research-cockpit";
import { ResearchQuestion } from "./research-question";
import { InfoTooltip, cockpitHelp } from "./info-tooltip";
import { stimulusDraft } from "@/lib/web/stimulus-draft";
import { nodeLabel } from "@/lib/web/display-labels";
import { guideViewportTo } from "@/lib/web/guided-scroll";
import type { FlyModelKind } from "@/lib/web/fly-model";
import type { InstrumentMode } from "@/lib/web/instrument-mode";
import type { ExperimentType } from "@/lib/experiment/types";
import { isStimulusResponse } from "@/lib/experiment/semantics";

function CompletedSetup({ complete, children }: { complete: boolean; children: ReactNode }) {
  return complete ? <details className="completed-setup"><summary>Review question, design & run settings</summary>{children}</details> : <>{children}</>;
}

interface Props {
  experimentType?: ExperimentType;
  onExperimentType?: (type:ExperimentType)=>void;
  onStimulusComparison?: ()=>void;
  question: string;
  design?: GuidedDesign;
  result: MeasuredExperimentResult | null;
  pending: string;
  mode: ExecutionMode | null;
  onQuestion: (question: string) => void;
  onPerceptionInference?: (active: boolean) => void;
  onDemo: () => void;
  onDesign: (amplitude?: number) => void;
  amplitude?: number;
  onAmplitude?: (amplitude: number) => void;
  flyModel?: FlyModelKind;
  onFlyModel?: (model: FlyModelKind) => void;
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
  onBrainControlStatus?: (available: boolean, detail: string) => void;
  instrumentMode?: InstrumentMode;
  onEvidence?: () => void;
}

/**
 * Guided Single-Page Experiment Journey:
 * QUESTION → DESIGN → RUN → COMPARE → INTERPRET → NEXT HYPOTHESIS
 *
 * Each stage is a section in one continuous workspace.
 * Exactly ONE dominant next action is prominent at every workflow state.
 * Completed stages collapse into concise summaries and can be reopened.
 */
export function GuidedExperiment(props: Props) {
  const { question, design, result, pending, mode } = props;
  const evidenceDetails = useRef<HTMLDetailsElement>(null);
  const analysisDetails = useRef<HTMLDetailsElement>(null);
  const [details, setDetails] = useState({ comparison: false, analysis: false, evidence: false });
  const [localAmplitude, setLocalAmplitude] = useState(1);
  const [autoPlay, setAutoPlay] = useState(false);
  const [questionEditing, setQuestionEditing] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);

  const busy = Boolean(pending);
  const retainedDesign = design?.researchQuestion.trim() === question.trim() && (!props.experimentType || (design.spec.experimentType ?? "NEURAL_INTERVENTION") === props.experimentType) ? design : undefined;
  const draft = stimulusDraft(retainedDesign, props.amplitude ?? localAmplitude);
  const currentDesign = draft.stale ? undefined : retainedDesign;
  const currentResult = currentDesign ? result : null;
  const strength = draft.amplitude;
  const realWorld = props.perceptionSession?.source === "perception" || Boolean(currentDesign?.perceptionInput);
  const perception = props.perceptionSession?.analysis?.perception ?? currentDesign?.perceptionInput;
  const perceived = Boolean(perception && currentDesign?.perceptionInput?.id === perception.id);

  const target = currentDesign
    ? nodeLabel(currentDesign.spec.perturbation?.targetNodeId ?? "unchanged network")
    : "Primary pathway";

  const nextTarget =
    currentResult?.analysis?.nextExperiment &&
    "proposedPerturbationTarget" in currentResult.analysis.nextExperiment &&
    currentResult.analysis.nextExperiment.proposedPerturbationTarget
      ? nodeLabel(currentResult.analysis.nextExperiment.proposedPerturbationTarget)
      : null;

  // Derived text updates the polite live region without a second render.
  const announcement = currentResult?.analysis ? "Interpretation complete. Next hypothesis ready." : currentResult ? "Matched experiment complete. Compare results." : currentDesign ? "Experiment design ready for review." : "";

  // Journey progress mapping
  const active =
    pending === "perception"
      ? "perceive"
      : pending === "design"
      ? "design"
      : pending === "run"
      ? "run"
      : pending === "interpret" || currentResult
      ? "understand"
      : currentDesign
      ? "run"
      : realWorld
      ? perceived
        ? "design"
        : "perceive"
      : "ask";

  const progress = [
    { id: "ask", label: "ASK", complete: Boolean(currentDesign), target: "demo-question", detail: "Research question" },
    { id: "perceive", label: "INPUT", complete: realWorld && perceived, target: "perception-source", detail: "Optional synthetic or video-derived experimental proxy" },
    { id: "design", label: "DESIGN", complete: Boolean(currentDesign), target: "demo-understand", detail: "Meta proposes" },
    { id: "run", label: "RUN", complete: Boolean(currentResult), target: "demo-watch", detail: "Engine measures" },
    { id: "understand", label: "UNDERSTAND", complete: Boolean(currentResult?.analysis), target: "demo-understand", detail: "Meta interprets" },
  ];

  function requestDesign() {
    props.onDesign(strength);
  }

  function approveRun() {
    setAutoPlay(true);
    props.onRun(strength);
  }

  function showDisclosure(ref: { current: HTMLDetailsElement | null }) {
    if (ref.current) ref.current.open = true;
    requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  const scientist = (
    <CockpitScientist
      design={currentDesign}
      result={currentResult}
      mode={mode}
      pending={pending}
      question={question}
      strength={strength}
      perception={realWorld ? perception : undefined}
      perceptionMode={realWorld}
      scene={props.perceptionSession?.scene}
      inputStale={draft.stale}
      questionEditing={questionEditing}
      onDesign={requestDesign}
      onRun={approveRun}
      onExplain={props.onExplain}
      onNext={props.onNext}
      onAnalysis={() => showDisclosure(analysisDetails)}
    />
  );

  const source = (
    <PerceptionPanel
      compact
      accepted={currentDesign?.perceptionInput}
      hasDesign={Boolean(currentDesign)}
      busy={busy}
      accepting={pending === "stimulus"}
      designing={pending === "design"}
      measured={Boolean(currentResult)}
      session={props.perceptionSession}
      onSession={props.onPerceptionSession}
      onFailure={props.onPerceptionFailure}
      workflowError={props.perceptionWorkflowError}
      onDesign={props.onDesignPerception}
      onRun={() => {
        const control = document.querySelector<HTMLButtonElement>(".scientist-action .embodied-run-action button");
        control?.focus();
      }}
      onBusy={props.onPerceptionBusy ?? (() => {})}
      onInference={props.onPerceptionInference}
      onUse={props.onStimulus ?? (() => {})}
    />
  );

  return (
    <div
      className="research-cockpit organism-first-cockpit guided-experiment-flow"
      data-measured={Boolean(currentResult)}
      data-perception-mode={realWorld}
      data-stage={active}
      data-instrument-mode={props.instrumentMode ?? "observe"}
    >
      {/* Accessible live region for state transitions (Requirement 4) */}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {/* ========================================================
          SECTION 1: QUESTION
          Progressive Disclosure: Collapses to concise summary when completed.
          ======================================================== */}
      <section className="cockpit-command persistent-question" id="demo-question" aria-label="Research question">
        <ResearchQuestion question={question} busy={busy} underTest={Boolean(currentDesign)} completed={Boolean(currentResult)} onUse={props.onQuestion} onEditing={setQuestionEditing} />
        <fieldset className="experiment-type-choice" disabled={busy}>
          <legend>WHAT DO YOU WANT TO CHANGE?</legend>
          <button type="button" aria-pressed={props.experimentType === "STIMULUS_RESPONSE"} onClick={()=>props.onExperimentType?.("STIMULUS_RESPONSE")}><strong>The environment</strong><small>Compare no stimulus with a stimulus.</small></button>
          <button type="button" aria-pressed={props.experimentType !== "STIMULUS_RESPONSE"} onClick={()=>props.onExperimentType?.("NEURAL_INTERVENTION")}><strong>The nervous system</strong><small>Keep the same stimulus and change one pathway.</small></button>
        </fieldset>
      </section>
      {currentResult && <CompletedResultSummary result={currentResult} onEvidence={props.onEvidence ?? (() => showDisclosure(evidenceDetails))} />}
      {props.experimentType !== "STIMULUS_RESPONSE" && strength === 0 && <section className="zero-stimulus-guard" aria-label="No evoked signal to compare"><strong>{currentResult ? "NO EVOKED SIGNAL TO COMPARE" : "NO STIMULUS SELECTED"}</strong><p>Both runs {currentResult ? "received" : "will receive"} stimulus 0.0. To measure a stimulus response, compare no stimulus with a positive stimulus on the unchanged network.</p><button type="button" className="secondary-button" disabled={busy} onClick={props.onStimulusComparison}>COMPARE NO STIMULUS VS STIMULUS →</button></section>}
      <CompletedSetup complete={Boolean(currentResult)}>
      {/* Progress Orientation (Requirement 5) */}
      <nav className="cockpit-progress" aria-label="Guided experiment progress">
        <ol>
          {progress.map((stage, i) => (
            <li key={stage.id} data-complete={stage.complete} data-active={active === stage.id}>
              <button
                type="button"
                aria-current={active === stage.id ? "step" : undefined}
                onClick={() => guideViewportTo(stage.target, "h2, h3, button")}
              >
                <span>{stage.complete ? "✓" : `0${i + 1}`}</span>
                <strong>{stage.label}</strong>
                <small>{stage.detail}</small>
              </button>
              {stage.label === "INPUT" && <InfoTooltip label="Input">{cockpitHelp.input}</InfoTooltip>}
            </li>
          ))}
        </ol>
      </nav>

      {!realWorld && (
        <p className="synthetic-input-note">
          Use a synthetic input, or choose video: Meta tracks the object; CausalFly derives an experimental proxy. Video is optional; external perception skipped / not required.
        </p>
      )}

      {props.actionError && ["demo-question", "demo-watch", "demo-understand"].includes(props.actionError.target) && (
        <p className="error-panel" id="experiment-action-error">
          {props.actionError.detail}
        </p>
      )}

      {/* ========================================================
          SECTION 2: EXPERIMENT DESIGN (COLLAPSED SUMMARY WHEN RUN)
          ======================================================== */}
      {currentDesign && currentResult && !designOpen && (
        <div className="guided-collapsed-summary design-collapsed-summary" id="demo-design-summary">
          <div className="summary-left">
            <span className="summary-status-tag">✓ Experiment design</span>
            <strong className="summary-text">
              {currentDesign && isStimulusResponse(currentDesign.spec) ? "No stimulus vs looming stimulus · identical network" : `One matched intervention: Silence ${target.toUpperCase()}`} · Stimulus amplitude {strength.toFixed(3)}
            </strong>
          </div>
          <button
            type="button"
            className="secondary-button summary-toggle-btn"
            onClick={() => setDesignOpen(true)}
            aria-expanded={false}
          >
            Inspect design
          </button>
        </div>
      )}

      {/* ========================================================
          SECTION 3: RUN EXPERIMENT (COLLAPSED SUMMARY WHEN IN COMPARE)
          ======================================================== */}
      {currentResult && props.instrumentMode === "compare" && !runOpen && (
        <div className="guided-collapsed-summary run-collapsed-summary" id="demo-watch-summary">
          <div className="summary-left">
            <span className="summary-status-tag">✓ Engine run</span>
            <strong className="summary-text">Control + intervention completed · Deterministic engine measured</strong>
          </div>
          <button
            type="button"
            className="secondary-button summary-toggle-btn"
            onClick={() => setRunOpen(true)}
            aria-expanded={false}
          >
            View run details
          </button>
        </div>
      )}

      </CompletedSetup>
      {/* Clear Completion Transition Card (Requirement 9) */}
      {currentResult && props.instrumentMode !== "compare" && (
        <div className="matched-complete-transition" role="region" aria-label="Matched experiment complete">
          <div className="transition-badge">
            <span className="check-mark">✓</span>
            <strong>MATCHED EXPERIMENT COMPLETE</strong>
          </div>
          <p className="transition-summary">
            Both runs finished. CausalFly measured output and threshold timing. Decoder-selected body movement is procedurally rendered.
          </p>
          <button
            type="button"
            className="primary-button dominant-cta compare-transition-btn"
            onClick={() => {
              props.onCompare();
              guideViewportTo("demo-result", "h2, .compare-heading");
            }}
          >
            Compare what changed →
          </button>
        </div>
      )}

      {/* Sprint 13C.2 Mobile Dominant Action: Question Retained / No Design */}
      {!currentDesign && !currentResult && (
        <div
          className="mobile-dominant-next-action question-next-action"
          role="region"
          aria-label="Mobile Next Action: Design Experiment"
        >
          <div className="action-card-header">
            <span className="action-badge cyan-badge">NEXT ACTION</span>
            <span className="action-step-label">02 / DESIGN</span>
          </div>
          <p className="action-instruction">
            Research question set. Request Meta AI to propose the single matched intervention.
          </p>
          <button
            type="button"
            className="primary-button dominant-cta mobile-design-cta"
            disabled={busy || !question.trim() || !mode}
            aria-busy={pending === "design"}
            onClick={requestDesign}
          >
            {busy ? "Designing test with Meta…" : "Design experiment with Meta →"}
          </button>
        </div>
      )}

      {/* Sprint 13C.2 Mobile Dominant Action: Design Validated / Awaiting Approval */}
      {currentDesign && !currentResult && (
        <div
          className="mobile-dominant-next-action design-next-action"
          role="region"
          aria-label="Mobile Next Action: Approve & Run Experiment"
        >
          <div className="action-card-header">
            <span className="action-badge gold-badge">NEXT ACTION</span>
            <span className="action-step-label">03 / APPROVE &amp; RUN</span>
          </div>
          <p className="action-instruction">
            Matched intervention designed: <strong>Silence {target.toUpperCase()}</strong>. Approve to run control vs intervention.
          </p>
          <button
            type="button"
            className="primary-button dominant-cta mobile-approve-cta"
            disabled={busy || draft.stale}
            aria-busy={pending === "run"}
            onClick={approveRun}
          >
            {busy ? "Running matched conditions…" : "Approve & Run Experiment →"}
          </button>
        </div>
      )}

      {/* Main Embodied Stage: Observe/Perturb or Compare */}
      {(!currentResult || props.instrumentMode !== "compare" || runOpen) && (
        <>
          <EmbodiedExperiment
            key={`${currentDesign?.id ?? "preview"}-${currentResult ? "recorded" : "draft"}`}
            result={currentResult}
            experimentType={props.experimentType}
            design={currentDesign}
            busy={busy}
            strength={strength}
            inputStale={draft.stale}
            flyModel={props.flyModel}
            onFlyModel={props.onFlyModel}
            autoPlay={autoPlay}
            scientist={scientist}
            source={source}
            onStrength={value => {
              setLocalAmplitude(value);
              props.onAmplitude?.(value);
            }}
            onRun={approveRun}
            onBrainControlStatus={props.onBrainControlStatus}
            instrumentMode={props.instrumentMode === "compare" ? "observe" : props.instrumentMode}
            onExplain={props.onExplain}
            onNext={props.onNext}
            onEvidence={props.onEvidence ?? (() => showDisclosure(evidenceDetails))}
            mode={mode}
          />
          {props.instrumentMode !== "compare" && (
            <CockpitReadouts result={currentResult} design={currentDesign} perceived={realWorld && perceived} />
          )}
          {runOpen && currentResult && (
            <div className="stage-done-row">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setRunOpen(false)}
              >
                Collapse run details
              </button>
            </div>
          )}
        </>
      )}

      {/* ========================================================
          SECTION 4: COMPARE RESULTS
          ======================================================== */}
      {currentResult && props.instrumentMode === "compare" && (
        <section
          className="guided-stage-section compare-stage-section"
          id="demo-result"
          data-stage="compare"
          aria-label="Section 4: Compare Results"
        >
          <EmbodiedExperiment
            key={`compare-${currentResult.researchQuestion}`}
            result={currentResult}
            experimentType={props.experimentType}
            design={currentDesign}
            busy={busy}
            strength={strength}
            inputStale={draft.stale}
            flyModel={props.flyModel}
            onFlyModel={props.onFlyModel}
            autoPlay={autoPlay}
            onStrength={value => {
              setLocalAmplitude(value);
              props.onAmplitude?.(value);
            }}
            onRun={approveRun}
            onBrainControlStatus={props.onBrainControlStatus}
            instrumentMode="compare"
            onExplain={props.onExplain}
            onNext={props.onNext}
            onEvidence={props.onEvidence ?? (() => showDisclosure(evidenceDetails))}
            mode={mode}
          />
        </section>
      )}

      {/* ========================================================
          SECTION 5: INTERPRETATION & NEXT HYPOTHESIS
          ======================================================== */}
      {currentResult?.analysis && (
        <section
          className="guided-stage-section interpret-stage-section"
          id="demo-understand-next"
          data-stage="interpret"
          aria-label="Section 5: Next Hypothesis"
        >
          <div className="guided-stage-header">
            <span className="stage-step-tag">SECTION 5 · NEXT HYPOTHESIS</span>
            <h2>What Should We Test Next?</h2>
            <span className="verified-signal">✓ INTERPRETATION RETAINED</span>
          </div>

          <div className="next-hypothesis-card">
            <span className="block-kicker">PROPOSED NEXT EXPERIMENT</span>
            <h3>&ldquo;{currentResult.analysis.nextExperiment.researchQuestion}&rdquo;</h3>
            {nextTarget && (
              <p className="hypothesis-target">Proposed intervention: Silence {nextTarget.toUpperCase()}</p>
            )}
          </div>

          {/* Dominant Next Action: Test Next Hypothesis (Requirement 1 & 7) */}
          <div className="guided-primary-action-card">
            <div className="action-card-copy">
              <span className="action-card-kicker">DOMINANT NEXT ACTION</span>
              <p>Adopt this hypothesis and start a new controlled experiment.</p>
            </div>
            <button
              type="button"
              className="primary-button dominant-cta next-hypothesis-btn"
              disabled={busy}
              onClick={() => props.onNext(currentResult.analysis!.nextExperiment.researchQuestion)}
            >
              Test the next hypothesis →
            </button>
          </div>
        </section>
      )}

      {/* Advanced Technical Disclosures & Provenance */}
      {currentResult && (
        <div className="cockpit-advanced" aria-label="Advanced experiment details">
          <details
            onToggle={event => {
              const open = event.currentTarget.open;
              setDetails(previous => ({ ...previous, comparison: open }));
            }}
          >
            <summary>View detailed comparison</summary>
            {details.comparison && (
              <ComparisonMeasurements
                result={currentResult}
                onEvidence={() => showDisclosure(evidenceDetails)}
              />
            )}
          </details>
          <details
            ref={analysisDetails}
            onToggle={event => {
              const open = event.currentTarget.open;
              setDetails(previous => ({ ...previous, analysis: open }));
            }}
          >
            <summary>VIEW TECHNICAL ANALYSIS</summary>
            {details.analysis && <ScientistView result={currentResult} onNext={props.onNext} />}
          </details>
          <details
            ref={evidenceDetails}
            onToggle={event => {
              const open = event.currentTarget.open;
              setDetails(previous => ({ ...previous, evidence: open }));
            }}
          >
            <summary>INSPECT EVIDENCE</summary>
            {details.evidence && <EvidenceView result={currentResult} />}
          </details>
        </div>
      )}

      {!currentDesign && result && (
        <div className="cockpit-retained">
          <span>PREVIOUS TEST RETAINED</span>
          <button type="button" className="text-button" disabled={busy} onClick={props.onCompare}>
            View previous comparison →
          </button>
        </div>
      )}

      <div className="cockpit-boundary">
        <p>
          CONTROLLED MODEL <InfoTooltip label="Controlled model">{cockpitHelp.model}</InfoTooltip> · Synthetic engineering fixture. REAL-FLY VALIDATION — Not established.{" "}
          <InfoTooltip label="Real-fly validation">{cockpitHelp.validation}</InfoTooltip>
        </p>
        <button
          className="text-button"
          type="button"
          disabled={busy}
          onClick={props.onConnectome}
        >
          Connectome observatory / simulated dynamics ↗
        </button>
      </div>
    </div>
  );
}
