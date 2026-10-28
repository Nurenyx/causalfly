"use client";

import { useMemo, useState } from "react";
import type { FruitFlyEvidence, FruitFlySnapshot } from "@/lib/sources/contracts";
import { LIVE_FRAME_LIMIT, number, sessionStatus, sessionTimeline } from "@/lib/sources/live-session";
import { ConnectomeActivityView, InstrumentPanel, LiveMetricChart } from "./live-visualizations";
import styles from "./live-session.module.css";

type Status = ReturnType<typeof sessionStatus>;
export function LiveSessionHeader({ snapshot, status, onConnect, onDisconnect }: { snapshot: FruitFlySnapshot; status: Status; onConnect: () => void; onDisconnect: () => void }) {
  const t = snapshot.evidence?.telemetry;
  const activeConnection = status.connected || snapshot.state === "CONNECTING";
  return <section className={styles.sessionBar} data-state={snapshot.state === "ERROR" ? "error" : status.historical ? "historical" : status.live ? "live" : "waiting"} aria-label="FruitFly XR session status">
    <div className={styles.sessionIdentity}><span className={styles.microLabel}>FRUITFLY XR <span> / Connectome simulation</span></span><div className={styles.sessionTitle}><span className={styles.liveBadge} role="status"><i />{snapshot.state === "ERROR" ? "ERROR" : status.historical ? "LAST SNAPSHOT" : status.live ? "LIVE" : "WAITING FOR DATA"}</span><span className={styles.connection} data-connected={status.connected} data-error={snapshot.state === "ERROR"}><i />{status.connected ? "CONNECTED" : snapshot.state}</span></div><p title={t?.sessionId}>Session <code>{t?.sessionId ?? "Awaiting first frame"}</code></p></div>
    <dl className={styles.sessionMetrics}><div><dt>Model time</dt><dd>{t ? <>{number(t.simulationMs)}<small> ms</small></> : "—"}</dd></div><div><dt>Simulation tick</dt><dd>{t ? number(t.neuralTick) : "—"}</dd></div><div><dt>Sequence</dt><dd>{t ? number(t.sequence) : "—"}</dd></div><div><dt>Stream health</dt><dd className={styles.healthLabel}>{status.historical ? "No current frames" : status.live ? t && (t.droppedDisplayFrames || t.droppedSubscriberMessages || !t.inputFresh) ? "Check diagnostics" : "Receiving data" : status.connected ? "Waiting for frames" : snapshot.state === "ERROR" ? "Connection error" : "Offline"}</dd></div></dl>
    <button type="button" className={styles.connectionButton} onClick={activeConnection ? onDisconnect : onConnect}>{activeConnection ? snapshot.state === "CONNECTING" ? "Cancel" : "Disconnect" : "Connect FruitFly XR"}</button>
  </section>;
}

export function EventTimeline({ frames, historical, receivedAt, reconnectedAt }: { frames: readonly FruitFlyEvidence[]; historical: boolean; receivedAt?: string; reconnectedAt: number | null }) {
  const events = useMemo(() => sessionTimeline(frames), [frames]);
  return <InstrumentPanel title="Event timeline" tag="RECEIVED EVENTS · MODEL TIME" className={styles.timeline}>
    <ol>{events.map((event, index) => { const frameIndex = frames.findIndex(f => f.telemetry.sequence === event.sequence); const previous = frames[frameIndex - 1]?.telemetry; const inputChanged = previous && previous.inputSequence !== frames[frameIndex]?.telemetry.inputSequence; return <li key={event.sequence} title={event.detail} className={event.changed ? styles.changed : ""}><strong>{event.changed ? "Decoder changed" : index === 0 ? "Frame received" : inputChanged ? "Input reference changed" : "Neural tick"}</strong><span>{event.changed ? event.label : `Tick ${number(event.tick)}`}</span><span className={styles.eventTick}>{number(event.modelMs)} <small>model ms</small></span></li>; })}{reconnectedAt !== null && <li className={styles.reconnected} title="Observed connection · wall-clock time, not model time"><strong>Stream reconnected</strong><span>Transport restored</span><span className={styles.eventTick}>{new Date(reconnectedAt).toISOString().slice(11, 19)} <small>UTC</small></span></li>}{historical && <li className={styles.staleEvent} title="Display status · last receipt wall-clock time, not model time"><strong>Stream inactive</strong><span>Snapshot retained</span><span className={styles.eventTick}>{receivedAt ? new Date(receivedAt).toISOString().slice(11, 19) : "—"} <small>UTC · last received</small></span></li>}</ol>
  </InstrumentPanel>;
}

