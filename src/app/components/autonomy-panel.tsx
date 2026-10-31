"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AutonomyEngine, MAX_TICKS, behaviourSourceLabels, scheduledStimulus, sense, type AutonomyFrame } from "@/lib/web/autonomy";
import { phenotypeSummary, recordedPath } from "@/lib/web/autonomy-presentation";
import { AutonomyTrajectoryReplay } from "@/lib/web/autonomy-replay";
import { autonomyRecording } from "@/lib/web/autonomy-recorder";
import { ExperimentalBrainAdapter } from "@/lib/sources/fruitfly-closed-loop";
import type { FruitFlySnapshot } from "@/lib/sources/contracts";
import type { FlyModelKind, FlyModelStatus } from "@/lib/web/fly-model";
import { InfoTooltip } from "./info-tooltip";

const World = dynamic(() => import("./embodied-world"), { ssr: false, loading: () => <div className="world-fallback">Preparing autonomous world…</div> });

export function AutonomyPanel({ model = "anatomical", onModelStatus, snapshot }: { model?: FlyModelKind; onModelStatus?: (status: FlyModelStatus) => void; snapshot?: FruitFlySnapshot }) {
  const [viewReset, setViewReset] = useState(0);
  const [modelStatus, setModelStatus] = useState<FlyModelStatus>("loading");
  const reportModelStatus = useCallback((status: FlyModelStatus) => { setModelStatus(status); onModelStatus?.(status); }, [onModelStatus]);
  const [session, setSession] = useState(0);
  const [paused, setPaused] = useState(false);
  const [trial, setTrial] = useState(false);
  const [matched, setMatched] = useState(false);
  const [brainInput, setBrainInput] = useState(false);
  const [frames, setFrames] = useState<(AutonomyFrame | null)[]>([null]);
  const [retained, setRetained] = useState<AutonomyFrame[][]>([]);
  const [transportStatus, setTransportStatus] = useState("");
  const [replay, setReplay] = useState<{ cursor: number; length: number; playing: boolean } | null>(null);
  const [retainedCount, setRetainedCount] = useState(0);
  const engines = useRef<AutonomyEngine[]>([]);
  const adapter = useRef<ExperimentalBrainAdapter | null>(null);
  const player = useRef<AutonomyTrajectoryReplay | null>(null);
  const latestSnapshot = useRef(snapshot);
  const pausedRef = useRef(false);
  const pulseAt = useRef(60);
  const [pulseTick, setPulseTick] = useState(60);
  const frame = frames[0];
  const external = Boolean(snapshot);
  useEffect(() => { latestSnapshot.current = snapshot; }, [snapshot]);
  useEffect(() => {
    const started = Date.now(), mode = trial ? "trial" : "exploration";
    const runs = [new AutonomyEngine({ source: external ? "fruitfly" : "synthetic", mode }, started)];
    if (matched && !external) runs.push(new AutonomyEngine({ silenced: true, mode }, started));
    engines.current = runs; pulseAt.current = 60; player.current = null;
    let active = true, previous = performance.now(), lastPaint = -1;
    const brain = brainInput && external ? new ExperimentalBrainAdapter(drive => {
      if (!active) return;
      if (drive) runs[0].acceptBrain(drive); else runs[0].disconnect();
    }) : null;
    adapter.current = brain;
    const timer = window.setInterval(() => {
      const now = performance.now(), elapsed = (now - previous) / 1000; previous = now;
      const playback = player.current;
      if (playback) {
        if (!document.hidden) playback.advance(elapsed);
      } else {
        for (const run of runs) {
          if (run.complete) continue;
          run.setPaused(pausedRef.current || document.hidden);
          if (external && !brain) run.observe(latestSnapshot.current!, Date.now());
          run.advance(elapsed, tick => scheduledStimulus(tick, pulseAt.current));
        }
        if (brain && !pausedRef.current && !document.hidden && !runs[0].complete) {
          const stimulus = scheduledStimulus(runs[0].tick, pulseAt.current);
          brain.publish(sense(runs[0].state, runs[0].config.arena, stimulus), stimulus);
        }
      }
      if (now - lastPaint >= 100) {
        lastPaint = now;
        setFrames(playback ? playback.frames : runs.map(run => run.frame));
        setRetained(runs.map(run => run.trajectory()));
        if (playback) setReplay({ cursor: playback.cursor, length: playback.length, playing: playback.playing });
        else setRetainedCount(runs[0].tick === 0 ? 0 : (runs[0].tick - 1) % MAX_TICKS + 1);
        setTransportStatus(brain?.status ?? "");
      }
    }, 25);
    return () => { active = false; window.clearInterval(timer); brain?.close(); };
  }, [session, matched, brainInput, external, trial]);
  function togglePause() {
    const next = !paused; pausedRef.current = next; setPaused(next);
    for (const run of engines.current) run.setPaused(next);
    if (next && brainInput) adapter.current?.close("Paused; start a new brain session to reconnect experimental input");
  }
  function reset() {
    pausedRef.current = false; setPaused(false); player.current = null; setReplay(null);
    setPulseTick(60); setRetainedCount(0); setRetained([]); setFrames([null]); setSession(value => value + 1);
  }
  function startMode(controlled: boolean, compare = false) { setTrial(controlled); setMatched(compare); reset(); }
  function enterReplay() {
    const retained = new AutonomyTrajectoryReplay(engines.current.map(run => run.trajectory()));
    if (!retained.available) return;
    for (const run of engines.current) run.setPaused(true);
    pausedRef.current = true; setPaused(true); adapter.current?.close("Replay mode; neural input disconnected");
    player.current = retained; setFrames(retained.frames);
    setReplay({ cursor: 0, length: retained.length, playing: false });
  }
  function toggleReplay() {
    const current = player.current; if (!current) return;
    if (current.cursor === current.length - 1) current.restart();
    current.playing = !current.playing;
    setReplay({ cursor: current.cursor, length: current.length, playing: current.playing });
  }
  function restartReplay() {
    const current = player.current; if (!current) return;
    current.restart(); setFrames(current.frames); setReplay({ cursor: 0, length: current.length, playing: false });
  }
  function exitReplay() { player.current = null; setReplay(null); setFrames(engines.current.map(run => run.frame)); }
  function exportEvidence() {
    const recording = autonomyRecording(engines.current.map(run => run.evidence()), adapter.current?.evidence() ?? null);
    const url = URL.createObjectURL(new Blob([JSON.stringify(recording, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "causalfly-autonomy-evidence.json";
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const complete = !replay && trial && (frame?.tick ?? 0) >= MAX_TICKS;
  const outcomes = retained.map(run => phenotypeSummary(run, trial && run.at(-1)?.tick === MAX_TICKS));
  const phenotypeChanged = outcomes.length === 2 && outcomes.every(o => o.peakAltitude !== null) && outcomes[0].label !== outcomes[1].label && outcomes.every(o => o.label !== "OBSERVING");
  return <section className="autonomy-panel" aria-label="Autonomous experimental behaviour" data-mode={replay ? "replay" : trial ? "trial" : "exploration"} data-behaviour={frame?.decision.state ?? "IDLE"} data-source={frame?.decision.source ?? "BASELINE_AUTONOMOUS_POLICY"} data-tick={frame?.tick ?? 0} data-altitude={frame?.after.altitude ?? 0}>
    <div className="autonomy-controls"><strong role="status">{replay ? "REPLAY MODE" : complete ? "Trial complete" : trial ? "CONTROLLED EXPERIMENT TRIAL" : "AUTONOMOUS EXPLORATION"}{!complete && !replay && ` · ${paused ? "Paused" : "On"}`}</strong>
      <div className="autonomy-control-group" role="group" aria-label="Autonomous world controls"><span>AUTONOMOUS WORLD</span>{!replay && <button type="button" className="text-button" onClick={togglePause} disabled={complete}>{paused ? "Resume autonomy" : "Pause autonomy"}</button>}
      <button type="button" className="text-button" onClick={reset}>Reset autonomy</button>
      </div>
      {!replay && <><div className="autonomy-control-group" role="group" aria-label="Stimulus and experiment controls"><span>STIMULUS / EXPERIMENT</span><button type="button" className="text-button" disabled={complete} onClick={() => { pulseAt.current = engines.current[0]?.tick ?? 0; setPulseTick(pulseAt.current); }}>Present stimulus</button><button type="button" className="text-button" onClick={() => startMode(!trial)}>{trial ? "Start continuous exploration" : "Start controlled trial"}</button>{!external && <button type="button" className="text-button" aria-pressed={matched} onClick={() => startMode(true, !matched)}>{matched ? "Single controlled trial" : "Compare synthetic intervention"}</button>}</div><div className="autonomy-control-group" role="group" aria-label="Replay controls"><span>REPLAY / EVIDENCE</span><button type="button" className="text-button" disabled={retainedCount < 2} aria-describedby="autonomy-replay-help" onClick={enterReplay}>Replay recorded experiment</button></div></>}
      {replay && <><button type="button" className="text-button" onClick={toggleReplay}>{replay.playing ? "Pause replay" : "Play replay"}</button><button type="button" className="text-button" onClick={restartReplay}>Restart replay</button><button type="button" className="text-button" onClick={exitReplay}>Return to autonomous world</button></>}
    </div>
    <p className="autonomy-timing">{replay ? `Retained trajectory · frame ${replay.cursor + 1} / ${replay.length} · no new decisions` : trial ? `${Math.min((frame?.tick ?? 0) * .05, 60).toFixed(1)} / 60.0 s · ${Math.max(0, 60 - (frame?.tick ?? 0) * .05).toFixed(1)} s remaining` : `${((frame?.tick ?? 0) * .05).toFixed(1)} s elapsed · continuous exploration, not a measured experiment`}</p>
    <small id="autonomy-replay-help" className="autonomy-replay-help">{replay ? "Past recorded trajectory. Does not rerun the experiment, create neural decisions, or change evidence; autonomy is paused." : retainedCount < 2 ? "Replay unavailable: no retained motion trajectory yet." : "Replay uses the current retained recording window. Export evidence before reset or starting a new session."}</small>
    {external && <div className="autonomy-transport"><label><input type="checkbox" checked={brainInput} disabled={Boolean(replay)} onChange={event => { setBrainInput(event.target.checked); reset(); }} /> Experimental sensory feedback to brain server</label><small>{brainInput ? transportStatus || "Connecting experimental brain input" : "Observational decoder input only; no sensor messages sent."} Experimental research brain sessions remain bounded; exploration can continue under the baseline policy after disconnection. Neural perturbations are unavailable.</small></div>}
    {matched && <div className="matched-disclosure"><strong>ONE THING CHANGED: Primary A silenced</strong><span>Same world · same starting conditions · same seed (12) · same scheduled stimulus · same 60 s window</span><small>Matched deterministic fixture; sensed feedback can diverge as the flies move.</small><span>SHARED STIMULUS: {frame?.stimulus ? "PRESENT IN BOTH CONDITIONS" : (frame?.tick ?? 0) < pulseTick ? `SCHEDULED AT ${(pulseTick * .05).toFixed(1)} s` : "PULSE COMPLETE"}</span></div>}
    <div className="autonomy-world" data-model-status={modelStatus} >{model === "anatomical" && modelStatus === "loading" && <p className="anatomical-loading" role="status">Loading anatomical model…</p>}{model === "anatomical" && modelStatus === "fallback" && <p className="anatomical-loading" role="status">Anatomical model unavailable · Lightweight fallback</p>}<World result={null} step={0} reset={viewReset + session} compare={matched && !external} condition="control" playing={replay ? replay.playing : !paused && !complete} pulseKey={`autonomy-${session}`} model={model} onModelStatus={reportModelStatus} autonomy={frames.map((frame, i) => ({ frame, path: recordedPath(retained[i] ?? [], frame?.tick ?? 0), state: frame?.after ?? { x: 0, z: .8, heading: 0, speed: 0 } }))} /><div className="comparison-world-labels">{matched && <><span>CONTROL<small>Normal / intact pathway</small></span><span>INTERVENTION<small>Primary A silenced</small></span></>}</div><button type="button" className="world-reset-view text-button" aria-label="Reset View" onClick={() => setViewReset(value => value + 1)}>Reset View</button></div>
    {matched && <section className="phenotype-summary" aria-label="Retained phenotype comparison"><h3>{phenotypeChanged ? "PHENOTYPE CHANGED" : complete ? "RECORDED PHENOTYPE" : "OBSERVING PHENOTYPE"}</h3><div>{outcomes.map((outcome, i) => <article key={i} data-run={i ? "perturbed" : "control"}><span>{i ? "INTERVENTION · Primary A silenced" : "CONTROL · Intact pathway"}</span><strong>{outcome.label}</strong><p>{outcome.detail}</p><small>Retained peak height: {outcome.peakAltitude?.toFixed(2) ?? "—"} scene units</small></article>)}</div><small>Current retained window only. Engineered phenotype; not biological validation.</small></section>}
    <div className="autonomy-readout" aria-live="off"><b>{frame?.decision.state ?? "IDLE"}</b><span>Source: {behaviourSourceLabels[frame?.decision.source ?? "BASELINE_AUTONOMOUS_POLICY"]}</span><span title="Illustrative scene units per second">Speed {frame?.after.speed.toFixed(2) ?? "0.00"}</span><span>Height {(frame?.after.altitude ?? 0).toFixed(2)} · {frame?.motor.phase ?? "GROUNDED"}</span><span>Heading {((frame?.after.heading ?? 0) * 180 / Math.PI).toFixed(0)}°</span><span title="Available neural signal; a retained motor trigger is recorded separately">Neural {frame?.neural.activity?.toFixed(2) ?? (frame?.neural.decoder || "—")}</span><span title="Experimental geometric forward clearance">Clearance {frame?.sensors.front.toFixed(2) ?? "—"}</span><span>Stimulus {frame?.sensors.stimulusIntensity.toFixed(2) ?? "0.00"}</span>{frame?.motor.trigger && <span>Escape trigger: {frame.motor.trigger.source === "FRUITFLY_XR" ? "Live connectome decoder" : "Synthetic neural model"} (retained)</span>}<InfoTooltip label="Autonomous experimental behaviour">Experimental geometric sensors feed a synthetic neural fixture or the supported brain-server proxy. Neural signals can select supported states; CausalFly executes engineered takeoff, recovery and movement. Not real-fly validated. Controlled trials stop at 60 seconds; exploration continues with bounded checkpointed recording windows.</InfoTooltip></div>
    <small className="autonomy-policy">Faint path: recent recorded positions · dots: segment start and displayed endpoint · height in illustrative scene units.</small>
    <p className="autonomy-policy">Baseline locomotion is engineered. Neural simulation can modify/select supported behavioral states. Motor execution: CausalFly procedural controller.</p>
    {frame?.motor.trigger?.source === "FRUITFLY_XR" && frame.motor.phase !== "GROUNDED" && <p className="autonomy-lineage">Simulated connectome activity → Decoder: ESCAPE → Behavior: ESCAPE / recovery → CausalFly procedural motor execution. The brain server supplies neural signals, not body mechanics.</p>}
    <div className="autonomy-caption"><span>{matched ? "Left: control · right: silence synthetic primary_a. Same seed and external object; sensed feedback can diverge." : external ? "Live connectome decoder signals select supported states; CausalFly executes movement." : "Separate synthetic controller demonstration; approved experiment measurements remain separate."} Not real-fly validated.</span><button type="button" className="text-button" onClick={exportEvidence}>Export autonomy evidence</button></div>
    {external && <p className="autonomy-comparison">Female anatomical visual mesh · male CNS neural simulation. Not sex-matched. <a href="/models/flyv2/NOTICE.txt" target="_blank" rel="noreferrer">FlyBody attribution and modifications</a></p>}
    {matched && <p className="autonomy-comparison">{frames.map((f, i) => `${i ? "Silenced primary_a" : "Control"}: ${f?.decision.state ?? "IDLE"} / ${behaviourSourceLabels[f?.decision.source ?? "BASELINE_AUTONOMOUS_POLICY"]} / speed ${f?.after.speed.toFixed(2) ?? "0.00"}`).join(" · ")}</p>}
    <details className="autonomy-details"><summary>Autonomy evidence details</summary><p>Replay and export contain client-generated controller evidence, not server-attested neural evidence or biological measurements.</p>{frames.map((f, i) => f && <dl key={i}><dt>Condition</dt><dd>{i ? "Synthetic intervention" : "Control / exploration"}</dd><dt>Decision reason</dt><dd>{f.decision.reason}</dd><dt>Decision source</dt><dd>{behaviourSourceLabels[f.decision.source]}</dd><dt>Speed modulation</dt><dd>{f.motor.modulationSource ? behaviourSourceLabels[f.motor.modulationSource] : "None"}</dd><dt>Motor execution</dt><dd>CausalFly procedural controller · engineered takeoff/recovery</dd><dt>Neural reference</dt><dd>{f.decision.trigger?.reference ? `${f.decision.trigger.reference.sessionId} / sequence ${f.decision.trigger.reference.sequence}` : f.neural.reference ? `${f.neural.reference.sessionId} / sequence ${f.neural.reference.sequence}` : "No external reference"}</dd></dl>)}</details>
  </section>;
}
