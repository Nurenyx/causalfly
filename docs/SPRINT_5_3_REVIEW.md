# Sprint 5.3 — Reference-driven visual polish

Implemented and visually reviewed in Edge. All changes remain **uncommitted for human visual review**. Existing Sprint 5.1/5.2 working-tree changes were preserved.

Review URL: **http://127.0.0.1:3107**. Select **Live Session → Select FruitFly XR → Connect FruitFly XR**. This review server uses `CAUSALFLY_FAKE_META=1` and the existing read-only local observatory endpoint. A reload begins with an empty display; run the existing BrainClient to receive new real simulation frames.

- [WAITING — 1920×1080](review/sprint-5-3/waiting-1920x1080.png)
- [LIVE — 1920×1080](review/sprint-5-3/live-1920x1080.png)
- [LAST SNAPSHOT — 1920×1080](review/sprint-5-3/last-snapshot-1920x1080.png)
- [1440 desktop — 1440×1080](review/sprint-5-3/desktop-1440.png)
- [Secondary ID raster](review/sprint-5-3/id-raster-1920x1080.png)
- [Mobile stacking — 390 px](review/sprint-5-3/mobile-last-snapshot.png)
- [Reference and final Live Session side by side](review/sprint-5-3/reference-vs-final.png)

## Visual-gap checklist before implementation

Compared the approved reference with the Sprint 5.2 1920×1080 capture and current implementation.

- Hierarchy: the session state and identity need to read first; machine labels currently compete with primary information.
- Hero: raw anatomy is visually small inside its allocated area; increase its actual rendered scale, depth and contrast, without inventing anatomy or paths.
- Charts: increase readout and axis readability; reduce tiny monospace captions and emphasize the latest received sample.
- Observer: replace sentence-heavy rows with large facts and give the entire rail a distinct editorial rhythm.
- Density: remove repeated nested boxes, align the three zones, strengthen timeline storytelling and enlarge decoder output while retaining first-viewport coverage.
- Status: use unmistakable live, waiting, amber snapshot and red error treatments; keep retained evidence illuminated.

The reference's camera imagery, named pathways, physical behavior, stimulus measurements and Hz values cannot be reproduced from this stream and will not be added.

## Reference iteration

First real-bridge pass captured at exactly 1920×1080 in Edge (device scale factor 1). Its five largest remaining differences were:

1. Session framing consumed too much vertical space.
2. The hero's surrounding chrome made the visualization group too tall.
3. The four-fact observer rail extended below the useful viewing area.
4. Decoder output and source identity fell below the fold.
5. Supporting observer prose diluted the reference's concise visual hierarchy.

Second pass tightened header spacing and hero framing, preserved the improved coordinate fit and large numerical readouts, compressed observer rows, reduced its suggestion to one concise instruction, and shortened panel spacing. First-pass screenshots remain alongside the final captures for comparison.

The second capture still placed output and provenance too low, so a third refinement was required. It moved state beside session identity, removed the redundant observer introduction, simplified timeline rows, increased the actual coordinate fit, and compacted source provenance. Final spacing refinements retained the larger anatomy while bringing the entire session into the viewport. The final live and snapshot captures were compared again with the approved reference. The principal remaining differences are the deliberately different scientific content listed below.

## Files changed in this sprint

| File | Purpose |
| --- | --- |
| `src/app/components/live-session.tsx` | Session hierarchy and state treatments; large observer facts; concise timeline; observed reconnect marker; stronger output and compact diagnostics/provenance |
| `src/app/components/live-visualizations.tsx` | Larger coordinate fit, raw-Z opacity, finite receipt-driven history decay, cached structural canvas and glow sprite; improved chart geometry and latest-point emphasis |
| `src/app/components/live-session.module.css` | Rebuilt three-zone desktop composition, type hierarchy, panel surfaces, chart/observer scale, waiting and snapshot treatment, responsive stacking |
| `src/app/globals.css` | Live Session only: quieter navigation/source surfaces and compact shell/footer spacing |
| `docs/SPRINT_5_3_REVIEW.md` | This report, field mapping and visual scorecard |
| `docs/review/sprint-5-3/*` | Final screenshots and retained first/second-pass captures |

No simulation, FruitFly XR source, telemetry protocol, scientific helper/contract, data architecture, Meta integration, Compare, AI Scientist or Evidence implementation was changed. The existing disabled live-telemetry Meta control remains disabled, explicitly on demand and unavailable; there are no automatic provider calls.

## Visual architecture

