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


## Sprint 16B — External tester acceptance (2026-11-02, America/Toronto)

This section is the current acceptance status; the Sprint 16A record above is preserved as history. Started clean on `feat/hackathon-final-acceptance`, HEAD `4bc1dfd`, matching `causalfly-hackathon-tester-v0.18`. The required initial Git checks passed before editing. FruitFly XR, Quest functionality, neuroscience, motor mechanics, and scientific measurements were not changed. No commit, push or deployment was performed.

### Recorded Experiment viewport: root cause and fix

The actual Experiment two-column row used `align-items: start`, while legacy `!important` arena heights prevented the left visualization from consuming the inspector's taller natural row. The condition cards, orbit hint, stimulus/step labels and motor readout also competed inside the positioned arena. Increasing the full-screen Compare viewport did not address either cause.

The recorded branch now has an explicit `data-view="recorded"` boundary. Its grid children stretch to the shared row; the world column is a flex column, the arena grows into remaining space, and tools, condition cards and readouts occupy separate normal-flow regions below the canvas. A 4:3 preferred aspect establishes a useful initial composition; inspector growth expands the arena beyond that preference. There is no giant minimum height, viewport-specific height patch, absolutely positioned canvas-height hack, or text clipping workaround. The inherited fixed arena height is explicitly released for this branch.

Browser probes require world/inspector tops and bottoms within 2 px, actual WebGL height within 2 px of its arena, no condition-card/orbit/readout/step intersections, and at least 235 px of canvas growth when a test-only inspector height probe adds 240 px. That probe is removed before screenshots; it is not product layout code.

The taller embedded side-by-side panel initially cropped the flies horizontally. Only that panel now opts into a camera fit computed from both normalized anatomical spans, their existing separation, field of view and actual panel aspect. Full-screen Compare keeps its previous camera and hero layout, with an explicit browser assertion that it does not opt into panel framing. The normal single-fly Experiment camera is 6% closer; geometry, mechanics, measurements, orbit and zoom controls remain unchanged.

### Video failure semantics and operator diagnostics

Configuration failures are non-retryable even when their HTTP status is 503. The upload error code and analysis `kind` survive through the client into workspace-owned failure state. Missing signing/storage configuration, invalid storage access and provider authorization failures display **VIDEO ANALYSIS UNAVAILABLE ON THIS HOST**, a single error, retained-file status and the Synthetic/operator remedy. No prominent Retry or upload-again action is offered for this state; inference controls are disabled.

Timeouts, interrupted PUTs and temporary storage/provider 502/503 failures remain retryable. The selected file survives. A tracking retry resumes tracking with the retained upload instead of starting Muse discovery again. Validation errors remain separate. Signing configuration errors also survive secure-reference resolution rather than being mislabeled as invalid media. The pre-upload pending state says secure video input is being prepared, not that SAM is already tracking. A storage/preflight failure is not described as a SAM failure.

The new **local operator command** is `npm run host:check`. Its server-only module reports booleans and makes no provider/network calls. No new unauthenticated diagnostics route was added. [Capability report](review/sprint-16b/host-capabilities.json) records this checkout:

| Capability | Result |
| --- | --- |
| Private storage authentication configured | true |
| Media signing configuration valid | true |
| Meta scene/tracking configuration / enabled | true / true |
| Blob read/write token present | true |
| Blob store ID present | false |
| OIDC token present / Vercel runtime | true / false |
| Brain telemetry / control endpoints configured | false / false |

No secret value was printed, inspected, logged or committed. The installed Blob SDK supports token auth and store-ID-plus-OIDC auth, including Vercel's request context. In this local case the configured read/write-token path is available without a store ID. A store ID alone is insufficient for OIDC authentication. The report explicitly says `credentialsVerified: false` and `providersChecked: false`: configuration presence does not prove access. Access was subsequently demonstrated by the bounded real test below, not by this diagnostic.

### Real live video acceptance: observed facts and limitation

The approved repository calibration MP4 was genuinely selected, privately uploaded and verified. Muse returned a live scene result. The first browser attempt stopped in the candidate-to-tracking interaction before submitting tracking. The unused SAM stage was then exercised once through the existing manual-concept action (`red square`) for the same clip, with a fresh private upload. There was **one Muse request and one SAM request**, with no repeated paid model attempts. Two authorization/PUT sequences occurred. The guard refuses automatic repetition of either completed stage.

| Lifecycle evidence | Observed |
| --- | --- |
| Local video selected | yes |
| Authorization and signed private PUT | yes, twice across the two UI contexts |
| Stored object privately retrieved, checked and verified before analysis | yes |
| Real Muse response | yes |
| Real SAM tracking response | yes |
| Result visibly attributed to Meta SAM 3.1 | yes |
| One contiguous guided Muse-candidate → SAM live journey | **not accepted** |

[Sanitized live acceptance report](review/sprint-16b/live-video-acceptance.json) retains exact stage booleans and counts. It deliberately records `contiguousGuidedLifecycle: false`, rather than treating a manual continuation as proof of the guided handoff. The fixture-only candidate selection → tracking → transient tracking failure → successful tracking retry path is separately covered by the browser review.

The [genuine live result screenshot](review/sprint-16b/live-video-success-before-player-layout-fix.png) was captured before the final player layout correction. It exposed another legacy defect: the whole player had a 120 px maximum height even though playback controls and attribution followed its video. That allowed those rows to collide with measurements. The cap has now been removed, the player uses normal flex flow, and a clearly labeled layout-only browser probe verifies that controls and attribution finish before measurements. The image is preserved as real-run evidence, not presented as a screenshot of the final layout. Final live visual acceptance and the contiguous guided handoff remain human acceptance items; no additional paid calls were made merely to regenerate imagery.

This is not a missing-video-configuration result: private storage, Muse and SAM were actually reached successfully. It is also not a declaration of complete live-flow acceptance. Provider-file cleanup and private Blob ticket/cleanup behavior retain the existing lifecycle; no automatic Blob deletion/TTL is newly claimed.

### Replay precision and offline semantics

Replay now says **VALIDATED SIMULATION CAPTURE**, adjacent to **Protocol/source validated · Not biological validation**. It remains a partial four-frame historical capture with untouched model and receipt times, not a full run or real-fly validation.

The counter is **REPLAY FRAME 1 / 4**, advancing through the four actual frames. The old 120 figure was a display-buffer capacity, not evidence that 120 original frames were retained. Live telemetry now labels it **DISPLAY BUFFER x / 120 frames**; replay does not show that capacity or invent an original-stream total. At the first replay frame, the event highlight says **CURRENT FRAME — 0 simulated spike events. Decoder: IDLE.** When supported by received samples, the decoder-change summary refers to observed ticks 1–2. Received frames only, gaps unobserved and no causal claim remain explicit.

Missing/unconfigured brain endpoints now produce DISCONNECTED/OFFLINE, including an explicit reconnect with no configured endpoint. Configured connection failures, malformed/protocol data and unexpected EventSource failures remain ERROR. Existing source-boundary tests retain their checks for no guessed connection, no fabricated telemetry, stale callbacks and preserved evidence; expected states were tightened to match this requested distinction. Replay stays available offline.

### Verification and exact-state screenshots

- `npm test`: **PASS — 501 tests** (386 library/server, 115 components), zero failures. Sprint 16A coverage is retained. Added configuration/transient, single-alert/file retention, operator secrecy/OIDC capability and first-replay-frame regressions; source state assertions now enforce the requested offline/error distinction.
- `npm run build`: **PASS**, optimized production build and TypeScript validation; no diagnostic HTTP route was added.
- `npm run lint`: **PASS**, zero errors or warnings.
- `node scripts/sprint16a-browser-review.mjs`: **PASS — 43 checks**, zero page errors. Four desktop sizes, eight exact recorded single/compare geometry cases, width/collision/stretch/growth probes, embedded camera bounds, unchanged full-screen Compare camera, all prior workspace/header checks, offline/error transitions, precise replay wording/counter/current-frame copy, non-retryable configuration UI, transient upload recovery, candidate-to-tracking fixture handoff, stage-specific tracking retry and player/measurement flow all passed.
- `git diff --check`: **PASS**. HEAD and branch remain the starting checkpoint; work is intentionally uncommitted.

[Browser measurements/results](review/sprint-16b/results.json) and [verification summary](review/sprint-16b/verification.json) distinguish offline fixtures/layout probes from the separate genuine live report. The browser review refuses paid/live provider mode; only the separately guarded live acceptance script exercised the authorized model calls.

| Experiment recorded state | 1366×768 | 1440×900 | 1536×1024 | 1920×1080 |
| --- | --- | --- | --- | --- |
| Single recorded fly | [image](review/sprint-16b/experiment-recorded-single-1366.png) | [image](review/sprint-16b/experiment-recorded-single-1440.png) | [image](review/sprint-16b/experiment-recorded-single-1536.png) | [image](review/sprint-16b/experiment-recorded-single-1920.png) |
| Embedded recorded comparison | [image](review/sprint-16b/experiment-recorded-compare-1366.png) | [image](review/sprint-16b/experiment-recorded-compare-1440.png) | [image](review/sprint-16b/experiment-recorded-compare-1536.png) | [image](review/sprint-16b/experiment-recorded-compare-1920.png) |
| Complete comparison panel | [image](review/sprint-16b/experiment-recorded-compare-panel-1366.png) | [image](review/sprint-16b/experiment-recorded-compare-panel-1440.png) | [image](review/sprint-16b/experiment-recorded-compare-panel-1536.png) | [image](review/sprint-16b/experiment-recorded-compare-panel-1920.png) |

