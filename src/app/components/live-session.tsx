"use client";

import { AutonomyPanel } from "./autonomy-panel";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { FruitFlyEvidence, FruitFlySnapshot } from "@/lib/sources/contracts";
import { LIVE_FRAME_LIMIT, number, sessionStatus, sessionTimeline } from "@/lib/sources/live-session";
import { ConnectomeActivityView, InstrumentPanel, LiveMetricChart } from "./live-visualizations";
import styles from "./live-session.module.css";
import { LiveStateSummary, QuestionCompatibility } from "./live-state-summary";
import { liveEventSummary } from "@/lib/web/live-event-summary";

const wideSubscribe = (update: () => void) => { const media = window.matchMedia("(min-width: 1440px)"); media.addEventListener("change", update); return () => media.removeEventListener("change", update); };
const wideSnapshot = () => window.matchMedia("(min-width: 1440px)").matches;
const serverWidth = () => false;
type Status = ReturnType<typeof sessionStatus>;
export function LiveSessionHeader({ snapshot, status }: { snapshot: FruitFlySnapshot; status: Status; onConnect: () => void; onDisconnect: () => void; onInterpret?: () => void }) {
  const t = snapshot.evidence?.telemetry;
  return <section className={styles.sessionBar} data-state={status.historical ? "historical" : status.live ? "live" : "waiting"} aria-label="Live connectome simulation session status">
    <div className="live-session-title"><strong>{snapshot.presentation ? "RECORDED SIMULATION" : "LIVE CONNECTOME SIMULATION"}</strong><LiveStateSummary snapshot={snapshot} now={t && status.ageMs !== null ? Date.parse(snapshot.evidence!.receivedAt) + status.ageMs : 0} /></div>
    {t && <div className="telemetry-primary" aria-label="Key telemetry observations" data-retained={status.historical}>
      <span className="eyebrow">{snapshot.presentation ? "RECORDED REPLAY" : status.historical ? "SHOWING RETAINED SNAPSHOT" : "CURRENT RECEIVED FRAME"}</span>
      <dl><div><dt>TICK</dt><dd>{number(t.neuralTick)}</dd></div><div><dt>SPIKE EVENTS REPORTED</dt><dd>{number(t.totalSpikeEvents)}</dd></div><div><dt>ACTIVE SIMULATED NEURONS</dt><dd>{number(t.activeNeuronCount)}</dd></div><div><dt>DECODER</dt><dd>{t.motorMode}</dd></div></dl>
      <details><summary>Session identity & timing</summary><p>Session {t.sessionId} · sequence {t.sequence} · model time {t.simulationMs} ms</p></details>
    </div>}
  </section>;
}

