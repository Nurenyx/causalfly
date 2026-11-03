# Layout findings

**The reported genuine Firefox jitter remains unverified.** Firefox's Playwright runtime is absent; automated results below are Edge fixtures at 1728×1080.

| Stationary position | Final samples | Received packets in run | Scroll drift | Document-height range | Maximum monitored movement |
| --- | ---: | ---: | ---: | ---: | ---: |
| Top | 103 | 780 | 0 px | 0 px | 0 px |
| Middle | 102 | 770 | 0 px | 0 px | 0 px |
| Bottom | 102 | 860 | 0 px | 0 px | 0 px |

- Baseline outer geometry was also stable in Edge. Stream Notes did replace paragraphs/lists and change row count **39 times**; persistent semantic slots reduce measured structural transitions to **0**. This is not proof of the Firefox root cause.
- Six timeline nodes/columns remain fixed. Numeric, chart, feedback, source, embodiment and footer regions pass ≤1 px geometry assertions; observed delta is 0 px. No horizontal overflow, monitored-node replacement or mixed telemetry snapshot was observed.
- Normal scroll anchoring (`auto`) and fixture-local `none` both produce 0 px scroll drift. No production anchoring override was added.
- **2,411 packets** enter the unchanged reducer. Its existing 120-frame retained window is preserved exactly; no unlimited recording is claimed.
- SwiftShader software rendering delivers ~103–115 input packets/s but only ~3.09–3.22 changed telemetry presentations/s under this instrumented stress. The nominal 180 ms boundary is 5.56 Hz; **hardware performance acceptance is outstanding**, not assumed.
- Single-condition Compare now uses a materially closer fit while retaining fly/arena/stimulus bounds. Source counts explicitly say loader graph nodes/edges; scientific values are unchanged.

Raw evidence: `layout-instability-before.json`, `layout-instability.json`, `layout-instability-anchor-probe.json`. Details: `LAYOUT_AUDIT.md`, `VERIFICATION.md`. Remaining **P0 0 / P1 1**: complete `HUMAN_LIVE_ACCEPTANCE.md` on genuine Firefox telemetry.