Additional captures: [configuration failure, no Retry](review/sprint-16b/video-configuration-blocked.png), [retryable failure](review/sprint-16b/video-failure-retry.png), [fixture upload recovery](review/sprint-16b/video-retry-success-fixture.png), [full-screen Compare hero](review/sprint-16b/compare-hero.png), [offline Live](review/sprint-16b/live-offline-1440.png), [replay](review/sprint-16b/recorded-replay-1440.png). Configuration/transient screenshots use explicit intercepted responses; they do not claim that this configured local host failed to upload.

### Remaining deployment/acceptance gates

The branch is ready for human review and a configured-host acceptance run; it is not approved for deployment. The live guided candidate handoff and final live-result composition need human confirmation. Hosted secure brain telemetry/control endpoints are still absent, so real live-trial start remains unaccepted while offline replay is usable. Production environment access, cleanup scheduling and actual deployment-host behavior still need operator verification. No production site was updated. The user scope freeze, scientific disclosures and prohibition on connectome-driven walking claims remain intact.


## Sprint 16B.1 — retained video handoff and populated layout acceptance (2026-11-02)

**Implementation and deterministic acceptance pass. Genuine guided live acceptance does not pass.** The one authorized live attempt stopped when Muse returned no confident trackable candidate. No SAM request, retry, replacement upload or manual continuation followed. Human acceptance remains outstanding; this section does not supersede the historical Sprint 16A/16B findings above.

### Starting checkpoint and scope

Repository/branch were verified as `causalfly` / `feat/hackathon-final-acceptance`, HEAD `4bc1dfd`. The existing uncommitted Sprint 16B work was preserved. Initial `git diff --check` passed. No commit, push, deployment, FruitFly XR modification, confidence-threshold adjustment or scientific-measurement change was performed.

### Contradictory upload state and reference lifetime

The invalidation button was rendered whenever `session.upload` existed: a valid upload itself triggered “Upload again (expired or unavailable media).” That was a presentation defect, not proof that Muse had lost the reference. It could also let users discard valid media unnecessarily. The prior live handoff failure was not sufficiently localized to assign a separate definitive transport cause.

The button now requires an explicit `mediaUnavailable` signal. Server verification emits that signal only for invalid/expired tickets, a confirmed missing Blob, or failed immutable metadata/content verification. Generic storage transport failures retain the reference and offer an explicit stage retry. Configuration failures also retain an already uploaded reference. Replacing the selected video deliberately clears its reference and requires a new authorization/upload; changing an object candidate does not.

The same reference stays in workspace-owned session state across discovery, candidate confirmation, tracking and an explicit tracking retry. The local-preview element has a stable key across scene changes. A request-stage flag is set immediately before sending scene/tracking requests, so preparing an upload does not claim SAM is already running. Copy distinguishes upload complete / analyzing scene, upload retained / select an object, tracking, tracking complete and unsuccessful analysis. The latter never claims upload failure or an analysis still pending.

### One-upload handoff proof and paid-call boundary

The expanded browser fixture intercepts storage and provider responses while exercising actual UI handlers. It proves reference equality across Muse and both tracking attempts, one successful private PUT, explicit candidate selection, retained media after a transient tracking failure, successful tracking retry, a new reference after intentional file replacement, and upload-again visibility only after a server-confirmed unavailable/expired response. No automatic SAM action is accepted.

The separate [bounded harness rehearsal](review/sprint-16b1/bounded-harness-fixture.json) passed with exactly **1 authorization, 1 PUT, 1 Muse action, 1 SAM action**, same media reference, no blocked requests and a contiguous guided lifecycle. This is fixture evidence, not live-provider evidence. The harness writes an exclusive attempt record before browser/network startup, refuses another invocation, and checks budgets/reference/scene/candidate equality before forwarding requests. SDK automatic model retries remain disabled. The recorded-world layout setup is an explicitly offline engineering design/run fixture; it adds no paid design or interpretation call.

The [genuine live attempt](review/sprint-16b1/live-video-acceptance.json) used the approved calibration MP4 only after all deterministic gates and the bounded rehearsal passed:

| Stage | Sprint 16B.1 actual count / outcome |
| --- | --- |
| Secure authorization | 1, succeeded |
| Private PUT | 1, succeeded; **no second PUT** |
| Muse request | **1**; UI returned “No confident trackable concept was found” |
| Candidate selection | 0; no accepted candidate was available |
| SAM request | **0** |
| Paid retries / manual continuation | **0** |
| Contiguous genuine Muse → SAM handoff | **Not accepted** |
| Final genuine after-SAM screenshot | **Unavailable: SAM was not requested** |

The [stopped live UI screenshot](review/sprint-16b1/live-stopped.png) preserves that result. It is not a successful tracking screenshot. A subsequent copy clarification changes the unsuccessful stage from “analysis pending” to “upload retained · scene analysis did not complete”; that wording is unit-tested and included in the final build. No extra paid request was made to regenerate the stopped image. Historical 16B paid counts and its pre-layout-fix live screenshot remain untouched. No claim of human live acceptance or production readiness follows from this attempt.

### Actual player and maximum-content inspector geometry

The inspector uses natural column flow. Percentage/max-height caps and candidate-list clipping were removed from this inspector; the actual tracked-video component, its playback controls and attribution occupy normal flow before measurements. Scene attribution and the selected candidate remain inspectable after tracking. Target pathway follows the perception panel; the Meta scientist follows the target pathway. The shared recorded row stretches the world alongside the full inspector. No absolute-position vertical workaround or fixed inspector height was introduced.

The populated fixture uses the actual selected calibration file, retained valid upload, Muse-shaped response, five candidates with maximum 80-character labels and 400-character reasons, a 400-character summary, five expanded 400-character limitations, a SAM-shaped result/overlay, actual local tracked player/controls/attribution, unchanged deterministic measurements, target and scientist. It is visibly labeled as intercepted fixture content. Assertions cover sibling intersections, player/control/attribution/measurement ordering, clipping, horizontal page overflow, target/scientist ordering, world/inspector separation and matching row edges, and unobstructed orbit/readout regions. Existing recorded single/compare canvas-fill, stretch-growth and camera tests remain active.

| Exact populated state | 1366×768 | 1440×900 | 1536×1024 | 1920×1080 |
| --- | --- | --- | --- | --- |
| Full shared row | [image](review/sprint-16b1/populated-video-fixture-row-1366.png) | [image](review/sprint-16b1/populated-video-fixture-row-1440.png) | [image](review/sprint-16b1/populated-video-fixture-row-1536.png) | [image](review/sprint-16b1/populated-video-fixture-row-1920.png) |
| Full inspector | [image](review/sprint-16b1/populated-video-fixture-inspector-1366.png) | [image](review/sprint-16b1/populated-video-fixture-inspector-1440.png) | [image](review/sprint-16b1/populated-video-fixture-inspector-1536.png) | [image](review/sprint-16b1/populated-video-fixture-inspector-1920.png) |

The full-row screenshot was visually inspected, including the narrowest desktop composition. These captures verify the repaired DOM/CSS with complete fixture content; they do not satisfy the missing genuine after-SAM acceptance image.

### Final verification and human review gate

- `npm test`: **PASS — 504 tests** (387 library/server + 117 components), zero failures.
- `npm run build`: **PASS**, optimized production build and TypeScript.
- `npm run lint`: **PASS**, no warnings/errors.
- `node scripts/sprint16a-browser-review.mjs`: **PASS — 47 checks**, zero page errors; all four desktop sizes and prior acceptance coverage retained.
- Bounded live-harness fixture rehearsal: **PASS**, one-upload guided lifecycle and final player geometry at all four sizes.
- `git diff --check`: **PASS**; final status/stat/name inventory recorded without committing.

[Final browser measurements](review/sprint-16b1/results.json) and [verification summary](review/sprint-16b1/verification.json) separate deterministic evidence from the stopped genuine attempt. The working tree intentionally includes the preserved Sprint 16B work plus this repair. **Human live acceptance remains NOT PASSED. Stop for human review; do not deploy.**


## Sprint 16B.1B — no-candidate observability (2026-11-02)

Sprint 16B.1A established an unresolved A-vs-B forensic ambiguity: the recorded error could mean either zero parsed candidates or one or more candidates exclusively below the existing 0.5 confidence gate. The historical attempt did not retain the counts or confidence observations needed to distinguish them. Those historical findings and artifacts remain unchanged; this repair cannot retroactively classify that response.

The existing implementation now records `diagnostics.sceneDiscovery` in process-local flight-recorder state and its response snapshots before the no-candidate gate. After successful parsing it contains `parsedCandidateCount`, `qualifyingCandidateCount`, `confidenceThreshold` (0.5), `candidateConfidenceValues`, `maximumCandidateConfidence`, `source`, `providerResponseAccepted`, `sceneParsingSucceeded`, and `refusalDetected`. An empty list has count 0, no confidence values and a null maximum; a nonempty list with qualifying count 0 identifies exclusively subthreshold candidates. Confidence values and the maximum are rounded to three decimal places only for diagnostics. Qualifying counts and the application gate use original, unrounded values; rounded values near 0.5 must not be used to reconstruct eligibility.

