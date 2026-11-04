import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { SensoryFeedbackControl, type FeedbackReceipt } from "./sensory-feedback-control";

test("sensory feedback states distinguish enabling, sending, validated receipt and rejection", () => {
  for (const state of ["OFF","ARMED","SENDING","ACCEPTED","REJECTED","UNAVAILABLE"]) {
    const html=render(<SensoryFeedbackControl armed={state!=="OFF"&&state!=="UNAVAILABLE"} available={state!=="UNAVAILABLE"} receipt={(state==="OFF"||state==="UNAVAILABLE"?"ARMED":state) as FeedbackReceipt} detail={state==="REJECTED"?"Experimental brain message rejected":"Fixture only"} onChange={()=>assert.fail("Render must not send messages")} />);
    assert.ok(html.includes(`data-feedback="${state}"`));
    assert.match(html,/SENSORY FEEDBACK TO CONNECTOME/);
    assert.doesNotMatch(html,/ACTIVE CLOSED LOOP/);
    if(state==="UNAVAILABLE")assert.match(html,/disabled/);
    if(state==="REJECTED") {assert.match(html,/FEEDBACK REJECTED/);assert.match(html,/Experimental brain message rejected/);assert.doesNotMatch(html,/Last stimulus referenced/);}
    if(state!=="ACCEPTED")assert.doesNotMatch(html,/Last stimulus referenced/);
  }
});

test("unavailable channel never preserves an accepted badge and is disabled before arming", () => {
  const html=render(<SensoryFeedbackControl armed={false} available={false} receipt="ACCEPTED" detail="Live connectome control unavailable: disconnected" onChange={()=>assert.fail("No network in fixtures")} />);
  assert.match(html,/data-feedback="UNAVAILABLE"/);assert.match(html,/disabled/);assert.doesNotMatch(html,/Last stimulus referenced/);
});

test("replay keeps the existing feedback checkbox locked even if already armed", () => {
  const html=render(<SensoryFeedbackControl armed available={false} receipt="ACCEPTED" replay disabled detail="Replay mode; neural input disconnected" onChange={()=>assert.fail("Replay cannot change feedback")} />);
  assert.match(html,/disabled/);assert.match(html,/data-feedback="REPLAY"/);assert.doesNotMatch(html,/Last stimulus referenced/);
});

test("missing or invalid configuration is explicit even with connected read-only telemetry", () => {
  const html = render(<SensoryFeedbackControl configured={false} telemetryConnected armed={false} available={false} receipt="ARMED" detail="" onChange={() => assert.fail("Unconfigured input cannot arm")} />);
  assert.match(html, /data-feedback="NOT CONFIGURED"/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /checked=""/);
  assert.match(html, /Read-only telemetry is connected, but the experimental brain-input endpoint is not configured for this deployment/);
  assert.match(html, /READ-ONLY TELEMETRY: CONNECTED/);
  assert.match(html, /Experimental proxy, not biological sensory equivalence/);
});

test("configured standby is OFF and enabled without an experimental socket", () => {
  const html = render(<SensoryFeedbackControl configured armed={false} available receipt="ARMED" detail="" onChange={() => {}} />);
  assert.match(html, /data-feedback="OFF"/);
  assert.doesNotMatch(html, /disabled=""|checked=""/);
  assert.match(html, /Select to open the opt-in/);
});

test("closed input cannot retain ACCEPTED and can be unchecked for retry", () => {
  const html = render(<SensoryFeedbackControl configured armed available disconnected receipt="ACCEPTED" detail="Connection failed" onChange={() => {}} />);
  assert.match(html, /data-feedback="DISCONNECTED"/);
  assert.doesNotMatch(html, /disabled=""|Last stimulus referenced/);
  const off = render(<SensoryFeedbackControl configured armed={false} available disconnected receipt="ACCEPTED" detail="" onChange={() => {}} />);
  assert.match(off, /data-feedback="OFF"/);
  assert.doesNotMatch(off, /disabled=""/);
});

test("paused feedback suppresses acceptance until a new input session", () => {
  const html = render(<SensoryFeedbackControl configured armed available={false} paused disconnected receipt="ACCEPTED" detail="" onChange={() => {}} />);
  assert.match(html, /data-feedback="PAUSED"/);
  assert.doesNotMatch(html, /Last stimulus referenced/);
});