The content workspace is approximately **46% anatomy / 28% analytics / 24% observer**, plus gutters, with navigation separate. The header leads with a large cyan/green LIVE, amber LAST SNAPSHOT, outlined neutral WAITING or red ERROR. Transport remains separately visible. Model time, tick, sequence and health align alongside session identity.

The hero uses the verified raw X/Y geometry at uniform scale, fitted to its actual coordinate bounds rather than the previous wide nominal canvas. Raw Z controls structural opacity; it does not assign anatomical orientation or physical distance. Current supplied spikes have crisp luminous centers; recent supplied events briefly decay. No synaptic lines or inferred paths are drawn. Anatomy is the default; ID raster remains available.

Two large cyan/magenta instrument readouts sit beside anatomy. Paths and fills join only contiguous received sequence/tick pairs. Current-tick guides and latest-point halos emphasize actual samples. Beneath them, the timeline distinguishes decoder changes, received ticks, input-reference changes and display/transport events. Decoder output and six compact diagnostics occupy the bottom row. The observer rail presents four direct facts, meaningful caveats, one deterministic suggestion and compact validated source identity.

At **1920×1080** and **1440×1080**, final measured document dimensions equal viewport dimensions: no page scrolling in either direction. At 390 px the panels stack without horizontal overflow. Existing source selection, connection controls, navigation and evidence inspection remain functional.

## Performance and animation

- Canvas renders 7,877 deterministically sampled structural points; all available coordinates remain available for exact event-ID lookup.
- Static geometry is painted into an offscreen canvas on receipt/resize; animation copies it and draws reusable glow sprites. No per-neuron DOM nodes or heavyweight dependency was added.
- Recent activity is limited to the last **four received frames**, inside the unchanged **120-frame** buffer. One reconnect marker is retained per mounted session view.
- A requestAnimationFrame loop runs only during a **1,400 ms receipt-driven transition**, then stops. Historical snapshots are static. Reduced-motion preference disables these transitions.
- Device pixel ratio is capped at 2. Canvas resize observers, animation callbacks and media listeners are cleaned up on teardown.
- Every highlighted point comes from an actual supplied `spikeEvents[].neuronId` with verified soma coordinates. Unknown IDs are omitted and mapped/supplied counts are disclosed. Brightness and fading are display choices, not firing-rate measurements.

## Exact data fields driving the presentation

| Visualization/readout | Verified inputs and display rule |
| --- | --- |
| Header and session identity | `telemetry.sessionId`, `simulationMs`, `neuralTick`, `sequence`; transport from `snapshot.state` |
| LIVE / LAST SNAPSHOT | Existing `sessionStatus`, using `snapshot.state`, `receivedAt` and browser clock; unchanged five-second freshness threshold |
| Receipt / latest-frame age | `receivedAt` and browser clock; explicitly wall-clock age, separate from model time |
| Anatomical structure | Existing validated static `points` tuples `[neuronId, rawX, rawY, rawZ]`, count, dataset/hash and coordinate semantics; uniform raw X/Y projection, Z only for opacity |
| Current highlights | Latest received `spikeEvents[].neuronId`, matched to static coordinate IDs; no extrapolation to unsupplied neurons |
| Recent highlights | The same supplied IDs from at most four buffered received frames; `receivedAt` determines finite display decay, `sequence` identifies the latest frame |
| Hero footer and mapping | `displaySpikeEvents`, static `anatomy.count`, matched unique supplied IDs and deterministic structural sample count |
| Secondary ID raster | Existing `activityRaster`: `spikeEvents[].neuronId`, `spikeTimeMs`, `simulationMs`, `sequence`; existing 64-ID/24-frame categorical window |
| Cyan spike chart | `totalSpikeEvents` by `neuralTick`, over actual buffered frames |
| Magenta active chart | `activeNeuronCount` by `neuralTick`; existing caveat about subthreshold/refractory/pending-input states retained |
| Chart gaps | `sequence` and `neuralTick`; no connection across missing sequence/tick values and no synthesized samples |
| Timeline simulation events | `sessionTimeline(frames)`, `sequence`, `neuralTick`, `simulationMs`, `motorMode`, `inputSequence`; changes compare actual adjacent buffered frames, even when sequence values have gaps |
| Timeline transport/status events | Observed disconnected-to-connected transition with existing browser-clock `now`; retained as one bounded reconnect marker. Stream-inactive marker comes from display freshness/connection state and uses actual last receipt UTC, never an invented model stop time |
| Simulation output | Latest exact `motorMode`, with previous differing buffered `motorMode` for an observed transition; no claim of physical movement |
| Stream health | `sequence`, `receivedAt`, `droppedDisplayFrames`, `droppedSubscriberMessages`, `inputSequence`, `inputFresh`, `displayTruncated`, `displaySpikeEvents`, `totalSpikeEvents` |
| Observer's four facts | Latest `totalSpikeEvents`, `activeNeuronCount`, `motorMode`, `displaySpikeEvents / totalSpikeEvents` |
| Observer notes and suggestion | Deterministic branches on retained-snapshot status, truncation, input-reference availability/freshness and reported drops |
| Source provenance | Existing `provenance.dataset`, `neurons`, `edges`; published structure and simulated dynamics remain explicit |

