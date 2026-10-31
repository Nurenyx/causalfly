# Sprint 12A — Closed-loop autonomous embodiment review

Human-review correction pass: 2026-10-30 (America/Toronto). Branch: `feat/sprint-12a-autonomous-embodiment`.

This continues the original uncommitted Sprint 12A implementation. No reset/discard of repository work, commit, push, tag, deployment, live Meta/SAM call, or FruitFly XR repository modification was performed.

## Answers for human review

**Is the fly now autonomous?** Yes. Autonomous exploration senses the arena and selects actions without steering, and continues beyond 60 seconds until paused/reset, hidden by normal application lifecycle, or unmounted. It is explicitly labeled continuous exploration, not a measured experiment. The separate controlled fixture trial stops at exactly 60 simulation seconds and displays **Trial complete**, elapsed/max/remaining time, Replay, Evidence and Compare actions.

**Which behaviours are currently connectome-driven?** Accepted live connectome decoder ESCAPE can select an escape response. Public wording is **Live connectome decoder**; technical implementation/provenance remains FruitFly XR Brain Server / `FRUITFLY_DECODER`. Default observational mode maps a fresh received decoder mode, whereas opt-in `/brain/v1` uses the stricter qualified DNp01/jump gate. No live brain-server trial was performed: browser neural events are labeled offline mocks and adapter tests use socket fixtures.

**Which behaviours are controller-driven?** IDLE, EXPLORE, WALK, TURN_LEFT, TURN_RIGHT and AVOID remain **Baseline autonomous policy**. Synthetic output can modulate their speed, recorded separately as `motor.modulationSource`, without relabeling baseline state selection. Synthetic output or a supported live decoder can select ESCAPE. All acceleration, heading, takeoff, recovery, pitch, roll, collision handling and visual execution are CausalFly procedural control, explicitly recorded as `CAUSALFLY_PROCEDURAL_CONTROLLER`.

**Can we truthfully call the system closed-loop?** Yes for the synthetic embodied fixture. Sensor geometry changes with fly motion; sensed input propagates through the synthetic network and can change movement. Observatory-only decoder-to-embodiment is not neural sensory feedback. The opt-in real-protocol analytic-object adapter exists; a full live connectome feedback trial remains unverified.

**Which components remain experimentally heuristic rather than biologically validated?** Geometric sensors, scene-unit calibration, synthetic network/threshold/dynamics, baseline exploration, response gains, collision disk, takeoff/recovery and visual motor execution. There is no reconstructed complete Drosophila repertoire or validated wing/body biomechanics.

## Human-review corrections

1. **Progressive investigation gates.** QUESTION is initially available. OBSERVE requires an explicitly retained question; UNDERSTAND requires evidence in `investigationWindow`, with receipt boundary and exact excluded frame identities. Previous questions' historical frames cannot unlock it. Native disabled controls remain visible, with visible descriptions and accessible help. Root navigation is guarded as well as the buttons; the observation surface is not shown before a question.
2. **Simulation-service naming.** The source card reads LIVE CONNECTOME SIMULATION / Connectome-backed brain server. Connection details identify FruitFly XR Brain Server, explain that the service simulates neural dynamics, does not launch the FruitFly XR Quest application, and supplies no living-fly recordings. Wire identifiers, endpoint paths, source identity pins and provenance literals are preserved. Actual XR asset attribution remains unchanged.
3. **Configured auto-connect.** Opening Live Connectome attempts the existing read-only SSE research connection when the server exposes a validated configuration boolean. No URL/credentials are sent in that flag. Reopening an active subscription does not duplicate/reconnect it. Without a valid endpoint, no stream is opened and an explicit missing-endpoint CONNECTION ERROR is displayed in the main workflow and source details. Connecting, connected, waiting, last-snapshot and error states remain distinct. Manual reconnect/disconnect is under Connection details. No browser Java process launch exists.
4. **Exploration versus trials.** The UI defaults to continuous exploration with elapsed time and an explicit non-measurement disclosure. Starting a controlled trial or matched comparison creates an explicit bounded 60-second controller trial with countdown and intentional completion. Recording stays bounded through deterministic checkpoints; it does not stop exploration.
5. **Visible ESCAPE.** Accepted decoder events trigger finite, engineered takeoff/flight-away dynamics and smooth recovery. Decision source and procedural motor execution remain separate. No prerecorded animation or aerodynamic validation is claimed.
6. **Actual trajectory replay.** Recorded output replay pauses live engines and disconnects active brain input, snapshots the retained trajectory, starts at its beginning with a clear Play action, and supplies Play/Pause/Restart/Return controls. It reads exact retained poses, states and neural/motor fields; it never calls the autonomy engine. Absent/insufficient trajectory disables replay with a reason. The former signal-pose view was separately named Approved signal playback in 12A.1 (now Recorded signal view in 12A.2) and disabled without an approved measured result.
7. **Responsive scientific detail.** Labels and values wrap. Expanded autonomy details use responsive definition-list rows and optional vertical overflow; no primary information requires horizontal scrolling. Baseline policy and motor-execution disclosures are always visible.

## Phase 0 audit and existing boundaries

