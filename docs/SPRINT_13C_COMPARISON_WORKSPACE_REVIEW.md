# Sprint 13C Review: Control vs Intervention Comparison Workspace

**Sprint Objective:** Recompose the Compare mode workspace from a cramped side-by-side view into a full-width, organism-centered scientific payoff answering the core question: **"WHAT CHANGED?"**

---

## 1. Executive Summary

In Sprint 13C, Compare transitions from a subordinate view into CausalFly's centerpiece scientific result workspace.

- **Full-Width Comparison Stage**: Eliminates the 38% right-side action rail in Compare mode, giving maximum spatial canvas to the organism comparison.
- **Strictly One WebGL Canvas**: Preserves a single Three.js Canvas (`<World>`) rendering both Control and Intervention flies within a shared environmental arena. No duplicate canvas or split renderers.
- **Closer, Clearer Organism Framing**: Adjusted Three.js comparison camera distance from `[0, 6, 10]` down to `[0, 3.4, 6.2]` (and `[±2.35, 2.7, 4.6]` in focused view), making flies immediately recognizable without squinting.
- **Synchronized Playback Header**: Top-mounted playback bar prominently indicates `SAME STEP / BOTH RUNS`, shared simulation step, scrubber, Replay, Reset, and focus selector.
- **Derived Result Hero**: Surfaces the bold question **"WHAT CHANGED?"** with mathematically derived deltas (e.g., `-50% normalized peak output`, latency changes) without invented statistics.
- **Compact Difference Summary**: Side-by-side table comparing peak normalized output, threshold crossing, simulation response step, and motor execution.
- **Neural System Comparison**: Side-by-side synthetic network topologies at the exact same simulation step, with the explicit disclosure: *"Hand-authored engineering fixture · not a biological Drosophila circuit."*
- **Four-Stage Causal Pipeline**: Preserved Sprint 13B pipeline (`STIMULUS → NEURAL RESPONSE → DECISION → MOTOR OUTPUT`) detailing exactly what changed at each stage.
- **Matched Conditions Trust Card**: `MATCHED CONDITIONS ✓` card verifying: *"ONE DECLARED CHANGE. EVERYTHING ELSE HELD CONSTANT."*
- **Compact Meta AI Action**: Demoted Meta AI to an explicit on-demand card: *"Engine measured. Meta interprets on explicit request."*
- **Mobile Responsive Focus**: At 390px width, mobile toggles (`Both`, `Control`, `Intervention`) allow focused inspection with zero horizontal overflow.
- **Zero Regression on Observe & Perturb**: Standard right-side action rails and interactions in Observe and Perturb modes remain completely intact.

---

## 2. Before vs. After Spatial Hierarchy

### Before Sprint 13C
- The comparison viewport was compressed into the upper-left (~60% width), constrained by an empty or unneeded right-side action rail.
- Both flies were framed too far away (`camera [0, 6, 10]`), appearing tiny and difficult to distinguish.
- The measured result was buried below large fold gaps.
- Playback controls were separated from the main viewport.
- Unused black workspace dominated the layout.

