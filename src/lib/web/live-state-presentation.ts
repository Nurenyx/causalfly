import type { FruitFlyEvidence, FruitFlySnapshot } from "../sources/contracts";
import { sessionStatus } from "../sources/live-session";
import { observationalAnalysis } from "./observational-analysis";

/** Presentation of existing transport/freshness facts; no inferred measurements. */
export function liveStatePresentation(snapshot: FruitFlySnapshot, now: number) {
  const status = sessionStatus(snapshot, now);
  return {
    server: snapshot.state === "ERROR" ? "ERROR" : snapshot.state === "CONNECTING" ? "CONNECTING" : status.connected ? "CONNECTED" : "DISCONNECTED",
    stream: status.live ? "LIVE" : status.connected && !snapshot.evidence ? "WAITING FOR FIRST FRAME" : "INACTIVE",
    evidence: snapshot.presentation === "RECORDED_REPLAY" ? "RECORDED REPLAY" : status.live ? "CURRENT" : snapshot.evidence ? "RETAINED SNAPSHOT" : "NONE",
  };
}

/** Uses the existing validated same-session window; ESCAPE output is never a physical escape claim. */
export function escapeCompatibility(question: string, snapshot: FruitFlySnapshot, frames: readonly FruitFlyEvidence[]) {
  const history = observationalAnalysis(snapshot, frames, 0).history;
  return escapeWindowCompatibility(question, history.map(f => f.telemetry));
}

/** Same guard for browser frames and the server's frozen compact window. */
export function escapeWindowCompatibility(question: string, history: readonly { motorMode: string; neuralTick: number; sequence: number }[]) {
  if (!/\bescape\b/i.test(question)) return null;
  if (!history.length) return null;
  const observed = history.filter(f => f.motorMode === "ESCAPE");
  if (!observed.length) return { blocked: true, message: "ESCAPE was not observed in the retained window.", detail: `Observed decoder states: ${[...new Set(history.map(f => f.motorMode))].join(", ")}. Inspect these states, replay available evidence, or collect another trial.` };
  const transition = history.find((f, i) => i > 0 && f.motorMode === "ESCAPE" && history[i-1].motorMode !== "ESCAPE");
  if (!transition) return /\b(before|enter\w*|switch\w*|transition\w*)\b/i.test(question)
    ? { blocked: true, message: "ESCAPE is present, but its entry transition was not observed.", detail: "Retain frames spanning the transition before asking what changed beforehand. Inspect observed decoder states or collect another trial." }
    : { blocked: false, message: `ESCAPE observed at tick ${observed[0].neuralTick}.`, detail: "Its entry transition is not retained. Decoder output does not establish physical escape." };
  return { blocked: false, message: `ESCAPE transition observed at tick ${transition.neuralTick} / sequence ${transition.sequence}.`, detail: "Inspect the preceding received frame and the decoder timeline. Between-frame timing is unknown; decoder output does not establish physical escape." };
}
