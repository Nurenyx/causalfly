import type { FruitFlyEvidence, FruitFlySnapshot } from "../sources/contracts";
import { number, sessionObservations, sessionStatus } from "../sources/live-session";

/** Local presentation only: no provider, experiment, inferred activity or new evidence. */
export function observationalAnalysis(snapshot: FruitFlySnapshot, frames: readonly FruitFlyEvidence[], now: number) {
  const evidence = snapshot.evidence;
  const status = sessionStatus(snapshot, now);
  const t = evidence?.telemetry;
  // Restrict comparisons to the retained evidence's session and observation window.
  const retained = evidence ? [...frames, evidence] : [];
  const history = t ? [...new Map(retained
    .filter(({ telemetry: frame }) => frame.sessionId === t.sessionId && frame.sequence <= t.sequence && frame.neuralTick <= t.neuralTick && frame.simulationMs <= t.simulationMs)
    .map(frame => [frame.telemetry.sequence, frame])).values()]
    .sort((a, b) => a.telemetry.sequence - b.telemetry.sequence) : [];
  const changes = history.flatMap((frame, index) => {
    const previous = history[index - 1]?.telemetry;
    const current = frame.telemetry;
    if (!previous) return [];
    return [
      ...(previous.motorMode !== current.motorMode ? [`Decoder state changed from ${previous.motorMode} to ${current.motorMode} between received ticks ${number(previous.neuralTick)} and ${number(current.neuralTick)}.`] : []),
      ...(previous.inputSequence !== current.inputSequence ? [`Input reference changed from ${previous.inputSequence < 0 ? "unavailable" : number(previous.inputSequence)} to ${current.inputSequence < 0 ? "unavailable" : number(current.inputSequence)} between received ticks ${number(previous.neuralTick)} and ${number(current.neuralTick)}.`] : []),
    ];
  });
  const observations = t ? [
    ...(status.historical ? ["Last snapshot retained. These values do not establish current activity."] : []),
    ...sessionObservations(evidence),
    `${number(t.activeNeuronCount)} simulated neurons were active according to the supplied simulation state; this includes neurons that did not spike.`,
  ] : ["No validated simulation frame has been received. Observations begin with retained evidence."];
  const suggestions = !t ? [{
    title: "Receive a validated simulation frame",
    rationale: "Connect in Live Session and start a trial with the existing FruitFly XR client before interpreting telemetry.",
  }] : [
    {
      title: "Capture a second session under a controlled input",
      rationale: `${status.historical ? "Only a retained snapshot is available." : "This evidence describes one simulation session."} Record the input conditions independently before evaluating another session.`,
    },
    {
      title: t.inputSequence < 0 || !t.inputFresh ? "Verify the input reference before a follow-up trial" : "Retain matched stimulus conditions",
      rationale: t.inputSequence < 0 ? "No input reference was supplied. Stimulus values are not provided by this stream." : `Reference ${number(t.inputSequence)} was ${t.inputFresh ? "flagged fresh" : "not flagged fresh"}. A reference and its freshness flag do not establish matched stimulus values.`,
    },
    {
      title: "Inspect decoder transitions across separately captured sessions",
      rationale: `The retained decoder state is ${t.motorMode}. Compare recorded state transitions only after documenting session conditions; decoder output does not establish movement or escape success.`,
    },
  ];
  return { status, history, observations, changes, suggestions };
}
