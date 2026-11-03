# Event Timeline audit and fixed geometry

## Finding and remaining uncertainty

**The human-reported Firefox root cause is not established by the available automation.** Before modification, Edge measured 0 px movement for the panel, track, all six slots, label/tick/time regions and inferred pseudo-marker/baseline positions. After modification, actual marker and baseline DOM elements and all regions again measure 0 px. These results must not be presented as proof that the genuine Firefox defect is resolved. Playwright Firefox is absent; no browser download or genuine live/control action was performed. The reported release-blocking timeline defect remains a **P0 human-validation gate**.

The production audit found the following concrete layout dependencies and coverage gaps:

| Mechanism | Before | Resolution |
| --- | --- | --- |
| Competing layout definitions | Timeline rules appeared in multiple blocks: flex sizing, later grid overrides, 170 px slot widths and differing list/row heights. The outer list had no explicit row contract. | Consolidated the timeline rules into one definition with an explicit track row and six equal desktop columns. |
| Intrinsic inner columns | Each slot was a grid with an implicit automatic column and child `min-width:12ch`; the slot's grid did not explicitly own its content width. | Explicit `minmax(0,1fr)` inner column, `min-width:0`, fixed row regions and no content-driven sibling sizing. |
| Wrapping / normal line height | Numbers, units and retained timestamps could wrap under `overflow-wrap:anywhere`; the time `font` shorthand left line-height at normal. Outer-box measurements alone could not prove that the inner text presentation was invariant across browsers. | Explicit 12 px / 18 px numeric typography, tabular numbers and single-line numeric rows. Labels get a deliberate two-line region. Long complete values remain available in focusable, locally scrollable rows and full-value titles. No visible scientific padding/fake digits. |
| Unmeasured markers | Marker/connector pseudo-elements had no `getBoundingClientRect()` target; previous Sprint 17 instrumentation measured slots, not these nodes. Semantic changes also switched glow shadows. | Persistent `aria-hidden` marker and baseline elements with explicit coordinates/dimensions, color-only state changes and direct rectangle measurements. |
| React identity | Six index-keyed slots already persisted. The event window and retained/reconnected content changed inside them. | Same six keys/window semantics retained; marker/baseline/label/value subtrees now persist through all tested state changes. No telemetry value is used as a slot key. |
| Parent / scroll behavior | In Edge, no parent/document height oscillation, unsolicited scroll or layout transition was reproduced. | No global anchoring change or scroll trap added. Layout animations/transitions are explicitly disabled only inside the timeline. |

The dependencies above are implementation defects in the requested immutable-geometry contract, **not a causally proven explanation of the Firefox report**. No additional cause is guessed from a passing Edge fixture.

## Exact geometry contract

Files: `src/app/components/live-session.tsx`, `src/app/components/live-session.module.css`.

- Six permanent slots; desktop `repeat(6,minmax(0,1fr))` columns fill the track. Below 760 px, minimum 150 px columns scroll inside the timeline instead of overflowing the document.
- Track height 160 px includes the padding and a scrollbar allowance; explicit 116 px slot row. Each slot owns marker / label / tick-status / time regions of **12 / 36 / 32 / 36 px**.
- Each marker is 9×9 px at slot `(0,2)`; each baseline is 1 px high at y=6. Their positions do not depend on text. Labels, numeric rows, margins, padding and columns are explicit.
- Changing semantic state only changes text and color. Full model-time / UTC / retained wording is preserved. The original `sessionTimeline`, frame window, reducer, receipt/freshness and source facts are unchanged.

## Measured before / after

`scripts/sprint171-timeline-stability.mjs` bundles the production component/CSS and uses the application's shell/fonts. It runs with normal motion preferences at 1728, 1366 and 760 px widths, at scrollY=0 and 800. It makes 270 presentation updates per case and samples each React commit and the settled layout: **541 samples per case, 3,246 samples / 1,620 updates per run**.

Values: 1, 9, 99, 284, 999, 1,000, 18,421, 99,999 and 192,000, plus adjacent slot values. Cases cover Frame received, Neural tick, Input reference changed, Decoder changed, placeholders, reconnection, live/inactive and retained content. The frame/states are explicitly authored presentation fixtures, not recorded scientific claims.

| Measurement, all six width/scroll cases | Before | After | Tolerance |
| --- | ---: | ---: | ---: |
| Maximum panel/track/slot/row x/y/width/height displacement | 0 px | 0 px | ≤1 px |
| Marker / baseline displacement | 0 px (inferred pseudo geometry) | 0 px (direct DOM rectangles) | ≤1 px |
| Stationary scrollY displacement | 0 px | 0 px | ≤1 px |
| Document-height range | 0 px | 0 px | ≤1 px |
| Monitored node replacements | 0 | 0 | 0 |

Final checks also assert no horizontal document overflow and ordinary page scrolling remains available. The full-dashboard rapid ingestion fixture and existing browser regressions separately verify integration and unchanged retention semantics.

Artifacts: `timeline-before.json`, `timeline-after.json`, their `.log` files and `timeline-{before,after}-edge-*-*.png`. Normal page geometry changed once when the new presentation mounted; the numbers above compare steady updates within each version, not different designs' absolute height.

## Human exit criterion

Run `HUMAN_FIREFOX_ACCEPTANCE.md` with genuine telemetry for 20–30 seconds at stationary top/middle/bottom positions. Inspect dots, baselines, title regions, tick/model-time rows, final status slot and panel boundaries. The optional console helper reads rectangles without changing the application. Close the P0 only after an actual Firefox PASS; a visible jump requires preserving that trace and further investigation.
