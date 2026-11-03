# SPRINT 17.3 — ACCEPTANCE REPORT

**Sprint:** 17.3 — Compare Behavioural Causality, Stimulus-vs-Intervention Experiments & Always-Editable Question UX  
**Branch:** `feat/hackathon-final-acceptance`  
**Date:** 2026-11-02  
**Verification Mode:** Offline deterministic fixture (`CAUSALFLY_FAKE_META="1"`, zero external AI calls, zero live brain server feedback)

---

## 1. Takeover Audit Summary

This sprint was resumed from an in-progress working tree started by GPT-6.1 Sol High in Codex. No files were reset, stashed, reverted, or discarded.

### A. Completed by Codex Prior to Takeover
- **Deterministic Engine & Schema (`src/lib/experiment/engine.ts`, `src/lib/experiment/schema.ts`, `src/lib/experiment/semantics.ts`):**
  - Added `ExperimentType` (`"NEURAL_INTERVENTION" | "STIMULUS_RESPONSE"`).
  - Updated `runExperiment` so `STIMULUS_RESPONSE` runs `CONTROL` at `stimulus = 0` (`perturbation: null`) and `INTERVENTION` (Test) at `stimulus > 0` (`perturbation: null`) on the identical network (`demo-network-v1`), while preserving `NEURAL_INTERVENTION` semantics (`CONTROL` intact vs `INTERVENTION` silenced pathway under identical stimulus).
  - Preserved exact per-run input provenance (`trial.provenance.stimulus.amplitude` and `matchedConditions.stimulusMatched`).
  - Added `experimentTypeOf`, `isStimulusResponse`, `comparisonSubjectLabel`, `comparisonConditionLabel`, and `experimentChangeLabel` helpers.
- **Offline Meta Designer (`src/lib/meta/client.ts`, `src/lib/meta/prompts.ts`, `src/lib/meta/schema.ts`, `src/lib/meta/design.ts`):**
  - Added `experimentType` support for both `STIMULUS_RESPONSE` and `NEURAL_INTERVENTION` in offline and schema validation paths without network calls.
- **Decoder-Driven Recorded Embodiment (`src/lib/web/embodiment.ts`):**
  - Replaced tiny raw-output displacement (`output * 0.4`) with explicit decoder-driven procedural state (`IDLE` → `GROUNDED`, `WALK` → `GROUNDED_WALK`, `ESCAPE` → `TAKEOFF_ESCAPE` starting strictly at `outputThresholdCrossingStep`, followed by `RECOVERY`).
- **New UI Components (`src/app/components/experiment-conditions.tsx`, `src/app/components/recorded-motor-readout.tsx`, `src/app/components/research-question.tsx`):**
  - Created `ExperimentConditions` header for Compare, `RecordedMotorReadout` per-fly causal strip, and refactored `ResearchQuestion` for persistent one-click `EDIT QUESTION` and `NEW QUESTION` actions.
- **3D Arena Trails & Camera (`src/app/components/embodied-world.tsx`):**
  - Added `RecordedTrail` 3D line/origin markers and `recordedComparisonBounds` so Compare frames both flies, their takeoff trajectories, and the stimulus pulse.

### B. Completed During Takeover
- **Compare & Recorded View Copy / Semantics (`src/app/components/embodied-experiment.tsx`, `src/app/components/neural-response-summary.tsx`, `src/app/components/result-story.tsx`, `src/app/components/measured-delta-card.tsx`, `src/app/components/observation-metrics.tsx`, `src/app/components/propagation-timeline.tsx`):**
  - Completed `STIMULUS_RESPONSE` vs `NEURAL_INTERVENTION` disambiguation across all Compare cards, compact difference summaries, causal pipeline readouts (`STIMULUS`, `NEURAL RESPONSE`, `DECISION`, `MOTOR OUTPUT`), matched-condition badges, and recorded-view badges so an environmental stimulus test is never mislabeled as a neural intervention.
  - Removed the remaining hard-coded `"0.40 u"` / `"displacement (0.4 scene units)"` claims from the measurement disclosure footers in `src/app/components/embodied-experiment.tsx`.
- **Per-Run Stimulus & Retained Quiescent Output in `RecordedMotorReadout` (`src/app/components/recorded-motor-readout.tsx`, `src/lib/web/embodiment.ts`):**
  - Exposed `retainedOutput` on `RecordedMotorFrame` so compacted quiescent trials (`0.0` stimulus Control) display `STIMULUS: 0.0` and `NEURAL OUTPUT: 0` at every step alongside `DECODER: IDLE` and `PROCEDURAL BODY: GROUNDED`.
