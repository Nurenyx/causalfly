# Human Firefox live acceptance — required

Use Windows Firefox with a **1728 × 1080 CSS-pixel viewport**, 100% zoom, and genuine simulation telemetry. Automated fixture acceptance does not close this gate. Record Firefox version, OS, zoom, viewport, GPU, build/working-tree identity, and the result at each position.

1. Open Live Connectome and connect the brain server's read-only telemetry bridge.
2. Start a simulation in its host and receive genuine telemetry. Confirm SERVER CONNECTED, STREAM LIVE, and EVIDENCE CURRENT.
3. Keep sensory feedback OFF. After the full dashboard and anatomy have loaded, leave the mouse and scroll wheel untouched for 20–30 seconds.
4. Observe the top summary: changing values must stay in their own cells.
5. Observe Event Timeline markers, title, tick and time rows. Content may advance; slots must stay put.
6. Observe both charts, including axes and their outer boundaries.
7. Observe Received Observations, Stream Notes, Worth Investigating and source provenance.
8. Open Experimental Embodiment explicitly if needed. Once open, repeat the stationary observation; distinguish procedural movement from card movement.
9. Observe the footer/final disclosure without scrolling during the observation interval.
10. Scroll midway once, stop, and repeat for 20–30 seconds.
11. Scroll near the bottom once, stop, and repeat for 20–30 seconds. Normal wheel/page scrolling must remain available.
12. Disconnect the read-only server connection.
13. Confirm INACTIVE / RETAINED SNAPSHOT, unchanged final measurements, and no claim of current activity. A single major-mode transition is distinguishable from repeated bounce.
14. Record whether any element visibly jumps, the element, approximate distance, changing values/status, scroll position, and whether `window.scrollY` or `document.documentElement.scrollHeight` changes without input. Target scroll delta: **≤1 CSS px**. Capture a short screen recording if a defect remains; do not include credentials or provider response content.

Use the browser console to record `({scrollY, height:document.documentElement.scrollHeight, viewport:[innerWidth,innerHeight]})` before and after each stationary interval. For a remaining defect, record the affected element's `getBoundingClientRect()` before/after as well. Startup, explicit expansion and viewport resizing are separate from steady telemetry.

## Separate sensory-feedback check

- OFF → ARMED → SENDING → ACCEPTED / REJECTED is covered by the **in-memory socket** acceptance in `scripts/live-stability-browser-review.mjs` (invoked by the full browser regression), and by authored control states in `scripts/sprint17-live-layout-stability.mjs`.
- Check OFF → ARMED without a real message only in that isolated fake-socket fixture. The real opt-in adapter starts publishing after it is armed and its handshake completes; do not arm a connected production control channel as part of the read-only checklist.
- A human may explicitly choose a **separate real sensory-input acceptance test**. Only then enable feedback and evaluate send/receipt/reference states. Server receipt is not proof of neural consequence, successful closed-loop behavior, or biological validity.

Result: PASS / FAIL / NOT RUN. Tester/date: ______. Stationary top/middle/bottom deltas and observations: ______.
