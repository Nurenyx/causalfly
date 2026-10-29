# Sprint 8B / 8B.1 review

## Objective

Make Meta SAM 3.1 part of the scientific loop: video → tracked geometry → deterministic stimulus → approved controlled experiment → measured result → separate Muse interpretation. Sprint 8B.1 corrects retention, recovery, and first-time usability without changing the stimulus formula or engine measurements.

## What was implemented

- Optional short MP4/MOV perception within Experiment; Synthetic remains the default. Explicit analysis, duplicate protection, official parser, returned masks/boxes, and frame-accurate playback.
- Successful perception collapses upload controls. **Change Video** reopens them; the original track stays attached to its analyzed file. Selecting `perception-calibration.mp4` prefills `red square`.
- One perceive-first action: **Design Experiment With This Stimulus**. It explicitly requests Muse design and creates a validated draft using CausalFly's fixed amplitude. Existing designs offer **Use as Experiment Stimulus**. Both stop at approval.
- Workspace-owned pending perception survives panel unmounts, stage navigation, rerenders, and assistant interaction. Server-signed, compressed receipts authenticate the returned record without relying on the short-lived lookup map. Process-global retention/signing state survives module reloads; receipts last 12 hours. A genuine process restart loses the signing key and requires explicit re-analysis and a new design. An expired draft can be designed again with verified input; earlier evidence stays inspectable. No claim of durable persistence or trust in client-edited geometry.
- A dismissible, assertive error rail stays visible at any scroll position. Layout reserves its measured height; the recovery control focuses the relevant section. Detailed source errors remain available after dismissal.
- Real-world progress shows Ask → Perceive → Design → Run → Understand. Measured results remain prominent; full analysis and provenance stay behind disclosures.

## Meta models used

SAM: `sam-3.1`, server-side Meta Responses and Files APIs. Muse: the existing server-configured `META_MODEL` for design, interpretation, and next-experiment proposals. Automated review uses FakeMetaClient and explicit offline SAM fixtures or intercepted mock responses.

## Perception → stimulus mapping

Unchanged `box-expansion-v1`: group boxes by stable object ID, choose the longest track (lowest numeric ID breaks ties), and sort by explicit frame index. Normalize half-open box area by frame area. Compute centroids, area changes, and growth per actual presentation-time interval. `amplitude = clamp(max(0, lastArea - firstArea) / 0.5, 0, 1)`. No rounding before execution, interpolation across missing detections, or biological angular-expansion claim.

## Trust boundary and validity

SAM detects/tracks. CausalFly calculates visual features and assigns the stimulus. The engine alone executes matched conditions and measures output. Muse receives frozen context and returns a separate validated proposal or interpretation. Receipts authenticate server-issued model/concept, media metadata, tracking features, amplitude, identity, and provenance. They do not make perception causal evidence.

Default label: **Deterministic Model Result**. **What Does This Result Prove?** expands to: “This result is reproducible for the defined synthetic model and inputs. It is not a validated biological prediction.” FruitFly XR was not modified.

## Live SAM validation

Sprint 8B's single live inference on the generated red-square calibration clip returned 60 tracked frames. Derived amplitude: `0.48755208333333333`. Model: `sam-3.1`. Temporary upload deletion succeeded. No key or sensitive response artifact was exposed. Sprint 8B.1 uses offline validation; no additional live inference is needed for the retention correction.

## Tests

Targeted checks cover receipt recovery after map eviction/module reload, tampering and key-loss rejection, perceive-first design without execution, fixed amplitude despite model proposals, collapsed success controls, concept prefill, error accessibility, and validity disclosure. Final validation: **302 tests passed** (264 library/server + 38 component); **45 offline browser assertions passed**, with zero runtime errors or live SAM calls, including a final invalid-file safeguard. TypeScript, lint, production build, and `git diff --check` passed. The full suite ran once for 8B.1.

## Known limitations

The area-growth proxy is sensitive to camera motion and occlusion. Browser codec/WebCodecs support varies. Browser state is not durable across a full page reload; restarting the server requires re-analysis because its signing key is intentionally not persisted. This remains a single-process hackathon workflow.

## Manual acceptance notes

Offline browser review checks: select calibration media without automatic requests; trigger a failure while scrolled away; dismiss and recover; inspect tracked playback; navigate away/back and open the assistant; design explicitly from the retained result; approve/run separately; inspect measured output, validity, and Evidence; reject a changed receipt and recover through explicit re-analysis. No screenshot matrix is generated. Human review is pending.

Branch: `feat/sprint-8b-sam-perception`  
Commit/tag: **pending** — no commit made.