export function SimulationOutput({ frames }: { frames: readonly FruitFlyEvidence[] }) {
  const t = frames.at(-1)?.telemetry;
  const previousMode = [...frames].reverse().find(f => f.telemetry.motorMode !== t?.motorMode)?.telemetry.motorMode;
  return <InstrumentPanel title="Simulation output" tag="MOTOR DECODER" className={styles.output}>
    <div className={styles.outputMode}><span aria-hidden="true">↗</span><div><strong>{t?.motorMode ?? "AWAITING DATA"}</strong><p>{previousMode ? `${previousMode} → ${t?.motorMode} · received window` : "Motor decoder state"}</p></div><span className={styles.simulatedBadge}>SIMULATED</span></div>
    <p className={styles.note}>Decoded simulation output. Physical movement is not measured by this stream.</p>
  </InstrumentPanel>;
}

export function StreamHealth({ evidence, ageMs, onEvidence }: { evidence: FruitFlyEvidence | null; ageMs: number | null; onEvidence: () => void }) {
  const t = evidence?.telemetry;
  return <InstrumentPanel title="Stream health" tag="DISPLAY DIAGNOSTICS" className={styles.health}><dl>{[
    ["Sequence", t ? number(t.sequence) : "—"], ["Latest-frame age", ageMs === null ? "Unavailable" : `${(ageMs / 1000).toFixed(1)} s`],
    ["Display drops", t ? number(t.droppedDisplayFrames) : "—"], ["Subscriber drops", t ? number(t.droppedSubscriberMessages) : "—"],
    ["Input freshness", t ? t.inputSequence < 0 ? "Unavailable" : t.inputFresh ? "Fresh" : "Not fresh" : "—"],
    ["Display sample", t ? t.displayTruncated ? `${number(t.displaySpikeEvents)} / ${number(t.totalSpikeEvents)}` : "Full tick" : "—"],
  ].map(([label, value]) => <div key={label} data-issue={Boolean(t && ((label === "Display drops" && t.droppedDisplayFrames > 0) || (label === "Subscriber drops" && t.droppedSubscriberMessages > 0) || (label === "Input freshness" && (!t.inputFresh || t.inputSequence < 0)) || (label === "Latest-frame age" && (ageMs === null || ageMs >= 5000))))}><dt>{label}</dt><dd><i />{value}</dd></div>)}</dl><button className={styles.evidenceLink} onClick={onEvidence}>View diagnostics ↗</button></InstrumentPanel>;
}

