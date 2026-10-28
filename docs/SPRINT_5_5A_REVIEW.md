# Sprint 5.5A — source-aware workspace behavior

Implemented and validated October 28, 2026. No commit was made. The Sprint 5.5 visual system, experiment engine, scientific schemas, Meta provider behavior and FruitFly XR repository were preserved.

Production preview: <http://127.0.0.1:3115/>. The preview explicitly uses `CAUSALFLY_FAKE_META=1`; no live Meta call was made.

## Resulting workspace behavior

| Source | Compare | AI Scientist |
| --- | --- | --- |
| Synthetic Fixture | Existing Control vs Intervention dashboard, playback, topology, activity charts, measured deltas and causal propagation | Existing controlled-experiment analysis, hypothesis state, measured observations and next-question action |
| FruitFly XR | Explicit unavailable state: “Controlled comparison requires matched trials.” Control and intervention sessions are both marked not yet supplied. | Functional observational workspace using the retained snapshot and received-frame history shared with Live Session/Evidence |

XR Compare exposes **Open Live Session**, **Inspect Evidence**, and **Use Synthetic Fixture**. It cannot render the retained synthetic measurements, even when a synthetic result exists. It explicitly says that CausalFly does not currently send interventions to FruitFly XR.

XR AI Scientist includes:

- Source/dataset, session, sequence, model time, simulation tick and stream/transport status.
- Exact received spike-event, active-neuron and display-sample counts.
- Magenta decoder state and supplied input-reference/freshness flags. Exact decoder channel values remain accessible in an expandable section.
- A received-tick spike-count plot containing actual supplied points only. Missing ticks are not filled or interpolated.
- Deterministic local observations about the supplied frame, truncation, drops, active state and input reference. Changes between retained same-session frames are expandable.
- A prominent first-screen scientific limit: **“Observational telemetry does not establish causal effect.”** CausalFly's lack of applied intervention and the simulated/non-recording boundary are explicit.
- Evidence-conditioned follow-up suggestions, labelled **SUGGESTIONS / NOT FINDINGS**.
- A disabled **Analyze with Meta** control with the requested future purpose: “Send this retained evidence bundle to Meta for observational interpretation.” It states that the integration is unwired and sends nothing.

The observational presentation uses the existing five-second freshness semantics. Stale, disconnected and reconnecting retained evidence is labelled **LAST SNAPSHOT**, with no current activity claimed. The source and frame history remain owned by the existing hook; the analysis adds no connection, independent session buffer, engine run or provider request.

The sidebar keeps Compare visible and adds **Requires matched trials** for XR. AI Scientist remains available. Source-scope copy now distinguishes observational XR analysis from controlled synthetic analysis. The sidebar retains its 234px/174px desktop widths, and the capability hint wraps inside it at 1440px.

## Exact Sprint 5.5A changed files

These are changes made in this sprint, separate from the pre-existing uncommitted Sprint 5.4/5.5 work.

| File | Purpose |
| --- | --- |
| `package.json` | Run the new component-render suite after the existing server-condition tests. No dependency changes. |
| `src/app/observatory.tsx` | Source-aware analysis routing, source-specific header descriptions and accessible sidebar capability hint. |
| `src/app/layout.tsx` | Import the new scoped workspace compositions. |
| `src/app/components/source-analysis-workspace.tsx` | Explicit source boundary for Compare/AI Scientist; synthetic views remain the existing components. |
| `src/app/components/fruitfly-analysis.tsx` | XR matched-trials unavailable page and functional local observational workspace. |
| `src/app/components/source-workspaces.css` | New compositions using existing Sprint 5.5 tokens; fixed-width navigation hint fit. No global palette redesign. |
| `src/lib/web/observational-analysis.ts` | Pure local observations, same-session received-frame changes and evidence-conditioned suggestions; no provider imports. |
| `src/app/components/source-analysis-workspace.test.tsx` | Eleven new render/source-boundary/local-analysis tests. |
| `src/app/components/data-source-panel.tsx` | Correct source capability copy. |
| `src/app/components/observatory-preview.tsx` | Correct XR landing copy now that observational AI Scientist is available. |
| `src/app/components/activity-chart.tsx` | Preserve the exact SVG tooltip text as a single string, resolving a warning exposed by render tests. No plotted values or chart behavior changed. |
| `src/app/components/synthetic-network-viz.tsx` | Same single-string SVG tooltip correction; exact existing text, nodes, edges and values preserved. |
| `docs/SPRINT_5_5A_REVIEW.md` | This report. |

