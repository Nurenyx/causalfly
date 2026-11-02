"use client";

import { useEffect, useMemo, useState } from "react";
import type { FruitFlySnapshot } from "@/lib/sources/contracts";
import { testerLiveState } from "@/lib/sources/tester-live-state";
import { validatedRecording } from "@/lib/sources/validated-recording";
import { configuredBrainEndpoint } from "@/lib/sources/fruitfly-closed-loop";
import { AutonomyPanel } from "./autonomy-panel";
import { LiveSessionWorkspace } from "./live-session";
import { FruitFlyEvidenceView } from "./fruitfly-evidence";
import { StatusChip } from "./page-header";

export function LiveConnectomeGate({ snapshot, now, onConnect, onDisconnect, replaying, onReplay }: {
  snapshot: FruitFlySnapshot; now: number | null; onConnect: () => void; onDisconnect: () => void;
  replaying: boolean; onReplay: (value: boolean) => void;
}) {
  const recording = useMemo(() => validatedRecording(), []);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [trial, setTrial] = useState(0);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const state = replaying ? "RECORDED_REPLAY" : testerLiveState(snapshot, now ?? 0);
  const controlConfigured = Boolean(configuredBrainEndpoint(process.env.NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL, process.env.NODE_ENV === "production"));
  useEffect(() => {
    if (!replaying || !playing || cursor >= recording.length - 1) return;
    const timer = window.setTimeout(() => setCursor(value => Math.min(value + 1, recording.length - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [replaying, playing, cursor, recording.length]);
  const replaySnapshot: FruitFlySnapshot = { source: "FRUITFLY_XR", state: "DISCONNECTED", presentation: "RECORDED_REPLAY", message: "VALIDATED SIMULATION CAPTURE · retained capture, not a live connection", evidence: recording[cursor] };
  function replay() { onDisconnect(); setTrial(0); setCursor(0); setPlaying(true); setEvidenceOpen(false); onReplay(true); }
  return <section className="live-launcher" aria-label="Live trial and recorded replay" data-live-state={state}>
    <div className="live-launcher-heading"><div><span className="eyebrow">male-cns:v1.0 · SIMULATED DYNAMICS</span><h2>{replaying ? "VALIDATED SIMULATION CAPTURE" : state === "RUNNING" ? "Receiving simulation frames" : state === "READY" ? "Backend ready" : state === "CONNECTING" ? "Connecting to the simulation" : "Live backend unavailable"}</h2></div><StatusChip state={replaying ? "INFORMATIONAL" : state === "RUNNING" ? "ACTIVE" : state === "READY" ? "READY" : state === "ERROR" ? "ERROR" : state === "CONNECTING" ? "STANDBY" : "OFFLINE"}>{state.replaceAll("_", " ")}</StatusChip></div>
    <p>{replaying ? "Protocol/source validated · Not biological validation. Playback does not run a new trial or send sensory input." : state === "RUNNING" ? "Current frames are arriving from the simulation service. Observing a stream and starting your own trial are separate actions." : state === "READY" ? controlConfigured ? "Start the existing bounded trial with experimental sensory feedback. CausalFly executes engineered movement." : "Telemetry is connected. Trial control is not configured on this host; you can observe incoming trials or replay the recording." : state === "CONNECTING" ? "Checking the simulation service. Replay remains available." : "The simulation service is offline or not configured on this host. Replay works without a backend or terminal."}</p>
    <div className="live-launcher-actions">
      {!replaying && <button type="button" className="primary-button" disabled={state !== "READY" || !controlConfigured || trial > 0} onClick={() => setTrial(value => value + 1)}>START LIVE TRIAL</button>}
      <button type="button" className={state === "OFFLINE" || state === "ERROR" ? "primary-button" : "secondary-button"} onClick={replay}>REPLAY VALIDATED RUN</button>
      {replaying ? <><button type="button" className="secondary-button" disabled={cursor === recording.length - 1} onClick={() => setPlaying(value => !value)}>{cursor === recording.length - 1 ? "Recording complete" : playing ? "Pause recorded replay" : "Continue recorded replay"}</button><button type="button" className="text-button" onClick={() => { setPlaying(false); onReplay(false); }}>Return to live connection</button></> : <button type="button" className="text-button" disabled={state === "CONNECTING"} onClick={() => { setTrial(0); onConnect(); }}>Reconnect backend</button>}
    </div>
    {!replaying && !snapshot.evidence && <small>No neural frames received yet. Start a trial when ready, or replay the retained capture.</small>}
    {!replaying && trial > 0 && <><p role="status">Trial requested through the existing brain-control connection. RUNNING appears only when fresh telemetry arrives. The trial ends after 60 seconds; close it before starting another.</p><button type="button" className="text-button" onClick={() => setTrial(0)}>Close trial</button><AutonomyPanel key={trial} snapshot={snapshot} startLiveTrial /></>}
    {replaying && <><p className="replay-disclosure">PARTIAL CAPTURE · {recording.length} retained frames · model time {recording[0].telemetry.simulationMs}–{recording.at(-1)!.telemetry.simulationMs} ms · one retained tick per second for inspection. Gaps are unobserved; no interpolation. Original receipt: {recording[0].receivedAt}.</p><LiveSessionWorkspace replayTotal={recording.length} snapshot={replaySnapshot} frames={recording.slice(0, cursor + 1)} now={now} onConnect={onConnect} onDisconnect={onDisconnect} onEvidence={() => setEvidenceOpen(value => !value)} />{evidenceOpen && <div className="recorded-evidence"><h3>VALIDATED SIMULATION CAPTURE · Evidence</h3><p>This capture is separate from the active investigation. No new measurement or Meta interpretation is claimed.</p><FruitFlyEvidenceView snapshot={replaySnapshot} question="Historical simulation capture · no active causal question" /></div>}</>}
  </section>;
}
