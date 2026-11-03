# Sprint 17.2 — Human Firefox Live Acceptance Checklist

## Automated Environment Status

- **Playwright Edge (Chromium):** Executed and passed across all viewports (`1728×1080`, `1366×1080`, `760×1080`) and scroll positions (`scrollY = 0`, `scrollY = 800`).
- **Firefox Binary Availability:** Neither a local Firefox installation (`C:\Program Files\Mozilla Firefox\firefox.exe`) nor the Playwright Firefox runtime (`ms-playwright\firefox-1538\firefox\firefox.exe`) is installed on this machine. Per constraints, no browser download was attempted and Edge fixture results are not claimed as genuine Firefox live proof.

## Human Firefox Live Verification Steps

1. Open **Mozilla Firefox** on the live connectome workspace (`LIVE CONNECTOME SIMULATION`) connected to the genuine telemetry stream.
2. Observe the **Event timeline** panel across active telemetry at top (`scrollY = 0`) and mid-page scroll positions:
   - Confirm that the five primary columns remain permanently ordered **`FRAME`**, **`NEURAL`**, **`INPUT`**, **`DECODER`**, **`STREAM`**.
   - Confirm that labels such as `"Frame received"`, `"Neural tick"`, `"Input reference changed"`, and `"Decoder changed"` **never jump or rotate between columns** as ticks advance; each event type updates only within its dedicated column.
   - Confirm that unobserved categories display `"—"` without collapsing or shifting adjacent columns.
   - Confirm that expanding **`Recent event history`** reveals the chronological rolling sequence when desired and stays calm/collapsed during normal monitoring.
3. Disconnect or pause the simulation host to verify that the **`STREAM`** lane transitions cleanly to **`Stream inactive`** (`Snapshot retained`, `Last received ... UTC`) without shifting any of the five columns or surrounding panels.
