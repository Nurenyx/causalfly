# Demo runbook — Meta hackathon release candidate

Use a desktop browser with WebGL. Commands are PowerShell from `C:\Users\Jason\Documents\GitHub\causalfly`. Requires Node.js 22+ and npm; this release was checked on Node 24. Keep `.env.local`, provider consoles, and credentials off screen.

## A. Reliable offline demo

Install from the lockfile and build before the presentation. Build may need internet for Google fonts; runtime fixture/template actions need no Meta connection.

```powershell
Set-Location C:\Users\Jason\Documents\GitHub\causalfly
npm ci
$env:CAUSALFLY_FAKE_META = '1'
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`. Confirm **FAKE META CLIENT** and **OFFLINE DEMO**. Keep the default question. For the shortest fallback, click **Design with Meta → Approve & Run Experiment → Explain with Meta**.

For the perception-inclusive fallback, use **Real-world perception → Offline validation → Load OFFLINE SAM FIXTURE → Design Experiment With This Stimulus → Approve & Run Experiment → Explain with Meta**. Expect **four fixture frames**, stimulus **0.640**, and **OFFLINE SAM FIXTURE / NO LIVE DETECTION**. The fixture is a separate diagram, not a detection over the calibration video. Present design/explanation as templates.

**Fake mode controls Muse only. Do not click Analyze with SAM 3.1 during an offline demo.** That button still attempts live SAM when server credentials are configured. Offline fixtures are explicit and never substituted after failure.

For iteration instead of production playback, substitute `npm run dev -- --hostname 127.0.0.1 --port 3000` for the build/start commands. Stop this process with Ctrl+C before changing mode or reusing its port.

## B. Live Meta demo

Set up the environment locally without overwriting an existing configuration:

