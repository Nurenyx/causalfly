# Sprint 10B — High-fidelity embodiment and connectome camera

October 29, 2026 · `feat/sprint-10b-high-fidelity-embodiment`

**Implemented for human visual review. NO COMMIT MADE.** Offline production preview: http://127.0.0.1:3132. No deployment, credential use, paid/live Muse/SAM request, or external brain connection. FruitFly XR remains read-only and its working tree is clean.

## Source and attribution

The anatomical mesh was **not authored from scratch by CausalFly or FruitFly XR**. Exact upstream credit from the existing source lock:

> FlyBody model by the FlyBody contributors, developed by Google DeepMind and HHMI Janelia Research Campus; Vaxenburg et al., Nature 643, 1312-1320 (2025), doi:10.1038/s41586-025-09029-4.

Upstream: `https://github.com/TuragaLab/flybody`, pinned commit `d015e9bfe441bd90ae431bac24c55cb74bdbce26`; anatomical file `flybody/fruitfly/assets/blender_model/drosophila.blend`; SHA-256 `88c13449572924557ee77e3da2a318643b8a987ac1c7a60b77ed164faa29bead`.

Immediate read-only source: `C:/Users/Jason/Documents/GitHub/fruitfly-xr/clients/quest3/Assets/FruitFlyXR/Art/FlyV2/Runtime/FlyVisualV2_LOD1.fbx`, SHA-256 `d0ba405c0dc91a7256782cdf9cb4bd2a21982cbe2a96b218afa78481f886927b`. FruitFly XR checkout: `32fa70e425fedaf50957bf72eb3d432f1bb52319`.

`LICENSE-FlyBody.txt`, the complete original `build-report.json` (delivered as `source-build-report.json`), and `source-lock.json` were read before conversion and copied **byte-for-byte**, not rewritten. The full upstream Apache-2.0 license hash is checked against the source lock. This model license is distinct from the publication and the separate, unacquired Figshare datasets. No endorsement is implied.

**The underlying FlyBody anatomical mesh and the existing FruitFly XR FlyV2 derivative predate the hackathon. Only CausalFly's web conversion and integration were performed during the hackathon.** The original build used Blender **5.2.1 LTS**, preserved source anatomical geometry without added anatomical vertices, and records **`source_sex: female` / `male_modifications: []`**. Existing runtime LODs already reduce that geometry; this sprint applies no further decimation.

The visual mesh is **not a sex-matched male anatomical model**. When connected to FruitFly XR, the neural source is published male CNS structure with simulated dynamics. The cockpit's controlled experiments use a separate deterministic synthetic network. The visible fly contains no inferred neural anatomy. Wild-type-inspired PBR is an authored approximation, **not measured biological optical/material data**. These facts appear in the measurement/provenance disclosure, notices and manifests, without adding hero copy.

## Conversion and delivered asset

