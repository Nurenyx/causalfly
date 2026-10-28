# Sprint 5.4 review

Status: implementation and production browser validation completed; ready for manual visual review. All changes remain uncommitted. This is not a claim of pixel equivalence to the references.

## Five visual gaps recorded before coding

Inspected all three images in `docs/design-reference/`, the existing Live Session source, and the baseline live capture in `docs/review/sprint-5-3b/final/live-1920x1080.png`.

1. **Dimensionality:** the baseline is a fixed raw-X/Y silhouette. The reference has substantial depth and immersive spatial presence. Prioritize full-density perspective geometry and arbitrary camera viewpoints without fabricated fibers.
2. **Luminous hero:** the reference devotes much more area to luminous cyan imagery. The baseline's sampled, dim structure is visually weaker. Prioritize depth-sensitive cyan points and clear current activity on near-black.
3. **Exploration affordances:** the baseline has no spatial controls. Make 3D/Projection and reset immediately discoverable, with subordinate overlays that preserve hero size.
4. **Scientific context hierarchy:** the baseline maps IDs but does not foreground unmapped counts or distinguish received-frame recency in its legend. Make these compact, legible facts without competing with primary metrics.
5. **Composition and instrument density:** the baseline has quieter hero space and a simpler Observer than the reference. Preserve the dominant hero/analytics/Observer balance, strengthen viewer captions and state hierarchy, and keep the existing amber investigation, magenta output, and green connection treatments.

The reference's XR imagery, fibers, population rates, stimulus/behavior measurements, and AI interpretations are unsupported here and will not be reproduced.

## Provenance

The 3D viewer visualizes published connectome soma coordinates and FruitFly XR simulated neural telemetry. It does not visualize recordings from a living fly.

The existing static asset and pinned `male-cns:v1.0` identity remain unchanged. There are **141,781 available soma coordinates and 141,781 rendered structural vertices in 3D**. This is coordinate coverage, not the source's 176,422 total neurons and not an active-neuron count. The preserved Projection deliberately retains its disclosed 47,261-point structural sample, plus exact mapped activity. No new edges, metadata, coordinates, recordings, or anatomical direction labels were introduced.

## Technology and dependency compatibility

