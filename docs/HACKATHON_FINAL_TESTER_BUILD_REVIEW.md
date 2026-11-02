# Sprint 16A tester-build review

Status: implementation complete; human acceptance and service configuration required before deployment.

## Starting checkpoint and scope

The requested pre-edit checks reported repository `C:/Users/Jason/Documents/GitHub/causalfly`, branch `feat/hackathon-final-tester-build`, HEAD `c16b640`, a clean working tree, and no `git diff --check` errors. The requested branch already existed, so it was retained. The current user instruction superseded the attachment's older instruction to create it from the scientific branch.

All changes are in CausalFly. FruitFly XR was neither edited nor launched. No commit, push, deployment, Quest integration, neuroscience research, new walking behavior, or workflow reordering was performed. Question → Design → Run → Compare → Interpret remains intact.

## Bugs fixed

- Video authorization collapsed validation, missing credentials, provider failures and timeouts into a generic HTTP 400. It now returns safe, actionable 400/503/502/504 responses with stable error codes. Signing configuration is checked before requesting a storage grant; provider credentials are checked for the default storage adapter.
- A single perception failure previously appeared locally, in the workflow panel, in the global error panel, and in a notification. The workspace-owned perception session now owns one persistent inline alert, including receipt/acceptance recovery. Diagnostics remain available separately. Retry retains the selected file and works without refreshing.
- Empty or `application/octet-stream` browser MIME values now normalize from MP4/MOV extensions. Conflicting declared types remain rejected. Existing size, real container, duration and dimension checks remain in place.
- Upload authorization, signed PUT and analysis requests have bounded waits and leave an explicit failure state. Successful upload says **not yet analyzed**. Local preview and offline tracking retain their disclosures; failure cannot create a successful analysis result.
- Live Connectome previously offered a passive waiting screen and connection details without a clear trial/replay action. A dedicated launch panel now explains backend availability, trial control and historical playback separately.
- Switching from synthetic Compare into Live Connectome now selects Observe rather than retaining an unsupported Compare mode. Repeated connection-error prose was consolidated into the launch panel and expandable connection details.
- Experiment, Compare, Live Connectome, Evidence and Overview now use `PageHeader`, with shared eyebrow, title, subtitle, status and optional action slots. Shared status chips implement ACTIVE, READY, STANDBY, OFFLINE, ERROR and INFORMATIONAL. Primary status chrome retains Meta, brain availability and connectome provenance; unused Quest status no longer competes with the title.
- Compare condition/output/threshold cards now occupy a separate grid above the canvas. The hero canvas uses 60vh within 440–740 px bounds. Playback and camera controls have separate rows and a usable slider width.
- Experiment preview and measured neural graphics use a larger graph with adjacent measurements. Conflicting legacy fixed-size/important rules were removed. Exact engine values, condition selection, chart samples, scientific limitations and provenance are preserved.
- Restrained scene changes add a soft neutral rim light and reduce grid contrast without changing meshes, physics, neural traces or motor execution. Existing data-driven neural activation remains tied to recorded values.
- The workflow's screen-reader announcement is derived directly from the current result/design, eliminating an existing lint error and redundant render.

## Video root cause, lifecycle and operator configuration

In this checkout, a presence-only configuration audit found Meta configured/enabled, but **no Blob store ID, Blob read/write token or valid media signing secret**. The original route hid this configuration failure behind the same 400 used for bad files. This establishes the local root cause; deployed environment values were not inspected, so a production root cause is not claimed as verified.

For local/non-Vercel hosting, configure a **private** Blob store with `BLOB_READ_WRITE_TOKEN` and an independent stable `CAUSALFLY_MEDIA_SIGNING_SECRET` of at least 32 characters. Vercel hosting can use `BLOB_STORE_ID` with its runtime OIDC credentials instead of a read/write token. Keep all credentials server-only. `.env.example` documents these settings. No credential values were displayed or added to the repository.

The browser sends only small authorization JSON through Next; video bytes PUT directly to the SDK-issued HTTPS URL. The installed SDK uses a signed write API URL; private object read URLs are a different surface. Tickets bind a random pathname, filename, type, exact size and two-hour lifetime. Storage grants last five minutes, are put-only and disallow overwrite. The server verifies stored metadata, private read host, exact bytes, ETag, hash and actual media before Meta analysis.

