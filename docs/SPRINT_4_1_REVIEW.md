# Sprint 4.1 visual review

Implemented without committing. The review server is running at **http://127.0.0.1:3141** with `CAUSALFLY_FAKE_META=1`. Open Observatory and choose **Design & Run Experiment** to enter Compare. The review API response was verified as `FAKE META CLIENT`; no live Meta request was made.

## Files and components changed in this sprint

| File | Change |
| --- | --- |
| `src/app/globals.css` | Compact workspace chrome, full-width composition, responsive desktop and stacked mobile layouts. |
| `src/app/components/compare-dashboard.css` | New dashboard stylesheet: network, chart, playback, delta, propagation, and AI rail presentation. |
| `src/app/components/compare-dashboard.tsx` | Synchronized playback state, shared chart scales, intervention/hypothesis hierarchy, evidence composition. |
| `src/app/components/experiment-playback.tsx` | New `ExperimentPlayback`: play/pause, keyboard-accessible scrubber, computational-step readout. |
| `src/app/components/measured-delta-card.tsx` | Extracted `MeasuredDeltaCard`: labeled control and perturbed values with prominent deltas. |
| `src/app/components/synthetic-network-viz.tsx` | `SyntheticNetworkViz`: per-step activity, layered halos, weighted edge emphasis, explicit silence marker. |
| `src/app/components/activity-chart.tsx` | `ActivityChart`: larger plot, shared axes, current-step cursor, recorded sample tooltips and current values. |
| `src/app/components/propagation-timeline.tsx` | `PropagationTimeline`: comparable graphical lanes, activation markers, alternate path, interruption and output-onset delta. |
| `src/app/components/ai-scientist.tsx` | `AiScientistRail`: compact observation/interpretation/confounder cards, next-experiment action, full-analysis navigation. |
| `src/lib/web/dashboard.ts` | Pure selectors for retained playback steps and exact sample lookup. |
| `src/lib/web/dashboard.test.ts` | Playback checks for short windows, compaction, missing samples, exact values, and immutability. |
| `docs/SPRINT_4_1_REVIEW.md` | This implementation and verification report. |

Existing uncommitted Sprint 4 changes in `README.md`, `docs/ARCHITECTURE.md`, and `src/app/observatory.tsx` were preserved without further edits. The existing Evidence and full Scientist workspaces remain available.

## Differences from Sprint 4

- Compare uses the available width with a 196px sidebar at 1920px and approximately 70% evidence / 30% AI columns.
- The intervention and hypothesis lead the view. Control is cyan; silence is magenta; alternate continuity in the perturbed network is amber.
- Networks show actual normalized activity at a selected computational step. The default is the control output-peak step, which is step 3 for the fake demo.
- Playback synchronizes both conditions and visits retained samples only. Manual scrubbing pauses playback; navigation unmounts and cleans up the playback timer.
- Node values are exact evidence values. Edge emphasis uses recorded upstream activity from the preceding computational step and the provenance weight; it is not presented as measured edge flow. Missing compacted samples are shown as unavailable, without interpolation or carry-forward values.
- Charts use the same horizontal and vertical scales across conditions. They retain the real sample points and do not bridge omitted computational steps.
- The measured strip labels both conditions and emphasizes peak delta, threshold-crossing delta, and outcome status. Missing crossings remain non-comparable.
- The propagation lanes derive onset exclusively from first non-zero activity. The demo output first activates at step 3 in control and step 4 under perturbation.
- The AI rail presents at most four observations and three confounders, a distinct interpretation card, and a prominent next-question action. Complete scientific analysis and limitations remain in AI Scientist.

## Reference convergence and scientific boundaries

Matched: dense dark instrument panels, compact navigation, large paired network/chart cards, cyan versus magenta condition contrast, layered node glow, subtle grids, weighted paths, clear numeric deltas, structured right-side AI cards, amber interpretation/next-experiment accents, restrained evidence-linked transitions.

Intentionally omitted: brain anatomy, biological neuron identities, biological connectome claims, Hz, biological time, trial counts/replicates, SEM/error bars, behavioral trajectories, escape rates, XR/live telemetry, and unsupported sharing/export controls. The synthetic engine does not supply those measurements or capabilities. No reference-image biological data or imagery was imported into the application. `docs/design-reference/` remains excluded by the repository's local Git exclusions.

Engine code, Meta prompts, schemas, workflow, measurements, provenance, compaction, and fake/live selection behavior were not changed.

## Verification

- `npm test`: **124 passed, 0 failed**.
- `npm run experiment:demo`: passed.
- `npm run experiment:ai-demo -- --fake`: passed in fake mode.
- `npm run lint`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- Local headless Edge review: exact node values at every retained step; synchronized scrubber; play/pause; full-analysis limitations preserved; Evidence JSON equals API evidence; Use as Next Question loads the proposed question without submitting; no browser errors.
- No horizontal page overflow at 1920px, 1440px, or 390px.
- At 1920×1080, both networks/charts, all primary delta cards, and the substantial AI rail appear above the fold. Metric cards end at y=1064; the AI rail ends at y=889. The graphical propagation timeline follows below.
- At 1440×1080, metric cards end at y=1055, with both comparison cards and the AI rail retained side by side.

## Captures and review artifacts

All captures and temporary screenshot tooling are under ignored `tmp/sprint-4.1/`:

- [1920×1080 Compare](../tmp/sprint-4.1/compare-1920x1080.png)
- [1440×1080 Compare](../tmp/sprint-4.1/compare-1440.png)
- [AI Scientist](../tmp/sprint-4.1/ai-scientist.png)
- [Evidence](../tmp/sprint-4.1/evidence.png)
- [Full Compare including propagation](../tmp/sprint-4.1/compare-full.png)
- [Mobile layout](../tmp/sprint-4.1/compare-mobile.png)
- [Browser review measurements](../tmp/sprint-4.1/visual-review.json)
- [Test output](../tmp/sprint-4.1/tests.log)

Review URL: **http://127.0.0.1:3141**.