These new scene diagnostics retain no candidate text, summaries, limitations, provider request IDs, raw envelopes, hidden reasoning, API keys, authorization headers, signed/private Blob URLs or other credential-bearing metadata. The projection uses a fixed numeric/boolean/null shape plus a fixed source label, rather than copying provider objects. Existing scientific evidence and measurements are unchanged.

The bounded acceptance harness now reports three distinct stages: `museProviderResponseAccepted`, `museSceneParsed`, and `museSceneAcceptedByApplication`. A valid but no-candidate response can therefore report true / true / false. A provider response accepted by the client whose scene JSON is malformed reports true / false / false, while retaining the existing malformed-response error path. Provider acceptance denotes successful completion/output/refusal checks in the existing client, not preservation of a raw HTTP status or envelope. Offline fixtures are explicitly distinguished and do not claim provider acceptance. A fresh discovery resets earlier receipt/count state on a reused upload recorder, so a retry cannot borrow an earlier discovery's observations.

The application condition remains unchanged:

```ts
!result.candidates.length ||
result.candidates.every(c => c.confidence < 0.5)
```

Exactly 0.5 remains accepted; lower-confidence candidates remain unavailable for selection. No confidence threshold, Muse prompt, model selection, scientific measurement, or product behavior changed. No fallback candidates, automatic SAM request, or new product control was added. The prior harness guards against repeated live attempts remain in place; the harness was not executed in live mode for this repair.

Verification retained from the implementation session and checked during interrupted-session completion:

- `npm test`: **PASS — 511 tests** (394 library/server + 117 components), zero failures. Added cases cover zero candidates; three candidates at 0.12 / 0.31 / 0.49; the exact 0.5 boundary; malformed output and missing required fields; omitted sensitive/provider text; distinct receipt semantics; and retry-state reset. Existing successful Muse → explicit candidate → SAM fixture coverage remains passing.
- `npm run build`: **PASS**, optimized production build and TypeScript validation.
- `npm run lint`: **PASS**.
- `node scripts/sprint16a-browser-review.mjs`: **PASS — 47 checks**, zero page errors. The completed [fixture browser result](review/sprint-16b1b/results.json) was found and validated on resume, so no unnecessary rerun was performed. These checks use deterministic local fixtures and intercepted storage; no media was transferred to a storage or provider service.
- Historical preservation: **135 Sprint 16B/16B.1 artifact files verified against pre-repair SHA-256 hashes; zero changed or added historical artifacts**. New browser captures are in `review/sprint-16b1b/`.
- Branch/HEAD remain `feat/hackathon-final-acceptance` / `4bc1dfd`; existing uncommitted work was preserved. `git diff --check` passes; final status/stat/name inventory was reviewed.

**No provider requests or actual media uploads were made for Sprint 16B.1B or its completion audit. Genuine live Muse → candidate → SAM acceptance remains outstanding.** This is deterministic observability verification, not live acceptance. No commit, push or deployment was performed. Stop for human review.


## Sprint 16B.2 — final bounded live acceptance

**FULL_LIVE_ACCEPTANCE_PASS — genuine contiguous Muse → guided candidate selection → SAM completed. Human review is still required before any commit, push or deployment.** This is the new Sprint 16B.2 result; historical 16A/16B/16B.1/16B.1B findings and unsuccessful-attempt records remain unchanged.

### Safe start and deterministic gates

Started from a clean working tree on `feat/hackathon-final-acceptance`, HEAD `b5f1ebf`, with safety tag `causalfly-hackathon-acceptance-prelive-v0.19` pointing at HEAD. Initial branch/HEAD/status/diff checks passed. The checkpoint remains the recovery point.

Both required deterministic gates passed, before and after the single genuine attempt:

| Verification | Before live activity | After live activity |
| --- | --- | --- |
| `npm test` | PASS — 511 tests, zero failures | PASS — 511 tests, zero failures |
| `npm run build` | PASS — production build and TypeScript | PASS — production build and TypeScript |
| `npm run lint` | PASS | PASS |
| `node scripts/sprint16a-browser-review.mjs` | PASS — 47 checks, zero page errors | PASS — 47 checks, zero page errors |
| `git diff --check` | PASS | PASS |

[Pre-live fixture results](review/sprint-16b2/deterministic-pre/results.json) and [post-run fixture results](review/sprint-16b2/deterministic-post/results.json) are separate from genuine live evidence. The browser script gained only optional base/output-directory settings so these required runs use isolated loopback ports and new artifact directories, preserving older captures. Storage and provider responses in these deterministic runs were intercepted or offline fixtures; they did not perform real uploads or paid requests.

### Single-use harness and exact live budget

The dedicated `scripts/sprint16b2-live-video-acceptance.mjs` derives from the reviewed Sprint 16B.1 harness. It exclusively creates its Sprint 16B.2 attempt record before harness network activity, refuses reruns, checks the completed deterministic gate, and verifies per-stage budgets before forwarding requests. Earlier guard records were not deleted or weakened. Fixture rehearsals verified all three branches: zero candidates stop with zero SAM requests, three subthreshold candidates stop with zero SAM requests, and an explicitly selected qualifying candidate completes tracking with the same reference. Those rehearsals are labeled fixture-only and are not counted as genuine provider calls.

The one genuine run used the unchanged approved `public/perception-calibration.mp4` (SHA-256 `a76a5a54735f40c4c0fe5b0d7631405cef055a9d37a5f35b9ab6022d8d96eb2d`). No alternative clip or edited video was used.

| Genuine Sprint 16B.2 activity | Count / result |
| --- | --- |
| Secure upload authorization | **1**, succeeded |
| Private PUT | **1**, succeeded |
| Muse model request | **1** |
| SAM model request | **1** |
| Automatic provider retries | **0**; SDK retries remain disabled |
| Second PUT / replacement upload | **No / 0** |
| Manual-concept continuation / fallback concept | **None** |
| Explicit qualifying candidate selection through guided UI | **Yes** |
| Same retained secure reference for authorization, Muse and SAM | **Verified by request guards** |
| Genuine SAM result returned / visible attribution | **Yes / yes** |
| Contiguous guided lifecycle | **Yes** |

The selected candidate was the provider's qualifying **central red square**, confirmed through the real radio-selection interaction. SAM was not requested before that selection. No confidence threshold, Muse prompt, Meta model selection, measurement function or product workflow was changed. The application continues to reject an empty list or a list exclusively below 0.5; exactly 0.5 remains acceptable.

### Sanitized Muse observations and decision tree

The new observability fields were recorded immediately when discovery returned:

| Observation | Recorded value |
| --- | --- |
| Provider response accepted | **true** |
| Scene parsing succeeded | **true** |
| Parsed candidate count | **1** |
| Qualifying candidate count | **1** |
| Confidence threshold | **0.5** |
| Rounded candidate confidence values | **[0.95]** |
| Maximum candidate confidence | **0.95** |
| Scene accepted by application | **true** |
| Decision-tree branch | **Case C** |

The [sanitized machine-readable live report](review/sprint-16b2/live-video-acceptance.json) contains all required counts, receipt/parsing/acceptance stages, selection/reference checks, screenshot availability and final classification. It retains no credentials, tokens, authorization headers, signed/private URLs or raw provider envelopes. This successful new response does not retroactively determine whether the older 16B.1 attempt contained zero candidates or exclusively low-confidence candidates.

### Genuine post-SAM screenshot and layout

The [primary genuine post-SAM capture at a 1440×900 browser viewport](review/sprint-16b2/live-after-sam-primary-1440.png) was taken after the actual SAM response and visually inspected. The full shared-row capture includes the source-video player with returned tracking overlay, Muse summary and selected candidate, Meta/SAM attribution, deterministic measurements, target pathway and scientist section. It is not substituted fixture imagery. The UI displays the newly derived stimulus as **0.488**.

Actual final DOM geometry passed at **1366×768, 1440×900, 1536×1024 and 1920×1080**: no world/inspector or content-sibling overlap, no clipping or horizontal page overflow, player controls and attribution precede measurements, and target/scientist content follows in normal flow. World and inspector bottoms matched exactly at every size. [Primary-size inspector](review/sprint-16b2/live-after-sam-inspector-1440.png) and [full row](review/sprint-16b2/live-after-sam-row-1440.png) preserve the genuine state; all four measurements are in the live report.

The surrounding recorded-world design/run was explicitly prepared through the offline engineering fixture server to exercise shared-row geometry without extra paid design or interpretation calls. Its existing synthetic experiment input is separate from the newly tracked video's derived stimulus. This acceptance proves the live video handoff and result composition; it does not claim a newly executed causal trial using that stimulus or biological perception/walking validation. No scientific measurements were modified.

### Preservation and final gate

Historical artifact hashes and protected product-source hashes match the pre-live inventory. The preexisting review document is preserved byte-for-byte as a prefix with this section appended. FruitFly XR was untouched. The live server was stopped after the single attempt; post-run browser checks used only the fixture server. Final Git status/stat/name inventory was reviewed and `git diff --check` passed. No commit, push or deployment was performed. **Full live acceptance passed under the specified conditions; stop for human review.**


## Sprint 16B.3 — retained stimulus → fresh design recovery

