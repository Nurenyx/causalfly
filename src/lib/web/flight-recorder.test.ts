import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { FlightRecorder } from "./flight-recorder";
import { runGuidedAction } from "./guided-workflow";
import { perceptionAction } from "./perception-action";
import { workspaceReducer } from "./dashboard";
import { FakeMetaClient } from "../meta/fake-client";
import { SamError } from "../meta/sam-client";
import { createEvidencePayload } from "../meta/evidence";
import { demoExperimentSpec } from "../experiment/demo";
import { syntheticDemoNetwork } from "../experiment/network";
import { offlinePerceptionFixture } from "../perception/fixture";
import type { RunDiagnostics } from "./flight-recorder-types";

test.beforeEach(() => { mock.method(globalThis, "fetch", async () => { throw new Error("Network prohibited in recorder tests"); }); });
test.afterEach(() => { mock.restoreAll(); });
const deps = { env: {}, createClient: () => new FakeMetaClient() };
const question = "Does silencing primary_a change output?";
async function design() {
  const d = await runGuidedAction({ action: "design", researchQuestion: question }, deps);
  assert.ok(d.ok); return d.design;
}
async function measure(id: string) {
  const r = await runGuidedAction({ action: "run", id }, { createClient: () => { throw new Error("Engine must never request Meta"); } });
  assert.ok(r.ok && r.result); return r.result;
}
const types = (d: RunDiagnostics) => d.events.map(e => e.type);

test("stable run identity follows design, approval, immutable measurements and interpretation; no duplicate execution events", async () => {
  const d = await design(); const r = await measure(d.id);
  assert.match(d.run_id!, /^run_[0-9a-f-]{36}$/);
  assert.equal(r.run_id, d.run_id);
  const before = JSON.stringify(r.diagnostics);
  const i = await runGuidedAction({ action: "interpret", id: d.id }, deps);
  assert.ok(i.ok && i.result?.diagnostics);
  const snapshot = i.result.diagnostics;
  assert.equal(snapshot.manifest.run_id, d.run_id);
  assert.deepEqual(types(snapshot), ["run.created", "question.submitted", "meta.design.requested", "meta.design.completed", "experiment.approved", "experiment.control.completed", "experiment.intervention.completed", "experiment.comparison.completed", "meta.interpretation.requested", "meta.interpretation.completed", "meta.next_experiment.proposed"]);
  snapshot.events.forEach((event, index) => { assert.equal(event.sequence, index + 1); assert.equal(event.run_id, d.run_id); assert.ok(Number.isFinite(Date.parse(event.at))); });
  assert.ok(Object.values(snapshot.manifest.validation!).every(Boolean));
  assert.deepEqual(snapshot.manifest.measurements, r.measuredEvidence);
  assert.equal(snapshot.manifest.specSha256, createHash("sha256").update(JSON.stringify(d.spec)).digest("hex"));
  assert.equal(snapshot.manifest.interpretation.state, "completed");
  assert.ok(snapshot.manifest.interpretation.sha256);
  assert.equal(JSON.stringify(r.diagnostics), before, "Earlier exported snapshots never mutate");
  assert.ok(Object.isFrozen(snapshot.manifest.measurements!.control.activity));
  await assert.rejects(async () => { (snapshot.manifest.warnings as string[]).push("tamper"); });
  const repeated = await runGuidedAction({ action: "run", id: d.id }, deps); assert.ok(repeated.ok);
  assert.deepEqual(repeated.diagnostics, snapshot);
});

test("changed stimuli and next proposals receive linked IDs and preserve previous evidence", async () => {
  const d = await design(); const r = await measure(d.id);
  const before = JSON.stringify(r);
  const fork = await runGuidedAction({ action: "run", id: d.id, stimulusAmplitude: .6 }, deps);
  assert.ok(fork.ok && fork.result?.diagnostics);
  assert.notEqual(fork.result.run_id, r.run_id);
  assert.equal(fork.result.diagnostics.manifest.parent_run_id, r.run_id);
  assert.equal(fork.result.diagnostics.manifest.interpretation.state, "not_requested");
  assert.equal(JSON.stringify(r), before);
  const interpreted = await runGuidedAction({ action: "interpret", id: d.id }, deps); assert.ok(interpreted.ok && interpreted.result?.analysis);
  const next = await runGuidedAction({ action: "design", nextFromId: d.id, researchQuestion: interpreted.result.analysis.nextExperiment.researchQuestion }, deps);
  assert.ok(next.ok && next.design.diagnostics);
  assert.equal(next.design.diagnostics.manifest.parent_run_id, d.run_id);
  assert.notEqual(next.design.run_id, d.run_id);
  assert.equal(next.design.diagnostics.manifest.measurements, undefined);
});

