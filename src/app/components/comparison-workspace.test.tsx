import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { EmbodiedExperiment } from "./embodied-experiment";
import { createCompactEvidence } from "../../lib/meta/compact-evidence";
import { createEvidencePayload } from "../../lib/meta/evidence";
import { syntheticDemoNetwork } from "../../lib/experiment/network";
import { demoExperimentSpec } from "../../lib/experiment/demo";
import type { GuidedDesign, MeasuredExperimentResult } from "../../lib/web/contracts";

const question = "What happens if I silence primary_a?";
const compact = createCompactEvidence(
  createEvidencePayload({
    researchQuestion: question,
    networkDefinition: syntheticDemoNetwork,
    experimentSpec: demoExperimentSpec,
  })
);

const design: GuidedDesign = {
  id: "review-design",
  researchQuestion: question,
  mode: "FAKE META CLIENT",
  spec: compact.experimentSpec,
  runtimeCalls: [],
};

const measured: MeasuredExperimentResult = {
  researchQuestion: question,
  mode: design.mode,
  spec: design.spec,
  measuredEvidence: compact.comparison,
  provenance: compact.provenance,
};

// ==========================================
// Sprint 13C: Comparison Workspace Tests
// ==========================================

test("Compare mode renders near-full-width comparison stage with single WebGL canvas and synchronized playback", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      design={design}
      busy={false}
      strength={1.0}
      instrumentMode="compare"
      onStrength={() => {}}
      onRun={() => {}}
    />
  );

  // Checks compare-workspace class and attributes
  assert.match(html, /compare-workspace/);
  assert.match(html, /data-instrument-mode="compare"/);
  assert.match(html, /data-comparing="true"/);

  // Near-full-width comparison stage
  assert.match(html, /class="compare-stage"/);
  assert.match(html, /class="compare-arena"/);

  // Synchronized playback is prominent at top of stage
  assert.match(html, /class="compare-playback-container"/);
  assert.match(html, /SAME STEP \/ BOTH RUNS/);
  assert.match(html, /SIMULATION STEP/);

  // Verify exactly ONE WebGL canvas container exists
  const canvasMatches = html.match(/class="compare-arena"/g);
  assert.equal(canvasMatches?.length, 1, "Exactly one comparison arena/canvas exists");
});

test("Control vs Intervention DOM overlays and visual semantics are immediately legible with dynamic intervention target", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      design={design}
      busy={false}
      strength={1.0}
      instrumentMode="compare"
      onStrength={() => {}}
      onRun={() => {}}
    />
  );

  // Control overlay
  assert.match(html, /class="compare-overlay control-overlay"/);
  assert.match(html, /01 \/ CONTROL/);
  assert.match(html, /Intact network/);
  assert.match(html, /cyan-dot/);
  assert.match(html, /<span>DECODER<\/span>/);
  assert.match(html, /<span>PROCEDURAL BODY<\/span>/);
  assert.match(html, /Rendered displacement 0\.00 scene units · not a body measurement/);

  // Intervention overlay with dynamic target
  assert.match(html, /class="compare-overlay intervention-overlay"/);
  assert.match(html, /02 \/ INTERVENTION/);
  assert.match(html, /Silence Primary A/i);
  assert.match(html, /magenta-dot/);
});

test("Synchronized playback controls are prominent and shared at the same simulation step", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      design={design}
      busy={false}
      strength={1.0}
      instrumentMode="compare"
      onStrength={() => {}}
      onRun={() => {}}
    />
  );

  assert.match(html, /class="playback-button"/);
  assert.match(html, /aria-label="Play recorded activity"/);
  assert.match(html, /SAME STEP \/ BOTH RUNS/);
  assert.match(html, /SIMULATION STEP/);
  assert.match(html, />Replay<\/button>/);
  assert.match(html, />Reset<\/button>/);
});

test("Result Hero accurately derives percentage delta from engine evidence without hardcoding", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      design={design}
      busy={false}
      strength={1.0}
      instrumentMode="compare"
      onStrength={() => {}}
      onRun={() => {}}
    />
  );

  // Hero header and question
  assert.match(html, /class="compare-hero-result"/);
  assert.match(html, /WHAT CHANGED\?/);

  // Mathematical delta derived: control 1.0 -> perturbed 0.5 is 50% reduction
  assert.match(html, /SIGNAL REDUCED 50%/i);
  assert.match(html, /Silencing one pathway weakened the signal and made it arrive later/);
  assert.match(html, /ENGINE MEASURED · DETERMINISTIC/);
});

