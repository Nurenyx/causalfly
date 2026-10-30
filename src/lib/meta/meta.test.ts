import assert from "node:assert/strict";
import { test } from "node:test";
import { demoExperimentSpec, runDemoExperiment } from "../experiment/demo";
import { syntheticDemoNetwork } from "../experiment/network";
import {
  LiveMetaClient, readLiveConfiguration,
  type MetaClient, type MetaEnvironment, type MetaRequest,
} from "./client";
import { designExperiment } from "./experiment-designer";
import { createCompactEvidence } from "./compact-evidence";
import { createEvidencePayload } from "./evidence";
import { FakeMetaClient } from "./fake-client";
import { formatMetaProviderError } from "./provider-errors";
import { eligiblePerturbationTargetIds, scientificAnalysisSchema } from "./schemas";
import { INTERPRETER_INSTRUCTIONS, interpretEvidence } from "./scientific-interpreter";
import { createMetaClient, runAiExperiment } from "./workflow";

const input = {
  researchQuestion: "Does silencing primary_a reduce output peak and delay threshold crossing?",
  networkDefinition: syntheticDemoNetwork,
};
const eligibleTargets = ["primary_a", "primary_b", "alternate_a", "alternate_b", "alternate_c"];
const config = {
  CAUSALFLY_META_ENABLED: "1", META_API_KEY: "test-placeholder-key",
  META_BASE_URL: "https://meta-test.invalid/v1",
  META_MODEL: "test-configured-model",
};
const request: MetaRequest = {
  task: "design", system: "Return JSON only.", inputJson: "{}", responseSchema: {},
};

function responseClient(response: unknown): MetaClient {
  return {
    mode: "FAKE META CLIENT",
    async complete() { return JSON.stringify(response); },
  };
}

function makeEvidence(spec = demoExperimentSpec) {
  return createEvidencePayload({ ...input, experimentSpec: spec });
}

test("valid model proposal is validated and converted to the existing ExperimentSpec", async () => {
  const { proposal, spec } = await designExperiment(responseClient({
    ...demoExperimentSpec,
    perturbation: { type: "SILENCE", targetNodeId: "primary_a" },
  }), input);
  assert.equal(proposal.perturbation.type, "SILENCE");
  assert.deepEqual(spec, demoExperimentSpec);
  assert.ok(Object.isFrozen(spec.perturbation));
});

test("a nonexistent node target is rejected before an experiment runs", async () => {
  await assert.rejects(designExperiment(responseClient({
    ...demoExperimentSpec, perturbation: { type: "silence", targetNodeId: "invented_neuron" },
  }), input), /targetNodeId/);
});

for (const targetNodeId of ["stimulus", "motor"]) {
  test(`${targetNodeId} is rejected as a Meta experiment target and at the evidence gate`, async () => {
    const spec = { ...demoExperimentSpec, perturbation: { type: "silence" as const, targetNodeId } };
    await assert.rejects(designExperiment(responseClient(spec), input), /targetNodeId/);
    assert.throws(() => makeEvidence(spec), /targetNodeId/);
  });
}

test("the eligibility helper and model validation accept only intermediate nodes", async () => {
  assert.deepEqual(eligiblePerturbationTargetIds(syntheticDemoNetwork), eligibleTargets);
  for (const targetNodeId of eligibleTargets) {
    const { spec } = await designExperiment(responseClient({
      ...demoExperimentSpec, perturbation: { type: "silence", targetNodeId },
    }), input);
    assert.equal(spec.perturbation.targetNodeId, targetNodeId);
  }
});

test("the designer receives the explicit eligible target list and matching schema", async () => {
  const fake = new FakeMetaClient();
  await designExperiment({
    mode: fake.mode,
    async complete(req) {
      const payload = JSON.parse(req.inputJson);
      assert.deepEqual(payload.eligiblePerturbationTargetIds, eligibleTargets);
      assert.deepEqual(payload.networkDefinition, syntheticDemoNetwork);
      const schema = JSON.parse(JSON.stringify(req.responseSchema));
      assert.deepEqual(schema.properties.perturbation.properties.targetNodeId.enum, eligibleTargets);
      return fake.complete(req);
    },
  }, input);
});

test("unsupported perturbations and multiple targets are rejected", async () => {
  for (const perturbation of [
    { type: "activate", targetNodeId: "primary_a" },
    { type: "silence", targetNodeId: ["primary_a", "primary_b"] },
    { type: "silence", targetNodeId: "primary_a", anotherTarget: "motor" },
  ]) {
    await assert.rejects(designExperiment(responseClient({ ...demoExperimentSpec, perturbation }), input));
  }
});

