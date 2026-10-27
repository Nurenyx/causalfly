import assert from "node:assert/strict";
import { test } from "node:test";
import { readLiveConfiguration } from "./client";
import { validateSmokeResponse } from "./smoke";

const config = {
  META_API_KEY: "test-placeholder-key",
  META_BASE_URL: "https://meta-test.invalid/v1",
  META_MODEL: "test-configured-model",
};

test("smoke configuration rejects missing and blank required variables", () => {
  assert.throws(() => readLiveConfiguration({}), /META_API_KEY, META_BASE_URL, META_MODEL/);
  for (const key of ["META_API_KEY", "META_BASE_URL", "META_MODEL"] as const) {
    for (const value of [undefined, "", " \t\n"]) {
      assert.throws(() => readLiveConfiguration({ ...config, [key]: value }), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes(key));
        assert.ok(!error.message.includes(config.META_API_KEY));
        return true;
      });
    }
  }
});

test("smoke configuration trims values and preserves the selected endpoint and model", () => {
  const parsed = readLiveConfiguration({
    META_API_KEY: ` ${config.META_API_KEY}\n`,
    META_BASE_URL: ` ${config.META_BASE_URL} `,
    META_MODEL: `\t${config.META_MODEL} `,
  });
  assert.equal(parsed.apiKey, config.META_API_KEY);
  assert.equal(parsed.baseURL, config.META_BASE_URL);
  assert.equal(parsed.model, config.META_MODEL);
});

test("smoke configuration rejects unsafe or malformed endpoints", () => {
  for (const META_BASE_URL of [
    "invalid", "http://meta-test.invalid/v1", "https://user:password@meta-test.invalid/v1",
    "https://meta-test.invalid/v1?key=secret", "https://meta-test.invalid/v1#fragment",
  ]) {
    assert.throws(() => readLiveConfiguration({ ...config, META_BASE_URL }), /META_BASE_URL must be an HTTPS API base URL/);
  }
});

test("smoke response accepts only the expected object, allowing JSON whitespace", () => {
  for (const raw of ['{"status":"ok"}', ' \n { "status": "ok" }\t']) {
    assert.deepEqual(validateSmokeResponse(raw), { status: "ok" });
  }
});

test("smoke response rejects malformed JSON, wrong values, and additional fields safely", () => {
  for (const raw of [
    "", "{", "null", "[]", '"ok"', "true", "1", "{}",
    '{"status":"OK"}', '{"status":true}', '{"status":null}',
    '{"status":["ok"]}', '{"status":"ok","extra":"sensitive-model-output"}',
    '```json\n{"status":"ok"}\n```', '{"status":"ok"} trailing text',
  ]) {
    assert.throws(() => validateSmokeResponse(raw), {
      message: 'Meta smoke response must be exactly {"status":"ok"}.',
    });
  }
});
