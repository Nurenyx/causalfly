# Sprint 17.2.2 — live workspace and telemetry control clarity

Review date: 2026-11-02 (America/Toronto). Existing repository and inherited Sprint 17.2.1 work preserved. Local production build; authored offline acceptance transport only.

**PRODUCTION DEPLOYMENT RECOMMENDATION: NO — stop for human visual review.**

Implementation is complete. Final verification results and measured limitations are recorded below. No commit, push, or deployment was performed.

## Actual layout cause

The reported whole-page width cap was **not reproduced** in the starting production build. At 1728 px, the unchanged sidebar occupied 244 px and `main` already occupied the remaining 1484 px, ending at x=1728. Root shell, workspace and main had no computed max-width cap. Claiming that a root max-width removal recovered hundreds of pixels would be inaccurate.

The narrow experience came from nested allocation and visibility constraints:

- The outer instruments grid reserved a bounded 245–280 px observations column (280 px on the measured desktops), including while its content was not rendered before telemetry. Waiting therefore left an empty reserved column.
- The observatory/embodiment split used 1.62:1; the anatomy viewport remained 360 px high and fly viewport 320 px high on large desktops.
- Automatic embodiment visibility depended on a configured **input/control** endpoint as well as received evidence. A normal read-only observatory connection therefore hid the fly despite having enough desktop space.
- Investigation setup, compatibility disclosure and historical notice appeared before the instruments.
- Anatomy/projection/raster already shared the geometry reservation introduced in Sprint 17.2.1; that work was retained.

The live shell now explicitly permits full width. The outer grid uses `minmax(0,4.4fr) minmax(14rem,1fr)`; at 1440+ the hero uses `minmax(0,1.9fr) minmax(0,1fr)`. The anatomy slot becomes 480 px and the fly viewport 420 px high. Below 1440 the hero stacks; below 1151 the observations rail moves below the instruments. Long explanations retain character limits. No sidebar styling was changed.

The observations rail now renders its honest empty/waiting explanation. At 1440+ the procedural embodiment appears even before the first frame, labelled **NO TELEMETRY / PROCEDURAL EMBODIMENT**. It is an existing local illustration with feedback unarmed, not a neural measurement. Explicit collapse remains available. The fly precedes secondary input/diagnostic controls. Investigation setup follows the instrument workspace.

### Dimensions and screenshots

Same-browser measurements compare the starting and final production app. Expanded narrow cases explicitly open the fly; desktop cases open automatically. Dimensions and all computed parent-chain widths/max-widths are in [before/results.json](before/results.json), [after/results.json](after/results.json), and [comparison.json](comparison.json).

| Viewport | Sidebar / main | Observatory width, before → after | Anatomy viewport, before → after | Fly viewport, before → after | Observations width |
| --- | --- | --- | --- | --- | --- |
| 1728 × 1080 | 244 / 1484 | 700 → 752 | 698 × 360 → 750 × 480 | 415 × 320 → 379 × 420 | 280 → 264 |
| 1440 × 900 | 232 / 1208 | 537 → 605 | 535 × 360 → 603 × 480 | 314 × 320 → 302 × 420 | 280 → 224 |
| 1366 × 768 | 232 / 1134 | 806 → 862 | 804 × 360 → 860 × 360 | 789 × 320 → 845 × 320 | 280 → 224 |
| 1024 × 768 | 244 / 780 | 732 → 732 | 730 × 360 → 730 × 360 | 715 × 320 → 715 × 320 | 732 → 732 |
| 760 × 1080 | 760 / 760 | 728 → 728 | 726 × 340 → 726 × 340 | 711 × 320 → 711 × 320 | 728 → 728 |

At 1728: observatory/embodiment/observations = **53.28% / 28.04% / 18.68%**. Anatomy viewport area increased **43.34%**, fly viewport area **19.84%**.

At 1440: observatory/embodiment/observations = **52.73% / 27.76% / 19.51%**. Anatomy viewport area increased **50.46%**, fly viewport area **25.95%**.

