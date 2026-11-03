import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { runTrial } from "../../lib/experiment/engine";
import { compareTrials } from "../../lib/experiment/compare";
import { syntheticDemoNetwork } from "../../lib/experiment/network";
import { demoExperimentSpec } from "../../lib/experiment/demo";
import { decodeFixtureOutput, experimentTypeOf, isStimulusResponse, trialAmplitude } from "../../lib/experiment/semantics";
import { createEvidencePayload } from "../../lib/meta/evidence";
import { createCompactEvidence } from "../../lib/meta/compact-evidence";
import { recordedMotorFrame, recordedMotorTrail } from "../../lib/web/embodiment";
import { workspaceReducer } from "../../lib/web/dashboard";
import { ResearchQuestion } from "./research-question";
import { GuidedExperiment } from "./guided-experiment";
import { EmbodiedExperiment } from "./embodied-experiment";
import { CockpitReadouts } from "./research-cockpit";
import { EvidenceView } from "./evidence-view";
import type { GuidedDesign, MeasuredExperimentResult } from "../../lib/web/contracts";

const neuralQuestion = "What happens if I silence primary_a?";
const stimulusQuestion = "How does the looming stimulus change neural output and behavior compared with no stimulus?";

const neuralCompact = createCompactEvidence(
  createEvidencePayload({
    researchQuestion: neuralQuestion,
    networkDefinition: syntheticDemoNetwork,
    experimentSpec: demoExperimentSpec,
  })
);
const neuralDesign: GuidedDesign = {
  id: "neural-design",
  researchQuestion: neuralQuestion,
  mode: "FAKE META CLIENT",
  spec: neuralCompact.experimentSpec,
  runtimeCalls: [],
};
const neuralResult: MeasuredExperimentResult = {
  researchQuestion: neuralQuestion,
  mode: neuralDesign.mode,
  spec: neuralDesign.spec,
  measuredEvidence: neuralCompact.comparison,
  provenance: neuralCompact.provenance,
};

const stimulusSpec = {
  ...demoExperimentSpec,
  experimentType: "STIMULUS_RESPONSE" as const,
  perturbation: null,
  hypothesis: "A positive pulse will produce a different output than zero input on the identical synthetic circuit.",
};
const stimulusCompact = createCompactEvidence(
  createEvidencePayload({
    researchQuestion: stimulusQuestion,
    networkDefinition: syntheticDemoNetwork,
    experimentSpec: stimulusSpec,
  })
);
const stimulusDesign: GuidedDesign = {
  id: "stimulus-design",
  researchQuestion: stimulusQuestion,
  mode: "FAKE META CLIENT",
  spec: stimulusCompact.experimentSpec,
  runtimeCalls: [],
};
const stimulusResult: MeasuredExperimentResult = {
  researchQuestion: stimulusQuestion,
  mode: stimulusDesign.mode,
  spec: stimulusDesign.spec,
  measuredEvidence: stimulusCompact.comparison,
  provenance: stimulusCompact.provenance,
};

const baseCallbacks = {
  onQuestion: () => {},
  onDemo: () => {},
  onDesign: () => {},
  onRun: () => {},
  onExplain: () => {},
  onNext: () => {},
  onCompare: () => {},
  onConnectome: () => {},
};

test("Sprint 17.3: EDIT QUESTION and NEW QUESTION are persistently visible across Observe, Perturb, Compare, and Completed states", () => {
  for (const mode of ["observe", "perturb", "compare"] as const) {
    const html = render(
      <GuidedExperiment
        {...baseCallbacks}
        question={neuralQuestion}
        pending=""
        mode="FAKE META CLIENT"
        design={neuralDesign}
        result={neuralResult}
        instrumentMode={mode}
      />
    );
    assert.match(html, />EDIT QUESTION<\/button>/, `EDIT QUESTION visible in ${mode}`);
    assert.match(html, />NEW QUESTION<\/button>/, `NEW QUESTION visible in ${mode}`);
    const questionIdx = html.indexOf('id="demo-question"');
    const setupIdx = html.indexOf('class="completed-setup"');
    assert.ok(questionIdx !== -1 && setupIdx !== -1 && questionIdx < setupIdx, `Question controls stay outside collapsed setup in ${mode}`);
  }
});

test("Sprint 17.3: Question card exposes persistent EDIT QUESTION and NEW QUESTION controls and preserves completed evidence in history on NEW QUESTION", () => {
  const retainedQuestionHtml = render(
    <ResearchQuestion
      question={neuralQuestion}
      busy={false}
      underTest={true}
      completed={true}
      onUse={() => {}}
    />
  );
  assert.match(retainedQuestionHtml, />EDIT QUESTION<\/button>/);
  assert.match(retainedQuestionHtml, />NEW QUESTION<\/button>/);
  assert.match(retainedQuestionHtml, /What happens if I silence primary_a\?/);

  // Saving a new question via workspaceReducer archives the completed result in history
  const nextState = workspaceReducer(
    { workspace: "compare", question: neuralQuestion, design: neuralDesign, result: neuralResult },
    { type: "question", question: stimulusQuestion }
  );
  assert.equal(nextState.question, stimulusQuestion);
  assert.equal(nextState.design, undefined);
  assert.equal(nextState.result, null);
  assert.equal(nextState.history?.length, 1);
  assert.equal(nextState.history?.[0].result, neuralResult);
});

