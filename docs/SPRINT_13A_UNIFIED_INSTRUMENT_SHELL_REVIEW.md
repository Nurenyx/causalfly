# Sprint 13A — Unified Instrument Shell Review

**Date**: 2026-10-31
**Repository**: `C:\Users\Jason\Documents\GitHub\causalfly`
**Branch**: `feat/sprint-13-unified-experiment-workspace`
**Sprint Status**: `Sprint 13A complete. No commit made. No deployment performed. Stop for human review.`

---

## 1. Executive Summary & Goals

Sprint 13A establishes the unified scientific-instrument shell for CausalFly, transforming the product experience from a loose collection of disparate pages into **one coherent scientific instrument** grounded in the primary research workflow:

$$\text{OBSERVE} \longrightarrow \text{PERTURB} \longrightarrow \text{COMPARE}$$

Underlying mental model established:
- **ORGANISM** (dominant 3D embodiment view)
- **NEURAL STATE** (connectome & synthetic activity)
- **INTERVENTION** (controlled perturbation or stimulus)
- **BEHAVIOURAL RESULT** (measured phenotypic delta)
- **EVIDENCE** (traceable provenance & records)

All changes strictly follow the **Scientific Accuracy & Provenance Gate**, citing the final peer-reviewed *Cell* publication (Berg et al., 2026, DOI: 10.1016/j.cell.2026.08.015), quarantining mockup artifacts, keeping Quest 3 status truthful, and preventing any WebGL canvas proliferation.

---

## 2. Exact Files Changed

### Modified Existing Files
1. `src/app/observatory.tsx`
   - Set direct workspace entry into the **Scientific Experiment Workspace** (`home: false` by default, starting in `observe` mode).
   - Added `InstrumentModeBar` for first-class **Observe / Perturb / Compare** presentation navigation.
   - Wired truthful `QuestStatus`, `BrainServerStatus`, and `ConnectomeStatus` into top status bar badges.
   - Integrated dismissible session-scoped `FirstRunBanner`.
   - Updated footer disclaimer with verified concise provenance constants and anatomical sex-mismatch disclosure.
2. `src/app/components/status-indicator.tsx`
   - Added neutral `QuestStatus` component (truthfully reporting "Quest 3 — Not connected; Standalone XR application slot").
   - Added dual-channel `BrainServerStatus` component (separating read-only observatory vs. experimental sensory/control).
   - Added `ConnectomeStatus` displaying verified `male-cns:v1.0` provenance and separating published vs internal counts.
3. `src/app/components/workspace-navigation.tsx`
   - Maintained primary workspaces (`Experiment`, `Live Connectome`, `Evidence`) while adding explicit `onOpenOverview` handler for accessing product orientation/overview without creating a secondary navigation system.
4. `src/app/globals.css`
   - Imported new `./components/instrument-shell.css`.

### Newly Created Files
5. `src/lib/sources/provenance-constants.ts`
   - Centralized published reference metadata (Berg et al., *Cell* 189(18), Sept 3, 2026, DOI: 10.1016/j.cell.2026.08.015) and internal runtime counts, keeping them distinctly labelled.
6. `src/lib/web/instrument-mode.ts`
   - Implemented capability check rules (`checkModeCapability`) enforcing that Live Connectome Simulation cannot imply unsupported arbitrary neural perturbation or matched perturbation comparison.
7. `src/app/components/instrument-mode-bar.tsx`
   - Implemented the Observe / Perturb / Compare top workflow bar with capability banners and one-click fallback routes.
8. `src/app/components/first-run-banner.tsx`
   - Lightweight, dismissible session-scoped introductory contextual banner using `useSyncExternalStore`.
9. `src/app/components/instrument-shell.css`
   - Responsive styling for the instrument mode bar, first-run banner, status indicator tone variants, and 390px mobile viewports.
10. `src/app/components/instrument-shell.test.tsx`
    - Unit and component tests verifying mode bar rendering, truthful Live Connectome capability restrictions, Quest status truthfulness, Brain Server channel separation, and Connectome provenance formatting.
11. `scripts/sprint13a-browser-review.mjs`
    - Browser automation script targeting desktop (1920px, 1440px) and mobile (390px) viewports.

---

## 3. Old vs. New Information Architecture

