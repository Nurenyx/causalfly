# Sprint 5: FruitFly XR data bridge

FruitFly XR was found at `C:\Users\Jason\Documents\GitHub\fruitfly-xr`, revision `32fa70e425fedaf50957bf72eb3d432f1bb52319`, and inspected read-only. Its working tree was clean before and after inspection. No FruitFly XR files were modified or commands sent to its server during implementation. The bridge is implemented against the verified source protocol; validation uses offline mocked telemetry, not a running biological or XR experiment.

## Verified transport and source

The source files below are relative to the FruitFly XR repository:

| Source | Verified behavior |
| --- | --- |
| `services/brain-server/src/main/java/org/fruitflyxr/server/BrainServer.java`, `main` | Defaults to `127.0.0.1:8765`; starts research listener on control port + 1 (8766 by default). |
| `.../ObservatoryServer.java`, `onOpen`, `onMessage`, `broadcastLatest` | RFC 6455 WebSocket UTF-8 JSON text, path `/observatory/v1`; sends hello, static scaffold chunks, then latest-only research frames. Incoming messages are ignored. |
| `.../ResearchProtocol.java` | Version 1 DTO field definitions and caps (512 display spike events, 256 display edges, 2048 scaffold points per chunk). |
| `.../ResearchHub.java`, `availability`, `buildFrame` | Dataset/hash availability; exact first N filtered spikes; connected active edges explicitly NON_CAUSAL; drops display frames for slow subscribers. |
| `.../NeuralEngine.java`, `load`, `step` | Checks pinned artifact SHA-256, `male-cns:v1.0`, 176422 neurons, 6287749 edges; simulated LIF dynamics; 50 ms model ticks, 0.5 ms integration steps. |
| `contracts/brain-v1.md`, `.../Protocol.java` | Separate control channel `/brain/v1`, port 8765 by default; each organism connection starts a fresh seeded trial. CausalFly does not connect to this channel. |
| `third_party/UPSTREAM-PIN.md`, `data/connectome/README.md` | Derived published male CNS structure, CC BY 4.0; attribution to HHMI Janelia FlyEM, Cambridge/MRC LMB Drosophila Connectomics Group, Google Research Connectomics. |
| `.../com/fruitfly/brain/MotorMap.java`, `MotorDecoder.java` | Exact decoder channel names and motor mode enum. |

Verified research endpoint: **`ws://127.0.0.1:8766/observatory/v1`** under default launch settings. Control endpoint: **`ws://127.0.0.1:8765/brain/v1`**. A custom control port changes the research port to that port + 1. The CausalFly adapter has no default endpoint; configure its server environment explicitly.

Pinned connectome artifact: `malecns-v1.0.flyb.gz`, SHA-256 `e33df182bed7a6f3ea279daf4790a82b05706d3d41e819a6a80c0473e8c559f3`. The bridge checks this identity on the research hello; it does not download or independently rehash the artifact. The FruitFly XR loader performs the artifact hash check. Source identity is asserted by this local, unauthenticated research service, not cryptographically authenticated over the network.

This is published **structural connectome** data driving **FruitFly XR simulated dynamics**. It is **not experimental recording from a living fly**. Source/configuration inspection supports those distinctions; no claim of physiological rate accuracy or validated biological behavior is made.

## Exact messages discovered

All three research messages have `version`, `type`.

- `observatoryHello`: `dataset`, `connectomeSha256`, `neurons`, `edges`, `representedSynapses`, `neuronIds`, `spikeEventsAvailable`, `membranePotentials`, `somaCoordinates`, `neuronMetadata`, `synapticTransmissionEvents`, `edgeDisplaySemantics`, `maxDisplaySpikes`, `maxDisplayEdges`, `somaCoordinateCount`, `scaffoldChunkCount`, `scaffoldChunkSize`, `coordinateSemantics`, `somaMinX/Y/Z`, `somaMaxX/Y/Z`. Availability flags describe the external research infrastructure; they do not establish that every quantity is included in each WebSocket frame.
- `observatoryScaffoldChunk`: `chunkIndex`, `chunkCount`, `somaCoordinateCount`, `coordinateSemantics`, `somaPoints[]` (`neuronId`, `somaX/Y/Z`). These static messages are skipped by CausalFly.
- `observatoryFrame`: `sessionId`, `sequence`, `simulationMs`, `neuralTick`, `totalSpikeEvents`, `activeNeuronCount`, `displaySpikeEvents`, `displayTruncated`, `droppedDisplayFrames`, `droppedSubscriberMessages`, `spikeDisplaySemantics`, `edgeDisplaySemantics`, `spikeEvents[]`, `connectedActiveSubgraph[]`, `decodedMotor[]`, `inputSequence`, `inputFresh`, `motorMode`.
- Each research spike event: `neuronId`, `spikeTimeMs`, `hasSoma`, `somaX/Y/Z`, `neuronType`, `neuronClass`, `region`. Each connected edge: `sourceNeuronId`, `targetNeuronId`, `weight`. Each decoder channel: `name`, `value`.

