# Sprint 10C.2A + 11A — Production alpha review

Date: 2026-10-30 (America/Toronto).

**NO COMMIT MADE.**

**STOP FOR HUMAN REVIEW.**

No push, deployment, branch switch/reset, staging, or FruitFly XR backend modification occurred. The actual starting checkout was clean on `feat/sprint-11a-production-alpha`, rather than the older branch/uncommitted state described in the brief. All existing 10C/10C.1/10C.2 UX was treated as the product baseline and preserved.

## Lighting correction and preserved UX

Added a neutral white directional fill from front-above, position `[4, 6, -6]`, intensity `2.8`, only when Anatomical is selected. It does not cast shadows. Existing primary lights, shadow map, contact shadows, clear/background colour, asset, geometry, textures, materials and experiment semantics are unchanged. Lightweight receives exactly the previous light configuration. The anatomical mesh remains the default. Visual review of desktop/mobile captures shows compound eyes, thorax, abdominal segmentation, wings, legs and silhouette with restrained highlights and retained PBR detail. No additional model dependency or shadow pass was added.

The female source visual mesh remains not sex-matched to the male CNS connectome; no male modifications are claimed. Source assets predate the hackathon; the web derivative/integration is the hackathon contribution. Existing disclosures and asset provenance were preserved.

Browser acceptance retains Home/logo navigation; all three workspace paths and consistent active styling; the canonical source Connect/Disconnect control; expandable sources and status explanations; explicit question submission/retention; persistent stimulus and stale-design invalidation; one approval CTA; centred condition playback; collapsed methodology; mobile layout; canonical connectome fit; telemetry-preserved camera; and persistent Ask CausalFly. No marketing page or duplicate action was added.

## Hostinger readiness and environment

Standard Next.js scripts remain `npm run build` and `npm start`. Node `24.x` is declared in package and lock metadata, matching local Node 24.18.0. `npm run dev` explicitly selects manual port 3132; review harness targets local 3142 and rejects other targets. No custom server, Docker, background worker, inbound WebSocket service, static export or hosting-specific workaround was introduced.

[Deployment guide](DEPLOY_HOSTINGER.md) covers GitHub branch/commit selection, intended hostname **causalfly.nurenyx.ai**, Node/framework, commands, configuration, smoke checks and rollback. The README links it and uses the current manual port. No hosting account settings or DNS were changed. Runtime application retention is memory-only, with no writes of uploads/evidence to local files. The offline scene fixture reads the bundled calibration video. Normal Next build/cache storage remains platform-managed.

Complete variable inventory and local/production/offline matrix are in the guide. Actual application names: `META_API_KEY` (secret), `META_BASE_URL`, `META_MODEL`, `META_SCENE_MODEL`, `META_TIMEOUT_MS`, `CAUSALFLY_FAKE_META`, `FRUITFLY_XR_OBSERVATORY_URL`; framework settings `NODE_ENV` and `PORT`. Harness-only settings: `CAUSALFLY_PLAYWRIGHT_MODULE`, `CAUSALFLY_REVIEW_URL`, legacy `CAUSALFLY_PREFLIGHT`. No separate SAM environment variable exists. Models remain `muse-wonder-1.0`, `muse-spark-1.3`, fixed `sam-3.1`. Fake Muse does not disable scene/SAM live actions; their explicit fixture paths are required offline.

`.env.example` now leaves the optional observatory URL empty and documents the local URL separately. No localhost production fallback exists. Production bridge configuration requires a remote `wss://` endpoint with the existing observatory path; invalid or absent settings give safe unavailability. Local development can still use `ws://127.0.0.1:8766/observatory/v1`. No future hostname or public port is assumed.

## Production-safe health

`GET /api/health` is evaluated at request time using Next's `connection()` (Cache Components enabled). It returns a fixed operational schema: app status, runtime mode, live/offline Meta mode, package version and configuration-validity booleans for Meta, scene, SAM and XR. `providersChecked: false` prevents interpreting these flags as provider health. Optional missing configuration still yields HTTP 200 for the running app. `Cache-Control: no-store` avoids stale readiness.

Configuration validators run locally with no external calls. No arbitrary environment values, URLs, credentials, raw errors, media, receipts or retained evidence are serialized. Production smoke returned all optional configuration flags false with runtime `production`, Meta mode `offline`, version `0.1.0` and no-store. Tests cover missing/invalid/valid settings, credential/URL omission, offline labelling, and production endpoint rejection.

## Security findings and deployment limits

Repository-scoped scan of tracked and nonignored working-tree text found no credential-pattern paths. Tracked environment inventory contains only `.env.example`; no accidentally tracked uploads, temporary logs or credential files were found. `.env.local` is present, ignored and unchanged; its values were never printed. The isolated production client bundles were also checked against the local credential without printing it: no matches. This is a source/artifact audit, not a penetration test or dependency vulnerability certification.

Existing SDK logging is disabled; provider failure messages remain sanitized. The new endpoint exports only allowlisted operational fields. Temporary logs, fixtures, dependency installs and build output are under ignored `tmp/`; only the requested safe captures and browser acceptance JSON are added to docs.

**Live public-alpha launch risk:** no user authentication or application-wide provider spending quota exists. Set external access/budget controls or use an explicitly labelled offline alpha before unrestricted public access. No claim of unrestricted production security is made. Retention and receipt signing are process-local; restart loss, expiry and multi-process routing can invalidate retained IDs. Use a single app process for this alpha, retain user downloads, and implement shared storage/ownership before scaling. Hosting resource, upload, outbound provider and stream timeout/proxy behavior still require a real hosting smoke test. Google-font downloads require outbound access at build time. Local offline acceptance does not validate paid model access.