- **Fixed Hook Ordering Bug (`src/app/components/guided-experiment.tsx`):**
  - Fixed a `ReferenceError: Cannot access 'experimentType' before initialization` in `GuidedExperiment` (`needsDesign`) and updated `retainedDesign` in `src/app/observatory.tsx` to check `experimentType`.
- **Test Updates, New Sprint 17.3 Acceptance Tests & Real-Browser Verification (`src/app/components/sprint173-acceptance.test.tsx`, `scripts/sprint173-compare-and-question-review.mjs`):**
  - Updated existing component test expectations to match Sprint 17.3 copy and added 7 dedicated Sprint 17.3 acceptance tests plus a multi-browser verification script covering Journeys A, B, C, and D in genuine Firefox 159.0 and Microsoft Edge.

---

## 2. Question UX Changes (`EDIT QUESTION` / `NEW QUESTION`)

- **Persistent Question Header (`src/app/components/research-question.tsx`, `src/app/components/guided-experiment.tsx`):**
  - The `#demo-question` header remains persistently visible at the top of the Experiment workspace across `Observe`, `Perturb`, `Compare`, `Completed experiment`, `Evidence`, and `AI Scientist` states instead of disappearing into collapsed setup details after a run completes.
- **True One-Click Actions:**
  - Clicking `EDIT QUESTION` immediately mounts and focuses `<textarea id="research-question">` pre-filled with the current question text (`data-editing="true"`).
  - Clicking `NEW QUESTION` immediately mounts and focuses `<textarea id="research-question">` with a clean empty draft (`value === ""`) while preserving completed runs in the experiment history (`history`).
  - If an unapproved Meta design is present when editing or starting a new question, an explicit inline warning (`Changing the question will require a new experiment design before running.`) is displayed.

---

## 3. Experiment-Type Model (`STIMULUS_RESPONSE` vs `NEURAL_INTERVENTION`)

- **Explicit Selector (`WHAT DO YOU WANT TO CHANGE?`):**
  - **`[ The environment ]` (`STIMULUS_RESPONSE`):** Compares `CONTROL` (`0.0` stimulus, intact network, `perturbation: null`) against `TEST` (`> 0.0` stimulus, intact network, `perturbation: null`).
  - **`[ The nervous system ]` (`NEURAL_INTERVENTION`):** Compares `CONTROL` (intact network, matched stimulus) against `INTERVENTION` (silenced internal pathway, matched stimulus).
- **Provenance & Validation (`src/lib/experiment/engine.ts`):**
  - `compareTrialResults` enforces that `NEURAL_INTERVENTION` runs have identical stimulus (`matchedConditions.stimulusMatched === true`) and a declared intervention, whereas `STIMULUS_RESPONSE` runs have `control.stimulus === 0`, `intervention.stimulus > 0`, `perturbation === null` on both runs, and `matchedConditions.stimulusMatched === false`.

---

## 4. Zero-Stimulus Guard and One-Click Stimulus Comparison

- When `experimentType === "NEURAL_INTERVENTION"` and stimulus strength is set to `0.0`, the workspace renders `.zero-stimulus-guard`:
  - **Pre-run (`NO STIMULUS SELECTED`):** *"Both runs will receive stimulus 0.0. To measure a stimulus response, compare no stimulus with a positive stimulus on the unchanged network."*
  - **Post-run (`NO EVOKED SIGNAL TO COMPARE`):** *"Both runs received stimulus 0.0, so output stayed 0.000 and threshold was not reached in either fly."*
- Provides a one-click **`COMPARE NO STIMULUS VS STIMULUS →`** button that switches `experimentType` to `"STIMULUS_RESPONSE"`, sets stimulus strength to `1.0`, updates the question to *"Does the stimulus trigger an escape response?"*, and clears stale results.

---

## 5. Recorded Decoder → Procedural Motion Contract

