import test from "node:test";
import assert from "node:assert/strict";
import { healthStatus } from "./health";
import { configuredEndpoint } from "../sources/fruitfly-bridge";

test("health fails closed and exposes only configuration flags", () => {
  const empty = healthStatus({}, "production", false);
  assert.equal(empty.metaMode, "disabled");
  assert.equal(empty.metaEnabled, false);
  assert.equal(healthStatus({ CAUSALFLY_META_ENABLED: "1" }, "production", false).metaEnabled, true);
  assert.equal(healthStatus({ CAUSALFLY_META_ENABLED: "1" }, "production", true).metaEnabled, false);
  assert.deepEqual(empty.configuration, { metaConfigured: false, sceneModelConfigured: false, samConfigured: false, fruitFlyXR: false });
  const secret = "unique-private-test-credential";
  const ready = healthStatus({ META_API_KEY: secret, META_BASE_URL: "https://api.meta.ai/v1", META_MODEL: "muse-wonder-1.0", META_SCENE_MODEL: "muse-spark-1.3" }, "production", true, "wss://example.com/observatory/v1");
  assert.deepEqual(ready.configuration, { metaConfigured: true, sceneModelConfigured: true, samConfigured: true, fruitFlyXR: true });
  assert.equal(ready.metaMode, "offline");
  assert.equal(ready.providersChecked, false);
  assert.ok(!JSON.stringify(ready).includes(secret));
  assert.ok(!JSON.stringify(ready).includes("example.com"));
  assert.equal(healthStatus({ META_API_KEY: secret, META_BASE_URL: "http://invalid", META_MODEL: "model" }, "production", false).configuration.metaConfigured, false);
});

test("production observatory rejects insecure, local and malformed URLs", () => {
  for (const url of [undefined, "ws://example.com/observatory/v1", "wss://localhost/observatory/v1", "wss://127.0.0.1/observatory/v1", "wss://[::1]/observatory/v1", "wss://example.com/brain/v1", "wss://user:password@example.com/observatory/v1"]) assert.throws(() => configuredEndpoint(url, true));
  assert.equal(configuredEndpoint("ws://127.0.0.1:8766/observatory/v1", false), "ws://127.0.0.1:8766/observatory/v1");
  assert.equal(configuredEndpoint("wss://example.com/observatory/v1", true), "wss://example.com/observatory/v1");
});
