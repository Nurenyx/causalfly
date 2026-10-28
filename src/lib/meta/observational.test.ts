import assert from "node:assert/strict";
import test from "node:test";
import { FruitFlyNormalizer, connectomeHash } from "../sources/fruitfly-protocol";
import { openRetention, retainSnapshot, readRetainedWindow } from "../sources/retained-evidence";
import { createObservationalEvidence } from "./observational-evidence";
import { interpretObservationalEvidence } from "./observational-interpreter";
import { observationalResponseSchema } from "./observational-schema";
import { FakeMetaClient } from "./fake-client";
import { LiveMetaClient, type MetaRequest } from "./client";
import { runWebObservation } from "../web/observational-workflow";
import { POST } from "../../app/api/sources/fruitfly/analyze/route";

const question = "  Which received frame showed the largest spike-event count?\n  ";
function fixture() {
  const now = Date.now();
  const retentionId = openRetention(now);
  const sessionId = "8c66e194-3693-4ae5-942a-886d819b08bc";
  const normalizer = new FruitFlyNormalizer();
  normalizer.accept({ version: 1, type: "observatoryHello", dataset: "male-cns:v1.0", connectomeSha256: connectomeHash, neurons: 176422, edges: 6287749, neuronIds: true, spikeEventsAvailable: true, synapticTransmissionEvents: false, edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL", maxDisplaySpikes: 512, maxDisplayEdges: 256 }, new Date(now).toISOString());
  for (const sequence of [1, 3]) {
    const evidence = normalizer.accept({ version: 1, type: "observatoryFrame", sessionId, sequence, neuralTick: sequence, simulationMs: sequence * 50, totalSpikeEvents: sequence * 10, activeNeuronCount: 40, displaySpikeEvents: 1, displayTruncated: true, droppedDisplayFrames: 2, droppedSubscriberMessages: 1, spikeDisplaySemantics: "EXACT_SPIKES_FIRST_N_FILTERED", edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL", spikeEvents: [{ neuronId: 10000000001, spikeTimeMs: sequence * 50 }], decodedMotor: [{ name: "jump", value: .25 }], inputSequence: sequence, inputFresh: false, motorMode: sequence === 1 ? "IDLE" : "ESCAPE", secret: "never-retained" }, new Date(now).toISOString());
    retainSnapshot(retentionId, { source: "FRUITFLY_XR", state: "DATA RECEIVED", message: "test", evidence }, now);
  }
  return { retentionId, sessionId, sequences: [1, 3] };
}

test("compaction contains exact supplied counts, transitions, provenance and diagnostics without raw spikes/coordinates", () => {
  const evidence = createObservationalEvidence(question, fixture());
  assert.equal(evidence.exactQuestion, question);
  assert.equal(evidence.retainedFrameCount, 2);
  assert.deepEqual(evidence.frames.map(f => f.sequence), [1, 3]);
  assert.equal(evidence.frames[1].simulatedSpikeEventCount, 30);
  assert.equal(evidence.frames[1].droppedSubscriberMessages, 1);
  assert.equal(evidence.decoderAndReferenceTransitions.length, 2);
  assert.equal(evidence.provenance.experimentalRecording, false);
  assert.doesNotMatch(JSON.stringify(evidence), /soma|spikeEvents|neuronId|never-retained|authorization/i);
  assert.ok(Object.isFrozen(evidence.frames[0].decoderChannels[0]));
  assert.ok(Object.isFrozen(evidence.localAnswer.facts));
});

test("one observational request preserves the exact question and freezes the separate analysis", async () => {
  const evidence = createObservationalEvidence(question, fixture());
  const requests: MetaRequest[] = [];
  const fake = new FakeMetaClient();
  const result = await interpretObservationalEvidence({ mode: "FAKE META CLIENT", complete: async r => { requests.push(r); return fake.complete(r); } }, evidence);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].task, "observe");
  assert.equal(JSON.parse(requests[0].inputJson).exactQuestion, question);
  assert.equal(result.exactQuestion, question);
  assert.ok(Object.isFrozen(result.nextExperiment.requiredEvidence));
});

for (const [name, change] of Object.entries({
  "malformed JSON": () => "{",
  "empty response": () => "",
  "missing field": (a: Record<string, unknown>) => { delete a.interpretation; return JSON.stringify(a); },
  "extra field": (a: Record<string, unknown>) => JSON.stringify({ ...a, measuredCount: 999 }),
  "causal claim": (a: Record<string, unknown>) => JSON.stringify({ ...a, causalClaimAllowed: true }),
  "empty interpretation": (a: Record<string, unknown>) => JSON.stringify({ ...a, interpretation: "  " }),
  "changed question": (a: Record<string, unknown>) => JSON.stringify({ ...a, exactQuestion: question.trim() }),
  "nested extra field": (a: Record<string, unknown>) => JSON.stringify({ ...a, nextExperiment: { ...(a.nextExperiment as object), runNow: true } }),
})) test(`strict observational response rejects ${name}`, async () => {
  const evidence = createObservationalEvidence(question, fixture());
  const fake = new FakeMetaClient();
  await assert.rejects(interpretObservationalEvidence({ mode: fake.mode, complete: async r => change(JSON.parse(await fake.complete(r))) }, evidence));
});

test("unsupported question remains insufficient and cannot be upgraded by Meta", async () => {
  const evidence = createObservationalEvidence("Why did LC4 cause escape?", fixture());
  assert.equal(evidence.localAnswer.sufficient, false);
  const fake = new FakeMetaClient();
  const result = await interpretObservationalEvidence(fake, evidence);
  assert.equal(result.evidenceSufficiency, "INSUFFICIENT");
  assert.match(result.interpretation, /does not contain enough evidence/);
  await assert.rejects(interpretObservationalEvidence({ mode: fake.mode, complete: async r => JSON.stringify({ ...JSON.parse(await fake.complete(r)), evidenceSufficiency: "SUFFICIENT" }) }, evidence));
});

test("provider failure leaves retained evidence intact, returns a sanitized error and never falls back", async () => {
  const ref = fixture();
  const before = JSON.stringify(readRetainedWindow(ref.retentionId, ref.sessionId, ref.sequences));
  let calls = 0;
  const result = await runWebObservation({ ...ref, researchQuestion: question }, { createClient: () => ({ mode: "META LIVE", complete: async () => { calls++; throw new Error("secret body Authorization prompt"); } }) });
  assert.equal(calls, 1);
  assert.equal(result.ok, false);
  assert.doesNotMatch(JSON.stringify(result), /secret|Authorization|prompt/);
  assert.equal(JSON.stringify(readRetainedWindow(ref.retentionId, ref.sessionId, ref.sequences)), before);
});

test("browser output from injected live transport contains no credentials, requests or prompts", async () => {
  const fake = new FakeMetaClient();
  const transport: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    return Response.json({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: await fake.complete({ task: "observe", system: "", inputJson: body.messages[1].content, responseSchema: {} }) } }] });
  };
  const result = await runWebObservation({ ...fixture(), researchQuestion: question }, { createClient: () => new LiveMetaClient({ META_API_KEY: "secret-sentinel", META_BASE_URL: "https://private-test.invalid/v1", META_MODEL: "private-test-model" }, transport) });
  assert.ok(result.ok);
  assert.equal(result.result.mode, "META LIVE");
  assert.doesNotMatch(JSON.stringify(result), /secret-sentinel|private-test|Authorization|responseSchema|OBSERVATIONAL_INSTRUCTIONS/);
});

