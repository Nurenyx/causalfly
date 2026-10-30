# Sprint 10A — Research cockpit review

October 29, 2026 · Branch: `feat/sprint-10a-research-cockpit`

**Commit/tag pending. NO COMMIT MADE. Local preview: http://127.0.0.1:3130**

## Goal and visual comparison

Bring the working experiment into one desktop research cockpit, guided by all three original images in `docs/design-reference/` and the Sprint 9 release capture (`tmp/sprint-9/desktop.png`). The mockups' strongest qualities were co-located visualization, measurements, and AI reasoning. The release scattered these across a scrolling report and automatically scrolled on state changes.

The cockpit now puts the research question and five stages above an integrated **Embodied World / Neural System / Meta AI Scientist** composition. The measured result dominates a lower instrument deck with signal, response, outcome, trust, run ID, and timeline. One contextual primary action advances the existing workflow. Technical comparison, full analysis, provenance, diagnostics, and Evidence remain disclosures. Ask CausalFly stays available through a quieter launcher.

The composition and hierarchy are closer to the mockups, with less card chrome and a visible experimental loop. Asset quality and spatial richness still fall short of their cinematic brain/fly imagery; the seven-node schematic faithfully represents the available engine instead of borrowing unsupported biological imagery.

## Scientific boundaries and behavior

- **CONTROLLED MODEL** labels remain visible in the command header, instrument header, neural panel, and boundary note. This is the existing synthetic deterministic network; no engine, connectivity, provider implementation, or measurement output changed.
- Live Connectome retains its existing implementation and now explicitly labels **CONNECTOME OBSERVATORY / SIMULATED DYNAMICS**. Published structure and observational telemetry remain scientifically separate from matched synthetic trials. No XR video feed is advertised or fabricated.
- Meta design, approval, execution, interpretation, and next-question actions use the existing reducer and handlers. Navigation makes no provider call. Offline templates are explicitly attributed throughout. Full AI text and limitations remain in technical analysis.
- Successful SAM analysis replaces setup with the retained track/media, apparent box size, and derived amplitude in the world column. Approval remains explicit; derived amplitude stays locked. Offline geometry never appears over uploaded media or claims live SAM detection. Detailed geometry/mapping and diagnostics remain accessible.
- The world and neural instrument share the recorded playback cursor. Preview stimulus geometry is labeled planned/unmeasured. Node brightness, declared edge emphasis, output, and traces retain existing evidence semantics. Visible signals use three significant digits; exact evidence/data attributes/tooltips remain intact.
- Trust uses actual manifest checks, with no confidence percentage. Flight Recorder run ID, manifest, ordered ledger, local export, and biological-validation limits are preserved.

## Files

- `src/app/components/guided-experiment.tsx`: cockpit composition over existing workflow.
- `src/app/components/research-cockpit.tsx` and `.css`: contextual scientist, measurement/trust deck, timeline, responsive instrumentation.
- `src/app/components/embodied-experiment.tsx`: integrated world/network/scientist regions, recorded traces, shared playback.
- `src/app/components/embodied-world.tsx`: camera framing, lighting, planned input illustration.
- `src/app/components/perception-panel.tsx`: compact mode and single approval action.
- `src/app/components/activity-chart.tsx`, `synthetic-network-viz.tsx`, and `src/lib/web/display-labels.ts`: readable signal labels with exact data preserved.
- `src/app/observatory.tsx`: explicit scientific headings and removal of automatic state-change scrolling.
- `src/app/layout.tsx`: cockpit stylesheet.
- `src/app/components/guided-experiment.test.tsx` and `synthetic-network-viz.test.tsx`: updated presentation expectations and exact-value regression.
- This review document.

## Validation

Fake/offline providers only. **Zero paid/live Muse or SAM calls.** The pre-existing live-configured dev server was left running; browser QA used a separate fake-provider production server on port 3130. Browser requests outside loopback and non-fixture SAM requests were blocked by the acceptance harness. No external brain session was connected.