test("perceive-first fixture shares its run ID, retains formula and geometry, and never claims live SAM detection", async () => {
  const response = await perceptionAction(new Request("http://localhost/api/perception", { method: "POST", headers: { "Content-Type": "application/json", "X-Perception-Request": randomUUID() }, body: '{"mode":"fixture"}' }));
  const p = await response.json(); assert.equal(p.ok, true);
  assert.ok(!types(p.diagnostics).includes("sam.completed"));
  const d = await runGuidedAction({ action: "design", researchQuestion: question, perceptionId: p.perception.id, perceptionReceipt: p.receipt }, deps); assert.ok(d.ok);
  const r = await measure(d.design.id);
  assert.equal(r.run_id, p.perception.run_id);
  assert.equal(r.perceptionInput?.run_id, r.run_id);
  assert.equal(r.diagnostics?.manifest.source, "offline perception fixture");
  assert.ok(r.diagnostics?.manifest.validation?.trackReturned);
  assert.ok(r.diagnostics?.manifest.validation?.derivedStimulusValid);
  assert.match(r.diagnostics!.manifest.perception!.measurement.mappingRule, /box-expansion-v1/);
  assert.equal(types(r.diagnostics!).filter(t => t === "stimulus.derived").length, 1);
  const synthetic = await runGuidedAction({ action: "stimulus", id: d.design.id, perceptionId: null }, deps); assert.ok(synthetic.ok);
  assert.equal(synthetic.design.diagnostics?.manifest.source, "synthetic");
  assert.equal(synthetic.design.diagnostics?.manifest.perception, undefined);
});

test("SAM failures and no-match events are correlated and retain neither uploaded bytes nor raw errors", async () => {
  for (const noMatch of [true, false]) {
    const form = new FormData(); form.set("video", new File(["PRIVATE_VIDEO_BYTES"], "PRIVATE_FILENAME.mp4")); form.set("concept", "hand");
    const response = await perceptionAction(new Request("http://localhost/api/perception", { method: "POST", headers: { "X-Perception-Request": randomUUID() }, body: form }), {
      inspect: async () => offlinePerceptionFixture("x").media,
      analyze: async () => { if (noMatch) throw new SamError("SAM found no matching object. Try a clearer clip."); throw new Error("Bearer SECRET_TOKEN raw provider stack"); },
    });
    const failure = await response.json();
    assert.equal(failure.ok, false);
    assert.equal(failure.run_id, failure.diagnostics.manifest.run_id);
    assert.ok(types(failure.diagnostics).includes(noMatch ? "sam.no_match" : "sam.failed"));
    assert.doesNotMatch(JSON.stringify(failure.diagnostics), /PRIVATE_VIDEO_BYTES|PRIVATE_FILENAME|SECRET_TOKEN|Bearer|raw provider stack/);
    assert.equal(failure.diagnostics.manifest.measurements, undefined);
  }
});

test("injected SAM success records track identity and carries the perception ID into an approved run", async () => {
  const fixture = offlinePerceptionFixture("sam-success");
  const form = new FormData(); form.set("video", new File(["PRIVATE_VIDEO_BYTES"], "PRIVATE_FILENAME.mp4")); form.set("concept", "hand");
  const response = await perceptionAction(new Request("http://localhost/api/perception", { method: "POST", headers: { "X-Perception-Request": randomUUID() }, body: form }), {
    inspect: async () => fixture.media,
    analyze: async () => ({ measurement: fixture.measurement, overlay: { rawOutput: "PRIVATE_PROVIDER_OUTPUT" } as never,
      provenance: { ...fixture.provenance, parser: "@meta-sam/parser@0.1.0", warnings: ["test_warning"], responseId: "response-fixture", requestId: undefined } }),
  });
  const p = await response.json(); assert.equal(p.ok, true);
  assert.deepEqual(types(p.diagnostics), ["run.created", "meta.scene.selected", "sam.requested", "warning.recorded", "sam.completed", "stimulus.derived"]);
  assert.doesNotMatch(JSON.stringify(p.diagnostics), /PRIVATE_VIDEO_BYTES|PRIVATE_FILENAME|PRIVATE_PROVIDER_OUTPUT|receipt|overlay/);
  const d = await runGuidedAction({ action: "design", researchQuestion: question, perceptionId: p.perception.id, perceptionReceipt: p.receipt }, deps); assert.ok(d.ok);
  const r = await measure(d.design.id);
  assert.equal(r.run_id, p.perception.run_id);
  assert.equal(r.diagnostics?.manifest.source, "SAM perception");
  assert.equal(r.diagnostics?.manifest.perception?.provenance.responseId, "response-fixture");
  assert.ok(r.diagnostics?.manifest.validation?.derivedStimulusValid);
});