test("fabricated, expired and missing retained references fail before client construction", async () => {
  const ref = fixture();
  for (const input of [{ ...ref, sequences: [2] }, { ...ref, sequences: [1, 1] }, { ...ref, sessionId: "invented" }, { ...ref, frames: [] }]) {
    const result = await runWebObservation({ ...input, researchQuestion: question }, { createClient: () => { assert.fail("No client allowed"); } });
    assert.equal(result.ok, false);
  }
  assert.throws(() => readRetainedWindow(ref.retentionId, ref.sessionId, ref.sequences, Date.now() + 3_600_001));
});

test("deserialized evidence cannot bypass the in-process provenance gate", async () => {
  const evidence = createObservationalEvidence(question, fixture());
  await assert.rejects(interpretObservationalEvidence(new FakeMetaClient(), structuredClone(evidence)));
  assert.equal(observationalResponseSchema.safeParse({ causalClaimAllowed: false }).success, false);
});

test("observational route rejects oversized or malformed input without network", async t => {
  t.mock.method(globalThis, "fetch", async () => assert.fail("Network prohibited"));
  for (const body of ["{", "x".repeat(64_001), JSON.stringify({ researchQuestion: question })]) {
    const response = await POST(new Request("http://localhost/api/sources/fruitfly/analyze", { method: "POST", body }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});