CausalFly audit covered `embodied-world.tsx`, `high-fidelity-fly.tsx`, `procedural-fly.tsx`, `embodiment.ts`, experiment engine/network/types, Flight Recorder/types, FruitFly bridge/normalizer/contracts, retained-evidence retention, Live Session/Connectome, and existing ESCAPE summaries. Previously the fly remained at its origin with small output-proportional visual displacement; the world replayed recorded synthetic experiment steps. Live Connectome retained a separate read-only telemetry workflow. Neither path fed environmental geometry back into an autonomous controller.

Read-only FruitFly XR audit covered:

- `contracts/brain-v1.md`;
- `services/brain-server/.../BrainServer.java`, `Protocol.java`, `NeuralEngine.java`, `LifConfig.java`, and `MotorDecoder.java`;
- `clients/quest3/Assets/FruitFlyXR/Brain/BrainSocketClient.cs` and `BrainProtocol.cs` (`NeuralOutputGate`, `EscapeEvidence`, `LoomingProxy`);
- `tests/BrainClient` validation/trial checks;
- actual observatory endpoint and ResearchHub references, alongside the existing CausalFly normalizer.

FruitFly XR was not modified. Existing experiment engine, Meta/SAM actions, uploads, source retention and server evidence trust boundaries were not changed. No live Muse/SAM/provider calls were made. The local health endpoint checks configuration only and does not contact providers.

## Architecture, clocks and retention

`autonomy.ts` remains a rendering-independent fixed-step engine. Scientific step size is 50 ms; a 25 ms browser scheduler accumulates time, limits catch-up to 250 ms and records dropped wall time. UI publication is 10 Hz; rendering only eases toward computed world state. Seeded steering uses no uncontrolled randomness. Hidden tabs pause; lifecycle cleanup stops timers and ignores old transport callbacks.

`AutonomyConfig.mode` distinguishes `exploration` from `trial`. The API defaults to the original bounded trial for compatibility; the UI explicitly chooses exploration by default. Only trials stop at tick 1,200. Exploration continues with 60-second recording chunks, each beginning with a complete world/node/previous-frame/escape-trigger checkpoint. Input ledger, periodic samples and exact trajectory remain bounded to 1,200 ticks per current recording window. Older chunks are not an indefinite session archive; export before rollover/reset if they must be retained.

The current version is `experimental-embodiment-v3`: Sprint 12A.1 introduced v2 aerial physics/checkpoints; Sprint 12A.2 modestly adjusts motor gains. Old v1/v2 review fixtures remain historical and are not silently reinterpreted as v3 runs. `replayAutonomy` reconstructs current-version scientific inputs from the saved checkpoint and retains dropped-wall metadata. This reconstruction helper is distinct from UI trajectory playback.

## State machine

Priority remains supported neural ESCAPE response → geometric AVOID → initial IDLE → EXPLORE → WALK / TURN_LEFT / TURN_RIGHT. A rising supported decoder signal can initiate a grounded fly's 16-tick (0.8 s) escape episode. The episode retains its original `decision.trigger`; current available neural input is separately recorded and can be NONE. A latched decoder does not repeatedly restart the response. Disconnect/pause cancellation is an explicit replay input, so it cannot silently change deterministic state. Motor phase is TAKEOFF_ESCAPE, RECOVERY or GROUNDED. A separately retained motor trigger remains visible through recovery and is cleared on grounding; this does not fabricate current neural availability. Recovery follows integrated altitude/vertical velocity rather than a pose list.

## Sensor model

The arena is a circle of radius 2 with a collision disk of radius 0.48 and one cylindrical obstacle at `(0.6, -0.7)`, radius 0.24. The same constants render the arena/obstacle and drive analytic ray/circle intersections. Forward and ±0.65-radian rays intersect the arena inset and obstacles inflated by the body disk. Values are scene-unit clearances, not biological organ measurements.

Other recorded sensors are boundary clearance, stimulus distance, relative direction and intensity. Intensity is clamped object intensity divided by at least one scene unit of distance. The external object approaches from arena -Z for 2.5 seconds beginning at simulation second 3; this is an environmental stimulus schedule, never a fly route. Present stimulus restarts this environmental pulse at the current tick. Matched conditions share the same object schedule and seed; their sensed values can legitimately diverge after their trajectories diverge.

## Motor model and embodiment

Commands retain forward/turn/escape drive and target speed, adding `execution`, `phase`, `verticalTarget`, `pitchTarget`, `rollTarget`, and optional `modulationSource`. Ordinary acceleration is 1.2 scene units/s²; escape acceleration is 3.5, with speed target 1.25, reduced by local obstacle avoidance. Deceleration remains 2. Heading integrates at up to 2 rad/s. Away-from-stimulus yaw bias is geometric and explicitly engineered. Translation is rejected at the arena/obstacle collision disk; no teleportation is introduced. Avoidance holds its geometrically selected turn side until forward clearance exceeds 0.65 (entry below 0.45), preventing contact-time left/right oscillation that could trap the fly. The selected turn side is checkpointed for exact replay.