## FruitFly XR Cloud Run boundary

[Cloud Run bridge plan](CLOUD_RUN_FRUITFLY_BRIDGE_PLAN.md) is **documentation only for Sprint 11B**: bind 0.0.0.0, injected PORT, one ingress with brain/observatory paths and healthz, Toronto region, max one/min zero instances, timeout up to 3600 seconds, reconnection/session semantics, secure wss, dataset packaging/retrieval and generated run.app URL first. No FruitFly XR files, server or simulation protocol were changed or deployed. Observational simulated dynamics are never labelled living-fly data or controlled biological causal evidence.

## Validation results

- Read AGENTS, current git status/diff, README, latest 10C/10C.1/10C.2 review, architecture, Meta/SAM/disclosure docs and installed Next deployment, route-handler and environment guides before implementation.
- Targeted health/security tests: **2 passed**. Changed lighting/component behavior additionally checked in the browser; no artificial render-only test was added.
- Full offline suite run once after application fixes: **363 passed** (306 library/server + 57 component), zero failures/skips. No live Muse/SAM calls.
- `npx tsc --noEmit`: passed. `npm run lint`: passed (repeated only after browser harness additions). `git diff --check`: passed.
- Root `npm ci` encountered Windows EPERM on a native dependency locked by the running human dev process. Human PID was not stopped. A non-destructive npm install repaired dependencies (with locked stale-directory cleanup warnings). **Clean `npm ci` succeeded in isolated `tmp/alpha-validation`** from the same package/lock files, followed by successful production `npm run build` and `npm start`. Root build was intentionally avoided to preserve human .next state. The isolated build's nested-lockfile root warning is a review-copy artifact. No dependency versions changed.
- Production build compiled, typechecked and generated routes including dynamic `/api/health`. Production server started in 373ms on **3142**.
- Real offline production HTTP flow: design → approve/run → interpret passed using actual routes, independently of XR. Provider credential and observatory URL were empty process overrides; fake Meta was explicit.
- Browser: **18 responsive/style checks** at 1920×1080, 1440×900 and 390×844, zero page errors/overflow. Explicit question, slider persistence, stale redesign, one approval, status hover/focus/click/Escape, retained evidence separation, connectome canonical fit and camera stability passed. Orbit/zoom/reset and Anatomical default passed. One 4,194,788-byte GLB download across navigation/model changes; explicit Lightweight works; aborted GLB load produces labelled automatic fallback. Demand rendering and existing DPR cap remain unchanged. No new client dependency or extra shadow map.
- All browser experiment requests were local fixtures generated through the fake client and real engine; EventSource was replaced with recorded offline simulation frames. Other API/external requests were blocked. **ZERO live Muse calls. ZERO live SAM calls. No automatic XR connection.** Real health and actual offline API smoke were checked separately.
- Local manual **3132 / PID 75804** was reported and preserved. Owned review **3142 / PID 92608** was stopped after validation; final check shows 3142 free and 3132 unchanged. Ports 8765/8766 belong to the separate local backend, which was untouched.

## Exactly four screenshots and preview

1. [Home — 1920](review/sprint-11a/01-home-overview-1920.png)
2. [Experiment / illuminated Anatomical fly — 1920](review/sprint-11a/02-experiment-1920.png)
3. [Live Connectome / disconnected retained snapshot — 1920](review/sprint-11a/03-live-connectome-1920.png)
4. [Experiment — 390 mobile](review/sprint-11a/04-experiment-mobile-390.png)

[Machine-readable browser checks](review/sprint-11a/browser-checks.json). Exactly four captures are retained; no comparison gallery was generated. They show offline experiment templates and replayed simulation evidence, not live provider results. All four were visually inspected.

Preview used: **http://127.0.0.1:3142** (offline production review, **now stopped**). No public preview or deployment was created. The existing human instance remains at http://127.0.0.1:3132. Rebuild/start with the documented port policy to review again.

## Exact changed-file inventory

- `.env.example`
- `README.md`
- `docs/CLOUD_RUN_FRUITFLY_BRIDGE_PLAN.md`
- `docs/DEPLOY_HOSTINGER.md`
- `docs/SPRINT_11A_PRODUCTION_ALPHA_REVIEW.md`
- `docs/review/sprint-11a/01-home-overview-1920.png`
- `docs/review/sprint-11a/02-experiment-1920.png`
- `docs/review/sprint-11a/03-live-connectome-1920.png`
- `docs/review/sprint-11a/04-experiment-mobile-390.png`
- `docs/review/sprint-11a/browser-checks.json`
- `package-lock.json`
- `package.json`
- `scripts/production-alpha-browser-review.mjs`
- `src/app/api/health/route.ts`
- `src/app/components/embodied-world.tsx`
- `src/lib/sources/fruitfly-bridge.ts`
- `src/lib/web/health.test.ts`
- `src/lib/web/health.ts`

## Full git diff --stat

Literal tracked-file output follows. Git excludes untracked new files from this command; the exact inventory above includes every new document, source, harness, JSON and screenshot without staging anything.

```text
 .env.example                          |  8 +++++++-
 README.md                             | 18 +++++++++++-------
 package-lock.json                     |  3 +++
 package.json                          |  8 ++++++--
 src/app/components/embodied-world.tsx |  2 ++
 src/lib/sources/fruitfly-bridge.ts    |  3 ++-
 6 files changed, 31 insertions(+), 11 deletions(-)
```

**NO COMMIT MADE.**

**STOP FOR HUMAN REVIEW.**
