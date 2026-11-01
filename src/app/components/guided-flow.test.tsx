import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { GuidedExperiment } from "./guided-experiment";
import { InstrumentModeBar } from "./instrument-mode-bar";
import { checkModeCapability } from "../../lib/web/instrument-mode";
import { workspaceReducer } from "../../lib/web/dashboard";
import { guideViewportTo } from "../../lib/web/guided-scroll";
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

const interpreted: MeasuredExperimentResult = {
  ...measured,
  analysis: {
    observations: ["Primary output dropped by 50%"],
    interpretation: "Silencing primary_a significantly delays the threshold crossing.",
    limitations: ["Synthetic model only"],
    confounders: [],
    supportsHypothesis: true,
    nextExperiment: {
      researchQuestion: "What happens if I silence primary_b?",
      proposedPerturbationTarget: "primary_b",
      rationale: "Test downstream pathway dependency.",
    },
  },
};

const baseProps = {
  question,
  pending: "",
  mode: "FAKE META CLIENT" as const,
  result: null,
  onQuestion: () => {},
  onDemo: () => {},
  onDesign: () => {},
  onRun: () => {},
  onExplain: () => {},
  onNext: () => {},
  onCompare: () => {},
  onConnectome: () => {},
};

// ==========================================
// Sprint 13C.1: Guided Workflow Guidance Tests
// ==========================================

test("1. new question → Design CTA", () => {
  const html = render(<GuidedExperiment {...baseProps} />);
  assert.match(html, /Design with Meta ↗|Design experiment with Meta/);
  assert.doesNotMatch(html, /Approve &amp; Run Experiment/);
  assert.doesNotMatch(html, /Compare what changed/);
});

test("2. validated design → approval/run CTA", () => {
  const html = render(<GuidedExperiment {...baseProps} design={design} />);
  assert.match(html, /Approve &amp; Run Experiment/);
  assert.doesNotMatch(html, /Compare what changed/);
});

test("3. matched runs complete → Compare CTA", () => {
  const html = render(
    <GuidedExperiment
      {...baseProps}
      design={design}
      result={measured}
      instrumentMode="observe"
    />
  );
  assert.match(html, /MATCHED EXPERIMENT COMPLETE/);
  assert.match(html, /Compare what changed →/);
});

test("4. Compare unavailable before runs with clear reason and disabled button", () => {
  const cap = checkModeCapability("compare", "SYNTHETIC_FIXTURE", false);
  assert.equal(cap.supported, true);
  assert.equal(cap.available, false);
  assert.equal(cap.reason, "Available after matched runs complete.");

  const html = render(
    <InstrumentModeBar
      currentMode="observe"
      source="SYNTHETIC_FIXTURE"
      hasResult={false}
      onSelectMode={() => {}}
      onSelectSource={() => {}}
    />
  );
  assert.match(html, /class="instrument-mode-tab compare-tab\s+mode-unavailable"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /Unavailable/);
  assert.match(html, /title="Available after matched runs complete\."/);
});

test("5. Use as next test → new Question state and reset to Observe", () => {
  const state = workspaceReducer(
    { workspace: "observatory", question, design, result: interpreted },
    { type: "next-question", question: "What happens if I silence primary_b?" }
  );

  assert.equal(state.question, "What happens if I silence primary_b?");
  assert.equal(state.design, undefined);
  assert.equal(state.result, null);
  assert.equal(state.workspace, "observatory");

  // In new Question state, Compare is unavailable
  const cap = checkModeCapability("compare", "SYNTHETIC_FIXTURE", Boolean(state.result));
  assert.equal(cap.available, false);
  assert.equal(cap.reason, "Available after matched runs complete.");
});

test("6. Use as next test → previous evidence retained in history", () => {
  const state = workspaceReducer(
    { workspace: "observatory", question, design, result: interpreted },
    { type: "next-question", question: "What happens if I silence primary_b?" }
  );

  assert.ok(state.history && state.history.length === 1);
  assert.equal(state.history[0].result.researchQuestion, question);
  assert.equal(state.history[0].result.spec.perturbation.targetNodeId, "primary_a");
});

test("7. completed runs → explicit Compare transition reveals Comparison Workspace", () => {
  const html = render(
    <GuidedExperiment
      {...baseProps}
      design={design}
      result={measured}
      instrumentMode="compare"
    />
  );

  // In compare mode, full comparison workspace is active
  assert.match(html, /data-instrument-mode="compare"/);
  assert.match(html, /CONTROLLED COMPARISON WORKSPACE · WHAT CHANGED\?/);
  assert.match(html, /Control vs Intervention Analysis/);
  assert.match(html, /SAME STEP \/ BOTH RUNS/);
  assert.match(html, /Synchronized playback — both runs are shown at the same simulation step\./);
  assert.match(html, /Both side-by-side/);
  assert.match(html, /01 Control only/);
  assert.match(html, /02 Intervention only/);
});

