# Sprint 17.2.1 — takeover and final acceptance

## Takeover assessment

The worktree was already dirty across Sprint 16/17 presentation work. Its tracked diff was captured before editing in `tmp/sprint1721/takeover-tracked.diff`, and 1,846 existing files were fingerprinted. No inherited work was reverted.

The supplied handover identifies Antigravity's latest edits as `live-session.tsx`, `event-timeline-lanes.test.tsx`, and `sprint172-timeline-semantic-stability.mjs`. At takeover, those files already implemented five semantic lanes, placeholders before first receipt, persistent semantic React keys, a collapsed chronological history, a presentation accumulator, and installed-Firefox BiDi automation. The broader inherited changes include telemetry presentation batching, independent server/stream/evidence status, provenance disclosures, scientific question guards, and procedural embodiment controls. These were preserved.

Correct inherited work: FRAME / NEURAL / INPUT / DECODER / STREAM ordering; semantic keys rather than event IDs; fixed timeline row geometry; history kept secondary; timeline mounted before evidence; scientific reducer and 120-frame buffer left intact.

Incomplete or wrong inherited work:

- FRAME retained the first receipt instead of the latest received frame.
- An exclusive decoder/input/neural branch hid simultaneous events. A receipt can contain a new frame, tick progression, an input-reference transition, and a decoder transition. Each event belongs to its own lane; one transition must not erase another.
- A module-level accumulator shared state between independently rendered timelines with the same session ID and mutated shared presentation state during rendering.
- A frozen stream-start timestamp was labeled “Last received.” It now says “Active since”; reconnect timestamps say “Reconnected at.” Retained status still reports the actual last receipt.
- Full-app lifecycle coverage was limited to 1728 pixels; the other viewport checks used an isolated timeline fixture, and only two scroll positions were tested.
- The old browser summary could not establish final cold-start acceptance. Earlier review claims were treated as historical claims, not fresh verification.

## Changes and measured causes

1. Keep the existing semantic lane roots and keys. Update FRAME for every receipt, NEURAL for observed tick progression, INPUT for an input-reference transition, and DECODER for a decoder transition. No scientific value or event is synthesized.
2. Scope the bounded presentation accumulator to its mounted component. Copy its presentation state before folding new inputs so another instance or interrupted render cannot contaminate it.
3. Reserve one responsive viewer slot for anatomy loading, WebGL, projection, and raster. The previous 400-pixel loading minimum changed to the loaded viewer's different height; the initial diagnostic measured a 100-pixel contraction when the canvas appeared.
4. Reserve the desktop observation-column width before receipt. The old waiting layout expanded the timeline by 292 pixels, then narrowed it on the first frame.
5. Reserve connection-banner paragraph height. Previously, connection-state prose wrapping moved the entire instrument area by 24 pixels on disconnect/reconnect.
6. Restrict Live Connectome mode-tab transitions to appearance properties. A targeted browser trace identified `min-height: 28px → 38px` plus padding transitions on `.instrument-mode-tab` as the remaining approximately 10-pixel entrance movement.

The timeline's five roots, labels, values, timestamps, category headings, markers, baseline elements, track, history, and panel are compared by DOM object identity. A mutation observer also records removals/reinsertions. Category labels and `data-lane` identities are independently checked on every sampled update. These checks establish semantic identity in addition to geometry.

The previous exclusive-update assertions were corrected rather than relaxed: tests now assert the exact set of independently observed event categories. A pure frame receipt changes FRAME alone; a frame containing a progression and input transition changes FRAME, NEURAL, and INPUT. A simultaneous decoder/input transition must preserve both facts. Another test proves independently rendered timelines cannot inherit expired transitions from one another.

## Runtime protocol

An isolated local production build uses `CAUSALFLY_FAKE_META=1` with observatory and experimental brain endpoints empty. All telemetry is explicitly authored fixture data delivered through an in-memory EventSource substitute. Browser requests are restricted to that exact localhost origin and static assets/health; other API routes and real sockets are blocked. No browser is downloaded.

Mozilla Firefox 159.0 is the locally installed Windows application and is controlled through WebDriver BiDi. Microsoft Edge 156.0.4314.42 is the installed comparison browser. Firefox 159 rejects BiDi's `ignoreCache` parameter, so its isolated profile disables disk, memory, and HTTP caches before startup; reload then exercises a cache-cold document. Edge request interception disables HTTP caching.