Human smoke testing exposed a defect **after successful Muse/SAM tracking**: the retained question and SAM-derived stimulus (displayed as 0.488) remained available, but **USE AS EXPERIMENT STIMULUS** tried to reuse an unavailable experiment design. This finding does not invalidate Sprint 16B.2's genuine live Muse → SAM acceptance. No historical acceptance evidence was rewritten, and no new live model or media-storage request was made.

Started from the clean human checkpoint `31285ce` (`checkpoint: pass final bounded live Muse SAM acceptance`) on `feat/hackathon-final-acceptance`. The earlier `b5f1ebf` remains the named recovery checkpoint; neither checkpoint was reset or rewritten.

### Exact code path and root cause

1. `PerceptionPanel` renders **USE AS EXPERIMENT STIMULUS** when a matching current design exists. Clicking it passes the retained perception ID and its signed receipt through `onUse` → `GuidedExperiment.onStimulus` → `Observatory.execute("stimulus", ...)`.
2. `Observatory` sends `POST /api/experiments` with `{ action: "stimulus", id: design.id, perceptionId, perceptionReceipt }`. The experiment capability is an opaque **design UUID**, not a signed design receipt. The question/design/result live in the client workspace reducer; the separate workspace-owned perception session retains the file, Muse scene, candidate selection, SAM result/overlay and receipt. Client state has no server-design TTL check.
3. The route invokes `runGuidedAction`. Its module-local `records: Map` holds designs, their recorders and optional runs, with a **two-hour TTL** and bounded eviction at 100 entries. Expired entries are purged before lookup. Process restart, module reload, expiry, eviction, or use against a different process can therefore leave a client-visible UUID with no corresponding server entry.
4. For a perception stimulus, the server verifies the perception capability **before** checking the design entry. The observed “This design expired or the server restarted…” response comes from `action !== "design" && !entry`, after that verification. Thus this specific failure is a missing design record, not failed SAM tracking or a confidence rejection. The old client mapped it to the second “Experiment design expired…” error, hid the design through `unavailableDesignId`, but retained the raw stale identity and presented a terminal error instead of a positive recovery step.
5. Perception retention differs: its map/key state is shared through `globalThis`, and a signed receipt can recover authenticated geometry after map eviction for up to **12 hours**. The full successful result also remains inspectable in client state. Before this repair, the receipt's signing key was random per process: module-local design state could disappear while perception state survived a reload, but a genuine full process restart also destroyed the perception key. This independent restart boundary required a small signing fix.

The exact missing-map condition is established by the code and displayed error. The historical message itself does **not** distinguish a two-hour timeout from restart/module loss/eviction; no incident-specific timestamp or process ledger was supplied to select one of those causes. The UI's stale server capability and missing recovery transition are the established defect, without guessing which invalidation mechanism occurred during that human session.

### Recovery implemented

The server now returns the stable code `DESIGN_UNAVAILABLE` for an unavailable design while continuing to reject that UUID. When stimulus acceptance receives it, the client clears the active stale design/parent identity, preserves the question and entire perception session, and archives any existing immutable run evidence for inspection. A late response cannot clear a different design or investigation.

The user sees: **“Stimulus retained. The previous experiment design expired, so create a new design using this measured stimulus.”** The result panel offers the existing **DESIGN EXPERIMENT WITH THIS STIMULUS** action. Recovery itself makes no design/model request and never runs an experiment. Only the user's explicit fresh-design click submits the retained question, perception ID and verified receipt through the normal `action: "design"` pathway, without the stale design ID, stale parent ID or a synthetic-amplitude override. The new draft then requires the existing **Approve & Run Experiment** action. A valid previous design still follows the normal deterministic stimulus-acceptance path and produces an unapproved draft.

No selected video, Muse scene, candidate selection, SAM geometry/overlay or derived stimulus is discarded. Perception evidence, measured stimulus, experiment draft and approved run remain separate concepts. No previous design is fabricated, and server validation never treats the missing UUID as valid.

### Restart-safe authenticated stimulus boundary

No persistence system was introduced. On an already configured private-video host, perception receipts now use a **purpose-separated HMAC key derived from the existing `CAUSALFLY_MEDIA_SIGNING_SECRET`**, instead of relying exclusively on a random process key. Signature checks, identity matching, size/decompression bounds and receipt expiry remain mandatory; the media-signing key is not exposed to the client. Scientific geometry and mapping functions are unchanged.

A legacy receipt can still verify while its original process key is present. After successful verification during a stimulus/design request, the server returns a migrated receipt signed with the stable key. Migration preserves the **identical authenticated payload and original expiry**; it does not extend lifetime or accept an expired receipt. The client updates only the matching analysis receipt, keeping the perception record unchanged. Newly issued or safely migrated receipts therefore survive a process restart on a host retaining the same configured secret, allowing a new design without uploading or rerunning perception.

An already destroyed legacy random key cannot be reconstructed: such an old receipt remains inspectable locally but cannot safely authorize a new experiment. This repair does not claim to recover signatures whose keys were lost before migration, or receipts that expired or were tampered with. Hosts without the existing stable signing configuration retain process-local receipt semantics. No unsigned client geometry, invalid signature or stale design capability is accepted as a workaround.

### Deterministic verification and human-failure fixture

- `npm test`: **PASS — 518 tests** (401 library/server + 117 components), zero failures. Coverage includes valid-design acceptance; independent design expiry; an actual fresh child process with no old design map; authenticated retained 0.488 input; question/evidence archival; rejected stale IDs; explicit fresh design and separate run approval; invalid/tampered/expired receipts; stable-key process loss; valid legacy-key migration; and byte-identical migrated payload/expiry. Network access is forbidden in the recovery server tests, including the fresh child process.
- `npm run build`: **PASS**, optimized production build and TypeScript.
- `npm run lint`: **PASS**.
- `node scripts/sprint16a-browser-review.mjs`: **PASS — 48 checks**, zero page errors; all prior acceptance checks remain active. The added fixture reproduces the retained question **“What happens if I silence the primary pathway?”**, selected Muse candidate, local tracked-video player, successful authored SAM-shaped result, displayed derived stimulus **0.488**, and a stale prior design. Its geometry is generated with the unchanged deterministic feature extractor and is clearly fixture evidence, not a new live SAM result.
- During the browser recovery phase, counts are **0 authorization, 0 PUT, 0 Muse, 0 SAM, 0 run**. Recorded experiment actions are only `stimulus` followed by the explicit `design` click. There is no automatic design call, silent approval or automatic controlled run. The retained perception record is unchanged, the candidate remains selected, the migrated receipt is used for the fresh design request, and the new draft's normal approval control is enabled but not activated.
- Browser server responses for the human failure/re-design presentation are intercepted authored fixtures. Signed-receipt security and genuine process-state loss are independently exercised by the server/child-process tests; mocked browser responses do not bypass production validation.

[Recovery offered with retained analysis](review/sprint-16b3/retained-stimulus-recovery-offered-1920.png), [fresh design awaiting explicit approval](review/sprint-16b3/retained-stimulus-fresh-design-awaiting-approval-1920.png), and [browser measurements/results](review/sprint-16b3/results.json) preserve the exact deterministic states. Screenshots were visually inspected. Existing autonomous-world presentation is separate from the controlled experiment; this fixture does not claim a newly approved scientific run or biological validation.

### Preservation and final review gate

All preexisting review artifacts, including Sprint 16B.2's live report, guard record and genuine screenshots, were verified byte-for-byte unchanged against the pre-repair hash inventory. The preexisting review document remains an identical prefix with this section appended. No Muse/SAM model, confidence threshold, prompt, scientific measurement or FruitFly XR file was changed. Fixture storage requests in the regression suite were intercepted; **no actual media upload or live provider call was made**. Final Git status/stat/name inventory was reviewed and `git diff --check` passed. No commit, push or deployment was performed. **Sprint 16B.2 live acceptance remains valid and unchanged; stop for human review of this recovery repair.**


## Sprint 16B.4 — real-world perception scientific clarity

Starting state: `feat/hackathon-final-acceptance`, HEAD `19b831c`, clean working tree. This is a presentation-only clarification of the existing accepted pipeline; no new live acceptance was attempted.

The previous “derived stimulus” / “use as experiment stimulus” language could imply that a geometry-derived number represented biological perception, or that completing tracking should make the fly react. Object tracking supplies image/video geometry, not Drosophila retinal encoding or pathway-specific sensory input. CausalFly converts that geometry into a reproducible **Experimental Proxy** for a controlled simulation. The value is not measured neural activity, validated biological perception, automatic connectome input, or evidence of biological behavior.

The perception panel now presents **SEE / TRACK / MEASURE / TEST**: Muse scene understanding; SAM object tracking; CausalFly experimental-proxy measurement; experiment design with Meta, explicit approval, then simulation. Results say “Derived from tracked video geometry.” and “Not yet calibrated to biological visual input.” Nearby guidance explains: “Tracking does not directly drive the fly. Use this proxy to design and run a controlled experiment.” The primary action is **DESIGN EXPERIMENT WITH THIS PROXY**. The existing closed Perception Details disclosure explains the lack of calibration to Drosophila retinal or pathway-specific sensory encoding. Related design, world-panel, Evidence and trust labels use the same proxy terminology where the input comes from video.

