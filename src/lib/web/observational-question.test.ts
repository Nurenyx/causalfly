import assert from "node:assert/strict";
import test from "node:test";
import type { FruitFlyEvidence, FruitFlySnapshot } from "../sources/contracts";
import { disconnectedFruitFly } from "../sources/contracts";
import { workspaceReducer } from "./dashboard";
import { answerObservationalQuestion, fruitFlySuggestions, insufficientEvidence, questionIntent } from "./observational-question";

// Explicit offline unit fixture. Never used as product evidence or screenshots.
function frame(sequence: number, spikeCount: number, mode = "IDLE", inputSequence = 1): FruitFlyEvidence {
  return { source: "FRUITFLY_XR", receivedAt: "2026-10-28T12:00:00Z", provenance: {
    structuralSource: "Published male Drosophila CNS connectome: male-cns:v1.0", dataset: "male-cns:v1.0", connectomeSha256: "unit-fixture", neurons: 3, edges: 0, dynamics: "SIMULATED", generator: "FruitFly XR brain server", experimentalRecording: false, transport: "observatory/v1",
  }, telemetry: { sessionId: "unit-session", sequence, neuralTick: sequence * 2, simulationMs: sequence * 50, totalSpikeEvents: spikeCount, activeNeuronCount: 7 + sequence, motorMode: mode, inputSequence, inputFresh: true, displaySpikeEvents: 0, displayTruncated: true, droppedDisplayFrames: 0, droppedSubscriberMessages: 0, spikeDisplaySemantics: "EXACT_SPIKES_FIRST_N_FILTERED", edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL", spikeEvents: [], decodedMotor: [] } };
}
const frames = [frame(1, 12), frame(3, 84, "IDLE", 2), frame(7, 21, "ESCAPE", 3)];
const snapshot: FruitFlySnapshot = { ...disconnectedFruitFly(), evidence: frames.at(-1)! };
const answer = (q: string, history = frames, source = snapshot) => answerObservationalQuestion(q, source, history, Date.parse("2026-10-28T12:00:10Z"));

test("all suggestion questions route to safe observational intents", () => {
  assert.deepEqual(fruitFlySuggestions.map(questionIntent), ["DECODER_CHANGE", "ACTIVITY_CHANGE", "SPIKE_COUNT", "INPUT_REFERENCE", "NEXT_EXPERIMENT"]);
  assert.equal(questionIntent("What should we test next?"), "NEXT_EXPERIMENT");
  assert.equal(questionIntent("Is the stream stale?"), "STREAM_STATE");
  assert.equal(questionIntent("Summarize the session"), "GENERAL_SESSION");
});
test("FruitFly submission preserves exact whitespace, punctuation and question; cannot submit an experiment", (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; throw new Error("No requests allowed"); });
  const question = "  Which frame had the most spike events?\nKeep this EXACT.  ";
  const synthetic = { workspace: "observatory" as const, question: "Synthetic question", result: null };
  const state = workspaceReducer(synthetic, { type: "fruitfly-ask", question, sessionId: "unit-session" });
  assert.equal(state.fruitFlyAskedQuestion, question);
  assert.equal(state.fruitFlyQuestion, question);
  assert.equal(state.workspace, "live");
  assert.equal(state.question, synthetic.question);
  assert.equal(state.result, synthetic.result);
  assert.equal(answer(question).question, question);
  assert.equal(requests, 0);
});
test("question without evidence stays in Live Connectome and remains preserved", () => {
  const state = workspaceReducer({ workspace: "observatory", question: "Synthetic", result: null }, { type: "fruitfly-ask", question: "Original" });
  assert.equal(state.workspace, "live");
  assert.equal(state.fruitFlyAskedQuestion, "Original");
});
test("editing a draft does not overwrite the submitted question or synthetic draft", () => {
  const asked = workspaceReducer({ workspace: "observatory", question: "Synthetic", result: null }, { type: "fruitfly-ask", question: "Asked", sessionId: "unit-session" });
  const draft = workspaceReducer(asked, { type: "fruitfly-question", question: "Draft" });
  assert.equal(draft.fruitFlyAskedQuestion, "Asked");
  assert.equal(draft.fruitFlyQuestion, "Draft");
  assert.equal(draft.question, "Synthetic");
});