`scripts/convert-flyv2-web.py` uses installed Blender 5.2.1 LTS: factory-empty scene → FBX import → compatible glTF PBR reconstruction → binary glTF export. It validates the source sex/hash/lock before export, restricts output to CausalFly, reads the source repository only, and records source hashes and metrics. Example:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python-exit-code 1 --python scripts/convert-flyv2-web.py -- --source 'C:\Users\Jason\Documents\GitHub\fruitfly-xr\clients\quest3\Assets\FruitFlyXR\Art\FlyV2' --output public/models/flyv2 --lod 1
```

| Metric | Delivered LOD1 | Comparison-only LOD0 |
| --- | ---: | ---: |
| GLB bytes | **4,194,788** (4.19 MB / 4.00 MiB) | 6,309,748 |
| Triangles | **55,567** | 121,434 |
| Source vertices | 29,127 | 62,119 |
| Exported vertices | **29,399** | 62,471 |
| Material primitives / base draw calls | 3 | 3 |
| glTF skin joints | 93 | 93 |

The source rig has 92 bones; FBX/glTF also exports its armature root as a joint. Vertex count increases at material/UV/normal seams; anatomical triangle count is unchanged. Compound eyes, six articulated legs, antennae, abdominal segments, wings/veins and halteres remain source geometry. No new anatomical vertices, altered silhouette or added decimation.

Delivered GLB SHA-256: `367319802010fa501df94692e70458c96fb0cf0f8b7d0b0edd242c4959264696`. No animation tracks, compression decoder, runtime CDN or new npm dependency. LOD0 comparison GLB stays in ignored `tmp/sprint-10b/lod0/`; it is not shipped.

All embedded maps are **1024×1024 PNG**:

| Embedded map | Encoded bytes | Use |
| --- | ---: | --- |
| FlyV2_BaseColor | 719,117 | Original color atlas for chitin/eyes |
| FlyV2_Normal | 968,405 | Restrained tangent normal response |
| FlyV2_Roughness | 611,912 | Repacked into glTF metallic/roughness G |

Unity MetallicSmoothness is redundant with the roughness atlas and is omitted; metallic stays zero. Three 1024² RGBA maps take approximately 16 MiB with full mip chains when decoded, before renderer/geometry overhead. This is an estimate, not a device-memory measurement.

FBX does not preserve the original custom Blender wing shader. The web version uses a neutral, double-sided, alpha-0.16 membrane and opaque original vein geometry, avoiding white diffuse plastic and an extra transmission render target. It remains an engineered optical approximation. Authored chitin and eye atlases are reused. Restrained warm key/cool fill/rim, a grounded shadow and the dark arena use the existing demand-rendered canvas; no bloom/postprocessing is added.

## LOD comparison and browser impact

Both LODs were rendered before final selection from **the same camera, light setup, materials, 1920×1080 viewport, 592.15625×346.1875 cockpit display area and DPR**. Canonical position `[4.8, 3.1, -3.6]`, target `[0, 0.55, -0.15]`, FOV 34°. Comparison captures were refreshed against the final production implementation:

- [LOD0 canonical cockpit render](review/sprint-10b/lod0-canonical-cockpit.png)
- [LOD1 canonical cockpit render](review/sprint-10b/lod1-canonical-cockpit.png)
- [Comparison metrics](review/sprint-10b/lod-comparison.json)

At actual cockpit display size the difference is negligible: both retain readable compound-eye surface, abdominal segmentation, thin limbs, antennae, wing outlines and veins. LOD0 adds fine tessellation most apparent only when magnified; it does not materially improve this view. **Choose LOD1:** 2,114,960 fewer bytes (**33.5%**) and **54.2% fewer triangles**. This is a visual judgment supported by the paired images, not an assertion that the geometries are identical.

Headless Edge used **ANGLE Vulkan SwiftShader**, a software renderer. With identical local route fulfillment for both files, observed asset resource durations were LOD0 **164.2 ms**, LOD1 **117.4 ms**. These are single local samples, not internet download predictions. Both rendered all 40 scripted orbit move steps, with first draw about **12.6 ms** after the input sequence started; total automation times were 4,074.6 ms / 2,684.0 ms respectively. Input is paced by automation; these are **not FPS measurements**. LOD1 felt responsive in this environment and completed without normal-path runtime errors. No hardware-mobile performance claim is made.

Loading is deferred to the world view. The procedural fly appears while pending; the GLB replaces it on success. The loader caches one GLB request, and skeleton-aware clones keep compare conditions independent without re-downloading or mutating shared materials/geometries. Rendering remains on demand, DPR capped at 1.75, with finite pose easing. Browser acceptance confirmed the request count remains one through run, playback and comparison.

## Integration and scientific behavior

The renderer derives orientation/scale and ground contact from actual model bounds: source -X forward / Z up becomes arena -Z forward / Y up, the longest horizontal span is normalized to 3.6 scene units, and the minimum Y sits just above the floor. The front three-quarter camera makes the eyes readable. Aspect-aware distance keeps the normalized fly inside narrow canvases. Orbit, zoom, reset, control/intervention rings, stimulus and recorded playback remain available.

Recorded output still maps only to visual lift (0.18 units), displacement (0.4), pitch (0.1 rad) and wing opening (0.08 rad), with the existing ground-ring indication. Wing controls use the source's engineered phi joints. No measurement is inferred from the mesh or pose; no experiment, engine, provider or telemetry-normalization code changed. The fixture experiment still measures **0.64 → 0.32 / 50% reduction**, with the intervention below threshold.

`Suspense` renders the procedural fly while loading. A local model error boundary retains that fly on HTTP failure or corrupt content; the existing outer canvas boundary still handles unavailable 3D. Tested a 3.5-second delayed load, 404, and invalid GLB. All kept a usable visual; the 404 case completed a new deterministic experiment and returned the expected **0.5** output. Failed-load diagnostics are expected: R3F's installed reconciler intentionally forwards **caught** errors through `reportError`, so the injected failures appear in browser error events even though the local boundary handles them. The test allowlists only the deliberately failed asset URL; unexpected errors are zero. [Fallback evidence](review/sprint-10b/fallback-validation.json).

The desktop cockpit retains its three regions. At 390px they stack; the model is interactable, actions remain reachable, and no horizontal page overflow occurs. Mobile world labels/hints and provenance text were enlarged. The long mobile workflow intentionally scrolls vertically.

## Live Connectome centering

The prior fixed camera position and origin target did not account for structure/FOV/aspect. The new helper computes a bounding box from the **unchanged existing render buffer derived from published soma coordinates**. Its center becomes the OrbitControls target. The eight corners are projected into the canonical camera basis; camera distance fits both horizontal and vertical FOV with a **12% margin**. The bounding sphere supplies scale and clipping/zoom limits. No arbitrary positional correction is added.

Fit and controls initialization run in layout effects. The same deterministic operation runs on initial source load, structural-buffer replacement, explicit reset, and canvas resize. It clears pending damping, sets camera/target/clipping, updates projection and saves canonical state. Geometry bounds are memoized by structural buffer, independent of telemetry and receipt-age updates. Point depth shading now follows the bounds rather than the old camera-distance constant.

Tests verified all corners remain inside the frustum across desktop and narrow/mobile aspects, including offset and degenerate data, without changing input coordinates. Production browser checks covered disconnected first load, orbit → recorded telemetry arrival **without camera movement**, exact reset, resize/reset at 1440 and 390, and source unmount/reload back to the same canonical fit. All 141,781 structural points remain unchanged; no soma coordinate, lookup or activity semantics changed.

## Validation

Only fake Meta, the offline SAM geometry fixture and genuine **recorded** FruitFly XR telemetry replay were used. Browser traffic outside loopback was blocked; source SSE was fulfilled locally. Server shells explicitly selected fake Meta and blank provider keys. **Zero live Muse calls, zero live SAM calls, zero external brain connections.** No credentials were used.

| Check | Result |
| --- | --- |
| Final targeted camera, binary/provenance, embodiment, connectome tests | **17 passed** |
| Full `npm test`, executed **once** | 275/275 library + 43/44 component passed initially; one disclosure-label regression |
| Correction / affected component recheck | Restored established “Show how we measured this” label; **8/8 passed**; full suite deliberately not repeated |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed, no findings |
| `npm run build` | Passed, including final mobile-typography revision |
| Production browser acceptance | **68 passed**, widths 1920/1440/390; zero normal-path runtime errors or external browser requests |
| Slow / 404 / corrupt GLB | Passed; expected asset diagnostics only |
| Canonical LOD comparison | Both loaded and rendered without errors |
| `git diff --check` | Passed |
| Source repository | Clean; no changes |

The two binary/provenance tests were added after the single full-suite run and passed in the final targeted run. No failed test remains unaddressed. Raw command logs and browser harnesses are in ignored `tmp/sprint-10b/`; distributable browser/comparison/fallback results are in `docs/review/sprint-10b/`.

## Screenshots

1. [Initial cockpit — 1920](review/sprint-10b/01-initial-cockpit-1920.png)
2. [Completed experiment — 1920](review/sprint-10b/02-completed-experiment-1920.png)
3. [Completed experiment — 1440](review/sprint-10b/03-completed-experiment-1440.png)
4. [Live Connectome centered / disconnected structure](review/sprint-10b/04-live-connectome-centered.png)
5. [Mobile cockpit — 390](review/sprint-10b/05-mobile-cockpit.png)
6. [Mobile fly and controls — 390](review/sprint-10b/06-mobile-model-controls.png)
7. [Connectome with recorded telemetry / canonical reset](review/sprint-10b/07-connectome-recorded-telemetry.png)
8. [Deliberately missing GLB / procedural fallback](review/sprint-10b/08-procedural-fallback.png)

The connected capture is explicitly labeled recorded/offline replay. It is not a new live simulation session. The mobile overview and scrolled world capture together show the stacked cockpit and model interaction area.

## Exact file inventory

Modified tracked files:

- `THIRD_PARTY_NOTICES.md`
- `docs/HACKATHON-DISCLOSURE.md`
- `src/app/components/connectome-3d.tsx`
- `src/app/components/embodied-experiment.tsx`
- `src/app/components/embodied-world.tsx`
- `src/app/components/research-cockpit.css`

New source/review files:

- `scripts/convert-flyv2-web.py`
- `src/app/components/high-fidelity-fly.tsx`
- `src/lib/web/camera-framing.ts`
- `src/lib/web/camera-framing.test.ts`
- `src/lib/web/flyv2-asset.test.ts`
- `docs/SPRINT_10B_HIGH_FIDELITY_EMBODIMENT_REVIEW.md`

New delivered asset files, all under `public/models/flyv2/`:

- `FlyVisualV2_Web.glb`
- `LICENSE-FlyBody.txt`
- `NOTICE.txt`
- `source-build-report.json`
- `source-lock.json`
- `web-build.json`

New evidence files, all under `docs/review/sprint-10b/`:

- `01-initial-cockpit-1920.png`
- `02-completed-experiment-1920.png`
- `03-completed-experiment-1440.png`
- `04-live-connectome-centered.png`
- `05-mobile-cockpit.png`
- `06-mobile-model-controls.png`
- `07-connectome-recorded-telemetry.png`
- `08-procedural-fallback.png`
- `lod0-canonical-cockpit.png`
- `lod1-canonical-cockpit.png`
- `browser-validation.json`
- `fallback-validation.json`
- `lod-comparison.json`

No package/lockfile, experiment implementation, source anatomy JSON or procedural fallback source was changed. Scratch conversions, harnesses and logs remain ignored, outside this deliverable inventory.

## Top three remaining weaknesses

1. **Materials:** glTF alpha/PBR approximates the original custom wing shader; fine thin-film highlights and bristle shading still fall short of the authored Blender/Quest presentation. Neither version is measured optical data.
2. **Motion:** the source anatomy/rig is retained, but this integration uses a standing pose plus restrained output-mapped lift/pitch/wing opening. It is not a gait/flight animation or a biomechanical simulation.
3. **Device evidence and delivery:** the 4.19 MB GLB is conservative relative to LOD0 but still has a mobile cold-load cost. Headless SwiftShader and responsive viewport tests do not substitute for physical phone/browser GPU profiling; compression could be a later measured tradeoff.

## Git diff --stat

The command below reports tracked modifications only; the new files listed above remain untracked and unstaged. Nothing was committed or staged for this review.

```text
 THIRD_PARTY_NOTICES.md                     | 16 +++++++++-
 docs/HACKATHON-DISCLOSURE.md               |  4 +++
 src/app/components/connectome-3d.tsx       | 49 +++++++++++++++++++-----------
 src/app/components/embodied-experiment.tsx |  2 +-
 src/app/components/embodied-world.tsx      | 31 +++++++++++--------
 src/app/components/research-cockpit.css    |  8 +++++
 6 files changed, 78 insertions(+), 32 deletions(-)
