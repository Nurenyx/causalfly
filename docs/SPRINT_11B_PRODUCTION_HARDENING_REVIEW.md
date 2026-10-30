# Sprint 11B production hardening review

Review date: 2026-10-30. Branch: `feat/sprint-11b-production-hardening`, based on clean `main` at `02baceb`. No commit, push or deployment performed. Human review required before release.

## Upload architecture and provider handoff

Before: browser multipart video -> CausalFly scene/SAM route -> buffered file -> Meta Files API. A video above the Vercel Function request limit could fail before application validation.

After: browser validates MP4/MOV, nonempty <=20 MiB, <=15 seconds and <=1920 pixels per side -> `POST /api/media/authorize` with small filename/type/size JSON -> browser directly PUTs bytes to the signed **private Vercel Blob** endpoint -> browser sends only `{ mode: "live", media: { ticket }, ...selection }` to `/api/perception/scene` or `/api/perception` -> server verifies its signed receipt -> authenticated `head(pathname)` and `get(pathname, {access:"private", useCache:false})` in the configured store -> bounded download -> existing container inspection and SHA-256 -> existing Meta Files API -> Muse `input_file.file_id` or SAM `input_video.file_id` -> existing deterministic geometry mapping.

The two perception routes reject multipart bodies and bound JSON to 4096 bytes. No user video enters a Function request body. The Function payload ceiling therefore no longer limits browser video uploads; Function memory/duration and outbound provider limits still apply. **20 MiB = 20,971,520 bytes is CausalFly's intentional product limit, not Blob's platform maximum.** Existing 15-second, 900-frame, 1920-pixel and timestamp rules remain in `inspectVideo`. Container metadata is checked server-side, never accepted solely from the browser.

The actual integration requires file uploads; no remote-URL provider support is assumed. The server downloads the private video and creates a generically named `stimulus.mp4`/`.mov` File for the existing official OpenAI-compatible Meta SDK. No base64 expansion or public Blob is used. A bounded Buffer plus File copy is still required by the existing container parser/File contract; this sprint does not claim zero-copy streaming. Provider files retain existing finally-delete behavior with one-hour provider expiry if deletion fails. Blob and provider-file retention are separate.

## SDK and security model

Added direct dependency **`@vercel/blob@2.7.0`**, pinned exactly. No Next/React/Three/R3F upgrade. A scoped npm override maps `@vercel/cli-config`'s pinned vulnerable `zod@4.1.11` to the already-used patched **4.6.7**, within the same major. `npm audit` reports zero vulnerabilities after this override.