### After Sprint 13C (Desktop Target Hierarchy)
```
┌────────────────────────────────────────────────────────────────────────┐
│ QUESTION / MEASUREMENT COMPLETE                                        │
├────────────────────────────────────────────────────────────────────────┤
│ OBSERVE                PERTURB               COMPARE                   │
├────────────────────────────────────────────────────────────────────────┤
│ PLAYBACK: [▶ Play] [Step 3/100] [━━●━━━━] [↺ Replay] [SAME STEP/RUNS]  │
├───────────────────────────┬────────────────────────────────────────────┤
│ 01 / CONTROL              │ 02 / INTERVENTION                          │
│ Network unchanged         │ Silence Primary A                          │
│ [Cyan Indicator]          │ [Magenta Indicator]                        │
│                           │                                            │
│   Organism (Intact)       │   Organism (Silenced)                      │
│   Peak Output: 1.0        │   Peak Output: 0.5                         │
│   Threshold Reached       │   Threshold Not Reached                    │
│   Motor: Active Run       │   Motor: Slow Walk                         │
│                           │                                            │
├───────────────────────────┴────────────────────────────────────────────┤
│ WHAT CHANGED?                                                          │
│ -50% SIGNAL REDUCTION · THRESHOLD NOT REACHED                          │
├────────────────────────────────────────────────────────────────────────┤
│ COMPACT DIFFERENCE SUMMARY (Normalized Peak, Threshold, Delay Step)   │
├────────────────────────────────────────────────────────────────────────┤
│ COMPACT META AI ACTION ("Engine measured. Meta interprets on request") │
├────────────────────────────────────────────────────────────────────────┤
│ NEURAL SYSTEM COMPARISON (Side-by-side Topologies at Step N)           │
├────────────────────────────────────────────────────────────────────────┤
│ CAUSAL PIPELINE (Stimulus → Neural → Decision → Motor Output)          │
├────────────────────────────────────────────────────────────────────────┤
│ MATCHED CONDITIONS TRUST CARD (1 Declared Change, Constants Verified)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Single WebGL Canvas Strategy & Organism Framing

### Hard Architectural Requirement
A single WebGL Canvas must host both organisms on desktop and mobile. Multiple canvas elements incur shader recompilation overhead, context thrashing, and timing desynchronization.

### Implementation
- `src/app/observatory.tsx`: In `handleInstrumentModeSelect`, when toggling between `"observe"`, `"perturb"`, and `"compare"`, the workspace stays `"observatory"`. This ensures `<GuidedExperiment>` and `<EmbodiedExperiment>` remain mounted with stable React keys, and the Canvas context is never recreated.
- `src/app/components/embodied-world.tsx`:
  - When `compare={true}`, `<World>` renders two flies at `x = -2.35` (Control) and `x = +2.35` (Intervention).
  - The comparison camera distance was adjusted from `[0, 6, 10]` to `[0, 3.4, 6.2]`, enlarging the visible flies by ~2.5×.
  - Added support for `focus: "both" | "control" | "perturbed"`, where `"control"` centers the camera at `[-2.35, 2.7, 4.6]` and `"perturbed"` centers at `[+2.35, 2.7, 4.6]`.
  - DOM overlays (`.compare-overlay.control-overlay` and `.compare-overlay.perturbed-overlay`) provide high-contrast badges (Cyan and Magenta) with dynamic titles derived directly from the retained `ExperimentSpec`.

---

## 4. Measured Result Hero & Scientific Metric Audit

### Deterministic Delta Math
The Hero result answers **"WHAT CHANGED?"** using pure deterministic mathematical evidence from `TrialResult`:
```typescript
const peakDelta = result.measurements.controlPeakOutput > 0
  ? Math.round(((result.measurements.perturbedPeakOutput - result.measurements.controlPeakOutput) / result.measurements.controlPeakOutput) * 100)
  : 0;

const stepDelta = result.measurements.perturbedResponseStep !== null && result.measurements.controlResponseStep !== null
  ? result.measurements.perturbedResponseStep - result.measurements.controlResponseStep
  : null;