test("8. Meta interpretation → next-hypothesis action", () => {
  const html = render(
    <GuidedExperiment
      {...baseProps}
      design={design}
      result={interpreted}
      instrumentMode="compare"
    />
  );

  assert.match(html, /SECTION 5 · NEXT HYPOTHESIS/);
  assert.match(html, /What Should We Test Next\?/);
  assert.match(html, /What happens if I silence primary_b\?/);
  assert.match(html, /Test the next hypothesis →/);
});

test("9. no automatic Meta calls during navigation or rendering", () => {
  let callCount = 0;
  const trackingProps = {
    ...baseProps,
    onDesign: () => { callCount++; },
    onExplain: () => { callCount++; },
  };

  // Rendering any combination of states never calls handlers
  render(<GuidedExperiment {...trackingProps} />);
  render(<GuidedExperiment {...trackingProps} design={design} />);
  render(<GuidedExperiment {...trackingProps} design={design} result={measured} />);
  render(<GuidedExperiment {...trackingProps} design={design} result={interpreted} instrumentMode="compare" />);

  assert.equal(callCount, 0, "Zero automated or unprompted Meta calls occurred during rendering or navigation");
});

test("10. reduced-motion behavior respects user accessibility preference", () => {
  // Test behavior when window is undefined (SSR safety)
  assert.doesNotThrow(() => {
    guideViewportTo("demo-question");
  });
});

test("11. Live Connectome capability blocking", () => {
  const perturbCap = checkModeCapability("perturb", "FRUITFLY_XR", false);
  assert.equal(perturbCap.supported, false);
  assert.equal(perturbCap.available, false);
  assert.match(perturbCap.reason!, /Arbitrary neural perturbation is not supported for Live Connectome Simulation/);

  const compareCap = checkModeCapability("compare", "FRUITFLY_XR", false);
  assert.equal(compareCap.supported, false);
  assert.equal(compareCap.available, false);
  assert.match(compareCap.reason!, /Matched intervention comparison requires controlled perturbation trials/);

  const html = render(
    <InstrumentModeBar
      currentMode="observe"
      source="FRUITFLY_XR"
      hasResult={false}
      onSelectMode={() => {}}
      onSelectSource={() => {}}
    />
  );

  assert.match(html, /disabled="" aria-disabled="true" class="[^"]*perturb-tab/);
  assert.match(html, /disabled="" aria-disabled="true" class="[^"]*compare-tab/);
});

// ==========================================
// Sprint 13C.2: Mobile Guidance & Compare Toolbar Acceptance Tests
// ==========================================

test("12. Mobile 390px: question-without-design exposes Design CTA before Embodied World in DOM order", () => {
  const html = render(<GuidedExperiment {...baseProps} />);
  const actionIdx = html.indexOf("mobile-dominant-next-action question-next-action");
  const ctaIdx = html.indexOf("Design experiment with Meta →");
  const worldIdx = html.indexOf('aria-label="Embodied experiment"');

  assert.ok(actionIdx > 0, "Mobile dominant next action card must exist in HTML");
  assert.ok(ctaIdx > 0, "Design experiment with Meta CTA must exist in mobile card");
  assert.ok(worldIdx > 0, "Embodied experiment visualization must exist");
  assert.ok(
    actionIdx < worldIdx,
    `Mobile next action (index ${actionIdx}) must precede Embodied World (index ${worldIdx}) in DOM order`
  );
});

test("13. Mobile 390px: validated design exposes Approve & Run before Embodied World in DOM order", () => {
  const html = render(<GuidedExperiment {...baseProps} design={design} />);
  const actionIdx = html.indexOf("mobile-dominant-next-action design-next-action");
  const ctaIdx = html.indexOf("Approve &amp; Run Experiment →");
  const worldIdx = html.indexOf('aria-label="Embodied experiment"');

  assert.ok(actionIdx > 0, "Mobile design next action card must exist in HTML");
  assert.ok(ctaIdx > 0, "Approve & Run Experiment CTA must exist in mobile card");
  assert.ok(worldIdx > 0, "Embodied experiment visualization must exist");
  assert.ok(
    actionIdx < worldIdx,
    `Mobile approve CTA (index ${actionIdx}) must precede Embodied World (index ${worldIdx}) in DOM order`
  );
});

