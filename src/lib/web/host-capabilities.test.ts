import test from "node:test";
import assert from "node:assert/strict";
import { hostCapabilities } from "./host-capabilities";
import { mediaCapabilities } from "../perception/media-configuration";
test("local operator diagnostic has booleans only; no secrets, URLs or live provider calls", () => {
  const secret="test-private-value-that-is-at-least-32-characters";
  const report=hostCapabilities({BLOB_READ_WRITE_TOKEN:secret,CAUSALFLY_MEDIA_SIGNING_SECRET:secret,META_API_KEY:secret,META_BASE_URL:"https://api.meta.ai/v1",META_MODEL:"muse-wonder-1.0",META_SCENE_MODEL:"muse-spark-1.3",FRUITFLY_XR_OBSERVATORY_URL:"wss://brain.example/observatory/v1"});
  assert.equal(report.privateStorageConfigured,true);assert.equal(report.mediaSigningConfigured,true);assert.equal(report.metaConfigured,true);assert.equal(report.brainEndpointConfigured,true);
  assert.ok(Object.values(report).every(value=>typeof value==="boolean"));assert.ok(!JSON.stringify(report).includes(secret));assert.ok(!JSON.stringify(report).includes("brain.example"));assert.equal(report.providersChecked,false);
  assert.equal(hostCapabilities({}).privateStorageConfigured,false); assert.equal(hostCapabilities({CAUSALFLY_MEDIA_SIGNING_SECRET:"short"}).mediaSigningConfigured,false);
});
test("OIDC needs a store and a token or Vercel request runtime; ID alone cannot authorize", () => {
 assert.equal(mediaCapabilities({BLOB_STORE_ID:"test"}).privateStorageConfigured,false);
 assert.equal(mediaCapabilities({BLOB_STORE_ID:"test",VERCEL_OIDC_TOKEN:"test"}).privateStorageConfigured,true);
 const runtime=mediaCapabilities({BLOB_STORE_ID:"test",VERCEL:"1"});assert.equal(runtime.privateStorageConfigured,true);assert.equal(runtime.oidcRequestContextRequired,true);assert.equal(runtime.credentialsVerified,false);
});
