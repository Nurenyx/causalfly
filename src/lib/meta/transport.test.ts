import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";
import { demoExperimentSpec } from "../experiment/demo";
import { syntheticDemoNetwork } from "../experiment/network";
import { LiveMetaClient, readLiveConfiguration, type MetaRequest } from "./client";
import { designExperiment } from "./experiment-designer";
import { FakeMetaClient } from "./fake-client";
import { formatMetaProviderError } from "./provider-errors";
import { runAiExperiment, type AiExperimentStage } from "./workflow";

const config = {
  META_API_KEY: "test-transport-secret-key",
  META_BASE_URL: "https://meta-test.invalid/v1",
  META_MODEL: "test-configured-model",
};
const request: MetaRequest = {
  task: "design", system: "Private prompt marker.",
  inputJson: '{"privateEvidence":"evidence-marker"}', responseSchema: {},
};
const input = { researchQuestion: "Does silencing primary_a change synthetic output?", networkDefinition: syntheticDemoNetwork };

function success(content = '{"status":"ok"}', finishReason = "stop") {
  return new Response(JSON.stringify({
    id: "transport-test", object: "chat.completion", created: 0, model: config.META_MODEL,
    choices: [{ index: 0, finish_reason: finishReason, message: { role: "assistant", content } }],
  }), { headers: { "content-type": "application/json" } });
}

function failure(status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: {
    message: "Request unavailable.", type: "provider_error", code: "test_error", param: null,
  } }), { status, headers: { "content-type": "application/json", "x-request-id": `request-${status}`, ...extraHeaders } });
}

function transportClient(fetchImplementation?: typeof fetch) {
  const waits: number[] = [];
  const logs: string[] = [];
  const client = new LiveMetaClient(config, fetchImplementation, {
    sleep: async (ms) => { waits.push(ms); },
    random: () => 0.25,
    onRetry: (message) => logs.push(message),
  });
  return { client, waits, logs };
}

test("Meta timeout defaults to 120000 ms and SDK retries stay disabled", () => {
  assert.equal(readLiveConfiguration(config).timeoutMs, 120_000);
  const client = new LiveMetaClient(config);
  assert.equal(client["sdk"].timeout, 120_000);
  assert.equal(client["sdk"].maxRetries, 0);
});

test("configured META_TIMEOUT_MS is parsed and applied to the SDK", () => {
  const env = { ...config, META_TIMEOUT_MS: " 45000 " };
  assert.equal(readLiveConfiguration(env).timeoutMs, 45_000);
  assert.equal(new LiveMetaClient(env)["sdk"].timeout, 45_000);
});

test("invalid timeout values fail clearly without echoing configuration values", () => {
  for (const META_TIMEOUT_MS of ["", " ", "0", "-1", "1.5", "1e3", "Infinity", "NaN", "2147483648", config.META_API_KEY]) {
    assert.throws(() => readLiveConfiguration({ ...config, META_TIMEOUT_MS }), {
      message: "META_TIMEOUT_MS must be a positive integer between 1 and 2147483647 milliseconds.",
    });
  }
});

test("transient timeouts retry with bounded exponential backoff and small jitter", async () => {
  let calls = 0;
  const bodies: string[] = [];
  const { client, waits, logs } = transportClient(async (_url, init) => {
    calls++;
    bodies.push(String(init?.body));
    if (calls < 3) throw new Error("Connection timed out");
    return success();
  });
  assert.equal(await client.complete(request), '{"status":"ok"}');
  assert.equal(calls, 3);
  assert.deepEqual(waits, [525, 1025]);
  assert.deepEqual(logs, ["transient Meta timeout; retry 1/2", "transient Meta timeout; retry 2/2"]);
  assert.ok(bodies.every((body) => body === bodies[0]), "retries preserve the model request unchanged");
});

test("connection errors retry without printing their nested transport cause", async () => {
  let calls = 0;
  const { client, waits, logs } = transportClient(async () => {
    if (++calls === 1) throw new Error(`private transport cause ${config.META_API_KEY}; ${request.inputJson}`);
    return success();
  });
  await client.complete(request);
  assert.equal(calls, 2);
  assert.deepEqual(waits, [525]);
  assert.deepEqual(logs, ["transient Meta connection error; retry 1/2"]);
});

for (const status of [429, 500, 503, 599]) {
  test(`HTTP ${status} retries once before a successful response`, async () => {
    let calls = 0;
    const { client, waits, logs } = transportClient(async () => ++calls === 1 ? failure(status) : success());
    await client.complete(request);
    assert.equal(calls, 2);
    assert.deepEqual(waits, [525]);
    assert.deepEqual(logs, [`transient Meta HTTP ${status}; retry 1/2`]);
  });
}

