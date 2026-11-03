# Sprint 17.2 — Verification Report

## 1. Automated Test & Build Suites

| Suite / Command | Result | Details |
| --- | --- | --- |
| `npm test` | **PASS** | **546 passed, 0 failed** (409 library/server tests + 137 component tests, including 3 new tests in `src/app/components/event-timeline-lanes.test.tsx`) |
| `npm run lint` | **PASS** | 0 errors, 0 warnings |
| `npm run build` | **PASS** | Next.js 16.4.3 production webpack + TypeScript build succeeded |
| `node scripts/sprint172-timeline-semantic-stability.mjs` | **PASS** | 6 viewport/scroll cases (`1728`, `1366`, `760` px × `scrollY` `0`, `800`), 10-step required semantic sequence + 90-step multi-digit telemetry burst: `maxGeometryDelta = 0 px`, `scrollDelta = 0 px`, `documentHeightRange = 0 px`, `replacements = []`, `laneOrderViolations = []`, `singleLaneUpdateViolations = []` |
| `node scripts/sprint171-timeline-stability.mjs` | **PASS** | 6 viewport/scroll cases × 541 samples (3,246 samples): `maximum = 0 px`, `scrollDelta = 0 px`, `heightRange = 0 px`, `replacements = []` |
| `node scripts/sprint171-neural-response-review.mjs` | **PASS** | All 36 playback states across `1728`, `1366`, `760` px with `0 px` geometry drift |
| `node scripts/sprint17-live-layout-stability.mjs` | **PASS** | Top/middle/bottom stationary scroll runs: `maximumPrimaryDelta = 0 px`, `maximumSlotDelta = 0 px`, `scrollDelta = 0 px`, `heightRange = 0 px`, `identityChanges = []`, `evidenceUnchanged = true`, `retained = 120` |
| `node scripts/sprint17-judge-journey.mjs` | **PASS** | Full offline judge journey (`PASS`, `errors = []`, `blocked = []`) |
| `node scripts/sprint16a-browser-review.mjs` | **PASS** | All 64 browser regression checks passed, 0 runtime errors |
| `git diff --check` | **PASS** | Clean formatting, 0 whitespace errors |

## 2. 10-Step Semantic Stability Sequence Verification

Verified in both `src/app/components/event-timeline-lanes.test.tsx` and `scripts/sprint172-timeline-semantic-stability.mjs` (`docs/review/sprint-17-2/timeline-semantic-stability.json`):

1. **`Frame received`** → updates `FRAME` (`Frame received`, `Tick 284`, `14,200 model ms`) and initializes `STREAM` (`Stream live`, `Live telemetry`, `Last received 21:07:10 UTC`); `NEURAL`, `INPUT`, `DECODER` show `"—"`.
2. **`Neural tick`** → updates **only** lane 2 (`NEURAL`: `Neural tick`, `Tick 285`, `14,250 model ms`).
3. **`Input reference changed`** → updates **only** lane 3 (`INPUT`: `Input reference changed`, `Tick 286`, `14,300 model ms`).
4. **`Decoder changed`** → updates **only** lane 4 (`DECODER`: `Decoder changed`, `IDLE → ESCAPE`, `Tick 287`).
5. **`Input reference changed`** → updates **only** lane 3 (`INPUT`: `Input reference changed`, `Tick 288`, `14,400 model ms`).
6. **`Neural tick`** → updates **only** lane 2 (`NEURAL`: `Neural tick`, `Tick 289`, `14,450 model ms`).
7. **`Stream reconnected`** → updates **only** lane 5 (`STREAM`: `Stream reconnected`, `Transport restored`, `Last received 21:07:20 UTC`).
8. **`Frame received`** → updates **only** lane 1 (`FRAME`: `Frame received`, `Tick 290`, `14,500 model ms`).
9. **`Input reference changed`** → updates **only** lane 3 (`INPUT`: `Input reference changed`, `Tick 291`, `14,550 model ms`).
10. **`Stream inactive`** → updates **only** lane 5 (`STREAM`: `Stream inactive`, `Snapshot retained`, `Last received 21:07:22 UTC`).

## 3. Scientific & Provider Lock Verification

- **Preserved Files:** All 1,420 files in `docs/review/sprint-17-1/preserved-files.json` match their exact SHA-256 hashes (`changed: []`).
- **Provider / Transport Calls:** `0` Meta requests, `0` Muse requests, `0` SAM requests, `0` media uploads, `0` real brain-control WebSocket messages.
- **Git / Deployment:** No commit, push, or deployment performed.