test("malformed, fenced, empty and non-object structured responses fail safely", async () => {
  for (const raw of ["", "{", "```json\n{}\n```", "null", "[]", '"text"', "{}"] ) {
    const client: MetaClient = { mode: "FAKE META CLIENT", async complete() { return raw; } };
    await assert.rejects(designExperiment(client, input));
  }
});

test("invalid experiment numbers are rejected without coercion", async () => {
  for (const override of [
    { stimulus: { amplitude: "1" } }, { stimulus: { amplitude: 1.1 } },
    { seed: 0.5 }, { seed: Number.MAX_SAFE_INTEGER + 1 },
    { maxSteps: -1 }, { maxSteps: 1001 }, { maxSteps: 2.5 },
    { outputThreshold: 0 }, { outputThreshold: 1.1 }, { hypothesis: " " },
  ]) {
    await assert.rejects(designExperiment(responseClient({ ...demoExperimentSpec, ...override }), input));
  }
});

test("model proposals cannot smuggle results, provenance or unknown fields", async () => {
  for (const extra of [{ TrialResult: { outputPeakActivity: 99 } }, { provenance: "fabricated" }]) {
    await assert.rejects(designExperiment(responseClient({ ...demoExperimentSpec, ...extra }), input));
  }
});

test("Meta is restricted to the unchanged synthetic fixture, including weights and provenance", async () => {
  let calls = 0;
  const client: MetaClient = {
    mode: "FAKE META CLIENT", async complete() { calls++; return "{}"; },
  };
  for (const override of [
    { id: "other-network" },
    { provenance: { kind: "biological", description: "unverified" } },
    { edges: syntheticDemoNetwork.edges.map((edge) => ({ ...edge, weight: 0.1 })) },
  ]) {
    await assert.rejects(designExperiment(client, {
      ...input, networkDefinition: { ...syntheticDemoNetwork, ...override },
    }), /only the unchanged synthetic/);
  }
  assert.equal(calls, 0);
});

test("empty research questions fail before a client request", async () => {
  let calls = 0;
  const client: MetaClient = { mode: "FAKE META CLIENT", async complete() { calls++; return "{}"; } };
  await assert.rejects(designExperiment(client, { ...input, researchQuestion: " " }));
  assert.equal(calls, 0);
});

test("the evidence gate supplies compact measured traces, deltas, accepted spec and provenance", async () => {
  const evidence = makeEvidence();
  const fake = new FakeMetaClient();
  let received: MetaRequest | undefined;
  await interpretEvidence({
    mode: "FAKE META CLIENT",
    async complete(req) { received = req; return fake.complete(req); },
  }, evidence);
  assert.equal(received?.task, "interpret");
  assert.deepEqual(JSON.parse(received!.inputJson), {
    ...createCompactEvidence(evidence), eligiblePerturbationTargetIds: eligibleTargets,
  });
  const schema = JSON.parse(JSON.stringify(received!.responseSchema));
  assert.deepEqual(
    schema.properties.nextExperiment.properties.proposedPerturbationTarget.enum,
    eligibleTargets,
  );
  assert.deepEqual(evidence.comparison, runDemoExperiment());
  assert.deepEqual(evidence.experimentSpec, demoExperimentSpec);
  assert.equal(evidence.provenance.source, "deterministic-engine");
  assert.deepEqual(evidence.provenance.control, evidence.comparison.control.provenance);
  assert.deepEqual(evidence.provenance.perturbed, evidence.comparison.perturbed.provenance);
  assert.deepEqual(evidence.provenance.comparison, evidence.comparison.provenance);
});

test("the integration cannot modify deterministic TrialResult values or provenance", async () => {
  const evidence = makeEvidence();
  const original = JSON.stringify(evidence);
  const fake = new FakeMetaClient();
  await interpretEvidence({
    mode: "FAKE META CLIENT",
    async complete(req) {
      assert.equal(Reflect.set(evidence.comparison.control, "outputPeakActivity", 99), false);
      assert.equal(Reflect.set(evidence.comparison.perturbed.activity[0].nodes, "motor", 99), false);
      assert.equal(Reflect.set(evidence.provenance.control.network.provenance, "kind", "biological"), false);
      assert.equal(Reflect.set(evidence.comparison.deltas, "outputPeakActivity", 99), false);
      const localCopy = JSON.parse(req.inputJson);
      localCopy.comparison.control.outputPeakActivity = 99;
      return fake.complete({ ...req, inputJson: JSON.stringify(localCopy) });
    },
  }, evidence);
  assert.equal(JSON.stringify(evidence), original);
  assert.deepEqual(evidence.comparison, runDemoExperiment());
});

test("arbitrary or deserialized evidence cannot bypass the engine evidence gate", async () => {
  const forged = structuredClone(makeEvidence());
  await assert.rejects(interpretEvidence(new FakeMetaClient(), forged), /immutable payload/);
});