Takeoff targets 0.9 scene-unit altitude, with bounded vertical speed and acceleration (up to 1.8 upward, 1.2 downward, acceleration 4). It then smoothly recovers to the ground. Pitch targets -0.28 radians and modest roll follows the turn. All of this is CausalFly procedural execution; the brain server does not control wing/body biomechanics. Both anatomical and Lightweight render paths consume the same position, altitude, heading, pitch and roll. The anatomical model remains default with sex mismatch disclosure, loading/fallback handling and asset attribution.

Camera Reset View stays independent of trial reset. The 3D viewport contains fallback surfaces so they cannot obscure evidence or playback controls.

## Behaviour-source taxonomy

| Category | Current meaning |
| --- | --- |
| `BASELINE_AUTONOMOUS_POLICY` | IDLE/exploration/walking/turning/avoidance state selection, including when speed is modulated |
| `SYNTHETIC_NEURAL_MODEL` | Synthetic ESCAPE selection; separately tagged synthetic speed modulation |
| `FRUITFLY_DECODER` | Live connectome decoder selects ESCAPE; original signal reference retained |
| `EXPERIMENTAL_NEURAL_DERIVATION` | Reserved; no invented connectome-metric pathway |

## Synthetic closed loop and intervention

The controller reuses the existing seven-node synthetic engineering topology: stimulus → primary_a → primary_b → motor, plus the weaker alternate branch. Every 50 ms, prior node activations propagate over declared weights, values clamp to [0,1], and the currently sensed stimulus supplies the input node. This is an explicitly new continuous-input controller harness, not the existing approved experiment engine's single-pulse trial. Its synthetic escape threshold is 0.75; it is not presented as the approved experiment's threshold or measurement.

The matched intervention silences synthetic `primary_a` on every update; all other parameters, seed, initial state and external object schedule match. The surviving alternate branch contributes at most 0.5, suppressing synthetic ESCAPE in the demonstration. The control enters ESCAPE and returns to ordinary activity after the pulse. Controller evidence and approved experiment measurements remain distinct. The main stimulus slider and arbitrary approved experiment designs do not reconfigure this separate fixed controller demonstration.

## Actual FruitFly integration and exact protocol limits

The existing read-only bridge keeps its protocol and validation unchanged (public connection messages are renamed): server-configured `/observatory/v1`, normally port 8766, with validated source identity and retained session/sequence provenance. The Live Session has an optional experimental embodiment panel. Only newly received, ordered, input-fresh frames younger than 750 ms and newer than the autonomy trial boundary can influence it. One upstream session is pinned until reset. A repeated sequence cannot refresh its motor lease. An observatory ESCAPE mode can select ESCAPE; this stream lacks the direct protocol's complete qualifying jump/population gate, so the report does not equate that mapping with a new neural jump event.

`ExperimentalBrainAdapter` is a separate opt-in browser-local client for exactly `ws://127.0.0.1:8765/brain/v1`. It does not write to the observatory bridge. It pins hello version, UUID, dataset, SHA-256, neuron/edge counts, dt=0.5 ms, tick=50 ms, gain=0.65 and upstream seed=20260903. One organism slot is supported upstream; an existing Quest client can make this mode BUSY. Reconnect is explicit and starts a new seeded upstream trial.

Only the actual supported stimulus message is sent, capped at 20 Hz:

`version`, `type=stimulus`, `sessionId`, `sequence`, `capturedMs`, `tracked`, `azimuthDeg`, `elevationDeg`, `angularSizeDeg`, `expansionDegPerS`, `sensoryProvenance=PROXY`.

Scene units map explicitly to 0.1 metre. Arena heading uses -Z forward and positive left yaw; azimuth is converted to the protocol's +Z-forward/+X-right convention. Disc diameter and its expansion use the audited analytic equations; first samples/tracking gaps reset the derivative, approach speed clamps to ±3 m/s, distance floors at 0.01 m, and expansion clamps to ±2000 deg/s. Absence of an object sends `tracked:false`. The adapter sends geometric looming information, not arbitrary intensity, obstacle rays, retinal images, proprioception or invented neurons.

Telemetry validation requires matching session, ordered sequence and model time, pinned provenance, finite bounded fields, actual sent input sequence and identical echoed acquisition time, age ≤750 ms and upstream inputAge ≤500 ms/inputFresh. Direct ESCAPE additionally requires `jump=true`, `escape=true`, `motorMode=ESCAPE`, and positive DNp01 spikes in that tick. A latched mode without those facts cannot trigger this path. Backpressure, invalid messages, timeout or capacity close the trial and clear influence. Raw received/sent messages with acquisition times and source identity are retained in the separate export. Pause closes the direct brain transport; reset is required to reconnect it safely.

The upstream protocol accepts an analytic visual-object proxy only. NeuralEngine explicitly disables retinal background and other sensory channels in this harness. There is no supported arbitrary stimulation, connectome silencing, perturbation command, direct physical movement output, world coordinate update, or arena-contact channel. Server outputs are simulated neural counts/population rates/channels and motor decoder state. CausalFly executes physical representation. The fixed local research endpoint is not a deployed secure remote gateway; browser local-network/security policy and HTTPS deployment may restrict it. No live XR end-to-end response, neural latency, or remote deployment compatibility is claimed.

## Evidence, replay and scientific trust