for (const status of [400, 401, 403, 404, 408, 409, 422]) {
  test(`HTTP ${status} is never retried, even with an SDK retry hint`, async () => {
    let calls = 0;
    const { client, waits, logs } = transportClient(async () => {
      calls++;
      return failure(status, { "x-should-retry": "true" });
    });
    await assert.rejects(client.complete(request), (error: unknown) => {
      assert.ok(error instanceof OpenAI.APIError);
      assert.equal(error.status, status);
      assert.ok(formatMetaProviderError(error));
      return true;
    });
    assert.equal(calls, 1);
    assert.deepEqual(waits, []);
    assert.deepEqual(logs, []);
  });
}

test("retry exhaustion rethrows the final original SDK error with safe diagnostics", async () => {
  const errors = [0, 1, 2].map(() => new OpenAI.APIConnectionTimeoutError({
    message: `Request timed out; ${config.META_API_KEY}; ${request.system}; ${request.inputJson}`,
  }));
  let calls = 0;
  const { client, waits, logs } = transportClient();
  client["sdk"].chat.completions.create = () => { throw errors[calls++]; };
  await assert.rejects(client.complete(request), (error: unknown) => {
    assert.equal(error, errors[2]);
    const diagnostic = formatMetaProviderError(error)!;
    assert.match(diagnostic, /APIConnectionTimeoutError/);
    assert.match(diagnostic, /"status": null/);
    for (const secret of [config.META_API_KEY, request.system, request.inputJson, "evidence-marker"]) {
      assert.ok(!diagnostic.includes(secret));
      assert.ok(!logs.join("\n").includes(secret));
    }
    return true;
  });
  assert.equal(calls, 3);
  assert.deepEqual(waits, [525, 1025]);
  assert.equal(logs.length, 2);
});

test("HTTP retry exhaustion stops after three total attempts and preserves safe status/request ID", async () => {
  let calls = 0;
  const { client, waits, logs } = transportClient(async () => { calls++; return failure(503); });
  await assert.rejects(client.complete(request), (error: unknown) => {
    assert.ok(error instanceof OpenAI.InternalServerError);
    assert.equal(error.status, 503);
    assert.match(formatMetaProviderError(error)!, /request-503/);
    return true;
  });
  assert.equal(calls, 3);
  assert.equal(waits.length, 2);
  assert.equal(logs.length, 2);
});

test("single-attempt smoke transport does not retry transient failures", async () => {
  let calls = 0;
  const client = new LiveMetaClient(config, async () => { calls++; return failure(503); }, { retry: false });
  await assert.rejects(client.complete(request), OpenAI.InternalServerError);
  assert.equal(calls, 1);
});

test("malformed JSON and experiment schema validation failures are never retried", async () => {
  for (const content of ["{", "{}", JSON.stringify({ ...demoExperimentSpec, maxSteps: "invalid" })]) {
    let calls = 0;
    const { client, waits, logs } = transportClient(async () => { calls++; return success(content); });
    await assert.rejects(designExperiment(client, input));
    assert.equal(calls, 1);
    assert.deepEqual(waits, []);
    assert.deepEqual(logs, []);
  }
});

test("incomplete model output and user-aborted requests are never retried", async () => {
  let calls = 0;
  const { client, waits, logs } = transportClient(async () => { calls++; return success("{}", "length"); });
  await assert.rejects(client.complete(request), /incomplete/);
  const abort = new OpenAI.APIUserAbortError();
  client["sdk"].chat.completions.create = () => { calls++; throw abort; };
  await assert.rejects(client.complete(request), (error: unknown) => error === abort);
  assert.equal(calls, 2);
  assert.deepEqual(waits, []);
  assert.deepEqual(logs, []);
});

test("stage diagnostics identify design, deterministic execution, and interpretation without altering results", async () => {
  const stages: AiExperimentStage[] = [];
  const fake = new FakeMetaClient();
  const result = await runAiExperiment(fake, input, (stage) => stages.push(stage));
  assert.deepEqual(stages, ["META DESIGN REQUEST", "DETERMINISTIC EXPERIMENT", "META INTERPRETATION REQUEST"]);
  assert.deepEqual(result, await runAiExperiment(fake, input));
});

for (const failedTask of ["design", "interpret"] as const) {
  test(`stage diagnostics identify ${failedTask} failures and preserve the original error`, async () => {
    const stages: AiExperimentStage[] = [];
    const original = new Error("test-stage-error");
    const fake = new FakeMetaClient();
    await assert.rejects(runAiExperiment({
      mode: fake.mode,
      async complete(req) {
        if (req.task === failedTask) throw original;
        return fake.complete(req);
      },
    }, input, (stage) => stages.push(stage)), (error: unknown) => error === original);
    assert.equal(stages.at(-1), failedTask === "design" ? "META DESIGN REQUEST" : "META INTERPRETATION REQUEST");
  });
}
