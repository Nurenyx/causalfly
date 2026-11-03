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
  const html=render(<SensoryFeedbackControl armed available={false} receipt="ACCEPTED" disabled detail="Replay mode; neural input disconnected" onChange={()=>assert.fail("Replay cannot change feedback")} />);
  assert.match(html,/disabled/);assert.match(html,/data-feedback="UNAVAILABLE"/);assert.doesNotMatch(html,/Last stimulus referenced/);
});