The sidebar and main widths are identical before/after; visualization allocation and actual availability changed. At 1728 the main uses 100% of the space after the sidebar with 24 px measured outer gutters. At 1440 the measured gutter is 18 px. Column percentages exclude gaps.

The fly panel is somewhat narrower at 1728 to give the observatory priority; its taller canvas has more display area and appears before its controls. The measured table records this tradeoff rather than claiming both panels became wider.

The complete measured width chain at 1728 px is:

| Container | Starting constraint / width | Final constraint / width |
| --- | --- | --- |
| Application shell | 1728 px, no max-width cap | Same |
| Sidebar | 244 px navigation track | Same |
| Workspace and `main.main-content` page wrapper | 1484 px, no max-width cap | Same; explicit live full-width boundaries |
| Live launcher / session / dashboard layout | 1436 px after outer padding, no max-width cap | Same |
| Instruments and reserved observations | 1144 / 280 px plus 12 px gap | 1160 / 264 px plus 12 px gap |
| Observatory / embodiment within hero | 700 / 432 px plus 12 px gap | 752 / 396 px plus 12 px gap |
| Anatomy viewport | 698 × 360 px shared projection/WebGL/raster slot | 750 × 480 px shared slot |

Prose limits constrain text rather than these panels; the rail's `14rem` floor preserves readability. The JSON evidence includes computed `maxWidth`, width, grid tracks, margins and document coordinates for each measured ancestor and surface at all five sizes.

Representative evidence:

| View | Before | After |
| --- | --- | --- |
| 1728 instruments | [Edge](before/edge-1728-instruments.png) | [Edge](after/edge-1728-instruments.png), [Firefox](after/firefox-1728-instruments.png) |
| 1440 instruments | [Edge](before/edge-1440-instruments.png) | [Firefox](after/firefox-1440-instruments.png) |
| 1366 instruments | [Edge](before/edge-1366-instruments.png) | [Firefox](after/firefox-1366-instruments.png) |
| 1024 instruments | [Edge](before/edge-1024-instruments.png) | [Firefox](after/firefox-1024-instruments.png) |
| 760 instruments | [Edge](before/edge-760-instruments.png) | [Firefox](after/firefox-760-instruments.png) |

## Actual capability path

1. `useFruitFlySource` / `createLiveConnection` opens browser `EventSource('/api/sources/fruitfly')`.
2. The GET route calls `fruitFlyStream`, which calls `connectFruitFly` in `src/lib/sources/fruitfly-bridge.ts`.
3. The server-only `FRUITFLY_XR_OBSERVATORY_URL` must address `/observatory/v1`. The bridge socket type exposes only `addEventListener` and `close`; it has no send operation. This telemetry subscription is read-only.
4. A verified observatory hello establishes **CONNECTED / WAITING FOR FIRST FRAME**. Hello and structural scaffold are not measurements. A normalized simulation frame establishes **DATA RECEIVED**. Stale evidence becomes retained context; disconnection preserves the received values.
5. Telemetry begins when an external organism/trial client drives the simulation host. The repository's [bridge documentation](../../FRUITFLY-XR-BRIDGE.md) describes the Quest/Unity organism client or existing desktop BrainClient harness; subscribing to the observatory alone never starts a trial. Neither was launched here.

There is a **separate, existing opt-in experimental input channel**: `NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL` validated as `/brain/v1`, used by `ExperimentalBrainAdapter` and `AutonomyPanel`. It checks a dataset/version hello and sends existing proxy `stimulus` messages with the existing freshness and 60-second bounds. The external protocol documentation says an organism connection starts a fresh seeded session. That is distinct from an explicit simulation-start command on the observatory connection. The current adapter does not negotiate an authenticated trial-start capability; URL configuration alone cannot prove one exists. The documented service has no authentication interface. No new protocol, endpoint, authentication mechanism, or sensory logic was introduced.