- Targeted component tests: **24 passed**.
- Full `npm test`: **315 passed** (273 library + 42 component).
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`: passed.
- Browser: **53 checks passed**. Question → offline perception → design → explicit approval → recorded playback → interpretation → proposal; exact geometry/input, node data, matched validation, exported manifest/ledger, Evidence retention, source navigation, Ask CausalFly, and next-question approval boundary checked. The completed run timeline ends at y=1049 at 1920×1080 and y=1032 at 1440×1080; the next proposal is visible without rail scrolling. The 390px layout has no horizontal overflow and retains working actions (DOM checks only).
- Final captures below are the only four screenshot artifacts. The initial visual pass exposed rail clipping and crowded SAM presentation; the same four paths were refreshed after correction. Harness, report, and diagnostic JSON stay in ignored `tmp/sprint-10a/`.

## Screenshots

1. [1920×1080 initial cockpit](../tmp/sprint-10a/01-initial-cockpit-1920.png)
2. [1920×1080 active recorded experiment](../tmp/sprint-10a/02-active-experiment-1920.png)
3. [1920×1080 result + offline Meta interpretation](../tmp/sprint-10a/03-completed-meta-1920.png)
4. [1440×1080 completed result](../tmp/sprint-10a/04-completed-meta-1440.png)

## Five remaining visual / UX weaknesses

1. The procedural fly remains an illustrative asset; anatomical and material fidelity lag the references.
2. The small synthetic schematic has less spatial richness than the mockups' rendered brains. A distinct asset/visualization pass would improve cinematic quality.
3. Secondary trace labels and technical microcopy remain small, especially at 1440px.
4. Retained SAM media and the world share a column; expanding source details trades fly space for audit detail.
5. Long live interpretations and expanded design settings still require technical disclosures or local scrolling. Live provider output variation was not exercised during this offline sprint.

Stop here for human visual review. No commit, tag, deployment, new model, backend redesign, or FruitFly XR change.

## 10A.1 — Cinematic polish

Continued the approved uncommitted composition on the same branch. No layout redesign, new page, provider, engine, scientific claim, or FruitFly XR change. **NO COMMIT MADE.** Preview remains http://127.0.0.1:3130 (fake Muse).

- **Visual polish:** closer three-quarter fly framing, muted natural materials, more readable wings, contact shadows, stronger arena grid, and a restrained stimulus. Recorded graph activity has depth, proportional activity rings, stronger silence/output markers, and one bounded pulse only for supported adjacent records during playback. Stage/playback emphasis is subtle and reduced motion suppresses animation.
- **SAM / rail / 1440:** accepted input moves retained media, geometry, and diagnostics behind a closed disclosure; apparent-size change and amplitude remain visible and the world reclaims space. Shorter scientist prose, a clearer conclusion, one dominant CTA, larger chart labels through compact projection, and more legible readout labels preserve the same instrument footprint.
- **Screenshot comparison:** compared all four below with Sprint 10A captures and the original design references. The fly occupies substantially more useful space after acceptance; traces span more of the neural region, the result has stronger hierarchy, and the surfaces feel more integrated. The core timeline ends at y=1054 (1920×1080) / y=1037 (1440×1080), with the proposal visible without rail scrolling.
- **Remaining asset-quality gaps:** the procedural fly still has simplified anatomical/material detail; its shadow and translucent wings remain stylized; the seven-node schematic lacks the references' spatial brain richness. A dedicated asset pass is still needed for that level of fidelity.
- **Validation:** 26 targeted tests; full suite once, **317 passed** (273 library + 44 component); TypeScript, lint, build, and diff checks passed. **61 offline browser checks** passed, including accepted-media reopening/identity, reclaimed world space, pulse gating/reduced motion, viewport fit, and 390px overflow/functionality. Zero live Muse/SAM calls. An initial build picked up scratch comparison TSX copies; renaming only those scratch copies to `.txt` resolved compilation. No application workaround or config change was needed.
- **Only four new captures:** [1920 initial](../tmp/sprint-10a1/01-initial-cockpit-1920.png), [1920 active](../tmp/sprint-10a1/02-active-experiment-1920.png), [1920 completed](../tmp/sprint-10a1/03-completed-meta-1920.png), [1440 completed](../tmp/sprint-10a1/04-completed-meta-1440.png). Acceptance report: `tmp/sprint-10a1/acceptance.json`.
