import type { FruitFlyEvidence, FruitFlySnapshot } from "../sources/contracts";
import { number } from "../sources/live-session";
import { observationalAnalysis } from "./observational-analysis";

export const insufficientEvidence = "The retained telemetry does not contain enough evidence to answer this question.";
export type QuestionIntent = "DECODER_CHANGE" | "SPIKE_COUNT" | "ACTIVITY_CHANGE" | "INPUT_REFERENCE" | "STREAM_STATE" | "NEXT_EXPERIMENT" | "GENERAL_SESSION" | "UNSUPPORTED";
export const fruitFlyExampleQuestion = "What changed before the decoder entered ESCAPE?";
export const fruitFlySuggestions = [
  "What changed before the decoder switched to ESCAPE?",
  "How did simulated activity change across the received ticks?",
  "Which received frame showed the largest spike-event count?",
  "Did the input reference change before the decoder changed state?",
  "What evidence should we collect in the next session?",
] as const;

/** Conservative routing only. Recognizing a keyword never establishes an answer. */
export function questionIntent(question: string): QuestionIntent {
  const q = question.toLowerCase();
  if (/\b(why|cause[ds]?|prove[ds]?|mechanism|biological|living|[a-z]{1,6}\d+|synap\w*|population|firing rate|physical|actual movement|predict\w*|correlat\w*|voltage|neurotransmitter|neurons?|cells?|connectivity|connections|edges)\b/.test(q)) return "UNSUPPORTED";
  if (/\b(next|follow.up)\b/.test(q) && /\b(test|experiment|collect|evidence|session)\b/.test(q)) return "NEXT_EXPERIMENT";
  if (/\binput reference\b/.test(q)) return "INPUT_REFERENCE";
  if (/\bdecoder\b/.test(q) && /\b(change\w*|switch\w*|enter\w*|before|state|output)\b/.test(q)) return "DECODER_CHANGE";
  if (/\b(spike[ -]?(event|count)|spike events|spikes)\b/.test(q) && /\b(most|maximum|max|largest|highest|count|many)\b/.test(q)) return "SPIKE_COUNT";
  if (/\bactivity\b/.test(q) && /\b(change\w*|across|ticks|frames)\b/.test(q)) return "ACTIVITY_CHANGE";
  if (/\b(stream|connection|connected|stale|disconnected)\b/.test(q)) return "STREAM_STATE";
  if (/^(summari[sz]e (the |this )?(retained )?(session|telemetry)|(?:what|which) (evidence|telemetry|frames) (is|are) (available|retained)|session summary)[?.!\s]*$/.test(q.trim())) return "GENERAL_SESSION";
  return "UNSUPPORTED";
}

export interface ObservationalAnswer {
  question: string;
  intent: QuestionIntent;
  sufficient: boolean;
  summary: string;
  facts: string[];
  missing: string | null;
  evidenceWindow: { sessionId: string; sequences: number[] } | null;
}

const location = (t: FruitFlyEvidence["telemetry"]) => `received frame ${number(t.sequence)} / simulation tick ${number(t.neuralTick)} / model time ${number(t.simulationMs)} ms`;
const reference = (t: FruitFlyEvidence["telemetry"]) => t.inputSequence < 0 ? "unavailable" : `#${number(t.inputSequence)} (${t.inputFresh ? "fresh" : "not fresh"})`;