export type TimelineLaneId = "frame" | "neural" | "input" | "decoder" | "stream";
export interface TimelineLaneView {
  readonly id: TimelineLaneId;
  readonly category: "FRAME" | "NEURAL" | "INPUT" | "DECODER" | "STREAM";
  readonly title: string;
  readonly value: string;
  readonly time: string;
  readonly detail: string;
  readonly empty: boolean;
  readonly tone: "" | "changed" | "reconnected" | "stale";
}
export interface TimelineLaneAccumulator {
  sessionId?: string;
  lastSequence: number;
  frameCount: number;
  reconnectedAtSeen: number | null;
  reconnectedFramePending: boolean;
  streamLiveUtc: string | null;
  lastTelemetry: FruitFlyEvidence["telemetry"] | null;
  lastReceivedAt: string | null;
  lanes: Record<Exclude<TimelineLaneId, "stream">, Omit<TimelineLaneView, "id" | "category"> | null>;
}
const LANE_CATEGORIES: readonly { id: TimelineLaneId; category: TimelineLaneView["category"] }[] = [
  { id: "frame", category: "FRAME" },
  { id: "neural", category: "NEURAL" },
  { id: "input", category: "INPUT" },
  { id: "decoder", category: "DECODER" },
  { id: "stream", category: "STREAM" },
];
const formatUtcTime = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null || value === "") return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toISOString().slice(11, 19);
};
export function createTimelineLaneAccumulator(): TimelineLaneAccumulator {
  return { sessionId: undefined, lastSequence: -1, frameCount: 0, reconnectedAtSeen: null, reconnectedFramePending: false, streamLiveUtc: null, lastTelemetry: null, lastReceivedAt: null, lanes: { frame: null, neural: null, input: null, decoder: null } };
}
export function semanticTimelineLanes(
  frames: readonly FruitFlyEvidence[],
  { historical, connected, receivedAt, reconnectedAt }: { historical: boolean; connected?: boolean; receivedAt?: string; reconnectedAt: number | null },
  acc: TimelineLaneAccumulator = createTimelineLaneAccumulator(),
): readonly TimelineLaneView[] {
  const firstSessionId = frames[0]?.telemetry.sessionId;
  const latestSequence = frames.at(-1)?.telemetry.sequence ?? -1;
  const isContinuation =
    acc.lastSequence >= 0 &&
    frames.length > 0 &&
    firstSessionId === acc.sessionId &&
    frames[0].telemetry.sequence <= acc.lastSequence &&
    latestSequence >= acc.lastSequence &&
    !(latestSequence === acc.lastSequence && frames.length < acc.frameCount);
  if (!isContinuation) {
    Object.assign(acc, createTimelineLaneAccumulator(), { sessionId: firstSessionId });
  }
  if (reconnectedAt === null) {
    acc.reconnectedAtSeen = null;
    acc.reconnectedFramePending = false;
  } else if (reconnectedAt !== acc.reconnectedAtSeen) {
    acc.reconnectedAtSeen = reconnectedAt;
    if (acc.lastSequence >= 0) acc.reconnectedFramePending = true;
  }
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const t = frame.telemetry;
    if (acc.lastSequence >= 0 && t.sequence <= acc.lastSequence) continue;
    const prev = acc.lastTelemetry;
    const prevReceivedMs = acc.lastReceivedAt ? Date.parse(acc.lastReceivedAt) : NaN;
    const currReceivedMs = Date.parse(frame.receivedAt);
    const postReconnectByTime =
      reconnectedAt !== null &&
      !Number.isNaN(prevReceivedMs) &&
      !Number.isNaN(currReceivedMs) &&
      prevReceivedMs < reconnectedAt &&
      currReceivedMs >= reconnectedAt;
    if (!prev) acc.streamLiveUtc = formatUtcTime(frame.receivedAt);
    // One receipt can contain several independent engineering events. Update each
    // matching category without moving event identities into neighboring lanes.
    acc.lanes.frame = { title: "Frame received", value: `Tick ${number(t.neuralTick)}`, time: `${number(t.simulationMs)} model ms`, detail: `${number(t.totalSpikeEvents)} spikes · ${number(t.activeNeuronCount)} active`, empty: false, tone: "" };
    if (prev && prev.neuralTick !== t.neuralTick) {
      acc.lanes.neural = { title: "Neural tick", value: `Tick ${number(t.neuralTick)}`, time: `${number(t.simulationMs)} model ms`, detail: `${number(t.totalSpikeEvents)} spikes · ${number(t.activeNeuronCount)} active`, empty: false, tone: "" };
    }
    if (prev && prev.motorMode !== t.motorMode) {
      acc.lanes.decoder = { title: "Decoder changed", value: `${prev.motorMode} → ${t.motorMode}`, time: `Tick ${number(t.neuralTick)}`, detail: `${number(t.simulationMs)} model ms · ${number(t.totalSpikeEvents)} spikes`, empty: false, tone: "changed" };
    }
    if (prev && prev.inputSequence !== t.inputSequence) {
      acc.lanes.input = { title: "Input reference changed", value: `Tick ${number(t.neuralTick)}`, time: `${number(t.simulationMs)} model ms`, detail: `Input sequence ${number(t.inputSequence)}`, empty: false, tone: "" };
    }
    if (acc.reconnectedFramePending || postReconnectByTime) acc.reconnectedFramePending = false;
    acc.lastTelemetry = t;
    acc.lastReceivedAt = frame.receivedAt;
    acc.lastSequence = t.sequence;
  }
  acc.frameCount = frames.length;
  const justReconnected = Boolean(connected && reconnectedAt !== null && acc.reconnectedFramePending);
  const streamLane: Omit<TimelineLaneView, "id" | "category"> = historical && !justReconnected
    ? { title: "Stream inactive", value: "Snapshot retained", time: `Last received ${formatUtcTime(receivedAt ?? frames.at(-1)?.receivedAt)} UTC`, detail: "Display status · wall-clock receipt, not model time", empty: false, tone: "stale" }
    : reconnectedAt !== null
      ? { title: "Stream reconnected", value: "Transport restored", time: `Reconnected at ${formatUtcTime(reconnectedAt)} UTC`, detail: "Observed transport transition · wall-clock time", empty: false, tone: "reconnected" }
      : frames.length > 0
        ? { title: "Stream live", value: "Live telemetry", time: `Active since ${acc.streamLiveUtc ?? formatUtcTime(frames[0]?.receivedAt)} UTC`, detail: "Active telemetry stream · wall-clock receipt", empty: false, tone: "" }
        : { title: "—", value: "—", time: "—", detail: "Awaiting stream telemetry", empty: true, tone: "" };
  return LANE_CATEGORIES.map(({ id, category }) => {
    const lane = id === "stream" ? streamLane : acc.lanes[id];
    return lane ? { id, category, ...lane } : { id, category, title: "—", value: "—", time: "—", detail: "Awaiting event", empty: true, tone: "" };
  });
}

