import assert from "node:assert/strict";
import test from "node:test";
import { assistantActions, captureAssistantQuestion, observationalBoundary, syntheticAssistantAnswer, workspaceLabels } from "./assistant";
import { createObservationalAction, observationalRequestKey } from "./observational-action";
import { disconnectedFruitFly, type FruitFlyEvidence, type FruitFlySnapshot } from "../sources/contracts";
import type { ObservationalMetaState, ObservationalResult } from "./observational-contracts";
import { demoExperimentSpec } from "../experiment/demo";
import { syntheticDemoNetwork } from "../experiment/network";
import { createEvidencePayload } from "../meta/evidence";
import { createCompactEvidence } from "../meta/compact-evidence";
import type { WebExperimentResult } from "./contracts";

// Offline test quantities only. Never presented as captured simulation evidence.
function frame(sequence: number): FruitFlyEvidence {
  return { source: "FRUITFLY_XR", receivedAt: "2026-10-28T12:00:00Z", provenance: {
    structuralSource: "Published male Drosophila CNS connectome: male-cns:v1.0", dataset: "male-cns:v1.0", connectomeSha256: "test", neurons: 3, edges: 0, dynamics: "SIMULATED", generator: "FruitFly XR brain server", experimentalRecording: false, transport: "observatory/v1",
  }, telemetry: { sessionId: "test-session", sequence, neuralTick: sequence, simulationMs: sequence * 50, totalSpikeEvents: sequence, activeNeuronCount: sequence, motorMode: sequence > 1 ? "ESCAPE" : "IDLE", inputSequence: sequence, inputFresh: true, displaySpikeEvents: 0, displayTruncated: true, droppedDisplayFrames: 0, droppedSubscriberMessages: 0, spikeDisplaySemantics: "EXACT_SPIKES_FIRST_N_FILTERED", edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL", spikeEvents: [], decodedMotor: [] } };
}
const frames = [frame(1), frame(2)];
const snapshot: FruitFlySnapshot = { ...disconnectedFruitFly(), evidence: frames[1], retentionId: "test-reference" };
const question = "Which frame had the most spike events?";
function response(q = question, selected = frames): ObservationalResult {
  return {
    mode: "FAKE META CLIENT",
    evidence: { exactQuestion: q, sessionId: "test-session", retainedFrameCount: selected.length, frames: selected.map(f => ({ sequence: f.telemetry.sequence })), localAnswer: { sufficient: true } } as ObservationalResult["evidence"],
    analysis: { exactQuestion: q, evidenceSufficiency: "SUFFICIENT", observations: ["Offline test"], interpretation: "Offline interpretation", limitations: ["Observational only"], potentialConfounders: [], nextExperiment: { title: "Collect frames", rationale: "Fill gaps", requiredEvidence: ["Received frames"] }, causalClaimAllowed: false },
  };
}

test("every source/workspace offers at most four relevant actions without IO", () => {
  for (const workspace of Object.keys(workspaceLabels) as (keyof typeof workspaceLabels)[]) for (const source of ["FRUITFLY_XR", "SYNTHETIC_FIXTURE"] as const) {
    const actions = assistantActions(source, workspace);
    assert.equal(actions.length, 4);
    assert.equal(new Set(actions.map(a => a.label)).size, 4);
  }
  const compare = assistantActions("FRUITFLY_XR", "compare");
  assert.ok(compare.some(a => a.synthetic));
  assert.ok(compare.some(a => a.workspace === "live"));
  assert.ok(!compare.some(a => a.design));
});

test("submission captures immutable exact question and same-session window without calling Meta", t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; throw new Error("Forbidden"); });
  const mutable = structuredClone(snapshot);
  const history = structuredClone(frames);
  const q = "  What changed before the decoder entered ESCAPE?\n";
  const asked = captureAssistantQuestion(q, mutable, history, Date.parse("2026-10-28T12:00:10Z"));
  const key = observationalRequestKey(asked.question, asked.snapshot, asked.frames);
  mutable.evidence!.telemetry.totalSpikeEvents = 999;
  history.push(frame(3));
  assert.equal(asked.question, q);
  assert.equal(asked.frames.length, 2);
  assert.equal(asked.snapshot.evidence!.telemetry.totalSpikeEvents, 2);
  assert.ok(Object.isFrozen(asked.frames[0].telemetry));
  assert.equal(observationalRequestKey(asked.question, asked.snapshot, asked.frames), key);
  assert.equal(calls, 0);
});

