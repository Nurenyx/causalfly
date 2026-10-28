# Sprint 5.5 — shared visual system and analysis workspace

Implemented and reviewed on October 28, 2026. No commit was created. The scientific engine, experiment semantics, Meta prompts/schemas, provider selection, telemetry bridge, source restrictions and provenance contracts were not changed. FruitFly XR was used read-only; its working tree is clean.

Production review: <http://127.0.0.1:3115/> with `CAUSALFLY_FAKE_META=1`. The existing development preview remains at port 3114. Neither preview requires a live Meta request for this review.

## Exact Sprint 5.5 source/document changes

| File | Change |
| --- | --- |
| `src/app/globals.css` | Promote Live Session's palette to root tokens; share canonical branding, navigation, source picker, header and footer; keep Live Session's workspace padding. |
| `src/app/layout.tsx` | Import shared instrument composition styles after global styles from the root entry point. |
| `src/app/observatory.tsx` | Use the shared shell/branding on every workspace; compose the new synthetic Observatory and source-specific XR landing. Submission and reducer behavior are retained. |
| `src/app/components/instrument-system.css` | New shared panel/header/badge treatments, workflow/provenance flows, observation typography, analysis layout and responsive compositions. |
| `src/app/components/workspace-ui.tsx` | Add reusable `EvidenceFlow` alongside the existing `Badge` and `SectionTitle`. |
| `src/app/components/observation-metrics.tsx` | New engine-backed metric presentation shared by Observatory, AI Scientist and Compare; compact mode preserves Compare's composition. |
| `src/app/components/observatory-preview.tsx` | New `ResearchWorkflow`, `ObservatoryPreview`, declared fixture topology and `FruitFlyLanding`. |
| `src/app/components/ai-scientist.tsx` | Finding/hypothesis state, measured observations, amber interpretation, expandable caveats, prominent next experiment and full original analysis access. |
| `src/app/components/compare-dashboard.tsx` | Consume shared measured metrics without changing topology, playback, chart or propagation behavior. |
| `src/app/components/compare-dashboard.css` | Converge comparison surfaces, intervention accent and AI rail onto the instrument palette. |
| `src/app/components/evidence-view.tsx` | Add synthetic chain of custody and restrained provenance hierarchy. |
| `src/app/components/fruitfly-evidence.tsx` | Add the supported received-frame provenance chain and exact event/drop readouts. |
| `docs/SPRINT_5_5_REVIEW.md` | This report. |

Pre-existing Sprint 5.4 changes were preserved: `package.json`, `package-lock.json`, `live-session.tsx`, `live-session.module.css`, `live-visualizations.tsx`, `connectome-3d.tsx`, `connectome-view.ts`, `connectome-view.test.ts` and `docs/SPRINT_5_4_REVIEW.md`. They are not new Sprint 5.5 modifications. No new dependency was added.

Review scripts, screenshots, logs and JSON checks are generated under ignored `tmp/sprint-5-5/`. Scripts: `before.cjs`, `css-probe.cjs`, `sizes.cjs`, `review.cjs`, `received-review.cjs`, `playback-check.cjs`, `contact-sheet.cjs`. The existing trial client also wrote its review output into this temporary CausalFly folder.

## Shared tokens and primitives

The canonical Live Session tokens now have one owner in `:root`:

| Role | Tokens / values |
| --- | --- |
| Background / panels | `--cf-bg-deep: #000A10`, `--cf-bg: #000D16`, `--cf-bg-elevated: #011822`, `--cf-panel: #061A24`, `--cf-panel-strong: #082331` |
| Borders | `--cf-border: rgba(45,150,190,.34)`, `--cf-border-strong: rgba(0,205,240,.58)` |
| Measurement / control | `--cf-cyan: #00D0F0`, `--cf-cyan-bright: #18E0F4` |
| Intervention / decoder | `--cf-magenta: #FF4F8B`, `--cf-magenta-bright: #FF68A2` |
| AI / investigation | `--cf-amber: #F0D040`, `--cf-amber-bright: #FFD84A` |
| Connected / validated | `--cf-green: #00DFA0` |
| Error | `--cf-red: #FF4866` |
| Text | `--cf-text`, `--cf-text-secondary`, `--cf-text-muted` |
| Shape / subtle glow | `--cf-radius: 5px`, `--cf-glow: inset 0 0 24px #00D0F008` |

Legacy color aliases resolve to these tokens. The existing `--red` comparison alias resolves to magenta for intervention styling; it is distinct from the explicit error token. `instrument-shell` carries shared app chrome. `panel`, `section-title`, `badge`, `eyebrow`, measured readouts and `EvidenceFlow` provide reusable visual primitives. Live Session continues to use its established module-scoped instrument components and state treatments.

## Workspace results

**Observatory.** The hero uses the requested concise headline and supporting copy. A compact ASK → INTERVENE → MEASURE → UNDERSTAND strip explains the loop. The question and experiment action remain primary. Before a run, the actual declared seven-node/seven-edge fixture is shown as topology with explicit “NO ACTIVITY DATA” and “Not yet measured” labels. It does not run an experiment to decorate the landing page. After a run, the preview uses that result's retained control sample, hypothesis, intervention and exact measured deltas. The three measured readouts are visible in the reviewed 1920 and 1440 viewport captures.

