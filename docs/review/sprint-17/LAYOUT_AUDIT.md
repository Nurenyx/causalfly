# Live layout audit

## What was reproduced

The available Edge browser did **not** reproduce the reported steady-state page/card bounce. At 1728 × 1080, stationary top/middle/bottom runs measured **0 px** scroll drift, primary-card displacement, timeline-slot displacement, footer movement relative to the document, and document-height oscillation, both before and after the changes. This is a bounded fixture result, not evidence that the human Firefox defect is fixed.

The baseline did reproduce **Stream Notes structural replacement**: `H3,P` became `H3,UL`, and list lengths changed between two and three caveats. There were 39 observed structural transitions across the baseline run (its per-position arrays are cumulative). Text itself was a React key, so changed input-reference prose replaced list nodes. That violates the requested persistent-slot contract even though the reserved outer rail stayed fixed in Edge. Four semantic message slots now retain the same nodes, row positions and reading order; empty slots are hidden from assistive technology and retain layout space. No essential diagnostic is truncated.

The six timeline nodes already used stable index keys. They now explicitly identify their slots and occupy six 170 px CSS grid columns. Markers remain positioned relative to each persistent slot; title, tick and model/wall-clock time rows retain their existing reserved tracks. No insertion/reorder/layout animation is used. Live → retained changes content in those same slots. The observer, investigation and provenance cards remain persistent after first-frame establishment. Waiting → full dashboard and deliberate embodiment expansion remain explicit major-mode changes.

## Measurement method and scope

`scripts/sprint17-live-layout-stability.mjs` bundles the actual source hook and dashboard components and drives an in-memory EventSource through the unchanged reducer. It uses the app's real shell classes, sidebar constraint, production CSS and font classes. It rejects a stale build whose CSS lacks current telemetry contracts. The pre-existing server initially served an older build without those styles; its preliminary run was discarded before the recorded baseline. This environmental finding is not attributed to the human Firefox report.

Each position has a single initial `scrollTo`, followed by a seven-second update run and a final publication wait. No scrolling, locator action or screenshot occurs during measurement. MutationObserver records each DOM presentation batch; the next animation frame records the post-layout/anchoring state. Every sample stores `window.scrollY`, scroll height/width, and viewport/document coordinates, width, height and prior-sample deltas. Per-target maxima, DOM identity changes, coherent telemetry checks, presentation timestamps, mutation counts, long tasks, frame intervals and available JS heap samples are retained.

Targets include summary, Connectome Observatory, both chart cards and SVGs, Event Timeline and every slot/title/tick/time cell, Received Observations, Stream Notes, Worth Investigating, source provenance, Experimental Embodiment, Simulation Output, Stream Health, mapping, counters, decoder region, inner autonomy rows/controls, feedback and footer. The final run also checks persistent note-slot identity and geometry. Assertions use ≤1 CSS px tolerance; observed displacement is 0 px.

The baseline used individual rapid packets. The final run deliberately strengthens the stress to ten-packet bursts and populates the supplied-event array from authored variants of the 512-event recorded samples. Reported/supplied counts are explicitly authored fixture values; mapped IDs now exercise actual lookup and 3D highlights. These are different workloads, so before/after timing is **not** presented as a controlled performance comparison. Earlier counters-only runs also passed but are superseded by the populated final report.

Artifacts: `layout-instability-before.json` / `layout-instability-before-summary.json`; final `layout-instability.json` / `layout-instability-summary.json`; anchoring experiment `layout-instability-anchor-probe.json`. Exact final timing, retention and memory numbers are summarized in `VERIFICATION.md` and the JSON reports.

## Scroll anchoring and Firefox

The final normal run reports `overflow-anchor:auto` on both HTML and the live root. The diagnostic `--anchor-none` run changes **only the fixture live region** to `none` and repeats the three stationary positions. The normal run has no measurable drift; the diagnostic result is recorded separately. There is no measured justification for a production anchoring override, so none was added. No global scroll behavior was disabled and no scroll trap was introduced.

Playwright's Firefox executable is absent. No dependency/browser download was attempted. **No Firefox acceptance and no Firefox scroll-anchoring causation is claimed.** `HUMAN_LIVE_ACCEPTANCE.md` is the remaining P1 validation gate. A future failing Firefox trace should distinguish page scroll movement, document reflow, internal scroll anchoring, and text/data changes.

## Cadence, atomicity and scientific retention

The existing 180 ms publication boundary remains: nominal ~5.56 Hz, immediate first-frame/session/terminal flush, and no ingest throttle. The source hook now stores sampled session, frame history and age clock in one React state object. The separate quiet-stream freshness timer skips an age-only repaint when a telemetry publication already refreshed the clock within 180 ms. Freshness still advances when the stream goes quiet; existing stale-state regression passes.

