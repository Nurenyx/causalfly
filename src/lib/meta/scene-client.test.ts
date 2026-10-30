import test from "node:test";
import assert from "node:assert/strict";
import { discoverScene, sceneConfiguration } from "./scene-client";
import { offlineScene } from "../perception/scene";
const env = { CAUSALFLY_META_ENABLED: "1", META_API_KEY: "unit-test-key-never-live", META_BASE_URL: "https://api.meta.ai/v1", META_MODEL: "muse-wonder-1.0", META_SCENE_MODEL: "muse-spark-1.3", META_TIMEOUT_MS: "1000" };
test("scene model is explicit and independent of existing Wonder design configuration", () => {
  assert.equal(sceneConfiguration(env).model, "muse-spark-1.3");
  assert.equal(env.META_MODEL, "muse-wonder-1.0");
  for (const invalid of [{ ...env, META_SCENE_MODEL: "" }, { ...env, META_SCENE_MODEL: "invented-model" }, { ...env, META_BASE_URL: "https://elsewhere.test/v1" }]) assert.throws(() => sceneConfiguration(invalid), /META_SCENE_MODEL/);
});
test("documented file input and strict Responses text.format; exactly one model attempt plus cleanup", async () => {
  const calls: string[] = [];
  const fakeFetch: typeof fetch = async (url, init) => {
    if (String(url) === "data:,") return new Response("");
    calls.push(`${init?.method} ${url}`);
    if (init?.method === "DELETE") return Response.json({ id: "file-test", deleted: true });
    if (String(url).endsWith("/files")) return Response.json({ id: "file-test" });
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, env.META_SCENE_MODEL); assert.equal(body.text.format.type, "json_schema"); assert.equal(body.text.format.strict, true);
    assert.deepEqual(body.input[0].content[1], { type: "input_file", file_id: "file-test" });
    assert.match(body.instructions, /Never claim neural activity/);
    return Response.json({ object: "response", status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(offlineScene) }] }] });
  };
  assert.equal(await discoverScene(new File(["clip"], "stimulus.mp4"), { env, fetch: fakeFetch }), JSON.stringify(offlineScene));
  assert.equal(calls.length, 3); assert.match(calls[2], /^DELETE/);
});
test("provider errors are sanitized, single attempt, with upload cleanup and no fake fallback", async () => {
  let attempts = 0, deletes = 0;
  const fakeFetch: typeof fetch = async (url, init) => {
    if (String(url) === "data:,") return new Response("");
    if (init?.method === "DELETE") { deletes++; return Response.json({ deleted: true }); }
    if (String(url).endsWith("/files")) return Response.json({ id: "file-test" });
    attempts++; return Response.json({ error: { message: "unit-test-key-never-live secret provider body" } }, { status: 503 });
  };
  await assert.rejects(discoverScene(new File(["clip"], "stimulus.mp4"), { env, fetch: fakeFetch }), error => { assert.match(String(error), /unavailable/); assert.doesNotMatch(String(error), /secret|unit-test-key/); return true; });
  assert.equal(attempts, 1); assert.equal(deletes, 1);
});
