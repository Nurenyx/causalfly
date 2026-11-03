# Genuine Firefox live acceptance — still required

Use Windows Firefox, **1728 × 1080 CSS-pixel viewport**, 100% zoom and genuine incoming telemetry. Record Firefox version, viewport, GPU, build identity, tester/date and observations. Fixtures and Edge automation do not close this gate.

1. Connect the read-only brain-server telemetry bridge in Live Connectome.
2. Start/receive genuine simulation telemetry. Confirm CONNECTED / LIVE / CURRENT. Keep sensory feedback **OFF**.
3. Wait until the full dashboard and anatomy load. Leave the mouse, wheel and keyboard untouched for **20–30 seconds**.
4. Stationary top observation: observe the top summary and its changing values.
5. Observe **Event Timeline**: marker dots, connecting baselines, labels (titles), tick values, model-time values, final status slot and panel boundaries. PASS requires **no visible bounce**, including when a short label becomes “Input reference changed.”
6. Observe both charts and their axes/boundaries.
7. Observe Received Observations, Stream Notes, Worth Investigating and source provenance.
8. Open Experimental Embodiment deliberately if needed, then repeat the stationary interval. Procedural fly movement is separate from panel movement.
9. Observe the footer/final disclosure without scrolling during the interval.
10. Stationary middle observation: scroll midway once, stop and repeat for 20–30 seconds. Keep Event Timeline in view for one complete interval.
11. Stationary bottom observation: scroll near the bottom once, stop and repeat for 20–30 seconds. Confirm ordinary page/wheel scrolling remains available.
12. Disconnect transition: disconnect the read-only server connection.
13. Retained snapshot state: verify INACTIVE / RETAINED SNAPSHOT with unchanged final measurements, a stable final timeline status slot and no claim of current activity.
14. Record `scrollY` before/after, document height before/after, and any jump (element, distance, status/value transition, whether it repeats). Target stationary scroll movement: **≤1 CSS px** without input. Preserve a short recording and geometry trace if a defect remains; exclude credentials/provider content.

## Optional 30-second geometry helper

Open Firefox's console while the timeline is visible. Review and paste the contents of [`timeline-console-helper.js`](timeline-console-helper.js). It only reads bounding rectangles every 100 ms, retains numerical geometry locally and stops automatically after 30 seconds. It does not scroll, mutate the app, alter telemetry, send messages or contact a service.

Do not touch input devices during sampling. Then inspect:

```js
causalFlyTimelineAudit.summary()
// Optional early stop:
causalFlyTimelineAudit.stop()
```

Save the summary and, for a failure, `causalFlyTimelineAudit.samples`. Run a fresh audit after each deliberate scroll; user scrolling during an interval is expected to change viewport coordinates and invalidates that interval as a stationary test. A failed result keeps the **P0 Event Timeline gate open**.

## Neural Response presentation

Run the existing offline controlled fixture, approve explicitly, select Recorded signal view and inspect Neural Response. Confirm the top Control/Intervention selector and current step stay visible together. Check both conditions and scrub every retained step. Network, trace, facts and controls must stay put. Intervention must show Primary A silenced, stored peak 0.500 / response Step 4 for the default fixture, and “Signal reduced 50%” / one-step delay / unchanged outcome. Those are synthetic model results; motor execution is procedural and biological validation remains unestablished.

## Separate feedback acceptance

Retain the Sprint 17 safety boundary: OFF → ARMED without real traffic is tested only in the isolated fake-socket fixture. The real adapter starts publishing after arming/handshake. Do not arm the connected production channel during this read-only checklist. A genuine sensory-message acceptance test requires the human's separate explicit choice. A receipt is not proof of a neural consequence or biological validity.

Result: PASS / FAIL / NOT RUN. Stationary top/middle/bottom observations, `scrollY` before/after, document height before/after, and maximum deltas: ______. Tester/date: ______.
