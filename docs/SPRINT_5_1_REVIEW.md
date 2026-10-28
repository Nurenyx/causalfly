# Sprint 5.1: FruitFly XR Live Session

Implemented for review on October 27, 2026. All work is uncommitted.

## What a viewer sees

Select **Live Session → Select FruitFly XR → Connect FruitFly XR**. The workspace answers: what is arriving, how much simulated activity was reported, what the motor decoder produced, whether the stream needs attention, and what evidence to inspect next. Synthetic Fixture selection shows a short explanation and source-selection button.

The primary visualization is an event raster of real sampled neuron identifiers and their reported model times. The existing normalized contract deliberately excludes the upstream anatomy/scaffold and active edges. The raster therefore uses categorical ID rows, with no anatomical layout or inferred network links. Two adjacent charts show reported counts over received simulation ticks. The event timeline reports actual frame receipts and changes between received decoder states. A right-side AI Observer rail contains **Session observations**, explicitly labeled local and deterministic. **Analyze with Meta** is visibly reserved and disabled.

Published structural connectome data drives the FruitFly XR brain server's **simulated** dynamics. These are not recordings from a living fly. The BrainClient harness supplies its existing synthetic proxy input; this review does not establish biological or embodied movement validity.

## Exact fields and display derivations

Fields below are from the unchanged `FruitFlyEvidence` contract. “Direct” means supplied by the validated producer/adapter, not a biological measurement.

| Display | Exact fields | Basis |
| --- | --- | --- |
| Session bar | `telemetry.sessionId`, `sequence`, `simulationMs`, `neuralTick` | Direct values; model time explicitly uses ms |
| Activity charts | `totalSpikeEvents`, `activeNeuronCount`, `neuralTick`, `sequence` | Direct counts/ticks; chart scales and positions are display-derived |
| Event raster | `spikeEvents[].neuronId`, `spikeEvents[].spikeTimeMs`, `sequence`, `simulationMs` | Direct IDs/model times; categorical row placement, color, ID selection and window bounds are display-derived |
| Supplied event count / truncation | `displaySpikeEvents`, `displayTruncated`, `totalSpikeEvents` | Direct values; no extrapolation to unsupplied events |
| Simulation output | `motorMode`; expandable `decodedMotor[].name`, `decodedMotor[].value` | Exact mode and channel values; no physical movement conversion |
| Stream health | `sequence`, `droppedDisplayFrames`, `droppedSubscriberMessages`, `displayTruncated`, `displaySpikeEvents`, `totalSpikeEvents`, `inputSequence`, `inputFresh` | Direct diagnostics; `inputSequence = -1` displays unavailable |
| Latest-frame age | `receivedAt` plus browser clock | Display-derived elapsed wall time; never model time |
| Connection/freshness | `snapshot.state`, `receivedAt` | Observed transport state plus a five-second display freshness threshold |
| Timeline | `sequence`, `neuralTick`, `simulationMs`, `inputSequence`, `motorMode` | Direct frame values; decoder transitions derived only between received frames; receipt time retained in the display event model |
| Observer | `totalSpikeEvents`, `motorMode`, `displayTruncated`, `displaySpikeEvents`, `inputSequence`, `inputFresh`, drop counters | Deterministic text templates, no inference about stimuli or causal pathways |
| Provenance card | `provenance.dataset`, `neurons`, `edges`, `generator`, `dynamics`, `experimentalRecording` | Verified adapter source identity; original full provenance stays in Evidence |

`totalSpikeEvents` is the reported count **in that tick**, not a session cumulative total. Active neurons include subthreshold, refractory, and pending-input states; they are not a count of only spiking neurons. Drop counters are producer-reported counters, not a CausalFly loss estimate or guaranteed end-to-end delivery measure.

Display limits are explicit: **120 received frames**, with an event raster using the **last 24 frames** and the **first 64 distinct IDs in numeric order**. The raster discloses shown versus supplied unique IDs. Sampled events are already producer-filtered/truncated and are not representative population estimates. Chart dots are received values; connecting segments are limited to adjacent sequences and adjacent neural ticks. Gaps do not generate samples. Axis labels may be rounded for readability; raw decoder channel values remain exact.

