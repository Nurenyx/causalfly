import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { PerceptionPanel, PerceptionDetails, PerceptionSummary } from "./perception-panel";
import { EmbodiedExperiment } from "./embodied-experiment";
import { offlinePerceptionFixture } from "../../lib/perception/fixture";
import { demoExperimentSpec } from "../../lib/experiment/demo";
import { EvidenceView } from "./evidence-view";
import { createCompactEvidence } from "../../lib/meta/compact-evidence";
import { createEvidencePayload } from "../../lib/meta/evidence";
import { syntheticDemoNetwork } from "../../lib/experiment/network";
import { conceptForVideo, initialPerceptionSession } from "../../lib/web/perception-session";
import { WorkflowErrorNotice } from "./workflow-error-notice";
import { ResultValidity } from "./result-validity";

const f = offlinePerceptionFixture("offline-test");
const forbidden = () => { assert.fail("Rendering must never upload, analyze, approve, or execute"); };
test("synthetic is the reliable default; rendering never calls SAM or exposes a fake detection", () => {
  const html = renderToStaticMarkup(<PerceptionPanel hasDesign={false} busy={false} accepting={false} onBusy={forbidden} onUse={forbidden} />);
  assert.match(html, /aria-pressed="true">Synthetic stimulus/);
  assert.doesNotMatch(html, /OBJECT TRACKED|OFFLINE SAM FIXTURE|<video|sam-3\.1/);
});
test("offline perception is labelled, scoped to its own diagram, and requires an approved run", () => {
  const html = renderToStaticMarkup(<PerceptionPanel accepted={f} hasDesign busy={false} accepting={false} onBusy={forbidden} onUse={forbidden} />);
  for (const label of [/META SAM 3.1 — PERCEPTION/, /NO LIVE DETECTION/, /8.0% → 40.0%/, /0.640/, /STIMULUS READY/, /PERCEPTION DETAILS/]) assert.match(html, label);
  assert.doesNotMatch(html, /<video|<canvas/);
  const summary = renderToStaticMarkup(<><PerceptionSummary perception={f} /><PerceptionDetails perception={f} /></>);
  assert.match(summary, /Input provenance only/); assert.match(summary, /not causal evidence/);
});
test("retained perceive-first state has one enabled design action and collapses upload controls", () => {
  const session = { ...initialPerceptionSession(), source: "perception" as const, analysis: { ok: true as const, perception: f, receipt: "server-signed" } };
  const html = renderToStaticMarkup(<PerceptionPanel session={session} hasDesign={false} busy={false} accepting={false} onBusy={forbidden} onUse={forbidden} onDesign={forbidden} />);
  assert.match(html, /DESIGN EXPERIMENT WITH THIS STIMULUS/);
  assert.match(html, /Meta will design a controlled test using the measured stimulus/);
  assert.match(html, /CHANGE VIDEO/);
  assert.doesNotMatch(html, /type="file"|Analyze with SAM|disabled=""|<details[^>]* open/);
  assert.equal((html.match(/class="primary-button"/g) ?? []).length, 1);
  assert.match(html, /META DESIGNS TEST/); assert.match(html, /CAUSALFLY RUNS EXPERIMENT/);
});
test("existing design offers acceptance; pending design disables repeated requests inline", () => {
  const session = { ...initialPerceptionSession(), source: "perception" as const, analysis: { ok: true as const, perception: f } };
  const ready = renderToStaticMarkup(<PerceptionPanel session={session} hasDesign busy={false} accepting={false} onBusy={forbidden} onUse={forbidden} />);
  assert.match(ready, /USE AS EXPERIMENT STIMULUS/); assert.doesNotMatch(ready, /DESIGN EXPERIMENT WITH THIS STIMULUS/);
  const pending = renderToStaticMarkup(<PerceptionPanel session={session} hasDesign={false} busy designing accepting={false} onBusy={forbidden} onUse={forbidden} onDesign={forbidden} />);
  assert.match(pending, /disabled="" aria-busy="true"/); assert.match(pending, /META IS DESIGNING WITH THIS STIMULUS/);
});
test("calibration filename prefills its documented concept without overriding arbitrary-upload concepts", () => {
  assert.equal(conceptForVideo("perception-calibration.mp4", "hand"), "red square");
  assert.equal(conceptForVideo("my-hand.mov", "hand"), "hand");
  assert.equal(conceptForVideo("custom.mp4", "blue cup"), "blue cup");
});
test("viewport error notice is assertive, dismissible, and directs users to the source action", () => {
  const html = renderToStaticMarkup(<WorkflowErrorNotice failure={{ id: 1, summary: "Meta experiment design failed. Retry.", detail: "Offline injected error", target: "demo-question" }} onDismiss={forbidden} onLocate={forbidden} />);
  for (const value of [/role="alert"/, /aria-live="assertive"/, /Dismiss error notification/, /Show action &amp; recovery/, /Meta experiment design failed/]) assert.match(html, value);
});
test("software repeatability and biological validation are distinguished behind a short closed disclosure", () => {
  const html = renderToStaticMarkup(<ResultValidity />);
  assert.match(html, /DETERMINISTIC MODEL RESULT/); assert.match(html, /WHAT DOES THIS RESULT PROVE/);
  assert.match(html, /not a validated biological prediction/); assert.doesNotMatch(html, /<details open/);
});
test("accepted mapping locks manual strength and labels the embodied source without inventing recorded data", () => {
  const design = { id: "draft", researchQuestion: "test", mode: "FAKE META CLIENT" as const, spec: { ...demoExperimentSpec, stimulus: { amplitude: .64 } }, runtimeCalls: [], perceptionInput: f };
  const html = renderToStaticMarkup(<EmbodiedExperiment design={design} result={null} busy={false} strength={.64} onStrength={forbidden} onRun={forbidden} />);
  assert.match(html, /PERCEPTION SOURCE: OFFLINE SAM FIXTURE/);
  assert.match(html, /step="any"[^>]*disabled=""/);
  assert.match(html, /AWAITING APPROVED TEST/); assert.match(html, /Approve &amp; Run Experiment/);
  assert.doesNotMatch(html, /RECORDED ENGINE DATA/);
});
test("Evidence retains geometry, formula, media, and provenance separately from engine traces", () => {
  const c = createCompactEvidence(createEvidencePayload({ researchQuestion: "test", networkDefinition: syntheticDemoNetwork, experimentSpec: { ...demoExperimentSpec, stimulus: { amplitude: .64 } }, perceptionInput: f }));
  const html = renderToStaticMarkup(<EvidenceView result={{ researchQuestion: "test", mode: "FAKE META CLIENT", spec: c.experimentSpec, measuredEvidence: c.comparison, provenance: c.provenance, perceptionInput: f }} />);
  for (const label of [/INPUT PROVENANCE ONLY/, /DETERMINISTIC MEASUREMENT/, /box-expansion-v1/, /mediaSha256/, /centroidX/, /frameTimes/, /Matched condition provenance/]) assert.match(html, label);
});