```

**NO COMMIT MADE. Stop for human visual review.**

## Sprint 10B.1 — Final embodiment release polish

Continued directly from the approved, uncommitted Sprint 10B tree. No reset, stash, restore, discard, staging or commit. Preview: http://127.0.0.1:3132.

- **Fly visibility:** conservatively raised existing ambient/hemisphere/key/fill/rim intensities from 0.65/1.6/4/22/12 to 0.85/2/4.5/30/14. Eyes, thorax/abdomen and wing silhouettes read more clearly. Original light colors, materials, roughness, geometry and LOD1 are unchanged; no bloom or exposure effect was added. GLB remains byte-identical at the SHA-256 recorded above.
- **Connectome prominence:** retained the exact mathematical center, projected-corner fitting, FOV/aspect handling and canonical reset architecture. Fit multiplier is now 1.02 instead of 1.12: about **9.8% larger limiting projected extent**, with every box corner still inside the frustum and a positive 2% fit allowance. Initial load, reset, resize, source reload and recorded telemetry arrival remain consistent; no offsets or soma changes.
- **Validation wording:** cockpit readout, controlled-model boundary and trust disclosure now say **REAL-FLY VALIDATION — Not established**. Synthetic engineering-fixture wording is retained. Live Connectome's published biological structure / simulated dynamics / non-recording distinction is unchanged; it does not establish real-fly behavioral validation.
- **Final validation supersedes the initial Sprint 10B full-suite result above:** the **entire complete suite passed after all corrections: 322/322 tests (278 library + 44 component), zero failures**. Targeted checks also passed (18 library + 11 component). Standalone TypeScript, lint, production build and `git diff --check` passed. Production browser review passed **19 checks**, including unchanged center, canonical reset/resize/source reload, telemetry preserving the orbited view, revised wording and no runtime errors. **Zero live provider calls or external browser requests.** Raw results: ignored `tmp/sprint-10b1/`.

Exactly two new screenshots were captured; previous Sprint 10B screenshots were left untouched:

1. [1920 initial cockpit / final FlyV2 lighting](review/sprint-10b1/01-initial-cockpit-1920.png)
2. [Live Connectome / final canonical fit](review/sprint-10b1/02-connectome-canonical-fit-1920.png)

Files changed in **10B.1 only**:

- `src/app/components/embodied-world.tsx`
- `src/lib/web/camera-framing.ts`
- `src/lib/web/camera-framing.test.ts`
- `src/app/components/research-cockpit.tsx`
- `src/app/components/guided-experiment.tsx`
- `src/app/components/guided-experiment.test.tsx`
- `src/app/components/experiment-trust.tsx`
- `src/app/components/experiment-trust.test.tsx`
- `docs/SPRINT_10B_HIGH_FIDELITY_EMBODIMENT_REVIEW.md`
- `docs/review/sprint-10b1/01-initial-cockpit-1920.png`
- `docs/review/sprint-10b1/02-connectome-canonical-fit-1920.png`

Cumulative `git diff --stat` now reports **11 tracked files, 86 insertions, 37 deletions**; existing/new untracked Sprint 10B assets, helpers, review and captures are omitted by that command. Nothing is staged. **NO COMMIT MADE.**
