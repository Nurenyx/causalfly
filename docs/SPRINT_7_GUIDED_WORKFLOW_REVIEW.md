# Sprint 7 — Guided workflow review

## Review status and baseline

Protected scientific baseline: `c9d10f4` / `causalfly-assistant-v0.6`. On continuation, the interrupted work was already saved in `75ae24a` (`wip: preserve interrupted Sprint 7 guided workflow`). That existing commit was preserved. This continuation created no commits; its changes remain uncommitted.

Preview: **http://localhost:3018/**. This review server explicitly runs with `CAUSALFLY_FAKE_META=1`. It does not demonstrate live Meta output. Normal runtime retains the existing live Meta client and configuration behavior.

## Already completed before continuation

- Inspected AGENTS.md, installed Next.js client/route-handler documentation, all three design-reference images, the Live Session implementation, assistant, Meta contracts and scientific guardrails.
- Split the synthetic UI flow into explicit design, approve/run, and interpret requests. Retained validated specs and immutable engine evidence server-side.
- Added source-aware scientific stage states, Compare prerequisites, a design review, and assistant workflow context.
- Preserved interactive connectome geometry, measurement components and existing evidence views.
- Added tests for approval gates, request deduplication, immutable measurements and source boundaries.
- Repaired the legacy Live Session assertion: interpretation is now a navigation callback, with no direct fetch/model call in the live observer.
- Passed the full suite, demos, lint, TypeScript and build at that checkpoint.
- The interrupted visual review found oversized progress cells and comparison overflow. It was not accepted as final.

## Changes in this continuation

The primary model is now **ASK → TEST → UNDERSTAND**. The scientific sequence is retained under an expandable “Scientific steps & requirements” control. Existing reducer state is extended rather than replaced by another state system.

Scoped global navigation rules to the sidebar; those rules had constrained workflow text to icon-sized columns. Added responsive progress, a plain-English measured-result headline and before/after signal bars. Kept measurements and the explanation rail together instead of replacing the result with a separate AI page.

The initial question is “What happens if I silence the primary pathway?” Meta proposes a checked design. The user sees “One change. Two runs.” with all declared settings accessible before approval. Raw node identifiers and complete provenance remain available. Friendly diagram labels are display-only.

Ask CausalFly is the persistent interface: local answers, context, next action, retained explanation and follow-up question. The desktop rail uses the same name; Meta is the underlying design/explanation capability rather than another destination.

## Information architecture

| Before | After |
| --- | --- |
| Observatory, Live Session, Compare, AI Scientist, Evidence | Experiment, Live Connectome, Evidence |
| Design, run and interpretation combined | Explicit design → approval/run → explicit explanation |
| Compare looked like a separate destination | Comparison is the measured output of Experiment |
| Separate AI page | Ask CausalFly rail beside results, plus persistent drawer |
| Scientific workflow required upfront reading | Ask/Test/Understand first; scientific status/details expandable |

Internal workspace identifiers remain compatible: `observatory`, `live`, `compare`, `scientist`, `evidence`. The full scientific analysis component remains accessible in expandable details.

## Exact judge-facing sequence

### Synthetic

1. **ASK:** Read the suggested what-if question or type a new one. Choose **Design with Meta**. Typing and opening the assistant make no provider requests.
2. **TEST:** Inspect “One change. Two runs.” Expand the hypothesis and parameters if desired. Choose **Approve & run test**.
3. The unchanged deterministic engine runs control and silence-intervention conditions, compares valid matched evidence, and automatically shows the measured before/after view.
4. For the existing demo evidence, the local headline is **“Signal reduced 50%. Response delayed by 1 step.”** It is calculated from the actual peak outputs 1 and 0.5 and crossing steps 3 and 4. It is not hardcoded as an outcome.
5. **UNDERSTAND:** Choose **Explain with Meta**. The immutable measured diagrams stay visible; a separate model-authored explanation and proposed next experiment appear.
6. Choose **View proposed next experiment** / **Use as Next Question**. A proposal loads the question without running or calling Meta. Evidence remains inspectable.