test("Sprint 17.3: STIMULUS_RESPONSE provenance retains actual per-run stimulus values (0.0 vs >0) and null perturbation", () => {
  assert.equal(isStimulusResponse(stimulusSpec), true);
  const control = runTrial(syntheticDemoNetwork, stimulusSpec, "CONTROL");
  const testRun = runTrial(syntheticDemoNetwork, stimulusSpec, "TEST");
  const comparison = compareTrials(control, testRun);

  assert.equal(control.condition, "CONTROL");
  assert.equal(testRun.condition, "TEST");
  assert.equal(trialAmplitude(control), 0);
  assert.equal(trialAmplitude(testRun), 1);
  assert.equal(control.provenance.stimulus?.amplitude, 0);
  assert.equal(testRun.provenance.stimulus?.amplitude, 1);
  assert.equal(control.provenance.experiment.perturbation, null);
  assert.equal(testRun.provenance.experiment.perturbation, null);
  assert.equal(control.provenance.appliedPerturbation, null);
  assert.equal(testRun.provenance.appliedPerturbation, null);
  assert.equal(comparison.provenance.experimentType, "STIMULUS_RESPONSE");
  assert.equal(comparison.provenance.onlyDeclaredStimulusDiffers, true);
  assert.equal(comparison.provenance.matchedConditions.onlyDeclaredPerturbationDiffers, false);
  assert.equal(comparison.provenance.deltaConvention, "TEST_MINUS_CONTROL");
});

test("Sprint 17.3: NEURAL_INTERVENTION provenance retains matched stimulus and declared pathway perturbation", () => {
  assert.equal(isStimulusResponse(demoExperimentSpec), false);
  const control = runTrial(syntheticDemoNetwork, demoExperimentSpec, "CONTROL");
  const perturbed = runTrial(syntheticDemoNetwork, demoExperimentSpec, "PERTURBED");
  const comparison = compareTrials(control, perturbed);

  assert.equal(control.condition, "CONTROL");
  assert.equal(perturbed.condition, "PERTURBED");
  assert.equal(trialAmplitude(control), 1);
  assert.equal(trialAmplitude(perturbed), 1);
  assert.equal(control.provenance.appliedPerturbation, null);
  assert.equal(perturbed.provenance.appliedPerturbation?.targetNodeId, "primary_a");
  assert.equal(experimentTypeOf(demoExperimentSpec), "NEURAL_INTERVENTION");
  assert.equal(comparison.provenance.matchedConditions.onlyDeclaredPerturbationDiffers, true);
  assert.equal(Boolean(comparison.provenance.onlyDeclaredStimulusDiffers), false);
  assert.equal(comparison.provenance.deltaConvention, "PERTURBED_MINUS_CONTROL");
});

test("Sprint 17.3: Zero-stimulus guard explains quiescent 0.0 runs and offers one-click stimulus comparison", () => {
  const preRunZeroHtml = render(
    <GuidedExperiment
      {...baseCallbacks}
      question={neuralQuestion}
      pending=""
      mode="FAKE META CLIENT"
      result={null}
      experimentType="NEURAL_INTERVENTION"
      amplitude={0}
      onStimulusComparison={() => {}}
    />
  );
  assert.match(preRunZeroHtml, /class="zero-stimulus-guard"/);
  assert.match(preRunZeroHtml, /NO STIMULUS SELECTED/);
  assert.match(preRunZeroHtml, /Both runs will receive stimulus 0\.0\./);
  assert.match(preRunZeroHtml, />COMPARE NO STIMULUS VS STIMULUS →<\/button>/);

  const zeroSpec = { ...demoExperimentSpec, stimulus: { amplitude: 0 } };
  const zeroCompact = createCompactEvidence(
    createEvidencePayload({
      researchQuestion: neuralQuestion,
      networkDefinition: syntheticDemoNetwork,
      experimentSpec: zeroSpec,
    })
  );
  const zeroDesign: GuidedDesign = {
    id: "zero-design",
    researchQuestion: neuralQuestion,
    mode: "FAKE META CLIENT",
    spec: zeroCompact.experimentSpec,
    runtimeCalls: [],
  };
  const zeroResult: MeasuredExperimentResult = {
    researchQuestion: neuralQuestion,
    mode: "FAKE META CLIENT",
    spec: zeroCompact.experimentSpec,
    measuredEvidence: zeroCompact.comparison,
    provenance: zeroCompact.provenance,
  };
  const postRunZeroHtml = render(
    <GuidedExperiment
      {...baseCallbacks}
      question={neuralQuestion}
      pending=""
      mode="FAKE META CLIENT"
      experimentType="NEURAL_INTERVENTION"
      amplitude={0}
      design={zeroDesign}
      result={zeroResult}
      onStimulusComparison={() => {}}
    />
  );
  assert.match(postRunZeroHtml, /NO EVOKED SIGNAL TO COMPARE/);
  assert.match(postRunZeroHtml, /Both runs received stimulus 0\.0\. To measure a stimulus response, compare no stimulus with a positive stimulus on the unchanged network\./);
  assert.match(postRunZeroHtml, />COMPARE NO STIMULUS VS STIMULUS →<\/button>/);
});