```

### Prohibited vs. Truthful Metrics Audit
| Metric Category | Forbidden in Sprint 13C | Implemented in Sprint 13C |
|---|---|---|
| Firing rate / frequency | ❌ Hz, spike rates | ✅ Normalized output (0.0 to 1.0) |
| Voltage / potential | ❌ mV, membrane potentials | ✅ Unitless activation values |
| Temporal units | ❌ ms, milliseconds | ✅ Discrete simulation steps |
| Statistics | ❌ p-values, Cohen's d, CI | ✅ Exact deterministic differences |
| Biological claims | ❌ "Drosophila connectome" | ✅ Disclosed synthetic engineering fixture |

---

## 5. Synchronized Playback Bar

Located immediately above the comparison stage:
- **Badge**: `SAME STEP / BOTH RUNS` clearly indicates temporal lockstep.
- **Controls**: Play/Pause toggle, simulation step readout (`Step N / MaxSteps`), scrubbable range slider, Replay (resets to step 0 and plays), and Reset.
- **Focus Selector**: Allows toggling between `Both`, `Control`, and `Intervention` viewpoints while keeping playback step strictly synchronized.

---

## 6. Difference Summary & Matched Conditions Card

### Difference Summary Table
Displays exact side-by-side metrics:
1. **Normalized Peak Output**: Control vs. Intervention with percentage delta.
2. **Threshold Crossing**: Reached vs. Not Reached / Reached.
3. **Response Timing**: Crossing simulation step (e.g., Step 3 vs. Not Reached).
4. **Motor Execution**: Forward locomotion state derived from deterministic engine output.

### Matched Conditions Card
Affirms experimental rigor:
- **Title**: `MATCHED CONDITIONS ✓`
- **Subtitle**: `ONE DECLARED CHANGE. EVERYTHING ELSE HELD CONSTANT.`
- **Checklist**:
  - Stimulus amplitude held constant
  - Network architecture and weights held constant
  - Simulation steps held constant
  - Seed and environment held constant
  - Only declared perturbation differs (e.g., `Silence Primary A`)

---

## 7. Neural System & Causal Pipeline

- **Neural System**: Two `<SyntheticNetworkViz>` components render side-by-side at the active simulation step. The silenced node is highlighted in orange/magenta with the label `SILENCED PRIMARY A`.
  - Disclosed with: *"Hand-authored engineering fixture · not a biological Drosophila circuit."*
- **Causal Pipeline**: Displays the 4-stage causal sequence:
  1. `STIMULUS`: Identical sensory input applied to both conditions.
  2. `NEURAL RESPONSE`: Direct comparison of pathway propagation vs. silenced block.
  3. `DECISION`: Threshold crossing comparison.
  4. `MOTOR OUTPUT`: Resulting physical behavioral state.

---

## 8. Compact Meta AI Action

Meta AI is repositioned into an explicit, non-intrusive action card below the measurements:
- **Heading**: `EXPLAIN WITH META`
- **Subheading**: `Engine measured. Meta interprets on explicit request.`
- **Copy**: If analysis is already present, shows the frozen interpretation text; otherwise clarifies: *"Interpretation is optional. Review deterministic measurements above, or request AI interpretation."*
- **Action**: Single `Explain with Meta ↗` button. Zero automatic network calls.

---

## 9. Responsive Behavior & Viewport Validation

Validated via Playwright browser review across 4 standard viewports:
- **1920×1080**: Full-width comparison stage, large organisms, side-by-side difference summary and neural system. Zero horizontal overflow (`scrollWidth = 1920 = innerWidth`). Exactly 1 WebGL canvas.
- **1440×900**: Compact balanced desktop layout. Exactly 1 WebGL canvas. Zero horizontal overflow (`scrollWidth = 1440 = innerWidth`).
- **1024×768**: Tablet layout with stacked neural topology. Exactly 1 WebGL canvas. Zero horizontal overflow (`scrollWidth = 1024 = innerWidth`).
- **390×844**: Mobile layout. Focus controls (`Both`, `Control`, `Intervention`) allow examining individual organisms up close. Single canvas. Zero horizontal overflow (`scrollWidth = 390 = innerWidth`).

---

## 10. Regression Check: Observe & Perturb Layouts

Observe and Perturb modes continue using their established layouts:
- In `instrumentMode === "observe"`, the 38% right-side action rail displays observation context, behavioural status, and stimulus presentation actions.
- In `instrumentMode === "perturb"`, the right-side rail displays perturbation targets, question input, and experiment design controls.
- Switching between Observe, Perturb, and Compare does not reset the 3D scene or reinitialize WebGL shaders.

---

## 11. Review Screenshots Reference

Generated in `docs/review/sprint-13c/`:
- `01-1920-compare-full-workspace.png` — Full desktop view with hero result and comparison stage.
- `02-1440-compare-control-intervention.png` — 1440×900 comparison stage with Cyan/Magenta overlays and playback controls.
- `03-1440-compare-measured-result.png` — Hero result ("WHAT CHANGED?"), delta headline, and difference table.
- `04-1440-neural-comparison.png` — Side-by-side synthetic neural topologies at step N with silenced target marker.
- `05-1440-matched-conditions.png` — Matched conditions trust card and 4-stage causal pipeline.
- `06-390-mobile-compare.png` — Mobile view at 390×844 with focus selector and single canvas.
- `07-observe-regression-check.png` — Observe mode layout verified intact.
- `08-perturb-regression-check.png` — Perturb mode layout verified intact.

---

## 12. Verification & Test Suite Results

### Test Suite Execution
- **Unit / System Tests**: 374 passing (0 failing)
- **Component / Integration Tests**: 91 passing (0 failing)
  - Added `src/app/components/comparison-workspace.test.tsx` (10 tests covering all Sprint 13C requirements)
- **Total Tests**: **465 passing (0 failing)**
- **ESLint**: 0 errors, 0 warnings
- **TypeScript**: 0 errors (`npx next build` type check passed cleanly in 6.2s)
- **Production Build**: Next.js static and dynamic routes compiled successfully

### Git Diff Statistics
```
 src/app/components/embodied-experiment.tsx | 478 ++++++++++++++++++++++++-
 src/app/components/embodied-world.tsx      |  20 +-
 src/app/components/guided-experiment.tsx   |  25 +-
 src/app/components/instrument-shell.css    | 551 +++++++++++++++++++++++++++++
 src/app/observatory.tsx                    |  18 +-
 5 files changed, 1058 insertions(+), 34 deletions(-)