The companion recorder remains `causalfly-autonomy-recorder-v1` with trust `CLIENT_GENERATED_EXPERIMENTAL_CONTROLLER`. Its per-condition controller payload is versioned v2. It retains configuration/seed, checkpoint, exact accepted input ledger, sampled decisions and a bounded full fixed-step trajectory for motion replay. Each frame records before/after pose, sensed geometry, available neural signal, retained trigger when relevant, selection reason/source, procedural motor command, modulation source and collision flag. These are simulation ticks, not render-frame streams. Optional brain transport retains its existing bounded raw messages/provenance.

`AutonomyTrajectoryReplay` freezes a detached trajectory and advances only a cursor over recorded frames. Entering playback pauses the engines. Playback, pause, restart and evidence export cannot change the retained engine measurements or generate fresh decisions. Return restores the still-paused live state; resumption is explicit. Direct brain input requires an explicit new session after pause/replay. No trajectory import from arbitrary untrusted files was added.

Client artifacts never enter server-attested neural retention, approved experiment measurements or Meta interpretation evidence. Existing server Flight Recorder allowlists, source-retention trust checks, upload/perception behavior and deterministic approved experiment engine remain intact. Initial v1 screenshots/trace are preserved under `docs/review/sprint-12a` as historical review artifacts.

## Scientific claims explicitly not made

No reconstruction of complete Drosophila behaviour; no real-fly validation; no validated biological circuit identity for synthetic nodes or geometric sensors; no claim that baseline turning/walking comes from the connectome; no claim that the brain server executes scene motion; no FruitFly neural perturbation pathway; no causal connectome intervention inference from observational telemetry; no live neural result inferred from mock/browser fixtures. The female visual mesh remains distinct from the male CNS neural dataset.

## Verification and browser acceptance

- Focused suite: **58 passed, 0 failed** (autonomy, correction regressions, live session/protocol and navigation/accessibility).
- Full `npm test`: **423 passed, 0 failed** (362 library + 61 component tests).
- Standalone `npx tsc --noEmit`: passed.
- `npm run lint`: passed, zero lint warnings/errors.
- `npm run build`: passed, Next.js 16.4.3 webpack production build.
- `git diff --check`: passed; final review also checks new files using an isolated index.

Regression coverage includes gated Observe/Understand, exact new-question exclusions, configured auto-connect/no unconfigured fabrication, continuous advancement and actual changing poses past 60 seconds, bounded trial completion, aerial takeoff/recovery and original trigger provenance, retained trajectory playback with no engine advancement/evidence mutation, unavailable replay copy, baseline state selection versus synthetic speed modulation, unchanged wire paths/source identity, deterministic checkpoint/input replay, fixed-step FPS independence, cancellation/drop metadata replay, obstacle/collision behavior, and no provider calls from autonomy/navigation.

The correction harness uses production servers on loopback ports 3145 (valid configuration flag) and 3146 (explicit invalid/missing configuration). Those process-local test settings do not edit environment files. The configured endpoint is `wss://offline-review.invalid/observatory/v1`; browser EventSource is replaced with labeled offline fixtures, so that host is never contacted. Brain sockets and all nonlocal/provider/action requests are blocked; only the read-only local health configuration check is allowed. No live Meta/SAM/brain trial is inferred.

Final browser acceptance passed every requested correction scenario on the real browser clock (no time fast-forward): exploration continued past 60 simulation seconds with changing positions, and a separate controlled comparison stopped exactly at 60.0/60.0 seconds with **Trial complete**. The matched control had an aerial response while silenced primary_a remained grounded. A retained live-connectome mock trigger produced a source-attributed aerial response, and its origin remained explicitly labeled retained during recovery.

Replay advanced through changing retained poses/states, paused/restarted, and left complete engine/evidence snapshots unchanged. Observe stayed unavailable before question retention; Understand stayed unavailable before relevant evidence and re-locked for a new retained question despite prior frames. Configured opening created one read-only connection; missing configuration created none and displayed an explicit error. Desktop (1600×1100) and mobile (390×844) passed document/panel horizontal-overflow checks. All five final screenshots were visually inspected. Source/trigger and CausalFly motor-execution disclosures remain visible. The browser reported zero page errors, zero blocked provider/action/nonlocal requests, and six actual evidence downloads.

The review trace is a compact engineering summary with trajectory/input hashes, counts and representative frames, not a full replay file. Full checkpoint/input/trajectory evidence remains in the tested UI export. This avoids committing duplicated multi-megabyte trial frame streams as review output. Screenshot-only styling hides the off-screen skip link during image capture to avoid a Chromium capture-beyond-viewport artifact; production keyboard accessibility is unchanged. Mock imagery includes a clearly labeled OFFLINE MOCK banner.

New correction screenshots (five; the four initial-review images are retained separately):

- [Continuous exploration after 60 seconds](review/sprint-12a-corrections/01-continuous-exploration-after-60s.png)
- [Synthetic aerial ESCAPE versus silenced pathway](review/sprint-12a-corrections/02-synthetic-aerial-escape-comparison.png)
- [Retained motion replay](review/sprint-12a-corrections/03-retained-motion-replay.png)
- [Offline mock live-connectome aerial ESCAPE](review/sprint-12a-corrections/04-mock-connectome-aerial-escape.png)
- [Mobile trial completion and wrapping evidence details](review/sprint-12a-corrections/05-mobile-trial-complete-details.png)

