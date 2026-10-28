# Sprint 5.2 — High-Fidelity Live Observatory

Reviewed October 27, 2026 (America/Toronto). **Uncommitted.**

## Review

Review URL: **http://127.0.0.1:3106**. Select **Live Session → Select FruitFly XR → Connect FruitFly XR**. The review server remains running with `CAUSALFLY_FAKE_META=1` and the existing local read-only observatory endpoint configured. Reload starts a new, empty display; screenshots preserve the reviewed session.

- [LIVE DATA — 1920×1080](review/sprint-5-2/live-1920x1080.png)
- [LAST SNAPSHOT — 1920×1080](review/sprint-5-2/last-snapshot-1920x1080.png)
- [WAITING FOR DATA — 1920×1080](review/sprint-5-2/waiting-1920x1080.png)
- [Alternate neuron-ID raster — 1920×1080](review/sprint-5-2/id-raster-1920x1080.png)
- [Mobile last snapshot — 390 px, full page](review/sprint-5-2/mobile-last-snapshot.png)

## Most significant visual change

The categorical raster has become an alternate view. The primary hero renders **actual published soma coordinates**, with supplied spiking neuron IDs highlighted against a dim structural sample. It is substantially larger and sits beside stacked, filled activity charts at desktop widths, following the reference's prominent visualization pair. Below are a horizontal event timeline and magenta decoder output beside compact stream diagnostics. The right rail contains amber observer cards and source identity.

Matched the exact local `docs/design-reference/CausalFly Live Connectome Observatory.png`: strong session status and metrics, dark instrument panels, outlined panel headers, prominent cyan data visualization, thick activity traces with fill and latest-frame guides, magenta output/state changes, amber interpretation cards, green connected/validated indicators, horizontal timeline, and a compact observer rail. At 1920×1080 the session story, output and observer fit without page scrolling. On narrower screens the charts move below the hero, then panels stack for mobile.

The waiting state is a designed source-to-observer pathway, with no fake traces. Stale/disconnected evidence remains illuminated and switches the main badge to **LAST SNAPSHOT**, including last receipt UTC, last model time and last sequence. Transport connection remains separately visible. The existing five-second freshness rule and evidence retention are unchanged.

## Anatomy availability and verification

**Usable spatial coordinates were available upstream.** The unchanged normalized telemetry intentionally excludes anatomy, but the existing read-only `observatory/v1` service publishes static scaffold chunks. Read-only inspection of `ResearchHub.java` confirmed the fields and semantics. A separate, explicit asset-capture script collected all **70** chunks, totaling **141,781** coordinate records, without sending messages or starting a simulation.

The captured hello identified `male-cns:v1.0`, connectome SHA-256 `e33df182bed7a6f3ea279daf4790a82b05706d3d41e819a6a80c0473e8c559f3`, and `RAW_NEUPRINT_VOXEL_XYZ_ORIENTATION_UNSPECIFIED`. The capture checks version, dataset/hash, coordinate availability/semantics, consistent chunk metadata, complete count, finite coordinates and unique safe-integer neuron IDs. The browser validates the asset again and requires its identity to match the current normalized evidence.

`public/anatomy/male-cns-v1.json` is a static **3,752,716-byte** coordinate asset, loaded only when a validated telemetry frame exists. It contains ID/X/Y/Z tuples and capture/identity metadata, with no simulated activity. It is not an extension to the bridge, telemetry contract or evidence object. Regenerate explicitly with:

```powershell
npx tsx scripts/capture-fruitfly-anatomy.ts ws://127.0.0.1:8766/observatory/v1
```

The hero uses a uniform-scale **raw X/Y projection**, without assigning anatomical direction or physical units. It deterministically samples **7,877** static points (every eighteenth record, at most 8,000), and retains all coordinates for matching incoming spike IDs. Every supplied spiking ID with known coordinates is drawn, including IDs outside the structural background sample. IDs lacking coordinates are omitted and the matched/unique-supplied count is disclosed. Hovering a highlighted point shows its real ID and raw XYZ. The three ID callouts are leader annotations, not neural connections. No anatomical mesh or synthetic brain outline is generated. Static identity is asserted by the existing local service; this does not independently authenticate that service or rehash the original connectome artifact.