```powershell
Set-Location C:\Users\Jason\Documents\GitHub\causalfly
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Edit `.env.local` in your editor:

```dotenv
META_API_KEY=<your Meta API key>
META_BASE_URL=https://api.meta.ai/v1
META_MODEL=muse-wonder-1.0
META_TIMEOUT_MS=120000
```

Use an account with access to Muse and `sam-3.1`. Existing shell variables override `.env.local`; check locally without displaying credential values. In the server terminal:

```powershell
Remove-Item Env:CAUSALFLY_FAKE_META -ErrorAction SilentlyContinue
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` and confirm **META LIVE**. SAM always uses `sam-3.1` at the official Meta base, independently of Muse's `META_MODEL`. Requests can take longer than a video beat; record the actual actions and edit waiting time with an honest “processing time shortened” caption. No live provider smoke command is required by automated validation.

## Canonical hackathon path

1. Open **Experiment**. Keep “What happens if I silence the primary pathway?” in the question field; do not submit a design yet.
2. Select **Real-world perception**.
3. **Choose video** → `public/perception-calibration.mp4` in this repository.
4. Confirm concept **red square**. This clip is generated calibration media, not recorded real-world footage.
5. Click **Analyze with SAM 3.1** once; wait for a completed result.
6. Verify the returned **60-frame track**; scrub/play the tracked video. Do not present this check as passed if the response differs.
7. Verify **DERIVED STIMULUS ≈ 0.488**. Sprint 8B recorded `0.48755208333333333`; fresh detections may differ. Show returned geometry/formula in **PERCEPTION DETAILS** if needed. CausalFly computes this value; Muse does not choose it.
8. Click **Design Experiment With This Stimulus**. Review the proposed silencing target/settings. Confirm accepted input and the locked derived amplitude.
9. Click the main **Approve & Run Experiment** action. Design alone never executes a trial.
10. Observe the embodied/network playback: control then intervention, or select **Compare runs** to display both. Movement illustrates synthetic engine results, not a measured fly trajectory.
11. Inspect the measured result: output strength, response/threshold timing, and whether the target was reached. Narrate actual values; do not borrow the default amplitude-1 result. A weak derived stimulus may leave a condition below threshold; absent crossing is not a zero delay.
12. Click **Explain with Meta** explicitly; wait for accepted interpretation.
13. Show **What should we test next?** The proposal requires a new design and approval. **Use as Next Question** only loads it; avoid starting a second experiment during the timed demo.
14. Show **EXPERIMENT TRUST**: matched conditions, engine-owned measurement, deterministic input, AI downstream, and biological validation not established.
15. Expand **Run diagnostics → EXPORT RUN DIAGNOSTICS**. Inspect the downloaded run ID, manifest, and ordered events. Review question/AI prose before sharing. Exports are copies, not signed attestations or independently verified replay.
16. Select **Live Connectome** for the scale reveal. Show published CNS structure and, if connected, actual received simulated telemetry. If disconnected/waiting, say so; the structure-only view remains available.

## C. Optional FruitFly XR connection

This is pre-existing, separate proprietary work. Do not rebuild, edit, copy assets from, or deploy it for this release. The commands below use **already-built local binaries** documented in Sprint 5.4. Confirm the graph artifact and binaries exist first; otherwise use the structure-only fallback. CausalFly subscribes to port **8766**, never the control lane on **8765**.

If the brain server is not already running, in a separate terminal (working directory keeps any generated logs inside CausalFly's ignored `tmp`):

```powershell
Set-Location C:\Users\Jason\Documents\GitHub\causalfly
New-Item -ItemType Directory -Force tmp/demo-brain | Out-Null
Set-Location tmp/demo-brain
& 'C:\Users\Jason\Documents\GitHub\fruitfly-xr\services\brain-server\build\install\fruitfly-brain-server\bin\fruitfly-brain-server.bat' 127.0.0.1 8765 'C:\Users\Jason\Documents\GitHub\fruitfly-xr\data\connectome\malecns-v1.0.flyb.gz'
```

Stop the CausalFly preview before restarting it with this server-only setting. Keep the fake flag for offline Muse, or remove it for live Muse as in B:

```powershell
Set-Location C:\Users\Jason\Documents\GitHub\causalfly
$env:FRUITFLY_XR_OBSERVATORY_URL = 'ws://127.0.0.1:8766/observatory/v1'
$env:CAUSALFLY_FAKE_META = '1'
npm run start -- --hostname 127.0.0.1 --port 3000
```

Click **Live Connectome → Connect FruitFly XR**. A research connection alone does not start a trial. To produce telemetry without a headset, the existing external BrainClient can start its own trial in another terminal (.NET 10 runtime and prebuilt client required):

```powershell
Set-Location C:\Users\Jason\Documents\GitHub\causalfly
dotnet 'C:\Users\Jason\Documents\GitHub\fruitfly-xr\tests\BrainClient\bin\Debug\net10.0\BrainClient.dll' 'ws://127.0.0.1:8765/brain/v1'
```

Use one external organism client at a time. This client supplies a synthetic trajectory to the existing simulation; it is not a CausalFly intervention. Expect received session/sequence data and activity highlights while running; after five seconds without frames expect **LAST SNAPSHOT** / stale telemetry, not continuing live activity. Existing Quest embodiment is optional pre-hackathon context, not a release dependency. [Protocol and limitations](FRUITFLY-XR-BRIDGE.md)

## Recovery

| Failure | Operator action |
| --- | --- |
| SAM no match / unexpected track | Read the visible error; confirm the calibration file and single concept `red square`. **Change Video**, reselect if needed, then explicitly retry. No valid track means no accepted derived stimulus. If unavailable, switch deliberately to the labelled offline fixture; do not claim 60 frames or 0.488 for that fixture. |
| Meta design/interpretation request fails | Use **Show action & recovery**, inspect the safe message and run diagnostics, verify server configuration/access privately, then retry explicitly. Interpretation failure leaves measurements inspectable. To use offline mode, stop/restart with the fake flag and clearly disclose templates. |
| Expired media / server restart / reload | The original provider upload is deleted after analysis; it is not a reusable cloud URL. Retained geometry/receipts are process-local with bounded lifetimes. Re-analyze or reload the offline fixture, design again, and approve a new run. Existing downloads/browser snapshots can be inspected but cannot bypass verification. A design-only expiry can be recovered by redesigning with the still-valid retained stimulus. |
| FruitFly XR unavailable | Stay on bundled static structure and show its actual disconnected/waiting state, or return to **Experiment**. Check local server, research URL, and external session; reconnect explicitly. Never relabel static or stale content as live activity. |
| Port already in use | Use the existing intended preview or stop only the process you launched. Alternatively choose another free port in the command and browser URL. Do not terminate unrelated services. |

## Before recording/submission

Check fake/live labels, canonical clip path, export download, and optional telemetry freshness. Use [DEMO_SCRIPT.md](DEMO_SCRIPT.md) to stay under three minutes. Use [HACKATHON-DISCLOSURE.md](HACKATHON-DISCLOSURE.md) to distinguish event work from FruitFly XR. Keep historical sprint evidence intact; put new local captures/downloads in ignored `tmp/`.