## State and evidence handling

- Disconnected, connecting, connected/waiting, live data, stale-open and error states are distinct.
- A transport connection alone never establishes live data. `LIVE DATA` requires `DATA RECEIVED` and a receipt age below 5,000 ms.
- A browser clock checks age every 250 ms, including when no SSE notification arrives. Each received snapshot also updates that clock.
- Stale, error, disconnect and reconnect preserve the last evidence object and chart history. Retained data is labeled **LAST SNAPSHOT**, with an age and historical observer context.
- Repeated status snapshots and duplicate/out-of-order same-session frames add no samples. A validated new session replaces display history so sessions are not joined.
- Replaced subscriptions cannot publish late callbacks. Disconnect and unmount close the SSE connection. Reconnect is explicit.
- The buffer is visualization-only and in memory. No database, persistence, replay, raw-evidence rewriting or model calls were added.

## Components and files

Created `src/app/components/live-session.tsx` with `LiveSessionWorkspace`, `ConnectomeActivity`, `SimulatedActivity`, `SessionTimeline`, `SimulationOutput`, `StreamHealth`, `SessionObserver`, and small instrument-panel/empty-plot helpers. Styling is scoped in `live-session.module.css`.

Created `src/lib/sources/live-session.ts` for bounded history, freshness, plot/raster/timeline derivation, deterministic observations and the client SSE lifecycle. Updated the existing `useFruitFlySource` to own this state across workspace navigation, added Live Session to navigation and workspace types, and added scoped shell/mobile styling.

The existing Turbopack Tailwind rule used `as: '*.css'` on every CSS file, which removed CSS Module class exports. A condition now excludes `.module.css`, letting Next handle modules while Tailwind continues processing global CSS. This was discovered in production browser review and verified after rebuilding.

The adapter, normalization/protocol, SSE route, synthetic engine, Compare implementation, Meta prompts/workflow and evidence semantics remain unchanged. No FruitFly XR source or configuration was modified; its Git working tree was clean before and after review. Existing running server processes were reused.

## Tests and validation

**155 automated tests pass**, including **15 new offline Live Session tests** in `src/lib/sources/live-session.test.ts` covering:

- Bounded, ordered history; duplicate/status filtering; frozen evidence preservation.
- Snapshot preservation through disconnect/reconnect and replacement on a new session.
- The exact stale boundary, missing/future/invalid receipt times, and honest connection/error states.
- Derived observation text, truncation, missing/stale input references and producer drop counters.
- Exact chart values, raster IDs/times/limits, zero-event windows and received-only timeline transitions.
- Source provenance preservation and the simulated/non-recording boundary.
- Streaming with `fetch` blocked, no Meta request, and only the existing SSE route opened explicitly.
- Late callbacks, terminal states, stream/startup errors and fixed public errors.
- Allowlisted serialization with secret sentinels and no fabricated movement/anatomy/biological units.

Required checks: `npm test`, `npm run experiment:demo`, `npm run experiment:ai-demo -- --fake`, `npm run lint`, `npm run build`, and `git diff --check`. All pass. AI demo and browser review use fake Meta mode only. No live Meta calls were made.

## Design reference matched and omitted

Matched the local **CausalFly Live Connectome Observatory.png** reference's visualization-first density, prominent session status, outlined dark scientific instrument panels, cyan/magenta/amber accents, paired activity views, compact horizontal event timeline, lower output/diagnostic panels, and right-side observer/insight rail. The collapsed-channel overview fits **1920×1080** without horizontal or vertical page overflow. A **390 px** mobile layout stacks panels without horizontal overflow; timeline overflow stays inside its own panel.

