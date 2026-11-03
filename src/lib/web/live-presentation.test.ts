import test from "node:test";
import assert from "node:assert/strict";
import { createLivePresentation, LIVE_PRESENTATION_MS } from "./live-presentation";
import { emptyLiveSession, receiveSnapshot, type LiveSession } from "../sources/live-session";
import { validatedRecording } from "../sources/validated-recording";
import type { FruitFlySnapshot } from "../sources/contracts";

function fixture() {
  const paints: LiveSession[]=[];let pending:(()=>void)|undefined;let scheduled=0;
  const store=createLivePresentation(session=>paints.push(session),(callback,ms)=>{assert.equal(ms,180);pending=callback;scheduled++;return 1 as unknown as ReturnType<typeof setTimeout>;},()=>{pending=undefined;});
  return {store,paints,scheduled:()=>scheduled,run:()=>{const fn=pending;pending=undefined;fn?.();}};
}
const input=(sequence:number):FruitFlySnapshot=>{const evidence=structuredClone(validatedRecording()[0]);Object.assign(evidence.telemetry,{sequence,neuralTick:sequence,simulationMs:sequence*50});return {source:"FRUITFLY_XR",state:"DATA RECEIVED",message:"Authored cadence fixture",evidence};};
test("burst ingests every frame through unchanged evidence reducer while publishing newest state at human cadence",()=>{
  const f=fixture();let baseline=emptyLiveSession();
  for(let i=1;i<=110;i++){const next=input(i);baseline=receiveSnapshot(baseline,next);f.store.receive(next);}
  assert.deepEqual(f.store.current(),baseline);assert.equal(f.store.current().frames.length,110);
  assert.equal(f.paints.length,1);assert.equal(f.paints[0].snapshot.evidence?.telemetry.sequence,1);assert.equal(f.scheduled(),1);
  f.run();assert.equal(f.paints.length,2);assert.equal(f.paints.at(-1)?.snapshot.evidence?.telemetry.sequence,110);
  assert.equal(LIVE_PRESENTATION_MS,180);
});
test("terminal stream status immediately flushes final frame and cancels pending paint",()=>{
  const f=fixture();f.store.receive(input(1));f.store.receive(input(2));
  f.store.receive({source:"FRUITFLY_XR",state:"ERROR",message:"Fixture transport ended",evidence:null});
  assert.equal(f.paints.at(-1)?.snapshot.state,"ERROR");assert.equal(f.paints.at(-1)?.snapshot.evidence?.telemetry.sequence,2);assert.equal(f.paints.at(-1)?.frames.length,2);
  const n=f.paints.length;f.run();assert.equal(f.paints.length,n);
});
test("display coalescing preserves original bounded retention, new-session boundary and explicit flush",()=>{
  const f=fixture();let baseline=emptyLiveSession();for(let i=1;i<=135;i++){const next=input(i);baseline=receiveSnapshot(baseline,next);f.store.receive(next);}
  assert.deepEqual(f.store.current(),baseline);f.store.flush();assert.deepEqual(f.paints.at(-1),baseline);
  const next=input(1);next.evidence!.telemetry.sessionId="authored-new-session";f.store.receive(next);assert.equal(f.paints.at(-1)?.frames.length,1);
  f.store.receive({...next,evidence:null,state:"DISCONNECTED"});assert.equal(f.paints.at(-1)?.snapshot.state,"DISCONNECTED");
  f.store.dispose();const n=f.paints.length;f.run();assert.equal(f.paints.length,n);f.store.resume();f.store.receive(input(1));assert.equal(f.paints.length,n+1);
});