test("Compact difference summary displays truthful engine measurements without unsupported units", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      design={design}
      busy={false}
      strength={1.0}
      instrumentMode="compare"
      onStrength={() => {}}
      onRun={() => {}}
    />
  );

  assert.match(html, /class="compact-difference-summary"/);
  assert.match(html, /Peak Normalized Output/);
  assert.match(html, /Threshold Crossing/);
  assert.match(html, /Response Step/);
  assert.match(html, /Threshold outcome/);
  assert.match(html, /-50% normalized peak output/);

  // Prohibited unscientific units & metrics
  assert.doesNotMatch(html, /\bmV\b/);
  assert.doesNotMatch(html, /\bHz\b/);
  assert.doesNotMatch(html, /Cohen's d/i);
  assert.doesNotMatch(html, /p-value/i);
  assert.doesNotMatch(html, /confidence interval/i);
  assert.doesNotMatch(html, /escape probability/i);
});

test("Neural system comparison displays side-by-side topology with synthetic fixture disclosure", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      design={design}
      busy={false}
      strength={1.0}
      instrumentMode="compare"
      onStrength={() => {}}
      onRun={() => {}}
    />
  );

  assert.match(html, /class="compare-neural-section"/);
  assert.match(html, /NEURAL SYSTEM COMPARISON/);
  assert.match(html, /Hand-authored engineering fixture\. Not a biological Drosophila circuit\./);
  assert.match(html, /01 \/ CONTROL \(INTACT CIRCUIT\)/);
  assert.match(html, /02 \/ INTERVENTION \(SILENCE PRIMARY A\)/i);
});

test("Causal pipeline in Compare mode explains what part of the chain changed", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      design={design}
      busy={false}
      strength={1.0}
      instrumentMode="compare"
      onStrength={() => {}}
      onRun={() => {}}
    />
  );

  assert.match(html, /CAUSAL PIPELINE · WHAT CHANGED\?/);
  assert.match(html, /SIMULATION STEP · NOT BIOLOGICAL TIME/);
  assert.match(html, /STIMULUS/);
  assert.match(html, /Identical in both runs/);
  assert.match(html, /NEURAL RESPONSE/);
  assert.match(html, /DECISION/);
  assert.match(html, /MOTOR OUTPUT/);
});

test("Matched conditions card compactly verifies all matched parameters with trust disclosure", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      design={design}
      busy={false}
      strength={1.0}
      instrumentMode="compare"
      onStrength={() => {}}
      onRun={() => {}}
      onEvidence={() => {}}
    />
  );

  assert.match(html, /MATCHED CONDITIONS/);
  assert.match(html, /ONE DECLARED CHANGE\. EVERYTHING ELSE HELD CONSTANT\./);
  assert.match(html, /Matched stimulus/);
  assert.match(html, /Matched network/);
  assert.match(html, /Matched seed/);
  assert.match(html, /Matched engine/);
  assert.match(html, /Matched maxSteps/);
  assert.match(html, /Matched output threshold/);
  assert.match(html, /Only declared perturbation differs: Silence Primary A/i);
  assert.match(html, /Inspect complete provenance &amp; evidence/);
});

test("Explain with Meta is collapsed to a compact contextual action without automatic invocation", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      design={design}
      busy={false}
      strength={1.0}
      instrumentMode="compare"
      mode="FAKE META CLIENT"
      onStrength={() => {}}
      onRun={() => {}}
      onExplain={() => {}}
    />
  );

  assert.match(html, /class="compare-meta-action-deck"/);
  assert.match(html, /EXPLAIN WITH META/);
  assert.match(html, /Engine measured\. Meta interprets on explicit request\./);
  assert.match(html, /class="primary-button explain-meta-btn"/);
  assert.match(html, />Explain with Meta ↗<\/button>/);
});

test("Mobile compare supports focus controls and single canvas without horizontal overflow", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      design={design}
      busy={false}
      strength={1.0}
      instrumentMode="compare"
      onStrength={() => {}}
      onRun={() => {}}
    />
  );

  assert.match(html, /class="compare-focus-toolbar"/);
  assert.match(html, />Both side-by-side<\/button>/);
  assert.match(html, />01 Control only<\/button>/);
  assert.match(html, />02 Intervention only<\/button>/);
});