Attribution follows the existing source documentation: published male CNS structure, CC BY 4.0, HHMI Janelia FlyEM, Cambridge/MRC LMB Drosophila Connectomics Group, and Google Research Connectomics. Original evidence provenance and its hash remain untouched.

## Exact verified fields visualized

| View | Fields and derivation |
| --- | --- |
| Session bar | `telemetry.sessionId`, `simulationMs` (explicit model ms), `neuralTick`, `sequence`; `snapshot.state` for observed transport |
| LIVE / LAST SNAPSHOT | Existing `sessionStatus`: `snapshot.state`, `receivedAt` and browser clock; five-second display freshness threshold |
| Receipt / frame age | `receivedAt`; elapsed wall-clock age is separate from model time |
| Anatomy background | Static `somaPoints[].neuronId`, `somaX`, `somaY`, `somaZ`, coordinate semantics/count, dataset/hash; raw X/Y scaled uniformly for display |
| Anatomy highlights | Normalized `spikeEvents[].neuronId` matched to verified static IDs; distinct supplied spiking IDs, not the full active-neuron population; latest received tick only |
| Alternate raster | `spikeEvents[].neuronId`, `spikeTimeMs`, `sequence`, `simulationMs`; existing categorical 64-ID / 24-frame display window, no anatomical inference |
| Supplied events | `displaySpikeEvents`; no extrapolation of unsupplied IDs |
| Spike chart | `totalSpikeEvents` by `neuralTick`; reported count per received tick, not a session cumulative total |
| Active chart | `activeNeuronCount` by `neuralTick`; includes subthreshold, refractory and pending-input state |
| Chart gaps | `sequence` and `neuralTick`; traces/fill join only consecutive sequence and tick values; no interpolation across gaps or generated samples |
| Event timeline | Existing `sessionTimeline` from received `sequence`, `neuralTick`, `simulationMs`, `motorMode`, `inputSequence`; observed decoder transitions and input-reference changes, not causal propagation |
| Inactive timeline marker | Current display freshness/transport status; explicitly labeled DISPLAY STATUS, with the actual last receipt UTC; no invented simulation tick or stop timestamp |
| Decoder output | Exact `motorMode`; prior differing buffered mode shows the observed change. Raw `decodedMotor[].name/value` remain available in Evidence |
| Diagnostics | `sequence`, `droppedDisplayFrames`, `droppedSubscriberMessages`, `inputSequence`, `inputFresh`, `displayTruncated`, `displaySpikeEvents`, `totalSpikeEvents` |
| Observer facts | Exact latest reported spike count, active-neuron count and motor mode; explicit last-snapshot context |
| Stream notes / suggestions | Deterministic branches on historical status, truncation, input freshness/availability and reported drops; no provider calls or scientific causal claims |
| Provenance card | Existing `provenance.dataset`, `neurons`, `edges`; published structure and simulated dynamics remain distinct |

Chart scales, gradients, glyph size/color, structural sampling, labels and display layout are presentation choices, not additional measurements. The existing 120-frame memory-only buffer, normalization and source verification are unchanged.

## Components and files changed for Sprint 5.2

| File | Change |
| --- | --- |
| `src/app/components/live-session.tsx` | Refactored `LiveSessionWorkspace`; `LiveSessionHeader`, `EventTimeline`, `SimulationOutput`, `StreamHealth`, `AiObserverRail` |
| `src/app/components/live-visualizations.tsx` | New `ConnectomeActivityView`, `AnatomyProjection`, `EventRaster`, `LiveMetricChart`, `WaitingForTelemetry`, shared `InstrumentPanel` |
| `src/app/components/live-session.module.css` | Reference-inspired instrument styling, desktop composition and responsive layouts |
| `src/app/globals.css` | Scoped desktop Live Session shell spacing |
| `src/lib/sources/anatomy.ts` | Static asset validation, uniform coordinate projection and bounded structural sample |
| `src/lib/sources/anatomy.test.ts` | Five offline anatomy/identity/projection tests |
| `scripts/capture-fruitfly-anatomy.ts` | Explicit read-only, one-time static capture; never invoked by application/build/tests |
| `public/anatomy/male-cns-v1.json` | Verified static coordinate payload |
| `docs/SPRINT_5_2_REVIEW.md`, `docs/review/sprint-5-2/*` | This report and five screenshots |