test("reusing perception concurrently creates distinct drafts and bounded ledgers disclose truncation", async () => {
  const response = await perceptionAction(new Request("http://localhost/api/perception", { method: "POST", headers: { "Content-Type": "application/json", "X-Perception-Request": randomUUID() }, body: '{"mode":"fixture"}' }));
  const p = await response.json();
  const input = { action: "design", researchQuestion: question, perceptionId: p.perception.id, perceptionReceipt: p.receipt };
  const [a, b] = await Promise.all([runGuidedAction(input, deps), runGuidedAction(input, deps)]);
  assert.ok(a.ok && b.ok); assert.notEqual(a.design.run_id, b.design.run_id);
  const recorder = new FlightRecorder();
  for (let i = 0; i < 1010; i++) recorder.event("error.recorded", { code: "bounded-test" });
  const snapshot = recorder.snapshot();
  assert.equal(snapshot.events.length, 1000);
  assert.ok(snapshot.manifest.warnings.some(w => /oldest events omitted/.test(w)));
});

test("interpretation failure is exportable, leaves engine evidence intact, and can be retried explicitly", async () => {
  const d = await design(); const r = await measure(d.id);
  const failure = await runGuidedAction({ action: "interpret", id: d.id }, { env: { META_API_KEY: "SECRET_KEY" }, createClient: () => ({ mode: "META LIVE", complete: async () => { throw new Error("Bearer SECRET_KEY stack SECRET_PROMPT"); } }) });
  assert.ok(!failure.ok && failure.diagnostics);
  assert.equal(failure.run_id, d.run_id);
  assert.equal(failure.diagnostics.manifest.interpretation.state, "failed");
  assert.deepEqual(failure.diagnostics.manifest.measurements, r.measuredEvidence);
  assert.doesNotMatch(JSON.stringify(failure), /SECRET_KEY|SECRET_PROMPT|Bearer|stack/);
  const state = workspaceReducer({ workspace: "observatory", question, design: d, result: r }, { type: "diagnostics", diagnostics: failure.diagnostics });
  assert.equal(state.result?.measuredEvidence, r.measuredEvidence);
  assert.equal(state.result?.diagnostics?.manifest.interpretation.state, "failed");
  const cached = await runGuidedAction({ action: "run", id: d.id }, deps); assert.ok(cached.ok);
  assert.equal(cached.result, r); assert.equal(cached.diagnostics?.manifest.interpretation.state, "failed");
  const retried = await runGuidedAction({ action: "interpret", id: d.id }, deps); assert.ok(retried.ok);
  assert.equal(retried.result?.diagnostics?.manifest.interpretation.state, "completed");
});

test("invalid designs and invalid existing-run requests have structured rejection and correlation", async () => {
  const failure = await runGuidedAction({ action: "design", researchQuestion: question }, { env: {}, createClient: () => ({ mode: "FAKE META CLIENT", complete: async () => '{"maxSteps":-1}' }) });
  assert.ok(!failure.ok && failure.diagnostics);
  assert.ok(types(failure.diagnostics).includes("meta.design.rejected"));
  assert.equal(failure.diagnostics.manifest.measurements, undefined);
  const d = await design();
  const invalid = await runGuidedAction({ action: "run", id: d.id, stimulusAmplitude: -1 }, deps);
  assert.ok(!invalid.ok); assert.equal(invalid.run_id, d.run_id);
});

test("event metadata is allowlisted and SAM geometry validation can fail without misleading checkmarks", () => {
  const recorder = new FlightRecorder();
  recorder.event("error.recorded", { code: "safe", ...{ apiKey: "SECRET", video: "PRIVATE_BYTES", stack: "PRIVATE_STACK" } });
  assert.doesNotMatch(JSON.stringify(recorder.snapshot()), /SECRET|PRIVATE_BYTES|PRIVATE_STACK|apiKey/);
  const perception = offlinePerceptionFixture("geometry");
  const invalid = { ...perception, measurement: { ...perception.measurement, frames: [] } };
  const spec = { ...demoExperimentSpec, stimulus: { amplitude: perception.measurement.amplitude } };
  const evidence = createEvidencePayload({ run_id: recorder.run_id, researchQuestion: question, networkDefinition: syntheticDemoNetwork, experimentSpec: spec, perceptionInput: invalid });
  recorder.perception(invalid); recorder.spec(spec); recorder.measured(evidence);
  assert.equal(evidence.run_id, recorder.run_id);
  assert.equal(recorder.snapshot().manifest.validation?.derivedStimulusValid, false);
  assert.equal(recorder.snapshot().manifest.validation?.trackReturned, false);
});