- Implemented in `recordedMotorFrame` (`src/lib/web/embodiment.ts`):
  - Recorded neural output is first classified by `decodeFixtureOutput(output, outputThreshold)` into `IDLE | WALK | ESCAPE`.
  - **`IDLE` (`output === 0` or below walk threshold):** `motorState = "GROUNDED"`, `position = { x: 0, y: 0, z: 0 }`, `displacement = 0`, `wingSpread = 0`, `wingBuzz = 0`, `legPhase = 0`. A quiescent fly never drifts, hovers, or walks.
  - **`WALK` (`0 < output < outputThreshold`):** `motorState = "GROUNDED_WALK"`, bounded forward ground stride (`y = 0`) with leg phase cycling.
  - **`ESCAPE` (`output >= outputThreshold`):** `motorState = "TAKEOFF_ESCAPE"` starting strictly at `onset = trial.outputThresholdCrossingStep`. Before `onset` (`step < onset`), the fly remains `GROUNDED` at `{ x: 0, y: 0, z: 0 }`. At `step === onset` (`step === 3` for `1.0` stimulus on the intact network), the fly executes a multi-axis takeoff burst (`x = 0.68`, `y = 1.18`, `z = -0.3`, `displacement = 1.39 scene units`) with full wing spread and wing buzz.

---

## 6. ESCAPE Trajectory and Visual Salience Improvements

- **3D Procedural Trajectory & Origin Marker (`RecordedTrail` in `src/app/components/embodied-world.tsx`):**
  - Renders each fly's origin marker on the arena floor (`[0, 0.035, 0]`) and a 3D trajectory path from step `0` through the current step (`cyan` `#38bdf8` for Control, `magenta` `#f472b6` for Test/Intervention), plus a vertical elevation stem to the airborne body position.
- **Comparison Camera Framing (`recordedComparisonBounds` in `src/app/components/embodied-world.tsx`):**
  - Computes bounding sphere across both flies' origin positions, current procedural positions, trajectory histories, and stimulus pulse so neither fly is clipped during `TAKEOFF_ESCAPE`.

---

## 7. Compare Header and Synchronized Per-Fly Readouts

- **Self-Explaining Compare Header (`src/app/components/experiment-conditions.tsx`):**
  - Displays `EXPERIMENT CONDITIONS` (`STIMULUS RESPONSE` vs `NEURAL INTERVENTION`), `ONLY THING CHANGED`, `CONTROL`, `TEST` / `INTERVENTION`, and what was held constant at the top of Compare.
- **Synchronized Per-Fly Readouts (`src/app/components/recorded-motor-readout.tsx`):**
  - Positioned directly above the Compare arena for `01 / CONTROL` and `02 / TEST` (or `02 / INTERVENTION`), showing at the active step:
    - `STIMULUS` (`0.0` vs `1.0`)
    - `NEURAL OUTPUT` (`0` vs `1`, with `Threshold 0.4`)
    - `DECODER` (`IDLE` vs `ESCAPE`, highlighted when changed)
    - `PROCEDURAL BODY` (`GROUNDED` vs `TAKEOFF`, with `Triggered at step 3` / `No escape command`)
    - Explicit rendering provenance: `Rendered displacement 0.00 scene units · not a body measurement` vs `Rendered displacement 1.39 scene units · not a body measurement`.

---

## 8. Scientific Integrity Audit

- **No Engine Physics Altered:** The deterministic propagation rule in `src/lib/experiment/engine.ts` (`sum -> clamp [0, 1] -> synchronous step`) and fixture weights in `demo-network-v1` were not altered.
- **Strict Separation of Measured vs Rendered:**
  - `MEASURED` metrics report only engine-computed `Peak Normalized Output`, `Threshold Crossing`, `Response Step`, and `Threshold outcome`.
  - `RENDERED` readouts explicitly state that 3D body trajectory and scene-unit displacement (`1.39 scene units`) are CausalFly procedural visualizations triggered by the recorded decoder state (`not a body measurement`).
- **Unsupported Claims Removed:**
  - Removed all occurrences of `"0.40 u"` and `"displacement (0.4 scene units)"` across `src/app/components/` and `src/lib/`.

---

## 9. Test Results

All unit, integration, component, lint, and production build checks pass with zero errors:

| Check | Command | Result |
|---|---|---|
| Lib & Engine Unit Tests | `tsx --conditions=react-server --test src/lib/**/*.test.ts` | **409 / 409 passed** |
| Component & Sprint 17.3 Acceptance Tests | `tsx --test src/app/components/*.test.tsx` | **151 / 151 passed** (including 7 new Sprint 17.3 acceptance tests in `sprint173-acceptance.test.tsx`) |
| ESLint | `npm run lint` | **Passed (0 warnings, 0 errors)** |
| Production Build | `npm run build` | **Passed (Next.js 16.4.3 webpack build succeeded)** |