A zero control baseline yields no percentage. A missing threshold crossing yields “Response timing not comparable,” never zero delay. Percentages are display arithmetic rounded to three significant figures; engine records are unchanged.

### FruitFly XR

1. Save a question locally in Experiment, even before telemetry exists.
2. Open Live Connectome, connect explicitly, and run a simulation using the existing FruitFly client.
3. View received simulated activity over published soma coordinates. Rotate, zoom, pan and reset remain available; Projection and ID raster remain alternatives.
4. Inspect retained traces and deterministic/local answers. Choose **Explain with Meta** only when a question and server-retained evidence are available.
5. Meta explains the frozen observation window and proposes the evidence needed for a future controlled test. It does not execute an XR intervention.
6. Compare remains locked. Inspect matched-trial requirements and session evidence instead.

## Workflow state and requirements

The existing workspace reducer retains the question, approved design, measured result, interpretation and source-specific question state across navigation/source switching. A derived presentation model exposes READY, ACTIVE, COMPLETE and LOCKED states with reasons. NOT APPLICABLE is part of the state vocabulary, but no unavailable causal comparison is disguised as not applicable.

The three-step indicator shows the current user-facing phase; scientific completion describes record availability, not which page the user has visited.

Synthetic Compare checks: validated ExperimentSpec, control result, intervention result, same engine/network/experiment/stimulus/seed/maxSteps/outputThreshold, and only the declared perturbation differing. The existing comparison engine enforces matching.

FruitFly Compare checks: matched control session (missing), matched intervention session (missing), comparable source/configuration (unknown), intervention provenance (missing), matched stimulus conditions (unknown). Receiving observational frames does not satisfy these requirements.

## Meta runtime touchpoints and separation of responsibilities

| Explicit action | Runtime behavior |
| --- | --- |
| Design with Meta | Existing designer calls the configured client, validates the proposal against the unchanged supported network, retains the validated design |
| Approve & run test | Engine-only execution; no Meta client construction or call |
| Explain with Meta — synthetic | Existing interpreter accepts only server-issued frozen engine evidence; returns separate interpretation, limits/confounders and next-experiment proposal |
| Explain with Meta — FruitFly | Existing observational endpoint uses a frozen server-retained session/window and exact question |
| View/use next proposal | Local navigation/question loading; proposal was already included in explanation, so no redundant model call |

Successful synthetic design/interpretation requests retain task, mode, configured model and request/completion timestamps in Evidence. A fake response is explicitly labeled as a template. Existing FruitFly frozen-window provenance remains inspectable. No new report-synthesis call was added.

Ask CausalFly answers locally where supported, shows source/session/experiment, current stage and available evidence, and exposes the contextual next action. Opening it is inert with respect to Meta. General questions without supporting evidence remain bounded by existing deterministic response behavior.

## Scientific guardrails

- No changes to the deterministic experiment engine, synthetic network, comparison semantics or raw measurements.
- No FruitFly XR repository or brain-server changes.
- Published structure and simulated activity remain distinct. No invented connection geometry or Quest video.
- XR telemetry is observational; decoder output is not measured physical behavior.
- Model output never overwrites TrialResult, ExperimentComparison, received telemetry or provenance.
- Strict schemas and the engine-issued evidence gate remain in use.
- Staged requests accept opaque retained IDs rather than client-supplied measurements.
- Partial/invalid live configuration still fails; no silent fake fallback was introduced.
- No automatic provider calls on navigation, source selection, question typing or assistant opening.
- Tests and automated browser review made **zero live Meta calls**.

## Validation