```

---

## 13. Known Limitations

- **Quest VR / WebXR**: Deferred as planned.
- **Biological Connectome Mapping**: Disclosed as a synthetic engineering fixture; full biological Drosophila CNS connectome dynamics remain in Live Connectome simulation mode.
- **Provider Calls**: Offline deterministic engine and fake Meta fixture verify all paths with zero live API token usage.

---

## 14. Sprint 13C.1: Guided Single-Page Experiment Flow

### 14.1 Human Usability Finding & Root Cause
Human exploratory testing exposed a critical usability breakdown: even developers and scientists deeply familiar with CausalFly were unsure what action to take next.
- **Root Cause**: The interface required users to mentally reconcile two overlapping mental models:
  1. *Instrument modes*: `Observe → Perturb → Compare`
  2. *Scientific lifecycle*: `Ask → Input → Design → Run → Understand`
- Users had to discover tabs/modes to advance the experiment, while the instrument already knew the exact state of the experiment.
- **Core Principle of Sprint 13C.1**: **CausalFly must tell the user what to do next.** The workspace is transformed into a **guided single-page experiment journey**:
  `QUESTION → DESIGN → RUN → COMPARE → INTERPRET → NEXT HYPOTHESIS`
  Instrument modes (`Observe`, `Perturb`, `Compare`) remain advanced contextual lens views, but are never required knowledge to complete the default scientific flow.

### 14.2 Workflow State Model & Exactly One Dominant Next Action
At every workflow state, the single-page workspace exposes exactly **ONE dominant primary CTA**:
| Workflow State | Dominant Primary Action / State | Secondary / Subordinate Actions |
|---|---|---|
| **No Question** | `"Ask a research question"` (focuses input) | Preset hypothesis chips |
| **Question Retained / No Design** | `"Design experiment with Meta"` (prominent pulsing CTA) | Manual target selector, preset chips |
| **Validated Design / Not Approved** | `"Review & approve experiment"` / `"Approve & Run Experiment"` | Change target, refine question |
| **Approved / Not Run** | `"Run matched experiment"` | Review declared perturbation |
| **Experiment Running** | `"Experiment running..."` (progress readout, no competing CTA) | Cancel / abort |
| **Matched Runs Complete** | `"Compare what changed →"` (transition banner) | Review raw trace metrics |
| **Compare Available** | `"Explain result with Meta ↗"` | Synchronized playback, focus toggles |
| **Interpretation Complete** | `"Test the next hypothesis →"` / `"Use as next test"` | Inspect evidence provenance |

### 14.3 Single-Page Progressive Disclosure & Collapsed Summaries
Sections are laid out in a continuous single-page document and progressively revealed:
- **Section 1: Question** (`#demo-question`):
  - When in progress: Research question textarea, target picker, and primary design CTA.
  - When completed: Collapses into concise summary: `✓ Question: "<retained question text>"`. Includes a `Reopen question stage` toggle to inspect or edit without losing provenance.
- **Section 2: Experiment Design** (`#demo-design`):
  - Reveals upon validated intervention design.
  - When completed: Collapses into concise summary: `✓ Experiment design: One matched intervention (<target>) · Baseline preserved`. Includes a `Reopen design stage` toggle.
- **Section 3: Run Experiment** (`#demo-watch`):
  - Contains the twin simulation execution and telemetry monitor.
  - When running: Displays active running state with non-conflicting status indicators.
  - When completed: Collapses into concise summary: `✓ Engine run: Control + intervention completed · Matched conditions verified`.
- **Section 4: Compare Results** (`#demo-compare`):
  - Reveals when matched runs are complete.
  - Upon run completion, an unmissable transition banner appears:
    `✓ MATCHED EXPERIMENT COMPLETE — Both control and intervention runs finished under matched conditions.`
    With primary CTA: `"Compare what changed →"`.
  - Selecting it reveals the full Sprint 13C Comparison Workspace (hero result, synchronized playback, difference summary, neural topologies, causal pipeline, matched conditions trust card).
