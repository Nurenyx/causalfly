# Release findings

**P0 remaining: 0. P1 remaining: 1. Human Firefox live acceptance: REQUIRED.**

| Priority | Finding | Status / evidence / exit criterion |
| --- | --- | --- |
| P1 | Human-reported genuine Firefox live-dashboard jitter has not been reproduced or closed in the available automated browser. | **OPEN validation gate.** Edge reports 0 px displacement and stationary-scroll drift in `layout-instability.json`; that does not explain or disprove the human report. Playwright Firefox is absent. Run `HUMAN_LIVE_ACCEPTANCE.md` on genuine telemetry; retain a failing trace if any element jumps. Do not claim Firefox acceptance or a proven Firefox root cause. |
| P1 | Stream Notes replaced its paragraph/list and changed row count as caveats appeared. | Resolved structural stability contract: persistent four-slot list, stable semantic keys and row tracks. Baseline records structural changes; final records none. Outer-card movement was 0 px even before the change, so this is **not proof** of the human Firefox root cause. |
| P1 | Control-only / intervention-only Compare retained essentially the two-subject zoom. | Resolved: lower existing camera-fit elevation with 12% fitting reserve; single-condition distance is 11.488 vs 14.180 scene units for both. Existing renderer and all fly/arena/stimulus bounds retained. `judge-journey.json`, Compare PNGs and camera tests verify containment. |
| P1 | Loader graph-node count was labeled simply “neurons.” | Resolved label ambiguity: “loaded graph nodes” and “loaded structural edges,” supported by existing `src/lib/sources/provenance-constants.ts`. No value or publication statistic changed. |
| P2 | Instrumented headless Edge uses SwiftShader software WebGL, with long tasks and slower-than-nominal presentation delivery. | Recorded in `LAYOUT_AUDIT.md` / `layout-instability.json`. No sustained heap-growth conclusion follows from three short runs. This environment cannot certify target-machine smoothness. Measure hardware Firefox during the open P1 gate; do not degrade rendering/data or tune scientific behavior to a software test renderer. |
| P2 | The joint arena/stimulus envelope constrains further Compare enlargement. | Current screenshots contain subjects, arenas and stimuli. No further camera or renderer redesign undertaken. |
| P3 | Real-fly prediction, sensory equivalence and biological/body-mechanics validation. | Outside hackathon release scope, explicitly unestablished in the product. No claim or new validation work introduced. |

No P0 was discovered. No additional feature or P2/P3 polish work is authorized by these findings. Existing historical provider acceptance remains historical; it was not rerun. No genuine provider, upload or control action is required to review the artifacts here.