- `npm test`: **240 passing** (226 library tests + 14 component tests), including staged workflow, null/zero-baseline summary cases and unchanged scientific suites.
- `npm run experiment:demo`: passed; original outputs retained.
- `npm run experiment:ai-demo -- --fake`: passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm run build`: passed, explicitly fake Meta during verification.
- `git diff --check`: passed.
- Functional browser preflight saved no screenshots. One final visual capture pass saved 13 screenshots.
- Edge/Chromium: 1920×1080, 1440×1080 and 390×844; no horizontal overflow and no console/page errors.
- Checked source switching and result preservation, approval before measurement, measured results before explanation, follow-up question loading, assistant context, locked/unlocked Compare, evidence navigation, 3D rotate/zoom/pan/reset and projection.
- Browser requests: explicit synthetic design, run and interpret; one intercepted FruitFly analysis using a validated fake response over genuine recorded frames. No navigation/opening-triggered POSTs.
- `browser-checks.json` records dimensions, actions and errors.

The single visual review revealed a stale synthetic notice after switching sources. Source selection now clears it. Two form help labels were shortened, and “Keep every signal on” was corrected to “Leave the network unchanged” to avoid implying constant activity. These small corrections were re-tested and rebuilt after capture; no second screenshot/refinement pass was performed. Screenshots therefore retain those pre-correction strings.

## Final review artifacts

[Contact sheet](review/sprint-7/contact-sheet.jpg)

Final screenshot manifest (all Meta output is offline/template; FruitFly images replay genuine recorded simulation evidence):

- [Synthetic ASK, 1920](review/sprint-7/01-synthetic-ask-1920.png)
- [Synthetic ASK, 390](review/sprint-7/01-synthetic-ask-390.png)
- [Synthetic DESIGN, 1920](review/sprint-7/03-synthetic-design-1920.png)
- [Measured result, 1920](review/sprint-7/04-synthetic-measured-compare-1920.png)
- [Measured result, 1440](review/sprint-7/04-synthetic-measured-compare-1440.png)
- [Measured result, 390](review/sprint-7/04-synthetic-measured-compare-390.png)
- [Ask CausalFly expanded](review/sprint-7/05-assistant-expanded-1920.png)
- [Synthetic explanation and proposal](review/sprint-7/06-synthetic-meta-interpret-1920.png)
- [FruitFly observe, 1920](review/sprint-7/08-fruitfly-observe-1920.png)
- [FruitFly observe, 1440](review/sprint-7/08-fruitfly-observe-1440.png)
- [FruitFly observe, 390](review/sprint-7/08-fruitfly-observe-390.png)
- [FruitFly explanation/test next](review/sprint-7/10-fruitfly-meta-test-next-1920.png)
- [FruitFly locked requirements](review/sprint-7/11-fruitfly-compare-locked-1920.png)

Other screenshots already saved by the interrupted WIP are historical, not part of this final manifest: `01-synthetic-ask-1440.png`, `02-synthetic-compare-locked-1920.png`, `03-synthetic-design-390.png`.

Reproduce offline review: prepare fixtures with `node node_modules/tsx/dist/cli.mjs --conditions=react-server scripts/assistant-review-fixtures.ts`; start the built server with `CAUSALFLY_FAKE_META=1` on 3018; run `node scripts/guided-browser-review.mjs`. Compose the sheet with `scripts/guided-contact-sheet.ps1`. Replay exists only in review tooling, never the product runtime.

## Manual acceptance procedure

1. Open the preview in a fresh tab. Without reading scientific details, identify Ask/Test/Understand and Design with Meta.
2. Design the suggested question. Open test settings; verify target, stimulus, seed, window and threshold. No measured result should exist before approval.
3. Approve/run. Identify the 50% signal reduction, one-step response delay and before/after plots. Play or scrub recorded activity.
4. Explain with Meta. Confirm template labeling in this preview, unchanged measurements, limitations and follow-up proposal.
5. Use the proposed next question. Confirm no automatic design/run occurs. Inspect Evidence and runtime provenance.
6. Open Ask CausalFly. Verify stage, source, experiment and evidence. Close/reopen without additional model calls.
7. Switch to FruitFly XR. Save a session question; connect to an actually available bridge. Inspect published structure and received telemetry. With retained evidence, request a separate explanation.
8. Open scientific requirements and Compare. It must remain locked for observational XR evidence.
9. Switch back to Synthetic. Confirm its retained result is unchanged. Check mobile layout and keyboard access.

## Critical UX assessment and remaining limitations

The desktop story is substantially clearer: a question and explicit action first, a large measured outcome after two actions, then an explanation beside the evidence. This is an implementation assessment, not a tested claim that novice judges understand it within 30 seconds. No uncoached user study was performed.

- “Synthetic Fixture,” raw targets such as primary_a, threshold terminology and some technical helper text still require interpretation. Diagram aliases help, but terminology is not completely generalized.
- On mobile, synthetic Ask and the measured headline are visible early; FruitFly session controls push the 3D view below the first screen. Mobile is usable but less compelling as the main demo.
- The overall page can still be long. Detailed charts, timeline and complete proposal may require scrolling at 1080px height.
- The two-minute target is plausible for the offline fixture but not verified for the live provider. Existing provider latency/retry behavior can exceed it. No live Meta quality or latency test was performed.
- Fake design is fixed and does not interpret arbitrary questions. It is clearly labeled and cannot demonstrate real Muse reasoning.
- Server design/evidence retention is process-local, bounded (100 designs) and expires after two hours. Restart/eviction requires redesign; displayed results remain inspectable. This is not multi-instance persistence or a durable experiment archive.
- Client state persists across in-app navigation/source switching, not a full reload. There is no saved experiment library.
- Runtime audit entries cover successful synthetic model requests; they are not a durable audit log for failed provider attempts.
- FruitFly causal comparison, controlled interventions and XR video feed remain unavailable. No extra observational frames can remove that limitation.
- The genuine replay stream ends, so review screenshots correctly say LAST SNAPSHOT / disconnected rather than pretending it is live.
- Published soma dots replace the concepts’ illustrative brain surfaces. No invented edge paths, firing rates, biological timing, movement or trajectories were added to imitate mockups.
- The concept palette, cyan/magenta contrast, yellow reasoning rail, green checks and dense instrumentation are preserved. Initial unmeasured topology is intentionally quieter than measured activity.

## Exact changed files

The inventories below distinguish the existing saved WIP from this uncommitted continuation. They include review artifacts; no files were staged or committed by this continuation.

### Existing WIP files (c9d10f4 → 75ae24a)

- `docs/review/sprint-7/01-synthetic-ask-1440.png`
- `docs/review/sprint-7/01-synthetic-ask-1920.png`
- `docs/review/sprint-7/01-synthetic-ask-390.png`
- `docs/review/sprint-7/02-synthetic-compare-locked-1920.png`
- `docs/review/sprint-7/03-synthetic-design-1920.png`
- `docs/review/sprint-7/03-synthetic-design-390.png`
- `docs/review/sprint-7/04-synthetic-measured-compare-1920.png`
- `scripts/guided-browser-review.mjs`
- `src/app/api/experiments/route.ts`
- `src/app/components/ai-scientist.tsx`
- `src/app/components/causalfly-assistant.tsx`
- `src/app/components/compare-dashboard.tsx`
- `src/app/components/evidence-view.tsx`
- `src/app/components/guided-workflow.css`
- `src/app/components/guided-workflow.tsx`
- `src/app/components/live-session.tsx`
- `src/app/components/observation-metrics.tsx`
- `src/app/components/observatory-preview.tsx`
- `src/app/components/propagation-timeline.tsx`
- `src/app/components/source-analysis-workspace.test.tsx`
- `src/app/components/source-analysis-workspace.tsx`
- `src/app/layout.tsx`
- `src/app/observatory.tsx`
- `src/lib/sources/live-session.test.ts`
- `src/lib/web/assistant.ts`
- `src/lib/web/contracts.ts`
- `src/lib/web/dashboard.ts`
- `src/lib/web/guided-workflow.test.ts`
- `src/lib/web/guided-workflow.ts`
- `src/lib/web/workflow-progress.ts`

### Modified in this continuation (tracked)

- `docs/review/sprint-7/01-synthetic-ask-1920.png`
- `docs/review/sprint-7/01-synthetic-ask-390.png`
- `docs/review/sprint-7/03-synthetic-design-1920.png`
- `docs/review/sprint-7/04-synthetic-measured-compare-1920.png`
- `scripts/guided-browser-review.mjs`
- `src/app/components/ai-scientist.tsx`
- `src/app/components/causalfly-assistant.tsx`
- `src/app/components/compare-dashboard.tsx`
- `src/app/components/data-source-panel.tsx`
- `src/app/components/fruitfly-analysis.tsx`
- `src/app/components/fruitfly-meta-analysis.tsx`
- `src/app/components/guided-workflow.css`
- `src/app/components/guided-workflow.tsx`
- `src/app/components/observatory-preview.tsx`
- `src/app/components/source-analysis-workspace.test.tsx`
- `src/app/components/synthetic-network-viz.tsx`
- `src/app/globals.css`
- `src/app/observatory.tsx`
- `src/lib/meta/scientific-interpreter.ts`
- `src/lib/web/display-labels.ts`

### New untracked files in this continuation

- `docs/SPRINT_7_GUIDED_WORKFLOW_REVIEW.md`
- `docs/review/sprint-7/04-synthetic-measured-compare-1440.png`
- `docs/review/sprint-7/04-synthetic-measured-compare-390.png`
- `docs/review/sprint-7/05-assistant-expanded-1920.png`
- `docs/review/sprint-7/06-synthetic-meta-interpret-1920.png`
- `docs/review/sprint-7/08-fruitfly-observe-1440.png`
- `docs/review/sprint-7/08-fruitfly-observe-1920.png`
- `docs/review/sprint-7/08-fruitfly-observe-390.png`
- `docs/review/sprint-7/10-fruitfly-meta-test-next-1920.png`
- `docs/review/sprint-7/11-fruitfly-compare-locked-1920.png`
- `docs/review/sprint-7/browser-checks.json`
- `docs/review/sprint-7/contact-sheet.jpg`
- `scripts/guided-contact-sheet.ps1`
- `src/app/components/result-story.tsx`
- `src/lib/web/result-summary.test.ts`
- `src/lib/web/result-summary.ts`

## git diff --stat

Relative to existing WIP HEAD 75ae24a. Git omits untracked files from this command; those are listed above.

```text
docs/review/sprint-7/01-synthetic-ask-1920.png     | Bin 403797 -> 404950 bytes
 docs/review/sprint-7/01-synthetic-ask-390.png      | Bin 73701 -> 108725 bytes
 docs/review/sprint-7/03-synthetic-design-1920.png  | Bin 393570 -> 411914 bytes
 .../04-synthetic-measured-compare-1920.png         | Bin 408653 -> 516415 bytes
 scripts/guided-browser-review.mjs                  |  41 ++---
 src/app/components/ai-scientist.tsx                |  15 +-
 src/app/components/causalfly-assistant.tsx         |   5 +-
 src/app/components/compare-dashboard.tsx           |  11 +-
 src/app/components/data-source-panel.tsx           |   2 +-
 src/app/components/fruitfly-analysis.tsx           |   4 +-
 src/app/components/fruitfly-meta-analysis.tsx      |   6 +-
 src/app/components/guided-workflow.css             | 172 +++++++++++++++------
 src/app/components/guided-workflow.tsx             |   9 +-
 src/app/components/observatory-preview.tsx         |   7 +-
 .../components/source-analysis-workspace.test.tsx  |   4 +-
 src/app/components/synthetic-network-viz.tsx       |   3 +-
 src/app/globals.css                                |  28 ++--
 src/app/observatory.tsx                            |  33 ++--
 src/lib/meta/scientific-interpreter.ts             |   1 +
 src/lib/web/display-labels.ts                      |   5 +
 20 files changed, 220 insertions(+), 126 deletions(-)
```