test("structured ScientificAnalysis validates, permits false or null support, and is frozen", async () => {
  const analysis = await interpretEvidence(new FakeMetaClient(), makeEvidence());
  const schema = scientificAnalysisSchema(syntheticDemoNetwork);
  assert.deepEqual(schema.parse(analysis), analysis);
  assert.equal(analysis.supportsHypothesis, null);
  assert.equal(schema.parse({ ...analysis, supportsHypothesis: false }).supportsHypothesis, false);
  assert.equal(schema.parse({ ...analysis, supportsHypothesis: true }).supportsHypothesis, true);
  assert.ok(Object.isFrozen(analysis.observations));
  assert.ok(Object.isFrozen(analysis.nextExperiment));
});

test("next-experiment targets reject input, output and unknown nodes and accept intermediate nodes", async () => {
  const evidence = makeEvidence();
  const analysis = await interpretEvidence(new FakeMetaClient(), evidence);
  for (const proposedPerturbationTarget of ["stimulus", "motor", "missing"]) {
    await assert.rejects(interpretEvidence(responseClient({
      ...analysis, nextExperiment: { ...analysis.nextExperiment, proposedPerturbationTarget },
    }), evidence), /proposedPerturbationTarget/);
  }
  for (const proposedPerturbationTarget of eligibleTargets) {
    const accepted = await interpretEvidence(responseClient({
      ...analysis, nextExperiment: { ...analysis.nextExperiment, proposedPerturbationTarget },
    }), evidence);
    assert.equal(accepted.nextExperiment.proposedPerturbationTarget, proposedPerturbationTarget);
  }
});

test("malformed analysis, invented next targets, and injected measurement fields are rejected", async () => {
  const evidence = makeEvidence();
  const analysis = await interpretEvidence(new FakeMetaClient(), evidence);
  for (const invalid of [
    {}, { ...analysis, observations: "invented" }, { ...analysis, limitations: [] },
    { ...analysis, supportsHypothesis: "true" },
    { ...analysis, nextExperiment: { ...analysis.nextExperiment, proposedPerturbationTarget: "missing" } },
    { ...analysis, nextExperiment: { ...analysis.nextExperiment, perturbationType: "activate" } },
    { ...analysis, comparison: { control: { outputPeakActivity: 99 } } },
  ]) {
    await assert.rejects(interpretEvidence(responseClient(invalid), evidence));
  }
  assert.deepEqual(evidence.comparison, runDemoExperiment());
});

test("the interpreter system instructions explicitly protect the scientific boundary", () => {
  for (const phrase of [
    "TrialResult / ExperimentComparison", "Never invent numeric measurements",
    "Separate measured observations", "Drosophila", "limitations", "fail to support",
    "one existing node targeted by silence", "Do not modify measured results",
  ]) assert.ok(INTERPRETER_INSTRUCTIONS.includes(phrase), phrase);
});

test("fake client runs deterministically without credentials or any network access", async (t) => {
  let networkCalls = 0;
  t.mock.method(globalThis, "fetch", async () => { networkCalls++; throw new Error("Network prohibited"); });
  const first = await runAiExperiment(createMetaClient("auto", {}), input);
  const second = await runAiExperiment(createMetaClient("fake", {}), input);
  assert.deepEqual(first, second);
  assert.equal(first.mode, "FAKE META CLIENT");
  assert.match(first.analysis.interpretation, /Offline template/);
  assert.deepEqual(first.evidence.comparison, runDemoExperiment());
  assert.equal(networkCalls, 0);
});

test("fake client recommends an eligible internal target different from the current intervention", async () => {
  const fake = new FakeMetaClient();
  const { spec } = await designExperiment(fake, input);
  assert.ok(eligibleTargets.includes(spec.perturbation.targetNodeId));
  for (const targetNodeId of eligibleTargets) {
    const evidence = makeEvidence({
      ...demoExperimentSpec, perturbation: { type: "silence", targetNodeId },
    });
    const analysis = await interpretEvidence(fake, evidence);
    const nextTarget = analysis.nextExperiment.proposedPerturbationTarget;
    assert.ok(nextTarget && eligibleTargets.includes(nextTarget));
    assert.notEqual(nextTarget, targetNodeId);
  }
});

test("fake observations use supplied evidence instead of hard-coded demo measurements", async () => {
  const evidence = makeEvidence({ ...demoExperimentSpec, stimulus: { amplitude: 0.2 } });
  const analysis = await interpretEvidence(new FakeMetaClient(), evidence);
  assert.match(analysis.observations[0], /Control output peak: 0.2; perturbed output peak: 0.1/);
  assert.match(analysis.observations[1], /not reached/);
  assert.match(analysis.observations[2], /not comparable/);
});