export function EventTimeline({ frames, historical, connected, receivedAt, reconnectedAt }: { frames: readonly FruitFlyEvidence[]; historical: boolean; connected?: boolean; receivedAt?: string; reconnectedAt: number | null }) {
  // Keep presentation history local to this mounted timeline. Copy before folding
  // so an interrupted render cannot mutate the last committed presentation.
  const [presentation, setPresentation] = useState(() => {
    const acc = createTimelineLaneAccumulator();
    return { frames, historical, connected, receivedAt, reconnectedAt, acc, lanes: semanticTimelineLanes(frames, { historical, connected, receivedAt, reconnectedAt }, acc) };
  });
  let lanes = presentation.lanes;
  if (presentation.frames !== frames || presentation.historical !== historical || presentation.connected !== connected || presentation.receivedAt !== receivedAt || presentation.reconnectedAt !== reconnectedAt) {
    const acc = { ...presentation.acc, lanes: { ...presentation.acc.lanes } };
    lanes = semanticTimelineLanes(frames, { historical, connected, receivedAt, reconnectedAt }, acc);
    setPresentation({ frames, historical, connected, receivedAt, reconnectedAt, acc, lanes });
  }
  const events = useMemo(() => sessionTimeline(frames), [frames]);
  const items = events.map((event, index) => {
    const frameIndex = frames.findIndex(f => f.telemetry.sequence === event.sequence);
    const previous = frames[frameIndex - 1]?.telemetry;
    const inputChanged = previous && previous.inputSequence !== frames[frameIndex]?.telemetry.inputSequence;
    return { title: event.changed ? "Decoder changed" : index === 0 ? "Frame received" : inputChanged ? "Input reference changed" : "Neural tick", label: `Tick ${number(event.tick)}`, time: `${number(event.modelMs)} model ms`, detail: `${event.detail}${event.changed ? ` · ${event.label}` : ""}`, style: event.changed ? styles.changed : "" };
  });
  if (reconnectedAt !== null) items.push({ title: "Stream reconnected", label: "Transport restored", time: `${new Date(reconnectedAt).toISOString().slice(11,19)} UTC`, detail: "Observed transport transition · wall-clock time", style: styles.reconnected });
  if (historical) items.push({ title: "Stream inactive", label: "Snapshot retained", time: `${receivedAt ? new Date(receivedAt).toISOString().slice(11,19) : "—"} UTC · last received`, detail: "Display status · wall-clock receipt, not model time", style: styles.staleEvent });
  const toneClass = (tone: TimelineLaneView["tone"]) => tone === "changed" ? styles.changed : tone === "reconnected" ? styles.reconnected : tone === "stale" ? styles.staleEvent : "";
  return <InstrumentPanel title="Event timeline" tag="RECEIVED EVENTS · MODEL TIME" className={styles.timeline}>
    <ol data-timeline-track>{lanes.map((lane, index) => <li key={lane.id} data-lane={lane.id} data-slot={index} title={lane.empty ? `${lane.category} · ${lane.detail}` : `${lane.category} · ${lane.title} · ${lane.value} · ${lane.time} · ${lane.detail}`} data-empty={lane.empty} className={toneClass(lane.tone)}>
      <strong data-timeline-label>{lane.title}</strong>
      <span data-timeline-tick tabIndex={0} title={lane.value}>{lane.value}</span>
      <span data-timeline-time tabIndex={0} className={styles.eventTick} title={lane.time}>{lane.time}</span>
      <span data-timeline-category className={styles.eventCategory}>{lane.category}</span>
      <span data-timeline-marker className={styles.eventMarker} aria-hidden="true" />
      <span data-timeline-baseline className={styles.eventBaseline} aria-hidden="true" />
    </li>)}</ol>
    <details className={styles.recentHistory} data-timeline-history>
      <summary>Recent event history</summary>
      <div role="list" className={styles.historyList} aria-label="Recent event history">
        {Array.from({ length: 10 }, (_, index) => {
          const item = items[index];
          return <div role="listitem" key={index} data-history-item={index} data-empty={!item} aria-hidden={!item} className={styles.historyItem}>
            <strong>{item?.title ?? "—"}</strong>
            <span>{item?.label ?? "—"}</span>
            <span>{item?.time ?? "—"}</span>
            <small>{item?.detail ?? "—"}</small>
          </div>;
        })}
      </div>
    </details>
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
    ["Supplied / reported spike events", t ? `${number(t.displaySpikeEvents)} / ${number(t.totalSpikeEvents)}` : "—"],
  ].map(([label, value]) => <div key={label} data-issue={Boolean(t && ((label === "Display drops" && t.droppedDisplayFrames > 0) || (label === "Subscriber drops" && t.droppedSubscriberMessages > 0) || (label === "Input freshness" && (!t.inputFresh || t.inputSequence < 0)) || (label === "Latest-frame age" && (ageMs === null || ageMs >= 5000))))}><dt>{label}</dt><dd><i />{value}</dd></div>)}</dl><button className={styles.evidenceLink} onClick={onEvidence}>View diagnostics ↗</button></InstrumentPanel>;
}

