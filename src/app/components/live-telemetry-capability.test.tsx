import assert from "node:assert/strict";
import Module from "node:module";
import test from "node:test";
import { renderToStaticMarkup as render } from "react-dom/server";
import { disconnectedFruitFly, type FruitFlySnapshot } from "@/lib/sources/contracts";
import { validatedRecording } from "@/lib/sources/validated-recording";

(Module as unknown as { _extensions: Record<string, (mod: { exports: unknown }) => void> })._extensions[".css"] = mod => { mod.exports = {}; };
const frame = validatedRecording()[0];
const receipt = Date.parse(frame.receivedAt);
const noop = () => {};
async function gate(snapshot: FruitFlySnapshot, now = receipt, inputConfigured = false) {
  const previous = process.env.NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL;
  process.env.NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL = inputConfigured ? "wss://fixture.invalid/brain/v1" : "";
  try {
    const { LiveConnectomeGate } = await import("./live-connectome-gate");
    return render(<LiveConnectomeGate snapshot={snapshot} now={now} onConnect={noop} onDisconnect={noop} replaying={false} onReplay={noop} />);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL;
    else process.env.NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL = previous;
  }
}
test("read-only connection explains passive initiation and has no misleading start control", async () => {
  const html = await gate({ ...disconnectedFruitFly(), state: "CONNECTED" });
  assert.match(html, /Live telemetry ready/);
  assert.match(html, /WAITING FOR FIRST FRAME/);
  assert.match(html, /WAITING FOR SIMULATION/);
  assert.match(html, /READ-ONLY TELEMETRY/);
  assert.match(html, /Trial control unavailable on this host/);
  assert.match(html, /simulation host to begin sending frames/);
  assert.match(html, /REPLAY VALIDATED RUN/);
  assert.doesNotMatch(html, /Backend ready|START LIVE TRIAL|START EXPERIMENTAL INPUT TRIAL/);
});
test("disconnection and receiving telemetry are separate visible connection facts", async () => {
  const offline = await gate(disconnectedFruitFly());
  assert.match(offline, /Live telemetry disconnected/);
  assert.match(offline, /TELEMETRY DISCONNECTED/);
  const live = await gate({ ...disconnectedFruitFly(), state: "DATA RECEIVED", evidence: frame }, receipt + 100);
  assert.match(live, /Receiving live telemetry/);
  assert.match(live, /does not start or control it/);
  assert.doesNotMatch(live, /WAITING FOR SIMULATION|Backend ready/);
});
test("both disconnected retention and connected stale evidence are explicitly retained", async () => {
  for (const state of ["DISCONNECTED", "CONNECTED"] as const) {
    const html = await gate({ ...disconnectedFruitFly(), state, evidence: frame }, receipt + 6000);
    assert.match(html, /Retained simulation snapshot/);
    assert.match(html, /SNAPSHOT RETAINED/);
    assert.doesNotMatch(html, /Receiving live telemetry|Live telemetry ready|WAITING FOR FIRST FRAME/);
  }
});
test("configured experimental input is disclosed separately from telemetry trial control", async () => {
  const connected = await gate({ ...disconnectedFruitFly(), state: "CONNECTED" }, receipt, true);
  assert.match(connected, /data-control="experimental-input-configured"/);
  assert.match(connected, /Separate experimental input channel configured/);
  assert.match(connected, /not a trial-start command on the telemetry connection/);
  assert.match(connected, /<button[^>]*>START EXPERIMENTAL INPUT TRIAL<\/button>/);
  const offline = await gate(disconnectedFruitFly(), receipt, true);
  assert.match(offline, /<button[^>]*disabled=""[^>]*>START EXPERIMENTAL INPUT TRIAL<\/button>/);
});