Intentionally omitted XR footage/Quest preview, anatomical brain rendering, named population rates/Hz, looming stimulus detection/values, causal propagation, physical speed/heading/height/trajectory, movement onset/latency, escape execution, trial condition/number/seed, and recording status. The normalized stream does not establish those facts. Structural edge totals are provenance only, not rendered connectivity. No SAM integration or continuous/on-demand Meta analysis was implemented.

## Exact manual review procedure

1. Reuse the existing real FruitFly XR server listening at `127.0.0.1:8765` (control) and `127.0.0.1:8766/observatory/v1` (read-only research). Do not start a second organism client concurrently. If the server is not running, follow the existing [bridge instructions](FRUITFLY-XR-BRIDGE.md#manual-bridge-test); no FruitFly XR edits are needed.
2. In CausalFly PowerShell, build and launch a dedicated review instance. Port 3104 was occupied, so this review used **3105**:

   ```powershell
   Set-Location C:\Users\Jason\Documents\GitHub\causalfly
   $env:FRUITFLY_XR_OBSERVATORY_URL = 'ws://127.0.0.1:8766/observatory/v1'
   $env:CAUSALFLY_FAKE_META = '1'
   npm run build
   npm run start -- --hostname 127.0.0.1 --port 3105
   ```

3. Open `http://127.0.0.1:3105` in Edge at a **1920×1080 CSS-pixel viewport, device scale factor 1**. Choose **Live Session**, verify the Synthetic Fixture explanation, then **Select FruitFly XR → Connect FruitFly XR**. Expect **CONNECTED / WAITING FOR DATA**, no charts or invented observations. Capture the waiting state.
4. Run the already built, unchanged desktop BrainClient harness in another terminal. This avoids creating build outputs or changing dependencies in FruitFly XR:

   ```powershell
   dotnet C:\Users\Jason\Documents\GitHub\fruitfly-xr\tests\BrainClient\bin\Debug\net10.0\BrainClient.dll ws://127.0.0.1:8765/brain/v1
   ```

5. Capture while the session says **LIVE DATA** and the raster has received events. The final captured run received **4 frames** from session `42e24300-8ad0-4d8f-8876-7db6de696d61`, ending at sequence/tick **4**, model time **200 ms**, **3,314** reported spike events, **59,294** active simulated neurons, **512** supplied events with truncation, input reference **3 / fresh**, **0** producer drop counters, motor decoder **ESCAPE**. These are observations from that run, not guaranteed values for subsequent trials.
6. Verify BrainClient exits **0** with `PASS C# socket + physical-distance proxy + real connectome + command gate`. Wait at least five seconds after its final frame. The research socket stays open; expect **STALE / CONNECTED / LAST SNAPSHOT**, preserved plots/output/session ID, and an increasing frame age. Capture again.
7. Disconnect and reconnect without a new trial. The old session remains explicitly historical. Open Evidence and return to Live Session; retained data must remain. Resize to **390×844** and check panel stacking and horizontal overflow.
8. Inspect browser requests and console: no experiment/provider requests during streaming and no page errors. The captured run had **zero** unexpected requests and **zero** page errors. The final desktop document measured **1920×1080** and the mobile document width measured **390**.
9. Separately run a forced-fake Synthetic Fixture experiment. Check Compare, visit Live Session's source explanation, return to Compare with the same result, then inspect AI Scientist and Evidence. Existing automated workflow tests also preserve those paths.

The built-in browser tool could not initialize in this session. Manual browser verification used installed local Playwright with installed Edge in headless mode, connected to the real local CausalFly app and real BrainClient/server, with no telemetry mocking. The BrainClient trial and its native domain checks passed. Runtime server logs may be produced by the already running external service; no FruitFly XR source files were edited.

## Screenshots

- [Incoming real data — 1920×1080](review/sprint-5-1/live-1920x1080.png)
- [Stale / last snapshot — 1920×1080](review/sprint-5-1/stale-1920x1080.png)
- [Connected / waiting — 1920×1080](review/sprint-5-1/waiting-1920x1080.png)
- [Mobile historical snapshot — full page](review/sprint-5-1/mobile-stale.png)