Previously, **START LIVE TRIAL** was disabled because `configuredBrainEndpoint(...)` returned no valid public input endpoint (and it required READY/no active trial). The enabled handler only mounted the existing `AutonomyPanel startLiveTrial` input path; it did not invoke an observatory start endpoint. The current read-only production configuration therefore correctly had no start operation, but presented that absence as a broken primary action.

The normal read-only flow now has no disabled START LIVE TRIAL. It shows **READ-ONLY TELEMETRY**, **Trial control unavailable on this host**, external-host initiation instructions, and **WAITING FOR SIMULATION**. Replay remains available. If the optional input URL is configured, the unchanged opt-in handler is labelled **START EXPERIMENTAL INPUT TRIAL**, with a separate-channel disclosure; it is not advertised as a negotiated or authenticated telemetry control capability. This configured branch was checked in isolated component tests, never against a real host.

### Supported visible states

| Connection fact | Main explanation | Evidence |
| --- | --- | --- |
| Disconnected, no evidence | Live telemetry disconnected; read-only capability and reconnect/replay | [Firefox](after/firefox-1728-disconnected.png) |
| Connected, no frame | Live telemetry ready; waiting for external simulation host | [Firefox](after/firefox-1728-waiting.png), [760 px](after/firefox-760-waiting.png) |
| Receiving | Receiving live telemetry; subscription observes the simulation | [Firefox](after/firefox-1728-receiving.png), [760 px](after/firefox-760-receiving.png) |
| Disconnected, retained evidence | Retained simulation snapshot; last values remain inspectable | [Firefox](after/firefox-1728-retained.png) |
| Connected but stale | Retained simulation snapshot rather than fresh/live | Component test plus lifecycle regression |

The UI can distinguish connection, first-frame waiting, receiving and retained states from existing snapshot and freshness fields. It can distinguish an optional configured experimental input channel. It cannot establish authenticated remote trial-start capability, because the existing protocol provides no such capability advertisement.

## Validation

| Check | Final result |
| --- | --- |
| `npm test` | PASS — 553 tests (409 library + 144 component), 0 failures |
| `npm run lint` | PASS — 0 warnings/errors |
| `npm run build` | PASS — production webpack build and TypeScript |
| `node scripts/sprint1722-live-workspace-review.mjs` | PASS — Firefox + Edge, all five requested viewports; four states; 135 authored receipts; 120 retained; zero movement/overflow/identity replacement |
| `node scripts/sprint172-timeline-semantic-stability.mjs` | PASS — 20 actual-app lifecycle cases + 18 semantic fixtures in real Firefox/Edge, unchanged 1 px thresholds |
| `node scripts/sprint171-timeline-stability.mjs` | PASS — previous 270-update timeline regression (Edge) |
| `node scripts/sprint171-neural-response-review.mjs` | PASS — previous neural-response/retained-measurement regression (Edge) |
| `node scripts/sprint17-live-layout-stability.mjs` | PASS — previous rapid stream/retention/feedback-layout regression (Edge) |
| `node scripts/sprint17-judge-journey.mjs` | PASS — offline experiment approval, compare camera bounds, evidence, read-only telemetry and retained snapshot |
| `node scripts/sprint16a-browser-review.mjs` | PASS — 64 aggregate checks; journeys, human states, demo layout/live and storage fixtures |
| `git diff --check` | PASS |

Commands ran against `http://127.0.0.1:3485` with `CAUSALFLY_BROWSER_REVIEW_DIR` directing every output into this sprint, preserving previous review evidence. See [browser-results.json](browser-results.json) for exit codes/durations and [logs](logs/) for exact output. A second workspace pass centers state screenshots on their capability explanation at smaller widths and repeats the same assertions.

The machine-readable entries `semantic` and `semantic-recheck` deliberately retain the failed model-fetch attempts. `semantic-isolated` is the final complete passing matrix (307.5 seconds), logged in [semantic-final-isolated.log](logs/semantic-final-isolated.log).

