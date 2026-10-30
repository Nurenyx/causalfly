import type { ObservationalResult } from "./observational-contracts";
import type { FruitFlyEvidence, FruitFlySnapshot } from "../sources/contracts";

export const frameIdentity = (frame: FruitFlyEvidence) => `${frame.telemetry.sessionId}:${frame.telemetry.sequence}`;

/** Receipt boundary plus exact exclusions prevent retained/replayed frames from answering a new question. */
export function investigationWindow(snapshot: FruitFlySnapshot, frames: readonly FruitFlyEvidence[], boundary?: { startedAt: string; excluded: readonly string[] }) {
  const eligible = boundary ? frames.filter(frame => Date.parse(frame.receivedAt) > Date.parse(boundary.startedAt) && !boundary.excluded.includes(frameIdentity(frame))) : [];
  const evidence = snapshot.evidence && eligible.includes(snapshot.evidence) ? snapshot.evidence : eligible.at(-1) ?? null;
  return { snapshot: { ...snapshot, evidence }, frames: eligible };
}

/** A matching question alone cannot authorize an interpretation of an older window. */
export function interpretationBelongsToObservation(result: ObservationalResult | undefined, question: string | undefined, frames: readonly FruitFlyEvidence[]): boolean {
  return Boolean(result && result.analysis.exactQuestion === question && result.evidence.frames.length && result.evidence.frames.every(frame => frames.some(active => active.telemetry.sessionId === result.evidence.sessionId && active.telemetry.sequence === frame.sequence)));
}