test("Sprint 17.3: Decoder-driven procedural motion keeps IDLE stationary, starts ESCAPE strictly at threshold crossing step, and separates 0.0 Control from 1.0 Test", () => {
  assert.equal(decodeFixtureOutput(0, 0.4), "IDLE");
  assert.equal(decodeFixtureOutput(0.25, 0.4), "WALK");
  assert.equal(decodeFixtureOutput(0.4, 0.4), "ESCAPE");

  const controlTrial = stimulusResult.measuredEvidence.control;
  const testTrial = stimulusResult.measuredEvidence.perturbed;

  // Control (stimulus 0.0) stays IDLE and GROUNDED with 0 displacement across all steps 0..6
  for (let step = 0; step <= 6; step++) {
    const motor = recordedMotorFrame(controlTrial, step);
    assert.equal(motor.stimulus, 0);
    assert.equal(motor.decoder, "IDLE");
    assert.equal(motor.phase, "GROUNDED");
    assert.equal(motor.displacement, 0);
    assert.deepEqual(motor.pose, { x: 0, y: 0, z: 0, pitch: 0 });
  }

  // Test (stimulus 1.0) stays stationary before threshold crossing (steps 0, 1, 2)
  for (let step = 0; step <= 2; step++) {
    const motor = recordedMotorFrame(testTrial, step);
    assert.equal(motor.stimulus, step === 0 ? 1 : 0);
    assert.equal(motor.output, 0);
    assert.equal(motor.decoder, "IDLE");
    assert.equal(motor.phase, "GROUNDED", `No escape before decoder transition at step ${step}`);
    assert.equal(motor.displacement, 0, `Zero displacement before decoder transition at step ${step}`);
  }

  // At step 3, output reaches 1.0 >= 0.4 -> decoder transitions to ESCAPE -> procedural takeoff begins
  const step2Motor = recordedMotorFrame(testTrial, 2);
  const step3Motor = recordedMotorFrame(testTrial, 3);
  assert.equal(step3Motor.output, 1);
  assert.equal(step3Motor.decoder, "ESCAPE");
  assert.equal(step3Motor.phase, "TAKEOFF_ESCAPE");
  assert.notEqual(step3Motor.decoder, step2Motor.decoder);
  assert.notEqual(step3Motor.phase, step2Motor.phase);
  assert.ok(step3Motor.pose.y > 0.8, "Fly visibly lifts off into the air at ESCAPE onset");
  assert.ok(step3Motor.pose.z > 1.0, "Fly visibly accelerates forward at ESCAPE onset");
  assert.ok(step3Motor.pose.pitch < -0.3, "Fly pitches upward during takeoff");

  // Trail reflects trajectory separation
  const controlTrail = recordedMotorTrail(controlTrial, 6);
  const testTrail = recordedMotorTrail(testTrial, 6);
  assert.ok(controlTrail.every((pt) => pt.y === 0 && pt.z === 0));
  assert.ok(testTrail.some((pt) => pt.y > 1.2 && pt.z > 2.0));
});

test("Sprint 17.3: Compare view explains STIMULUS_RESPONSE without mislabeling it as a neural intervention and separates measured vs rendered", () => {
  const html = render(
    <EmbodiedExperiment
      result={stimulusResult}
      design={stimulusDesign}
      busy={false}
      strength={1.0}
      instrumentMode="compare"
      onStrength={() => {}}
      onRun={() => {}}
    />
  );

  assert.match(html, /Control vs test/);
  assert.match(html, /data-experiment-type="STIMULUS RESPONSE"/);
  assert.match(html, /ONLY THING CHANGED<\/span><strong>Stimulus<\/strong>/);
  assert.match(html, /01 \/ CONTROL \(NO STIMULUS · 0\.0\)/);
  assert.match(html, /02 \/ TEST \(LOOMING STIMULUS · 1\.0\)/);
  assert.match(html, /Escape evoked by stimulus/);
  assert.match(html, /Only declared stimulus differs: Control 0\.0 vs Test 1\.000/);
  assert.match(html, /Rendered displacement 0\.00 scene units · not a body measurement/);
  assert.doesNotMatch(html, /INTERVENTION \(SILENCE/);
  assert.doesNotMatch(html, /Only declared perturbation differs/);

  const cockpitHtml = render(<CockpitReadouts result={stimulusResult} design={stimulusDesign} perceived={false} />);
  const evidenceHtml = render(<EvidenceView result={stimulusResult} />);
  for (const view of [html, cockpitHtml, evidenceHtml]) {
    assert.doesNotMatch(view, /0\.40\s*u\b/i, "No unsupported 0.40 u motor claim");
    assert.doesNotMatch(view, /displacement \(0\.4 scene units\)/i, "No obsolete 0.4 scene units mapping claim");
  }
});
