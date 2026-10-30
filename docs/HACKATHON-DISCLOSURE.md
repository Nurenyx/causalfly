# Hackathon disclosure

CausalFly is a new repository created during the Meta Global AI Developer Hackathon, beginning October 26, 2026. The submission combines new CausalFly work with an optional connection to separately developed systems and attributed published data.

## Pre-hackathon work

Nurenyx previously developed **FruitFly XR / ConnectomeXR**, a separate proprietary research prototype, including:

- the brain server and connectome-backed simulation;
- Quest / Unity embodiment;
- the published-connectome integration and its upstream data/engine dependencies.

These systems were not built during this event. They are not part of the CausalFly open-source code license. No FruitFly XR source code or Git history is included in CausalFly; no proprietary code or assets are copied into this release.

## Built during the hackathon

- CausalFly repository and synthetic deterministic causal engine/workflows.
- Meta Muse experiment design, evidence interpretation, and next-test proposal integration.
- Meta SAM 3.1 short-video perception pipeline and deterministic geometry-to-stimulus mapping.
- Browser-based embodiment and network playback for the synthetic experiment.
- Guided question → perception → design → approval → measurement → interpretation flow.
- Flight recorder, Experiment Trust, diagnostic export, and evidence/provenance surfaces.
- Judge-facing experience, documentation, and read-only CausalFly adapter/view for the existing FruitFly XR research stream.

These integrations use existing frameworks, SDKs, models, and published data. The submission does not claim to have created Meta's models or the underlying biological connectome.

## Published data and optional integration

`public/anatomy/male-cns-v1.json` is an existing export of **141,781 public soma-coordinate records** from `male-cns:v1.0`, captured through the local research stream during CausalFly development. It is published structural data, not a proprietary XR art asset or living-fly recording. Dataset creators, source links, license, export transformations, and source artifact identity are recorded in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

CausalFly's controlled trials use a separate hand-authored synthetic network. Live Connectome can display published structure without a running external service; moving neural telemetry requires the optional FruitFly XR server and an external trial client. The adapter is observational and sends no interventions. [Bridge protocol](FRUITFLY-XR-BRIDGE.md)

## Scientific and AI disclosure

**AI proposes and interprets. CausalFly measures.** Meta Muse output is validated and kept separate from engine evidence. Meta SAM supplies perception geometry; CausalFly deterministically derives the stimulus. Fake Muse templates and offline geometry fixtures are labelled and must not be presented as live Meta output. The bundled red-square video is generated calibration media, not real-world footage.

Synthetic measurements are engineering demonstrations, not biological findings. Published CNS structure plus simulated dynamics does not establish biological validation or a causal effect in a living fly. Diagnostic hashes identify snapshots; they are not signed attestations or proof of independent replay.

## Repository scope

CausalFly code is [Apache-2.0](../LICENSE). Published anatomy data remains CC BY 4.0, and dependencies retain their licenses. FruitFly XR / ConnectomeXR remains separate proprietary work with its own third-party notices. This release makes no changes to that repository, deploys no service, and adds no Quest streaming.

## Sprint 10B visual asset disclosure

The high-fidelity fly is a hackathon-created **web derivative/integration**, not newly authored anatomical mesh. Original FlyBody anatomy by the FlyBody contributors (Google DeepMind / HHMI Janelia; Vaxenburg et al., 2025), and the existing FruitFly XR FlyV2 derivative, predate the hackathon. The pinned source, full Apache-2.0 license, original provenance records and explicit web modifications are retained in [third-party notices](../THIRD_PARTY_NOTICES.md) and `public/models/flyv2/`. Female anatomical source; `male_modifications = []`; not sex-matched to the observational male CNS connectome. PBR appearance is authored, not measured optical/material data. FruitFly XR remains read-only. See [Sprint 10B review](SPRINT_10B_HIGH_FIDELITY_EMBODIMENT_REVIEW.md).