Storage grant requests time out after 30 seconds, browser authorization after 35 seconds, PUT after 120 seconds, and browser analysis after 240 seconds. Existing server provider deadlines and bounded private downloads remain. Meta uploads retain their existing deletion/one-hour expiry handling. Private Blob cleanup remains an explicit authenticated bounded sweep with expiry plus grace; no automatic deletion/TTL is claimed. Configure the existing cleanup operator/cron before production use.

**Acceptance gate:** real private upload → Muse scene discovery → SAM tracking must be exercised on the intended host after credentials are configured, including a retry and expired media recovery. Mocked success does not establish live provider/storage connectivity. No paid provider requests were made in this review.

## Live architecture decision

`testerLiveState` explicitly distinguishes OFFLINE, CONNECTING, READY, RUNNING, RECORDED_REPLAY and ERROR. RUNNING requires a newly received, fresh frame; clicking Start never fabricates it. Lost or stale streams retain historical evidence. Missing configured endpoints surface an unavailable/error state with replay still usable.

The existing read-only `/observatory/v1` subscription observes telemetry; it does not launch a trial. **START LIVE TRIAL** reuses CausalFly's existing opt-in `ExperimentalBrainAdapter` and bounded Autonomy trial. Opening `/brain/v1` performs the existing hello/session handshake and sends the existing analytic sensory proxy messages. No new backend command, arbitrary stimulation, process launcher, server modification or new scientific behavior was introduced. The button is enabled only for READY telemetry plus a valid configured brain-control endpoint. Trial control failure remains visible in the existing transport status. Close trial releases its connection; reconnect/retry is explicit.

Deployment requires a hosted secure `FRUITFLY_XR_OBSERVATORY_URL` and build-time public `NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL`. These are absent here. Endpoint configuration alone does not prove reachability or a successful trial. Real live-start verification is deferred until the service is available. External testers never need a terminal.