---

## 10. Browser Verification Results

Executed against the offline production build (`CAUSALFLY_FAKE_META="1"`, port `3482`):

| Suite | Browsers Verified | Result |
|---|---|---|
| `scripts/sprint173-compare-and-question-review.mjs` | Genuine Firefox 159.0 (`firefox-real`) + Microsoft Edge (`msedge`) | **PASSED** (Journeys A, B, C, D) |
| `scripts/sprint172-timeline-semantic-stability.mjs` | Genuine Firefox 159.0 + Chromium + Edge + WebKit | **PASSED** |
| `scripts/sprint1722-live-workspace-review.mjs` | Genuine Firefox 159.0 + Edge | **PASSED** |
| `scripts/sprint171-timeline-stability.mjs` | Genuine Firefox 159.0 + Chromium + Edge + WebKit | **PASSED** |
| `scripts/sprint171-neural-response-review.mjs` | Genuine Firefox 159.0 + Chromium + Edge + WebKit | **PASSED** |
| `scripts/sprint17-live-layout-stability.mjs` | Genuine Firefox 159.0 + Chromium + Edge + WebKit | **PASSED** |
| `scripts/sprint17-judge-journey.mjs` | Genuine Firefox 159.0 + Chromium + Edge + WebKit | **PASSED** |
| `scripts/sprint16a-browser-review.mjs` | Chromium + Firefox + WebKit + Edge | **PASSED** |

---

## 11. Screenshots / Artifacts Produced

Saved under `docs/review/sprint-17-3/`:
- `docs/review/sprint-17-3/firefox-real-journey-a-question-editing.png`
- `docs/review/sprint-17-3/firefox-real-journey-b-stimulus-response-compare-step3.png`
- `docs/review/sprint-17-3/firefox-real-journey-c-neural-intervention-compare-step3.png`
- `docs/review/sprint-17-3/firefox-real-journey-d-zero-stimulus-guard.png`
- `docs/review/sprint-17-3/msedge-journey-a-question-editing.png`
- `docs/review/sprint-17-3/msedge-journey-b-stimulus-response-compare-step3.png`
- `docs/review/sprint-17-3/msedge-journey-c-neural-intervention-compare-step3.png`
- `docs/review/sprint-17-3/msedge-journey-d-zero-stimulus-guard.png`
- `docs/review/sprint-17-3/sprint173-compare-and-question-review.json`

---

## 12. Remaining Limitations

- In the deterministic synthetic fixture (`demo-network-v1`), silencing a single intermediate pathway (`primary-a` or `alternate-b`) delays threshold crossing from Step 3 to Step 4 rather than blocking it across all steps (`0.5 >= 0.4` threshold at Step 4). At Step 3, the behavioural divergence between Control (`ESCAPE` / `TAKEOFF`) and Intervention (`IDLE` / `GROUNDED`) is immediate and unmistakable; for full-run `IDLE` vs `ESCAPE` contrast across steps `3..6`, the `[ The environment ]` (`STIMULUS_RESPONSE`, `0.0` vs `1.0`) experiment mode provides a permanent quiescent control against an escaping test fly without altering the synthetic fixture's propagation rule.

---

## 13. Explicit Answers to the Two Review Questions

1. **Can a user edit or replace the current question in one click from Observe, Perturb, Compare, and after a completed run?**  
   **YES.** The `#demo-question` banner remains persistently mounted at the top of the workspace across `Observe`, `Perturb`, `Compare`, `Completed experiment`, `Evidence`, and `AI Scientist` states. Clicking `EDIT QUESTION` once immediately mounts and focuses `<textarea id="research-question">` with the existing question text; clicking `NEW QUESTION` once immediately mounts and focuses `<textarea id="research-question">` with a clean empty draft while retaining completed runs in history.

2. **In Compare, when one fly crosses into `ESCAPE` and the other stays `IDLE`, is the behavioural difference immediately obvious to a human observer without reading technical tables?**  
   **YES.** The `IDLE` fly remains completely stationary and grounded inside its floor ring (`0.00 scene units`), while the `ESCAPE` fly spreads its wings and launches upward and forward along a glowing 3D trajectory arc (`1.39 scene units` above/forward of its origin dot), accompanied by synchronized `IDLE → GROUNDED` vs `ESCAPE → TAKEOFF` status cards directly above the two flies.

---

PRODUCTION DEPLOYMENT RECOMMENDATION: YES