export function AiObserverRail({ evidence, historical, onEvidence, onInterpret }: { evidence: FruitFlyEvidence | null; historical: boolean; onEvidence: () => void; onInterpret?: () => void }) {
  const t = evidence?.telemetry;
  // Persistent semantic slots: neither changing prose nor disappearing caveats are React keys.
  const caveats = Boolean(t && (historical || t.displayTruncated || t.inputSequence < 0 || !t.inputFresh || t.droppedDisplayFrames || t.droppedSubscriberMessages));
  const notes = [
    !t ? "Waiting for a validated simulation frame." : historical ? "Last snapshot only. No current activity claimed." : !caveats ? "No stream caveats reported." : "",
    t?.displayTruncated ? `Display sample: ${number(t.displaySpikeEvents)} / ${number(t.totalSpikeEvents)} events supplied.` : "",
    t ? t.inputSequence < 0 ? "No input reference reported." : !t.inputFresh ? `Input reference ${number(t.inputSequence)} is not fresh.` : "" : "",
    t && (t.droppedDisplayFrames || t.droppedSubscriberMessages) ? "Producer reports dropped data. Inspect stream health." : "",
  ];
  return <aside className={styles.observer} aria-label="Received observations"><InstrumentPanel title="RECEIVED OBSERVATIONS" tag="LOCAL / DETERMINISTIC">
    <section className={styles.observerCard}><h3>READ THIS WINDOW</h3><p>{t ? "Counts above describe the latest received simulation tick. Charts retain received ticks; gaps are unobserved." : "No simulation frames have arrived. This read-only view waits for the simulation host; source diagnostics remain available."}</p><TelemetryTerms evidence={evidence} /></section>
    <section className={styles.streamNotes}><h3>STREAM NOTES</h3><ul>{notes.map((note, slot) => <li key={slot} data-note-slot={slot} data-empty={!note} aria-hidden={!note}>{note || "\u00a0"}</li>)}</ul></section>
    <section className={styles.investigate}><h3>✦ &nbsp; WORTH INVESTIGATING</h3><strong>{!t ? "Wait for the simulation host" : historical ? "Review the retained decoder states" : !t.inputFresh || t.inputSequence < 0 ? "Check input freshness before interpreting" : t.displayTruncated ? "Inspect totals beyond the display sample" : "Compare decoder states across received ticks"}</strong><button type="button" onClick={onEvidence}>Open Evidence <span aria-hidden="true">↗</span></button></section>
    <div className={styles.metaReserved}><button type="button" disabled={!evidence} onClick={onInterpret ?? onEvidence}>✧ &nbsp; Review interpretation <span>ON DEMAND</span></button><p>Local first. Meta requires a question and frozen retained evidence.</p></div>
  </InstrumentPanel><section className={styles.provenance} data-verified={Boolean(evidence)}><span className={styles.microLabel}>{evidence ? "VALIDATED CONNECTOME SOURCE" : "SOURCE PROVENANCE"}</span><strong><i />{evidence ? evidence.provenance.dataset : "Awaiting source verification"}</strong>{evidence && <dl><div><dd>{number(evidence.provenance.neurons)}</dd><dt>loaded graph nodes</dt></div><div><dd>{number(evidence.provenance.edges)}</dd><dt>loaded structural edges</dt></div></dl>}<p>Published structure <span> / </span> Simulated dynamics</p><p>Not recordings from a living fly</p></section></aside>;
}

