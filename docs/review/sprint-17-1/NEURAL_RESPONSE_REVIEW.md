# Neural Response judge-clarity review

This changes the Experiment page's recorded neural viewer only. The separate Compare workspace, topology, node IDs, edges, weights, normalized activities, threshold/response logic, decoder, experiment result and playback state machine remain unchanged.

## Before → after

The full-width deck still inherited compact sidebar rules: a 78 px Activity Trace, a constrained network figure, and the Control/Intervention selector at the bottom. At 1728×1080, the network SVG measured 236 px high and the trace 78 px. The SVG's aspect ratio left substantial unused width; the judge had to infer the intervention consequence from the graph and navigate elsewhere for totals.

The presentation heading is now **NEURAL RESPONSE**. Existing internal identifiers and source disclosures remain. Its top toolbar groups RECORDED SIGNAL, Control / Intervention, the sequential playback caption and the exact current step. The existing scrubber/play/pause/replay/reset behavior remains available below the viewer; selecting a condition still pauses at that condition's first retained step. No playback transitions or time calculations changed.

The body uses approximately **65% network / 35% measured response** on desktop. The existing `SyntheticNetworkViz` is enlarged; Primary A's existing silenced-node/edge color treatment becomes easier to see. The right column shows the selected trial's stored peak output, first threshold crossing, outcome and existing procedural motor-outcome mapping. The shared `resultSummary` supplies the existing signal/timing comparison; `deltas.outcomeChanged` supplies the outcome comparison. No independent UI measurement calculation was added.

The facts explicitly say **“Retained trial totals · not current-step output.”** Thus a final zero-output sample can coexist truthfully with the retained peak 0.500 / response Step 4 / threshold reached. The live header continues to show the actual selected step's recorded output. “Intervention vs Control” comparison facts refer to the whole matched experiment even while viewing Control. Motor execution remains explicitly procedural; no neural rerouting, biological outcome or new inference is claimed.

Activity Trace uses its **existing full-size presentation variant** at 200 px height, preserving shared axis maxima across both conditions, normalized-activity units, simulation-step labels, sample values, gaps, colors, dashes and exact-value point titles. It is not smoothed, interpolated or renormalized.

| Desktop SVG dimension | Before | After |
| --- | ---: | ---: |
| Network height | 236 px | 416 px |
| Activity Trace height | 78 px | 200 px |

Source context is compacted spatially, with exactly the same ENGINEERING NETWORK disclosure. The graph, facts and controls occupy persistent allocated regions. The selected article retains its identity when Control/Intervention changes, keeping the SVG instance instead of remounting its wrapper.

## Responsive and playback acceptance

`scripts/sprint171-neural-response-review.mjs` exercises the real built app using offline design/run endpoints, explicit approval and keyboard operation of the existing scrubber. It covers **36 condition/step states** at 1728, 1366 and 760 px widths. Every recorded node attribute is checked against the returned retained activity sample; blocked edges never acquire drive. Peak/crossing/outcome facts are checked against the selected stored trial. Exact trace sample titles are compared with the pre-change capture. No new experiment/interpretation request occurs during playback or condition changes.

Control ↔ Intervention and every scrubbed step preserve outer, network, trace, figure, toolbar and response-column document rectangles within ≤1 px; measured movement is 0 px. Each stationary playback sequence also checks scrollY, total document height and horizontal overflow. At ≤1000 px viewport width the network and response column stack; the toolbar adapts below 800 px. Viewport changes are intentional reflow, distinct from playback instability. The controls and complete scientific values remain available.

The final desktop and mobile captures were reviewed visually. The default intervention's stored 0.500 / Step 4, 50% reduction, one-step delay and unchanged outcome are visible beside the highlighted silenced pathway. Control correctly shows 1.000 / Step 3. Source and procedural/biological limits remain legible.

## Files and tests

- Presentation: `src/app/components/embodied-experiment.tsx`, `src/app/components/tester-build.css`, new `neural-response-summary.tsx`.
- Tests: new `neural-response-summary.test.tsx` checks both selected trials, immutable input, shared comparison text and a non-crossing trial that must not claim takeoff or a response step. The existing hierarchy assertion changes only the intended presentation heading; its order checks remain.
- The existing sequential-playback assertion initially caught removal of its caption; the caption was restored, and the assertion retained unchanged.
- Raw before/after cases and PNGs: `neural-before.json`, `neural-after.json`, `neural-*-{control,intervention}-{width}.png` and viewport captures.
- Complete test/build/lint/browser, layout and judge results are recorded in `VERIFICATION.md`.

Scientific integrity is verified against pre-sprint file fingerprints. No `src/lib` scientific/data implementation, fixture data, provider prompt, source provenance, network topology, retained evidence or protocol file was changed. No genuine provider/upload/control action was performed. No commit, push or deployment.
