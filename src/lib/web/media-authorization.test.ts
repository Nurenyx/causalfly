import test from "node:test";
import assert from "node:assert/strict";
import { mediaAuthorization } from "./media-action";
import { MediaConfigurationError, MediaError } from "../perception/blob-media";
const request = () => new Request("https://causalfly.test/api/media/authorize", { method: "POST", headers: { origin: "https://causalfly.test" }, body: "{}" });
test("upload errors distinguish configuration, validation, timeout and safe provider failures", async () => {
  for (const [error, status, code] of [[new MediaConfigurationError("Private video upload is not enabled on this server."), 503, "UPLOAD_NOT_CONFIGURED"], [new MediaError("invalid type"), 400, "INVALID_VIDEO"], [new DOMException("timeout", "TimeoutError"), 504, "UPLOAD_TIMEOUT"], [new Error("PRIVATE_TOKEN upstream raw details"), 502, "STORAGE_UNAVAILABLE"]] as const) {
    const response = await mediaAuthorization(request(), async () => { throw error; });
    assert.equal(response.status, status); const body = await response.json(); assert.equal(body.code, code); assert.ok(!body.error.includes("PRIVATE_TOKEN"));
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal((await mediaAuthorization(new Request("https://causalfly.test/api/media/authorize", { method: "POST" }))).status, 403);
});