No deterministic calculation, confidence threshold (0.5), prompt, model, scientific measurement, provider handler, receipt validation, approval requirement, or experiment behavior changed. The existing acceptance/fresh-design handlers remain in place; only their labels changed. No biological calibration, neural pathway, automatic fly reaction, or fallback candidate was added. FruitFly XR was untouched.

Verification:

- `npm test`: **519 tests passed** (401 library/server + 118 component), zero failures. New rendering coverage verifies proxy terminology, tracked geometry, uncalibrated biological input, all four stages, closed scientific disclosure, and no implicit execution/approval. Existing signed-receipt, fresh-design and recovery tests still pass.
- `npm run build`: PASS on the final presentation code.
- `npm run lint`: PASS.
- `node scripts/sprint16a-browser-review.mjs`: **49 checks passed, zero runtime errors**, against an isolated local production server with `CAUSALFLY_FAKE_META=1`. New artifacts are confined to `docs/review/sprint-16b4/`; historical output directories were not overwritten.
- The recovery fixture retained the selected candidate and all perception geometry/provenance, including the displayed **0.488** value. Actions were exactly `stimulus`, then explicit `design`; storage authorization, PUT, Muse, SAM and experiment-run counters during proxy-to-design recovery were all **zero**. The fresh draft awaited explicit approval. Tracking completion alone did not execute a trial.
- Focused presentation fixtures were generated and visually inspected at **1366×768, 1440×900, 1536×1024 and 1920×1080**. Each shows the completed offline scene/tracking result, Experimental Proxy value, calibration disclosure, design action and no-direct-fly-drive guidance. The focused offline fixture displays **0.640**; the separate populated intercepted tracking/recovery fixture retains **0.488**. Both are clearly authored fixtures, not new live model evidence. Layout assertions check visible ordered stages/result/guidance/action, no horizontal overflow, and populated inspector content without clipping or overlap.
- Screenshot links: [1366](review/sprint-16b4/experimental-proxy-1366.png), [1440](review/sprint-16b4/experimental-proxy-1440.png), [1536](review/sprint-16b4/experimental-proxy-1536.png), [1920](review/sprint-16b4/experimental-proxy-1920.png). Machine-readable fixture evidence: [results](review/sprint-16b4/results.json).
- SHA-256 audit: all **800** pre-existing files under `docs/review` and `src/lib` were unchanged. This includes historical Sprint 16B.2 live acceptance and Sprint 16B.3 recovery evidence, provider prompts/models, the candidate gate and deterministic feature extraction. The complete pre-existing bytes of this review document were preserved before appending this section.
- `git diff --check`: PASS.

No Muse or SAM provider requests, actual storage authorization/private PUT, or media uploads were performed. The broad browser regression uses locally intercepted upload/analysis responses and offline endpoints; the focused clarity fixture rejects live-analysis and media routes. This sprint adds no new live verification claim. No commit, push or deployment was performed; human review remains the final gate.


## Sprint 16B.5 — human UX and live-state clarity

Starting state: `feat/hackathon-final-acceptance`, HEAD `996be9c`, clean working tree. This polish/state-semantics sprint follows the supplied 4:21 human walkthrough findings. The recording itself was not supplied or independently reviewed here; implementation and acceptance use the reported findings and deterministic local fixtures.

The walkthrough exposed similar-looking labels for configured Meta access, active inference, server connectivity, received telemetry, historical snapshots and procedural movement. These are now separate facts:

- **Meta:** configured idle access is **META READY**; an explicit active model action is **META PROCESSING**; missing/disabled configuration is **META UNAVAILABLE**; a failed request is **META ERROR**. A prior error does not mask an active retry. Offline fixtures retain explicit **META OFFLINE FIXTURE / META FIXTURE RUNNING** labels and never claim live provider processing. Run/approval actions, stimulus acceptance, navigation, media preparation and incoming telemetry do not activate the model-processing badge. Scene/tracking processing is reported only after the explicit inference request begins, following media preparation. Existing execution-mode/provenance records remain unchanged; a retained AI explanation is labeled as retained/generated interpretation rather than current live analysis.
- **Connectome:** the primary session summary and sidebar distinguish **SERVER**, **STREAM** and **EVIDENCE**. For example, a connected server can have an inactive stream while showing a retained snapshot. Server connection is not treated as proof of fresh telemetry; optional sensory/control-channel capability remains separate in the source disclosure.
- **Retained data:** the existing five-second freshness rule is unchanged. When frames stop, the UI shows **STREAM INACTIVE**, **SHOWING RETAINED SNAPSHOT**, and **Last received: <UTC time>**. The latest tick, spike-event count, active simulated neuron count and decoder state remain inspectable as retained values. Browser coverage verifies these displayed values do not change when the stream stops. Published structure, received mapped activity, both traces, decoder output, timeline and diagnostics remain available after receipt.
- **Before receipt:** published soma geometry and connection/source information remain visible. A waiting panel explains that measurements appear after a validated frame and directs the user to a simulation-host trial or the existing validated replay. Large empty measurement charts, empty decoder/health panels and the observations rail are deferred until a frame exists. Diagnostics remain reachable; existing trial-control availability checks and replay handlers are preserved.
- **Question compatibility:** the active retained window is audited before offering interpretation of ESCAPE. An absent state explicitly says **“ESCAPE was not observed in the retained window.”** and lists observed decoder states with inspection/collection guidance. If ESCAPE is present but its entry transition is absent, a before-entry question is blocked with that specific reason. An actual retained transition identifies its tick/sequence and directs the user to local evidence; a later IDLE snapshot does not erase an earlier retained ESCAPE transition. Browser request construction and the server’s compact-window guard share the same compatibility rule. A missing requested event is rejected before constructing a provider client. Other evidence and existing local scientific analysis remain unchanged; no ESCAPE event is fabricated or inferred as physical escape.
- **Movement boundary:** an active autonomous world persistently shows **PROCEDURAL EMBODIMENT** and **“Decoder selects supported states; CausalFly executes movement.”** Existing controller, anatomical and scientific disclosures remain. The acceptance capture waits for the anatomical model and advancing procedural ticks rather than photographing a loading state. No movement rule, engine, motor behavior or connectome-driven biomechanics was added.
- **Telemetry units:** concise expandable details distinguish total reported spike events per tick, events supplied in the capped display sample, unique supplied spiking IDs, mapped/unmapped unique IDs, active simulated neurons, published soma coordinates, dropped display frames and missed subscriber messages. An event count is not equated to a unique neuron count. The observations rail no longer repeats all four primary counts; chart values and mapping measurements are unchanged.
- **Source context:** status information is click-controlled, not hover-open. At the human viewport the tested popover is **300×210 px**; it closes outside, on Escape and on navigation, is keyboard accessible, and has no modal/backdrop behavior. Longer provenance remains scrollable within that compact surface.
- **Completed results:** **WHAT CHANGED**, direction/magnitude, control versus intervention values and timing lead the completed workspace. Finished question/design/run setup is in a closed native keyboard-accessible review disclosure; browser coverage opens it and verifies the edit action remains available. Reproducibility/evidence access and AI interpretation remain available. The synthetic fixture shows normalized peak output **1 → 0.5**, **50% signal reduction**, a **one-step delay**, and an **unchanged threshold outcome**. Body pose is explicitly illustrative; no motor difference is invented to dramatize the signal result. Compare retains its distinct CONTROL / INTERVENTION labels and measured pathway comparison; larger panels remain inspectable through normal vertical scrolling.

Verification on the final application:

- `npm test`: **528 passed** (405 library/server + 123 component), zero failures. Coverage includes browser/server absent-event guards, actual retained transitions including later-IDLE history, independent state facts, Meta request state precedence, sidebar consistency, procedural disclosure, completed-setup review and all prior perception/recovery tests.
- `npm run build`: PASS.
- `npm run lint`: PASS.
- `node scripts/sprint16a-browser-review.mjs`: **61 checks passed, zero runtime errors**, against an isolated local production server with `CAUSALFLY_FAKE_META=1`. All artifacts are under `docs/review/sprint-16b5/`.
- Viewports covered: **1366×768, 1440×900, 1536×1024, 1728×1080, 1920×1080**. At **1728×1080**, the Overview → Experiment → approval/run → Compare → interpretation journey passed with exactly `design`, `run`, `interpret` actions. Completed setup remained inspectable. Waiting → live → inactive/retained states passed; the status summary was visible when the telemetry section was framed, no horizontal overflow occurred, instrumentation panels did not collide, and right-hand observations did not overlap the charts. Existing Compare camera, panel-height and control-overlap assertions passed at the added human viewport as well.
- The ESCAPE-negative journey uses only the original recorded IDLE frame in a separately identified authored fixture session; interpretation is visibly disabled and no analysis request occurs. The procedural journey captures an actual rendered model with advancing existing controller ticks. Live-state screenshots reuse recorded simulated measurements with explicitly authored fixture receipt times; they are not new live telemetry evidence.
- An isolated browser fixture renders the **actual MetaStatus component** with configured-mode props and a locally intercepted explicit request. It verifies **READY → PROCESSING → READY** with one intercepted fixture request and **zero provider requests**. This tests UI state, not provider availability or new live acceptance. The main application journey runs in explicitly labeled offline mode.
- Sprint 16B.3 recovery still retains the selected candidate, signed-receipt flow, geometry/provenance and **0.488** value. Recovery issues only explicit `stimulus`, then `design`; authorization, PUT, Muse, SAM and run counters during recovery remain zero, and the new draft still requires approval. Sprint 16B.4 Experimental Proxy labels, biological-calibration disclosure and four-size focused fixtures still pass. Historical Sprint 16B.2 live acceptance artifacts remain intact; no new live acceptance is claimed.
- SHA-256 preservation audit covered **869** pre-existing library/review-artifact files. The only changed existing library files are the browser and server observational request guards and their test. Experiment calculations, perception feature extraction/thresholds, Meta models/prompts/clients, source normalization, connectome geometry/data and all historical review artifacts are unchanged. The entire existing byte prefix of this review document was preserved before this append. FruitFly XR was untouched.
- `git diff --check`: PASS.