The harness is `scripts/sprint12a-browser-review.mjs` and uses the existing local Playwright/Edge runtime. It installs no tooling. Its retained mock input remains `docs/review/sprint-12a/mock-observatory.json`. Results: [correction acceptance trace](review/sprint-12a-corrections/acceptance-trace.json). The real-clock run intentionally waits through exploration beyond 60 seconds and a separate completed controlled trial.

## Sprint 12A.2 — Embodied experiment UX + phenotype clarity

This pass continues the existing implementation. It adds presentation clarity, not scientific capability. Original acceptance artifacts above remain legitimate historical records; the focused 12A.2 artifacts are separate below.

### Layout and control hierarchy

The primary Experiment grid now gives the embodied world approximately 71% of available primary width, with a minimum readable scientist rail. Neural topology and recorded activity occupy a separate row below the world. At widths of 1100px and below, document and visual order is world (including instrumentation), scientist, then neural detail. Desktop world height scales from 430–610px; mobile retains 390px. Fixed panel heights that trapped instrumentation have been overridden. The scientist rail sizes to its content rather than stretching a blank panel. Controls are grouped as Autonomous World, Stimulus / Experiment, and Replay / Evidence. Current behavior/source, neural drive, motor phase/height, stimulus, clearance and explicit procedural execution follow the organism. Timing and replay status remain adjacent to controls.

### Comparison and phenotype presentation

Persistent cyan CONTROL / Normal–intact pathway and pink INTERVENTION / Primary A silenced labels identify the arenas. The comparison camera now places negative-X Control on the screen left, matching the labels. ONE THING CHANGED explicitly identifies the intervention. The shared disclosure states the same arena, starting state, seed 12, scheduled stimulus and 60s window; sensed feedback can diverge with motion. Both conditions render the same per-tick external stimulus schedule; this is deterministic fixture matching, not biological equivalence.

A prominent retained-phenotype summary precedes numeric instrumentation. ESCAPE requires a recorded decision; aerial takeoff requires retained altitude above 0.2 scene units. NO ESCAPE RECORDED is shown only after all 1,200 sequential trial frames are retained; incomplete conditions say OBSERVING. Missing evidence and absent altitude remain unknown; absent height is never replaced with measured zero for phenotype classification. PHENOTYPE CHANGED requires two known, differing observed outcome classifications. It does not invent delayed escape, neural activity, or trajectory differences. Peak height is supporting recorded data. The autonomy fixture remains separate from approved synthetic experiment results.

Faint paths and segment endpoint dots are sampled solely from retained recorded positions (up to the latest 240 frames, sampled to approximately 100 vertices); replay clips those vertices to its displayed tick. They are recent segments, not claimed complete archival trajectories or predicted movement. Colors match the two condition labels.

### Procedural ESCAPE and attribution

The finite ESCAPE duration, stimulus-away bias, local collision avoidance and recovery remain intact. Escape speed target increases from 1.25 to 1.4 scene units/s, acceleration from 3.5 to 4.2 scene units/s², altitude target from 0.9 to 1.05, and vertical-speed cap from 1.8 to 2.0. No animation clip or full aerodynamics was added. Increased height and displacement, plus recorded path cues, make the engineered response easier to see. Controller evidence is versioned v3; older motor recordings are rejected by reconstruction rather than silently re-simulated with new gains. Approved experiment measurements are unchanged.

Baseline locomotion stays explicitly engineered. Synthetic neural output or accepted live connectome decoder signals can select ESCAPE; all physical execution remains CausalFly procedural controller. During a live-source takeoff/recovery, concise lineage reads simulated connectome activity → decoder ESCAPE → behavior ESCAPE/recovery → procedural motor execution. The brain server supplies signals, not body mechanics.

### Replay terminology and naming audit

The main mode is Autonomous world. The retained-motion action is Replay recorded experiment; REPLAY MODE is persistent and visually accented. Help states that it shows a past trajectory, does not rerun the experiment, create new neural decisions, or change evidence. The approved discrete-signal pose view is now Recorded signal view, explicitly distinguished from a recorded movement trajectory in its help. The old EVIDENCE PLAYBACK label becomes RECORDED SIGNAL VIEW. Internal replay/protocol identifiers are unchanged.

Remaining user-facing FruitFly XR occurrences were audited: they identify the Brain Server implementation, explicitly deny launching the Quest application, or preserve actual FlyV2 asset attribution. Product source labels remain LIVE CONNECTOME SIMULATION / Connectome-backed brain server. `FRUITFLY_XR`, transport names and historical provenance remain intact.

### Report foundation decision

A report subsystem would expand this UX pass, so no runtime report contract, AI prose, Meta request or Generate Report action was added. Recommended future typed contract: `RetainedExperimentReportInput` with question/hypothesis and experiment ID; control/intervention conditions; stimulus/seed/window; retained neural measurements, observed behavior states and trajectory summaries; measured outcome; limitations/provenance; run/evidence IDs; optional suggested next experiment; and a separately attributed optional AI interpretation. Every measured field must refer to retained evidence IDs and explicit missing-data states. AI interpretation cannot populate measured facts. CausalFly supplies facts; AI may later supply interpretation/narrative. A landing-page 3D hero remains a future UX enhancement only; no landing hero or WebXR work was performed.