/** Pure evidence-to-answer boundary: future interpreters can consume this question/window. No IO. */
export function answerObservationalQuestion(question: string, snapshot: FruitFlySnapshot, frames: readonly FruitFlyEvidence[], now: number): ObservationalAnswer {
  const intent = questionIntent(question);
  const analysis = observationalAnalysis(snapshot, frames, now);
  const history = analysis.history;
  const first = history[0]?.telemetry;
  const last = history.at(-1)?.telemetry;
  const answer: ObservationalAnswer = {
    question, intent, sufficient: false, summary: insufficientEvidence, facts: [], missing: null,
    evidenceWindow: last ? { sessionId: last.sessionId, sequences: history.map(f => f.telemetry.sequence) } : null,
  };
  const missing = (detail: string) => ({ ...answer, missing: detail, facts: last ? [`Available: ${history.length} received frames; spike-event counts, active simulated neuron counts, decoder output, input references and model times. Latest: ${location(last)}.`] : [] });
  if (!first || !last) return missing("Receive validated FruitFly XR frames in Live Session; a retained session is required.");
  const transitions = history.slice(1).map((frame, i) => ({ previous: history[i].telemetry, current: frame.telemetry }));
  if (intent === "UNSUPPORTED") return missing("Collect explicit measurements for the requested quantity. Named population analysis needs verified neuron-to-population identities and population-resolved telemetry; causal or biological claims need separately documented controlled experiments or biological recordings. This stream supplies neither.");
  if (intent === "NEXT_EXPERIMENT") return { ...answer, sufficient: true, summary: "Collect controlled follow-up evidence; these are investigation suggestions, not findings.", facts: analysis.suggestions.map(s => `${s.title}. ${s.rationale}`) };
  if (intent === "SPIKE_COUNT") {
    if (/\b(before|after|until|during|between|session[s]?\s+\w+)\b/i.test(question)) return missing("This handler can report the maximum across this retained session window. A requested subwindow or cross-session comparison needs explicitly scoped retained frames; it is not replaced with the whole-window maximum.");
    if (!/\b(most|maximum|max|largest|highest)\b/i.test(question)) return missing("Specify the maximum supplied spike-event count across retained received frames. Other count statistics or a particular frame need an explicitly scoped query; they are not substituted with a maximum.");
    if (/\b(lowest|minimum|min|least|average|mean|median)\b/i.test(question)) return missing("This local handler supports a maximum-count query only. The requested statistic needs a separate calculation over the retained frame counts.");
    const maximum = Math.max(...history.map(f => f.telemetry.totalSpikeEvents));
    const maxima = history.filter(f => f.telemetry.totalSpikeEvents === maximum);
    return { ...answer, sufficient: true, summary: `The maximum supplied count is ${number(maximum)} simulated spike events per received tick.`, facts: maxima.map(f => `${location(f.telemetry)} supplied ${number(maximum)} events.`).concat("Maximum within the retained received frames only; unreceived ticks are unknown.") };
  }
  if (intent === "ACTIVITY_CHANGE") {
    if (/\b(before|after|until|during|between)\b/i.test(question)) return missing("Retain and explicitly select the requested activity subwindow. This handler compares endpoints across the full retained window only.");
    if (history.length < 2) return missing("Retain at least two same-session frames with spike-event counts and active simulated neuron counts to compare activity.");
    return { ...answer, sufficient: true, summary: `Across ${history.length} received frames, supplied simulated spike-event counts changed from ${number(first.totalSpikeEvents)} to ${number(last.totalSpikeEvents)}.`, facts: [`First: ${location(first)}; last: ${location(last)}.`, `Active simulated neurons changed from ${number(first.activeNeuronCount)} to ${number(last.activeNeuronCount)}.`, "These are endpoint comparisons across received ticks; missing ticks are not interpolated."] };
  }
  if (intent === "DECODER_CHANGE" || intent === "INPUT_REFERENCE") {
    if (intent === "DECODER_CHANGE" && !/\b(change\w*|switch\w*|enter\w*|before)\b/i.test(question)) return { ...answer, sufficient: true, summary: `Latest supplied decoder output: ${last.motorMode}.`, facts: [`At ${location(last)}. Decoder output does not establish physical movement.`] };
    if (intent === "INPUT_REFERENCE" && !/\b(change\w*|before)\b/i.test(question)) return missing("Ask whether the supplied input reference changed. The stream supplies a reference ID and freshness flag, but no stimulus values, identity or input contents.");
    if (history.length < 2) return missing("Retain same-session frames before and after the requested change, including decoder state, input reference, counts and model time.");
    const namedState = /\b(?:entered|enter|enters|switched to|switch to|switches to|transitioned to|transition into|from \w+ to)\s+([a-z_]+)\b/i.exec(question)?.[1];
    const requestedState = namedState?.toUpperCase() ?? (/\bescape\b/i.test(question) ? "ESCAPE" : null);
    const decoderChanges = transitions.filter(({ previous, current }) => previous.motorMode !== current.motorMode && (!requestedState || current.motorMode === requestedState));
    const beforeDecoder = intent === "INPUT_REFERENCE" && /\bbefore\b/i.test(question) && /\bdecoder\b/i.test(question);
    if (intent === "DECODER_CHANGE" || beforeDecoder) {
      if (!decoderChanges.length) return missing(`No ${requestedState ? `transition into ${requestedState}` : "decoder transition"} was observed in this retained window. Capture received frames spanning the requested transition; a state already present in the first frame does not establish when it began.`);
      const facts = decoderChanges.flatMap(({ previous, current }) => [
        `Decoder output changed from ${previous.motorMode} to ${current.motorMode}: ${location(previous)} → ${location(current)}.`,
        `Prior supplied spike-event count ${number(previous.totalSpikeEvents)}; transition-frame count ${number(current.totalSpikeEvents)}. Input reference ${reference(previous)} → ${reference(current)}.`,
      ]);
      if (beforeDecoder) {
        const target = decoderChanges[0];
        const priorChanges = transitions.filter(({ previous, current }) => current.sequence < target.current.sequence && previous.inputSequence >= 0 && current.inputSequence >= 0 && previous.inputSequence !== current.inputSequence);
        facts.push(...priorChanges.map(({ previous, current }) => `Before the decoder transition, input reference changed ${reference(previous)} → ${reference(current)} at ${location(current)}.`));
        if (!priorChanges.length) return { ...missing("No earlier input-reference change was received before the decoder transition. Capture finer-grained frames with supplied references to establish the order; changes in the same received interval cannot be ordered."), facts };
      }
      return { ...answer, sufficient: true, summary: beforeDecoder ? "An input-reference change was received before the decoder transition." : "The retained frames show a decoder transition and its preceding received snapshot.", facts: facts.concat("Between-frame timing is unknown. ESCAPE is a decoder output; this does not establish physical movement or a causal effect.") };
    }
    if (history.some(f => f.telemetry.inputSequence < 0)) return missing("Input references are missing in part of this window. Capture supplied inputSequence values across the comparison; unavailable references cannot establish a change.");
    const changes = transitions.filter(({ previous, current }) => previous.inputSequence !== current.inputSequence);
    return { ...answer, sufficient: true, summary: changes.length ? `${changes.length} input-reference change(s) observed in received telemetry.` : "No input-reference change was observed in the retained received frames.", facts: changes.map(({ previous, current }) => `${reference(previous)} → ${reference(current)} at ${location(current)}.`).concat(`Latest input reference: ${reference(last)}. References and freshness flags do not supply stimulus values or establish matched conditions.`) };
  }
  return { ...answer, sufficient: true, summary: intent === "STREAM_STATE" ? `Connection: ${snapshot.state}. Retained evidence status: ${analysis.status.label}.` : `${history.length} received frames retained from this simulation session.`, facts: [`Latest: ${location(last)}.`, ...analysis.observations] };
}