All eight required **1728×1080** captures, plus the compact source-popover capture, were visually inspected on the final build. Each image is exactly 1728×1080:

| Capture | Review artifact |
| --- | --- |
| Overview | [Overview](review/sprint-16b5/human-overview-1728.png) |
| Experiment completed result | [Measured result](review/sprint-16b5/human-experiment-completed-1728.png) |
| Compare | [Compare](review/sprint-16b5/human-compare-1728.png) |
| Live Connectome waiting | [Waiting](review/sprint-16b5/human-live-waiting-1728.png) |
| Live Connectome live telemetry fixture | [Received telemetry](review/sprint-16b5/human-live-telemetry-1728.png) |
| Live Connectome retained snapshot | [Retained snapshot](review/sprint-16b5/human-live-retained-snapshot-1728.png) |
| Procedural embodiment | [Procedural execution](review/sprint-16b5/human-procedural-embodiment-1728.png) |
| ESCAPE not observed | [Question/evidence mismatch](review/sprint-16b5/human-escape-not-observed-1728.png) |
| Source disclosure | [Compact popover](review/sprint-16b5/human-source-popover-1728.png) |

Machine-readable evidence: [full browser results](review/sprint-16b5/results.json), [human-state results](review/sprint-16b5/human-state-results.json).

No Muse or SAM provider requests, actual storage authorization/private PUT, or media uploads were performed. The broad prior browser regression uses offline endpoints and locally intercepted upload/analysis responses; the human journey rejects media/provider routes and intercepts the read-only transport. The fixture request used for Meta status never contacts a model provider. No Meta prompt/model, scientific calculation, deterministic measurement, connectome data, experiment type or motor behavior changed. No commit, push or deployment was performed. Human review remains the final gate.


## Sprint 16B.5A — absent event interpretation guard

Human review identified that Sprint 16B.5 correctly blocked an unsupported ESCAPE request but still displayed “Ask CausalFly to explain” and a disabled “EXPLAIN WITH META” action. That presentation could imply an absent transition was eligible for explanation. An absent event must not be presented as an observed event.

The observational analysis now omits the entire Meta explanation panel when the existing compatibility verdict blocks the requested event. The assistant likewise omits its optional Meta offer for that frozen question/window. The prominent absence statement and “Observed decoder states: IDLE.” remain, with **INSPECT OBSERVED DECODER STATES** as the primary action. Retained evidence and observed decoder states remain inspectable through the existing navigation. No optional reframed Meta action was added, and the original research question is neither silently rewritten nor replaced: it remains visible and retained as provenance in both the investigation and frozen assistant question. Genuinely observed ESCAPE retains the existing enabled interpretation path. Existing browser/server request guards are unchanged.

Verification: `npm test` **531 passed** (405 library/server + 126 component); `npm run build` PASS; `npm run lint` PASS; `node scripts/sprint16a-browser-review.mjs` **61 checks passed, zero runtime errors**; `git diff --check` PASS. Deterministic tests force an otherwise-enabled Meta configuration and prove the absent-event offer is omitted, request construction/submission is blocked, the original question and IDLE evidence remain intact, and observed ESCAPE keeps its normal action. Browser coverage verifies both analysis surfaces, preserves the exact submitted question, clicks the primary inspection action to confirm retained IDLE evidence, and records **zero provider requests**.

The regenerated [1728×1080 absent-event capture](review/sprint-16b5a/human-escape-not-observed-1728.png) was visually inspected: ESCAPE absence, observed IDLE, original-question provenance and the inspection action are clear; no control offers Meta explanation of the missing ESCAPE event. [Browser evidence](review/sprint-16b5a/results.json) is fixture-only. All **962** pre-existing library/review-artifact files were byte-for-byte preserved from the start of this micro sprint, including the uncommitted Sprint 16B.5 work and all historical evidence. This review note was appended without changing its prior byte prefix.

No Meta, Muse or SAM provider requests, media uploads, scientific calculation changes, connectome data changes, experiment-behavior changes or FruitFly XR modifications were made. The required browser regression uses local fixtures and intercepted responses, not actual storage authorization/private PUT or model endpoints. No commit, push or deployment was performed. Stop for human review.


## Sprint 16B.5B — live-stream stability and sensory-feedback clarity

Human testing found that updating live values and status text made dashboard widgets bounce. Presentation now uses tabular numerals, stable metric/status grid tracks, reserved caption and diagnostic regions, and fixed timeline item rows with horizontal scrolling. Long diagnostic content remains available through scrolling. Context/feedback notices replace content within reserved regions; the page itself has no new fixed height. Telemetry cadence, values, freshness rules, scientific calculations, connectome data, decoder/motor behavior and brain-server protocol remain unchanged.

The existing opt-in control is promoted above the fly viewport as SENSORY FEEDBACK TO CONNECTOME, with the environment → sensory input → brain server → connectome dynamics → decoder → procedural embodiment relationship. OFF means no sensory messages; ARMED means enabled without an accepted stimulus; SENDING means sent and awaiting validation; ACCEPTED requires existing validated server telemetry matching a sent stimulus reference and freshness checks; REJECTED shows the existing rejection or validation reason; UNAVAILABLE covers missing configuration, disconnected/ended channels, pause/replay and trial completion. Before arming, unavailable feedback is disabled; an already armed unavailable control can be switched off except during replay, where the existing feedback lock remains unchanged. Reset clears presentation receipts so an earlier session cannot imply current acceptance.

Adapter additions observe existing send/validation outcomes only. A hello/connection or checked control never establishes stimulus acceptance or successful closed-loop behavior. ACCEPTED is a stimulus receipt, not proof of behavioral control. PROCEDURAL EMBODIMENT and “Decoder selects supported states; CausalFly executes movement.” remain prominent in every feedback state. No biological sensory equivalence or biomechanical embodiment is claimed.

Verification: `npm test` PASS (535 tests: 406 library/server and 129 component); `npm run build` PASS; `npm run lint` PASS; `node scripts/sprint16a-browser-review.mjs` PASS (62 checks, no runtime errors); `git diff --check` PASS. The expanded actual-component fixture additionally exercises input-reference and decoder timeline item changes and the retained status item. All five required viewports (1366×768, 1440×900, 1536×1024, 1728×1080, 1920×1080) passed without horizontal overflow. Measured maximum x/y/width/height change was 0 px (0.5 px assertion tolerance) for sampled primary cards, metric/status cells, timeline, mapping region, stream health, feedback region, autonomy controls and fly viewport across the counter/decoder/age/status transitions. These are bounded deterministic presentation checks, not genuine live acceptance or a claim about every possible diagnostic length.

Seven 1728×1080 captures in `docs/review/sprint-16b5b/stability-*-1728.png` were visually inspected: OFF, ARMED, ACCEPTED, REJECTED, telemetry IDLE, telemetry ESCAPE and retained snapshot. Feedback is prominent, rejection is explicit with no accepted badge, status/card positions remain aligned, and retained activity is clearly historical. `results.json` and `stability-results.json` retain fixture measurements. Counters and transitions are explicitly authored fixture values; the acceptance/rejection captures use an in-memory socket and the real adapter validation path, with no network brain control. The fixture temporarily suspends further publishing while inspecting one accepted receipt so a subsequent send cannot replace it before capture.

Zero Meta/Muse/SAM/provider requests, media uploads or real brain-server control messages were made. Regression verification uses local fixtures and intercepted storage/provider responses only. Historical Sprint 16B.2–16B.5A review artifacts and the complete preceding review text were preserved. Of 1,052 protected baseline library/artifact files, only the brain adapter presentation receipts and its deterministic test changed; all prior review artifacts and other protected library files remain byte-for-byte unchanged. FruitFly XR was untouched. No commit, push or deployment was performed. Genuine live scientific acceptance is not claimed by this sprint.


## Sprint 16B.6 — demo layout and live presentation stability

Human testing reported remaining genuine-telemetry jitter after 16B.5B. The source hook previously requested React reconciliation for each incoming snapshot; variable rail prose, event-item content and shell rows could also affect document height. Presentation now coalesces publication to React at 180 ms while every packet immediately enters the unchanged `receiveSnapshot` evidence reducer. Each paint uses the newest state. First frames/session boundaries and explicit disconnected/error states flush immediately; a quiet stream's pending final packet paints within the same 180 ms bound. Silence without a transport event cannot be detected instantaneously. The existing 120-frame display/history bound is unchanged, and the coalescer adds no evidence filtering or sampling to the ingestion path. Evidence navigation flushes pending presentation; explicit analysis/question provenance uses current raw evidence. Embodiment reads the unsampled source snapshot at its existing observation cadence, so UI cadence does not become a neural-drive throttle.

