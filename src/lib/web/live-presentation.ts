import type { FruitFlySnapshot } from "../sources/contracts";
import { emptyLiveSession, receiveSnapshot, type LiveSession } from "../sources/live-session";

export const LIVE_PRESENTATION_MS = 180;
/** Ingest every packet using the unchanged evidence reducer. Only publication to React is sampled. */
export function createLivePresentation(paint: (session: LiveSession) => void, schedule: (callback: () => void, ms: number) => ReturnType<typeof setTimeout> = setTimeout, cancel: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout) {
  let current = emptyLiveSession();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const flush = () => {
    if (timer !== undefined) cancel(timer);
    timer = undefined;
    if (!disposed) paint(current);
  };
  return {
    current: () => current,
    resume() { disposed = false; },
    flush,
    receive(snapshot: FruitFlySnapshot) {
      if (disposed) return;
      const firstFrame = !current.snapshot.evidence && Boolean(snapshot.evidence);
      const newSession = snapshot.evidence && snapshot.evidence.telemetry.sessionId !== current.snapshot.evidence?.telemetry.sessionId;
      current = receiveSnapshot(current, snapshot);
      if (snapshot.state !== "DATA RECEIVED" || firstFrame || newSession) flush();
      else if (timer === undefined) timer = schedule(flush, LIVE_PRESENTATION_MS);
    },
    dispose() { disposed = true; if (timer !== undefined) cancel(timer); timer = undefined; },
  };
}
