import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GuidedExperiment } from "./guided-experiment";
import { DesignReview } from "./guided-workflow";
import { demoExperimentSpec } from "../../lib/experiment/demo";
import { syntheticDemoNetwork } from "../../lib/experiment/network";
import { createEvidencePayload } from "../../lib/meta/evidence";
import { createCompactEvidence } from "../../lib/meta/compact-evidence";
import { FakeMetaClient } from "../../lib/meta/fake-client";
import type { GuidedDesign, MeasuredExperimentResult } from "../../lib/web/contracts";
import { workspaceReducer } from "../../lib/web/dashboard";

const question = "What happens if I silence the primary pathway?";
const compact = createCompactEvidence(createEvidencePayload({ researchQuestion: question, networkDefinition: syntheticDemoNetwork, experimentSpec: demoExperimentSpec }));
const design: GuidedDesign = { id: "review-design", researchQuestion: question, mode: "FAKE META CLIENT", spec: compact.experimentSpec, runtimeCalls: [] };
const measured: MeasuredExperimentResult = { researchQuestion: question, mode: design.mode, spec: design.spec, measuredEvidence: compact.comparison, provenance: compact.provenance };
const forbidden = () => { assert.fail("Rendering a workflow must not submit or navigate"); };
const props = { question, pending: "", mode: "FAKE META CLIENT" as const, result: null, onQuestion: forbidden, onDemo: forbidden, onDesign: forbidden, onRun: forbidden, onExplain: forbidden, onNext: forbidden, onCompare: forbidden, onConnectome: forbidden };

test("initial story offers demo and own-question paths without measured or AI findings", () => {
  const html = renderToStaticMarkup(<GuidedExperiment {...props} />);
  for (const text of [/Ask what changes a nervous system/, /Embodied experiment/, /Visual embodiment of synthetic output/, /AWAITING APPROVED TEST/, /Ask Your Own Question/, /Design with Meta/, /Explore a real connectome simulation/, /OFFLINE DEMO/]) assert.match(html, text);
  assert.doesNotMatch(html, /Signal reduced|MEASURED BY CAUSALFLY|Approve &amp; Run Experiment|Explain with Meta/);
});