- **Section 5: Interpretation & Next Hypothesis** (`#demo-understand`):
  - Surfaces: `"Engine measurement complete. Explain result with Meta."`
  - On explicit user request, Meta AI interprets the delta.
  - Proposes the next experimental hypothesis with the primary CTA: `"Test the next hypothesis →"` or `"Use as next test"`.

### 14.4 Accessible Scroll & Focus Management (`guideViewportTo`)
Created `src/lib/web/guided-scroll.ts` to govern all automated viewport guidance:
- **`prefers-reduced-motion` compliance**: Detects `window.matchMedia("(prefers-reduced-motion: reduce)")`. Uses instant scrolling (`behavior: "auto"`) when motion is restricted, and smooth scrolling (`behavior: "smooth"`) when motion is allowed.
- **Focus Management**: Moves keyboard focus to the target section heading or primary control without triggering an unwanted secondary scroll (`target.focus({ preventScroll: true })`). Focusable headings carry `tabIndex={-1}`.
- **Strict User-Action Triggering**: Auto-scroll is only triggered by explicit user actions (e.g. clicking "Design experiment with Meta", "Approve & Run", "Compare what changed", or "Use as next test"). **Never** auto-scrolls on passive/background events (telemetry arrivals, timers, websocket pings).
- **Accessible Announcements**: Employs semantic `aria-live="polite"` status regions announcing transitions (e.g., *"Experiment design ready for review."*, *"Matched experiment complete. Compare results."*).

### 14.5 Fix for "Use as Next Test"
Previously, clicking "Use as next test" kept the new question but left the user stranded in the Compare view with an empty *"Awaiting Completed Experiment"* prompt.
**Corrected behavior in Sprint 13C.1**:
1. Retains the new proposed question text.
2. Archives the prior experiment in Evidence history.
3. Resets `instrumentMode` to `"observe"`.
4. Resets completed run state so Compare is marked unavailable (`"Available after matched runs complete."`).
5. Reveals the Question section and collapses downstream stages.
6. Exposes exactly one dominant CTA: `"Design experiment with Meta"`.
7. Smoothly guides the viewport back to Section 1 (`#demo-question`) and focuses the CTA.

### 14.6 Clear Disabled / Unavailable States in `InstrumentModeBar`
Adheres to the principle: **Prevent confusion before the click**.
- In `src/lib/web/instrument-mode.ts` and `src/app/components/instrument-mode-bar.tsx`:
  - When Compare is not yet ready, the Compare tab is disabled (`aria-disabled="true"`, `.mode-unavailable`) and displays a pill: `Unavailable — Available after matched runs complete.`
  - When Live Connectome is active, arbitrary perturbation and comparison are not scientifically supported; Perturb and Compare tabs are rendered disabled with clear explanations (`"Live Connectome does not support synthetic perturbation"`).
  - Clicking a disabled/unavailable mode tab is safely blocked.

### 14.7 Compare Controls Clarification
- Updated focus buttons in `src/app/components/embodied-experiment.tsx`:
  - `"Both Organisms"` replaced with `"Both side-by-side"`.
  - Maintained `"01 Control only"` and `"02 Intervention only"`.
- Added synchronized playback context annotation directly adjacent to the scrubber:
  - *"Synchronized playback — both runs are shown at the same simulation step."*
  - Preserved `SAME STEP / BOTH RUNS` technical badge.

### 14.8 Mobile Responsiveness (~390px Viewport)
Tested on 390px viewport (`390×844` iPhone 12/13/14 profile):
- Zero horizontal overflow (`scrollWidth === innerWidth === 390`).
- Progress journey wraps cleanly into an accessible multi-line bar.
- Dominant action cards, collapsed stage summaries, and transition banners adapt with full-width buttons.
- Comparison workspace single WebGL canvas displays focused fly view with one-touch switching between `"Both side-by-side"`, `"01 Control"`, and `"02 Intervention"`.