Pre-existing uncommitted Sprint 5.1 changes were preserved. No FruitFly XR source, protocol, CausalFly bridge, evidence/source provenance, simulation semantics, experiment engine, Meta prompt or synthetic Compare implementation was changed. FruitFly XR Git status was clean before and after manual review. Its existing service can produce its normal runtime logs/recordings during BrainClient trials.

## Validation

**160 tests pass: all 155 existing tests plus five new offline tests.** The additions cover pinned identity, complete/finite/unique coordinate records, exact raw-coordinate and ID preservation, uniform projection, absent-ID handling, bounded sampling, degenerate geometry, and the real static asset offline.

All required checks passed:

- `npm test`
- `npm run experiment:demo`
- `npm run experiment:ai-demo -- --fake`
- `npm run lint`
- `npm run build`
- `git diff --check`

Manual browser validation used installed Playwright with Edge headless, a 1920×1080 CSS-pixel viewport and device scale factor 1. It connected to the real local observatory and launched the existing, unchanged built BrainClient:

```powershell
dotnet C:\Users\Jason\Documents\GitHub\fruitfly-xr\tests\BrainClient\bin\Debug\net10.0\BrainClient.dll ws://127.0.0.1:8765/brain/v1
```

Verified **WAITING FOR DATA → LIVE DATA → LAST SNAPSHOT**, no waiting-state canvas/charts, real anatomical highlights, alternate raster, retained evidence through disconnect/reconnect and workspace navigation, and mobile stacking. The desktop document measured **1920×1080** with no page overflow; the mobile document width measured **390 px** with no horizontal overflow. Stream review observed **zero browser errors** and **zero unexpected requests**. The only new request was the same-origin static anatomy asset. Separate forced-fake browser regression passed: experiment → Compare → Live Session source explanation → preserved Compare → AI Scientist → Evidence. No automatic or live Meta calls were made.

Final captured real session: `b87369f0-e2a8-4247-90ec-bf58de6ff086`, four received frames, last sequence/tick **4**, model time **200 ms**, **3,314** simulated spike events, **59,294** active simulated neurons, **512** supplied events with truncation, input reference **3 / fresh**, both producer drop counters **0**, decoder **ESCAPE**. Of **478** unique supplied spiking IDs, **476** matched available soma coordinates. These are observations from this specific run, never hard-coded UI values. Last receipt was **2026-10-28 02:43:07.971 UTC** (October 27 in Toronto).

BrainClient exited **0**, including `PASS 59 experimental trial checks`, `PASS 59 deterministic 005A.2 trial checks`, `PASS 19 domain checks`, `PASS 21 total domain checks with stabilization diagnostics`, and `PASS C# socket + physical-distance proxy + real connectome + command gate`. Its existing synthetic proxy input drives the real connectome-backed simulation; this is not a living-fly trial.

## Reference elements that current telemetry cannot establish

No XR camera/Quest preview, physical velocity/heading/height/trajectory, measured escape execution, stimulus type/value/onset, population firing rates/Hz, biological time, trial condition/seed, named causal pathways, transmission events or continuous Meta analysis is shown. The available anatomy supports a soma point projection, not the reference's rendered neuropil mesh or labeled causal network. Reported structural edges remain provenance totals, not drawn edges. Decoder ESCAPE means the simulation decoder produced that state; it does not mean a living fly or XR body escaped.

**No commit was made.**
