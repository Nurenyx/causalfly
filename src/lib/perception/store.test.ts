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
test("legacy process-key loss and receipt expiry remain rejected without a configured stable key", () => {
  const previousSecret=process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;
  delete process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;
  const scope=globalThis as typeof globalThis & {__causalflyPerceptionV1?:unknown};
  const original=scope.__causalflyPerceptionV1;const now=Date.now;
  try {
    const record=retainPerception(offlinePerceptionFixture(randomUUID()));const receipt=perceptionReceipt(record);
    const issuingState=scope.__causalflyPerceptionV1;delete scope.__causalflyPerceptionV1;
    assert.throws(()=>verifyPerceptionReceipt(record.id,receipt),/restart, expiry, or changed receipt/);
    scope.__causalflyPerceptionV1=issuingState;
    Date.now=()=>now()+13*60*60*1000;
    assert.throws(()=>verifyPerceptionReceipt(record.id,receipt),/Re-analyze/);
  } finally {
    Date.now=now;scope.__causalflyPerceptionV1=original;
    if(previousSecret===undefined)delete process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;else process.env.CAUSALFLY_MEDIA_SIGNING_SECRET=previousSecret;
  }
});


test("configured purpose-separated receipt key survives process-state loss; changed key and tampering remain rejected", () => {
 const previous=process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;
 const scope=globalThis as typeof globalThis & {__causalflyPerceptionV1?:unknown};const original=scope.__causalflyPerceptionV1;
 process.env.CAUSALFLY_MEDIA_SIGNING_SECRET="receipt-fixture-key-at-least-32-characters";
 try{
  const record=retainPerception(offlinePerceptionFixture(randomUUID()));const receipt=perceptionReceipt(record);
  delete scope.__causalflyPerceptionV1;
  assert.deepEqual(verifyPerceptionReceipt(record.id,receipt),record);
  assert.throws(()=>verifyPerceptionReceipt(record.id,receipt+"changed"),/Re-analyze/);
  process.env.CAUSALFLY_MEDIA_SIGNING_SECRET="different-fixture-key-at-least-32-characters";
  assert.throws(()=>verifyPerceptionReceipt(record.id,receipt),/Re-analyze/);
 }finally{scope.__causalflyPerceptionV1=original;if(previous===undefined)delete process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;else process.env.CAUSALFLY_MEDIA_SIGNING_SECRET=previous;}
});

test("legacy process-signed receipts still verify during migration while the original key exists",()=>{
 const previous=process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;delete process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;
 try{
  const record=retainPerception(offlinePerceptionFixture(randomUUID()));const receipt=perceptionReceipt(record);
  process.env.CAUSALFLY_MEDIA_SIGNING_SECRET="migration-fixture-key-at-least-32-characters";
  assert.deepEqual(verifyPerceptionReceipt(record.id,receipt),record);
 }finally{if(previous===undefined)delete process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;else process.env.CAUSALFLY_MEDIA_SIGNING_SECRET=previous;}
});
