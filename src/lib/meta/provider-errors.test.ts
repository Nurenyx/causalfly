import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";
import { LiveMetaClient, type MetaRequest } from "./client";
import { addMetaProviderErrorContext, formatMetaProviderError } from "./provider-errors";

const config = {
  CAUSALFLY_META_ENABLED: "1", META_API_KEY: "test-secret-key/with+characters",
  META_BASE_URL: "https://meta-test.invalid/v1",
  META_MODEL: "test-configured-model",
};
const request: MetaRequest = {
  task: "interpret",
  system: "Private prompt text\nReturn structured output only.",
  inputJson: '{"privateEvidence":"private-evidence-marker"}',
  responseSchema: { type: "object" },
};

function diagnosticFields(error: unknown) {
  const diagnostic = formatMetaProviderError(error);
  assert.ok(diagnostic);
  return JSON.parse(diagnostic.slice(diagnostic.indexOf("\n") + 1));
}

test("provider diagnostics expose only allowlisted SDK fields, including request ID", async () => {
  let calls = 0;
  const client = new LiveMetaClient(config, async () => {
    calls++;
    return new Response(JSON.stringify({
      error: {
        message: "The selected model is unavailable.",
        type: "invalid_request_error", param: "model", code: "model_not_found",
        request: request.inputJson,
        prompt: request.system,
        authorization: `Bearer ${config.META_API_KEY}`,
      },
    }), {
      status: 404,
      headers: {
        "content-type": "application/json", "x-request-id": "request-test-123",
        authorization: `Bearer ${config.META_API_KEY}`, "x-private-header": "private-header-marker",
      },
    });
  });
  await assert.rejects(client.complete(request), (error: unknown) => {
    assert.ok(error instanceof OpenAI.NotFoundError);
    assert.deepEqual(diagnosticFields(error), {
      name: "NotFoundError", status: 404,
      type: "invalid_request_error", param: "model", code: "model_not_found",
      message: "The selected model is unavailable.", requestID: "request-test-123",
    });
    const diagnostic = formatMetaProviderError(error)!;
    for (const forbidden of [
      config.META_API_KEY, "authorization", "Bearer", request.system, request.inputJson,
      "private-evidence-marker", "private-header-marker", "headers", "stack", "cause",
    ]) assert.ok(!diagnostic.includes(forbidden), forbidden);
    return true;
  });
  assert.equal(calls, 1, "provider failures must not be retried");
});

test("safe context preserves the exact original exception and its original fields", async () => {
  const original = new OpenAI.BadRequestError(400, {
    message: "Invalid model parameter.", type: "invalid_request_error", param: "model", code: "invalid_model",
  }, undefined, new Headers({ "x-request-id": "request-original" }));
  const keysBefore = Reflect.ownKeys(original);
  const messageBefore = original.message;
  const cause = new Error("private-cause-marker");
  Object.defineProperty(original, "cause", { value: cause });
  const client = new LiveMetaClient(config);
  // Throw directly from the SDK boundary to verify rethrow identity, not a wrapper/cause copy.
  client["sdk"].chat.completions.create = () => { throw original; };
  await assert.rejects(client.complete(request), (error: unknown) => {
    assert.equal(error, original);
    assert.equal(original.message, messageBefore);
    assert.equal(original.cause, cause);
    assert.deepEqual(Reflect.ownKeys(original), [...keysBefore, "cause"]);
    assert.equal(diagnosticFields(error).message, "Invalid model parameter.");
    assert.ok(!formatMetaProviderError(error)!.includes("private-cause-marker"));
    return true;
  });
});

test("credentials are redacted in every allowlisted text field, including encoded values", () => {
  const secret = config.META_API_KEY;
  const error = new OpenAI.APIError(400, {
    message: `Incorrect API key: ${secret}; encoded: ${encodeURIComponent(secret)}`,
    type: secret, param: secret, code: secret,
  }, undefined, new Headers({ "x-request-id": secret }));
  error.name = secret;
  addMetaProviderErrorContext(error, { apiKey: secret, request });
  const diagnostic = formatMetaProviderError(error)!;
  assert.ok(!diagnostic.includes(secret));
  assert.ok(!diagnostic.includes(encodeURIComponent(secret)));
  assert.equal(diagnosticFields(error).name, "[redacted]");
  assert.equal(diagnosticFields(error).type, "[redacted]");
  assert.equal(diagnosticFields(error).param, "[redacted]");
  assert.equal(diagnosticFields(error).code, "[redacted]");
  assert.equal(diagnosticFields(error).requestID, "[redacted]");
  assert.match(diagnosticFields(error).message, /Incorrect API key: \[redacted\]/);
});

test("diagnostics suppress echoed request bodies, authorization headers, prompts, and evidence", () => {
  const body = JSON.stringify({
    messages: [{ role: "system", content: request.system }, { role: "user", content: request.inputJson }],
  });
  for (const message of [
    `Request rejected: ${body}`, `Authorization: Bearer ${config.META_API_KEY}`,
    `Rejected prompt: ${request.system}`, `Rejected evidence: ${request.inputJson}`,
    `Escaped prompt: ${JSON.stringify(request.system).slice(1, -1)}`,
  ]) {
    const error = new OpenAI.BadRequestError(400, { message }, undefined, new Headers());
    addMetaProviderErrorContext(error, { apiKey: config.META_API_KEY, request });
    const diagnostic = formatMetaProviderError(error)!;
    for (const forbidden of [
      config.META_API_KEY, "Authorization", "Bearer", "Private prompt text", "private-evidence-marker", body,
    ]) assert.ok(!diagnostic.includes(forbidden), forbidden);
  }
});

test("missing or non-string provider messages never fall back to a serialized error body", () => {
  for (const message of [undefined, { requestBody: request.inputJson }]) {
    const error = new OpenAI.BadRequestError(400, {
      message, privateBody: "private-body-marker", prompt: request.system,
    }, undefined, new Headers());
    addMetaProviderErrorContext(error, { apiKey: config.META_API_KEY, request });
    assert.equal(diagnosticFields(error).message, "Provider returned no human-readable error message.");
    assert.ok(!formatMetaProviderError(error)!.includes("private-body-marker"));
  }
});

test("connection failures include their SDK class/message without exposing nested causes", () => {
  const error = new OpenAI.APIConnectionError({
    cause: new Error(`Authorization: Bearer ${config.META_API_KEY}; ${request.inputJson}`),
  });
  addMetaProviderErrorContext(error, { apiKey: config.META_API_KEY, request });
  assert.deepEqual(diagnosticFields(error), {
    name: "APIConnectionError", status: null, type: null, param: null, code: null,
    message: "Connection error.", requestID: null,
  });
  assert.equal(formatMetaProviderError(new Error("unrelated")), undefined);
});

test("non-scalar provider metadata is omitted without serializing objects or their contents", () => {
  const error = new OpenAI.APIError(400, {
    message: "Bad parameter.", type: { secret: config.META_API_KEY },
    param: { body: request.inputJson }, code: [request.system],
  }, undefined, new Headers());
  addMetaProviderErrorContext(error, { apiKey: config.META_API_KEY, request });
  const fields = diagnosticFields(error);
  assert.equal(fields.type, null);
  assert.equal(fields.param, null);
  assert.equal(fields.code, null);
  assert.ok(!formatMetaProviderError(error)!.includes(config.META_API_KEY));
});