Decoder channel names: `forward`, `yaw`, `backward`, `halt`, `brake`, `jump`, `takeoff`, `landing`, `flightPower`, `flightYaw`, `wingMotor`, `groomAntenna`, `groomHead`, `groomLeg`, `groomAbdomen`, `feed`, `courtship`, `song`, `songPulse`, `legMotor`, `legMotorAsym`.

Motor modes: `IDLE`, `FORWARD`, `BACKWARD`, `HALT`, `BRAKE`, `ESCAPE`, `FLYING`, `LANDING`, `GROOM`, `FEED`, `SONG`.

The **separate control stream** carries additional fields, not consumed by CausalFly: hello `sessionId`, `dataset`, `sha256`, `neurons`, `edges`, `dtMs`, `tickMs`, `gain`, `seed`; stimulus `sessionId`, `sequence`, `capturedMs`, `tracked`, `azimuthDeg`, `elevationDeg`, `angularSizeDeg`, `expansionDegPerS`, `sensoryProvenance`; telemetry timing/compute/status, `spikes`, `totalSpikes`, `activeNeurons`, watched `populations[]` (`name`, `count`, `hz`, `spikes`), `channels[]`, `motorMode`, `jump`, `takeoff`, `escape`, and sensory/decision/embodiment/landing provenance. The watched populations are LC4/L, LC4/R, LPLC2/L, LPLC2/R, DNp01, DNp04, TTMn. Population `hz` is explicitly a simulated mean per cell over the model tick, not physiological recording. The research stream omits those population rates and the stimulus values.

## What CausalFly consumes

`src/lib/sources/contracts.ts` is the browser-safe source/evidence contract. Synthetic Fixture is always `READY` and retains its original engine evidence. FruitFly XR records are separately tagged `FRUITFLY_XR`, `SIMULATED`, `experimentalRecording: false`; they never enter the synthetic comparison or Meta evidence gate.

The normalizer validates research hello version, exact dataset/hash/counts, neuron/spike availability, non-causal edge semantics, absence of transmission-event claims, and display limits. It retains the verified dataset, hash and neuron/edge counts as provenance.

For frames it consumes every top-level frame field listed above **except `connectedActiveSubgraph`**. Spike events retain only `neuronId` and `spikeTimeMs`; decoder channels retain `name` and `value`. Unknown fields, anatomy, free-text metadata, errors and endpoint configuration are not forwarded. Required fields are not coerced or filled with defaults. A frame requires a verified hello; invalid values, missing fields, unsupported identities/versions, unsafe integer IDs, inconsistent display counts and same-session ordering failures terminate the subscription with a fixed public error.

`simulationMs` and `spikeTimeMs` are model time, as defined by the producer. `receivedAt` is CausalFly UTC receipt time and is labelled separately. `totalSpikeEvents` is the event count **in this tick**, despite its upstream name. `activeNeuronCount` includes subthreshold/refractory/pending-input neurons and must not be interpreted as a spiking neuron count. Decoder values retain their exact numerical values; no synthetic normalized-activity scale or invented Hz conversion is applied.

Server-only `FRUITFLY_XR_OBSERVATORY_URL` selects the endpoint. It is never `NEXT_PUBLIC`, supplied by browser query parameters, or serialized into results. Credential-bearing URLs and query strings are rejected because the verified service has no authentication interface. No additional secret/header settings were invented.

Each explicit Connect creates a server-side native WebSocket subscription and browser same-origin SSE stream. It requires Node.js 22+ (verified locally on Node 24.18.0). The socket adapter has no send method. No connection occurs on initial page load, source selection, synthetic experiments or Meta demos. Disconnect, browser stream cancellation and request abort release the socket. The HTTP lane retains only the latest pending snapshot for slow readers.

Connection state reflects observed transport: `DISCONNECTED`, `CONNECTING`, actual socket `CONNECTED`, validated-frame `DATA RECEIVED`, or `ERROR`. Hello has a five-second deadline. After five seconds without a new frame, an open socket returns to `CONNECTED` with an explicit no-recent-frames message. Closed/failed sockets cannot return to connected from delayed callbacks. Evidence is an in-memory last-received snapshot, labelled historical even after disconnect; reload clears it. Reconnect is explicit and clears the previous subscription's snapshot.

## Unsupported in Sprint 5

- Sending interventions, creating or taking over organism sessions, and a full Live Session workspace.
- FruitFly XR causal comparisons or AI Scientist interpretation; those remain Synthetic Fixture workflows.
- Complete stimulus measurements/events on the research stream. Only `inputSequence` and upstream `inputFresh` are provided; they cannot establish causal effects.
- XR body position, movement, executed jumps, or embodiment ownership; decoder output is not actual XR movement.
- Population Hz, membrane potentials, neuron annotations, scaffold rendering, active edges, full event recording/replay, or unbounded history.
- Trial seed/gain/integration configuration in the research hello. Those exist on the control channel; CausalFly does not fabricate session-specific metadata from constants.
- Automatic reconnect or durable evidence storage. The display stream can drop/truncate data, so it is unsuitable as a complete causal experiment record.

