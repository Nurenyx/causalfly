import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { demoExperimentSpec } from "../../lib/experiment/demo";
import { syntheticDemoNetwork } from "../../lib/experiment/network";
import { createEvidencePayload } from "../../lib/meta/evidence";
import { createCompactEvidence } from "../../lib/meta/compact-evidence";
import { SyntheticNetworkViz } from "./synthetic-network-viz";

function trials(amplitude = 1) {
  return createCompactEvidence(createEvidencePayload({ researchQuestion: "Recorded visual causality", networkDefinition: syntheticDemoNetwork, experimentSpec: { ...demoExperimentSpec, stimulus: { amplitude } } })).comparison;
}

test("visual playback preserves every recorded node value and never lights a silenced edge", () => {
  const evidence = trials();
  const before = JSON.stringify(evidence);
  for (const trial of [evidence.control, evidence.perturbed]) {
    for (const sample of trial.activity) {
      const html = renderToStaticMarkup(<SyntheticNetworkViz trial={trial} step={sample.step} />);
      for (const [id, value] of Object.entries(sample.nodes)) {
        assert.ok(html.includes(`data-node="${id}" data-activity="${value}"`), `${id} at step ${sample.step}`);
      }
      if (trial.condition === "PERTURBED") {
        assert.match(html, /data-edge="stimulus-primary_a" data-drive="0" data-trail="0"/);
        assert.match(html, /data-edge="primary_a-primary_b" data-drive="0" data-trail="0"/);
      }
    }
  }
  assert.equal(JSON.stringify(evidence), before);
});

test("the primary output arrives at step 3, and the surviving alternate output at step 4", () => {
  const { control, perturbed } = trials();
  const control3 = renderToStaticMarkup(<SyntheticNetworkViz trial={control} step={3} />);
  const intervention3 = renderToStaticMarkup(<SyntheticNetworkViz trial={perturbed} step={3} />);
  const intervention4 = renderToStaticMarkup(<SyntheticNetworkViz trial={perturbed} step={4} />);
  assert.match(control3, /data-edge="primary_b-motor" data-drive="1"/);
  assert.match(control3, /data-node="motor" data-activity="1"/);
  assert.match(intervention3, /data-edge="primary_b-motor" data-drive="0"/);
  assert.match(intervention3, /data-node="motor" data-activity="0"/);
  assert.match(intervention4, /data-edge="alternate_c-motor" data-drive="0.5"/);
  assert.match(intervention4, /data-node="motor" data-activity="0.5"/);
  assert.match(intervention4, /not measured edge flow/);
});

test("zero input and missing consecutive samples produce no invented glow", () => {
  const zero = trials(0);
  for (const trial of [zero.control, zero.perturbed]) {
    for (const { step } of trial.activity) {
      const html = renderToStaticMarkup(<SyntheticNetworkViz trial={trial} step={step} />);
      assert.doesNotMatch(html, /data-drive="(?!0")|class="node-trail"/);
    }
  }
  const { control } = trials();
  const missingPrior = { ...control, activity: control.activity.filter(sample => sample.step !== 2) };
  const html = renderToStaticMarkup(<SyntheticNetworkViz trial={missingPrior} step={3} />);
  assert.match(html, /data-node="motor" data-activity="1"/);
  assert.match(html, /data-edge="primary_b-motor" data-drive="0" data-trail="0"/);
  const missingCurrent = renderToStaticMarkup(<SyntheticNetworkViz trial={missingPrior} step={2} />);
  assert.match(missingCurrent, /No retained sample at this step/);
  assert.doesNotMatch(missingCurrent, /data-drive="(?!0")/);
});