The Event Timeline has six fixed 170 px slots with reserved marker, two-line title, tick and time rows, tabular numbers and bounded horizontal scrolling. Transport timestamps remain wall-clock UTC, separate from model time; decoder-change detail remains available in each event's title and retained evidence. Right-rail reading, stream-note, investigation and interpretation rows have stable geometry, with legitimate overflow inspectable internally. Provenance, status/context and metric regions reserve stable space. The normal document footer remains in document flow: no overlay footer or arbitrary fixed page height was introduced.

Compare uses a 480–560 px responsive viewport (about 518 px at the two 1080 px-high desktop viewports), with a compact measured result summary and playback controls above it. Camera fitting uses actual fly visual bounds, relevant arena rings and the visible looming approach, with modest margin; the infinite decorative floor is not treated as a subject. Single-condition focus renders and fits the relevant subject and centers its canvas within 900 px. Frustum-corner assertions verify containment for both and single views. Recorded measurements and all experiment execution behavior remain unchanged. The topology preview has a larger 360 px figure allocation; its SVG measured about 316 px high at 1728×1080, with all seven nodes/labels and declared weights retained. “NO ACTIVITY DATA” remains explicit before measurement. An obsolete “4-node fixture” caption was corrected to “Declared topology,” without changing network data.

SOURCE CONTEXT uses the experiment preview's side area: SYNTHETIC FIXTURE shows ENGINEERING NETWORK and declared topology, never an active male-cns visualization. The live observatory shows CONNECTOME CONTEXT using supplied evidence only, clearly labeled LIVE, RETAINED or STRUCTURE ONLY. Disconnected/waiting entry keeps the observatory primary. A valid frame promotes the embodiment control; valid telemetry plus a configured feedback capability defaults open on desktop widths ≥1440 px, with a roughly 62%/38% observatory/embodiment split. Smaller widths stack when explicitly expanded. Deliberate collapse/expand choice is retained within the app session. Retained decoder context remains clearly marked and inspectable.

The existing OFF / ARMED / SENDING / ACCEPTED / REJECTED / UNAVAILABLE semantics remain intact. Only validated stimulus receipt emphasizes environment → brain; a subsequently observed decoder change after an accepted receipt can emphasize decoder → procedural embodiment. This is explanatory presentation, not causal attribution or proof of closed-loop success. The procedural embodiment disclosure remains prominent, and no biological sensory equivalence or simulated biomechanics is claimed. No prompt, provider model, neural threshold, scientific calculation, telemetry value, brain-server protocol, motor behavior or connectome dataset changed.

Verification: `npm test` PASS (541 tests: 409 library/server and 132 component); `npm run build` PASS; `npm run lint` PASS; `node scripts/sprint16a-browser-review.mjs` PASS (64 checks, no runtime errors); `git diff --check` PASS. Focused layout review also passed after the final source-copy legibility adjustment. Cadence tests compare unsampled ingestion with the original reducer, including burst retention, the existing bounded-history policy, latest-state publication, session boundaries and terminal flush. The actual browser ingestion hook retained all 64 authored frames in the stress journey. Twelve-packet bursts produced only 2–3 visible tick changes in the final full run; logical cadence remains 180 ms. The five required viewports passed without horizontal overflow or primary-panel collisions. Before/during/after bounding rectangles and document heights are stored in `docs/review/sprint-16b6/results.json`; measured maximum movement was 0 px against a 0.5 px tolerance, including the timeline, stream health, right-rail cards and footer. Fixed timeline rows also passed a no-vertical-clipping assertion. These are bounded fixture checks, not a claim about every possible message length or genuine live-server acceptance.

The authored stress sequence exercises the requested 9 → 99 → 999 → 12,000 tick progression, spike counts 0/620/3,314/18,421, active counts through 100,001, IDLE/ESCAPE/WALK/IDLE, capped display counts, freshness/drop notes and live → inactive at 7.9 s frame age. Later bursts offset ticks to preserve monotonic identity; no real connectome activity is fabricated or substituted into recorded artifacts. Existing unavailable-age and feedback acceptance/rejection fixtures remain covered. Receipt fixtures use in-memory sockets and the real parser/validation path; no real sensory message is transmitted.

All twelve requested 1728×1080 captures (`demo-*-1728.png`) were visually inspected: waiting, telemetry, rapid-update, split embodiment, accepted/rejected feedback, retained snapshot, initial Experiment, enlarged topology, and all three Compare views. Source boundaries and retained state are clear, subjects/stimuli remain contained, and controls/readouts remain available through the relevant scroll regions. Genuine live-stream jitter improvement and final demo acceptance remain for human review; this sprint makes no new live scientific acceptance claim.

All 1,150 protected baseline scientific-library and historical-review files remain byte-for-byte unchanged, and the complete preceding review text is preserved. FruitFly XR was untouched. Zero Meta/Muse/SAM/provider requests, real media uploads or real brain-server control messages were made; browser regression used offline fixtures and locally intercepted storage/provider responses only. No commit, push or deployment was performed.

## Sprint 17 — Judge-ready release candidate

The automated release-candidate work is complete, with **one P1 human-validation gate still open**: the reported genuine Firefox live-dashboard jitter was not reproduced in the available Edge fixture, and must not be described as fixed or Firefox-accepted. Playwright Firefox is not installed; no browser download was attempted. See [release findings](review/sprint-17/RELEASE_BLOCKERS.md) and the [genuine-live Firefox checklist](review/sprint-17/HUMAN_LIVE_ACCEPTANCE.md). P0 remaining: **0**; P1 remaining: **1**.

Instrumentation preceded application styling changes. The pre-existing production server initially served a stale build without the current live global styles; that preliminary run was discarded and the baseline rebuilt. The dedicated [layout harness](../scripts/sprint17-live-layout-stability.mjs) uses actual source-hook/component code, production font/CSS classes and the sidebar-constrained dashboard shell. It samples DOM presentation batches and the next animation frame at stationary top/middle/bottom positions, without programmatic scrolling during each run. It records scrollY, document height/width, all requested primary regions, chart SVGs, each timeline slot/title/tick/time region, inner autonomy rows, prior-sample deltas, maximum displacement, DOM identity, coherence, cadence, long tasks, frame intervals and available heap usage. Raw before/after measurements are in [baseline](review/sprint-17/layout-instability-before.json) and [final](review/sprint-17/layout-instability.json); the concise [layout audit](review/sprint-17/LAYOUT_AUDIT.md) explains scope and limitations.

Before and after, the observed primary-card, timeline-slot, footer/document and stationary-scroll displacement was **0 CSS px**, against a 1 px tolerance; normal telemetry did not oscillate document height or cause horizontal overflow. The baseline did reproduce 39 Stream Notes structural transitions: paragraphs/lists were replaced and caveat counts changed. Prose was used as a React key. Four persistent semantic message slots now replace text in place, with stable row geometry and empty slots excluded from assistive reading. The final run records zero note-structure transitions and zero monitored-node identity changes. This corrects an observed structural defect, but is not proof of the human Firefox root cause. The timeline retains six persistent nodes and now explicitly uses six fixed 170 px grid columns with reserved marker/title/tick/time regions. Worth Investigating and other major cards did not remount under the measured steady telemetry.

The dedicated diagnostic run compares normal `overflow-anchor:auto` with `none` applied only to the live fixture region; [probe measurements](review/sprint-17/layout-instability-anchor-probe.json) retain its results. No production/global anchoring override was introduced because normal stationary drift was already 0 px. No scroll trap was added. Firefox scroll-anchoring causation remains unproven.

The existing 180 ms display coalescer remains separate from full-speed ingestion. The source hook now publishes session, history and receipt-age clock through one React state object, and skips redundant independent age refreshes immediately following a telemetry publication. Quiet-stream freshness still advances. The populated final stress run processed **2,411 packets** and preserved the original reducer's bounded 120-frame window exactly; every packet entered that unchanged reducer. No unlimited/full-stream recording is claimed. Tick, reported spikes, active count and decoder were coherent on every measured publication; charts and timeline use the same snapshot/window. Embodiment still reads unsampled evidence at its existing controller cadence. Numeric tests cover exact tick widths from 9 through 192,000 and IDLE/ESCAPE/WALK/TAKEOFF. Both chart SVGs and plot gutters stayed fixed; the existing received-window maximum ×1.12 domain policy remains unchanged.

Performance records identify the headless renderer as ANGLE/SwiftShader software Vulkan. Long tasks and slower-than-nominal actual publication were measured; they are reported rather than presented as a hardware performance pass. DOM mutation counts are not labeled React-profiler commit counts, and short garbage-collected heap samples do not establish absence of leaks. Exact final rates, task counts and memory values are in [verification](review/sprint-17/VERIFICATION.md). No measurements, telemetry, real values, rendering functionality or scientific calculations were removed to improve a benchmark.

The [offline judge journey](review/sprint-17/judge-journey.json) passes Overview → retained question → visibly fixed/offline design → explicit approval → deterministic “Signal reduced 50%” → synchronized Compare → requested interpretation → Evidence → live-source fixture → procedural embodiment → retained snapshot. Passive viewing never submits inference or a run; two same-turn design inputs produce one request, keyboard activation has visible focus and hover/focus does not change document geometry. Existing popover/assistant Escape/focus tests also pass. Meta/Muse reasoning, Muse Spark scene understanding, SAM tracking and CausalFly deterministic measurement remain separated in visible language; existing prompts are unchanged.

