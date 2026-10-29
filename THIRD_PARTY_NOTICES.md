# Third-party notices

## Published male CNS anatomy data

Asset: `public/anatomy/male-cns-v1.json`.

Dataset: **neuPrint `male-cns:v1.0`**, adult male Drosophila CNS structure. Credit: **FlyEM Project Team (HHMI Janelia Research Campus), Drosophila Connectomics Group (University of Cambridge / MRC LMB), and Google Research Connectomics**. No endorsement is implied.

Sources: [MaleCNS project](https://male-cns.janelia.org/), [dataset downloads](https://male-cns.janelia.org/download/), [neuPrint](https://neuprint.janelia.org/?dataset=male-cns%3Av1.0).

Data license: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). This data is separately licensed from CausalFly's Apache-2.0 code.

### Provenance and changes

The existing CausalFly asset was captured at `2026-10-28T02:32:13.711Z` by `scripts/capture-fruitfly-anatomy.ts`, using FruitFly XR's read-only research scaffold. It contains 141,781 `[neuronId, rawX, rawY, rawZ]` records and omits neurons without supplied soma coordinates. Records are serialized as JSON with source identity and capture metadata; the capture script does not alter coordinates. Display code separately centers/scales/rotates points for rendering; display units do not establish physical scale or anatomical orientation.

The source graph artifact is `malecns-v1.0.flyb.gz`, SHA-256 `e33df182bed7a6f3ea279daf4790a82b05706d3d41e819a6a80c0473e8c559f3`. This identifies the upstream graph, **not the JSON asset's own hash**. The graph was derived by [fly-brain-minecraft](https://github.com/blendi-remade/fly-brain-minecraft) at pinned revision `6cfa30175003ef25da68a237d5eda958f8047b82`. Upstream processing thresholded connections at five synapses, removed autapses, re-indexed neurons, assigned transmitter signs, and assigned photoreceptors to medulla columns. Those graph transformations do not turn soma coordinates into measured dynamics; CausalFly's asset contains no graph edges or physiological recordings.

This notice records the existing public-data lineage. No proprietary FruitFly XR code/assets, upstream engine code, or graph binary are added to CausalFly in this release. The optional external brain server remains separate. See [hackathon disclosure](docs/HACKATHON-DISCLOSURE.md) and [verified bridge](docs/FRUITFLY-XR-BRIDGE.md).

## Calibration media and dependencies

`public/perception-calibration.mp4` is project-generated red-square calibration media, retained for the reproducible demo; it is not third-party footage or a living-fly recording.

Dependencies retain their own license notices in their packages. The lockfile records exact dependency versions. This notice does not relicense dependency code or Meta's hosted models.

### Dependency license boundaries

The installed `@meta-sam/parser` and `@meta-sam/react` packages include the **Meta SAM License** in their `LICENSE` files; they are not covered by CausalFly's Apache-2.0 license. `mediabunny` declares **MPL-2.0**. The installed Next.js, React, Three.js, React Three Fiber, Zod, and server-only packages declare MIT; the OpenAI SDK declares Apache-2.0. Consult each installed package's complete notices for distribution. No dependency source or model weights are copied into this repository by this release.