Legacy Playwright-only scripts report their missing bundled Firefox runtime accurately; the new workspace and full semantic lifecycle suites independently use the real installed Firefox through BiDi. There is no claim that those legacy scripts ran Firefox.

Across the final semantic lifecycle cases, maximum live movement is **0 CSS px**, maximum internal timeline movement **<0.001 CSS px** (floating-point measurement noise). First receipt still initializes deferred measured instruments (see remaining issues).

The real installed Firefox 159.0 was controlled through native WebDriver BiDi; Edge 156.0.4314.42 used Playwright's installed Edge channel. The shared driver preserves the prior exact-origin request allowlist, fake EventSource, forbidden real WebSocket, isolated profiles and cold-cache lifecycle. No browser substitute was reported as Firefox.

Authored telemetry updates exercise the real local application handlers. These are deliberately labelled acceptance fixtures with recorded simulated values; they are not evidence of a real external server trial. No Meta/Muse/SAM request, real media input, real brain connection, or sensory feedback occurred. Health preflight requires offline mode before experiment actions. Final server used `CAUSALFLY_FAKE_META=1`, `CAUSALFLY_META_ENABLED=0`, empty observatory endpoint and empty public brain endpoint.

### Failures encountered, retained rather than hidden

1. Initial full lifecycle regression failed with `firefox: real app live timeline geometry moved 2px` (Edge also measured the same state-transition difference). The timeline's internal geometry/identity and sustained rapid telemetry were stable. A targeted ancestor measurement traced the 2 px movement to Replay switching between primary/secondary button padding as connected/disconnected state changed. A live-only shared button padding rule fixes the cause; the **1 CSS px acceptance threshold was not relaxed**.
2. Initial judge journey failed with `TypeError: Cannot read properties of undefined (reading 'min')` while reading camera bounds. It now waits for the existing computed bounds as well as camera mode before projecting all eight corners. Containment assertions remain intact.
3. Initial aggregate journey failed with `page.evaluate: TypeError: Cannot read properties of null (reading 'getBoundingClientRect')`. Its old assumption was that an observations rail implied measurement charts. The newly visible waiting rail intentionally has no measurement charts. The journey now measures each independently and still checks non-overlap whenever charts exist, plus no fabricated charts before frames.
4. One acceptance-server launch used the incorrect `FAKE_META` flag. The offline health preflight rejected `live !== offline` before experiment actions. The server was stopped and restarted with the actual `CAUSALFLY_FAKE_META=1` flag and live Meta explicitly disabled. This was a test setup error, not an application capability change.
5. The next full lifecycle run passed geometry/identity but failed its strict browser-error check with `Could not load /models/flyv2/FlyVisualV2_Web.glb: NetworkError when attempting to fetch resource.` The local asset returned HTTP 200. Waiting for idle before/after navigation and for automatically visible embodiment to become model-ready did **not** eliminate the error: the full rerun failed with the same message. The isolated fixture handoff was then corrected: it had replaced the DOM of a still-mounted Next/React app, allowing its lazy model loader to race the timeline fixture. The driver now serves an inert HTML document through a same-origin in-memory browser interception before mounting the fixture. A targeted full lifecycle + nine-fixture probe passed in each browser with empty error lists both before and after the handoff. The final complete matrix uses this isolated handoff. No browser errors were filtered or ignored, and no production files were added for the fixture.
6. During fixture-isolation diagnostics, a JSON health document first timed out waiting for `window.timelineSetStep` because script tags were inert. Executing the bundle directly then exposed the JSON viewer's `default-src 'none'` style restrictions. This diagnostic was discarded; the final intercepted HTML fixture uses ordinary production CSS and waits for its stylesheets/fonts. No application CSP or browser security setting was weakened. The CSP failure is retained in the probe log; the earlier timeout is recorded here.

Initial logs/results and the final logs are included under [logs](logs/). The initial findings were not removed by overwriting the final pass artifacts.

