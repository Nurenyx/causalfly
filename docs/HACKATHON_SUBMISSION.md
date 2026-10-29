# Hackathon submission — candidate copy

## Project title

**CausalFly — From AI Question to Measured Evidence**

## One-line description

An AI-powered causal experiment workbench that connects Meta perception and reasoning to controlled synthetic experiments, measured evidence, and an inspectable next test.

## Problem

AI can propose a convincing explanation without showing what an intervention actually changed. Experimental workflows need matched controls, independent measurements, and a clear record separating evidence from interpretation.

## Solution

CausalFly guides a user through **Ask → Perceive → Design → Run → Measure → Understand → Test again**. A question becomes a validated proposal, explicit approval triggers matched control/intervention trials, and the workbench exposes results before requesting AI interpretation. Video perception can supply a deterministically derived stimulus. An optional Live Connectome view presents published CNS structure with simulated telemetry at a different scale.

## How Meta AI is used

**Meta Muse** proposes the experiment, interprets engine-measured evidence, and recommends the next test. The supplied configuration uses `muse-wonder-1.0`. **Meta SAM 3.1** (`sam-3.1`) supplies object segmentation/tracking from short video. CausalFly uses the official SAM parser/player packages and computes the stimulus from returned geometry.

Meta provides design, perception, and interpretation. CausalFly validates the output, derives input, executes trials, owns measurements, and preserves evidence/provenance. Requests are explicit; accepted live results and offline templates are labelled separately. The calibration video is generated red-square media, not recorded real-world footage.

## Technical architecture

A Next.js / React workbench calls TypeScript server routes. A deterministic synthetic engine executes a small two-pathway network with a supported silencing intervention. Strict schemas validate model proposals and analyses. The Meta API is reached through a server-only OpenAI-compatible SDK transport; credentials never enter browser contracts. SAM geometry passes through a deterministic box-expansion mapping before input acceptance. Three.js renders synthetic web embodiment and published anatomy. Process-local retained evidence and a bounded flight recorder support Experiment Trust and JSON diagnostics.

FruitFly XR is an optional read-only local WebSocket research source bridged to the browser; it is separate from the synthetic controlled experiment. A running external session is required for new telemetry.

## What was built during the hackathon

The CausalFly repository; synthetic causal engine/workflows; Meta Muse integration; Meta SAM perception pipeline; deterministic stimulus derivation; web embodiment; guided experiment flow; flight recorder/trust layer; evidence/provenance surfaces; CausalFly-side observational adapter; and judge-facing experience/documentation.

**Pre-existing:** FruitFly XR / ConnectomeXR proprietary work, brain server, Quest embodiment, and published-connectome integration. Those are not claimed as event work. No proprietary source, Git history, or XR art assets are included. Existing published anatomy data has separate attribution. [Full disclosure](HACKATHON-DISCLOSURE.md)

## Scientific integrity / trust boundary

**AI proposes and interprets. CausalFly measures.** Both synthetic conditions use matched inputs/parameters; only the approved intervention differs. AI prose cannot overwrite engine-issued measurements. Perception geometry is input provenance, not causal evidence. Trust checks and an exported manifest/event ledger make the path inspectable, but hashes are not signatures and retained replay inputs are not proof of independent replay.

The synthetic fixture is not a biological model; its results are not Drosophila findings. Live Connectome combines published structure and simulated dynamics, not living-fly recordings or controlled biological evidence. Biological validation is not established. Model-response validation cannot guarantee scientifically correct prose.

## Impact

The prototype demonstrates how an AI-assisted experiment can expose its controls, measurements, limitations, and provenance in one reviewable workflow. It offers a concrete basis for discussing reliable experimental AI without treating generated explanations as measurements. Broader research or educational impact remains a goal, not an evaluated outcome.

## Future vision

Extend the same evidence boundary to richer connectome simulation, XR embodiment, robotics, and broader experimental systems. These are future directions, not capabilities delivered by this release. Durable evidence storage, authentication, and stronger replay verification would be needed beyond the local prototype.

## GitHub / open-source disclosure

Repository candidate: [Nurenyx/causalfly](https://github.com/Nurenyx/causalfly). Release branch: `release/meta-hackathon-2026`. Verify public judge access before submitting; this release makes no remote visibility changes and creates no commit/tag.

CausalFly code is [Apache-2.0](../LICENSE). Bundled published anatomy data remains CC BY 4.0 with [separate attribution](../THIRD_PARTY_NOTICES.md). Dependency licenses remain in their packages; Meta's hosted models and the separate proprietary FruitFly XR system are not relicensed by this repository.

## Demo references

[Operational runbook](DEMO_RUNBOOK.md) · [Video script, under three minutes](DEMO_SCRIPT.md) · [Release review](SPRINT_9_RELEASE_REVIEW.md)

Candidate copy only: no competition rules, eligibility decisions, or judging criteria are inferred here. Confirm current submission requirements and access in the organizer's portal before sending.