| Dimension | Old Architecture | New Sprint 13A Instrument Architecture |
| :--- | :--- | :--- |
| **Initial Entry** | Landed on marketing-style `HomeOverview` page requiring clicks to enter the simulator. | Boots directly into the **Scientific Experiment Workspace** in `Observe` mode with the 3D organism immediately visible. Overview remains 1 click away via sidebar "Overview". |
| **Workflow Framing** | Linear step progression (`ASK` → `INPUT` → `DESIGN` → `RUN` → `UNDERSTAND`). | Primary instrument framing: **OBSERVE → PERTURB → COMPARE**, mapped cleanly over underlying experiment engines. |
| **System Status** | Only showed `MetaStatus` and `FruitFlyStatus`. | Full truthful instrument status: `MetaStatus`, `BrainServerStatus` (observatory + sensory), `ConnectomeStatus` (`male-cns:v1.0`), `QuestStatus` ("Quest 3 — Not connected"), `FruitFlyStatus`. |
| **First-Run Experience** | Full-page hero banner blocking direct interaction. | Non-blocking, dismissible top banner: *"Observe baseline organism and neural state → Perturb a supported system → Compare retained evidence."* |
| **Live Connectome Capabilities** | Users could accidentally attempt comparisons without understanding source limits. | Mode bar displays `N/A` badge on Perturb/Compare when on Live Connectome, explaining: *"Arbitrary neural perturbation is not supported for Live Connectome Simulation. Current source supports observation and experimental sensory proxy only."* with a one-click button to switch to Synthetic Fixture. |

---

## 4. State & Capability Mapping

The presentation abstraction maps directly onto existing verified state machines without duplicating state:
- **`Observe` mode**:
  - For `SYNTHETIC_FIXTURE`: Maps to observatory cockpit (`workspace: "observatory"`).
  - For `FRUITFLY_XR`: Maps to Live Connectome observatory (`workspace: "live"`).
- **`Perturb` mode**:
  - For `SYNTHETIC_FIXTURE`: Scrolls smoothly to `#demo-question` and `#perception-source` for intervention selection and stimulus adjustment.
  - For `FRUITFLY_XR`: Flags unsupported capability via `checkModeCapability`, surfacing informative banner and switch button.
- **`Compare` mode**:
  - For `SYNTHETIC_FIXTURE`: Maps to `workspace: "compare"`, rendering `CompareDashboard` when results exist or `CompareRequirements` when awaiting a trial.
  - For `FRUITFLY_XR`: Flags unsupported capability (no matched perturbation trials on live connectome).

---

## 5. Scientific Wording & Provenance Changes

1. **Published Authority Reference**:
   - Pinned to: Berg et al. (2026), *"Sexual dimorphism in the complete Drosophila male central nervous system connectome"*, *Cell* 189(18), September 3, 2026 (`DOI: 10.1016/j.cell.2026.08.015`).
2. **Safe UI Policy**:
   - Primary chrome displays concise identity: `Connectome: male-cns:v1.0`.
   - Tooltip / details popover separates counts:
     - `166,700 published CNS neurons` (`11,710` types)
     - `176,422 loaded structural nodes` (`6,287,749` loaded edges)
     - `141,781 mapped soma coordinates`
3. **Sex Mismatch Disclosure**:
   - Persisted in status tooltip and footer disclaimer: *"Female anatomical visual mesh; male CNS neural simulation. Visual anatomy is not sex-matched."*
4. **Quest 3 Reality**:
   - Truthfully labeled *"Quest 3 — Not connected; Standalone XR application slot"*. Never falsely turns green from Tailscale or Brain Server socket presence.

---

## 6. Test Suite & Verification Results

### Test Suite Counts
- **Pre-13A Test Baseline**: 62 component tests, 374 total unit/system tests.
- **Sprint 13A Baseline**: 68 component tests, 374 unit/system tests.
- **Post-13A.1 Test Suite**: **74 component tests, 374 unit/system tests (all 74/74 component tests and 374/374 unit tests passing, total 448 tests passing, 0 failures, 0 skipped)**.
- **TypeScript (`npx tsc --noEmit`)**: Clean exit (code 0).
- **ESLint (`npm run lint`)**: Clean exit (code 0).
- **Production Build (`npm run build`)**: Compiled successfully, all 12 static/dynamic routes generated cleanly.
- **Git diff check (`git diff --check`)**: Clean exit (code 0).

---

## 7. Responsive Acceptance (390px, 1024px, 1440px, 1920px)