**No unsupported metrics were added.** No living-fly recordings, camera/XR video, physical velocity, heading, trajectories, measured escape, biological Hz, retinal video, looming values, experimental replicates or error bars are presented. ESCAPE is a simulation motor-decoder state only.

## Validation

All required checks passed:

- `npm test` — **160/160**, no removed or weakened tests.
- `npm run experiment:demo` — passed.
- `npm run experiment:ai-demo -- --fake` — passed, **FAKE META CLIENT**.
- `npm run lint` — passed.
- `npm run build` — passed, Next.js 16.4.3.
- `git diff --check` — passed (Git emits existing LF/CRLF normalization notices).

Real manual/browser validation used installed Playwright and Edge headless, CSS viewport 1920×1080, scale factor 1, the existing `ws://127.0.0.1:8766/observatory/v1` bridge and unchanged harness:

```powershell
dotnet C:\Users\Jason\Documents\GitHub\fruitfly-xr\tests\BrainClient\bin\Debug\net10.0\BrainClient.dll ws://127.0.0.1:8765/brain/v1
```

Verified **WAITING FOR DATA → LIVE → LAST SNAPSHOT**, no waiting-state charts/canvas, Anatomy/ID raster switching, retained session identity through disconnect/reconnect, the observed reconnect marker, Evidence navigation and return, and 1440/mobile widths. The final run received four real frames. An offline join of supplied IDs against the static asset independently matched the canvas's **476** current mapped IDs. Pixel comparison confirmed the retained canvas stayed identical after telemetry stopped: no random or decorative firing. Zero browser errors and zero unexpected requests were observed.

BrainClient exited **0**, reporting `PASS 59 experimental trial checks`, `PASS 59 deterministic 005A.2 trial checks`, `PASS 19 domain checks`, `PASS 21 total domain checks with stabilization diagnostics`, and `PASS C# socket + physical-distance proxy + real connectome + command gate`. Its existing synthetic proxy input drives the real connectome-backed simulation; these are not living-fly measurements. FruitFly XR Git status was clean before and after review.

Separate forced-fake browser regression passed **Observatory experiment → Compare → Live Session → preserved Compare → AI Scientist → Evidence**. No live Meta API calls were made.

Final captured session: `1eb6ef92-5ac5-45ee-a823-a32390ef4535`, sequence/tick **4**, model time **200 ms**, **3,314** reported simulated spike events, **59,294** active simulated neurons, **512** supplied events, decoder **ESCAPE**, fresh input reference **3**, producer drop counters **0**. Of **478** unique supplied spiking IDs, **476** had verified coordinates. Receipt: **2026-10-28 03:29:29.265 UTC** (October 27 in Toronto). These values document this run and are never hard-coded in the UI.

## Visual self-score

Subjective assessment after final reference comparison; human visual approval remains the review step.

| Category | Score / 10 |
| --- | ---: |
| Reference resemblance | 8 |
| Visual hierarchy | 9 |
| Scientific readability | 9 |
| Hero visualization | 9 |
| Chart quality | 8 |
| Observer rail | 9 |
| Information density | 9 |
| Typography | 9 |
| Live-state clarity | 9 |
| Scientific integrity | **10** |

## Remaining differences from the reference

- Verified soma point geometry replaces the reference's XR fly preview and translucent brain mesh. Available structure supports coordinates, not a rendered anatomical surface or causal paths.
- Real count-per-tick charts replace fabricated named-neuron Hz traces and movement charts. The short real harness run supplies four samples, so its trace is sparse rather than a rich continuous recording.
- Local deterministic facts replace continuous AI narration. Analyze with Meta remains unavailable for this stream, matching the existing integration.
- Actual frame/input/decoder events replace unsupported stimulus onset, pathway recruitment and physical escape events.
- Existing CausalFly navigation and branding remain; shell treatment is quieter but is not an imitation of the mockup's illustrated fly logo.

All changes remain uncommitted. Review the captures and local app before accepting the visual direction.