### 14.9 Verification & Test Suite Results
- **Unit / System / Integration Tests**: **476 passed, 0 failed** (11 new tests in `src/app/components/guided-flow.test.tsx` verifying single dominant CTA, collapsed summaries, transition banners, scroll guidance, and mode availability).
- **TypeScript & Build**: `npm run build` compiled all routes without warnings or errors.
- **Playwright Headless Browser Review**: All 8 states captured in `docs/review/sprint-13c1/`:
  1. `01-new-question-next-action.png`: Section 1 Question open with dominant CTA *"Design experiment with Meta"*.
  2. `02-design-ready-next-action.png`: Section 2 Design revealed with dominant CTA *"Approve & Run Experiment"*.
  3. `03-approved-run-next-action.png`: Approved state with dominant CTA *"Run matched experiment"*.
  4. `04-experiment-complete-compare-cta.png`: Transition banner `✓ MATCHED EXPERIMENT COMPLETE` with CTA *"Compare what changed →"*.
  5. `05-guided-compare.png`: Section 4 Compare revealed with full-width organism stage and synchronized playback note.
  6. `06-interpret-next-action.png`: Section 5 Meta interpretation card with dominant CTA *"Explain result with Meta ↗"*.
  7. `07-next-hypothesis-reset.png`: "Use as next test" transition resetting to Section 1 with new question retained and Compare disabled.
  8. `08-390-mobile-guided-flow.png`: 390px mobile view with zero overflow and wrapped journey indicators.

### 14.10 Git Diff Statistics
```
 src/app/components/embodied-experiment.tsx | 481 ++++++++++++++-
 src/app/components/embodied-world.tsx      |  20 +-
 src/app/components/guided-experiment.tsx   | 493 ++++++++++++++-
 src/app/components/instrument-mode-bar.tsx |  19 +-
 src/app/components/instrument-shell.css    | 939 +++++++++++++++++++++++++++++
 src/app/observatory.tsx                    |  47 +-
 src/lib/web/instrument-mode.ts             |  18 +-
 7 files changed, 1945 insertions(+), 72 deletions(-)
```

---

## 15. Sprint 13C.2: Mobile Guidance & Compare Toolbar Acceptance Correction

### 15.1 Mobile Human-Review Failure & Root Cause
Human review of the initial 390px mobile acceptance screenshot (`08-390-mobile-guided-flow.png`) exposed an information hierarchy failure:
- When a research question was retained and no design existed, the mobile viewport showed navigation, instrument modes, the research question, and then immediately plunged into the large (420px tall) Embodied World organism stage and behaviour telemetry.
- The dominant next action—`"Design experiment with Meta"`—was buried far below the organism stage, completely offscreen and invisible in the first viewport.
- **Root Cause**: The desktop layout places the Embodied World on the left (~62%) and the action rail on the right (~38%) side-by-side. When stacked naively into a single vertical column on mobile, DOM order placed the entire rich 3D visualization before the action card, forcing mobile users to scroll through a large 3D scene before discovering what action to take next.

### 15.2 Responsive Composition Correction & CTA Ordering
Sprint 13C.2 corrects the mobile information hierarchy by prioritizing **Current Scientific Task Before Rich Visualization**:
- At mobile/narrow widths (`<= 960px`), the dominant workflow action is placed **immediately after** the research question / completed-stage summaries / journey state, and **BEFORE** the Embodied World or Compare visualization.
- **State Machine Hierarchy on Mobile**:
  1. **Question Retained / No Design**:
     `Question` $\rightarrow$ `NEXT ACTION: Design experiment with Meta →` $\rightarrow$ `Embodied World`
  2. **Design Ready / Validated**:
     `Question ✓` $\rightarrow$ `Experiment design ready` $\rightarrow$ `NEXT ACTION: Approve & Run Experiment →` $\rightarrow$ `Embodied World`
  3. **Matched Runs Complete**:
     `Question ✓` $\rightarrow$ `Design ✓` $\rightarrow$ `Engine run ✓` $\rightarrow$ `NEXT ACTION: Compare what changed →` $\rightarrow$ `Visualization`
  4. **Compare Available**:
     `Measured result` $\rightarrow$ `NEXT ACTION: Explain result with Meta ↗` $\rightarrow$ `Secondary technical evidence`
  5. **Interpretation Complete**:
     `Interpretation summary` $\rightarrow$ `NEXT ACTION: Test the next hypothesis →` $\rightarrow$ `Technical/evidence details`

### 15.3 Shared Handler Architecture (One Action, One Handler)
- **Zero Logic Duplication**: Both mobile and desktop action buttons trigger the exact same underlying state transition handlers:
  - Mobile `"Design experiment with Meta →"` and desktop `"Design with Meta ↗"` both invoke `requestDesign()` $\rightarrow$ `props.onDesign(strength)`.
  - Mobile `"Approve & Run Experiment →"` and desktop `"Approve & Run Experiment"` both invoke `approveRun()` $\rightarrow$ `props.onRun(strength)`.
  - Both invoke `props.onCompare()` for comparison transition and `props.onNext()` for next hypothesis adoption.