Replay is a separate presentation lane using the existing pinned `docs/review/sprint-6b/recorded-evidence.json`. The [original capture provenance](SPRINT_6B_ASSISTANT_REVIEW.md#screenshot-provenance-and-captures) documents its genuine Sprint 5.6 origin. It is revalidated against the existing protocol, connectome hash and provenance; original receipt/model times and exact values are retained. It cannot qualify as live even under a clock equal to its original receipt. It does not enter active observation retention, call Meta, run motor embodiment, or send sensory messages. The primary Evidence page also displays the recorded source explicitly, with all capture frames available for inspection.

**Recording limitation:** only four retained frames are available, covering model time 50–200 ms. The UI calls this a PARTIAL CAPTURE and advances one retained tick per second for inspection, without interpolation. This is protocol/source validation, not a full-run or biological validation claim. A longer existing-protocol capture can be substituted after separate human review; no frames or extended neural horizon were invented.

Baseline locomotion remains engineered, motor execution remains the CausalFly procedural controller, and anatomical/sex-match and real-fly validation disclosures remain. No Sprint 15E neuromechanical walking claim is made.

## Verification and screenshots

- `npm test`: PASS, 495 tests (381 library/server + 114 components), zero failures. Existing assertions were retained. Added regressions cover MIME normalization, authorization classification, retries after grant/PUT/network/timeout failures, a single persistent error, all six live states, immutable recorded evidence, header structure and active/offline/error status semantics.
- `npm run build`: PASS, optimized webpack production build and TypeScript checks; all existing application/API routes build successfully.
- `npm run lint`: PASS, zero errors or warnings.
- `node scripts/sprint16a-browser-review.mjs`: PASS, **26 checks**, zero browser page errors. Production Next was served only on loopback port 3464 with `CAUSALFLY_FAKE_META=1`; the harness refuses live Meta mode before any workflow action. Provider/storage responses were intercepted or deterministic fixtures. This was not a live science/provider acceptance run.
- `git diff --check`: PASS. HEAD/branch remain at the starting checkpoint, with the intended uncommitted CausalFly changes.

The app uses state-based workspace navigation at `/`; the following are workspace states, not separate URL routes. All eight states below were audited at **1920×1080, 1440×900 and 1366×768**. Assertions verify no horizontal page overflow and consistent header padding/title sizing across states. Compare additionally checks canvas height, condition cards above the canvas, and non-intersecting control buttons. The preview graph has an actual-width regression assertion.

| Workspace/state | 1920×1080 | 1440×900 | 1366×768 |
| --- | --- | --- | --- |
| Experiment / initial | [image](review/sprint-16a/experiment-1920.png) | [image](review/sprint-16a/experiment-1440.png) | [image](review/sprint-16a/experiment-1366.png) |
| Experiment / measured neural system | [image](review/sprint-16a/measured-experiment-1920.png) | [image](review/sprint-16a/measured-experiment-1440.png) | [image](review/sprint-16a/measured-experiment-1366.png) |
| Compare / readouts and hero | [image](review/sprint-16a/compare-1920.png) | [image](review/sprint-16a/compare-1440.png) | [image](review/sprint-16a/compare-1366.png) |
| Synthetic Evidence | [image](review/sprint-16a/evidence-1920.png) | [image](review/sprint-16a/evidence-1440.png) | [image](review/sprint-16a/evidence-1366.png) |
| Overview | [image](review/sprint-16a/overview-1920.png) | [image](review/sprint-16a/overview-1440.png) | [image](review/sprint-16a/overview-1366.png) |
| Live / offline | [image](review/sprint-16a/live-offline-1920.png) | [image](review/sprint-16a/live-offline-1440.png) | [image](review/sprint-16a/live-offline-1366.png) |
| Recorded replay | [image](review/sprint-16a/recorded-replay-1920.png) | [image](review/sprint-16a/recorded-replay-1440.png) | [image](review/sprint-16a/recorded-replay-1366.png) |
| Recorded Evidence | [image](review/sprint-16a/recorded-evidence-1920.png) | [image](review/sprint-16a/recorded-evidence-1440.png) | [image](review/sprint-16a/recorded-evidence-1366.png) |

Additional inspected captures: [complete Compare hero](review/sprint-16a/compare-hero.png), [expanded preview topology](review/sprint-16a/preview-neural-system.png), [one upload failure with retry](review/sprint-16a/video-failure-retry.png), [successful retry into an explicitly offline scene fixture](review/sprint-16a/video-retry-success-fixture.png). [Machine-readable browser results](review/sprint-16a/results.json) retain geometry and scenario outcomes.

The browser journey exercised design → approval/run → Compare → interpretation → Evidence; backend offline, reconnect, READY, fresh RUNNING, stale READY, ERROR, replay/restart/pause/return; replay diagnostics and primary Evidence; two upload failures followed by a successful intercepted upload, with one error and the same selected file retained. A fixed review clock and genuine original evidence exercised freshness transitions without rewriting receipt timestamps. No full live trial, paid inference, actual private Blob write, or real video tracking is claimed.

To reproduce locally, run the production server with `CAUSALFLY_FAKE_META=1` on `127.0.0.1:3464`, then run the browser script. It uses installed Edge and the existing Codex runtime Playwright path, matching the repository's established review tools. Mandatory desktop sizes are covered; additional mobile-device acceptance remains outside this pass.

## Tester path and deployment readiness

Use the current controlled workflow to ask/design, approve/run, Compare, request interpretation and inspect Evidence. Live Connectome exposes availability immediately, with clearly recorded fallback when no host is running. Replay's diagnostics and primary Evidence navigation show historical provenance separately from any active question.

Human review should inspect the screenshots and run a configured service smoke test. Testers can exercise the synthetic workflow and retained replay without starting a local backend; live Meta actions still depend on working provider credentials and availability.

This branch is **ready for human review, not accepted for production deployment**. Required acceptance gates are private storage/cleanup configuration, an actual live video analysis, hosted secure backend availability and trial-start verification, plus review by the named testers. Production `causalfly.nurenyx.ai` remains unchanged. A full-duration validated replay, new neuroscience, stable six-leg walking, Quest and additional product features are deferred.