test("validated proposal presents approval while measurements remain unavailable", () => {
  const html = renderToStaticMarkup(<GuidedExperiment {...props} design={design} />);
  assert.match(html, /OFFLINE DESIGN TEMPLATE/);
  assert.match(html, /Approve &amp; Run Experiment/);
  assert.match(html, /Review hypothesis, target &amp; all test settings/);
  assert.equal((html.match(/data-complete="true"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Signal reduced|MEASURED BY CAUSALFLY/);
});

test("measured result and explanation action coexist with real recorded comparison", () => {
  const before = JSON.stringify(measured);
  const html = renderToStaticMarkup(<GuidedExperiment {...props} design={design} result={measured} />);
  for (const text of [/Signal reduced 50%/, /Step 3/, /Step 4/, /Unchanged/, /MEASURED BY CAUSALFLY/, /Explain with Meta/, /Play recorded activity/, /View detailed comparison/, /Inspect provenance &amp; raw evidence/, /Show how we measured this/]) assert.match(html, text);
  assert.doesNotMatch(html, /INTERPRETED BY META AI/);
  assert.match(html, /Threshold still reached/);
  assert.match(html, /Silencing one pathway weakened the signal and made it arrive later\./);
  for (const label of ["View detailed comparison", "View full analysis", "Inspect provenance &amp; raw evidence"]) assert.ok(html.includes(`<summary>${label}</summary>`));
  assert.equal(JSON.stringify(measured), before);
});

test("each initiating Meta control carries a spinner, accessible status and duplicate protection", () => {
  const designing = renderToStaticMarkup(<GuidedExperiment {...props} pending="design" />);
  const controls = designing.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
  const designControls = controls.filter(button => button.includes("META IS DESIGNING YOUR TEST..."));
  assert.equal(designControls.length, 1);
  const explaining = renderToStaticMarkup(<GuidedExperiment {...props} design={design} result={measured} pending="interpret" />);
  const explainControl = explaining.match(/<button\b[^>]*>[\s\S]*?<\/button>/g)?.find(button => button.includes("META IS EXPLAINING YOUR EVIDENCE..."));
  assert.ok(explainControl);
  for (const control of [...designControls, explainControl]) {
    for (const attribute of ['disabled=""', 'aria-busy="true"', 'class="spinner"', 'role="status"', 'aria-live="polite"']) assert.ok(control.includes(attribute), attribute);
  }
  assert.doesNotMatch(designing + explaining, /class="demo-request"/);
});

test("explanation and proposal stay on Experiment; a follow-up preserves earlier measurements", async () => {
  const fake = new FakeMetaClient();
  const analysis = JSON.parse(await fake.complete({ task: "interpret", system: "", inputJson: JSON.stringify(compact), responseSchema: {} }));
  const result = { ...measured, analysis };
  const state = workspaceReducer({ workspace: "observatory", question, design, result: measured }, { type: "interpreted", result, workspace: "observatory" });
  assert.equal(state.workspace, "observatory");
  assert.equal(state.result?.measuredEvidence, measured.measuredEvidence);
  const html = renderToStaticMarkup(<GuidedExperiment {...props} design={design} result={result} />);
  for (const text of [/What changed/, /Why it matters/, /What should we test next/, /Use as Next Question/, /OFFLINE AI TEMPLATE/, /Limitations &amp; alternative explanations/]) assert.match(html, text);
  assert.doesNotMatch(html, /INTERPRETED WITH META MUSE|NEXT TEST PROPOSED BY META MUSE/);
  assert.equal((html.match(/data-complete="true"/g) ?? []).length, 4);
  const next = workspaceReducer(state, { type: "next-question", question: analysis.nextExperiment.researchQuestion });
  const nextHtml = renderToStaticMarkup(<GuidedExperiment {...props} question={next.question} design={next.design} result={next.result} />);
  assert.match(nextHtml, /PREVIOUS TEST RETAINED/);
  assert.doesNotMatch(nextHtml, /Signal reduced 50%/);
  assert.equal(next.result, state.result);
  const run = workspaceReducer({ ...state, result: null }, { type: "completed", result: measured, workspace: "observatory" });
  assert.equal(run.workspace, "observatory");
});

test("live responses attribute design, interpretation and proposal separately from measurement", async () => {
  const analysis = JSON.parse(await new FakeMetaClient().complete({ task: "interpret", system: "", inputJson: JSON.stringify(compact), responseSchema: {} }));
  const liveDesign = { ...design, mode: "META LIVE" as const };
  const proposed = renderToStaticMarkup(<GuidedExperiment {...props} mode="META LIVE" design={liveDesign} />);
  assert.match(proposed, /DESIGNED WITH META MUSE/);
  assert.doesNotMatch(proposed, /MEASURED BY CAUSALFLY/);
  const html = renderToStaticMarkup(<GuidedExperiment {...props} mode="META LIVE" design={liveDesign} result={{ ...measured, mode: "META LIVE", analysis }} />);
  for (const text of [/MEASURED BY CAUSALFLY/, /INTERPRETED WITH META MUSE/, /NEXT TEST PROPOSED BY META MUSE/, /Meta interpretation · not a measurement/, /requires a new design and your approval/]) assert.match(html, text);
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:=|>)/);
});

test("hero starts with one recorded condition and requires explicit approval for stimulus changes", () => {
  const html = renderToStaticMarkup(<GuidedExperiment {...props} design={design} result={measured} />);
  assert.match(html, /data-comparing="false"/);
  assert.match(html, /One fly\. Two controlled runs\./);
  assert.match(html, /STIMULUS STRENGTH/);
  assert.match(html, /id="stimulus-strength"[^>]*min="0"[^>]*max="1"[^>]*step="0.05"/);
  assert.match(html, /Compare runs/);
  assert.match(html, /PLAYBACK: CONTROL → INTERVENTION/);
  assert.equal((html.match(/class="embodied-signal control"/g) ?? []).length, 1);
  assert.equal((html.match(/class="embodied-signal perturbed"/g) ?? []).length, 0);
  assert.doesNotMatch(html, /Add Fly/);
  assert.match(html, />Replay<\/button>/);
  assert.match(html, />Reset<\/button>/);
});

test("expanded approval settings show the selected amplitude and distinguish it from Meta's proposal", () => {
  const html = renderToStaticMarkup(<DesignReview design={design} stimulusAmplitude={.6} busy={false} onRun={forbidden} />);
  assert.match(html, /<dt>Stimulus amplitude<\/dt><dd>0\.6<\/dd>/);
  assert.match(html, /selected by you/);
  assert.equal(design.spec.stimulus.amplitude, 1);
});