- **One Dominant Action in Viewport**: On mobile (`@media (max-width: 960px)`), the duplicate `.scientist-action` in the right rail is suppressed with `display: none !important`, ensuring users never see competing or duplicate buttons in the same mobile view.
- **Accessibility & DOM Reading Order**: Content is ordered logically in the DOM: `Question` $\rightarrow$ `Active Next Action Card` $\rightarrow$ `Embodied World` $\rightarrow$ `Secondary Context Details`. Screen readers and tab keys naturally encounter the next action before the 3D canvas.

### 15.4 Compare Toolbar Responsive Grouping
The synchronized playback toolbar was recomposed into three clean rows to eliminate visual collisions at intermediate (1024px tablet) and mobile (390px) viewports:
- **Row 1 (`.compare-toolbar-context`)**:
  - `SAME STEP / BOTH RUNS` badge
  - `"Synchronized playback — both runs are shown at the same simulation step."` context note
- **Row 2 (`.compare-toolbar-playback`)**:
  - `Play/Pause` toggle button
  - Timeline range scrubber
  - `SIMULATION STEP NN / MM` readout
  - `Replay` button
  - `Reset` button
- **Row 3 (`.compare-focus-toolbar`)**:
  - `VIEW:` label
  - `Both side-by-side`
  - `01 Control only`
  - `02 Intervention only`
- On wide desktop (`min-width: 1200px`), CSS Grid arranges Rows 2 and 3 into a clean side-by-side layout; on tablet and mobile, they wrap cleanly without collisions or horizontal overflow (`scrollWidth === innerWidth`).

### 15.5 Verification & Acceptance Test Suite
- **Unit / System / Integration Tests**: **484 passed, 0 failed** (8 new tests added in `src/app/components/guided-flow.test.tsx` verifying mobile CTA ordering, toolbar row grouping, single WebGL canvas enforcement, and desktop rail preservation).
- **TypeScript & Production Build**: `npm run build` compiled all routes cleanly with zero type errors.
- **Single Canvas Strict Enforcement**: Both desktop and mobile viewports strictly enforce a maximum of 1 WebGL canvas.
- **Zero Live Calls**: Deterministic engine and offline fixtures verify all paths with no automatic Meta calls.

### 15.6 Review Screenshots Reference
Captured via Playwright in `docs/review/sprint-13c2/` (and mirrored to `docs/review/sprint-13c/`):
1. `01-390-question-design-next.png` — Mobile 390px viewport: Question retained, `"Design experiment with Meta →"` visible in first viewport before Embodied World.
2. `02-390-design-approve-next.png` — Mobile 390px viewport: Design validated, `"Approve & Run Experiment →"` visible in first viewport before Embodied World.
3. `03-390-complete-compare-next.png` — Mobile 390px viewport: Matched runs complete, `"Compare what changed →"` transition banner visible before visualization.
4. `04-390-compare-explain-next.png` — Mobile 390px viewport: Compare workspace hero result with prominent `"Explain with Meta ↗"` action.
5. `05-390-next-hypothesis.png` — Mobile 390px viewport: Section 5 Next Hypothesis with `"Test the next hypothesis →"` CTA preceding technical details.
6. `06-1024-compare-toolbar.png` — Tablet 1024px viewport: 3-row Compare toolbar wrapped cleanly with zero collision and zero horizontal overflow.
7. `07-1440-desktop-regression.png` — Desktop 1440px viewport: Unchanged organism-first desktop layout with side-by-side action rail and single canvas.

### 15.7 Git Diff Statistics
```
 src/app/components/embodied-experiment.tsx |  486 ++++++++++++-
 src/app/components/embodied-world.tsx      |   20 +-
 src/app/components/guided-experiment.tsx   |  545 +++++++++++++-
 src/app/components/instrument-mode-bar.tsx |   19 +-
 src/app/components/instrument-shell.css    | 1091 ++++++++++++++++++++++++++++
 src/app/observatory.tsx                    |   47 +-
 src/lib/web/instrument-mode.ts             |   18 +-
 7 files changed, 2154 insertions(+), 72 deletions(-)
```