With FruitFly XR selected, the landing changes to a read-only source command area with actual connection state and direct Live Session/Evidence actions. It displays no synthetic results or experiment submission action. The no-intervention and controlled-comparison disclaimers remain explicit.

**AI Scientist.** “What did we find?” leads with the tested hypothesis, provider mode and qualified hypothesis state. The fake client's `null` support remains **INCONCLUSIVE**. Key measurements come directly from the engine response, not model prose. Interpretation has a distinct amber treatment. Limitations and confounders are compact, expandable, and initially open. The next question, target, rationale and action have a strong visual position. “View full analysis” preserves all observations, the original question and the complete original analysis JSON. Longer real provider text can extend the page naturally; it is not truncated away.

**Compare.** Control/intervention layout, recorded-step playback, network topology, charts, causal propagation, measured deltas and Scientist rail remain. Cyan/magenta headers, darker surfaces, shared metric rendering and a more restrained amber rail connect it visually to Live Session. Desktop chart/network heights are adjusted for density. Propagation continues below the initial viewport.

**Evidence.** Synthetic evidence shows SYNTHETIC NETWORK → DETERMINISTIC ENGINE → MATCHED TRACES → CAUSALFLY EVIDENCE. Received XR evidence shows PUBLISHED CONNECTOME → FRUITFLY XR SIMULATION → TELEMETRY FRAME → CAUSALFLY EVIDENCE. Before an XR frame arrives, no completed provenance flow is asserted. Existing provenance, retained traces, selection rules, matched conditions, raw JSON and scientific caveats remain available. XR readouts emphasize actual supplied event/drop counts, session, sequence, model time and decoder mode.

**Sidebar/app shell.** The existing Live Session logo, near-black surfaces, active cyan route treatment, visible source radios, connection state and provider state now persist across workspaces. Widths match the canonical Live Session shell: 234px at 1920 and 174px at 1440. This does not widen the canonical sidebar. On narrow screens the navigation and source selection remain available; long desktop sidebar content can scroll.

## Validation

| Check | Final result |
| --- | --- |
| `npm test` | PASS — 169 tests, zero failures |
| `npm run experiment:demo` | PASS — peak 1 → 0.5, crossing step 3 → 4, both thresholds reached, matched conditions |
| `npm run experiment:ai-demo -- --fake` | PASS — fake provider, support unassessed/null |
| `npm run lint` | PASS |
| `npm run build` | PASS — compilation, type checking and prerendering |
| `git diff --check` | PASS — no whitespace errors; Git reports only its normal LF/CRLF normalization notices |
| Production browser review | PASS — all five workspaces captured at 1920×1080 and 1440×1080 |
| Responsive overflow | PASS — all five workspaces at 1920, 1440 and 390px; document width equals viewport width |
| Runtime errors | Zero unhandled browser errors in the final review |
| Shared metric values | All six displayed control/intervention values on all three metric surfaces match the actual fake experiment API result |
| Playback | Play advances, pause holds, seek returns to recorded step 00 |
| Full analysis / next question | Full observations remain accessible; next question returns to and focuses the question input without auto-submission |
| Source separation | XR landing has no experiment submit button and preserves the synthetic result for a source switch back |
| Received XR evidence | PASS — existing built BrainClient and existing server; displayed identity/time/mode and four event/drop counters match the received evidence JSON |
| FruitFly XR repository | Clean before and after review; no source/build changes |
| Live Meta / commit | No live Meta calls; no commit |

The received XR review captured session `a1e96f8a-808e-4a06-b520-d14a055c6950`, sequence 5, model time 250ms. Its received frame supplied 3,314 simulated events, 512 display events and zero in both drop counters. These are simulation quantities, not living-fly recordings. The trial client's exit status was zero. Its working directory was CausalFly's ignored review folder.

Logs and assertions: `tmp/sprint-5-5/{tests.log,experiment-demo.log,experiment-ai-demo-fake.log,lint.log,build.log,verification.json,metric-playback-verification.json,received-evidence-verification.json,live-pixel-review.json,brain-client.log}`.

The initial development server served stale CSS after imports changed. Restarting it corrected the styling; final screenshots and browser checks use the production build. A temporary capture script initially failed lint because its CommonJS directive was missing; it was corrected. A playback probe initially used visible text rather than the explicit accessible name; the corrected probe passed. These were review-tool failures, not ignored application failures.

## Screenshots and explicit comparison

All paths below are relative to the repository root. Open the full PNGs to inspect small machine labels.