Inspected installed SDK types and credential resolution, plus official [private storage](https://vercel.com/docs/vercel-blob/private-storage), [Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), and [SDK source](https://github.com/vercel/storage/tree/main/packages/blob). Vercel runtime OIDC is resolved automatically by the SDK with `BLOB_STORE_ID`; no static credential is sent to the browser. A server-only `BLOB_READ_WRITE_TOKEN` fallback is supported for local/non-Vercel operation. Do not set `NEXT_PUBLIC_` for any storage/provider/signing credential.

`issueSignedToken` receives a server-generated, timestamped UUID pathname under `causalfly/tmp/v1/`, only `operations:["put"]`, a five-minute expiry, exact accepted MIME, and `maximumSizeInBytes:20971520`. `presignUrl` signs only that private PUT with overwrite and random suffix disabled. Only the final signed PUT URL reaches the browser; delegation and signing material stay server-side. The caller cannot select a pathname, override constraints, acquire read/list/delete permissions, or overwrite another run. Original filename and content type must agree. Wildcard permissions are never issued.

This publicly reachable alpha has no user accounts: upload authorization is same-origin and narrowly scoped, not an authenticated per-user quota. A nonbrowser attacker can spoof Origin and obtain repeated constrained grants. Activate the Firewall limits below before public promotion. No process-local counter is presented as a distributed rate limiter.

## Canonical reference, provenance and diagnostics

The browser holds an HMAC-signed capability ticket, not an arbitrary URL. Its size, filename, type, UUID, generated pathname, issue/expiry time and workflow run ID are authenticated with independent `CAUSALFLY_MEDIA_SIGNING_SECRET` (>=32 characters). Its two-hour lifetime is stable across server instances when this secret is shared. Unexpected fields, malformed/tampered/expired tickets, external URL substitution, noncanonical paths, public store metadata, mismatched MIME/size/ETag, missing or truncated downloads fail before provider use.

Canonical retained `BlobMediaIdentity` fields are `mediaId`, `blobPathname`, `contentType`, `sizeBytes`, `originalFilename`, `uploadedAt`, `sha256`, `runId`, `storageProvider:"vercel-blob"`, `storageAccess:"private"`. Authoritative metadata and computed hash populate this object; the client never supplies it. No signed URL or ticket is retained in scientific records/diagnostic exports.

Flight Recorder records `media.selected` and `media.upload.authorized` when validating authorization metadata, then `media.upload.completed`/`media.validated` on server retrieval before provider use. Completion is confirmed at validation, not an unverified browser report. It carries media identity through scene discovery, candidate confirmation, SAM, stimulus, experiment design, deterministic measurements and interpretation. Reusing a reference does not upload again. Existing server-issued perception receipts retain identity/hash alongside geometry. Raw source cleanup does not delete scientific records. Switching back to synthetic/offline input clears only the active media association; earlier immutable exported snapshots retain their input identity.

The existing recorder/scene/design stores and perception-receipt signing key are still process-local. On different serverless instances/restarts, a scene/design lookup may require an explicit repeat or manual concept entry; media tickets themselves remain verifiable across instances. This sprint does not claim durable distributed scientific-session storage. Exports remain inspectable copies, not independent biological attestations.

## Media lifecycle

Tickets expire two hours after authorization. No new media resolution starts after expiry. Explicit operator cleanup (`POST /api/media/cleanup`, `Authorization: Bearer <CRON_SECRET>`) lists up to 100 namespace objects per call and deletes objects past the two-hour window **plus five minutes**. It also checks the actual upload date has passed the grace interval. The five-minute margin exceeds perception routes' 240-second execution budget; active valid workflows retain their source. Cleanup only targets matching temporary paths; it never touches scientific records.

The response returns `{deleted,cursor}`. Repeat POST with `?cursor=<encoded cursor>` until cursor is null. Repeat whole sweeps regularly. Replaced, failed and abandoned uploads remain eligible after the same safety window; eager deletion would risk another instance still using the reference. Provider failure leaves the upload available for explicit retry until expiry. “Upload again” discards the local reference and issues a fresh grant on the next live action.

**No automatic storage TTL or scheduled job is configured.** An operator must invoke sweeps or configure a protected external scheduler that drains cursor pages. If nobody runs cleanup, raw objects remain stored after application access expires. This is an explicit retention limitation, not automatic expiration. Rotate signing secret only with awareness that existing media tickets become invalid; cleanup uses namespace timestamps independently.

## UX and offline behavior

The existing cockpit hierarchy is retained. File selection performs browser size/type checks; preview checks duration/dimensions. Transport stages are separate from inference: Preparing upload -> Uploading — XX% -> Upload complete / ready -> Analyzing scene -> candidate selection. Signed PUT uses native XHR upload progress because the SDK's separate `upload()` token-exchange protocol is not the signed-URL transport selected here. No token or signed URL is included in error messages. Upload references live in workspace-owned session state; navigation/rerender does not initiate a provider request. A provider error keeps the reference and provides explicit retry/re-upload controls.

With `CAUSALFLY_FAKE_META=1`, primary discovery loads the server's calibration clip/scene fixture, candidate selection is explicit, and tracking loads authored geometry. No user video upload or provider credentials are needed. Output says OFFLINE fixture; fixture details no longer claim live SAM segmentation. Muse design/interpretation use existing fake templates. Manual concept entry and explicit offline controls remain available. A live failure is never converted into a fixture response.

## Meta switch and health

`CAUSALFLY_META_ENABLED=1` permits live provider requests, still requiring explicit application actions and valid configuration. `0`, absent or other values deny live requests, even with keys. Fake mode independently blocks live scene/SAM. `LiveMetaClient.complete` checks before every attempt (including retries); `discoverScene`/`analyzeSamVideo` check before file upload; both live perception handlers check before storage resolution/provider invocation. Configuration checks themselves remain network-free.

`GET /api/health` exposes `configuration.metaConfigured`, `configuration.sceneModelConfigured`, `configuration.samConfigured`, existing `configuration.fruitFlyXR`, effective `metaEnabled`, `metaMode` (`offline`, `live`, `disabled`), and `providersChecked:false`. Configured does not mean enabled or checked. The endpoint returns no keys, tokens, store credentials, signed URLs or environment values and uses no-store responses.

## WebGL audit

The app-owned `shadows` option previously selected R3F's default `PCFSoftShadowMap`. It now explicitly uses supported `PCFShadowMap`. No dependency code was patched. The production browser pass shows no PCFSoftShadowMap, depth/shadow filtering or viewport warnings.

`THREE.Clock` is constructed inside `@react-three/fiber@9.8.2` (`dist/events-e51d7528.esm.js` createStore), not by CausalFly. Its deprecation warning remains until an upstream R3F timing migration. Patching node_modules or overriding its clock with a partial Timer adapter would be brittle and is intentionally avoided.

R3F owns renderer teardown and calls `dispose`/`forceContextLoss` on unmount; corresponding context-loss log messages during navigation are expected resource release, not evidence of accumulating live contexts. Controls dispose and remove listeners. Connectome controls already handle context loss via the existing projection fallback. GLTF uses one cached loader asset and skeleton-aware instance clones; materials/geometries remain shared/immutable (`dispose={null}` intentionally protects cache resources). R3F owns per-renderer GPU state and declarative geometry/material disposal. Mediabunny Input always disposes; browser object URLs are revoked when replaced. Canvas rendering is demand-driven; no application-owned perpetual RAF was added.

The embodied world now handles actual context loss with a recoverable visual message and explicit Restore visual view. Only its Canvas remounts; application/scientific state is preserved, with no engine/provider rerun. Browser audit also reports GPU ReadPixels stalls associated with screenshot capture. These driver/performance messages are retained in review output, not suppressed. This is a navigation/resource sanity check, not a formal long-duration GPU/heap proof.

## Vercel setup and production acceptance

1. In the existing project's Storage tab create/connect a **Private** Blob store. Confirm private access in the dashboard; never switch it public. Enable project OIDC access for the connected store and set its `BLOB_STORE_ID` in each relevant environment. Vercel supplies the rotating runtime OIDC token. Do not copy a runtime token into client configuration. Where OIDC is unavailable, configure the server-only store RW token instead.
2. Set a cryptographically random, stable `CAUSALFLY_MEDIA_SIGNING_SECRET` (>=32 characters), independently of provider/storage credentials. Share it across instances. Set `CRON_SECRET` for cleanup. Keep `.env.local` ignored.
3. Keep the alpha offline with `CAUSALFLY_FAKE_META=1`, `CAUSALFLY_META_ENABLED=0`. Enable live only deliberately with fake mode cleared and `CAUSALFLY_META_ENABLED=1`, valid official Meta settings and model entitlements. No live provider acceptance was performed in this sprint.
4. Activate Firewall rules below and arrange repeated authenticated cleanup sweeps. No `vercel.json` deployment/cron was created.
5. After human-approved deployment, perform one real **Blob-only** acceptance using private storage: exact 20 MiB direct browser PUT/progress; verify unauthenticated Blob GET fails, signed URL expiry, oversize/type denial, non-overwrite behavior, server reference validation and cleanup. Verify actual OIDC project/store permissions and PUT CORS with the deployed origin. Providers can stay disabled; exercise reference retrieval in a controlled server acceptance harness. Only a separately authorized manual live Muse/SAM action should test paid handoff.

No Blob credentials were used for automated tests; signing/control-plane and storage I/O were mocked. SDK types, constraints, OIDC resolution and outbound provider contracts were inspected. Actual platform enforcement and project configuration remain a deployment acceptance requirement.

## Firewall activation recommendations

Use Vercel Firewall custom rules restricted to **POST** and the exact paths below. Initial per-source-IP limits are alpha starting values, not measured capacity guarantees. Use a sliding 60-second window and 10-minute block/challenge mitigation where supported by the account plan. Prefer block/429 for API callers; a browser challenge needs a compatible entry-page flow. Exclude authenticated cleanup operators from unrelated rules, not from its bearer authentication.

| Exact POST route | Work / recommended initial limit |
| --- | --- |
| `/api/experiments` | Muse design + interpretation (guided action JSON), and legacy complete workflow: 6/min/IP. Deterministic run actions share this route, so path-level policy also limits them. |
| `/api/perception/scene` | Muse Spark scene discovery: 3/min/IP. Fixture actions share the path. |
| `/api/perception` | SAM tracking/segmentation: 3/min/IP. Fixture actions share the path. |
| `/api/sources/fruitfly/analyze` | Muse observational interpretation: 3/min/IP. Read-only source transport remains unchanged. |
| `/api/media/authorize` | Cost-bearing storage authorization: 5/min/IP, plus daily per-IP quota if supported (e.g. 50/day). |
| `/api/media/cleanup` | Operator-only: restrict trusted scheduler/operator access where feasible; 10/min/IP, retain bearer check. |

These rules are recommendations, not activated changes. Existing per-process duplicate token suppression/busy caps remain; they are not globally reliable rate limiting or global idempotency. Add a shared idempotency/quota store if stronger cross-instance protection is needed. Repeated authorized grants and distributed source IPs remain a cost risk; monitor storage/provider spend.

## Validation and artifacts

- Full `npm test`: library and component suites pass; focused Blob tests also run separately. **316 library + 58 component tests pass**. All 10 focused Blob tests pass.
- `npx tsc --noEmit`, ESLint, webpack production build and `git diff --check` run locally. `npm audit`: zero vulnerabilities after scoped override.
- `scripts/production-hardening-browser-review.mjs`: production preview, 1920/1440/390 widths, Home/Experiment/Live Connectome/Evidence, anatomy/default/cache/failure fallback, published soma rendering and orbit/reset, eight navigation cycles (one attached canvas and one live GPU context after each cycle), real context-loss recovery without rerun. External network and all expensive providers intercepted/blocked.
- `scripts/production-hardening-perception-review.mjs`: real local offline discovery -> confirmation -> tracking -> design -> deterministic measurement, export inspection and retained navigation state. Separate mocked-storage live path transfers 20 MiB directly with small JSON authorization/reference requests, progress events, simulated provider failure and explicit retry reuse. Playwright request interception bypasses network progress, so the storage mock dispatches a native progress event to test 50% UI rendering; real deployment progress remains part of Blob acceptance.
- Review JSON/screenshots under `docs/review/sprint-11b/`. Local preview: **http://127.0.0.1:3142** (not a deployed URL).
- Windows checkout converted the fly license to CRLF. The source-license hash test now normalizes CRLF to LF; its canonical hash exactly matches committed upstream text. No model/license content or scientific measurement was changed.

## Remaining risks and preserved boundaries

Private Blob/OIDC, deployed CORS, signed PUT enforcement, storage billing and project permissions need real deployment acceptance. Cleanup is explicit, not automatically scheduled. Public cost controls need dashboard activation; process-local workflow state can expire or miss across instances. Videos are bounded but still buffered server-side for container validation/provider File handoff. Dependency-owned Clock warnings remain. Browser GPU checks do not replace production-device soak testing. Original filenames are retained as input provenance; users should review diagnostics before sharing.

No TrialResult/ExperimentComparison or deterministic-engine changes. No FruitFly XR server/transport changes. Home/Experiment/Connectome/Evidence architecture remains intact. REAL-FLY VALIDATION remains Not established; published connectome structure is not a living-fly recording; visual embodiment does not establish biological response. AI proposes/interprets; CausalFly measures.

## Human review inventory

The exact working-tree file list and `git diff --stat` are included in the completion report. Added runtime package and transitive lockfile inventory follows. No commit, push or deployment is authorized by this sprint.

```text
@vercel/blob@2.7.0
@vercel/cli-config@0.3.1
@vercel/cli-exec@1.0.1
@vercel/oidc@3.8.10
async-retry@1.3.3
execa@5.1.1
get-stream@6.0.1
human-signals@2.1.0
is-buffer@2.0.5
is-node-process@1.2.0
is-stream@2.0.1
jose@5.10.0
merge-stream@2.0.0
mimic-fn@2.1.0
npm-run-path@4.0.1
onetime@5.1.2
os-paths@4.4.0
retry@0.13.1
signal-exit@3.0.7
strip-final-newline@2.0.0
throttleit@2.1.0
undici@6.29.1
xdg-app-paths@5.5.1
xdg-portable@7.3.0
```

### Exact changed files

50 files total: 30 modified tracked files and 20 new untracked files. Everything remains unstaged.

```text
.env.example
README.md
docs/DEPLOY_HOSTINGER.md
docs/SPRINT_11B_PRODUCTION_HARDENING_REVIEW.md
docs/review/sprint-11b/01-home-overview-1920.png
docs/review/sprint-11b/02-experiment-1920.png
docs/review/sprint-11b/03-live-connectome-1920.png
docs/review/sprint-11b/04-experiment-mobile-390.png
docs/review/sprint-11b/05-offline-perception-1440.png
docs/review/sprint-11b/06-upload-ready-1440.png
docs/review/sprint-11b/browser-checks.json
docs/review/sprint-11b/perception-checks.json
docs/review/sprint-11b/webgl-checks.json
package-lock.json
package.json
scripts/production-hardening-browser-review.mjs
scripts/production-hardening-perception-review.mjs
src/app/api/media/authorize/route.ts
src/app/api/media/cleanup/route.ts
src/app/components/embodied-world.tsx
src/app/components/perception-panel.test.tsx
src/app/components/perception-panel.tsx
src/lib/meta/client.ts
src/lib/meta/meta.test.ts
src/lib/meta/observational.test.ts
src/lib/meta/provider-errors.test.ts
src/lib/meta/sam-client.test.ts
src/lib/meta/sam-client.ts
src/lib/meta/scene-client.test.ts
src/lib/meta/scene-client.ts
src/lib/meta/transport.test.ts
src/lib/perception/blob-contract.ts
src/lib/perception/blob-media.test.ts
src/lib/perception/blob-media.ts
src/lib/perception/contracts.ts
src/lib/perception/upload-client.ts
src/lib/web/flight-recorder-types.ts
src/lib/web/flight-recorder.test.ts
src/lib/web/flight-recorder.ts
src/lib/web/flyv2-asset.test.ts
src/lib/web/health.test.ts
src/lib/web/health.ts
src/lib/web/media-action.ts
src/lib/web/media-test-fixture.ts
src/lib/web/perception-action.test.ts
src/lib/web/perception-action.ts
src/lib/web/perception-session.ts
src/lib/web/scene-action.test.ts
src/lib/web/scene-action.ts
src/lib/web/workflow.test.ts
```

### git diff --stat

Git does not include untracked files in this command. The new files are listed above.

```text
 .env.example                                 |  18 +-
 README.md                                    |   9 +-
 docs/DEPLOY_HOSTINGER.md                     |   2 +
 package-lock.json                            | 284 ++++++++++++++++++++++++++-
 package.json                                 |   6 +
 src/app/components/embodied-world.tsx        |  25 ++-
 src/app/components/perception-panel.test.tsx |  10 +-
 src/app/components/perception-panel.tsx      |  46 +++--
 src/lib/meta/client.ts                       |  11 ++
 src/lib/meta/meta.test.ts                    |   6 +-
 src/lib/meta/observational.test.ts           |   2 +-
 src/lib/meta/provider-errors.test.ts         |   2 +-
 src/lib/meta/sam-client.test.ts              |   6 +-
 src/lib/meta/sam-client.ts                   |   3 +-
 src/lib/meta/scene-client.test.ts            |   2 +-
 src/lib/meta/scene-client.ts                 |   3 +-
 src/lib/meta/transport.test.ts               |   2 +-
 src/lib/perception/contracts.ts              |   1 +
 src/lib/web/flight-recorder-types.ts         |   4 +-
 src/lib/web/flight-recorder.test.ts          |  11 +-
 src/lib/web/flight-recorder.ts               |  15 +-
 src/lib/web/flyv2-asset.test.ts              |   3 +-
 src/lib/web/health.test.ts                   |  10 +-
 src/lib/web/health.ts                        |   9 +-
 src/lib/web/perception-action.test.ts        |   9 +-
 src/lib/web/perception-action.ts             |  56 +++---
 src/lib/web/perception-session.ts            |   2 +
 src/lib/web/scene-action.test.ts             |  18 +-
 src/lib/web/scene-action.ts                  |  36 ++--
 src/lib/web/workflow.test.ts                 |   4 +-
 30 files changed, 497 insertions(+), 118 deletions(-)
```