- Runtime: `three` **0.186.1**, `@react-three/fiber` **9.8.2**.
- Development types: `@types/three` **0.186.0**.
- Installed React/React DOM: **19.3.0**; Next.js: **16.4.3**.
- Before installation, `npm view @react-three/fiber version peerDependencies --json` returned React/React DOM `>=19 <19.4` and Three `>=0.156`. All installed versions meet these ranges. The official [Fiber installation guidance](https://r3f.docs.pmnd.rs/getting-started/installation) pairs Fiber 9 with React 19.
- Chosen approach: Fiber with Three's native [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html). No Drei, WebGPU, postprocessing, or UI framework was needed. The production bundle builds and runs with the existing Next configuration.
- Read the installed Next.js server/client and lazy-loading guides before implementation. `next/dynamic` with `ssr: false` is declared inside the existing client module. The GPU renderer loads only for 3D; neither Three nor a DOM canvas initializes during server rendering.

## Deterministic render transform

| Property | Exact value |
| --- | --- |
| Source minimum XYZ | `[2468, 4758, 10154]` |
| Source maximum XYZ | `[93668, 68996, 134531]` |
| Source center XYZ | `[48068, 36877, 72342.5]` |
| Uniform scale | `2 / 124377`, approximately `0.00001608014343487944` |
| Render XYZ | `[(x−48068)×scale, −(y−36877)×scale, −(z−72342.5)×scale]` |
| Axis conversion | Rigid 180-degree rotation about render X; no relative-coordinate distortion |
| Default camera | Perspective; position `[1.1, 0.5, 2.3]`; target `[0,0,0]`; FOV 32 degrees; near 0.01; far 40 |
| Camera zoom bounds | Orbit distance 0.45–12 render units |

The bounding box is centered and its longest span normalized to 2 render units. These are display units, not a physical calibration. No anatomical orientation is asserted. Reset restores the deterministic default camera and clears residual damping.

## Data fields and mapping

The viewer consumes the existing validated `frames` prop; it opens no connection and maintains no additional telemetry session buffer. The existing server-side bridge, SSE route, source validator, session reducer, 120-frame buffer, and five-second stale detection remain unchanged.

Direct 3D classification uses `telemetry.sessionId`, `sequence`, `neuralTick`, and `spikeEvents[].neuronId`. Viewer captions/counters also use `neuralTick` and `displaySpikeEvents`. Anatomy verification compares `provenance.connectomeSha256` with the captured asset's hash; the asset parser checks its pinned dataset, semantics, count, unique IDs, and finite coordinates. Before telemetry, the same pinned published asset can be inspected without claiming a verified live connection.

The surrounding existing instruments continue using received `simulationMs`, `totalSpikeEvents`, `activeNeuronCount`, `motorMode`, `inputSequence`, `inputFresh`, drop/truncation diagnostics, decoder values, and CausalFly `receivedAt`. Model time and receipt time remain distinct. `spikeTimeMs` remains in the original evidence; it is not used to interpolate activity.

The anatomy builds one `Map<actual neuron ID, vertex index>`. Every activity point copies its position from that indexed structural vertex. Missing IDs increment the current unique unmapped count and produce **no vertex**. Duplicate events count toward the supplied event count but illuminate an ID only once. The current unique mapped count, unmapped count, recent mapped-ID count, structural count, and supplied-event count remain separately visible as text.

## Activity and state semantics

- **Current:** unique mapped IDs in the newest received frame. Near-white cyan cores, larger luminous cyan points.
- **Recent:** only the preceding three received frames in the same session. Newest occurrence wins; an ID already current is not drawn again as recent. Frame emphasis is `[1, 0.48, 0.24, 0.12]` for ages 0–3.
- Recency advances only when actual frames enter the existing buffer. Sequence/tick gaps do not create intermediate events. No clock-based fade, random particles, auto-spin, inferred pathways, or simulated firing is generated in the renderer.
- **WAITING:** full published structure is inspectable; zero activity points; waiting labels and unavailable telemetry counters.
- **LIVE:** exact mapped received IDs illuminate; recent emphasis updates from received history.
- **LAST SNAPSHOT:** the identical point buffers and emphasis values remain visible. The existing status/header and viewer caption turn amber. Camera inspection still works; no new neural activity occurs.
- **Disconnect/reconnect:** the existing last evidence and frames persist until new valid evidence. A new session is isolated by the existing reducer and the classifier's session check. Refresh clears in-memory evidence and returns to structure-only waiting.
- Projection also uses received-frame emphasis without a timed activity animation. Its existing coordinate projection and sample disclosure remain available.

## GPU architecture and interaction

One full-density `THREE.Points` structural layer uses a cached Float32 XYZ buffer. Current and recent activity use two additional `Points` layers with fixed capacities of 512 and 1,536 vertices, respectively, matching the existing validated 512-events-per-frame cap. Activity updates rewrite only the bounded activity arrays and their draw ranges. There are no per-neuron React components, meshes, or state objects.

The structural XYZ buffer is 1,701,372 bytes. Structural emphasis plus bounded activity attributes bring the principal typed attribute arrays to approximately 2.3 MB before renderer/driver overhead. The ID lookup and source JSON are additional CPU memory. Base geometry is not rebuilt on telemetry ticks.

Depth-sensitive point color/opacity, perspective sizing, restrained cyan sprite halos, and additive blending supply depth cues. There are no lines, decorative particles, meshes, fibers, or postprocessing effects. Device pixel ratio is capped at 1.5. Rendering is demand-driven, and the memoized scene is isolated from receipt-age UI updates. The final browser check observed no additional draw calls during idle or stale observation windows. Fiber owns and disposes declarative geometry/materials and its renderer; the component disposes controls, media-query listeners, key listeners, and context-loss listeners on unmount.

Controls: drag to orbit, wheel/trackpad to zoom, right-drag or Ctrl/Meta-drag to pan, touch orbit/pinch-pan, and Reset View. Arrow keys pan while the canvas has focus; Shift+arrows rotate. Buttons are keyboard reachable and labelled, with visible focus. Reduced motion disables damping. There is no auto-rotation toggle or fullscreen feature. Hover inspection was omitted to avoid expensive full-cloud picking.

## WebGL fallback

Renderer initialization errors cross the Canvas boundary into a local error boundary, switching to Projection and showing a small explanation. A lost WebGL context also switches to Projection. The last evidence, charts, Observer, and source connection remain usable. 3D is disabled for that viewer instance after failure; refresh allows a fresh initialization attempt. A user can always choose Projection or ID raster explicitly.

Both actual context-loss handling and a test that blocks WebGL context creation were exercised in the production browser. Neither test injected or fabricated telemetry.

## Validation results

| Check | Result |
| --- | --- |
| `npm test` | PASS: 169 tests, zero failures; nine new 3D data tests |
| `npm run experiment:demo` | PASS |
| `npm run experiment:ai-demo -- --fake` | PASS; explicitly labelled FAKE META CLIENT |
| `npm run lint` | PASS |
| `npm run build` | PASS: compilation, type checking, prerendering |
| `git diff --check` | PASS |
| Real BrainClient telemetry | PASS: existing already-built Java server and C# client; no external source edits |
| Rotation / zoom / pan / reset | PASS; reset image matches the original view with identical hover state |
| Modes / keyboard / reduced motion | PASS: 3D, Projection, ID raster, focused key controls, reset |
| WAITING → LIVE → LAST SNAPSHOT | PASS: actual validated external received frames |
| Disconnect / reconnect / refresh | PASS: retained evidence until refresh, then empty waiting state |
| Stale activity | PASS: unchanged activity pixels and no new GPU draw calls while idle |
| Fallback | PASS: lost context and blocked initial context creation |
| Desktop layout | PASS: 1920×1080 has exactly 1920×1080 document dimensions; 1440 has no horizontal overflow and permits vertical scrolling |
| Narrow layout | PASS: 390px has no horizontal overflow |
| Console / network | Zero unhandled runtime errors and zero unexpected/external or experiment requests during normal review; dependency/driver warnings below |
| Repository safety | No commits/tags/pushes, no credentials or environment files added; FruitFly XR working tree remains clean |

New tests cover transform bounds/center/uniform scale/axis conversion, relative distances, finite degenerate coordinates, unchanged source data, full-density vertex coverage, exact ID mapping, duplicate and missing IDs, current/recent classification, bounded history, sequence gaps, empty activity, session isolation, and snapshot preservation through stale/disconnect/reconnect states. No unit test requires WebGL.

The browser's renderer was **ANGLE/SwiftShader software Vulkan**, not a measured discrete desktop GPU. The full point cloud was exercised through automated camera gestures. This is interaction and draw-count validation; no hardware-GPU FPS claim is made. Native hardware performance remains a manual review consideration.

Console warnings were inspected: Fiber internally constructs Three's deprecated `Clock`; screenshots trigger GPU ReadPixels stall warnings in SwiftShader; deliberate context loss produces a renderer cleanup warning about `WEBGL_lose_context`. No warning was suppressed. No application-authored Clock or neural timer was added. The forced initialization failure is handled locally, as intended.

No live Meta request occurred. The AI CLI used `--fake`, and the production preview explicitly sets `CAUSALFLY_FAKE_META=1`.

The final real trial supplied three received frames. At tick 3 / 150 model ms, the producer reported 3,317 spike events, 59,772 active simulated neurons, and 512 supplied display events. The supplied events contained 477 unique IDs: **474 mapped and 3 unmapped**. The preceding received history contributed **136 recent mapped IDs** after newest-occurrence deduplication. Browser assertions independently recomputed these values from the SSE evidence and the published coordinate file. The existing BrainClient exited successfully with its trial/domain/socket checks passing. Generated external trial logs were moved into `tmp/sprint-5-4/brain-runs/`, and the review server now runs with its working directory inside ignored tmp so future trial output stays there.

## Screenshots and visual comparison

All review images and scripts are ignored under **`tmp/sprint-5-4/`**. No images were added to tracked `docs/review/`.

- `3d-waiting-1920x1080.png`
- `3d-live-1920x1080.png`
- `3d-last-snapshot-1920x1080.png`
- `3d-1440.png`
- `projection-1920x1080.png`
- `projection-fallback.png`
- `projection-initialization-fallback.png`
- `reference-vs-sprint-5-4.png` — equal-size images labelled **APPROVED REFERENCE | SPRINT 5.4**
- `verification.json` — received evidence and browser assertions; companion logs and capture scripts are in the same temporary folder.

The final 1920 hero is approximately 749.8×606 px with a 747.8×416 px interactive canvas. Its panel footprint matches Sprint 5.3B's hero; compact controls/counters preserve dominant visual importance. The Observer remains 411.5 px wide and aligned with the instrument stack.

Visual refinement included increasing initial camera prominence, reducing oversaturated structure, strengthening depth/foreground activity separation, preserving near-black/cyan surfaces, adding subtle state overlays, and fixing clipped branding/wrapped navigation at 1440px. The final live, stale, 1440px, fallback, and side-by-side images were inspected.

### Resolution of the five original gaps

1. **Dimensionality — resolved functionally, substantially improved visually.** All XYZ coordinates render in perspective and arbitrary viewpoints are available. Soma points remain a point cloud rather than the reference's unsupported meshes/fibers.
2. **Luminous hero — improved.** Full structural density, perspective depth, cyan halos and bright exact activity provide stronger presence. The reference still contains a much larger, brighter XR scene.
3. **Exploration — resolved.** Compact mode buttons, interaction hints, grab cursor, reset, keyboard controls, and real failure recovery are present.
4. **Scientific context — resolved.** Separate structural/event/mapped/unmapped/recent values and frozen-state labels communicate what is visible without conflating it with all active simulation neurons.
5. **Composition/density — partly resolved.** The dominant hero/analytics/Observer arrangement, precise palette, amber investigation treatment, magenta decoder, and green connection remain coherent. The reference's richer subviews and illustrated sidebar are still absent.

### Conservative self-assessment

Scientific correctness and visual resemblance are separate criteria. These scores reflect the inspected captures, not user acceptance.

| Category | Score / 10 | Explanation |
| --- | --- | --- |
| Reference resemblance | 7 | Palette and instrument balance are closer; XR imagery, mesh detail, sidebar illustration and varied subviews differ substantially. |
| Visual hierarchy | 8.5 | Dominant hero and metrics with subordinate controls; the reference has a richer distribution of luminous content. |
| Scientific readability | 9 | Structural coverage, supplied events, ID mapping, recency and stale status remain distinct and visible. |
| 3D hero visualization | 8.5 | Full-density perspective and luminous activity are effective; soma-only geometry has less visual richness than the reference and no physical orientation calibration. |
| Interaction quality | 8.5 | Tested orbit/zoom/pan/reset, keyboard and fallback; no neuron hover or expanded view, and no hardware-GPU timing measurement. |
| Telemetry visualization | 8 | Exact mapping and bounded received history are clear; event sampling and a short trial limit temporal richness and no cell annotations are available. |
| Information density | 7.5 | Supported counters and analytics fit well; WAITING and short histories are quieter than the reference's many supported-looking panels. |
| Typography | 8 | Clear state/value hierarchy and corrected 1440px branding; compact machine captions are small and the reference's typography/icons differ. |
| Live-state clarity | 9 | Green live, amber last snapshot, explicit waiting/disconnected transport and retained evidence remain distinct. |
| Scientific integrity | 10 | Against sprint constraints: no fabricated coordinates/events/edges, no engine/protocol/AI changes, and exact provenance preserved. This is not biological validation. |

## Files changed

- `package.json`, `package-lock.json`: pinned compatible renderer dependencies/types.
- `src/lib/sources/connectome-view.ts`: pure coordinate transform, cached buffers/lookup, received-frame classification.
- `src/lib/sources/connectome-view.test.ts`: nine deterministic offline tests.
- `src/app/components/connectome-3d.tsx`: client-only GPU layers, native controls, disposal, demand rendering and local fallback boundary.
- `src/app/components/live-visualizations.tsx`: viewer modes, shared existing frames, waiting anatomy, mapping counts, projection recency.
- `src/app/components/live-session.tsx`: keep structural hero available before first telemetry.
- `src/app/components/live-session.module.css`: viewer palette, captions, compact controls, mapping strip and focus styling.
- `src/app/globals.css`: Live Session-only sidebar branding/navigation fit at 601–1600px.
- `docs/SPRINT_5_4_REVIEW.md`: this review.

## Launch and manual review

The production preview and brain server were left running for review. Open **http://127.0.0.1:3114/**, select **Live Session**, then **FruitFly XR**. Browser refresh clears received evidence. The commands below are for a fresh launch after stopping existing instances on those ports; they use already-built external binaries and do not build or edit FruitFly XR.

Brain server, if it is not already running:

```powershell
Set-Location C:\Users\Jason\Documents\GitHub\causalfly
New-Item -ItemType Directory -Force tmp/sprint-5-4 | Out-Null
Set-Location tmp/sprint-5-4
& 'C:\Users\Jason\Documents\GitHub\fruitfly-xr\services\brain-server\build\install\fruitfly-brain-server\bin\fruitfly-brain-server.bat' 127.0.0.1 8765 'C:\Users\Jason\Documents\GitHub\fruitfly-xr\data\connectome\malecns-v1.0.flyb.gz'
```

CausalFly, in a separate terminal:

```powershell
Set-Location C:\Users\Jason\Documents\GitHub\causalfly
$env:FRUITFLY_XR_OBSERVATORY_URL = 'ws://127.0.0.1:8766/observatory/v1'
$env:CAUSALFLY_FAKE_META = '1'
npm run dev -- --hostname 127.0.0.1 --port 3114
```

Real BrainClient telemetry, after clicking **Connect FruitFly XR**, in another terminal:

```powershell
Set-Location C:\Users\Jason\Documents\GitHub\causalfly
dotnet 'C:\Users\Jason\Documents\GitHub\fruitfly-xr\tests\BrainClient\bin\Debug\net10.0\BrainClient.dll' 'ws://127.0.0.1:8765/brain/v1'
```

Before BrainClient starts, expect **WAITING FOR DATA** and structure only. While it runs, expect **LIVE** and mapped highlights. After it exits, wait at least five seconds for **LAST SNAPSHOT**; the geometry/activity remains unchanged and inspectable. Drag, scroll, right-drag, reset, and switch modes in each state. Disconnect and reconnect should preserve last evidence until a new valid frame; refresh should clear it. The BrainClient uses a synthetic physical-distance proxy to exercise the real connectome simulation; it is not living-fly telemetry.

## Scientific limitations

Coordinate coverage is incomplete relative to total source neurons. Display telemetry is capped/truncated and latest-only transport can drop frames. Recency counts received frames, not elapsed model time; it is not a membrane state or persistence estimate. Soma locations do not show neurite paths or synaptic transmission. Orientation/physical calibration, cell identity/function, biological firing rates, XR movement/video, stimulus measurements and causal interpretations remain unavailable. The local Observer is a deterministic presentation of supplied facts, with no live Meta analysis. No simulation behavior, decoder, experiment engine, Compare workflow, protocol, scientific guardrail, prompts or schemas changed.