- **390px mobile**:
  - Tested zero horizontal page overflow (`scrollWidth <= innerWidth`).
  - Instrument Mode Bar collapses into compact touch-friendly buttons (`observe`, `perturb`, `compare`).
  - First-run banner wraps cleanly with top-right dismiss button.
  - Status indicators wrap neatly into the secondary header tier.
- **1024px tablet**:
  - Mode bar and top status indicators sit on balanced rows.
- **1440px / 1920px desktop**:
  - Full instrument layout with clear visual hierarchy, dominant 3D world view, and accessible scientific controls.

---

## 8. WebGL Canvas Budget Compliance

- **Total WebGL Canvases Added**: **0**.
- Exactly 1 primary WebGL context is maintained for the embodied fly world.

---

## 9. Known Limitations & Next Sprint (13B)

- In Sprint 13A, the inner cockpit panels (question, stimulus, autonomy controls) remain in their existing functional composition; full visual restructuring to match the 3-column instrument layout of the mockups will occur in Sprint 13B.
- Quest 3 streaming remains an unconfigured future slot as planned.

---

## 10. Git Diff Stat

```
 src/app/components/autonomy-panel.tsx       |  72 +++++++++++++--
 src/app/components/embodied-experiment.tsx  |   5 +-
 src/app/components/guided-experiment.tsx    |   3 +-
 src/app/components/status-indicator.tsx     | 134 ++++++++++++++++++++++++++--
 src/app/components/workspace-navigation.tsx |  43 ++++++++-
 src/app/globals.css                         |   1 +
 src/app/observatory.tsx                     |  99 ++++++++++++++++++--
 7 files changed, 335 insertions(+), 22 deletions(-)
```

---

## 11. Sprint 13A.1 — Human Acceptance Corrections & Regression Suite

Following human acceptance testing of the Sprint 13A shell, four key interaction and scientific-trust issues were addressed:

### Finding 1: Perturb Mode Navigation State & Persistence
- **Root Cause**: `observatory.tsx` previously reset `instrumentMode` to `"observe"` upon navigating within the experiment workspace or re-rendering controls.
- **Fix**:
  - `instrumentMode` state now persists across navigation and view re-renders when in `"perturb"`.
  - On the Synthetic Fixture, switching to Perturb maintains `instrumentMode === "perturb"`, surfaces a dedicated `.perturb-mode-banner` explaining the mode, and provides quick navigation links to intervention selection (`#demo-question`) and perceptual stimulus controls (`#demo-watch`).
  - On the Live Connectome Simulation, attempting to enter Perturb is gracefully prevented via `checkModeCapability`, preserving an informative notification explaining why arbitrary neural perturbation is unsupported without fabricating state.
- **Regression Tests**:
  - `Observe -> Perturb` maintains Perturb mode active on Synthetic Fixture.
  - `Perturb -> Compare` maintains requested mode active where capability allows.
  - `Compare -> Perturb` returns to active Perturb state without dropping to Observe.
  - Live Connectome keeps Perturb blocked with capability explanation.

### Finding 2: Present Stimulus & Closed-Loop Autonomy Trust
- **Root Cause**: When connected to external telemetry (`FRUITFLY_XR`) without a configured or connected closed-loop Brain control endpoint (`NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL`), clicking "Present stimulus" misleadingly suggested connectome-driven closed-loop sensorimotor control.
- **Fix**:
  - `AutonomyPanel` inspects `configuredBrainEndpoint` and live transport status.
  - When closed-loop control is unavailable, the button is qualified as `"Present stimulus (visual only · no Brain control)"`.
  - A prominent notice banner (`.stimulus-brain-warning`) explains: *"Closed-loop Brain control is not connected. Telemetry observation remains available. Presenting a stimulus in this mode tests visual perception and arena geometry without closed-loop connectome control. Baseline autonomous steering will continue."*
  - Verified that the procedural autonomy engine never fabricates a neural decoder `ESCAPE` response merely because a stimulus is presented; procedural `TAKEOFF_ESCAPE` triggers only upon receiving a genuine, eligible decoder `ESCAPE` signal from the connectome.
- **Regression Tests**:
  - Presenting stimulus without Brain control does not trigger escape takeoff.
  - Presenting stimulus with eligible decoder ESCAPE signal triggers procedural escape.
  - `AutonomyPanel` renders qualified button text and warning banner when control is unavailable.