export function LiveSessionWorkspace({ readSnapshot, embodimentChoice, onEmbodimentChange, replayTotal, question, snapshot, frames, now, onEvidence, onConnect, onDisconnect, onInterpret }: { readSnapshot?: () => FruitFlySnapshot; embodimentChoice?: boolean | null; onEmbodimentChange?: (value: boolean) => void; replayTotal?: number; question?: string; snapshot: FruitFlySnapshot; frames: readonly FruitFlyEvidence[]; now: number | null; onEvidence: () => void; onConnect: () => void; onDisconnect: () => void; onInterpret?: () => void }) {
  const [localChoice, setLocalChoice] = useState<boolean | null>(null);
  const wide = useSyncExternalStore(wideSubscribe, wideSnapshot, serverWidth);
  const choice = embodimentChoice === undefined ? localChoice : embodimentChoice;
  // The procedural visualizer can observe telemetry without an input/control endpoint.
  const embodiment = choice ?? Boolean(wide && !snapshot.presentation);
  const setEmbodiment = onEmbodimentChange ?? setLocalChoice;
  const status = sessionStatus(snapshot, now ?? 0);
  const event = liveEventSummary(snapshot, frames);
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
    <div className={`${styles.statusStrip} ${status.historical ? styles.historical : ""}`}><span>{snapshot.presentation ? "Original timestamps · no current activity claimed" : status.historical && receivedAt ? `Last received: ${new Date(receivedAt).toISOString().replace("T", " ").replace("Z", " UTC")} · No current activity claimed` : status.live ? "Published fruit-fly connectome · Simulated neural dynamics" : snapshot.message}</span><span>{snapshot.presentation ? `REPLAY FRAME ${frames.length} / ${replayTotal ?? frames.length}` : `DISPLAY BUFFER ${frames.length} / ${LIVE_FRAME_LIMIT} frames`}</span></div>
    {!snapshot.presentation && <button type="button" className="text-button" aria-expanded={embodiment} data-prominent={Boolean(snapshot.evidence)} onClick={() => setEmbodiment(!embodiment)}>{embodiment ? "Close experimental embodiment" : "Open experimental embodiment"}</button>}
    <div className={styles.contextSlot} data-question={Boolean(question)}><QuestionCompatibility question={question} snapshot={snapshot} frames={frames} onEvidence={onEvidence} />
    {event && <section className="live-event-highlight" aria-label="Retained event"><span className="eyebrow">{event.label}</span><p>{event.headline}</p><small>Received simulation frames only · gaps unobserved · no causal claim</small><button type="button" className="text-button" onClick={onInterpret ?? onEvidence}>Understand this event ↗</button></section>}
    </div>
    <div className={`${styles.layout} ${!snapshot.evidence ? styles.waitingLayout : ""} ${embodiment && !snapshot.presentation ? styles.withEmbodiment : ""}`}><div className={styles.instruments}><div className={styles.heroGrid} data-open={embodiment && !snapshot.presentation}><ConnectomeActivityView frames={frames} historical={status.historical} />{embodiment && !snapshot.presentation && <section className={styles.embodimentHero} aria-label="Experimental embodiment context"><header><strong>EXPERIMENTAL EMBODIMENT</strong><span>{status.historical ? "RETAINED DECODER CONTEXT" : snapshot.evidence ? "LIVE DECODER CONTEXT" : "NO TELEMETRY"}</span></header><AutonomyPanel readSnapshot={readSnapshot} snapshot={snapshot} /></section>}</div>{snapshot.evidence ? <section className={styles.activity} aria-label="Received simulation activity"><LiveMetricChart frames={frames} metric="spikes" /><LiveMetricChart frames={frames} metric="active" /><p className={styles.chartNote}>Counts per received tick · gaps unjoined · active includes subthreshold, refractory and pending-input states</p></section> : <section className={styles.waiting} aria-label="Waiting for first telemetry frame"><h2>Waiting for first frame</h2><p>Published connectome structure is available. Measurements appear after a validated simulation frame arrives.</p><p>{status.connected ? "The read-only server is connected. Run a trial in the simulation host, or choose REPLAY VALIDATED RUN above." : "Reconnect the simulation server, or choose REPLAY VALIDATED RUN above. No terminal is needed for replay."}</p><button type="button" className="text-button" onClick={onEvidence}>Inspect source diagnostics ↗</button></section>}<EventTimeline frames={frames} historical={status.historical} connected={status.connected} receivedAt={receivedAt} reconnectedAt={transport.reconnectedAt} />{snapshot.evidence && <div className={styles.lowerPanels}><SimulationOutput frames={frames} /><StreamHealth evidence={snapshot.evidence} ageMs={status.ageMs} onEvidence={onEvidence} /></div>}</div><AiObserverRail evidence={snapshot.evidence} historical={status.historical} onEvidence={onEvidence} onInterpret={onInterpret} /></div>
  </div>;
}

/** Reported events, display samples and unique IDs are different quantities. */
export function TelemetryTerms({ evidence }: { evidence: FruitFlyEvidence | null }) {
  const t = evidence?.telemetry;
  return <details className="telemetry-terms"><summary>Events, IDs & display limits</summary>
    <p>Reported spike events count events in one simulation tick. Supplied events are the display sample; a display cap can make this smaller. One neuron can supply multiple events.</p>
    {t && <p>{number(t.totalSpikeEvents)} reported events · {number(t.displaySpikeEvents)} supplied display events · {number(new Set(t.spikeEvents.map(e => e.neuronId)).size)} unique supplied spiking IDs.</p>}
    <p>Mapped/unmapped counts refer to unique supplied IDs with/without published soma coordinates, not total events. Active simulated neurons also include subthreshold, refractory and pending-input states. Published soma coordinates describe structure, not current activity.</p>
    <p>Display drops count omitted display frames; subscriber drops count missed subscriber messages. Neither is a count of silent neurons. Unreceived ticks remain unknown.</p>
  </details>;
}
