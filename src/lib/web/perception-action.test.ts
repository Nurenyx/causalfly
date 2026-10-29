import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { perceptionAction } from "./perception-action";
import { offlinePerceptionFixture } from "../perception/fixture";
import { perceptionReceipt, retainPerception } from "../perception/store";
import { inspectVideo, validateVideoFile } from "../perception/media";
import { runGuidedAction } from "./guided-workflow";
import { FakeMetaClient } from "../meta/fake-client";
import { SamError } from "../meta/sam-client";
import type { MetaRequest } from "../meta/client";

const forbidden = async () => { assert.fail("Automated validation must not call Meta"); };
function request(file?: File, concept = "hand", token = randomUUID()) {
  const form = new FormData(); if (file) form.set("video", file); form.set("concept", concept);
  return new Request("http://localhost/api/perception", { method: "POST", headers: { "X-Perception-Request": token }, body: form });
}
test("explicit offline fixture calls no model and is unmistakably non-live", async () => {
  const response = await perceptionAction(new Request("http://localhost/api/perception", { method: "POST", headers: { "Content-Type": "application/json", "X-Perception-Request": randomUUID() }, body: '{"mode":"fixture"}' }), { analyze: forbidden, inspect: forbidden });
  const data = await response.json(); assert.equal(response.status, 200); assert.equal(data.perception.mode, "OFFLINE SAM FIXTURE");
  assert.equal(data.perception.measurement.amplitude, .64); assert.equal(data.overlay, undefined);
  assert.equal(typeof data.receipt, "string");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
test("perceive-first design uses signed retained measurements after lookup eviction, with no run or second SAM call", async () => {
  const record = retainPerception(offlinePerceptionFixture(randomUUID()));
  const receipt = perceptionReceipt(record);
  for (let i = 0; i < 101; i++) retainPerception(offlinePerceptionFixture(randomUUID()));
  const fake = new FakeMetaClient();
  const requests: MetaRequest[] = [];
  const deps = { env: {}, createClient: () => ({ mode: fake.mode, complete: (r: MetaRequest) => { requests.push(r); return fake.complete(r); } }) };
  const designed = await runGuidedAction({ action: "design", researchQuestion: "Does silencing primary_a reduce output?", perceptionId: record.id, perceptionReceipt: receipt }, deps);
  assert.ok(designed.ok); assert.equal(designed.result, undefined);
  assert.equal(requests.length, 1); assert.equal(requests[0].task, "design");
  assert.equal(JSON.parse(requests[0].inputJson).measuredStimulus.amplitude, .64);
  assert.deepEqual(designed.design.perceptionInput, record);
  assert.equal(designed.design.spec.stimulus.amplitude, .64, "CausalFly enforces input even though the fake designer proposes 1");
  assert.equal(designed.design.stimulusOverride?.originalAmplitude, 1);
  const run = await runGuidedAction({ action: "run", id: designed.design.id }, { createClient: () => { throw new Error("Run cannot reach Meta"); } });
  assert.ok(run.ok && run.result); assert.equal(run.result.analysis, undefined);
  assert.equal(run.result.measuredEvidence.control.outputPeakActivity, .64);
  assert.equal(run.result.measuredEvidence.perturbed.outputPeakActivity, .32);
  const changed = await runGuidedAction({ action: "stimulus", id: designed.design.id, perceptionId: record.id, perceptionReceipt: receipt }, deps);
  assert.ok(changed.ok); assert.equal(changed.result, undefined); assert.notEqual(changed.design.id, designed.design.id);
  assert.deepEqual(changed.design.perceptionInput, record); assert.equal(requests.length, 1);
  const rejected = await runGuidedAction({ action: "design", researchQuestion: "test", perceptionId: record.id, perceptionReceipt: receipt + "tampered" }, deps);
  assert.equal(rejected.ok, false); assert.equal(requests.length, 1, "Unverified perception cannot reach Muse");
});
test("missing/unsupported/oversized media and bad concepts are rejected before model calls", async () => {
  for (const req of [request(), request(new File(["bad"], "image.png", { type: "image/png" })), request(new File(["bad"], "clip.mp4"), "hand, car"), request(new File(["bad"], "clip.mp4"), ""), request(new File([new Uint8Array(20 * 1024 * 1024 + 1)], "clip.mp4", { type: "video/mp4" }))]) {
    const response = await perceptionAction(req, { analyze: forbidden, inspect: forbidden });
    assert.equal(response.status, 400); assert.equal((await response.json()).ok, false);
  }
});
test("media metadata is inspected from container bytes, including exact frame times", async () => {
  const bytes = await readFile("public/perception-calibration.mp4");
  const media = await inspectVideo(bytes);
  assert.equal(media.width, 320); assert.equal(media.height, 240);
  assert.equal(media.frameTimes.length, 60); assert.ok(Math.abs(media.durationSeconds - 2) < .001);
  await assert.rejects(inspectVideo(Buffer.from("not a movie")), /Unable to read/);
  assert.throws(() => validateVideoFile(new File([], "empty.mov")), /nonempty/);
});
test("live failures return actual retry state without an offline fallback or new stimulus", async () => {
  const response = await perceptionAction(request(new File(["movie"], "clip.mov", { type: "video/quicktime" })), { inspect: async () => offlinePerceptionFixture("x").media, analyze: async () => { throw new SamError("SAM refused this media."); } });
  const data = await response.json(); assert.equal(response.status, 502); assert.match(data.error, /refused/); assert.equal(data.perception, undefined);
});
test("one explicit request token cannot duplicate in-flight or completed SAM calls", async () => {
  const token = randomUUID(); let calls = 0; let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const deps = { inspect: async () => offlinePerceptionFixture("x").media, analyze: async () => { calls++; await gate; throw new SamError("Test provider failure"); } };
  const first = perceptionAction(request(new File(["movie"], "clip.mp4"), "hand", token), deps);
  const duplicate = await perceptionAction(request(new File(["movie"], "clip.mp4"), "hand", token), deps);
  assert.equal(duplicate.status, 409);
  // Allow request parsing to reach the injected provider, then release it.
  release(); await first;
  const repeated = await perceptionAction(request(new File(["movie"], "clip.mp4"), "hand", token), deps);
  assert.equal(repeated.status, 409); assert.equal(calls, 1);
});
test("cross-origin and unbounded request bodies cannot trigger perception", async () => {
  const cross = request(); cross.headers.set("Origin", "https://elsewhere.test");
  assert.equal((await perceptionAction(cross, { analyze: forbidden })).status, 403);
  const huge = request(); huge.headers.set("Content-Length", String(30 * 1024 * 1024));
  assert.equal((await perceptionAction(huge, { analyze: forbidden })).status, 400);
});
test("same-origin uploads accept Next's preserved Host when its internal URL uses localhost", async () => {
  const req = new Request("http://localhost:3117/api/perception", { method: "POST", headers: { Host: "127.0.0.1:3117", Origin: "http://127.0.0.1:3117", "Content-Type": "application/json", "X-Perception-Request": randomUUID() }, body: '{"mode":"fixture"}' });
  assert.equal((await perceptionAction(req, { analyze: forbidden })).status, 200);
});
test("accepted perception forks a validated draft and new measurements, never copying interpretation or trusting client amplitude", async () => {
  const calls: string[] = []; let interpretation = "";
  const fake = new FakeMetaClient();
  const deps = { env: {}, createClient: () => ({ mode: fake.mode, complete: (r: MetaRequest) => { calls.push(r.task); if (r.task === "interpret") interpretation = r.inputJson; return fake.complete(r); } }) };
  const d = await runGuidedAction({ action: "design", researchQuestion: "Silence primary_a with perceived expansion" }, deps); assert.ok(d.ok);
  const run = await runGuidedAction({ action: "run", id: d.design.id }, deps); assert.ok(run.ok && run.result);
  const interpreted = await runGuidedAction({ action: "interpret", id: d.design.id }, deps); assert.ok(interpreted.ok && interpreted.result?.analysis);
  const before = JSON.stringify(interpreted.result);
  const perception = retainPerception(offlinePerceptionFixture(randomUUID()));
  const accepted = await runGuidedAction({ action: "stimulus", id: d.design.id, perceptionId: perception.id }, { createClient: () => { throw new Error("Acceptance must not call Muse"); } });
  assert.ok(accepted.ok); assert.equal(accepted.result, undefined);
  assert.notEqual(accepted.design.spec.id, d.design.spec.id); assert.notEqual(accepted.design.id, d.design.id);
  assert.equal(accepted.design.spec.stimulus.amplitude, .64); assert.equal(accepted.design.perceptionInput, perception);
  assert.deepEqual(calls, ["design", "interpret"]);
  assert.equal((await runGuidedAction({ action: "interpret", id: accepted.design.id }, deps)).ok, false);
  assert.equal((await runGuidedAction({ action: "run", id: accepted.design.id, stimulusAmplitude: .5 }, deps)).ok, false);
  assert.equal((await runGuidedAction({ action: "stimulus", id: d.design.id, perceptionId: perception.id, amplitude: 1 }, deps)).ok, false);
  assert.equal((await runGuidedAction({ action: "stimulus", id: d.design.id, perceptionId: randomUUID() }, deps)).ok, false);
  const newRun = await runGuidedAction({ action: "run", id: accepted.design.id }, { createClient: () => { throw new Error("Engine must not construct Meta"); } });
  assert.ok(newRun.ok && newRun.result); assert.equal(newRun.result.analysis, undefined);
  assert.equal(newRun.result.measuredEvidence.control.outputPeakActivity, .64);
  assert.equal(newRun.result.measuredEvidence.perturbed.outputPeakActivity, .32);
  assert.equal(newRun.result.perceptionInput, perception);
  assert.ok(Object.isFrozen(newRun.result.perceptionInput!.measurement.frames));
  assert.ok(Object.values(newRun.result.measuredEvidence.provenance.matchedConditions).every(Boolean));
  const explained = await runGuidedAction({ action: "interpret", id: accepted.design.id }, deps); assert.ok(explained.ok && explained.result?.analysis);
  assert.equal(JSON.parse(interpretation).perceptionInput.measurement.amplitude, .64);
  assert.equal(JSON.stringify(interpreted.result), before);
  assert.equal(explained.result.perceptionInput, newRun.result.perceptionInput);
  const synthetic = await runGuidedAction({ action: "stimulus", id: accepted.design.id, perceptionId: null }, deps);
  assert.ok(synthetic.ok); assert.equal(synthetic.result, undefined); assert.equal(synthetic.design.perceptionInput, undefined); assert.equal(synthetic.design.spec.stimulus.amplitude, 1);
});