### Review answers

- **Can a first-time user visually identify the control and intervention?** Persistent labels, matching colors, left/right framing and intact/silenced subtitles directly identify them. Focused browser inspection verifies these affordances; no first-time-user study was conducted.
- **Can a first-time user tell that the phenotype changed without reading telemetry?** After the fixture completes, PHENOTYPE CHANGED, ESCAPE / Aerial takeoff recorded versus NO ESCAPE RECORDED / Remained grounded present the result before telemetry. These are retained observations, not AI conclusions. Usability with first-time scientists still requires human review.
- **Does ESCAPE now look visibly different from ordinary walking?** Recorded positive altitude, visible aerial separation/shadow, stronger displacement and the retained path distinguish it; grounded intervention remains at zero altitude. It is engineered, not biologically validated flight.
- **Which behaviors remain baseline-policy driven?** IDLE, EXPLORE, WALK, TURN_LEFT, TURN_RIGHT and AVOID. Synthetic speed modulation is separately attributed.
- **Which behavior decisions are currently neural-source driven?** Supported ESCAPE from the synthetic neural fixture or accepted Live connectome decoder; recovery/movement is procedural. No full connectome-generated locomotion claim.
- **Is any user-facing text still likely to imply that FruitFly XR itself is being launched?** The audited source descriptions explicitly state that the brain service does not launch the Quest application. Remaining asset/provenance names are intentional; no launch action exists.

### Tests and focused browser acceptance

New tests cover retained phenotype classification and missing/incomplete evidence; exact matched configuration and stimulus schedules; positive aerial displacement away from a directional fixture threat and finite recovery; recorded-only, cursor-bounded path vertices; provider isolation; organism-first document order, responsive layout rules, source labels and replay terminology. Existing protocol, replay immutability, deterministic measurement and provider-boundary tests remain in the full suite.

Focused checks: **50 passed** (39 autonomy/protocol + 11 UI). Full suite: **430 passed** (368 library + 62 component), zero failures. TypeScript, lint and Next.js 16.4.3 production build passed. An initial concurrent standalone TypeScript/build check raced generated `.next/types` files; the serialized check after build passed. Lint identified a ref-render read in the new shared-stimulus label; it was corrected to React state and lint passed. Existing motor-bound/title tests were updated for the intentional new cap and copy. No deterministic approved measurements changed.

Focused production browser acceptance passed at **1920, 1440, 1024 and 390px**. Assertions confirm primary world width/height, desktop rail placement, stacked order, no document/panel horizontal overflow, changing exploration poses, persistent comparison labels, exact shared stimulus inputs, aerial control versus grounded intervention, completed retained phenotype summary, and replay advancement with byte-equivalent exported engine evidence. Both conditions stop at tick 1200. The retained browser peak heights were 0.906 / 0.000 scene units. There were zero page errors, zero unexpected/provider/brain requests and zero live Meta/SAM calls. The read-only local `/api/health` poll is allowed. Visual inspection initially found mobile comparison cropping; responsive camera distance was corrected and the focused run passed on recheck. The initial harness also mistakenly blocked the harmless local health poll; its route policy was corrected. No prior Sprint 12A acceptance scenarios were broadly repeated.

The final missing-altitude/sparse-window hardening is additionally covered by focused/full tests and production compilation; it does not change the complete, finite browser fixture observations. Screenshot-only skip-link hiding remains limited to browser capture styling; production accessibility is unchanged.

Five final screenshots, all visually inspected:

1. [Organism-first desktop / 1920px](review/sprint-12a2/01-organism-first-1920.png)
2. [Aerial control versus grounded intervention / 1440px](review/sprint-12a2/02-aerial-control-grounded-intervention-1440.png)
3. [Completed retained phenotype summary](review/sprint-12a2/03-completed-phenotype-summary.png)
4. [Recorded experiment / REPLAY MODE](review/sprint-12a2/04-recorded-experiment-replay.png)
5. [Mobile replay / 390px](review/sprint-12a2/05-mobile-replay-390.png)

Machine-readable checks and layout measurements: [12A.2 acceptance trace](review/sprint-12a2/acceptance-trace.json). This is engineering acceptance evidence, not biological validation. The earlier review artifacts remain unchanged. No temporary probes/logs are included in the shipping file list; local helpers and logs stay under ignored `tmp/`.

## Exact files changed and complete diff statistics

Combined uncommitted Sprint 12A / 12A.1 / 12A.2: **66 changed files**.

