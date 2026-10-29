"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { GuidedDesign, MeasuredExperimentResult } from "@/lib/web/contracts";
import { playbackSteps } from "@/lib/web/dashboard";
import { advanceEmbodiedPlayback, embodiedFrame, embodimentAtStep, type EmbodiedPlayback } from "@/lib/web/embodiment";
import { nodeLabel } from "@/lib/web/display-labels";
import { SyntheticNetworkViz } from "./synthetic-network-viz";
import { FixtureTopology } from "./observatory-preview";
import { ExperimentPlayback } from "./experiment-playback";

const World = dynamic(() => import("./embodied-world"), { ssr: false, loading: () => <div className="world-fallback">Preparing embodied world…</div> });

/** One world, two sequential conditions. All readouts share the recorded playback cursor. */
export function EmbodiedExperiment({ result, design, busy, strength, onStrength, onRun, autoPlay = false }: {
  result: MeasuredExperimentResult | null; design?: GuidedDesign; busy: boolean;
  strength: number; onStrength: (value: number) => void; onRun: () => void; autoPlay?: boolean;
}) {
  const steps = result ? playbackSteps(result.measuredEvidence.control, result.measuredEvidence.perturbed) : [];
  const [playback, setPlayback] = useState<EmbodiedPlayback>(() => ({ cursor: 0, playing: Boolean(result && autoPlay && typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches), pass: 0 }));
  const [compare, setCompare] = useState(false);
  const [reset, setReset] = useState(0);
  const { index, step, condition } = embodiedFrame(steps, playback.cursor, compare);
  const changed = Boolean(design && strength !== design.spec.stimulus.amplitude);
  const selected = compare ? ["control", "perturbed"] as const : [condition];
  useEffect(() => {
    if (!playback.playing || !steps.length) return;
    const timer = window.setInterval(() => setPlayback(current => advanceEmbodiedPlayback(current, steps.length, compare)), 1200);
    return () => window.clearInterval(timer);
  }, [playback.playing, steps.length, compare]);
  function replay() { setPlayback(current => ({ cursor: 0, playing: true, pass: current.pass + 1 })); }
  function resetView() { setPlayback(current => ({ cursor: 0, playing: false, pass: current.pass + 1 })); setCompare(false); setReset(value => value + 1); }
  const target = design ? nodeLabel(design.spec.perturbation.targetNodeId) : "one pathway";
  return <section className="embodied-experiment" aria-label="Embodied experiment" id="demo-watch" data-comparing={compare} data-condition={condition}>
    <header className="embodied-heading"><div><span className="eyebrow cyan-text">WEB EMBODIMENT / LOOMING STIMULUS</span><h2>One fly. Two controlled runs.</h2></div><span className={result ? "verified-signal" : "idle-signal"}>{result ? "● RECORDED ENGINE DATA" : "○ AWAITING APPROVED TEST"}</span></header>
    <div className="embodied-inputs">
      <div className="stimulus-control"><label htmlFor="stimulus-strength">STIMULUS STRENGTH <output>{strength.toFixed(2)}</output></label><input id="stimulus-strength" aria-label="Stimulus strength" type="range" min="0" max="1" step="0.05" value={strength} disabled={!design || busy} onChange={event => onStrength(Number(event.target.value))} /><small role="status">{changed ? `Next run: ${strength.toFixed(2)} · displayed evidence unchanged` : design ? `Engine input amplitude · ${result ? "recorded" : "ready to run"}` : "Design with Meta to unlock"}</small></div>
      <div className="embodied-run-action"><button type="button" className="primary-button" disabled={!design || busy} aria-busy={busy} onClick={() => { setPlayback(current => ({ ...current, cursor: 0, playing: false })); onRun(); }}>{!design ? "Design test first" : busy ? "Request in progress…" : result ? changed ? "Approve & run new input" : "Run experiment" : "Approve & Run Experiment"}</button><small>{changed || design?.stimulusOverride ? "Meta design · stimulus set by you" : "Same input · only one pathway changes"}</small></div>
      <button type="button" className="compare-runs-toggle secondary-button" disabled={!result} aria-pressed={compare} onClick={() => { setCompare(value => !value); setPlayback(current => ({ ...current, cursor: index, playing: false })); }}>{compare ? "Single fly" : "Compare runs"}</button>
    </div>
    <div className="embodied-stage">
      <div className="embodied-arena"><World result={result} step={step} reset={reset} compare={compare} condition={condition} playing={playback.playing} pulseKey={`${playback.pass}-${condition}-${step}`} /><div className="world-stimulus-label">APPROACHING STIMULUS <span>{result ? step === 0 && result.spec.stimulus.amplitude > 0 ? "STEP 0 / INPUT PULSE" : "PULSE COMPLETE" : "AWAITING RUN"}</span></div><div className="world-condition-labels">{selected.map(run => <span key={run} data-run={run}>{run === "control" ? "01 / CONTROL" : "02 / INTERVENTION"}<small>{run === "control" ? "Network unchanged" : `Silence ${target}`}</small></span>)}</div><span className="world-orbit-hint">DRAG TO ORBIT · SCROLL TO ZOOM</span></div>
      <div className="embodied-signals"><div className="signal-title"><span>RECORDED SIGNAL</span><small>{result ? `STEP ${String(step).padStart(2, "0")}` : "TOPOLOGY PREVIEW"}</small></div>{result ? selected.map(run => {
        const trial = result.measuredEvidence[run], state = embodimentAtStep(trial, step);
        return <article key={run} className={`embodied-signal ${run}`}><header><span>{run === "control" ? "CONTROL" : "INTERVENTION"}</span><span>OUTPUT <b>{state.output ?? "—"}</b> <small>{state.thresholdReached === null ? "NO SAMPLE" : state.thresholdReached ? "✓ THRESHOLD" : "BELOW THRESHOLD"}</small></span></header><SyntheticNetworkViz trial={trial} step={step} /></article>;
      }) : <div className="embodied-preview"><FixtureTopology /><p>STIMULUS → PATHWAYS → OUTPUT</p><small>Design preview · no measured activity yet.</small></div>}</div>
    </div>
    {result ? <>
      <div className="embodied-condition-switch" role="group" aria-label="Select recorded condition"><span>{compare ? "SAME STEP / BOTH RUNS" : "PLAYBACK: CONTROL → INTERVENTION"}</span>{(["control", "perturbed"] as const).map((run, i) => <button key={run} type="button" aria-pressed={!compare && condition === run} disabled={compare} onClick={() => setPlayback(current => ({ cursor: i * steps.length, playing: false, pass: current.pass + 1 }))}>{i ? "Intervention" : "Control"}</button>)}<small>Same fly representation · separate experiment conditions</small></div>
      <ExperimentPlayback steps={steps} index={index} playing={playback.playing} sequential={!compare} onReplay={replay} onReset={resetView} onToggle={() => setPlayback(current => current.playing ? { ...current, playing: false } : { ...current, playing: true, cursor: current.cursor >= steps.length * (compare ? 1 : 2) - 1 ? 0 : current.cursor })} onSeek={next => setPlayback(current => ({ ...current, cursor: (condition === "perturbed" && !compare ? steps.length : 0) + next, playing: false }))} />
    </> : <div className="embodied-awaiting">META DESIGNS <span>→</span> YOU APPROVE <span>→</span> CONTROL <span>→</span> INTERVENTION <button type="button" className="text-button" onClick={resetView}>Reset view</button></div>}
    <footer className="embodied-caption"><span>Visual embodiment of synthetic output.</span><details><summary>Show how we measured this</summary><p>Stimulus strength sets ExperimentSpec.stimulus.amplitude for both trials after explicit approval and server validation. The declared step-zero pulse is illustrated as an approaching, expanding object; approach phase is presentation, not a measured trajectory. Current recorded output maps to displacement (0.4 scene units), lift (0.18), pitch (0.1 radians), wing opening (0.08), and a ground-ring indicator. Poses ease visually; readouts are never interpolated. Missing samples remain unknown. Node brightness uses recorded activity; edge emphasis requires adjacent recorded samples and declared weights. Anatomy and arena are illustrative, not biological simulation.</p></details></footer>
  </section>;
}
