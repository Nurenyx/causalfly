import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { offlinePerceptionFixture } from "./fixture";
import { perceptionReceipt, retainPerception, retainedPerception, verifyPerceptionReceipt } from "./store";

test("server-signed perception survives eviction and module reload with provenance and exact features intact", () => {
  const record = retainPerception(offlinePerceptionFixture(randomUUID()));
  const receipt = perceptionReceipt(record);
  for (let i = 0; i < 101; i++) retainPerception(offlinePerceptionFixture(randomUUID()));
  assert.equal(retainedPerception(record.id), undefined, "Map lookup really is unavailable");
  const restored = retainedPerception(record.id, receipt);
  assert.deepEqual(restored, record); assert.ok(Object.isFrozen(restored!.measurement.frames));
  const require = createRequire(`${process.cwd()}/package.json`);
  const modulePath = require.resolve("./src/lib/perception/store.ts");
  delete require.cache[modulePath];
  const reloaded = require(modulePath) as typeof import("./store");
  assert.deepEqual(reloaded.verifyPerceptionReceipt(record.id, receipt), record);
});
test("tampered geometry, signatures, unknown identities and oversized receipts are never trusted", () => {
  const record = retainPerception(offlinePerceptionFixture(randomUUID()));
  const receipt = perceptionReceipt(record);
  const [payload, signature] = receipt.split(".");
  for (const invalid of [payload + ".AAAA", "A" + receipt, receipt + ".extra", "x".repeat(384_001), `${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`]) assert.throws(() => verifyPerceptionReceipt(record.id, invalid), /Re-analyze/);
  assert.throws(() => verifyPerceptionReceipt(randomUUID(), receipt), /Re-analyze/);
  // A client-authored record is not a receipt, even when it copies valid measurements.
  assert.throws(() => verifyPerceptionReceipt(record.id, Buffer.from(JSON.stringify(record)).toString("base64url")), /Re-analyze/);
});
test("a genuine process-key loss and receipt expiry have an explicit recovery path", () => {
  const record = retainPerception(offlinePerceptionFixture(randomUUID()));
  const receipt = perceptionReceipt(record);
  const processScope = globalThis as typeof globalThis & { __causalflyPerceptionV1?: unknown };
  const original = processScope.__causalflyPerceptionV1;
  delete processScope.__causalflyPerceptionV1;
  try { assert.throws(() => verifyPerceptionReceipt(record.id, receipt), /restart, expiry, or changed receipt/); }
  finally { processScope.__causalflyPerceptionV1 = original; }
  const now = Date.now;
  Date.now = () => now() + 13 * 60 * 60 * 1000;
  try { assert.throws(() => verifyPerceptionReceipt(record.id, receipt), /Re-analyze/); }
  finally { Date.now = now; }
});