Generated review artifacts are ignored under `tmp/sprint-5-5a/`: browser/contact-sheet scripts, PNGs, logs, JSON assertions and the existing trial client's output. No FruitFly XR source or build output was modified. Its working tree remained clean.

## Validation results

| Required check | Result |
| --- | --- |
| `npm test` | PASS — 169 existing tests + 11 new tests = **180 tests**, zero failures |
| `npm run experiment:demo` | PASS |
| `npm run experiment:ai-demo -- --fake` | PASS — fake provider only |
| `npm run lint` | PASS |
| `npm run build` | PASS — compilation, TypeScript and prerendering |
| `git diff --check` | PASS — no whitespace errors; Git emits its normal LF/CRLF normalization notices |

The new component tests run without the `react-server` condition so real client-component rendering and hooks can be exercised. The existing server-only scientific suite retains its original condition and coverage.

New tests verify XR Compare cannot render synthetic results and requires matched trials; XR AI Scientist renders exact retained telemetry and observational limits; Meta stays disabled; stale/disconnected data remains historical; empty state does not manufacture measurements; both synthetic interfaces retain their functions; source rendering preserves synthetic evidence; rendering performs no fetch; history comparisons exclude other sessions/future frames and preserve gaps; missing input references and retained-session suggestions remain truthful.

Production browser checks additionally verified:

- No POST on initial load or workspace navigation. Exactly one experiment POST occurred, following the explicit fake-mode experiment action.
- Exactly one telemetry connection, opened by the explicit Connect action. No external browser request or automatic Meta request occurred.
- All three XR metric readouts and decoder state matched the actual received frame.
- Existing built BrainClient and existing server supplied the review data; the client exited successfully and ran from the ignored CausalFly review directory.
- Stale evidence changed to LAST SNAPSHOT, preserving its exact readouts.
- Switching to synthetic restored the original comparison; switching back to XR retained the actual received evidence.
- All three XR Compare actions navigated/switched sources correctly.
- No unhandled browser errors.
- No horizontal document overflow for both XR workspaces at 1920, 1440 or 390px. Desktop navigation buttons remain inside the unchanged sidebar bounds.

Logs and assertions: `tmp/sprint-5-5a/tests.log`, `experiment-demo.log`, `experiment-ai-demo-fake.log`, `lint.log`, `build.log`, `verification.json`, `synthetic-visual-regression.json` and `brain-client.log`.

## Screenshots and visual review

All four required screenshots are actual **1920×1080** production-browser captures. XR AI Scientist uses real received simulation telemetry, not the offline test fixtures.

| Page | Exact screenshot path |
| --- | --- |
| Synthetic Compare | `tmp/sprint-5-5a/synthetic-compare-1920x1080.png` |
| Synthetic AI Scientist | `tmp/sprint-5-5a/synthetic-scientist-1920x1080.png` |
| FruitFly XR Compare | `tmp/sprint-5-5a/fruitfly-compare-1920x1080.png` |
| FruitFly XR AI Scientist | `tmp/sprint-5-5a/fruitfly-scientist-1920x1080.png` |
| 2×2 contact sheet | `tmp/sprint-5-5a/source-aware-2x2-contact-sheet.png` |

[Open the 2×2 contact sheet](../tmp/sprint-5-5a/source-aware-2x2-contact-sheet.png).

Additional captures: `fruitfly-scientist-waiting-1920x1080.png`, `fruitfly-scientist-stale-1920x1080.png`, `fruitfly-scientist-full.png`, and `fruitfly-{compare,scientist}-{1440,390}.png`, all under `tmp/sprint-5-5a/`.

The captures were visually inspected individually and as a 2×2 sheet. Synthetic Compare retains its paired luminous conditions; synthetic AI Scientist retains its qualified hypothesis/measurement analysis. XR Compare is a requirements workflow with no result values. XR AI Scientist is a telemetry-and-interpretation workspace with cyan readouts, magenta decoder state and amber scientific/investigation treatment. The two XR pages no longer share duplicate fallback content and do not resemble duplicate Evidence views.

Synthetic visual regression checks against Sprint 5.5 found **zero changed pixels above a 12/255 channel threshold** in either content area (`x=234, y=90, width=1686, height=990`). Sidebar scope copy changed intentionally. XR analysis's received-window detail, follow-up suggestions and disabled Meta section continue below the first viewport; the full-page capture preserves their reviewability.

Implementation and validation are complete. No live Meta calls, engine changes, fabricated biological measurements, FruitFly XR edits or commits were made.