For each browser: 1728×1080, 1366×1080, and 760×1080; top, middle, and bottom stationary scroll positions; cache-cold reload, actual navigation, disconnected waiting, connected waiting, first receipt, neural/input/decoder transitions, disconnect, reconnect, rapid receipt burst, and retained snapshot. After first receipt changes the page extent, the requested scroll position is established once again and asserted against the new extent; no scrolling occurs during the measured steady stream. An additional 1728×1080 lifecycle opens procedural embodiment through the real UI and waits for both its canvas and anatomical-model ready state. Feedback remains unarmed.

The rapid burst crosses the unchanged 120-frame retention boundary. Animation-frame samples record document height, scroll position, horizontal overflow, timeline geometry, and canvas count; lifecycle snapshots additionally check every lane's semantic content and DOM identity. The isolated production-component fixture runs top/middle/bottom at the same three widths, including the 10-step sequence and rapid multi-digit values.

Results are recorded in `summary.json`, `timeline-semantic-stability.json`, `browser-results.json`, per-browser progress evidence, screenshots, regression artifacts, and `preservation-verification.json`.

Harness corrections preserve strict assertions:

- Firefox navigation now waits for BiDi network completion and 500 milliseconds of network idle before the next cache-cold reload. An earlier rerun canceled outstanding Next.js chunks and produced both canceled-intercept errors and a `ChunkLoadError`. The chunk remained available with HTTP 200; the zero-runtime-error assertion was retained.
- The neural-response review reads its original historical baseline independently of its new output directory. Exact retained trace samples, output values, condition geometry, and minimum chart-size assertions are unchanged.
- The aggregate review's 12-packet burst now runs inside the renderer with 5-millisecond asynchronous gaps and geometry reads after each receipt. This avoids automation round trips turning rapid input into a long stream. React can commit between packets; the test does not rely on one synchronous React batch. The existing maximum of four visible tick updates is unchanged, and the final run observed two or three. Every raw frame still must equal the authored evidence, and geometry/document-height/terminal-flush assertions are unchanged.

## Final verification

| Required check | Final result |
| --- | --- |
| `npm test` | PASS — 549 tests: 409 library/server and 140 component; zero failures |
| `npm run lint` | PASS |
| `npm run build` | PASS — production webpack and TypeScript build |
| `scripts/sprint172-timeline-semantic-stability.mjs` | PASS — installed Firefox 159.0 and Edge 156.0.4314.42; 20 full-app lifecycle cases and 18 timeline-fixture cases |
| `scripts/sprint171-timeline-stability.mjs` | PASS — all six viewport/scroll cases, zero geometry/scroll/document-height drift or node replacement |
| `scripts/sprint171-neural-response-review.mjs` | PASS — all 36 playback states; exact historical trace samples and measured values preserved |
| `scripts/sprint17-live-layout-stability.mjs` | PASS — stationary top/middle/bottom, zero geometry/scroll/document-height drift; every reducer frame preserved and retention remains 120 |
| `scripts/sprint17-judge-journey.mjs` | PASS — explicit fixture actions `design`, `run`, `interpret`; zero runtime errors or blocked requests |
| Aggregate `scripts/sprint16a-browser-review.mjs` | PASS — all 64 checks, zero runtime errors |
| `git diff --check` | PASS |
| Takeover preservation verification | PASS — 1,846 fingerprints checked; no scientific/library/public-data changes, historical-artifact changes, or missing files |

Final main-matrix outcome, in both installed browsers:

- Exactly FRAME, NEURAL, INPUT, DECODER, STREAM, in that order, before telemetry and throughout every lifecycle.
- Zero semantic order violations, event-category isolation violations, DOM replacements, removals, or reinsertions.
- Cold anatomy/canvas mounting, all live/retained snapshots after first-receipt initialization, and sustained rapid telemetry: zero measured displacement, scroll drift, or document-height drift within the 1-pixel tolerance; residual fractional geometry values are floating-point noise.
- Zero horizontal overflow, runtime errors, blocked requests, or real socket messages. The primary timeline's responsive horizontal scroller remains contained.
- The final rapid receipt simultaneously updates FRAME/NEURAL/INPUT to tick 443 and DECODER to ESCAPE → WALK in their own lanes. Disconnect retains the displayed observations unchanged.
- The additional embodiment lifecycle waits for the real anatomical model to become ready. Its loading and active procedural rendering do not move the timeline.

