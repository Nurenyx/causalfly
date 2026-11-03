import test from "node:test";
import assert from "node:assert/strict";
import { validatedRecording } from "../sources/validated-recording";
import { disconnectedFruitFly, type FruitFlySnapshot } from "../sources/contracts";
import { liveStatePresentation, escapeCompatibility } from "./live-state-presentation";
import { createObservationalAction, observationalRequest } from "./observational-action";

const frames = validatedRecording();
const latest = frames.at(-1)!;
const snapshot: FruitFlySnapshot = { ...disconnectedFruitFly(), state:"DATA RECEIVED", evidence:latest, retentionId:"fixture-only-reference" };
const now = Date.parse(latest.receivedAt);
test("server, stream and evidence states remain independent across waiting, freshness, disconnect and replay", () => {
  assert.deepEqual(liveStatePresentation({...snapshot,evidence:null,state:"CONNECTED"},now),{server:"CONNECTED",stream:"WAITING FOR FIRST FRAME",evidence:"NONE"});
  assert.deepEqual(liveStatePresentation(snapshot,now),{server:"CONNECTED",stream:"LIVE",evidence:"CURRENT"});
  assert.deepEqual(liveStatePresentation(snapshot,now+5000),{server:"CONNECTED",stream:"INACTIVE",evidence:"RETAINED SNAPSHOT"});
  for (const state of ["DISCONNECTED","ERROR","CONNECTING"] as const) assert.deepEqual(liveStatePresentation({...snapshot,state},now),{server:state,stream:"INACTIVE",evidence:"RETAINED SNAPSHOT"});
  assert.deepEqual(liveStatePresentation({...snapshot,presentation:"RECORDED_REPLAY"},now),{server:"DISCONNECTED",stream:"INACTIVE",evidence:"RECORDED REPLAY"});
  assert.equal(liveStatePresentation(snapshot,now-1).evidence,"RETAINED SNAPSHOT","Future receipt cannot establish freshness");
});
test("ESCAPE compatibility distinguishes absent state, missing entry, and an observed transition", () => {
  const first = {...snapshot,evidence:frames[0]};
  assert.equal(escapeCompatibility("What changed before the decoder entered ESCAPE?",first,[frames[0]])?.message,"ESCAPE was not observed in the retained window.");
  assert.equal(escapeCompatibility("Before ESCAPE?",snapshot,[latest])?.blocked,true);
  assert.equal(escapeCompatibility("Is the current decoder state ESCAPE?",snapshot,[latest])?.blocked,false);
  const positive = escapeCompatibility("Before ESCAPE?",snapshot,frames);
  assert.equal(positive?.blocked,false); assert.match(positive!.message,/tick 2 \/ sequence 2/);
  const idleLast = {...latest,telemetry:{...latest.telemetry,sequence:latest.telemetry.sequence+1,neuralTick:latest.telemetry.neuralTick+1,simulationMs:latest.telemetry.simulationMs+50,motorMode:"IDLE"}};
  assert.match(escapeCompatibility("Before ESCAPE?",{...snapshot,evidence:idleLast},[...frames,idleLast])!.message,/tick 2 \/ sequence 2/,"A later IDLE state cannot hide an earlier retained ESCAPE transition");
  assert.equal(escapeCompatibility("Summarize the session",snapshot,frames),null);
  assert.equal(escapeCompatibility("Before ESCAPE?",disconnectedFruitFly(),[]),null);
});
test("unobserved ESCAPE never constructs an observational request or calls transport", async () => {
  const first = {...snapshot,evidence:frames[0]};
  const forbidden = () => assert.fail("Absent requested event must not request inference");
  assert.equal(observationalRequest("Before ESCAPE?",first,[frames[0]]),null);
  await createObservationalAction(forbidden,forbidden)("Before ESCAPE?",first,[frames[0]]);
  assert.ok(observationalRequest("Before ESCAPE?",snapshot,frames));
});
