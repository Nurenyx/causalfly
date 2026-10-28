import { disconnectedFruitFly, type FruitFlyEvidence, type FruitFlySnapshot } from "./contracts";

export const LIVE_FRAME_LIMIT = 120;
export const LIVE_STALE_AFTER_MS = 5_000;
export const number = (value: number) => value.toLocaleString("en-US");

export interface LiveSession {
  snapshot: FruitFlySnapshot;
  frames: readonly FruitFlyEvidence[];
}

export function emptyLiveSession(): LiveSession {
  return { snapshot: disconnectedFruitFly(), frames: [] };
}

/** Display history only. Evidence objects are retained untouched, never synthesized. */
export function receiveSnapshot(previous: LiveSession, incoming: FruitFlySnapshot): LiveSession {
  const evidence = incoming.evidence;
  const last = previous.snapshot.evidence;
  let frames = previous.frames;
  let latest = last;
  if (evidence && (!last || evidence.telemetry.sessionId !== last.telemetry.sessionId)) {
    frames = [evidence];
    latest = evidence;
  } else if (evidence && last && evidence.telemetry.sequence > last.telemetry.sequence &&
    evidence.telemetry.neuralTick > last.telemetry.neuralTick && evidence.telemetry.simulationMs > last.telemetry.simulationMs) {
    frames = [...frames, evidence].slice(-LIVE_FRAME_LIMIT);
    latest = evidence;
  }
  return { snapshot: { source: "FRUITFLY_XR", state: incoming.state, message: incoming.message, evidence: latest, retentionId: incoming.evidence ? incoming.retentionId : previous.snapshot.retentionId }, frames };
}

export function frameAgeMs(evidence: FruitFlyEvidence | null, now: number): number | null {
  if (!evidence) return null;
  const receipt = Date.parse(evidence.receivedAt);
  // Invalid/future receipt time must never establish freshness.
  return !Number.isFinite(receipt) || receipt > now ? null : now - receipt;
}

export function sessionStatus(snapshot: FruitFlySnapshot, now: number) {
  const ageMs = frameAgeMs(snapshot.evidence, now);
  const connected = snapshot.state === "CONNECTED" || snapshot.state === "DATA RECEIVED";
  const live = snapshot.state === "DATA RECEIVED" && ageMs !== null && ageMs < LIVE_STALE_AFTER_MS;
  const label = snapshot.state === "ERROR" ? "ERROR" : snapshot.state === "CONNECTING" ? "CONNECTING" :
    !connected ? "DISCONNECTED" : !snapshot.evidence ? "WAITING FOR DATA" : live ? "LIVE DATA" : "STALE";
  return { label, connected, live, ageMs, historical: Boolean(snapshot.evidence) && !live,
    tone: live ? "cyan" : label === "ERROR" ? "red" : label === "STALE" ? "amber" : "muted" };
}

/** Deterministic facts, with no provider dependency or inferred behavioral claims. */
export function sessionObservations(evidence: FruitFlyEvidence | null): string[] {
  if (!evidence) return [];
  const t = evidence.telemetry;
  return [
    `${number(t.totalSpikeEvents)} simulated spike events were reported in the latest tick.`,
    `Motor decoder state is ${t.motorMode}.`,
    t.displayTruncated ? `Display data is truncated to ${number(t.displaySpikeEvents)} events.` : `All ${number(t.displaySpikeEvents)} spike events in this tick are included in the display data.`,
    t.inputSequence < 0 ? "No input reference was reported." : t.inputFresh ? "Input reference is fresh." : "Input reference is not fresh.",
    ...(t.droppedDisplayFrames || t.droppedSubscriberMessages ? [`The producer reports ${number(t.droppedDisplayFrames)} dropped display frames and ${number(t.droppedSubscriberMessages)} subscriber drops.`] : []),
  ];
}

export function activitySeries(frames: readonly FruitFlyEvidence[]) {
  return frames.map(({ telemetry: t }) => ({ sequence: t.sequence, tick: t.neuralTick, spikes: t.totalSpikeEvents, active: t.activeNeuronCount }));
}

/** Categorical rows are actual IDs, not spatial coordinates or inferred connections. */
export function activityRaster(frames: readonly FruitFlyEvidence[]) {
  const recent = frames.slice(-24);
  const ids = [...new Set(recent.flatMap((f) => f.telemetry.spikeEvents.map((e) => e.neuronId)))].sort((a, b) => a - b);
  const shown = ids.slice(0, 64);
  const rows = new Map(shown.map((id, row) => [id, row]));
  const points = recent.flatMap((f) => f.telemetry.spikeEvents.flatMap((e) => {
    const row = rows.get(e.neuronId);
    return row === undefined ? [] : [{ neuronId: e.neuronId, modelMs: e.spikeTimeMs, row, sequence: f.telemetry.sequence }];
  }));
  return { ids: shown, totalIds: ids.length, points };
}

export function sessionTimeline(frames: readonly FruitFlyEvidence[]) {
  return frames.map((frame, index) => {
    const t = frame.telemetry;
    const previous = frames[index - 1]?.telemetry;
    const changed = previous && previous.motorMode !== t.motorMode;
    return { sequence: t.sequence, tick: t.neuralTick, modelMs: t.simulationMs, receivedAt: frame.receivedAt,
      label: changed ? `${previous.motorMode} → ${t.motorMode}` : `Frame ${number(t.sequence)} received`,
      detail: `Input reference ${t.inputSequence < 0 ? "unavailable" : number(t.inputSequence)}`, changed: Boolean(changed) };
  }).slice(-6);
}

export interface TelemetrySubscription {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  close(): void;
}

/** Explicit connection only; old callbacks cannot overwrite a replacement stream. */
export function createLiveConnection(
  publish: (snapshot: FruitFlySnapshot) => void,
  open: (url: string) => TelemetrySubscription,
) {
  let current: TelemetrySubscription | null = null;
  const close = () => { const old = current; current = null; old?.close(); };
  const emitState = (state: FruitFlySnapshot["state"], message: string) => publish({ source: "FRUITFLY_XR", state, message, evidence: null });
  return {
    connect() {
      close();
      emitState("CONNECTING", "Opening the read-only research connection.");
      try {
        const subscription = open("/api/sources/fruitfly");
        current = subscription;
        subscription.onmessage = (event) => {
          if (current !== subscription) return;
          try {
            const next = JSON.parse(event.data) as FruitFlySnapshot;
            publish(next);
            if (next.state === "ERROR" || next.state === "DISCONNECTED") close();
          } catch {
            close();
            emitState("ERROR", "The telemetry stream could not be read. Reconnect to retry.");
          }
        };
        subscription.onerror = () => {
          if (current !== subscription) return;
          close();
          emitState("DISCONNECTED", "The telemetry connection was lost. Reconnect to receive new data.");
        };
      } catch {
        emitState("ERROR", "Unable to open the telemetry stream. Reconnect to retry.");
      }
    },
    disconnect() { close(); emitState("DISCONNECTED", "Disconnected. Any evidence shown is the last received snapshot."); },
    dispose: close,
  };
}