export function AiObserverRail({ evidence, historical, onEvidence }: { evidence: FruitFlyEvidence | null; historical: boolean; onEvidence: () => void }) {
  const t = evidence?.telemetry;
  const notes = !t ? ["Waiting for a validated simulation frame."] : [
    ...(historical ? ["Last snapshot only. No current activity claimed."] : []),
    ...(t.displayTruncated ? [`Display sample: ${number(t.displaySpikeEvents)} / ${number(t.totalSpikeEvents)} events supplied.`] : []),
    ...(t.inputSequence < 0 ? ["No input reference reported."] : !t.inputFresh ? [`Input reference ${number(t.inputSequence)} is not fresh.`] : []),
    ...(t.droppedDisplayFrames || t.droppedSubscriberMessages ? ["Producer reports dropped data. Inspect stream health."] : []),
  ];
  return <aside className={styles.observer} aria-label="AI Observer"><InstrumentPanel title="AI OBSERVER" tag="LOCAL OBSERVER">
    <section className={styles.observerCard}><h3>WHAT HAPPENED?</h3>{t ? <ul className={styles.observations}><li><i>⌁</i><p><strong>{number(t.totalSpikeEvents)}</strong><span>Simulated spike events</span></p></li><li><i>◉</i><p><strong>{number(t.activeNeuronCount)}</strong><span>Active simulated neurons</span></p></li><li><i>↗</i><p><strong>{t.motorMode}</strong><span>Motor decoder output</span></p></li><li><i>⋮</i><p><strong>{number(t.displaySpikeEvents)} <small>/ {number(t.totalSpikeEvents)}</small></strong><span>Events supplied for display</span></p></li></ul> : <p className={styles.observerEmpty}>Observations begin with the first validated frame.</p>}</section>
    <section className={styles.streamNotes}><h3>STREAM NOTES</h3>{notes.length ? <ul>{notes.map(note => <li key={note}>{note}</li>)}</ul> : <p>No stream caveats reported.</p>}</section>
    <section className={styles.investigate}><h3>✦ &nbsp; WORTH INVESTIGATING</h3><strong>{!t ? "Start a simulation trial" : historical ? "Review the retained decoder states" : !t.inputFresh || t.inputSequence < 0 ? "Check input freshness before interpreting" : t.displayTruncated ? "Inspect totals beyond the display sample" : "Compare decoder states across received ticks"}</strong><button type="button" onClick={onEvidence}>Open Evidence <span aria-hidden="true">↗</span></button></section>
    <div className={styles.metaReserved}><button type="button" disabled aria-describedby="meta-reserved">✧ &nbsp; Analyze with Meta <span>ON DEMAND</span></button><p id="meta-reserved">Not available for live telemetry · no automatic calls.</p></div>
  </InstrumentPanel><section className={styles.provenance} data-verified={Boolean(evidence)}><span className={styles.microLabel}>{evidence ? "VALIDATED CONNECTOME SOURCE" : "SOURCE PROVENANCE"}</span><strong><i />{evidence ? evidence.provenance.dataset : "Awaiting source verification"}</strong>{evidence && <dl><div><dd>{number(evidence.provenance.neurons)}</dd><dt>neurons</dt></div><div><dd>{number(evidence.provenance.edges)}</dd><dt>structural edges</dt></div></dl>}<p>Published structure <span> / </span> Simulated dynamics</p><p>Not recordings from a living fly</p></section></aside>;
}

export function LiveSessionWorkspace({ snapshot, frames, now, onEvidence, onConnect, onDisconnect }: { snapshot: FruitFlySnapshot; frames: readonly FruitFlyEvidence[]; now: number | null; onEvidence: () => void; onConnect: () => void; onDisconnect: () => void }) {
  const status = sessionStatus(snapshot, now ?? 0);
  const receivedAt = snapshot.evidence?.receivedAt;
  const sessionId = snapshot.evidence?.telemetry.sessionId;
  const [transport, setTransport] = useState({ connected: status.connected, sessionId, reconnectedAt: null as number | null });
  // One bounded presentation marker, based only on an observed transport transition.
  // Updating on a changed prop prevents an effect from producing a second paint.
  if (transport.connected !== status.connected || transport.sessionId !== sessionId) {
    setTransport({ connected: status.connected, sessionId, reconnectedAt: sessionId !== transport.sessionId ? null : status.connected && !transport.connected && sessionId ? now : transport.reconnectedAt });
  }
  return <div className={styles.session}>
    <LiveSessionHeader snapshot={snapshot} status={status} onConnect={onConnect} onDisconnect={onDisconnect} />
    <div className={`${styles.statusStrip} ${status.historical ? styles.historical : ""}`}><span>{status.historical && receivedAt ? `LAST RECEIVED ${new Date(receivedAt).toISOString().replace("T", " ").replace("Z", " UTC")} · No current activity claimed` : status.live ? "Published fruit-fly connectome · Simulated neural dynamics" : snapshot.message}</span><span>{frames.length} / {LIVE_FRAME_LIMIT} received frames</span></div>
    <div className={styles.layout}><div className={styles.instruments}><ConnectomeActivityView frames={frames} historical={status.historical} /><section className={styles.activity} aria-label="Received simulation activity"><LiveMetricChart frames={frames} metric="spikes" /><LiveMetricChart frames={frames} metric="active" /><p className={styles.chartNote}>Counts per received tick · gaps unjoined · active includes subthreshold, refractory and pending-input states</p></section><EventTimeline frames={frames} historical={status.historical} receivedAt={receivedAt} reconnectedAt={transport.reconnectedAt} /><div className={styles.lowerPanels}><SimulationOutput frames={frames} /><StreamHealth evidence={snapshot.evidence} ageMs={status.ageMs} onEvidence={onEvidence} /></div></div><AiObserverRail evidence={snapshot.evidence} historical={status.historical} onEvidence={onEvidence} /></div>
  </div>;
}
