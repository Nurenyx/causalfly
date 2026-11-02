import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { runGuidedAction } from "./guided-workflow";
import { FakeMetaClient } from "../meta/fake-client";
import { offlinePerceptionFixture } from "../perception/fixture";
import { retainPerception, perceptionReceipt, verifyPerceptionReceipt } from "../perception/store";
import { workspaceReducer, type WorkspaceState } from "./dashboard";

const question="What happens if I silence the primary pathway?";
const signingKey="recovery-fixture-signing-key-at-least-32-characters";
const previousSecret=process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;
test.beforeEach(()=>{process.env.CAUSALFLY_MEDIA_SIGNING_SECRET=signingKey;mock.method(globalThis,"fetch",async()=>{assert.fail("No Muse, SAM, media upload or other network call permitted");});});
test.afterEach(()=>{mock.restoreAll();if(previousSecret===undefined)delete process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;else process.env.CAUSALFLY_MEDIA_SIGNING_SECRET=previousSecret;});
function stimulus(){
 const authored=offlinePerceptionFixture(randomUUID());
 // Human-failure presentation fixture; never represented as new live model evidence.
 const record=retainPerception({...authored,measurement:{...authored.measurement,amplitude:0.488},provenance:{...authored.provenance,warnings:["Authored recovery fixture, displayed stimulus 0.488; no provider request."]}});
 return {record,receipt:perceptionReceipt(record)};
}
function fixture(){const calls:string[]=[];const fake=new FakeMetaClient();return {calls,deps:{env:{},createClient:()=>({mode:fake.mode,complete:(request:Parameters<typeof fake.complete>[0])=>{calls.push(request.task);return fake.complete(request);}})}};}

test("a valid prior design accepts retained measured input as a new unapproved draft without another model or run",async()=>{
 const {record,receipt}=stimulus();const {calls,deps}=fixture();
 const old=await runGuidedAction({action:"design",researchQuestion:question},deps);assert.ok(old.ok);
 const accepted=await runGuidedAction({action:"stimulus",id:old.design.id,perceptionId:record.id,perceptionReceipt:receipt},deps);
 assert.ok(accepted.ok);assert.notEqual(accepted.design.id,old.design.id);assert.equal(accepted.design.spec.stimulus.amplitude,0.488);
 assert.deepEqual(accepted.design.perceptionInput,record);assert.equal(accepted.result,undefined);assert.deepEqual(calls,["design"]);
 assert.ok(!accepted.design.diagnostics?.events.some(e=>e.type==="experiment.approved"));
});

test("expired design offers a structured recovery boundary; a fresh normal design uses the retained receipt and still requires approval",async()=>{
 const {record,receipt}=stimulus();const {calls,deps}=fixture();
 const old=await runGuidedAction({action:"design",researchQuestion:question},deps);assert.ok(old.ok);
 const now=Date.now;Date.now=()=>now()+2*60*60*1000+1;
 try{
  const expired=await runGuidedAction({action:"stimulus",id:old.design.id,perceptionId:record.id,perceptionReceipt:receipt},deps);
  assert.ok(!expired.ok);assert.equal(expired.code,"DESIGN_UNAVAILABLE");assert.deepEqual(calls,["design"]);
  const fresh=await runGuidedAction({action:"design",researchQuestion:question,perceptionId:record.id,perceptionReceipt:receipt},deps);
  assert.ok(fresh.ok);assert.equal(fresh.design.researchQuestion,question);assert.equal(fresh.design.spec.stimulus.amplitude,0.488);
  assert.deepEqual(fresh.design.perceptionInput,record);assert.equal(fresh.result,undefined);assert.deepEqual(calls,["design","design"]);
  assert.ok(!fresh.design.diagnostics?.events.some(e=>e.type==="experiment.approved"));
  const stale=await runGuidedAction({action:"run",id:old.design.id},deps);assert.ok(!stale.ok);assert.equal(stale.code,"DESIGN_UNAVAILABLE");
  const approved=await runGuidedAction({action:"run",id:fresh.design.id},deps);assert.ok(approved.ok&&approved.result);
  assert.equal(approved.result.spec.stimulus.amplitude,0.488);assert.deepEqual(calls,["design","design"]);
 }finally{Date.now=now;}
});

