import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSamVideo, measurementFromSam, samConfiguration } from "./sam-client";
import { offlinePerceptionFixture } from "../perception/fixture";

const env = { META_API_KEY: "unit-test-key-not-live", META_BASE_URL: "https://api.meta.ai/v1", META_TIMEOUT_MS: "1000" };
// Valid 27x60 mask from the official parser README conformance example.
const mask = "<|mask;x=0;y=0;data=27,60,~!!!!M!0c[0o91w?q1!pIH4pPRVp2B3'7`e.ioeAf6-k/#Xd8%dX9x(|>";
const text = `<0f>0<|box;x1=211;y1=228;x2=270;y2=254;w=320;h=334|>${mask}\n<1f>0<|box;x1=180;y1=200;x2=299;y2=253;w=320;h=334|>${mask}\n`;
const media = { width: 320, height: 334, durationSeconds: 1, frameTimes: [0, .5] };
const lane = { item_id: "message-test", output_index: 0, content_index: 0 };
function transport(output = text, terminal: "completed" | "incomplete" | "eof" | "refusal" = "completed", failUpload = false, failDelete = false) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input), method = init?.method ?? "GET";
    // SDK probes local Response/FormData support without making a provider request.
    if (url === "data:,") return new Response("");
    calls.push({ url, method, body: init?.body });
    assert.ok(url.startsWith("https://api.meta.ai/v1/"));
    if (method === "DELETE") return Response.json({ id: "file-test", deleted: !failDelete });
    if (url.endsWith("/files")) return failUpload ? Response.json({ error: { message: "secret user payload unit-test-key-not-live" } }, { status: 403 }) : Response.json({ id: "file-test" });
    const request = JSON.parse(String(init?.body));
    assert.equal(request.model, "sam-3.1"); assert.equal(request.stream, true);
    assert.deepEqual(request.input[0].content, [{ type: "input_text", text: "hand" }, { type: "input_video", file_id: "file-test" }]);
    const events: unknown[] = [{ type: "response.created", response: { id: "resp-test" } }];
    if (terminal === "refusal") events.push({ type: "response.refusal.delta", ...lane, delta: "refused" });
    else {
      for (let i = 0; i < output.length; i += 13) events.push({ type: "response.output_text.delta", ...lane, delta: output.slice(i, i + 13) });
      events.push({ type: "response.content_part.done", ...lane, part: { type: "output_text", text: output } });
      if (terminal !== "eof") events.push({ type: `response.${terminal}`, response: { id: "resp-test" } });
    }
    return new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(""), { headers: { "Content-Type": "text/event-stream", "x-request-id": "request-test" } });
  };
  return { fakeFetch, calls };
}
test("SAM shares server Meta key/config but fixes model and authoritative base URL", () => {
  assert.equal(samConfiguration(env).model, "sam-3.1");
  assert.equal(samConfiguration({ META_API_KEY: "test" }).baseURL, "https://api.meta.ai/v1");
  for (const config of [{}, { ...env, META_API_KEY: "" }, { ...env, META_BASE_URL: "https://example.com/v1" }]) assert.throws(() => samConfiguration(config), /SAM LIVE requires/);
});
test("one upload and segmentation use real official parser, normalize inclusive corners, and delete media", async () => {
  const { fakeFetch, calls } = transport();
  const result = await analyzeSamVideo(new File(["test"], "stimulus.mp4"), "hand", media, { env, fetch: fakeFetch });
  assert.equal(calls.length, 3); assert.equal(calls[2].method, "DELETE");
  assert.equal(result.measurement.frames[0].right, 271);
  assert.equal(result.measurement.frames[0].area, 60 * 27 / (320 * 334));
  assert.equal(result.overlay.records.length, 4);
  assert.equal(result.provenance.cleanup, "deleted"); assert.equal(result.provenance.responseId, "resp-test");
  assert.equal(result.overlay.rawOutput, "");
});
for (const [name, output, terminal, match] of [
  ["no match", "", "completed", /no matching object/],
  ["malformed grammar", "<0f>garbage\n", "completed", /malformed/],
  ["invalid mask", text.replace("~!!!!M", "~INVALID"), "completed", /malformed/],
  ["incomplete response", text, "incomplete", /incomplete/],
  ["missing terminal event", text, "eof", /incomplete/],
  ["refusal", text, "refusal", /refused/],
] as const) test(`SAM ${name} is rejected and uploaded media is deleted without retry or fake fallback`, async () => {
  const { fakeFetch, calls } = transport(output, terminal);
  await assert.rejects(analyzeSamVideo(new File(["test"], "stimulus.mp4"), "hand", media, { env, fetch: fakeFetch }), match);
  assert.equal(calls.length, 3); assert.equal(calls[2].method, "DELETE");
});
test("HTTP errors are sanitized, single-attempt, and never echo credentials or media", async () => {
  const { fakeFetch, calls } = transport(text, "completed", true);
  await assert.rejects(analyzeSamVideo(new File(["test"], "stimulus.mp4"), "hand", media, { env, fetch: fakeFetch }), error => {
    assert.match(String(error), /HTTP 403/); assert.doesNotMatch(String(error), /unit-test-key|user payload/); return true;
  });
  assert.equal(calls.length, 1);
});
test("cleanup failure remains visible and expiration was requested", async () => {
  const { fakeFetch, calls } = transport(text, "completed", false, true);
  const result = await analyzeSamVideo(new File(["test"], "stimulus.mp4"), "hand", media, { env, fetch: fakeFetch });
  assert.equal(result.provenance.cleanup, "delete-failed-expires-in-1h");
  const form = calls[0].body as FormData;
  assert.equal(form.get("expires_after[seconds]"), "3600");
});
test("official result geometry is rejected if it falls outside the inspected media", () => {
  const f = offlinePerceptionFixture("fixture");
  assert.throws(() => measurementFromSam({ media: "video", revision: 1, rawOutput: "", diagnostics: [], outcome: { status: "completed" }, records: f.measurement.frames.map((box, i) => ({ ...box, kind: "box", objectId: "0", order: i, frame: { frameIndex: box.frameIndex } })) }, media), /invalid/);
});