| Workspace | 1920×1080 | 1440×1080 |
| --- | --- | --- |
| Observatory, measured result | `tmp/sprint-5-5/observatory-1920x1080.png` | `tmp/sprint-5-5/observatory-1440x1080.png` |
| Compare | `tmp/sprint-5-5/compare-1920x1080.png` | `tmp/sprint-5-5/compare-1440x1080.png` |
| AI Scientist | `tmp/sprint-5-5/scientist-1920x1080.png` | `tmp/sprint-5-5/scientist-1440x1080.png` |
| Evidence, synthetic | `tmp/sprint-5-5/evidence-1920x1080.png` | `tmp/sprint-5-5/evidence-1440x1080.png` |
| Live Session, waiting | `tmp/sprint-5-5/live-1920x1080.png` | `tmp/sprint-5-5/live-1440x1080.png` |
| Evidence, actual received XR frame | `tmp/sprint-5-5/fruitfly-evidence-received-1920x1080.png` | `tmp/sprint-5-5/fruitfly-evidence-received-1440x1080.png` |

- [Five-page side-by-side contact sheet](../tmp/sprint-5-5/all-five-contact-sheet.png) — 4800×580, five equally scaled desktop captures. Live Session uses the additional actual received-frame capture, `tmp/sprint-5-5/live-received-1920x1080.png`.
- [Live Session before/after](../tmp/sprint-5-5/live-before-after.png) — identical waiting state, before the refactor vs final production build. Original baseline: `tmp/sprint-5-5/live-before-1920x1080.png`.
- Fresh landing: `tmp/sprint-5-5/observatory-empty-1920x1080.png`.
- XR landing and waiting Evidence: `tmp/sprint-5-5/fruitfly-landing-{1920,1440,390}.png` and `tmp/sprint-5-5/fruitfly-evidence-waiting-{1920,1440,390}.png`.
- Full-page continuations: `tmp/sprint-5-5/{observatory,compare,scientist,evidence}-full.png`.

All five pages and both desktop widths were visually inspected. The contact sheet was explicitly compared for:

| Attribute | Observation |
| --- | --- |
| Background shade | Shared workspace `rgb(0,13,22)` and sidebar `rgb(0,10,16)`; values independently checked in the browser |
| Border treatment | Thin cyan-tinted lines and small radii; magenta/amber boundaries indicate condition/interpretation |
| Accent brightness | Control and measurements use bright cyan; intervention/decoder magenta; AI amber; validated/connected green |
| Typography | Shared Geist headings/body and Geist Mono micro-labels/readouts; primary result values are larger than supporting metadata |
| Density | Observatory is composed around the question and evidence preview; analysis uses a finding/metrics/interpretation/next-action hierarchy; Compare stays denser |
| Sidebar | Identical brand, navigation, active state, source picker and provider treatment across all five |
| Panel headers | Shared white titles, indexed labels and cyan separators; Live Session retains its canonical integrated header bars |
| Status indicators | Consistent semantic colors and small dot/badge treatment; Live Session keeps its larger LIVE/WAITING/LAST SNAPSHOT state readout |

The same-state Live Session pixel check found **0 changed pixels above a 12/255 channel threshold inside the main instrument region** (`x=248, y=48, width=1672, height=1007`). Across the entire screenshot, 3,794 pixels (0.183%) exceeded that threshold, confined to shared chrome. Visual inspection confirms the hero, charts, Observer, decoder and instrument composition are preserved. This is a screenshot regression check, not a claim that every runtime state was requalified scientifically.

## Remaining visual differences and honest scores

Live Session remains the densest and most visually dominant screen because it has a full structural 3D hero and an instrument stack. Compare uses compact schematic charts and requires vertical scrolling for complete propagation detail. Evidence intentionally uses restrained audit typography and long identifiers. At 1440px some chart/machine labels remain small; a long XR connection sidebar can require its own scroll. AI Scientist's full analysis is below the primary action. Fresh XR Observatory has more unoccupied space because it supplies navigation/context rather than inventing telemetry or experiments. These are the remaining visible differences.

| Category | Score / 10 | Basis |
| --- | --- | --- |
| Cross-page visual consistency | 9 | Actual five-page contact sheet, common computed backgrounds and same-state Live Session preservation; panel header formats still vary by role |
| Observatory quality | 8.5 | Clear loop/action, truthful empty state and actual measured preview; XR landing is quieter |
| Compare quality | 8 | Strong luminous conditions and preserved workflow; propagation continuation and small chart captions remain |
| AI Scientist quality | 8.5 | Immediate qualified finding, exact metrics, accessible caveats and strong next action; long real-provider prose can still lengthen the page |
| Evidence quality | 8.5 | Source-specific chain of custody and exact readouts; deliberately restrained and identifier-heavy |
| Information hierarchy | 8.5 | Actions/findings precede supporting details; full records remain accessible |
| Typography | 8 | Consistent family, numerals and headings; compact machine captions are still small |
| Scientific readability | 9 | Clear measurement/interpretation separation, qualified support and explicit simulation/fixture context |
| Premium / hackathon demo quality | 8.5 | Coherent instrument aesthetic and production screenshots; some detail views require scrolling |
| Scientific integrity | 10 | Within this visual sprint's scope: unchanged engine/contracts, exact supplied values, no invented biological measurements and preserved source boundaries |

Implementation and validation are complete. No commit was made.
