import { MAX_TICKS, type AutonomyFrame, type WorldState } from "./autonomy";

/** Presentation facts only: absence of ESCAPE is conclusive only for a complete window. */
export function phenotypeSummary(frames: readonly AutonomyFrame[], complete: boolean) {
  if (!frames.length) return { label: "NO RETAINED EVIDENCE", detail: "Awaiting recorded positions", peakAltitude: null, displacement: null };
  const heights = frames.map(f => f.after.altitude).filter((h): h is number => typeof h === "number" && Number.isFinite(h));
  const peakAltitude = heights.length ? Math.max(...heights) : null;
  const fullWindow = complete && frames.length === MAX_TICKS && frames.every((f, i) => f.tick === i + 1);
  const escaped = frames.some(f => f.decision.state === "ESCAPE");
  const first = frames[0].before, last = frames[frames.length - 1].after;
  return { label: escaped ? "ESCAPE" : fullWindow ? "NO ESCAPE RECORDED" : "OBSERVING",
    detail: escaped ? peakAltitude === null ? "Escape selected; takeoff height unavailable" : peakAltitude > .2 ? "Aerial takeoff recorded" : "Escape selected; no clear takeoff recorded" : fullWindow ? heights.length === frames.length && peakAltitude !== null && peakAltitude <= .01 ? "Remained grounded in this window" : "Movement recorded without ESCAPE" : "Outcome pending; trial still running",
    peakAltitude, displacement: Math.hypot(last.x - first.x, last.z - first.z) };
}

/** Restrained path sampled exclusively from retained frames, ending at the displayed cursor. */
export function recordedPath(frames: readonly AutonomyFrame[], throughTick: number, limit = 100): WorldState[] {
  const retained = frames.filter(f => f.tick <= throughTick).slice(-240);
  if (!retained.length) return [];
  const stride = Math.max(1, Math.ceil(retained.length / limit));
  return [retained[0].before, ...retained.filter((_, i) => i % stride === 0 || i === retained.length - 1).map(f => f.after)];
}