- `docs/SPRINT_12A_AUTONOMOUS_EMBODIMENT_REVIEW.md`
- `docs/review/sprint-12a-corrections/01-continuous-exploration-after-60s.png`
- `docs/review/sprint-12a-corrections/02-synthetic-aerial-escape-comparison.png`
- `docs/review/sprint-12a-corrections/03-retained-motion-replay.png`
- `docs/review/sprint-12a-corrections/04-mock-connectome-aerial-escape.png`
- `docs/review/sprint-12a-corrections/05-mobile-trial-complete-details.png`
- `docs/review/sprint-12a-corrections/acceptance-trace.json`
- `docs/review/sprint-12a/01-anatomical-exploration.png`
- `docs/review/sprint-12a/02-matched-synthetic-escape.png`
- `docs/review/sprint-12a/03-lightweight-avoidance.png`
- `docs/review/sprint-12a/04-mock-fruitfly-decoder-escape.png`
- `docs/review/sprint-12a/acceptance-trace.json`
- `docs/review/sprint-12a/mock-observatory.json`
- `docs/review/sprint-12a2/01-organism-first-1920.png`
- `docs/review/sprint-12a2/02-aerial-control-grounded-intervention-1440.png`
- `docs/review/sprint-12a2/03-completed-phenotype-summary.png`
- `docs/review/sprint-12a2/04-recorded-experiment-replay.png`
- `docs/review/sprint-12a2/05-mobile-replay-390.png`
- `docs/review/sprint-12a2/acceptance-trace.json`
- `scripts/sprint12a-browser-review.mjs`
- `scripts/sprint12a-review-summary.mjs`
- `scripts/sprint12a2-browser-review.mjs`
- `src/app/components/autonomy-panel.tsx`
- `src/app/components/causalfly-assistant.test.tsx`
- `src/app/components/data-source-panel.tsx`
- `src/app/components/embodied-experiment.css`
- `src/app/components/embodied-experiment.tsx`
- `src/app/components/embodied-world.tsx`
- `src/app/components/embodiment-ux.test.tsx`
- `src/app/components/experiment-playback.tsx`
- `src/app/components/fruitfly-analysis.tsx`
- `src/app/components/fruitfly-evidence.tsx`
- `src/app/components/fruitfly-observatory.tsx`
- `src/app/components/guided-experiment.test.tsx`
- `src/app/components/guided-workflow.tsx`
- `src/app/components/home-overview.tsx`
- `src/app/components/investigation-question.test.tsx`
- `src/app/components/investigation-question.tsx`
- `src/app/components/live-connectome-progress.tsx`
- `src/app/components/live-session.tsx`
- `src/app/components/live-visualizations.tsx`
- `src/app/components/navigation-status.test.tsx`
- `src/app/components/source-analysis-workspace.test.tsx`
- `src/app/components/status-indicator.tsx`
- `src/app/components/workspace-system.css`
- `src/app/observatory.tsx`
- `src/lib/sources/contracts.ts`
- `src/lib/sources/fruitfly-bridge.ts`
- `src/lib/sources/fruitfly-closed-loop.test.ts`
- `src/lib/sources/fruitfly-closed-loop.ts`
- `src/lib/sources/live-session.test.ts`
- `src/lib/sources/live-session.ts`
- `src/lib/web/assistant.test.ts`
- `src/lib/web/assistant.ts`
- `src/lib/web/autonomy-presentation.test.ts`
- `src/lib/web/autonomy-presentation.ts`
- `src/lib/web/autonomy-recorder.ts`
- `src/lib/web/autonomy-replay.ts`
- `src/lib/web/autonomy-review.test.ts`
- `src/lib/web/autonomy.test.ts`
- `src/lib/web/autonomy.ts`
- `src/lib/web/contracts.ts`
- `src/lib/web/observational-analysis.ts`
- `src/lib/web/observational-question.ts`
- `src/lib/web/workflow-progress.ts`
- `src/lib/web/workflow.ts`

Complete uncommitted Sprint 12A diff, including new files, generated with an isolated temporary index. The real staging index is unchanged; no files were staged in it.

