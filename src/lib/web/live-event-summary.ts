import type { FruitFlyEvidence, FruitFlySnapshot } from "../sources/contracts";

/** Highlight a received change, or a received peak; never infer unseen ticks or cause. */
export function liveEventSummary(snapshot: FruitFlySnapshot, frames: readonly FruitFlyEvidence[]) {
  const latest = snapshot.evidence;
  if (!latest) return null;
  const t = latest.telemetry;
  const history = [...new Map([...frames, latest]
    .filter(({ telemetry: frame }) => frame.sessionId === t.sessionId && frame.sequence <= t.sequence && frame.neuralTick <= t.neuralTick && frame.simulationMs <= t.simulationMs)
    .map(frame => [frame.telemetry.sequence, frame])).values()]
    .sort((a, b) => a.telemetry.sequence - b.telemetry.sequence);
  for (let index = history.length - 1; index > 0; index--) {
    const before = history[index - 1].telemetry;
    const after = history[index].telemetry;
    if (before.motorMode !== after.motorMode) return {
      label: "DECODER CHANGE / RETAINED WINDOW",
      headline: `The simulated decoder changed from ${before.motorMode} to ${after.motorMode} across received ticks ${before.neuralTick}–${after.neuralTick}.`,
    };
  }
  const peak = history.reduce((highest, frame) => frame.telemetry.totalSpikeEvents > highest.telemetry.totalSpikeEvents ? frame : highest).telemetry;
  return {
    label: "HIGHEST RECEIVED SPIKE COUNT",
    headline: `The retained window peaked at ${peak.totalSpikeEvents.toLocaleString("en-US")} simulated spike events at tick ${peak.neuralTick}; the decoder reported ${peak.motorMode}.`,
  };
}