Rendered tick, spike count, active count and decoder are compared with the same published telemetry on every observed hook commit. The browser records zero coherence failures. Charts and Event Timeline consume that same frame window. The procedural embodiment controller continues reading the unsampled snapshot at its existing cadence, independently of display sampling; its motor/scientific behavior was not changed.

Every authored packet reaches `receiveSnapshot`. Its output is compared with a parallel invocation of the original reducer and with the untouched authored objects in the last 120 frames. The **existing bounded 120-frame display/history policy** is preserved exactly. This does not claim an unlimited archive, recovery of upstream dropped packets, or a complete neural recording. Original retained evidence, reducer rules, provider prompts, connectome data, transport protocol and scientific calculations remain unchanged.

## Numeric, chart and message contracts

Primary counters have four equal grid tracks, tabular numbers and non-wrapping numeric content. Separate fixed-session cases exercise exact tick labels 9 / 99 / 999 / 9,999 / 99,999 / 192,000; reported spikes 0 / 620 / 3,314 / 18,421; active counts through 100,001; IDLE / ESCAPE / WALK / TAKEOFF; supplied counts 0 / 0 and 512 / reported count; and six-digit drop counters. Mapped-ID values remain within the actual ≤512 supplied-event cap rather than inventing impossible six-digit display samples. Age, freshness, input reference, display buffer and model time remain inside reserved regions.

Both chart SVGs retain a 452 × 187 viewBox, fixed plot coordinates (x=63…430; y=22…150), y-axis gutter, bottom tick/axis gutter and reserved caption/legend region. The current received-window maximum ×1.12 domain policy remains unchanged: data and axis text can change without changing plot/card geometry. Gaps stay unjoined. No scientific rescaling, suppressed measurement or new smoothing was introduced.

OFF / ARMED / SENDING / ACCEPTED / REJECTED / UNAVAILABLE retain fixed feedback geometry. ACCEPTED still requires the existing adapter's matching fresh stimulus reference in validated subsequent telemetry; server hello or enabling feedback alone is insufficient. The existing real-adapter fake-socket journey verifies that boundary. Authored control screenshots are explicitly presentation fixtures. Acceptance ≠ demonstrated neural consequence ≠ biological validity.

## Performance limits

The headless renderer identifies itself as **ANGLE / SwiftShader (software Vulkan)**. Long tasks >50 ms and roughly 66.6 ms median animation-frame intervals were observed in the instrumented runs. Actual publication is slower than the nominal timer in this environment. The report includes delivered packet rate, publication rate, long-task count/duration, DOM mutations and heap start/end; no React DevTools profiler was available, so DOM mutation counts are not mislabeled as React commit counts. The harness adds measurement and assertion overhead. Heap usage varies with garbage collection; three short intervals cannot establish or exclude a memory leak.

No telemetry, scientific data, neural computation, renderer functionality or genuine values were removed to improve a benchmark. Hardware Firefox smoothness remains part of the open human gate. No production tuning to compensate for software WebGL was attempted.

## Judge, Compare, topology and source truth

The offline judge journey verifies the exact retained question, fixed-template design, explicit approval, deterministic “Signal reduced 50%,” synchronized Compare conditions, requested interpretation, Evidence, live-source fixture, procedural embodiment and retained transition. It verifies keyboard-visible action focus, stable hover/focus geometry, a synchronous duplicate-submit guard and zero inference/run submissions from passive navigation. Existing source-popover/assistant keyboard and Escape checks run in the broad regression.

Objective initial Compare screenshots showed single-condition flies essentially the same pixel size as either fly in Both. Their camera distance was identical because the shared elevation made the depth envelope dominate fitting. The existing fitter now uses a lower comparison elevation and a still lower single-condition elevation, with a 12% fit reserve. Final Both distance is **14.1804**, single distance **11.4883** scene units. The camera contains all eight corners of the complete fly/arena/stimulus envelope. Subjects are visibly larger in single view; no new renderer or body/measurement changes were introduced. Remaining decorative background is P2, not a reason for further redesign.

Topology remains the existing enlarged graph. Seven nodes and declared edge weights are readable at 1728 × 1080, with ENGINEERING NETWORK / no male-cns activity context. No graph change was needed. Source values are unchanged; the live source card now says **loaded graph nodes** and **loaded structural edges**, matching the internal-count definitions in `src/lib/sources/provenance-constants.ts`. Published soma coordinates and mapped unique supplied IDs retain distinct labels.

Visible role language already separates Muse design/interpretation/next question, Muse Spark scene understanding, SAM tracking, and CausalFly deterministic proxy calculation/execution/measurement/provenance. It was retained. No extra feature, prompt, marketing panel or broad accessibility redesign was added. See `JUDGE_EVIDENCE_MATRIX.md` for concrete sources and limitations, and `RELEASE_BLOCKERS.md` for the remaining human gate.