<!-- complete-diff-stat:start -->
```text
 docs/SPRINT_12A_AUTONOMOUS_EMBODIMENT_REVIEW.md                              |  360 ++++++++++
 docs/review/sprint-12a-corrections/01-continuous-exploration-after-60s.png   |  Bin 0 -> 79321 bytes
 docs/review/sprint-12a-corrections/02-synthetic-aerial-escape-comparison.png |  Bin 0 -> 110379 bytes
 docs/review/sprint-12a-corrections/03-retained-motion-replay.png             |  Bin 0 -> 69606 bytes
 docs/review/sprint-12a-corrections/04-mock-connectome-aerial-escape.png      |  Bin 0 -> 116829 bytes
 docs/review/sprint-12a-corrections/05-mobile-trial-complete-details.png      |  Bin 0 -> 118071 bytes
 docs/review/sprint-12a-corrections/acceptance-trace.json                     | 1601 +++++++++++++++++++++++++++++++++++++++++++++
 docs/review/sprint-12a/01-anatomical-exploration.png                         |  Bin 0 -> 52185 bytes
 docs/review/sprint-12a/02-matched-synthetic-escape.png                       |  Bin 0 -> 84962 bytes
 docs/review/sprint-12a/03-lightweight-avoidance.png                          |  Bin 0 -> 84379 bytes
 docs/review/sprint-12a/04-mock-fruitfly-decoder-escape.png                   |  Bin 0 -> 91244 bytes
 docs/review/sprint-12a/acceptance-trace.json                                 | 2656 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 docs/review/sprint-12a/mock-observatory.json                                 | 2177 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 docs/review/sprint-12a2/01-organism-first-1920.png                           |  Bin 0 -> 569754 bytes
 docs/review/sprint-12a2/02-aerial-control-grounded-intervention-1440.png     |  Bin 0 -> 169434 bytes
 docs/review/sprint-12a2/03-completed-phenotype-summary.png                   |  Bin 0 -> 164316 bytes
 docs/review/sprint-12a2/04-recorded-experiment-replay.png                    |  Bin 0 -> 165087 bytes
 docs/review/sprint-12a2/05-mobile-replay-390.png                             |  Bin 0 -> 144167 bytes
 docs/review/sprint-12a2/acceptance-trace.json                                |  213 ++++++
 scripts/sprint12a-browser-review.mjs                                         |   94 +++
 scripts/sprint12a-review-summary.mjs                                         |   33 +
 scripts/sprint12a2-browser-review.mjs                                        |   95 +++
 src/app/components/autonomy-panel.tsx                                        |  140 ++++
 src/app/components/causalfly-assistant.test.tsx                              |    2 +-
 src/app/components/data-source-panel.tsx                                     |    9 +-
 src/app/components/embodied-experiment.css                                   |   42 ++
 src/app/components/embodied-experiment.tsx                                   |   22 +-
 src/app/components/embodied-world.tsx                                        |   46 +-
 src/app/components/embodiment-ux.test.tsx                                    |   16 +
 src/app/components/experiment-playback.tsx                                   |    4 +-
 src/app/components/fruitfly-analysis.tsx                                     |   12 +-
 src/app/components/fruitfly-evidence.tsx                                     |   14 +-
 src/app/components/fruitfly-observatory.tsx                                  |    6 +-
 src/app/components/guided-experiment.test.tsx                                |    7 +-
 src/app/components/guided-workflow.tsx                                       |    2 +-
 src/app/components/home-overview.tsx                                         |    2 +-
 src/app/components/investigation-question.test.tsx                           |    2 +-
 src/app/components/investigation-question.tsx                                |    2 +-
 src/app/components/live-connectome-progress.tsx                              |   16 +-
 src/app/components/live-session.tsx                                          |    8 +-
 src/app/components/live-visualizations.tsx                                   |    2 +-
 src/app/components/navigation-status.test.tsx                                |   27 +-
 src/app/components/source-analysis-workspace.test.tsx                        |    4 +-
 src/app/components/status-indicator.tsx                                      |    2 +-
 src/app/components/workspace-system.css                                      |   58 ++
 src/app/observatory.tsx                                                      |   21 +-
 src/lib/sources/contracts.ts                                                 |    2 +-
 src/lib/sources/fruitfly-bridge.ts                                           |   14 +-
 src/lib/sources/fruitfly-closed-loop.test.ts                                 |   56 ++
 src/lib/sources/fruitfly-closed-loop.ts                                      |   86 +++
 src/lib/sources/live-session.test.ts                                         |   11 +
 src/lib/sources/live-session.ts                                              |    6 +-
 src/lib/web/assistant.test.ts                                                |    2 +-
 src/lib/web/assistant.ts                                                     |    2 +-
 src/lib/web/autonomy-presentation.test.ts                                    |   60 ++
 src/lib/web/autonomy-presentation.ts                                         |   22 +
 src/lib/web/autonomy-recorder.ts                                             |   14 +
 src/lib/web/autonomy-replay.ts                                               |   23 +
 src/lib/web/autonomy-review.test.ts                                          |   73 +++
 src/lib/web/autonomy.test.ts                                                 |  120 ++++
 src/lib/web/autonomy.ts                                                      |  231 +++++++
 src/lib/web/contracts.ts                                                     |    1 +
 src/lib/web/observational-analysis.ts                                        |    2 +-
 src/lib/web/observational-question.ts                                        |    2 +-
 src/lib/web/workflow-progress.ts                                             |    2 +-
 src/lib/web/workflow.ts                                                      |    7 +-
 66 files changed, 8351 insertions(+), 80 deletions(-)
```
<!-- complete-diff-stat:end -->

## Top five remaining weaknesses

1. No live connectome brain-server feedback/latency/real-neural-response acceptance. Offline socket/browser fixtures verify plumbing and attribution only.
2. Takeoff/recovery, collision disk, sensing and controller gains are engineered; there is no aerodynamic model, gait rig or real-fly validation.
3. Baseline locomotion remains controller-selected. Synthetic speed modulation and ESCAPE are engineering-model results, not reconstructed biological circuits.
4. Direct brain input remains an explicit local, bounded research session with browser local-network/HTTPS and single-organism-slot limitations. It requires a new session after pause/replay; continued exploration can use baseline policy after neural disconnect.
5. Current-window retention is chunked and client-generated/unsigned, not indefinite history or an arbitrary trajectory-import facility. Export before rollover/reset for archival retention; approved experiment specs remain separate from the fixed embodied fixture demonstration.

## Recommended Sprint 12B

Run documented live seeded feedback trials with exact acquisition/neural/output ages and replay comparisons before extending neural behaviour claims. Then develop a secure opt-in remote gateway, validated scene-unit calibration, sliding/checkpointed archival history and explicit approved-spec-to-embodiment parameterization. Improve contact and gait readability after scientific timing and live integration are verified.

NO COMMIT.
STOP FOR HUMAN REVIEW.
