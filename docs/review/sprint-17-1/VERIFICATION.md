# Sprint 17.1 Verification — 2026-11-02

All provider/storage/control journeys below use offline fixed templates, intercepted responses or in-memory sockets. No genuine provider request, media upload or real brain-control message was made.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm test` | PASS: 543 tests, 409 library/server + 134 component, zero failures | `test.log` |
| `npm run build` | PASS: production webpack build and TypeScript | `build.log` |
| `npm run lint` | PASS | `lint.log` |
| `node scripts/sprint171-timeline-stability.mjs` | PASS: 0 px maximum movement across 1728/1366/760 px at scrollY 0 and 800 (3,246 samples / 1,620 updates) | `timeline-after.log`, `timeline-after.json` |
| `node scripts/sprint171-neural-response-review.mjs` | PASS: 36 condition/step states across 1728/1366/760 px, 0 px geometry movement, network SVG 416 px / trace 200 px on desktop | `neural-after.log`, `neural-after.json` |
| `node scripts/sprint17-live-layout-stability.mjs` | PASS: 0 px scroll/height/primary/slot delta at top, middle and bottom positions | `layout-test.log`, `layout-instability.json` |
| `node scripts/sprint17-judge-journey.mjs` | PASS: Overview → question → design → explicit approval → 50% reduction → Compare → interpret → Evidence → live fixture → embodiment → retained | `judge-test.log`, `judge-journey.json` |
| `node scripts/sprint16a-browser-review.mjs` | PASS: 64 checks, zero runtime errors | `browser-regression.log`, `browser-regression/results.json` |
| Scientific/history fingerprint verification | PASS: 1,420 preserved files unchanged, prior review byte prefix intact | `preserved-files.json`, `preservation-verification.json` |
| `git diff --check` | PASS: no whitespace errors | Working tree check |

## Event Timeline stability summary

- Widths tested: **1728 px**, **1366 px**, **760 px** (at `scrollY = 0` and `scrollY = 800`).
- Samples: **541 samples per case** (270 presentation updates per case; **3,246 samples / 1,620 updates** total).
- Values exercised: `1`, `9`, `99`, `284`, `999`, `1,000`, `18,421`, `99,999`, `192,000`.
- Transitions exercised: `Frame received`, `Neural tick`, `Input reference changed`, `Decoder changed`, `Awaiting event`, `Stream reconnected`, `Stream inactive` (retained snapshot).
- Maximum panel/track/slot/label/tick/time/marker/baseline displacement: **0 px** (tolerance ≤1 px).
- Stationary `scrollY` delta: **0 px**; document-height range: **0 px**; monitored DOM node replacements: **0**.

## Neural Response judge-clarity summary

- States tested: **36 condition/step states** (`Control` and `Intervention` across all 6 recorded simulation steps `0..5` at **1728 px**, **1366 px** and **760 px**).
- Desktop dimensions (1728 px and 1366 px): network SVG height **236 px → 416 px** (+76.3%), Activity Trace height **78 px → 200 px** (+156.4%). At 760 px: network SVG height **336 px**, Activity Trace height **200 px**.
- Maximum displacement across condition switches and step scrubbing (`outer`, `network`, `trace`, `figure`, `toolbar`, `response`, `scrollY`, `documentHeight`): **0 px** (tolerance ≤1 px).
- Facts panel explicitly distinguishes **“Retained trial totals · not current-step output”** from the current-step header readout, using authoritative `CompactTrialSummary` and `resultSummary` values without recalculation.

## Remaining human gate

Playwright Firefox runtime is absent; genuine Firefox live telemetry acceptance was **not** executed in automation. Follow [`HUMAN_FIREFOX_ACCEPTANCE.md`](HUMAN_FIREFOX_ACCEPTANCE.md).

- **P0 remaining:** 1 (Human Firefox live telemetry acceptance required)
- **P1 remaining:** 0
