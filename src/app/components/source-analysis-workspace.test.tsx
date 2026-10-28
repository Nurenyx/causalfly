import assert from "node:assert/strict";
import test, { before } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { demoExperimentSpec } from "../../lib/experiment/demo";
import { syntheticDemoNetwork } from "../../lib/experiment/network";
import { createEvidencePayload } from "../../lib/meta/evidence";
import { createCompactEvidence } from "../../lib/meta/compact-evidence";
import { FakeMetaClient } from "../../lib/meta/fake-client";
import type { WebExperimentResult } from "../../lib/web/contracts";
import type { ScientificAnalysis } from "../../lib/meta/schemas";
import { disconnectedFruitFly, type FruitFlyEvidence, type FruitFlySnapshot } from "../../lib/sources/contracts";
import { connectomeHash, FruitFlyNormalizer } from "../../lib/sources/fruitfly-protocol";
import { emptyLiveSession, receiveSnapshot } from "../../lib/sources/live-session";
import { observationalAnalysis } from "../../lib/web/observational-analysis";
import { workspaceReducer } from "../../lib/web/dashboard";
import { SourceAnalysisWorkspace } from "./source-analysis-workspace";

const receipt = Date.parse("2026-10-28T12:00:00Z");
// Offline protocol fixtures only; never loaded as product telemetry or review imagery.
function evidence(sequence = 1, overrides: Partial<FruitFlyEvidence["telemetry"]> = {}, sessionId = "8c66e194-3693-4ae5-942a-886d819b08bc") {
  const normalizer = new FruitFlyNormalizer();
  normalizer.accept({ version: 1, type: "observatoryHello", dataset: "male-cns:v1.0", connectomeSha256: connectomeHash, neurons: 176422, edges: 6287749, neuronIds: true, spikeEventsAvailable: true, synapticTransmissionEvents: false, edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL", maxDisplaySpikes: 512, maxDisplayEdges: 256 }, new Date(receipt).toISOString());
  return normalizer.accept({ version: 1, type: "observatoryFrame", sessionId, sequence, simulationMs: sequence * 50, neuralTick: sequence, totalSpikeEvents: 3364, activeNeuronCount: 724, displaySpikeEvents: 1, displayTruncated: true, droppedDisplayFrames: 0, droppedSubscriberMessages: 0, spikeDisplaySemantics: "EXACT_SPIKES_FIRST_N_FILTERED", edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL", spikeEvents: [{ neuronId: 10000000001, spikeTimeMs: sequence * 50 }], decodedMotor: [{ name: "jump", value: .4321234567 }], inputSequence: sequence, inputFresh: true, motorMode: "ESCAPE", ...overrides }, new Date(receipt + sequence).toISOString())!;
}
function snapshot(value = evidence(), state: FruitFlySnapshot["state"] = "DATA RECEIVED"): FruitFlySnapshot {
  return { source: "FRUITFLY_XR", state, message: "Offline test stream", evidence: value };
}
const compact = createCompactEvidence(createEvidencePayload({ researchQuestion: "Synthetic source-boundary test", networkDefinition: syntheticDemoNetwork, experimentSpec: demoExperimentSpec }));
let result: WebExperimentResult;
before(async () => {
  const analysis = JSON.parse(await new FakeMetaClient().complete({ task: "interpret", system: "", inputJson: JSON.stringify(compact), responseSchema: {} })) as ScientificAnalysis;
  result = { researchQuestion: compact.researchQuestion, mode: "FAKE META CLIENT", spec: compact.experimentSpec, measuredEvidence: compact.comparison, provenance: compact.provenance, analysis };
});
const noop = () => {};
const props = { get result() { return result; }, snapshot: snapshot(), frames: [evidence()], now: receipt + 20, onNext: noop, onFullAnalysis: noop, onEvidence: noop, onLive: noop, onSynthetic: noop, onStart: noop };
function render(source: "FRUITFLY_XR" | "SYNTHETIC_FIXTURE", workspace: "compare" | "scientist", overrides: Partial<typeof props> = {}) {
  return renderToStaticMarkup(<SourceAnalysisWorkspace {...props} {...overrides} source={source} workspace={workspace} />);
}

test("FruitFly Compare requires matched trials and never renders the retained synthetic result", () => {
  const html = render("FRUITFLY_XR", "compare");
  assert.match(html, /COMPARE \/ FRUITFLY XR/);
  assert.match(html, /Controlled comparison requires matched trials/);
  assert.match(html, /CONTROL SESSION/);
  assert.match(html, /INTERVENTION SESSION/);
  assert.equal((html.match(/NOT YET SUPPLIED/g) ?? []).length, 2);
  assert.match(html, /does not currently send interventions/);
  for (const forbidden of [/primary_a/, /measured-deltas/, /condition-grid/, /Evidence playback/i, /Synthetic source-boundary test/]) assert.doesNotMatch(html, forbidden);
  for (const action of [/Open Live Session/, /Inspect Evidence/, /Use Synthetic Fixture/]) assert.match(html, action);
});

test("FruitFly AI Scientist renders exact retained telemetry and source identity", () => {
  const html = render("FRUITFLY_XR", "scientist");
  for (const actual of [/3,364/, /724/, /ESCAPE/, /male-cns:v1.0/, /8c66e194-3693-4ae5-942a-886d819b08bc/, /50 ms/, /0.4321234567/, /Truncated display sample/, /#1 \/ Fresh/]) assert.match(html, actual);
  assert.doesNotMatch(html, /primary_a|supportsHypothesis|hypothesis state/i);
});

test("FruitFly AI Scientist is observational and Meta control needs an explicit question and retained reference", () => {
  const html = render("FRUITFLY_XR", "scientist");
  assert.match(html, /OBSERVATIONAL ANALYSIS/);
  assert.match(html, /Observational telemetry does not establish causal effect/);
  assert.match(html, /did not apply an intervention/);
  assert.match(html, /not recordings from a living fly/);
  assert.match(html, /SUGGESTIONS \/ NOT FINDINGS/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>ANALYZE WITH META/);
  assert.match(html, /Interpret the exact question using a frozen window/);
});

test("stale and disconnected evidence remains visible without claiming current activity", () => {
  for (const state of ["DATA RECEIVED", "DISCONNECTED", "CONNECTED", "ERROR"] as const) {
    const html = render("FRUITFLY_XR", "scientist", { snapshot: snapshot(evidence(), state), now: receipt + 5001 });
    assert.match(html, /LAST SNAPSHOT/);
    assert.match(html, /No current activity is claimed/);
    assert.match(html, /3,364/);
    assert.doesNotMatch(html, />LIVE</);
  }
});

test("empty FruitFly analysis waits for evidence and does not manufacture readouts", () => {
  const html = render("FRUITFLY_XR", "scientist", { snapshot: disconnectedFruitFly(), frames: [] });
  assert.match(html, /No validated simulation frame has been received/);
  assert.match(html, /AWAITING DATA/);
  assert.doesNotMatch(html, /3,364|724|ESCAPE|VERIFIED SOURCE/);
});

test("Synthetic Compare retains full controlled comparison, playback, charts and propagation", () => {
  const html = render("SYNTHETIC_FIXTURE", "compare");
  for (const expected of [/CONTROL/, /INTERVENTION/, /primary_a/, /Play recorded activity/, /activity-chart/, /Causal propagation/, /measured-deltas/, /AI SCIENTIST/]) assert.match(html, expected);
  assert.doesNotMatch(html, /COMPARISON UNAVAILABLE|OBSERVATIONAL ANALYSIS/);
});

test("Synthetic AI Scientist retains controlled-experiment analysis and qualified support", () => {
  const html = render("SYNTHETIC_FIXTURE", "scientist");
  for (const expected of [/What did we find/, /HYPOTHESIS TESTED/, /INCONCLUSIVE/, /Key measured observations/, /View full analysis/, /Use as Next Question/, /primary_a/]) assert.match(html, expected);
  assert.doesNotMatch(html, /FRUITFLY XR \/ OBSERVATIONAL ANALYSIS/);
});

test("rendering source switches preserves synthetic evidence and its workspace state", () => {
  let state = workspaceReducer({ workspace: "observatory", question: "Retain this question", result: null }, { type: "completed", result });
  const before = JSON.stringify(state.result);
  render("FRUITFLY_XR", "compare", { result: state.result! });
  state = workspaceReducer(state, { type: "navigate", workspace: "scientist" });
  render("FRUITFLY_XR", "scientist", { result: state.result! });
  assert.equal(state.result, result);
  assert.equal(JSON.stringify(state.result), before);
  assert.match(render("SYNTHETIC_FIXTURE", "scientist", { result: state.result! }), /HYPOTHESIS TESTED/);
});

test("navigation/page rendering makes no fetch or Meta request", () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => { calls++; throw new Error("Navigation must not fetch"); }) as typeof fetch;
  try {
    for (const source of ["FRUITFLY_XR", "SYNTHETIC_FIXTURE"] as const) for (const workspace of ["compare", "scientist"] as const) render(source, workspace);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});

test("observations compare only received same-session frames, preserving gaps and values", () => {
  const first = evidence(1, { motorMode: "IDLE", inputSequence: 1 });
  const last = evidence(4, { motorMode: "ESCAPE", inputSequence: 3 });
  const unrelated = evidence(2, {}, "08f6310f-b69a-4a1e-a471-e64be859c166");
  const future = evidence(5);
  const frames = [first, unrelated, last, future];
  const before = JSON.stringify(frames);
  const analysis = observationalAnalysis(snapshot(last), frames, receipt + 20);
  assert.deepEqual(analysis.history, [first, last]);
  assert.equal(analysis.changes.length, 2);
  assert.match(analysis.changes[0], /IDLE to ESCAPE between received ticks 1 and 4/);
  assert.match(analysis.changes[1], /Input reference changed from 1 to 3/);
  assert.equal(JSON.stringify(frames), before);
  assert.equal(analysis.status.live, true);
});

test("retained session status and suggestions respect freshness and missing input references", () => {
  const value = evidence(1, { inputSequence: -1, inputFresh: false });
  const session = receiveSnapshot(receiveSnapshot(emptyLiveSession(), snapshot(value)), { ...disconnectedFruitFly(), evidence: null });
  const analysis = observationalAnalysis(session.snapshot, session.frames, receipt + 6000);
  assert.equal(analysis.status.historical, true);
  assert.equal(session.snapshot.evidence, value);
  assert.ok(analysis.observations.includes("No input reference was reported."));
  assert.match(analysis.suggestions[1].rationale, /No input reference was supplied/);
  assert.equal(observationalAnalysis(disconnectedFruitFly(), [], receipt).suggestions.length, 1);
});

test("FruitFly Scientist prominently displays the exact submitted question before metadata", () => {
  const question = "  Which received frame had the most spike events?\nExact question.  ";
  const html = renderToStaticMarkup(<SourceAnalysisWorkspace {...props} source="FRUITFLY_XR" workspace="scientist" fruitFlyQuestion={question} />);
  assert.ok(html.includes(question));
  assert.ok(html.indexOf("QUESTION ASKED") < html.indexOf("Session summary"));
  assert.ok(html.indexOf("WHAT THE EVIDENCE SHOWS") < html.indexOf("Session summary"));
  assert.match(html, /3,364 simulated spike events/);
});

test("FruitFly Scientist displays insufficient evidence for the original unsupported question", () => {
  const html = renderToStaticMarkup(<SourceAnalysisWorkspace {...props} source="FRUITFLY_XR" workspace="scientist" fruitFlyQuestion="Why did LC4 cause escape?" />);
  assert.match(html, /Why did LC4 cause escape/);
  assert.match(html, /The retained telemetry does not contain enough evidence to answer this question/);
  assert.match(html, /Evidence needed/);
});
