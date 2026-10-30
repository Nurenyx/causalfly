import { referenceBody, fixtureResolver } from "./media-test-fixture";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { sceneAction as realSceneAction } from "./scene-action";
import { perceptionAction as realPerceptionAction } from "./perception-action";
import { offlineScene } from "../perception/scene";
import { offlinePerceptionFixture } from "../perception/fixture";
import { SceneError } from "../meta/scene-client";
import { SamError } from "../meta/sam-client";

const forbidden = async () => { assert.fail("Zero paid calls in automated tests"); };
const calibration = () => readFile("public/perception-calibration.mp4");
async function request(mode = "live", token = randomUUID(), bytes?: Uint8Array) {
  bytes ??= await calibration();
  const form = new FormData(); form.set("video", new File([new Uint8Array(bytes)], "private-name.mp4", { type: "video/mp4" })); form.set("mode", mode);
  return new Request("http://localhost/api/perception/scene", { method: "POST", headers: { "Content-Type": "application/json", "X-Scene-Request": token }, body: referenceBody(form) });
}
const valid = { discover: async (file: File) => { assert.equal(file.name, "stimulus.mp4"); return JSON.stringify(offlineScene); } };
async function discovered() { const response = await sceneAction(await request(), valid); assert.equal(response.status, 200); return (await response.json()).scene; }
async function track(sceneId: string, candidate: string, concept: string, bytes?: Uint8Array) {
  bytes ??= await calibration();
  const form = new FormData(); form.set("video", new File([new Uint8Array(bytes)], "clip.mp4")); form.set("sceneId", sceneId); form.set("candidate", candidate); form.set("concept", concept);
  return new Request("http://localhost/api/perception", { method: "POST", headers: { "Content-Type": "application/json", "X-Perception-Request": randomUUID() }, body: referenceBody(form) });
}
test("explicit offline discovery is labeled and never calls Meta; always uses the server calibration clip", async () => {
  const response = await sceneAction(await request("fixture"), { discover: forbidden }); const data = await response.json();
  assert.equal(response.status, 200); assert.equal(data.scene.mode, "OFFLINE SCENE-UNDERSTANDING FIXTURE"); assert.equal(data.scene.provider, "CausalFly fixture");
  assert.equal(data.scene.result.candidates[0].samPrompt, "red square");
  assert.equal(data.diagnostics.events.some((e: { type: string }) => e.type === "sam.requested"), false);
  const other = await sceneAction(await request("fixture", randomUUID(), Buffer.from("other video")), { discover: forbidden, inspect: async () => offlinePerceptionFixture("x").media });
  assert.equal(other.status, 200); assert.equal((await other.json()).scene.mediaSha256, data.scene.mediaSha256);
});
test("malformed, no-candidate, low-confidence and provider failures have distinct safe recovery", async () => {
  for (const [discover, kind] of [
    [async () => "not JSON", "malformed"],
    [async () => JSON.stringify({ ...offlineScene, candidates: [] }), "no_candidates"],
    [async () => JSON.stringify({ ...offlineScene, candidates: [{ ...offlineScene.candidates[0], confidence: .1 }] }), "no_candidates"],
    [async () => { throw new SceneError("Muse unavailable; enter a concept manually."); }, "provider"],
  ] as const) {
    const data = await (await sceneAction(await request(), { discover })).json();
    assert.equal(data.ok, false); assert.equal(data.kind, kind); assert.equal(data.scene, undefined);
    assert.ok(data.diagnostics.events.some((e: { type: string }) => e.type === "meta.scene.failed"));
  }
});
test("explicit token, same origin and media validation precede any discovery call", async () => {
  const missing = await request(); missing.headers.delete("X-Scene-Request");
  assert.equal((await sceneAction(missing, { discover: forbidden })).status, 400);
  const cross = await request(); cross.headers.set("Origin", "https://elsewhere.test");
  assert.equal((await sceneAction(cross, { discover: forbidden })).status, 403);
  assert.equal((await sceneAction(await request("live", randomUUID(), Buffer.from("bad")), { discover: forbidden })).status, 400);
});
test("duplicate discovery is suppressed in flight and after completion; retry needs new token", async () => {
  const token = randomUUID(); let count = 0; let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const deps = { discover: async () => { count++; await gate; return JSON.stringify(offlineScene); } };
  const first = sceneAction(await request("live", token), deps);
  assert.equal((await sceneAction(await request("live", token), deps)).status, 409);
  release(); assert.equal((await first).status, 200);
  assert.equal((await sceneAction(await request("live", token), deps)).status, 409); assert.equal(count, 1);
});
test("only selected validated SAM prompt crosses handoff, with correlated scene and measurement events", async () => {
  const scene = await discovered(); let received = "";
  const f = offlinePerceptionFixture("x");
  const response = await perceptionAction(await track(scene.id, "0", "red square"), { analyze: async (_file, concept) => { received = concept; return { measurement: f.measurement, overlay: { media: "video" as const, revision: 1, rawOutput: "", diagnostics: [], records: [], outcome: { status: "completed" as const } }, provenance: { ...f.provenance, warnings: [...f.provenance.warnings], parser: "@meta-sam/parser@0.1.0" as const, responseId: "response-test", requestId: "request-test" } }; } });
  const data = await response.json(); assert.equal(response.status, 200); assert.equal(received, "red square");
  assert.equal(data.perception.provenance.scene.selection, "candidate"); assert.equal(data.perception.run_id, scene.run_id);
  const types = data.diagnostics.events.map((e: { type: string }) => e.type);
  for (const type of ["meta.scene.requested", "meta.scene.completed", "meta.scene.selected", "sam.requested", "sam.completed", "stimulus.derived"]) assert.ok(types.includes(type));
  assert.doesNotMatch(JSON.stringify(data.diagnostics), /private-name|Bearer|api_key|rawOutput/);
});
test("tampered selection, stale scene and different-video suggestions fail before SAM", async () => {
  const scene = await discovered();
  for (const req of [await track(scene.id, "0", "hand"), await track(randomUUID(), "0", "hand"), await track(scene.id, "0", "red square", Buffer.from("different"))]) {
    const response = await perceptionAction(req, { analyze: forbidden, inspect: async () => offlinePerceptionFixture("x").media });
    assert.equal(response.status, 400); assert.match((await response.json()).error, /Choose/);
  }
});
test("manual override passes exactly the entered concept and recovery preserves suggestions", async () => {
  const scene = await discovered(); let concept = "";
  const deps = { analyze: async (_file: File, selected: string) => { concept = selected; throw new SamError("SAM could not detect the concept. Refine it."); } };
  const response = await perceptionAction(await track(scene.id, "manual", "blue cup"), deps);
  const data = await response.json(); assert.equal(response.status, 502); assert.equal(concept, "blue cup");
  assert.ok(data.diagnostics.events.some((e: { type: string; metadata: { selection?: string } }) => e.type === "meta.scene.selected" && e.metadata.selection === "manual"));
  assert.equal(scene.result.candidates[0].samPrompt, "red square");
  assert.equal((await sceneAction(await request(), valid)).status, 200);
});


process.env.CAUSALFLY_META_ENABLED = "1";
function perceptionAction(request: Request, deps: NonNullable<Parameters<typeof realPerceptionAction>[1]> = {}) { return realPerceptionAction(request, { ...deps, resolve: fixtureResolver(deps.inspect) }); }
function sceneAction(request: Request, deps: NonNullable<Parameters<typeof realSceneAction>[1]> = {}) { return realSceneAction(request, { ...deps, resolve: fixtureResolver(deps.inspect) }); }