## Preservation and changed files

A pre-sprint SHA-256 manifest covered all inherited tracked and nonignored untracked files. The preservation audit compares against that manifest, rather than attributing the entire already-dirty worktree to this sprint. No inherited files were removed. Scientific/source libraries, retained datasets, public assets, and all historical review artifacts remained byte-identical to their pre-sprint state. See [preservation.json](preservation.json).

Application changes:

- `src/app/components/live-connectome-gate.tsx` — explicit capability/state copy and honest optional input label.
- `src/app/components/live-session.tsx` — read-only embodiment availability, visible waiting rail, empty-state explanation.
- `src/app/components/live-session.module.css` — responsive allocations, enlarged surfaces, readable rail, fly/control order.
- `src/app/components/tester-build.css` — full-width live boundaries, capability explanation, stable action padding.
- `src/app/observatory.tsx` — investigation setup after the instruments.
- New `src/app/components/live-telemetry-capability.test.tsx` — four capability/state tests.

Review tooling:

- New `scripts/installed-browser-review-drivers.mjs` — extracted installed-browser drivers shared with the previous lifecycle suite; Firefox screenshots wait for paint, navigation waits for pending requests, isolated HTML fixtures stay entirely inside browser interception.
- New `scripts/sprint1722-live-workspace-review.mjs` — five-size real-browser geometry/state/retention/identity acceptance.
- `scripts/sprint172-timeline-semantic-stability.mjs` — shared drivers; explicit embodiment action is conditional when already visible; wait for existing model readiness and mount isolated fixtures in an inert HTML document. Original semantic/identity/geometry/error assertions retained.
- `scripts/demo-layout-browser-review.mjs` — desktop waiting expects clearly labelled procedural embodiment, and still forbids pre-frame measurement charts.
- `scripts/human-state-browser-review.mjs` — independent waiting rail/chart measurements; existing-body-aware toggle.
- `scripts/sprint17-judge-journey.mjs` — existing-body-aware toggle and wait for computed camera bounds.
- `scripts/sprint16a-browser-review.mjs` — assert honest read-only explanation and absence of unavailable trial controls.
- New `docs/review/sprint-17-2-2/` report, logs, measurements and screenshots. Temporary orchestration files remain under ignored `tmp/sprint1722/`.

The instance-local presentation accumulator, permanent FRAME/NEURAL/INPUT/DECODER/STREAM keys, simultaneous transition capture, frozen event receipts, 120-frame retained buffer, scientific calculations and dataset contracts were preserved.

## Remaining issues and decision

- **P0:** None found in the tested offline scope.
- **P1:** One-time first-receipt expansion remains: measured charts, values and provenance initialize only after real evidence exists. Across the tested lifecycle cases, maximum timeline document-position change was **874 px**, maximum document-height increase **1358 px**. This is explicitly measured initialization, not steady-state telemetry movement; no synthetic measurements were inserted to hide it. Human review should decide whether a later sprint should reserve more pre-frame space.
- **P2:** On smaller viewports the existing navigation/header workflow remains tall, and the stacked instruments require scrolling. At 1366 the fly is intentionally opt-in/stacked; at 1024 and 760 the observations rail also stacks. No horizontal overflow was observed.
- **P2:** The optional experimental input branch was inspected and component-tested, but no real remote host trial or authenticated control capability was verified or added. External host interoperability remains outside this authorized no-feedback review.
- **P2:** Desktop column percentages are approximately 53/28/19 at 1728 and 53/28/20 at 1440; at 1440 the readable 14 rem rail floor slightly changes the suggested proportions. These are measured responsive allocations, not rigid percentage widths.

**PRODUCTION DEPLOYMENT RECOMMENDATION: NO.** Human visual acceptance is the next step. This recommendation does not claim an untested real external host or authorize release. No commit, push or deployment was performed. **STOP FOR HUMAN REVIEW.**
