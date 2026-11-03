# Verification — 2026-11-02

All provider/storage/control journeys below use offline fixed templates, intercepted responses or in-memory sockets. No genuine provider request, media upload or real brain-control message was made.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm test` | PASS: 541 tests, 409 library/server + 132 component, zero failures | `test.log` |
| `npm run build` | PASS: production webpack build and TypeScript | `build.log` |
| `npm run lint` | PASS | `lint.log` |
| `node scripts/sprint16a-browser-review.mjs` | PASS: 64 checks, zero runtime errors | `browser-regression.log`, `browser-regression/results.json` |
| `node scripts/sprint17-live-layout-stability.mjs` | PASS: final populated-event rapid fixture, three stationary scroll positions | `layout-test.log`, `layout-instability.json` |
| `node scripts/sprint17-live-layout-stability.mjs --anchor-none` | Diagnostic completed: zero scroll drift at all three positions | `anchor-probe.log`, `layout-instability-anchor-probe.json` |
| `node scripts/sprint17-judge-journey.mjs` | PASS: exact question/result, explicit approval, one design under double input, keyboard/focus, all Compare views, source/evidence/embodiment | `judge-test.log`, `judge-journey.json` |
| Scientific/history fingerprint verification | PASS: 1,263 files unchanged, prior review byte prefix intact | `preserved-files.json`, `preservation-verification.json` |
| `git diff --check` | PASS | Final working-tree inventory; no whitespace errors |

The aggregate browser command invokes existing Sprint 16B retained-stimulus recovery, proxy clarity, human-state/absent-event checks, real-adapter fake-socket feedback states, live layout/cadence and Compare/topology helpers. It covers 1366×768, 1440×900, 1536×1024, 1728×1080 and 1920×1080. `sprint16b*-live-video-acceptance.mjs` scripts were **not** run because they can make genuine provider/upload requests, which this sprint prohibits.

Runtime: Windows, local Next.js production server in `CAUSALFLY_FAKE_META=1` mode on `http://127.0.0.1:3465`. Browser commands set `CAUSALFLY_BROWSER_REVIEW_BASE` to that address. The aggregate also sets `CAUSALFLY_BROWSER_REVIEW_DIR=docs/review/sprint-17/browser-regression`. An initially stale server on 3464 was left untouched. No network provider configuration was printed. The agent's temporary offline server is stopped after verification.

## Geometry and retention

| Run / position | Samples | Packets during measured run | Total packets at end | Retained frames | Scroll delta | Document-height range | Maximum monitored geometry delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Final / top | 103 | 780 | 781 | 120 | 0 px | 0 px | 0 px |
| Final / middle | 102 | 770 | 1,551 | 120 | 0 px | 0 px | 0 px |
| Final / bottom | 102 | 860 | 2,411 | 120 | 0 px | 0 px | 0 px |

The initial frame precedes measurement. Every packet passed through the unchanged reducer; comparison with the original reducer and the original authored last-120 objects passes at every position. The existing bounded history is preserved, not replaced by an unlimited archive. There are zero monitored-node replacements, zero Stream Notes structure changes, zero numeric-snapshot coherence failures and zero horizontal overflow. Fixed numeric cases and six feedback-state geometry cases also pass.

Baseline: 307 samples across three positions; zero outer-card/footer/document/scroll displacement. Its 39 cumulative Stream Notes structure changes identify a real structural replacement defect, without proving Firefox page bounce. Baseline and final timing workloads differ as explained in `LAYOUT_AUDIT.md`.

Anchoring diagnostic: top/middle/bottom each show 0 px drift, document-height range and geometry delta, matching the normal `auto` run. Normal HTML/live region: `auto`; diagnostic live region: `none`. No production override was added. Playwright Firefox is unavailable; **Firefox was not run**.

## Performance measurements, not hardware acceptance

The renderer reports ANGLE / Vulkan / **SwiftShader Device (Subzero)**. This is software rendering under an instrumented burst workload.

| Position | Delivered input Hz | Hook presentation Hz (includes age updates) | Changed telemetry Hz | Long tasks >50 ms | DOM mutation records | JS heap before → after (bytes) |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Top | 104.61 | 4.69 | 3.22 | 94 | 3,825 | 61,838,199 → 79,703,149 |
| Middle | 103.43 | 4.03 | 3.09 | 103 | 3,911 | 78,154,669 → 67,914,283 |
| Bottom | 115.36 | 4.69 | 3.22 | 56 | 4,420 | 61,019,699 → 58,211,870 |

The configured 180 ms boundary is nominally 5.56 Hz; actual changed-value delivery in this software-rendered stress run is **below the requested 5–8 Hz target**. It is not reported as a performance pass. Frame intervals/long-task durations and every publication timestamp are retained in JSON. Earlier instrumented runs had median animation-frame spacing around 66.6 ms; final raw intervals are available for inspection. Heap samples vary with garbage collection; no monotonic memory-leak conclusion is asserted. Hardware Firefox smoothness/cadence remains within the open P1 human-validation gate.

## Visual and source checks

At 1728×1080, captures include `edge-live-{low-values,six-digit-values}-1728.png`, `edge-decoder-{idle,escape}-1728.png`, `edge-feedback-{off,armed,sending,accepted,rejected,unavailable}-1728.png`, `edge-retained-snapshot-1728.png`, and `judge-*-1728.png` for Overview, proposal/approval, measured result, all three Compare views, topology/source context, Evidence, live activity, embodiment and retained state. Dynamic pairs and Compare/topology were visually inspected; the aggregate has additional actual-adapter receipt/rejection captures.

Compare: Both camera distance **14.1804136**, control/intervention single distance **11.4882886**, each fit contains its complete visual-bound envelope. Single subjects are visibly larger. Topology retains its readable seven-node engineering graph and weights. No source value, measurement, prompt, brain protocol, dataset or motor behavior changed.

Remaining: **P0 0 / P1 1**. Follow `HUMAN_LIVE_ACCEPTANCE.md`; no genuine Firefox/live scientific acceptance is claimed. No commit, push or deployment.