test("investigation binds to the first received session and stays associated after navigation or a new session", (t) => {
  t.mock.method(globalThis, "fetch", async () => { assert.fail("Setting an investigation cannot call Meta"); });
  const initial = { workspace: "live" as const, question: "Synthetic", result: null };
  const set = workspaceReducer(initial, { type: "fruitfly-ask", question: " Exact question? " });
  const bound = workspaceReducer(set, { type: "fruitfly-session", sessionId: "session-a" });
  assert.equal(bound.fruitFlyAskedQuestion, " Exact question? ");
  assert.equal(bound.fruitFlyQuestionSessionId, "session-a");
  assert.equal(workspaceReducer(bound, { type: "navigate", workspace: "evidence" }).fruitFlyQuestionSessionId, "session-a");
  const changed = workspaceReducer(bound, { type: "fruitfly-session", sessionId: "session-b" });
  assert.equal(changed.fruitFlyQuestionSessionId, "session-a");
  const reset = workspaceReducer(changed, { type: "fruitfly-ask", question: "Next?", sessionId: "session-b" });
  assert.equal(reset.fruitFlyQuestionSessionId, "session-b");
  assert.equal(reset.workspace, "live");
  assert.equal(workspaceReducer(reset, { type: "fruitfly-ask", question: " " }), reset);
});
test("maximum spike-event query reports the supplied maximum, not latest or display count", () => {
  const result = answer("Which frame had the most spike events?");
  assert.equal(result.sufficient, true);
  assert.match(result.summary, /84 simulated spike events/);
  assert.match(result.facts[0], /frame 3 \/ simulation tick 6 \/ model time 150 ms/);
});
test("maximum query includes ties and zero is a valid supplied measurement", () => {
  const history = [frame(1, 0), frame(2, 0)];
  const result = answer("Which frame had maximum spikes?", history, { ...snapshot, evidence: history[1] });
  assert.match(result.summary, /0 simulated spike events/);
  assert.equal(result.facts.length, 3);
});
test("decoder transition uses received history only, with preceding counts and input references", () => {
  const result = answer("What changed before the decoder entered ESCAPE?");
  assert.equal(result.sufficient, true);
  assert.match(result.facts.join(" "), /IDLE to ESCAPE/);
  assert.match(result.facts.join(" "), /tick 6.*tick 14/);
  assert.match(result.facts.join(" "), /count 84; transition-frame count 21/);
  assert.match(result.facts.join(" "), /#2 \(fresh\) → #3/);
  assert.match(result.facts.join(" "), /Between-frame timing is unknown/);
});
test("first-frame ESCAPE does not establish a transition", () => {
  const result = answer("What changed before the decoder entered ESCAPE?", [frames[2]]);
  assert.equal(result.summary, insufficientEvidence);
  assert.equal(result.sufficient, false);
});
test("no observed ESCAPE transition is explicitly insufficient", () => {
  const history = [frame(1, 1), frame(2, 2)];
  const result = answer("What changed before the decoder entered ESCAPE?", history, { ...snapshot, evidence: history[1] });
  assert.equal(result.summary, insufficientEvidence);
  assert.match(result.missing!, /No transition into ESCAPE/);
});
test("input reference query reports only supplied references, not stimulus values", () => {
  const result = answer("Did the input reference change?");
  assert.equal(result.intent, "INPUT_REFERENCE");
  assert.match(result.summary, /2 input-reference change/);
  assert.match(result.facts.join(" "), /do not supply stimulus values/);
});
test("input changes before decoder are ordered by received frames, not inferred within gaps", () => {
  const result = answer("Did the input reference change before the decoder changed state?");
  assert.equal(result.sufficient, true);
  assert.match(result.facts.join(" "), /Before the decoder transition.*frame 3/);
  const simultaneous = answer("Did the input reference change before the decoder changed state?", [frames[0], frames[2]]);
  assert.equal(simultaneous.summary, insufficientEvidence);
  assert.match(simultaneous.missing!, /same received interval cannot be ordered/);
});
test("missing references are not reported as observed input changes", () => {
  const history = [frame(1, 2, "IDLE", -1), frame(2, 4)];
  const result = answer("Did the input reference change?", history, { ...snapshot, evidence: history[1] });
  assert.equal(result.summary, insufficientEvidence);
  assert.match(result.missing!, /Input references are missing/);
});
test("activity comparison uses supplied endpoints without filling missing ticks", () => {
  const result = answer("How did simulated activity change across received ticks?");
  assert.match(result.summary, /12 to 21/);
  assert.match(result.facts.join(" "), /from 8 to 14/);
  assert.match(result.facts.join(" "), /not interpolated/);
});
test("one frame cannot establish activity change", () => {
  assert.equal(answer("How did activity change?", [frames[2]]).summary, insufficientEvidence);
});
test("unsupported population, biological, causal and unrelated questions need explicit missing evidence", () => {
  for (const q of ["Why did LC4 cause escape?", "What is LPLC2 activity?", "Did this prove a biological mechanism?", "What is the weather?", "How many synapses spiked?"]) {
    const result = answer(q);
    assert.equal(result.question, q);
    assert.equal(result.intent, "UNSUPPORTED");
    assert.equal(result.summary, insufficientEvidence);
    assert.match(result.missing!, /measurements/);
    assert.match(result.facts[0], /Available: 3 received frames/);
  }
});
test("history excludes other sessions and future frames, sorts received sequences and never mutates evidence", () => {
  const unrelated = { ...frame(2, 999), telemetry: { ...frame(2, 999).telemetry, sessionId: "other-session" } };
  const history = [frames[2], unrelated, frames[0], frame(8, 1000), frames[1]];
  const before = JSON.stringify(history);
  const result = answer("Which frame had the most spikes?", history);
  assert.match(result.summary, /84 simulated spike events/);
  assert.deepEqual(result.evidenceWindow?.sequences, [1, 3, 7]);
  assert.equal(JSON.stringify(history), before);
});
test("retained snapshot remains usable if history array is empty", () => {
  assert.match(answer("Which frame had the most spikes?", []).summary, /21 simulated spike events/);
});
test("stream state reports a retained disconnected snapshot without claiming live activity", () => {
  const result = answer("Is the stream connected?");
  assert.match(result.summary, /Connection: DISCONNECTED/);
  assert.match(result.facts.join(" "), /do not establish current activity/);
});
test("next experiment uses existing deterministic suggestions without running anything", () => {
  const result = answer("What should we test next?");
  assert.equal(result.sufficient, true);
  assert.match(result.summary, /suggestions, not findings/);
  assert.match(result.facts[0], /second session under a controlled input/);
});
test("empty telemetry explicitly requires validated frames", () => {
  const result = answer("Which frame had most spikes?", [], disconnectedFruitFly());
  assert.equal(result.summary, insufficientEvidence);
  assert.match(result.missing!, /Receive validated/);
  assert.equal(result.evidenceWindow, null);
});
test("unimplemented statistics and narrower time windows never silently become a maximum query", () => {
  for (const question of ["How many spikes in frame 1?", "Which frame had the lowest spike-event count?", "Which frame had the most spikes before ESCAPE?", "Which frame had the highest average spike-event count?"]) {
    assert.equal(answer(question).summary, insufficientEvidence, question);
  }
});
test("named decoder target is respected even when other transitions exist", () => {
  const result = answer("What changed before the decoder entered FLYING?");
  assert.equal(result.summary, insufficientEvidence);
  assert.match(result.missing!, /No transition into FLYING/);
});
test("unknown named populations do not fall through to aggregate activity", () => {
  assert.equal(answer("How did LC5 activity change across received ticks?").intent, "UNSUPPORTED");
});
test("latest decoder-state question uses even a single retained frame", () => {
  const result = answer("What is the decoder state?", [frames[2]]);
  assert.equal(result.sufficient, true);
  assert.match(result.summary, /ESCAPE/);
});
