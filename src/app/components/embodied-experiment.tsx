"use client";

import { AutonomyPanel } from "./autonomy-panel";
import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import type { GuidedDesign, MeasuredExperimentResult, ExecutionMode } from "@/lib/web/contracts";
import { playbackSteps, crossing } from "@/lib/web/dashboard";
import { advanceEmbodiedPlayback, embodiedFrame, embodimentAtStep, type EmbodiedPlayback } from "@/lib/web/embodiment";
import { nodeLabel, signalValue } from "@/lib/web/display-labels";
import { SyntheticNetworkViz } from "./synthetic-network-viz";
import { FixtureTopology } from "./observatory-preview";
import { ExperimentPlayback } from "./experiment-playback";
import { ActivityChart } from "./activity-chart";
import { InfoTooltip, cockpitHelp } from "./info-tooltip";
import type { FlyModelKind, FlyModelStatus } from "@/lib/web/fly-model";
import type { InstrumentMode } from "@/lib/web/instrument-mode";
import { resultSummary } from "@/lib/web/result-summary";

const World = dynamic(() => import("./embodied-world"), { ssr: false, loading: () => <div className="world-fallback">Preparing embodied world…</div> });

/** One world, two sequential conditions. Organism-first hierarchy with contextual action rail. */
export function EmbodiedExperiment({
  result,
  design,
  busy,
  strength,
  onStrength,
  onRun,
  autoPlay = false,
  scientist,
  source,
  inputStale = false,
  flyModel,
  onFlyModel,
  onBrainControlStatus,
  instrumentMode = "observe",
  onExplain,
  onEvidence,
  onNext,
  mode,
}: {
  result: MeasuredExperimentResult | null;
  design?: GuidedDesign;
  busy: boolean;
  strength: number;
  onStrength: (value: number) => void;
  onRun: () => void;
  autoPlay?: boolean;
  scientist?: ReactNode;
  source?: ReactNode;
  inputStale?: boolean;
  flyModel?: FlyModelKind;
  onFlyModel?: (model: FlyModelKind) => void;
  onBrainControlStatus?: (available: boolean, detail: string) => void;
  instrumentMode?: InstrumentMode;
  onExplain?: () => void;
  onEvidence?: () => void;
  onNext?: (question: string) => void;
  mode?: ExecutionMode | null;
}) {
  const steps = result ? playbackSteps(result.measuredEvidence.control, result.measuredEvidence.perturbed) : [];
  const isCompareMode = instrumentMode === "compare";
  const [playback, setPlayback] = useState<EmbodiedPlayback>(() => ({
    cursor: 0,
    playing: Boolean(result && autoPlay && typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches),
    pass: 0,
  }));
  const [autonomous, setAutonomous] = useState(true);
  const [compare, setCompare] = useState(false);
  const [compareFocus, setCompareFocus] = useState<"both" | "control" | "perturbed">("both");
  const [reset, setReset] = useState(0);
  const [localModel, setLocalModel] = useState<FlyModelKind>("anatomical");
  const model = flyModel ?? localModel;
  const [modelStatus, setModelStatus] = useState<FlyModelStatus>("loading");

  const effectiveCompare = isCompareMode || compare;
  const { index, step, condition } = embodiedFrame(steps, playback.cursor, effectiveCompare);
  const changed = inputStale || Boolean(design && strength !== design.spec.stimulus.amplitude);
  const perception = design?.perceptionInput;
  const selected = effectiveCompare ? (["control", "perturbed"] as const) : [condition];

  function selectModel(next: FlyModelKind) {
    setLocalModel(next);
    onFlyModel?.(next);
    setModelStatus(next === "anatomical" ? "loading" : "lightweight");
  }

  useEffect(() => {
    if (!playback.playing || !steps.length) return;
    const timer = window.setInterval(() => setPlayback(current => advanceEmbodiedPlayback(current, steps.length, effectiveCompare)), 1200);
    return () => window.clearInterval(timer);
  }, [playback.playing, steps.length, effectiveCompare]);

  function replay() {
    setAutonomous(false);
    setPlayback(current => ({ cursor: 0, playing: true, pass: current.pass + 1 }));
  }

  function resetView() {
    setAutonomous(false);
    setPlayback(current => ({ cursor: 0, playing: false, pass: current.pass + 1 }));
    setCompare(false);
    setCompareFocus("both");
    setReset(value => value + 1);
  }

  const target = result
    ? nodeLabel(result.spec.perturbation.targetNodeId)
    : design
    ? nodeLabel(design.spec.perturbation.targetNodeId)
    : "one pathway";
  const maxValue = result
    ? Math.max(1, ...[result.measuredEvidence.control, result.measuredEvidence.perturbed].flatMap(trial => trial.activity.flatMap(sample => Object.values(sample.nodes))))
    : 1;

  const summary = result ? resultSummary(result) : null;
  const controlStepState = result ? embodimentAtStep(result.measuredEvidence.control, step) : null;
  const perturbedStepState = result ? embodimentAtStep(result.measuredEvidence.perturbed, step) : null;
  const currentRecordedStep = result ? (condition === "control" ? controlStepState : perturbedStepState) : null;

  // ========================================================
  // 1. COMPARE MODE: Near-Full-Width Comparison Workspace
  // ========================================================
  if (isCompareMode) {
    return (
      <section
        className="embodied-experiment organism-first-workspace compare-workspace"
        aria-label="Embodied experiment"
        id="demo-watch"
        data-comparing={true}
        data-condition={condition}
        data-playing={playback.playing}
        data-instrument-mode="compare"
      >
        <header className="embodied-heading compare-heading">
          <div className="embodied-heading-main">
            <span className="eyebrow cyan-text">CONTROLLED COMPARISON WORKSPACE · WHAT CHANGED?</span>
            <h2>Control vs Intervention Analysis</h2>
          </div>
          <div className="embodied-heading-meta">
            <span className={result ? "verified-signal" : "idle-signal"}>
              {result ? "● MATCHED ENGINE EVIDENCE" : "○ AWAITING APPROVED TEST"}
            </span>
          </div>
        </header>

        {result ? (
          <>
            {/* Top of Stage: Prominent Synchronized Playback (Requirement 4 & 10, Sprint 13C.2 Row Grouping) */}
            <div className="compare-playback-container" aria-label="Synchronized comparison playback toolbar">
              {/* ROW 1: SAME STEP / BOTH RUNS & Synchronized playback explanation */}
              <div className="compare-toolbar-row compare-toolbar-context">
                <span className="compare-step-badge">SAME STEP / BOTH RUNS</span>
                <span className="compare-sync-context">
                  Synchronized playback — both runs are shown at the same simulation step.
                </span>
              </div>

              {/* ROW 2: Playback controls (Play/Pause, timeline scrubber, Simulation Step, Replay, Reset) */}
              <div className="compare-toolbar-row compare-toolbar-playback">
                <ExperimentPlayback
                  steps={steps}
                  index={index}
                  playing={playback.playing}
                  sequential={false}
                  onReplay={replay}
                  onReset={resetView}
                  onToggle={() => {
                    setAutonomous(false);
                    setPlayback(current =>
                      current.playing
                        ? { ...current, playing: false }
                        : { ...current, playing: true, cursor: current.cursor >= steps.length - 1 ? 0 : current.cursor }
                    );
                  }}
                  onSeek={next => {
                    setAutonomous(false);
                    setPlayback(current => ({ ...current, cursor: next, playing: false }));
                  }}
                />
              </div>

              {/* ROW 3: VIEW camera focus selector */}
              <div className="compare-focus-toolbar" role="group" aria-label="Organism camera focus">
                <span className="focus-label">VIEW:</span>
                {(["both", "control", "perturbed"] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    className={`focus-btn${compareFocus === f ? " active" : ""}`}
                    aria-pressed={compareFocus === f}
                    onClick={() => setCompareFocus(f)}
                  >
                    {f === "both" ? "Both side-by-side" : f === "control" ? "01 Control only" : "02 Intervention only"}
                  </button>
                ))}
              </div>
            </div>

            {/* Near-Full-Width Comparison Stage: Single WebGL Canvas (Requirement 1, 2, 5) */}
            <div className="compare-stage" aria-label="Organism comparison stage">
              <div className="compare-condition-readouts">
                {/* Overlaid DOM Cards for Control and Intervention (Requirement 2 & 3) */}
                <div className="compare-overlay control-overlay" aria-label="Control Organism State">
                  <div className="overlay-badge">
                    <span className="overlay-dot cyan-dot" aria-hidden="true" />
                    <strong>01 / CONTROL</strong>
                  </div>
                  <span className="overlay-subtitle">Network unchanged</span>
                  <div className="overlay-metrics">
                    <div className="overlay-metric-row">
                      <span className="overlay-metric-label">RECORDED BEHAVIOUR</span>
                      <b className="cyan-text">{controlStepState?.thresholdReached ? "ESCAPE" : "WALK"}</b>
                    </div>
                    <div className="overlay-metric-row">
                      <span className="overlay-metric-label">MEASURED STATE</span>
                      <span>Output {signalValue(controlStepState?.output)}</span>
                    </div>
                    <div className="overlay-metric-row">
                      <span className="overlay-metric-label">THRESHOLD</span>
                      <small>{controlStepState?.thresholdReached ? "✓ Reached" : "Below threshold"}</small>
                    </div>
                  </div>
                </div>

                <div className="compare-overlay intervention-overlay" aria-label="Intervention Organism State">
                  <div className="overlay-badge">
                    <span className="overlay-dot magenta-dot" aria-hidden="true" />
                    <strong>02 / INTERVENTION</strong>
                  </div>
                  <span className="overlay-subtitle">Silence {target.toUpperCase()}</span>
                  <div className="overlay-metrics">
                    <div className="overlay-metric-row">
                      <span className="overlay-metric-label">RECORDED BEHAVIOUR</span>
                      <b className="magenta-text">{perturbedStepState?.thresholdReached ? "ESCAPE" : "WALK"}</b>
                    </div>
                    <div className="overlay-metric-row">
                      <span className="overlay-metric-label">MEASURED STATE</span>
                      <span>Output {signalValue(perturbedStepState?.output)}</span>
                    </div>
                    <div className="overlay-metric-row">
                      <span className="overlay-metric-label">THRESHOLD</span>
                      <small>{perturbedStepState?.thresholdReached ? "✓ Reached" : "Below threshold"}</small>
                    </div>
                  </div>
                </div>

              </div>
              <div className="compare-arena" data-focus={compareFocus}>
                <World
                  result={result}
                  previewStrength={strength}
                  step={step}
                  reset={reset}
                  compare={true}
                  focus={compareFocus}
                  condition="control"
                  playing={playback.playing}
                  pulseKey={`${playback.pass}-compare-${step}`}
                  model={model}
                  onModelStatus={setModelStatus}
                />

                {/* Stimulus indicator & controls over canvas */}
                <div className="world-stimulus-label">
                  LOOMING STIMULUS{" "}
                  <span>
                    {step === 0 && result.spec.stimulus.amplitude > 0
                      ? "STEP 0 / INPUT PULSE"
                      : "PULSE COMPLETE"}
                  </span>
                </div>
                <button
                  type="button"
                  className="world-reset-view text-button"
                  aria-label="Reset View"
                  onClick={() => setReset(v => v + 1)}
                >
                  Reset View
                </button>
                <span className="world-orbit-hint">DRAG TO ORBIT · SCROLL TO ZOOM</span>
              </div>
            </div>

            {/* Primary Difference / Result Hero (Requirement 6) */}
            <div className="compare-hero-result" id="demo-result" aria-label="Primary difference and result hero">
              <div className="hero-result-header">
                <div className="hero-kicker-group">
                  <span className="eyebrow cyan-text">WHAT CHANGED?</span>
                  <h2>{summary?.signal ?? "Measurement Complete"}</h2>
                  <p className="hero-headline">{summary?.headline}</p>
                </div>
                <div className="hero-badge-group">
                  <span className="hero-provenance-tag">ENGINE MEASURED · DETERMINISTIC</span>
                </div>
              </div>

              {/* Compact Difference Summary (Requirement 7) */}
              <div className="compact-difference-summary">
                <table className="difference-table" aria-label="Compact measured difference summary">
                  <thead>
                    <tr>
                      <th scope="col">MEASURED METRIC</th>
                      <th scope="col" className="cyan-col">CONTROL (INTACT)</th>
                      <th scope="col" className="magenta-col">INTERVENTION (SILENCE {target.toUpperCase()})</th>
                      <th scope="col" className="delta-col">MEASURED DELTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Peak Normalized Output</th>
                      <td className="cyan-text">{result.measuredEvidence.control.outputPeakActivity.toFixed(3)}</td>
                      <td className="magenta-text">{result.measuredEvidence.perturbed.outputPeakActivity.toFixed(3)}</td>
                      <td className="delta-text">
                        {summary?.percentage !== null && summary?.percentage !== undefined
                          ? `${summary.percentage > 0 ? "+" : ""}${summary.percentage.toFixed(0)}% normalized peak output`
                          : "No baseline"}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Threshold Crossing</th>
                      <td>{result.measuredEvidence.control.outcome === "THRESHOLD_REACHED" ? "Reached (Escape)" : "Not reached (Grounded)"}</td>
                      <td>{result.measuredEvidence.perturbed.outcome === "THRESHOLD_REACHED" ? "Reached (Escape)" : "Not reached (Grounded)"}</td>
                      <td>{result.measuredEvidence.deltas.outcomeChanged ? "Escape blocked under intervention" : "Outcome unchanged"}</td>
                    </tr>
                    <tr>
                      <th scope="row">Response Step</th>
                      <td>{crossing(result.measuredEvidence.control.outputThresholdCrossingStep)}</td>
                      <td>{crossing(result.measuredEvidence.perturbed.outputThresholdCrossingStep)}</td>
                      <td>{summary?.response ?? "Timing unchanged"}</td>
                    </tr>
                    <tr>
                      <th scope="row">Motor Execution</th>
                      <td>{result.measuredEvidence.control.outcome === "THRESHOLD_REACHED" ? "Takeoff escape" : "Grounded walk"}</td>
                      <td>{result.measuredEvidence.perturbed.outcome === "THRESHOLD_REACHED" ? "Takeoff escape" : "Grounded walk"}</td>
                      <td>{result.measuredEvidence.deltas.outcomeChanged ? "Changed from Escape to Grounded" : "Motor execution unchanged"}</td>
                    </tr>
                  </tbody>
                </table>
                <small className="difference-note">
                  Simulation steps · not biological time. Hand-authored engineering fixture · not biological Drosophila recordings.
                </small>
              </div>

              {/* Compact Meta AI Action (Requirement 11) */}
              <div className="compare-meta-action-deck" aria-label="Meta AI Interpretation">
                <div className="meta-action-copy">
                  <span className="eyebrow amber-text">EXPLAIN WITH META</span>
                  <h4>Engine measured. Meta interprets on explicit request.</h4>
                  <p>
                    {result.analysis
                      ? result.analysis.interpretation
                      : "Interpretation is optional. Review deterministic measurements above, or request AI interpretation."}
                  </p>
                </div>
                <div className="meta-action-controls">
                  {!result.analysis ? (
                    <button
                      type="button"
                      className="primary-button explain-meta-btn"
                      disabled={busy || !mode}
                      onClick={onExplain}
                    >
                      {busy ? "Interpreting..." : "Explain with Meta ↗"}
                    </button>
                  ) : (
                    <div className="meta-analysis-ready">
                      <span className="validated-text">✓ INTERPRETATION RETAINED</span>
                      {onNext && result.analysis.nextExperiment && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onNext?.(result.analysis!.nextExperiment.researchQuestion)}
                        >
                          Use Next Test ↗
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Neural System Comparison (Requirement 8) */}
            <div className="compare-neural-section" aria-label="Neural system comparison">
              <div className="cockpit-region-title">
                <div className="signals-title-group">
                  <span className="neural-glyph" aria-hidden="true">∿</span>
                  <h3>NEURAL SYSTEM COMPARISON</h3>
                </div>
                <span className="cyan-text">CONTROLLED MODEL · SYNTHETIC FIXTURE</span>
              </div>
              <p className="fixture-disclosure">
                Hand-authored engineering fixture. Not a biological Drosophila circuit.
              </p>
              <div className="compare-neural-grid">
                <article className="compare-neural-card control">
                  <header>
                    <span className="circuit-tag cyan-text">01 / CONTROL (INTACT CIRCUIT)</span>
                    <span className="circuit-metric">
                      OUTPUT AT STEP {step}: <b>{signalValue(controlStepState?.output)}</b>
                    </span>
                  </header>
                  <SyntheticNetworkViz
                    trial={result.measuredEvidence.control}
                    step={step}
                    playing={playback.playing}
                  />
                </article>
                <article className="compare-neural-card perturbed">
                  <header>
                    <span className="circuit-tag magenta-text">
                      02 / INTERVENTION (SILENCE {target.toUpperCase()})
                    </span>
                    <span className="circuit-metric">
                      OUTPUT AT STEP {step}: <b>{signalValue(perturbedStepState?.output)}</b>
                    </span>
                  </header>
                  <SyntheticNetworkViz
                    trial={result.measuredEvidence.perturbed}
                    step={step}
                    playing={playback.playing}
                  />
                </article>
              </div>
            </div>

            {/* Causal Pipeline (Requirement 9) */}
            <div className="causal-pipeline compare-pipeline" aria-label="Causal Pipeline">
              <div className="causal-pipeline-title">
                <span className="causal-glyph">⟡</span>
                <strong>CAUSAL PIPELINE · WHAT CHANGED?</strong>
                <small>SIMULATION STEP · NOT BIOLOGICAL TIME</small>
              </div>
              <div className="causal-pipeline-flow">
                <article className="causal-stage stimulus-stage">
                  <header>
                    <span className="causal-stage-glyph">⤢</span>
                    <span>STIMULUS</span>
                  </header>
                  <strong>Looming Stimulus</strong>
                  <p>Amplitude: {result.spec.stimulus.amplitude.toFixed(3)}</p>
                  <small>Identical in both runs</small>
                </article>
                <span className="causal-arrow" aria-hidden="true">→</span>
                <article className="causal-stage neural-stage">
                  <header>
                    <span className="causal-stage-glyph">∿</span>
                    <span>NEURAL RESPONSE</span>
                  </header>
                  <strong>Silence {target.toUpperCase()}</strong>
                  <p>Peak: {result.measuredEvidence.perturbed.outputPeakActivity.toFixed(3)} (norm)</p>
                  <small>Control: {result.measuredEvidence.control.outputPeakActivity.toFixed(3)}</small>
                </article>
                <span className="causal-arrow" aria-hidden="true">→</span>
                <article className="causal-stage decision-stage">
                  <header>
                    <span className="causal-stage-glyph">⚖</span>
                    <span>DECISION</span>
                  </header>
                  <strong>{result.measuredEvidence.deltas.outcomeChanged ? "Threshold Blocked" : "Threshold Reached"}</strong>
                  <p>Control: {crossing(result.measuredEvidence.control.outputThresholdCrossingStep)}</p>
                  <small>Intervention: {crossing(result.measuredEvidence.perturbed.outputThresholdCrossingStep)}</small>
                </article>
                <span className="causal-arrow" aria-hidden="true">→</span>
                <article className="causal-stage motor-stage">
                  <header>
                    <span className="causal-stage-glyph">⇲</span>
                    <span>MOTOR OUTPUT</span>
                  </header>
                  <strong>{result.measuredEvidence.deltas.outcomeChanged ? "Escape → Grounded" : "Takeoff Escape"}</strong>
                  <p>{result.measuredEvidence.deltas.outcomeChanged ? "Motor altered by intervention" : "Motor execution unchanged"}</p>
                  <small>Procedural controller</small>
                </article>
              </div>
            </div>

            {/* Matched Conditions / Experiment Trust (Requirement 10) */}
            <div className="compare-trust-card" aria-label="Matched conditions and experiment trust">
              <div className="trust-card-header">
                <div className="trust-title-group">
                  <span className="trust-glyph">✓</span>
                  <h4>MATCHED CONDITIONS</h4>
                </div>
                <span className="trust-motto">ONE DECLARED CHANGE. EVERYTHING ELSE HELD CONSTANT.</span>
              </div>
              <div className="matched-checks-grid">
                <div className="matched-check-item">
                  <span className="check-mark">✓</span>
                  <span>Matched stimulus: {result.spec.stimulus.amplitude.toFixed(3)}</span>
                </div>
                <div className="matched-check-item">
                  <span className="check-mark">✓</span>
                  <span>Matched network: {result.measuredEvidence.control.provenance.network.id}</span>
                </div>
                <div className="matched-check-item">
                  <span className="check-mark">✓</span>
                  <span>Matched seed: {result.spec.seed}</span>
                </div>
                <div className="matched-check-item">
                  <span className="check-mark">✓</span>
                  <span>Matched engine: {result.measuredEvidence.control.provenance.engineVersion}</span>
                </div>
                <div className="matched-check-item">
                  <span className="check-mark">✓</span>
                  <span>Matched maxSteps: {result.spec.maxSteps}</span>
                </div>
                <div className="matched-check-item">
                  <span className="check-mark">✓</span>
                  <span>Matched output threshold: {result.spec.outputThreshold}</span>
                </div>
                <div className="matched-check-item highlight-item">
                  <span className="check-mark">★</span>
                  <span>Only declared perturbation differs: Silence {target}</span>
                </div>
              </div>
              {onEvidence && (
                <div className="trust-evidence-link">
                  <button type="button" className="text-button" onClick={onEvidence}>
                    Inspect complete provenance &amp; evidence ↗
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="compare-awaiting-state" aria-label="Awaiting experiment result">
            <div className="awaiting-icon" aria-hidden="true">⚭</div>
            <h3>Awaiting Completed Experiment</h3>
            <p>Matched intervention comparison requires a completed experiment. Observe the baseline organism or perturb a pathway first.</p>
            <div className="compare-arena preview-arena">
              <World
                result={null}
                previewStrength={strength}
                step={0}
                reset={reset}
                compare={false}
                condition="control"
                playing={false}
                pulseKey="preview"
                model={model}
                onModelStatus={setModelStatus}
              />
            </div>
          </div>
        )}

        <footer className="embodied-caption">
          <span>Autonomy is a separate experimental controller; recorded measurements remain unchanged.</span>
          <details>
            <summary>Show how we measured this</summary>
            <p>Stimulus strength sets ExperimentSpec.stimulus.amplitude for both trials after explicit approval and server validation. The declared step-zero pulse is illustrated as an approaching, expanding object; approach phase is presentation, not a measured trajectory. Current recorded output maps to displacement (0.4 scene units), lift (0.18), pitch (0.1 radians), wing opening (0.08), and a ground-ring indicator. Poses ease visually; readouts are never interpolated. Missing samples remain unknown. Node brightness uses recorded activity; edge emphasis requires adjacent recorded samples and declared weights. Anatomy and arena are illustrative, not biological simulation.</p>
            <p>High-fidelity Drosophila visual embodiment. Visual mesh source: female Drosophila anatomical model. Neural source when connected to the live connectome brain server: published male CNS connectome. The visual embodiment is not sex-matched to the connectome. No male anatomical modifications were made. This cockpit measures a separate deterministic synthetic network; no neural anatomy is inferred inside the fly.</p>
            <p>FlyBody model by the FlyBody contributors, developed by Google DeepMind and HHMI Janelia Research Campus; Vaxenburg et al. (2025). Underlying mesh and FruitFly XR FlyV2 asset predate the hackathon; the web derivative and integration were created during the hackathon. Wild-type-inspired PBR appearance is authored, not measured biological optical/material data. <a href="/models/flyv2/NOTICE.txt" target="_blank" rel="noreferrer">Attribution &amp; modifications</a> · <a href="/models/flyv2/LICENSE-FlyBody.txt" target="_blank" rel="noreferrer">Apache-2.0 license</a>. The anatomical model loads without a procedural preview. Lightweight is an explicit visual choice and the automatic fallback if anatomical loading fails.</p>
          </details>
        </footer>
      </section>
    );
  }

  // ========================================================
  // 2. OBSERVE & PERTURB MODES: Approved Sprint 13B Layout
  // ========================================================
  return (
    <section
      className="embodied-experiment organism-first-workspace"
      data-view={autonomous ? "autonomous" : "recorded"}
      aria-label="Embodied experiment"
      id="demo-watch"
      data-comparing={compare}
      data-condition={condition}
      data-playing={playback.playing}
      data-instrument-mode={instrumentMode}
    >
      <header className="embodied-heading">
        <div className="embodied-heading-main">
          <span className="eyebrow cyan-text">CONTROLLED MODEL / SYNTHETIC NETWORK</span>
          <h2>See behavior. Compare one intervention.</h2>
        </div>
        <div className="embodied-heading-meta">
          <span className={result ? "verified-signal" : "idle-signal"}>
            {result ? "● RECORDED ENGINE DATA" : "○ AWAITING APPROVED TEST"}
          </span>
        </div>
      </header>

      {/* Primary Embodied Stage: Large Embodied World + Contextual Action Rail */}
      <div className="embodied-stage">
        {/* Dominant Embodied World Column (approx 62% width on desktop) */}
        <div className="embodied-world-column">
          <div className="cockpit-region-title">
            <div className="region-title-badge">
              <span className="organism-glyph" aria-hidden="true">◈</span>
              <h3>EMBODIED WORLD</h3>
            </div>
            <div className="world-mode-toolbar">
              <div className="fly-model-toggle" role="group" aria-label="Fly model">
                <span>Fly model:</span>
                {(["anatomical", "lightweight"] as const).map(kind => (
                  <button key={kind} type="button" aria-pressed={model === kind} onClick={() => selectModel(kind)}>
                    {kind === "anatomical" ? "Anatomical" : "Lightweight"}
                  </button>
                ))}
              </div>
              <div className="autonomy-mode" role="group" aria-label="Embodiment mode">
                <button type="button" aria-pressed={autonomous} onClick={() => setAutonomous(true)}>
                  Autonomous world
                </button>
                <button
                  type="button"
                  aria-pressed={!autonomous}
                  disabled={!result}
                  title={!result ? "Run an approved experiment to retain signal playback." : "Recorded approved signals, not a retained movement trajectory. Use Replay recorded experiment for motion."}
                  onClick={() => setAutonomous(false)}
                >
                  Recorded signal view
                </button>
              </div>
            </div>
          </div>

          {autonomous ? (
            <AutonomyPanel model={model} onModelStatus={setModelStatus} onBrainControlStatus={onBrainControlStatus} />
          ) : (
            <>
            <div className="embodied-arena" data-model-choice={model} data-model-status={modelStatus}>
              {model === "anatomical" && modelStatus === "loading" && <p className="anatomical-loading" role="status">Loading anatomical model…</p>}
              {model === "anatomical" && modelStatus === "fallback" && <p className="anatomical-loading" role="status">Anatomical model unavailable · Lightweight fallback</p>}
              <World
                result={result}
                previewStrength={strength}
                step={step}
                reset={reset}
                compare={compare}
                fitComparisonToPanel
                condition={condition}
                playing={playback.playing}
                pulseKey={`${playback.pass}-${condition}-${step}`}
                model={model}
                onModelStatus={setModelStatus}
              />
            </div>
              <div className="recorded-viewport-tools">
              <button type="button" className="world-reset-view text-button" aria-label="Reset View" onClick={() => setReset(value => value + 1)}>
                Reset View
              </button>
              <div className="world-stimulus-label">
                LOOMING STIMULUS <span>{result ? step === 0 && result.spec.stimulus.amplitude > 0 ? "STEP 0 / INPUT PULSE" : "PULSE COMPLETE" : "PLANNED INPUT / NOT MEASURED"}</span>
              </div>
              <span className="world-orbit-hint">DRAG TO ORBIT · SCROLL TO ZOOM</span>
              </div>
            <div className="recorded-world-instruments">
              <div className="world-condition-labels">
                {selected.map(run => (
                  <span key={run} data-run={run}>
                    {run === "control" ? "01 / CONTROL" : "02 / INTERVENTION"}
                    <small>{run === "control" ? "Network unchanged" : `Silence ${target}`}</small>
                  </span>
                ))}
              </div>

              {/* Recorded Behaviour Readout Chip */}
              <div className="recorded-behaviour-chip" aria-live="off">
                <div className="readout-behaviour-card">
                  <span className="readout-label">RECORDED BEHAVIOUR</span>
                  <b className="readout-state-value">{currentRecordedStep?.thresholdReached ? "ESCAPE" : "WALK"}</b>
                </div>
                <div className="readout-source-card">
                  <span className="readout-label">DECISION SOURCE</span>
                  <span className="readout-source-value">{condition === "control" ? "Intact network baseline" : `Intervention: Silence ${target}`}</span>
                </div>
                <div className="readout-motor-card">
                  <span className="readout-label">MOTOR EXECUTION</span>
                  <span className="readout-motor-value">CausalFly procedural controller ({currentRecordedStep?.thresholdReached ? "Takeoff / escape" : "Grounded"})</span>
                </div>
                <div className="readout-telemetry-strip">
                  <span>Step {String(step).padStart(2, "0")}</span>
                  <span>Output {signalValue(currentRecordedStep?.output)}</span>
                  <span>{currentRecordedStep?.thresholdReached ? "Threshold Reached" : "Below Threshold"}</span>
                </div>
              </div>

            </div>
            </>
          )}
        </div>

        {/* Contextual Action Rail (approx 38% width on desktop) */}
        <div className="embodied-context-rail" aria-label="Experiment context and actions">
          <div className="context-rail-header">
            <span className="rail-kicker">{instrumentMode === "perturb" ? "INTERVENTION INSPECTOR" : "EXPERIMENT CONTEXT"}</span>
            <h4>{instrumentMode === "perturb" ? "Controlled Perturbation" : "Sensory Input & Observation"}</h4>
          </div>

          {/* Stimulus & Input Control */}
          <div className="embodied-inputs">
            <div className="stimulus-control">
              <div className="stimulus-label">
                <label htmlFor="stimulus-strength">{perception ? "EXPERIMENTAL PROXY" : "STIMULUS STRENGTH"}</label>
                <InfoTooltip label="Stimulus strength">{cockpitHelp.stimulus}</InfoTooltip>
                <output>{strength.toFixed(3)}</output>
              </div>
              {perception ? (
                <output id="stimulus-strength" className="measured-stimulus" aria-label="Experimental proxy">
                  {strength.toFixed(3)} · MEASURED / LOCKED
                </output>
              ) : (
                <input
                  id="stimulus-strength"
                  aria-label="Stimulus strength"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={strength}
                  disabled={busy}
                  onChange={event => onStrength(Number(event.target.value))}
                />
              )}
              <small role="status">
                {perception
                  ? "Video geometry proxy · not biologically calibrated"
                  : changed
                  ? "INPUT CHANGED — REDESIGN REQUIRED"
                  : design
                  ? `Engine input amplitude · ${result ? "recorded" : "ready to run"}`
                  : "Choose input, then Design with Meta"}
              </small>
            </div>

            {perception && (
              <div className="world-perception-source">
                PERCEPTION SOURCE: {perception.mode === "SAM LIVE" ? "META SAM 3.1" : "OFFLINE SAM FIXTURE"}
                <span>{perception.concept} → visual expansion → {perception.measurement.amplitude.toFixed(3)} experimental proxy → {result ? "recorded engine response" : "awaiting approval"}</span>
              </div>
            )}
            {source}

            <div className="context-intervention-deck">
              <div className="intervention-deck-summary">
                <span className="intervention-deck-label">TARGET PATHWAY</span>
                <strong className={design ? "orange-text" : "cyan-text"}>
                  {design ? `Silence ${target.toUpperCase()}` : "Intact Network (Baseline)"}
                </strong>
                <small>Same input · only one pathway changes</small>
              </div>

              {!scientist && (
                <div className="embodied-run-action">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!design || busy || changed}
                    aria-busy={busy}
                    onClick={() => {
                      setPlayback(current => ({ ...current, cursor: 0, playing: false }));
                      onRun();
                    }}
                  >
                    {!design ? "Design test first" : busy ? "Request in progress…" : changed ? "Redesign required" : result ? "Run experiment" : "Approve & Run Experiment"}
                  </button>
                  <small>{perception ? "SAM geometry → CausalFly proxy → approved matched runs" : "Same input · only one pathway changes"}</small>
                </div>
              )}

              <button
                type="button"
                className="compare-runs-toggle secondary-button"
                disabled={!result}
                aria-pressed={compare}
                onClick={() => {
                  setAutonomous(false);
                  setCompare(value => !value);
                  setPlayback(current => ({ ...current, cursor: index, playing: false }));
                }}
              >
                {compare ? "Single fly" : "Compare runs"}
              </button>
            </div>
          </div>

          {/* Meta AI Scientist action rail */}
          {scientist}
        </div>
      </div>

      {/* Current State / Neural Instrumentation: Spanning full width directly below stage */}
      <div className="embodied-signals" aria-label="Neural topology and activity">
        <div className="cockpit-region-title">
          <div className="signals-title-group">
            <span className="neural-glyph" aria-hidden="true">∿</span>
            <h3>NEURAL SYSTEM</h3>
          </div>
          <span className="cyan-text">CONTROLLED MODEL · SYNTHETIC FIXTURE</span>
        </div>
        <div className="signal-title">
          <span>RECORDED SIGNAL <InfoTooltip label="Recorded signal">{cockpitHelp.signal}</InfoTooltip></span>
          <small>{result ? `STEP ${String(step).padStart(2, "0")} / PLAYBACK` : "TOPOLOGY PREVIEW"}</small>
        </div>

        {result ? (
          <div className="signals-recorded-grid">
            {selected.map(run => {
              const trial = result.measuredEvidence[run];
              const state = embodimentAtStep(trial, step);
              return (
                <article key={run} className={`embodied-signal ${run}`}>
                  <header>
                    <span>{run === "control" ? "CONTROL" : `INTERVENTION / SILENCE ${target.toUpperCase()}`}</span>
                    <span>
                      OUTPUT <b title={state.output?.toString()}>{signalValue(state.output)}</b>{" "}
                      <small>{state.thresholdReached === null ? "NO SAMPLE" : state.thresholdReached ? "✓ THRESHOLD" : "BELOW THRESHOLD"}</small>
                    </span>
                  </header>
                  <div className="signal-viz-row">
                    <SyntheticNetworkViz trial={trial} step={step} playing={playback.playing} />
                    {!compare && <ActivityChart compact trial={trial} step={step} maxStep={Math.max(1, ...steps)} maxValue={maxValue} />}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="embodied-preview">
            <FixtureTopology />
            <p>STIMULUS → PATHWAYS → OUTPUT</p>
            <small>Design preview · no measured activity yet. Hand-authored engineering fixture · not biological.</small>
            <div className="network-preview-instrument">
              <span>CONTROL <b>INTACT NETWORK</b></span>
              <span>INTERVENTION <b>{design ? `SILENCE ${target.toUpperCase()}` : "AWAITING DESIGN"}</b></span>
              <span>MEASUREMENT <b>PEAK OUTPUT + RESPONSE STEP</b></span>
            </div>
          </div>
        )}

        {result && (
          <div className="embodied-condition-switch" role="group" aria-label="Select recorded condition">
            <span>{compare ? "SAME STEP / BOTH RUNS" : "PLAYBACK: CONTROL → INTERVENTION"}</span>
            {(["control", "perturbed"] as const).map((run, i) => (
              <span key={run} className="condition-option" data-run={run}>
                <button
                  type="button"
                  aria-pressed={!compare && condition === run}
                  disabled={compare}
                  onClick={() => {
                    setAutonomous(false);
                    setPlayback(current => ({ cursor: i * steps.length, playing: false, pass: current.pass + 1 }));
                  }}
                >
                  {i ? "Intervention" : "Control"}
                </button>
                <InfoTooltip label={i ? "Intervention" : "Control"}>
                  {i ? cockpitHelp.intervention : cockpitHelp.control}
                </InfoTooltip>
              </span>
            ))}
            <small>Same fly representation · separate experiment conditions</small>
          </div>
        )}
      </div>

      {result ? (
        <ExperimentPlayback
          steps={steps}
          index={index}
          playing={playback.playing}
          sequential={!compare}
          onReplay={replay}
          onReset={resetView}
          onToggle={() => {
            setAutonomous(false);
            setPlayback(current =>
              current.playing
                ? { ...current, playing: false }
                : { ...current, playing: true, cursor: current.cursor >= steps.length * (compare ? 1 : 2) - 1 ? 0 : current.cursor }
            );
          }}
          onSeek={next => {
            setAutonomous(false);
            setPlayback(current => ({
              ...current,
              cursor: (condition === "perturbed" && !compare ? steps.length : 0) + next,
              playing: false,
            }));
          }}
        />
      ) : (
        <div className="embodied-awaiting">
          META DESIGNS <span>→</span> YOU APPROVE <span>→</span> CONTROL <span>→</span> INTERVENTION
        </div>
      )}

      <footer className="embodied-caption">
        <span>Autonomy is a separate experimental controller; recorded measurements remain unchanged.</span>
        <details>
          <summary>Show how we measured this</summary>
          <p>Stimulus strength sets ExperimentSpec.stimulus.amplitude for both trials after explicit approval and server validation. The declared step-zero pulse is illustrated as an approaching, expanding object; approach phase is presentation, not a measured trajectory. Current recorded output maps to displacement (0.4 scene units), lift (0.18), pitch (0.1 radians), wing opening (0.08), and a ground-ring indicator. Poses ease visually; readouts are never interpolated. Missing samples remain unknown. Node brightness uses recorded activity; edge emphasis requires adjacent recorded samples and declared weights. Anatomy and arena are illustrative, not biological simulation.</p>
          <p>High-fidelity Drosophila visual embodiment. Visual mesh source: female Drosophila anatomical model. Neural source when connected to the live connectome brain server: published male CNS connectome. The visual embodiment is not sex-matched to the connectome. No male anatomical modifications were made. This cockpit measures a separate deterministic synthetic network; no neural anatomy is inferred inside the fly.</p>
          <p>FlyBody model by the FlyBody contributors, developed by Google DeepMind and HHMI Janelia Research Campus; Vaxenburg et al. (2025). Underlying mesh and FruitFly XR FlyV2 asset predate the hackathon; the web derivative and integration were created during the hackathon. Wild-type-inspired PBR appearance is authored, not measured biological optical/material data. <a href="/models/flyv2/NOTICE.txt" target="_blank" rel="noreferrer">Attribution &amp; modifications</a> · <a href="/models/flyv2/LICENSE-FlyBody.txt" target="_blank" rel="noreferrer">Apache-2.0 license</a>. The anatomical model loads without a procedural preview. Lightweight is an explicit visual choice and the automatic fallback if anatomical loading fails.</p>
        </details>
      </footer>
    </section>
  );
}