## Manual bridge test

These instructions are for a user-run test. Implementation did not launch or modify FruitFly XR. Required: Java 21+ selected for FruitFly XR, the real pinned data artifact already fetched, and Node 22+ for CausalFly. A Quest/Unity organism client must start a trial for live frames; research subscription alone never starts a trial.

1. In a PowerShell terminal, build and launch the existing FruitFly XR service using its documented commands (build outputs and run logs are generated by the service):

   ```powershell
   Set-Location C:\Users\Jason\Documents\GitHub\fruitfly-xr\services\brain-server
   .\gradlew.bat test installDist --console=plain
   .\build\install\fruitfly-brain-server\bin\fruitfly-brain-server.bat 127.0.0.1 8765 ..\..\data\connectome\malecns-v1.0.flyb.gz
   ```

2. In a second PowerShell terminal, launch CausalFly with explicit research endpoint and fake Meta mode. This keeps the manual test offline from Meta even if `.env.local` contains live credentials:

   ```powershell
   Set-Location C:\Users\Jason\Documents\GitHub\causalfly
   $env:FRUITFLY_XR_OBSERVATORY_URL = 'ws://127.0.0.1:8766/observatory/v1'
   $env:CAUSALFLY_FAKE_META = '1'
   npm run dev -- --hostname 127.0.0.1 --port 3104
   ```

3. Open `http://127.0.0.1:3104`. Select **FruitFly XR**, click **Connect**, then open **Evidence**. Expect `CONNECTED` after socket open, verified source, and no frame yet until an organism trial starts. Hello/scaffold alone must not claim `DATA RECEIVED`.

4. For a desktop trial without a headset, the existing FruitFly XR harness can supply its documented synthetic hand-distance trajectory (requires .NET 10 SDK). In a third terminal:

   ```powershell
   Set-Location C:\Users\Jason\Documents\GitHub\fruitfly-xr
   dotnet run --project tests/BrainClient/BrainClient.csproj -- ws://127.0.0.1:8765/brain/v1
   ```

   This is the external organism client, not a CausalFly intervention. It starts a new seeded trial and ends after an accepted escape or its timeout. While it runs, expect `DATA RECEIVED` and real external session/sequence/model-time fields. Its proxy trajectory is synthetic input to the connectome simulation, not a living-fly experiment. After it ends, the research socket can remain `CONNECTED` with a last-received snapshot.

   Alternatively use the existing Unity/Quest client. For a physical Quest, start the Java service with `0.0.0.0` instead of loopback, and configure the existing client's control URL to the Windows LAN IP at port 8765 as documented by FruitFly XR. CausalFly on the same machine still uses the loopback research URL. Do not run a second organism client concurrently: FruitFly XR permits one at a time.

5. Verify **Evidence** states the structural dataset, simulated dynamics, not biological recording, actual session, retained spike IDs/times, decoder channels, truncation/drop counters and input reference. Stop the Java service: the panel must become `DISCONNECTED` or `ERROR`, never remain connected. Reconnect explicitly after restarting.

6. Select **Synthetic Fixture**. Confirm `READY`, run a fake experiment, and check Compare playback, AI Scientist, Evidence and next-question navigation. Primary Compare labels now say Signal strength, Response delay, Simulation step and Target reached?; technical definitions remain in tooltips/supporting text and raw Evidence.

## Validation and changed files

Automated tests are offline, with injected socket events, no real FruitFly XR service, and no live Meta requests. The suite verifies unchanged synthetic results and existing workflows, source separation, simulated provenance, malformed/missing telemetry, safe serialization, ordering/session changes, honest connection states, deadlines/staleness, cancellation, latest-only backpressure, and unchanged raw values under display labels.

Validation: **140 tests passed**, `npm run experiment:demo` passed, `npm run experiment:ai-demo -- --fake` passed, `npm run lint` passed without warnings, `npm run build` passed, and `git diff --check` passed. Local production HTTP checks passed for page rendering, a forced-fake experiment, and an unconfigured FruitFly SSE error without endpoint leakage. No live Meta request or live FruitFly XR trial was made. Browser automation could not initialize because the Windows sandbox helper failed; interactive browser QA remains a manual check.

Changed files:

- `.env.example`, `package.json`, `README.md`, `docs/FRUITFLY-XR-BRIDGE.md`.
- `src/lib/sources/contracts.ts`, `fruitfly-protocol.ts`, `fruitfly-bridge.ts`, `fruitfly.test.ts`.
- `src/lib/web/display-labels.ts`.
- `src/app/api/sources/fruitfly/route.ts`.
- `src/app/components/data-source-panel.tsx`, `fruitfly-evidence.tsx`.
- `src/app/observatory.tsx`, `globals.css`.
- `src/app/components/compare-dashboard.tsx`, `measured-delta-card.tsx`, `experiment-playback.tsx`, `activity-chart.tsx`.

The deterministic experiment engine, Meta prompts/schemas/evidence gate, interpretation behavior, and fake/live Meta selection are unchanged. No existing tests were removed or weakened. No commit was made.