The older regression scripts report that their Playwright-managed Firefox binary is absent and therefore execute Edge only. No download was attempted. The separate installed-Firefox BiDi matrix above supplies the required Firefox acceptance; it does not rely on that absent binary.

## Remaining initialization and deployment decision

**P0 remaining: none found.** The repeated semantic rotation and telemetry-driven movement are resolved.

**P1 remaining: one-time first-receipt dashboard expansion.** The prior design intentionally defers the telemetry summary, activity instruments, diagnostics, and observations until evidence exists. `LiveSessionHeader` adds the primary observations once; `LiveSessionWorkspace` replaces waiting guidance with received-activity instruments and adds the diagnostics/observation rail. These are initialization changes, not event identity swaps or repeated telemetry jitter. Their first-frame document-height and timeline-document-position changes are explicitly retained in `summary.json`.

Measured normal-workspace timeline movement on that one initialization: approximately 175–176 pixels at 1728, 167–168 pixels at 1366, and 890–891 pixels at 760. The narrow page's total height grows once by approximately 2,399–2,400 pixels because the deferred instruments stack vertically. With embodiment already open at 1728, the one-time timeline shift is approximately 649 pixels. After this initialization, geometry, document height, scroll position, and semantic lane identity remain stable through rapid telemetry and disconnect/reconnect. These nonzero first-receipt deltas are deliberately not presented as zero-pixel lifecycle geometry.

**Production deployment recommendation: NO for immediate deployment.** The semantic-lane fix and automated acceptance pass, but the remaining first-receipt expansion, especially at 760 pixels, merits the requested human visual review before production approval. No deployment was attempted.

## Files changed during this takeover

- `src/app/components/live-session.tsx`: correct event facts and instance-local presentation state.
- `src/app/components/event-timeline-lanes.test.tsx`: exact category updates, simultaneous transitions, latest receipt, independent instances, existing cold-start and retention checks.
- `src/app/components/live-session.module.css`: permanent desktop width and responsive viewer reservation.
- `src/app/components/live-visualizations.tsx`: shared loading/rendered viewer slot.
- `src/app/components/tester-build.css`: stable connection prose and appearance-only navigation transitions.
- `scripts/sprint172-timeline-semantic-stability.mjs`: real-browser full-app matrix, cache-cold reload, network isolation, DOM identity/mutation checks, sustained telemetry, embodiment mounting, diagnostics, and clean browser shutdown.
- `scripts/sprint171-timeline-stability.mjs` and `scripts/sprint171-neural-response-review.mjs`: honor the existing review-output environment variable so new regression artifacts do not overwrite historical evidence. Assertions are unchanged.
- `scripts/demo-layout-browser-review.mjs`: deliver the rapid burst within the browser with asynchronous per-receipt yields, retaining the original repaint, geometry, and evidence assertions.
- New evidence and this report under `docs/review/sprint-17-2-1/`; temporary logs, takeover snapshot, probes, and runner under ignored `tmp/sprint1721/`.

## Preservation and boundaries

The takeover fingerprint check reports zero changes to `src/lib/`, public scientific data/assets, or pre-existing historical review artifacts, and zero missing files. Existing experiment measurements, connectome data, decoder logic, telemetry reducer, 120-frame retention, scientific provenance, and real-brain control logic are unchanged.

These tests verify real browser rendering using offline telemetry fixtures. They do not establish a live provider connection, a new live simulation recording, biological validation, or real sensory feedback. No provider credentials were inspected or changed. No Meta, Muse, SAM, media upload, or real brain-control operation was performed. No commit, push, or deployment was performed.

SPRINT 17.2.1 COLD-START + FIREFOX FINAL ACCEPTANCE COMPLETE.

REAL FIREFOX ACCEPTANCE: PASS.
FIVE SEMANTIC LANES VERIFIED: YES.
COLD-START STABILITY: PASS.
STEADY TELEMETRY STABILITY: PASS.

NO PROVIDER CALLS MADE.
NO REAL BRAIN CONTROL MESSAGE SENT.
NO SCIENTIFIC CALCULATION CHANGED.
NO COMMIT MADE.
NO PUSH PERFORMED.
NO DEPLOYMENT PERFORMED.

PRODUCTION DEPLOYMENT RECOMMENDATION: NO.

STOP FOR HUMAN REVIEW.
