# Third-party notices

## Published male CNS anatomy data

Asset: `public/anatomy/male-cns-v1.json`.

Dataset: **neuPrint `male-cns:v1.0`**, adult male Drosophila CNS structure. Credit: **FlyEM Project Team (HHMI Janelia Research Campus), Drosophila Connectomics Group (University of Cambridge / MRC LMB), and Google Research Connectomics**. No endorsement is implied.

Sources: [MaleCNS project](https://male-cns.janelia.org/), [dataset downloads](https://male-cns.janelia.org/download/), [neuPrint](https://neuprint.janelia.org/?dataset=male-cns%3Av1.0).

Data license: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). This data is separately licensed from CausalFly's Apache-2.0 code.

### Provenance and changes

The existing CausalFly asset was captured at `2026-10-28T02:32:13.711Z` by `scripts/capture-fruitfly-anatomy.ts`, using FruitFly XR's read-only research scaffold. It contains 141,781 `[neuronId, rawX, rawY, rawZ]` records and omits neurons without supplied soma coordinates. Records are serialized as JSON with source identity and capture metadata; the capture script does not alter coordinates. Display code separately centers/scales/rotates points for rendering; display units do not establish physical scale or anatomical orientation.

The source graph artifact is `malecns-v1.0.flyb.gz`, SHA-256 `e33df182bed7a6f3ea279daf4790a82b05706d3d41e819a6a80c0473e8c559f3`. This identifies the upstream graph, **not the JSON asset's own hash**. The graph was derived by [fly-brain-minecraft](https://github.com/blendi-remade/fly-brain-minecraft) at pinned revision `6cfa30175003ef25da68a237d5eda958f8047b82`. Upstream processing thresholded connections at five synapses, removed autapses, re-indexed neurons, assigned transmitter signs, and assigned photoreceptors to medulla columns. Those graph transformations do not turn soma coordinates into measured dynamics; CausalFly's asset contains no graph edges or physiological recordings.

This notice records the existing public-data lineage. No upstream engine code or graph binary is added to CausalFly. The separately attributed Sprint 10B visual derivative below is the only imported FruitFly XR asset in this sprint. The optional external brain server remains separate. See [hackathon disclosure](docs/HACKATHON-DISCLOSURE.md) and [verified bridge](docs/FRUITFLY-XR-BRIDGE.md).

## FlyBody / FruitFly XR FlyV2 web derivative — Sprint 10B

Asset: `public/models/flyv2/FlyVisualV2_Web.glb`. **The underlying anatomical mesh was not authored from scratch by CausalFly or FruitFly XR.**

FlyBody model by the FlyBody contributors, developed by Google DeepMind and HHMI Janelia Research Campus; Vaxenburg et al., Nature 643, 1312-1320 (2025), doi:10.1038/s41586-025-09029-4. No endorsement is implied.

The pinned upstream source is [TuragaLab/flybody](https://github.com/TuragaLab/flybody/tree/d015e9bfe441bd90ae431bac24c55cb74bdbce26), commit `d015e9bfe441bd90ae431bac24c55cb74bdbce26`, `flybody/fruitfly/assets/blender_model/drosophila.blend`, SHA-256 `88c13449572924557ee77e3da2a318643b8a987ac1c7a60b77ed164faa29bead`. The original [source lock](public/models/flyv2/source-lock.json) and [build report](public/models/flyv2/source-build-report.json) are preserved verbatim. The included [LICENSE-FlyBody.txt](public/models/flyv2/LICENSE-FlyBody.txt) is the full upstream Apache-2.0 license; it applies to the pinned model, separately from publication and unacquired Figshare datasets.

The immediate source is the pre-existing FruitFly XR `clients/quest3/Assets/FruitFlyXR/Art/FlyV2/Runtime/FlyVisualV2_LOD1.fbx`, from checkout `32fa70e425fedaf50957bf72eb3d432f1bb52319`. **Both the original FlyBody anatomy and the FruitFly XR FlyV2 derivative predate the hackathon.** Only CausalFly's web conversion/integration was performed during the hackathon (October 29, 2026). FruitFly XR was read-only.

Source sex is **female**, `male_modifications = []`. Source anatomical geometry was preserved without added anatomical vertices by the original FlyV2 build; its runtime LODs are existing geometry reductions. This sprint retains the chosen LOD's anatomy, vein geometry and rig without additional decimation. The visual mesh is **not sex-matched** to the published male CNS connectome used by the separate observational source. Wild-type-inspired PBR appearance is authored, **not measured biological optical/material data**.

Web modifications: Blender 5.2.1 LTS FBX import and binary glTF export; compatible glTF PBR reconstruction from the existing BaseColor, Normal and Roughness atlases; neutral double-sided alpha-blended wing membrane with opaque original veins; redundant Unity MetallicSmoothness omitted; animation tracks omitted, rig retained. Runtime display uses uniform bounds normalization and a rigid orientation change. This is a visual embodiment, with no new anatomical geometry or inferred neural anatomy. Full hashes, metrics and conversion details: [web build manifest](public/models/flyv2/web-build.json), [modification notice](public/models/flyv2/NOTICE.txt), [Sprint 10B review](docs/SPRINT_10B_HIGH_FIDELITY_EMBODIMENT_REVIEW.md).

## Calibration media and dependencies

`public/perception-calibration.mp4` is project-generated red-square calibration media, retained for the reproducible demo; it is not third-party footage or a living-fly recording.

Dependencies retain their own license notices in their packages. The lockfile records exact dependency versions. This notice does not relicense dependency code or Meta's hosted models.

### Dependency license boundaries

The installed `@meta-sam/parser` and `@meta-sam/react` packages include the **Meta SAM License** in their `LICENSE` files; they are not covered by CausalFly's Apache-2.0 license. `mediabunny` declares **MPL-2.0**. The installed Next.js, React, Three.js, React Three Fiber, Zod, and server-only packages declare MIT; the OpenAI SDK declares Apache-2.0. Consult each installed package's complete notices for distribution. No dependency source or model weights are copied into this repository by this release.