### Finding 3: Brain Server Status Dual-Channel Separation
- **Root Cause**: A single status badge could not distinguish between read-only observatory telemetry and bidirectional sensory/control sockets.
- **Fix**:
  - Top status bar displays a 3-tier primary badge:
    1. `"Brain · Telemetry Live"` (amber tone): Observatory telemetry is connected, but closed-loop control is inactive, standby, or unavailable.
    2. `"Brain · Telemetry + Control"` (green tone): Both observatory telemetry and closed-loop control are connected and active.
    3. `"Brain · Disconnected"` (neutral tone): Neither channel is connected.
  - The status popover breaks down channel details explicitly:
    - `• Read-only observatory telemetry: Connected & streaming (via FruitFly XR / local socket)`
    - `• Closed-loop sensory/control: <Live status / Standby / Disconnected>`
- **Regression Tests**:
  - `BrainServerStatus` distinguishes telemetry-only vs. telemetry+control vs. disconnected.

### Finding 4: Meta Status Semantics
- **Fix**:
  - Clarified `MetaStatus` to explicitly state that live mode is enabled and configured on-demand, without falsely implying a continuous backend connection ping when no model call is running.
- **Regression Tests**:
  - `MetaStatus` accurately reflects on-demand readiness without claiming continuous backend verification.

---

## 12. Sprint 13A.2 — Final Acceptance Cleanup (Status Truthfulness & Whitespace)

Following human video review of Sprint 13A and 13A.1, two status-truthfulness defects and whitespace issues were resolved:

### 1. Brain Server Status: Connected is Not the Same as Live
- **Contradiction Identified**: The top bar badge previously displayed `"Brain · Telemetry Live"` while the Live Connectome workspace simultaneously showed `"WAITING FOR DATA"` / `"No simulation frames received yet"`.
- **Truthful 5-State Model Established**:
  1. **State 1: Disconnected**: Neither channel connected.
     - Badge: `Brain · Disconnected` (neutral tone)
     - Telemetry detail: `Disconnected`
  2. **State 2: Connected / Waiting**: Socket/source connected, but no validated simulation frames received yet (`!snapshot.evidence`).
     - Badge: `Brain · Telemetry Standby` (amber tone; strictly NEVER "Live" or "Streaming")
     - Telemetry detail: `Connected / waiting for first frame`
  3. **State 3: Retained / Stale**: Socket connected, but only a retained/historical snapshot exists or frame age > 5000ms (`status.historical` / `label: "STALE"`).
     - Badge: `Brain · Telemetry Standby` (amber tone; strictly NEVER "Live" or "Streaming")
     - Telemetry detail: `Last snapshot / stale (no current frames)`
  4. **State 4: Telemetry Live**: Observatory actively receiving fresh/current frames within the runtime stream-health window (`status.live === true`).
     - Badge: `Brain · Telemetry Live` (green tone)
     - Telemetry detail: `Current / fresh (streaming)`
  5. **State 5: Telemetry + Control**: Observatory telemetry is live AND experimental closed-loop sensory/control channel is genuinely connected and active (`status.live && controlAvailable`).
     - Badge: `Brain · Telemetry + Control` (green tone)
     - Telemetry detail: `Current / fresh (streaming)`
     - Closed-loop detail: `Connected / active`
- **Two Java Brain Server Channels Kept Scientifically Distinct in Popover**:
  - `• Read-only observatory telemetry`: Explicitly differentiates `Disconnected`, `Connected / waiting for first frame`, `Current / fresh (streaming)`, or `Last snapshot / stale (no current frames)`.
  - `• Closed-loop sensory/control`: Explicitly differentiates `Not configured`, `Configured / standby`, `Connected / active`, or `Unavailable`.
  - Raw port numbers remain hidden from UI; notice clarifies this is the Brain simulation service and does not launch the FruitFly XR Quest application.

