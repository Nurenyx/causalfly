import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { EmbodiedExperiment } from "./embodied-experiment";
import { CockpitReadouts } from "./research-cockpit";
import { AutonomyEngine } from "../../lib/web/autonomy";
import { AutonomyPanel } from "./autonomy-panel";
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
// 1. Organism-First Hierarchy & Dominance Tests
// ==========================================
test("EmbodiedExperiment renders organism-first workspace shell with dominant Embodied World", () => {
  const html = render(
    <EmbodiedExperiment
      result={null}
      busy={false}
      strength={0.85}
      onStrength={() => {}}
      onRun={() => {}}
      scientist={<aside id="test-scientist">MOCK SCIENTIST RAIL</aside>}
    />
  );

  // Checks organism-first workspace class
  assert.match(html, /organism-first-workspace/);
  assert.match(html, /class="embodied-world-column"/);
  assert.match(html, /class="embodied-context-rail"/);

  // Document order verification: Embodied World -> Context Rail -> Neural Signals
  const worldIdx = html.indexOf('class="embodied-world-column"');
  const railIdx = html.indexOf('class="embodied-context-rail"');
  const signalsIdx = html.indexOf('class="embodied-signals"');

  assert.ok(worldIdx !== -1, "Embodied world exists");
  assert.ok(railIdx !== -1, "Context rail exists");
  assert.ok(signalsIdx !== -1, "Signals deck exists");
  assert.ok(worldIdx < railIdx, "Embodied world leads context rail");
  assert.ok(railIdx < signalsIdx, "Context rail leads neural signals deck");
});

test("Behaviour is prominently displayed with runtime state and motor execution", () => {
  const engine = new AutonomyEngine({ source: "synthetic", mode: "exploration" });
  engine.advance(0.1, () => null);
  const frame = engine.frame;

  assert.ok(frame !== null);
  assert.ok(["IDLE", "WALK", "TURN_LEFT", "TURN_RIGHT", "AVOID", "ESCAPE"].includes(frame.decision.state));

  const html = render(<AutonomyPanel />);
  assert.match(html, /class="autonomy-readout"/);
  assert.match(html, /class="readout-behaviour-card"/);
  assert.match(html, /class="readout-label">BEHAVIOUR<\/span>/);
  assert.match(html, /class="readout-source-card"/);
  assert.match(html, /class="readout-motor-card"/);
  assert.match(html, /CausalFly procedural controller/);
});

test("Recorded signal view displays recorded behaviour chip with outcome and condition", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      busy={false}
      strength={1.0}
      onStrength={() => {}}
      onRun={() => {}}
    />
  );

  // Contains recorded condition options
  assert.match(html, /Recorded signal view/);
  assert.match(html, /class="embodied-signals"/);
});

// ==========================================
// 2. Contextual Right Rail & Perturb Mode
// ==========================================
test("Perturb mode activates intervention inspector and contextual highlights in right rail", () => {
  const html = render(
    <EmbodiedExperiment
      result={measured}
      busy={false}
      strength={1.0}
      instrumentMode="perturb"
      onStrength={() => {}}
      onRun={() => {}}
      scientist={<aside>SCIENTIST ACTION</aside>}
    />
  );

  assert.match(html, /data-instrument-mode="perturb"/);
  assert.match(html, /INTERVENTION INSPECTOR/);
  assert.match(html, /Controlled Perturbation/);
  assert.match(html, /TARGET PATHWAY/);
  assert.match(html, /Same input · only one pathway changes/);
});

test("Observe mode activates observation context in right rail", () => {
  const html = render(
    <EmbodiedExperiment
      result={null}
      busy={false}
      strength={1.0}
      instrumentMode="observe"
      onStrength={() => {}}
      onRun={() => {}}
      scientist={<aside>SCIENTIST ACTION</aside>}
    />
  );

  assert.match(html, /data-instrument-mode="observe"/);
  assert.match(html, /EXPERIMENT CONTEXT/);
  assert.match(html, /Sensory Input &amp; Observation/);
});

// ==========================================
// 3. Causal Pipeline Preparation Tests
// ==========================================
test("CockpitReadouts renders Causal Pipeline with 4 truthful stages without fabricated stats", () => {
  const html = render(
    <CockpitReadouts
      result={measured}
      design={design}
      perceived={false}
    />
  );

  assert.match(html, /class="causal-pipeline"/);
  assert.match(html, /CAUSAL PIPELINE/);
  assert.match(html, /ENGINE MEASURED TRIAL AVERAGE/);

  // Stage 1: Stimulus
  assert.match(html, /class="causal-stage stimulus-stage"/);
  assert.match(html, /STIMULUS/);
  assert.match(html, /Amplitude: 1.000/);

  // Stage 2: Neural Response
  assert.match(html, /class="causal-stage neural-stage"/);
  assert.match(html, /NEURAL RESPONSE/);

  // Stage 3: Decision
  assert.match(html, /class="causal-stage decision-stage"/);
  assert.match(html, /DECISION/);

  // Stage 4: Motor Output
  assert.match(html, /class="causal-stage motor-stage"/);
  assert.match(html, /MOTOR OUTPUT/);
  assert.match(html, /Procedural controller/);

  // Ensure no fabricated statistics are present
  assert.doesNotMatch(html, /Cohen's d/i);
  assert.doesNotMatch(html, /p-value/i);
  assert.doesNotMatch(html, /95% CI/i);
  assert.doesNotMatch(html, /confidence interval/i);
});

test("Awaiting experiment state renders projected causal pipeline cleanly", () => {
  const html = render(
    <CockpitReadouts
      result={null}
      design={undefined}
      perceived={false}
    />
  );

  assert.match(html, /class="causal-pipeline"/);
  assert.match(html, /EXPERIMENTAL CAUSAL FLOW/);
  assert.match(html, /Step 0 Pulse/);
  assert.match(html, /Intact Circuit/);
  assert.match(html, /Threshold Gate/);
  assert.match(html, /Grounded Locomotion/);
});