test("observational questions refuse causal claims and empty evidence stays empty", () => {
  assert.equal(captureAssistantQuestion("Why did the decoder enter ESCAPE?", snapshot, frames, 0).answer.sufficient, false);
  const empty = captureAssistantQuestion(question, disconnectedFruitFly(), [], 0);
  assert.equal(empty.answer.evidenceWindow, null);
  assert.equal(observationalRequestKey(question, empty.snapshot, empty.frames), undefined);
  for (const guard of [/Observational only/, /simulated neural dynamics/, /published connectome structure/, /not living-fly recordings/, /does not currently send interventions/, /does not prove physical movement or successful escape/]) assert.match(observationalBoundary, guard);
});

test("exact successful window/question is reused; edits and new windows require explicit new requests", async () => {
  let calls = 0;
  const states: ObservationalMetaState[] = [];
  const analyze = createObservationalAction(s => states.push(s), async (_url, init) => {
    calls++;
    const input = JSON.parse(String(init?.body));
    return Response.json({ ok: true, result: response(input.researchQuestion, input.sequences.map(frame)) });
  });
  await analyze(question, snapshot, frames);
  assert.equal(calls, 1);
  assert.ok(states.at(-1)?.result);
  // Reopening, source switches and navigation cannot call this event handler.
  await analyze(question, snapshot, [...frames].reverse());
  assert.equal(calls, 1);
  await analyze(`${question} `, snapshot, frames);
  assert.equal(calls, 2);
  const next = { ...snapshot, evidence: frame(3) };
  await analyze(question, next, [...frames, next.evidence]);
  assert.equal(calls, 3);
  await analyze(question, snapshot, frames);
  assert.equal(calls, 3);
});

test("provider failure preserves frozen inputs, never retries itself and requires another explicit action", async () => {
  let calls = 0;
  const states: ObservationalMetaState[] = [];
  const asked = captureAssistantQuestion(question, snapshot, frames, 0);
  const before = JSON.stringify(asked);
  const analyze = createObservationalAction(s => states.push(s), async () => { calls++; throw new Error("secret"); });
  await analyze(asked.question, asked.snapshot, asked.frames);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(calls, 1);
  assert.equal(JSON.stringify(asked), before);
  assert.doesNotMatch(states.at(-1)!.error!, /secret/);
  await analyze(asked.question, asked.snapshot, asked.frames);
  assert.equal(calls, 2);
});

test("malformed, wrong-question, wrong-window and causal provider results are never cached", async () => {
  for (const mutate of [
    (r: ObservationalResult) => { r.analysis.exactQuestion = "different"; },
    (r: ObservationalResult) => { r.evidence.frames = []; },
    (r: ObservationalResult) => { r.analysis.causalClaimAllowed = true as false; },
    (r: ObservationalResult) => { r.analysis.limitations = []; },
  ]) {
    let last: ObservationalMetaState | undefined;
    let calls = 0;
    const analyze = createObservationalAction(s => { last = s; }, async () => {
      calls++; const result = response(); mutate(result); return Response.json({ ok: true, result });
    });
    await analyze(question, snapshot, frames);
    assert.ok(last?.error); assert.equal(last?.result, undefined);
    await analyze(question, snapshot, frames);
    assert.equal(calls, 2);
  }
});

test("synthetic local answers expose only actual engine measurements and do not fabricate new results", () => {
  const compact = createCompactEvidence(createEvidencePayload({ researchQuestion: "Fixture", networkDefinition: syntheticDemoNetwork, experimentSpec: demoExperimentSpec }));
  const result = { spec: compact.experimentSpec, measuredEvidence: compact.comparison, provenance: compact.provenance } as WebExperimentResult;
  const before = JSON.stringify(result);
  const answer = syntheticAssistantAnswer("Explain the measured difference", result);
  assert.ok(answer.facts[0].includes(String(compact.comparison.deltas.outputPeakActivity)));
  assert.match(answer.provenance, /engine/);
  assert.match(syntheticAssistantAnswer("Why does a living fly escape?", result).summary, /does not support/);
  assert.match(syntheticAssistantAnswer("Explain the measured difference", null).summary, /No measured experiment/);
  assert.match(syntheticAssistantAnswer("What does this network represent?", null).facts[0], /no biological identities/);
  assert.equal(JSON.stringify(result), before);
});