### 2. Meta Status: Live Mode is Not Verified Provider Health
- **Defect Identified**: Top bar badge displayed `"META LIVE"`, followed by `"Meta Model API authentication failed."` implying continuously verified healthy connectivity when no call had yet succeeded.
- **Truthful Semantics Established**:
  - When live mode is configured/enabled on-demand:
    - Primary badge: `Meta · Live mode` (amber tone; indicates configuration readiness rather than verified health).
    - Popover tooltip explicitly confirms: *"No live provider ping or health check is performed in the background. Connectivity is verified on explicit request. On-demand inference only: no continuous polling or background requests."*
  - When authentication fails (e.g., invalid/expired API key):
    - Primary badge: `Meta · Auth error` (amber tone).
    - Popover tooltip clearly reports: *"Meta Model API authentication failed. Check credentials in server configuration. No live provider request can run until credentials are restored."*
  - When executing an explicit request:
    - Primary badge: `Meta · Working` (live) or `Meta · Fixture Working` (offline).
  - When in offline fixture mode:
    - Primary badge: `Meta · Offline Fixture` (neutral tone).

### 3. Whitespace & Cleanliness Gate
- Trailing whitespace removed from all modified and newly created files (`src/app/components/instrument-shell.css`, `docs/SPRINT_13A_UNIFIED_INSTRUMENT_SHELL_REVIEW.md`).
- `git diff --check` verified 100% clean with zero whitespace errors.

### 4. Preservation of Prior Corrections
- **Perturb Persistence**: Switching to Perturb mode on the Synthetic Fixture persists `instrumentMode === "perturb"` and displays the `.perturb-mode-banner` across view changes and re-renders. Live Connectome gracefully blocks arbitrary perturbation with scientific explanation.
- **Closed-Loop Stimulus Qualification**: When Brain control is not connected, the stimulus button is qualified as `"Present stimulus (visual only · no Brain control)"` and accompanied by the `.stimulus-brain-warning` note. The procedural engine never fabricates an escape response without genuine connectome decoder signals.

### 5. Complete Working-Tree Inventory & Statistics

#### Modified Tracked Files
1. `src/app/components/autonomy-panel.tsx`: Closed-loop sensory/control 4-state reporting (`Not configured`, `Configured / standby`, `Connected / active`, `Unavailable`).
2. `src/app/components/embodied-experiment.tsx`: Propagates control status callback.
3. `src/app/components/guided-experiment.tsx`: Propagates control status callback.
4. `src/app/components/navigation-status.test.tsx`: Updated MetaStatus assertions to match truthful `Meta · Live mode` and `Meta · Working` labels.
5. `src/app/components/status-indicator.tsx`: Truthful 5-state `BrainServerStatus`, dual-channel popover, and `MetaStatus` live-mode / auth-error semantics.
6. `src/app/components/workspace-navigation.tsx`: Overview orientation action.
7. `src/app/globals.css`: Imports instrument-shell.css.
8. `src/app/observatory.tsx`: Wires error and control status to badges, manages Perturb mode persistence and banner.

#### Newly Created Untracked Files
9. `src/lib/sources/provenance-constants.ts`: Berg et al. (Cell 2026) verified publication and internal counts.
10. `src/lib/web/instrument-mode.ts`: Observe/Perturb/Compare capability checks.
11. `src/app/components/instrument-mode-bar.tsx`: Observe/Perturb/Compare navigation bar with capability banners.
12. `src/app/components/first-run-banner.tsx`: Non-blocking dismissible orientation banner.
13. `src/app/components/instrument-shell.css`: Responsive styles, 390px mobile rules, zero trailing whitespace.
14. `src/app/components/instrument-shell.test.tsx`: 5-state BrainServerStatus tests, MetaStatus semantics, Perturb persistence, stimulus trust boundary tests.
15. `scripts/sprint13a-browser-review.mjs`: Responsive layout evaluation script.
16. `docs/SPRINT_13A_UNIFIED_INSTRUMENT_SHELL_REVIEW.md`: Comprehensive Sprint 13A, 13A.1, and 13A.2 review documentation.

### 6. Final Test Counts
- Unit and system tests: **374/374 passing**
- Component and integration tests: **74/74 passing**
- Total passing tests: **448/448 passing (0 failures, 0 skipped)**
- TypeScript (`npx tsc --noEmit`): clean exit (`code 0`)
- ESLint (`npm run lint`): clean exit (`code 0`)
- Production Build (`npm run build`): compiled and prerendered all 12 routes successfully (`code 0`)
- Whitespace Check (`git diff --check`): clean exit (`code 0`)

---

SPRINT 13A.2 FINAL ACCEPTANCE CLEANUP COMPLETE.
NO COMMIT MADE.
NO DEPLOYMENT PERFORMED.
STOP FOR HUMAN REVIEW.
