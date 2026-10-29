import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GuidedExperiment } from "./guided-experiment";
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
const props = { question, pending: "", mode: "FAKE META CLIENT" as const, result: null, onQuestion: forbidden, onDemo: forbidden, onDesign: forbidden, onRun: forbidden, onExplain: forbidden, onNext: forbidden, onCompare: forbidden, onAnalysis: forbidden, onEvidence: forbidden, onConnectome: forbidden };

test("initial story offers demo and own-question paths without measured or AI findings", () => {
  const html = renderToStaticMarkup(<GuidedExperiment {...props} />);
  for (const text of [/Discover what changes/, /Run Demo Experiment/, /Ask Your Own Question/, /Design with Meta/, /Explore a real connectome simulation/, /OFFLINE DEMO/]) assert.match(html, text);
  assert.doesNotMatch(html, /Signal reduced|MEASURED BY CAUSALFLY|Approve &amp; Run Experiment|Explain with Meta/);
});

test("validated proposal presents approval while measurements remain unavailable", () => {
  const html = renderToStaticMarkup(<GuidedExperiment {...props} design={design} />);
  assert.match(html, /META AI — EXPERIMENT DESIGN/);
  assert.match(html, /Approve &amp; Run Experiment/);
  assert.match(html, /Review hypothesis, target &amp; all test settings/);
  assert.equal((html.match(/data-complete="true"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Signal reduced|MEASURED BY CAUSALFLY/);
});

test("measured result and explanation action coexist with real recorded comparison", () => {
  const before = JSON.stringify(measured);
  const html = renderToStaticMarkup(<GuidedExperiment {...props} design={design} result={measured} />);
  for (const text of [/Signal reduced 50%/, /Step 3/, /Step 4/, /Unchanged/, /MEASURED BY CAUSALFLY/, /Explain with Meta/, /Play recorded activity/, /View detailed comparison/, /Inspect raw evidence/]) assert.match(html, text);
  assert.doesNotMatch(html, /INTERPRETED BY META AI/);
  assert.equal(JSON.stringify(measured), before);
});

test("explanation and proposal stay on Experiment; a follow-up preserves earlier measurements", async () => {
  const fake = new FakeMetaClient();
  const analysis = JSON.parse(await fake.complete({ task: "interpret", system: "", inputJson: JSON.stringify(compact), responseSchema: {} }));
  const result = { ...measured, analysis };
  const state = workspaceReducer({ workspace: "observatory", question, design, result: measured }, { type: "interpreted", result, workspace: "observatory" });
  assert.equal(state.workspace, "observatory");
  assert.equal(state.result?.measuredEvidence, measured.measuredEvidence);
  const html = renderToStaticMarkup(<GuidedExperiment {...props} design={design} result={result} />);
  for (const text of [/What changed/, /Why it matters/, /Meta proposes the next test/, /Use as Next Question/, /OFFLINE AI TEMPLATE/]) assert.match(html, text);
  assert.equal((html.match(/data-complete="true"/g) ?? []).length, 4);
  const next = workspaceReducer(state, { type: "next-question", question: analysis.nextExperiment.researchQuestion });
  const nextHtml = renderToStaticMarkup(<GuidedExperiment {...props} question={next.question} design={next.design} result={next.result} />);
  assert.match(nextHtml, /PREVIOUS TEST RETAINED/);
  assert.doesNotMatch(nextHtml, /Signal reduced 50%/);
  assert.equal(next.result, state.result);
  const run = workspaceReducer({ ...state, result: null }, { type: "completed", result: measured, workspace: "observatory" });
  assert.equal(run.workspace, "observatory");
});