Objective Compare screenshots showed that single-condition views previously retained the two-condition subject size because both fits used the same depth-dominated elevation. The existing camera fitter now uses lower elevations and a 12% fit reserve. Both distance is 14.1804 scene units; each single-condition distance is 11.4883, with the complete fly/arena/stimulus bounds contained. The subjects are visibly larger in single view. No new renderer, body mechanics or measurement changes were introduced. The existing enlarged topology passes label/weight/source-context checks at 1728×1080 without modification. Loader counts now say “loaded graph nodes” and “loaded structural edges,” using the existing provenance definitions; no numeric value changed. [Judge evidence matrix](review/sprint-17/JUDGE_EVIDENCE_MATRIX.md) maps claims to actual source/test/artifact paths and states validation limits.

Verification: `npm test` **541 passed** (409 library/server + 132 component); `npm run build` PASS; `npm run lint` PASS; `node scripts/sprint16a-browser-review.mjs` **64 checks passed, zero runtime errors**; `node scripts/sprint17-live-layout-stability.mjs` PASS; `node scripts/sprint17-judge-journey.mjs` PASS; `git diff --check` PASS. Sprint 16B retained-stimulus, proxy clarity, absent-event, source/status, feedback real-adapter fake-socket, five-viewport and cadence regressions run through the aggregate browser script; genuine live-video/provider acceptance scripts were deliberately not invoked. The final inventory preserves all pre-existing uncommitted work. [Fingerprints](review/sprint-17/preservation-verification.json) confirm **1,263 scientific-library/historical-review files unchanged** and preservation of this document's preceding byte prefix.

1728×1080 captures cover low/six-digit telemetry, IDLE/ESCAPE, all six feedback states, retained snapshot, all three Compare views, topology/source context, Evidence, Overview and the approval/result path. Representative dynamic pairs and Compare/topology captures were visually inspected. The broad regression additionally captures the genuine-adapter receipt/rejection fixtures and five required desktop sizes. Fixture visual evidence is not a new scientific/live-provider acceptance claim.

No genuine Meta, Muse or SAM request, media upload, real brain-control message, scientific calculation change, experimental measurement change, connectome-data change or FruitFly XR modification was made. Existing retained scientific evidence remains unchanged. No commit, push or deployment was performed. **Human Firefox live acceptance is required. Stop for human review.**


## Sprint 17.1 — Event Timeline telemetry geometry and Neural Response judge clarity

Following human review, Sprint 17.1 hardens the **Event Timeline** against residual content-dependent sizing risks and improves judge readability of the recorded **Neural Response** deck on the Experiment page without altering any scientific calculation, network topology, weight, threshold, decoder state, reducer or retained evidence.

The human-reported Firefox live-telemetry jitter is **not** claimed as causally proven by Edge automation, because Edge measured 0 px displacement both before and after modification (`EVENT_TIMELINE_ROOT_CAUSE.md`). However, the production audit identified and removed concrete layout dependencies inside `EventTimeline` (`src/app/components/live-session.tsx`, `src/app/components/live-session.module.css`): competing flex/grid rules were consolidated into a single explicit track grid (`repeat(6, minmax(0, 1fr))` on desktop, `repeat(6, minmax(150px, 1fr))` at ≤760 px, `grid-template-rows: 116px`, `height: 160px`); each slot now uses an explicit `minmax(0, 1fr)` column (`min-width: 0`) and fixed `12 / 36 / 32 / 36 px` row regions for marker, two-line label, tabular tick/status and model-time/UTC rows; pseudo-element markers and baselines were replaced with persistent `aria-hidden` DOM elements (`data-timeline-marker`, `data-timeline-baseline`) at fixed coordinates with color-only state transitions; and layout transitions/animations inside `.timeline` are explicitly disabled. `scripts/sprint171-timeline-stability.mjs` exercises 1,620 updates (3,246 samples) across 1728, 1366 and 760 px widths at `scrollY` 0 and 800 across values `1` through `192,000` and all event/connection/retained states, measuring **0 px** displacement across all regions, **0 px** `scrollY` drift, **0 px** document-height range and **0** node replacements.

On the Experiment page (`src/app/components/embodied-experiment.tsx`, `src/app/components/neural-response-summary.tsx`, `src/app/components/tester-build.css`), the recorded neural deck (`NEURAL RESPONSE`) now uses the full-width deck with a ~65% network / 35% measured-response split on desktop (`>1000 px`), enlarging the network SVG height from **236 px to 416 px** and the Activity Trace SVG height from **78 px to 200 px** (using its existing full-size chart presentation). The top toolbar groups `RECORDED SIGNAL`, `Control` / `Intervention`, the sequential playback caption (`PLAYBACK: CONTROL → INTERVENTION` or `SAME STEP / BOTH RUNS`) and the current step readout. `NeuralResponseSummary` displays the selected condition's authoritative stored trial facts (`outputPeakActivity`, `outputThresholdCrossingStep`, `outcome`, procedural motor execution) alongside the shared `resultSummary` comparison, explicitly labeled **“Retained trial totals · not current-step output”** so a final zero-output sample never conflicts with the trial's retained peak/crossing. `scripts/sprint171-neural-response-review.mjs` verifies all **36 condition/step states** across 1728, 1366 and 760 px with **0 px** geometry movement and exact sample/provenance preservation.

Verification: `npm test` **543 passed** (409 library/server + 134 component); `npm run build` PASS; `npm run lint` PASS; `node scripts/sprint171-timeline-stability.mjs` PASS; `node scripts/sprint171-neural-response-review.mjs` PASS; `node scripts/sprint17-live-layout-stability.mjs` PASS; `node scripts/sprint17-judge-journey.mjs` PASS; `node scripts/sprint16a-browser-review.mjs` **64 checks passed, zero runtime errors**; `git diff --check` PASS. All 1,420 files in `docs/review/sprint-17-1/preserved-files.json` remain byte-for-byte unchanged (`docs/review/sprint-17-1/preservation-verification.json`). No genuine Meta, Muse or SAM request, media upload, real brain-control message, commit, push or deployment was performed. Genuine Firefox live telemetry acceptance remains required via `docs/review/sprint-17-1/HUMAN_FIREFOX_ACCEPTANCE.md`.

## Sprint 17.2 — Event Timeline perceptual and semantic lane stability

Human review of the genuine Firefox screen recording after Sprint 17.1 showed that although outer DOM geometry was stationary (`0 px` bounding-box displacement), mapping the rolling `items.slice(-6)` sequence onto positional columns caused event titles (`"Frame received"`, `"Neural tick"`, `"Input reference changed"`, `"Decoder changed"`, `"Stream reconnected"`, `"Stream inactive"`) to rotate horizontally across columns as each new event entered the window.

`EventTimeline` (`src/app/components/live-session.tsx`, `src/app/components/live-session.module.css`) now replaces the rolling 6-slot primary sequence with **five permanently positioned semantic event lanes** in fixed order: `FRAME` (`data-lane="frame"`), `NEURAL` (`data-lane="neural"`), `INPUT` (`data-lane="input"`), `DECODER` (`data-lane="decoder"`), and `STREAM` (`data-lane="stream"`). Each lane has a permanent React key based on its semantic category (`frame`, `neural`, `input`, `decoder`, `stream`), fixed row geometry (`12 / 18 / 32 / 26 / 28 px` for marker, category heading, title, tabular value/tick and model-time/UTC timestamp inside a `116 px` slot), and a `"—"` placeholder until an event in that category occurs. Incoming telemetry updates only the appropriate category's values in place and never reorders, shifts or replaces another lane's DOM root.

Canonical chronological event history (`sessionTimeline(frames)` in `src/lib/sources/live-session.ts`), 120-frame retention (`LIVE_FRAME_LIMIT`), `receiveSnapshot`, decoder logic and Evidence/provenance semantics remain untouched. The rolling chronological sequence is exposed beneath the primary 5-lane strip inside a collapsed secondary `<details data-timeline-history>` element titled **`Recent event history`** (`height: 28px; overflow: hidden` when closed).

Verification: `npm test` **546 passed** (409 library/server + 137 component, including `src/app/components/event-timeline-lanes.test.tsx`); `npm run lint` PASS; `npm run build` PASS; `node scripts/sprint172-timeline-semantic-stability.mjs` PASS (`0 px` geometry/scroll/height delta, zero node replacements, zero lane-order or single-lane update violations across the 10-step sequence and 90-step multi-digit burst at 1728, 1366 and 760 px and `scrollY` 0/800); `node scripts/sprint171-timeline-stability.mjs` PASS; `node scripts/sprint171-neural-response-review.mjs` PASS; `node scripts/sprint17-live-layout-stability.mjs` PASS; `node scripts/sprint17-judge-journey.mjs` PASS; `node scripts/sprint16a-browser-review.mjs` **64 checks passed, zero runtime errors**; `git diff --check` PASS. All 1,420 files in `docs/review/sprint-17-1/preserved-files.json` remain byte-for-byte unchanged. Genuine Firefox live telemetry acceptance remains documented in `docs/review/sprint-17-2/HUMAN_FIREFOX_ACCEPTANCE.md`.