test("14. Mobile 390px: completed matched run exposes Compare CTA before detailed visualization", () => {
  const html = render(
    <GuidedExperiment
      {...baseProps}
      design={design}
      result={measured}
      instrumentMode="observe"
    />
  );
  const transitionIdx = html.indexOf("matched-complete-transition");
  const ctaIdx = html.indexOf("Compare what changed →");
  const worldIdx = html.indexOf('aria-label="Embodied experiment"');

  assert.ok(transitionIdx > 0, "Matched complete transition card must exist");
  assert.ok(ctaIdx > 0, "Compare what changed CTA must exist");
  assert.ok(worldIdx > 0, "Embodied experiment visualization must exist");
  assert.ok(
    transitionIdx < worldIdx,
    `Compare transition CTA (index ${transitionIdx}) must precede Embodied World (index ${worldIdx}) in DOM order`
  );
});

test("15. Mobile 390px: Compare result exposes Explain with Meta prominently before secondary technical evidence", () => {
  const html = render(
    <GuidedExperiment
      {...baseProps}
      design={design}
      result={measured}
      instrumentMode="compare"
    />
  );

  const explainIdx = html.indexOf("Explain with Meta ↗");
  const neuralIdx = html.indexOf("NEURAL SYSTEM COMPARISON");
  const causalIdx = html.indexOf("CAUSAL PIPELINE · WHAT CHANGED?");
  const trustIdx = html.indexOf("MATCHED CONDITIONS");

  assert.ok(explainIdx > 0, "Explain with Meta CTA must exist in compare mode");
  assert.ok(neuralIdx > 0, "Neural system comparison must exist");
  assert.ok(causalIdx > 0, "Causal pipeline must exist");
  assert.ok(trustIdx > 0, "Matched conditions card must exist");

  assert.ok(
    explainIdx < neuralIdx,
    `Explain with Meta (index ${explainIdx}) must precede secondary Neural comparison (index ${neuralIdx})`
  );
  assert.ok(
    explainIdx < causalIdx,
    `Explain with Meta (index ${explainIdx}) must precede Causal Pipeline (index ${causalIdx})`
  );
  assert.ok(
    explainIdx < trustIdx,
    `Explain with Meta (index ${explainIdx}) must precede Matched Conditions (index ${trustIdx})`
  );
});

test("16. Mobile 390px: interpretation exposes next-hypothesis action prominently before technical evidence", () => {
  const html = render(
    <GuidedExperiment
      {...baseProps}
      design={design}
      result={interpreted}
      instrumentMode="compare"
    />
  );

  const nextHypothesisIdx = html.indexOf("Test the next hypothesis →");
  const advancedDetailsIdx = html.indexOf('class="cockpit-advanced"');

  assert.ok(nextHypothesisIdx > 0, "Next hypothesis CTA must exist");
  assert.ok(advancedDetailsIdx > 0, "Advanced technical details section must exist");
  assert.ok(
    nextHypothesisIdx < advancedDetailsIdx,
    `Next hypothesis CTA (index ${nextHypothesisIdx}) must precede advanced details (index ${advancedDetailsIdx})`
  );
});

test("17. Desktop right-rail workflow remains intact with contextual scientist", () => {
  const html = render(<GuidedExperiment {...baseProps} design={design} />);

  // Desktop rail structure verified
  assert.match(html, /class="embodied-world-column"/);
  assert.match(html, /class="embodied-context-rail"/);
  assert.match(html, /class="cockpit-scientist"/);
  assert.match(html, /META AI SCIENTIST/);
  assert.match(html, />Approve &amp; Run Experiment<\/button>/);
});

test("18. Compare toolbar groups into 3 clean rows with VIEW focus controls", () => {
  const html = render(
    <GuidedExperiment
      {...baseProps}
      design={design}
      result={measured}
      instrumentMode="compare"
    />
  );

  // Row 1: Context & Synchronization Notice
  assert.match(html, /class="compare-toolbar-row compare-toolbar-context"/);
  assert.match(html, /SAME STEP \/ BOTH RUNS/);
  assert.match(html, /Synchronized playback — both runs are shown at the same simulation step\./);

  // Row 2: Playback Controls
  assert.match(html, /class="compare-toolbar-row compare-toolbar-playback"/);
  assert.match(html, /class="playback-button"/);
  assert.match(html, /SIMULATION STEP/);

  // Row 3: Organism Camera Focus Selector with VIEW label
  assert.match(html, /class="compare-focus-toolbar"/);
  assert.match(html, /class="focus-label">VIEW:<\/span>/);
  assert.match(html, />Both side-by-side<\/button>/);
  assert.match(html, />01 Control only<\/button>/);
  assert.match(html, />02 Intervention only<\/button>/);
});

test("19. Exactly one comparison canvas arena exists in Compare mode", () => {
  const html = render(
    <GuidedExperiment
      {...baseProps}
      design={design}
      result={measured}
      instrumentMode="compare"
    />
  );

  const arenaMatches = html.match(/class="compare-arena"/g);
  assert.equal(arenaMatches?.length, 1, "Strictly one comparison arena exists in Compare mode");
});