test("fresh server process loses old design identity but verifies the signed stimulus and designs without media or perception calls",async()=>{
 const {record,receipt}=stimulus();const {deps}=fixture();
 const old=await runGuidedAction({action:"design",researchQuestion:question},deps);assert.ok(old.ok);
 const script=`const assert=require('node:assert/strict');const input=JSON.parse(require('node:fs').readFileSync(0,'utf8'));globalThis.fetch=async()=>{throw new Error('Network forbidden');};const {runGuidedAction}=require('./src/lib/web/guided-workflow.ts');const {FakeMetaClient}=require('./src/lib/meta/fake-client.ts');(async()=>{const calls=[];const fake=new FakeMetaClient();const deps={env:{},createClient:()=>({mode:fake.mode,complete:r=>{calls.push(r.task);return fake.complete(r);}})};const expired=await runGuidedAction({action:'stimulus',id:input.oldId,perceptionId:input.id,perceptionReceipt:input.receipt},deps);assert.equal(expired.code,'DESIGN_UNAVAILABLE');assert.equal(calls.length,0);const fresh=await runGuidedAction({action:'design',researchQuestion:input.question,perceptionId:input.id,perceptionReceipt:input.receipt},deps);assert.equal(fresh.ok,true);assert.equal(fresh.design.spec.stimulus.amplitude,0.488);assert.equal(fresh.result,undefined);assert.deepEqual(calls,['design']);process.stdout.write(JSON.stringify({missingDesignRejected:true,signedStimulusRecovered:true,freshDraftCreated:true,approvalStillRequired:true}));})().catch(()=>{process.exitCode=1;});`;
 const output=execFileSync(process.execPath,["--require","tsx/cjs","--conditions=react-server","-e",script],{cwd:process.cwd(),input:JSON.stringify({oldId:old.design.id,id:record.id,receipt,question}),encoding:"utf8",env:{...process.env,CAUSALFLY_MEDIA_SIGNING_SECRET:signingKey}});
 assert.deepEqual(JSON.parse(output),{missingDesignRejected:true,signedStimulusRecovered:true,freshDraftCreated:true,approvalStillRequired:true});
});

test("client recovery clears the stale identity, preserves question and historical evidence, and ignores a late unrelated failure",async()=>{
 const {deps}=fixture();const old=await runGuidedAction({action:"design",researchQuestion:question},deps);assert.ok(old.ok);
 const run=await runGuidedAction({action:"run",id:old.design.id},deps);assert.ok(run.ok&&run.result);
 const state:WorkspaceState={workspace:"observatory",question,investigationId:1,design:old.design,result:run.result,nextFromId:old.design.id};
 const recovered=workspaceReducer(state,{type:"design-unavailable",id:old.design.id,investigationId:1});
 assert.equal(recovered.question,question);assert.equal(recovered.design,undefined);assert.equal(recovered.nextFromId,undefined);assert.equal(recovered.result,null);
 assert.equal(recovered.history?.[0].result,run.result);assert.equal(recovered.history?.[0].design,old.design);
 assert.equal(workspaceReducer(state,{type:"design-unavailable",id:randomUUID()}),state);
});


test("a verified legacy stimulus receipt is migrated on stale-design recovery with identical payload and expiry",async()=>{
 delete process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;
 const {record,receipt}=stimulus();process.env.CAUSALFLY_MEDIA_SIGNING_SECRET=signingKey;
 const {deps}=fixture();
 const response=await runGuidedAction({action:"stimulus",id:randomUUID(),perceptionId:record.id,perceptionReceipt:receipt},deps);
 assert.ok(!response.ok);assert.equal(response.code,"DESIGN_UNAVAILABLE");
 const migrated=response.retainedStimulusReceipt!;assert.equal(migrated.id,record.id);assert.equal(migrated.receipt.split(".")[0],receipt.split(".")[0]);
 const scope=globalThis as typeof globalThis & {__causalflyPerceptionV1?:unknown};const previous=scope.__causalflyPerceptionV1;const now=Date.now;
 delete scope.__causalflyPerceptionV1;
 try{
  assert.deepEqual(verifyPerceptionReceipt(record.id,migrated.receipt),record);
  assert.throws(()=>verifyPerceptionReceipt(record.id,receipt),/Re-analyze/);
  Date.now=()=>now()+13*60*60*1000;
  assert.throws(()=>verifyPerceptionReceipt(record.id,migrated.receipt),/Re-analyze/);
 }finally{Date.now=now;scope.__causalflyPerceptionV1=previous;}
});