test("live configuration lists every missing variable before making any request", () => {
  for (let mask = 0; mask < 7; mask++) {
    const keys = ["META_API_KEY", "META_BASE_URL", "META_MODEL"] as const;
    const env: Record<string, string> = {};
    keys.forEach((key, i) => { if (mask & (1 << i)) env[key] = config[key]; });
    assert.throws(() => createMetaClient("live", env), (error: unknown) => {
      assert.ok(error instanceof Error);
      keys.filter((key) => !env[key]).forEach((key) => assert.ok(error.message.includes(key)));
      assert.ok(!error.message.includes(config.META_API_KEY));
      return true;
    });
  }
  assert.throws(() => readLiveConfiguration({ ...config, META_MODEL: " " }), /META_MODEL/);
});

test("auto mode does not hide partial live configuration behind fake output", () => {
  assert.throws(() => createMetaClient("auto", { CAUSALFLY_META_ENABLED: "1", META_API_KEY: "placeholder" }), /META_BASE_URL, META_MODEL/);
  assert.equal(createMetaClient("fake", { CAUSALFLY_META_ENABLED: "1", META_API_KEY: "placeholder" }).mode, "FAKE META CLIENT");
  assert.equal(createMetaClient("auto", config).mode, "META LIVE");
});

test("invalid live base URLs fail without exposing credentials", () => {
  for (const META_BASE_URL of ["invalid", "http://meta-test.invalid", "https://user:secret@meta-test.invalid", "https://meta-test.invalid?key=secret"]) {
    assert.throws(() => readLiveConfiguration({ ...config, META_BASE_URL }), /must be an HTTPS API base URL/);
  }
});

function sdkResponse(content: string | null, finishReason = "stop", refusal: string | null = null) {
  return new Response(JSON.stringify({
    id: "test-response", object: "chat.completion", created: 0, model: config.META_MODEL,
    choices: [{ index: 0, finish_reason: finishReason, message: { role: "assistant", content, refusal } }],
  }), { status: 200, headers: { "content-type": "application/json" } });
}

test("official SDK uses only configured URL, model and server-side credentials with mocked transport", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), `${config.META_BASE_URL}/chat/completions`);
    assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${config.META_API_KEY}`);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, config.META_MODEL);
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.match(body.messages[0].content, /JSON/);
    return sdkResponse(JSON.stringify(demoExperimentSpec));
  };
  const { spec } = await designExperiment(new LiveMetaClient(config, transport), input);
  assert.deepEqual(spec, demoExperimentSpec);
  assert.equal(calls, 1);
});

test("live SDK rejects empty, truncated and refused responses", async () => {
  for (const [content, finish, refusal] of [
    [null, "stop", null], ["{}", "length", null], ["{}", "stop", "refused"],
  ]) {
    const client = new LiveMetaClient(config, async () => sdkResponse(content, finish!, refusal));
    await assert.rejects(client.complete(request), /incomplete, refused, or empty/);
  }
});

test("API failures are surfaced safely without leaking provider error bodies or secrets", async () => {
  const client = new LiveMetaClient(config, async () => {
    throw new Error(`provider echoed ${config.META_API_KEY}`);
  }, { retry: false });
  await assert.rejects(client.complete(request), (error: unknown) => {
    assert.ok(error instanceof Error);
    const diagnostic = formatMetaProviderError(error)!;
    assert.match(diagnostic, /Meta API request failed/);
    assert.ok(!diagnostic.includes(config.META_API_KEY));
    return true;
  });
});

test("caller mutations during model calls cannot change accepted network or original question", async () => {
  const mutableInput = {
    ...input,
    networkDefinition: {
      ...syntheticDemoNetwork,
      edges: syntheticDemoNetwork.edges.map((edge) => ({ ...edge })),
    },
  };
  const originalQuestion = mutableInput.researchQuestion;
  const fake = new FakeMetaClient();
  const result = await runAiExperiment({
    mode: "FAKE META CLIENT",
    async complete(req) {
      mutableInput.networkDefinition.edges[0] = { from: "stimulus", to: "motor", weight: 0 };
      mutableInput.researchQuestion = "changed mid-flight";
      return fake.complete(req);
    },
  }, mutableInput);
  assert.equal(result.evidence.researchQuestion, originalQuestion);
  assert.deepEqual(result.evidence.comparison, runDemoExperiment());
});

test("the evidence gate revalidates specs instead of trusting TypeScript assertions", () => {
  assert.throws(() => createEvidencePayload({
    ...input,
    experimentSpec: { ...demoExperimentSpec, maxSteps: "6" } as unknown as typeof demoExperimentSpec,
  }));
});

test("live environment parsing returns only requested configuration", () => {
  const parsed = readLiveConfiguration(config as MetaEnvironment);
  assert.deepEqual(parsed, {
    apiKey: config.META_API_KEY, baseURL: config.META_BASE_URL, model: config.META_MODEL, timeoutMs: 120_000,
  });
});
