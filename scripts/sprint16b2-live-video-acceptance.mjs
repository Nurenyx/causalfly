// Bounded UI acceptance. Never persist tickets, grants, signed URLs or raw provider bodies.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { museSceneReceipt } from "./muse-scene-receipt.mjs";
import { videoGeometry } from "./video-acceptance-geometry.mjs";
const fixture=process.argv.includes('--fixture-check');
assert.ok(fixture!==process.argv.includes('--live-once'),'Choose exactly one explicit fixture-check or live-once');
const fixtureCase=process.argv.find(arg=>arg.startsWith('--fixture-case='))?.split('=')[1]??'qualifying';
assert.ok(['zero','low','qualifying'].includes(fixtureCase));
const dir='docs/review/sprint-16b2',reportPath=`${dir}/${fixture?`harness-fixture-${fixtureCase}`:'live-video-acceptance'}.json`;
const fixtureBase='http://127.0.0.1:3466';
const base=`http://127.0.0.1:${fixture?3466:3467}`;
fs.mkdirSync(dir,{recursive:true});
let phase='setup';
const report={startingCheckpoint:'b5f1ebf',safetyTag:'causalfly-hackathon-acceptance-prelive-v0.19',authorizationCount:0,privatePutCount:0,museRequestCount:0,samRequestCount:0,providerRetryCount:0,secondPutOccurred:false,providerResponseAccepted:false,sceneParsingSucceeded:false,parsedCandidateCount:null,qualifyingCandidateCount:null,confidenceThreshold:0.5,candidateConfidenceValues:null,maximumCandidateConfidence:null,sceneAcceptedByApplication:false,candidateSelectionOccurred:false,sameMediaReferenceUsed:false,contiguousGuidedLifecycle:false,finalSamResultReceived:false,finalScreenshotAvailable:false,finalClassification:null,startedAt:new Date().toISOString(),fixtureOnly:fixture,status:'STARTED',attempts:{authorization:0,put:0,discovery:0,tracking:0},blockedRequests:0,sameMediaReference:false,explicitCandidateSelection:false,museProviderResponseAccepted:false,museSceneParsed:false,museSceneAcceptedByApplication:false,samResponseReceived:false,privateMediaVerified:false,humanAcceptance:'PENDING HUMAN REVIEW'};
// Exclusive creation makes a second invocation fail before browser startup or network access.
fs.writeFileSync(reportPath,JSON.stringify(report,null,2),{flag:'wx'});
const save=()=>{
 report.authorizationCount=report.attempts.authorization;report.privatePutCount=report.attempts.put;
 report.museRequestCount=report.attempts.discovery;report.samRequestCount=report.attempts.tracking;
 report.secondPutOccurred=report.privatePutCount>1;
 report.providerResponseAccepted=report.museProviderResponseAccepted;
 report.sceneParsingSucceeded=report.museSceneParsed;
 report.sceneAcceptedByApplication=report.museSceneAcceptedByApplication;
 report.candidateSelectionOccurred=report.explicitCandidateSelection;
 report.sameMediaReferenceUsed=report.sameMediaReference;
 report.finalSamResultReceived=report.samResponseReceived;
 if(report.sceneDiscovery)for(const key of ['parsedCandidateCount','qualifyingCandidateCount','confidenceThreshold','candidateConfidenceValues','maximumCandidateConfidence'])report[key]=report.sceneDiscovery[key];
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
};
const preflight=JSON.parse(fs.readFileSync(`${dir}/deterministic-pre/verification.json`,'utf8'));
assert.ok(preflight.tests>=511&&preflight.build==='PASS'&&preflight.lint==='PASS'&&preflight.browserChecks>=47&&preflight.pageErrors===0&&preflight.diffCheck==='PASS','Every deterministic gate must pass before harness network activity');
const {chromium}=await import(pathToFileURL(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
let authorized,putUrl,sceneResult,selectionApproved=false;
const pending=[];
const consume=key=>{assert.equal(report.attempts[key],0,`Budget exhausted: ${key}`);report.attempts[key]++;save();};
const same=(a,b)=>Boolean(a?.ticket&&a.ticket===b?.ticket);
assert.equal((await(await page.request.get(fixtureBase+'/api/health')).json()).metaMode,'offline','Recorded layout setup must use an offline engineering fixture');
let fixtureScene,fixtureTracking;
if(fixture) {
 assert.equal((await(await page.request.get(base+'/api/health')).json()).metaMode,'offline');
 fixtureScene=await(await page.request.post(base+'/api/perception/scene',{headers:{'X-Scene-Request':crypto.randomUUID()},data:{mode:'fixture'}})).json();
 fixtureTracking=await(await page.request.post(base+'/api/perception',{headers:{'X-Perception-Request':crypto.randomUUID()},data:{mode:'fixture'}})).json();
 assert.ok(fixtureScene.ok&&fixtureTracking.ok);
 const confidenceValues=fixtureCase==='zero'?[]:fixtureCase==='low'?[0.12,0.31,0.49]:[0.8];
 const observed={source:'provider',parsedCandidateCount:confidenceValues.length,qualifyingCandidateCount:confidenceValues.filter(v=>v>=0.5).length,confidenceThreshold:0.5,candidateConfidenceValues:confidenceValues,maximumCandidateConfidence:confidenceValues.length?Math.max(...confidenceValues):null,providerResponseAccepted:true,sceneParsingSucceeded:true,refusalDetected:false};
 if(fixtureCase!=='qualifying')fixtureScene={ok:false,kind:'no_candidates',error:'No confident trackable concept was found. Try manual concept entry or choose another clip.',diagnostics:{sceneDiscovery:observed}};
 else fixtureScene.diagnostics.sceneDiscovery=observed;
 if(fixtureCase==='qualifying')fixtureScene.scene.mode='META LIVE';if(fixtureCase==='qualifying'){fixtureScene.scene.model='INTERCEPTED FIXTURE — NO LIVE MUSE';fixtureScene.scene.result.candidates[0].confidence=0.8;}
 fixtureTracking.perception.mode='SAM LIVE';fixtureTracking.perception.concept='red square';
 fixtureTracking.overlay={media:'video',revision:1,records:[],diagnostics:[],rawOutput:''};
}
await context.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 try {
  if(req.method()==='PUT') {
   assert.equal(req.url(),putUrl,'Only the one server-authorized destination may receive video bytes');consume('put');
   return fixture?route.fulfill({status:200,body:''}):route.continue();
  }
  assert.ok(url.origin===base||['blob:','data:'].includes(url.protocol),'Unexpected external browser request');
  if(fixture&&url.pathname==='/api/health')return route.fulfill({json:{metaMode:'live'}});
  if(req.method()==='POST') {
   const body=req.postDataJSON();
   if(url.pathname==='/api/experiments') {
    const result=await page.request.post(fixtureBase+'/api/experiments',{data:body});
    report.recordedLayoutSetup='Offline engineering fixture; no live design/interpret request';save();
    return route.fulfill({status:result.status(),json:await result.json()});
   }
   if(url.pathname==='/api/media/authorize') {
    consume('authorization');
    const response=fixture?null:await route.fetch({maxRetries:0,maxRedirects:0});
    const data=fixture?{reference:{ticket:'bounded-fixture-reference'},presignedUrl:'https://vercel.com/api/blob/?pathname=fixture.mp4'}:await response.json();
    authorized=data.reference;putUrl=data.presignedUrl;report.authorizationSucceeded=Boolean(authorized?.ticket&&putUrl);save();
    return response?route.fulfill({response}):route.fulfill({json:data});
   }
   if(url.pathname==='/api/perception/scene') {
    assert.ok(report.privatePutSucceeded&&same(body.media,authorized));assert.equal(body.mode,'live');report.museUsesAuthorizedReference=true;consume('discovery');
    return fixture?route.fulfill({status:fixtureCase==='qualifying'?200:422,json:fixtureScene}):route.continue();
   }
   if(url.pathname==='/api/perception') {
    assert.ok(report.museSceneAcceptedByApplication&&selectionApproved,'No tracking without completed Muse and explicit candidate confirmation');
    assert.equal(body.mode,'live');assert.ok(same(body.media,authorized),'SAM must reuse authorized media');
    assert.equal(body.sceneId,sceneResult.id);assert.equal(body.candidate,'0');assert.equal(body.concept,sceneResult.result.candidates[0].samPrompt);
    report.sameMediaReference=true;report.explicitCandidateSelection=true;consume('tracking');
    return fixture?route.fulfill({json:fixtureTracking}):route.continue();
   }
   assert.fail('Unexpected mutating endpoint blocked by bounded harness');
  }
  return route.continue();
 } catch { report.blockedRequests++;save();return route.abort('blockedbyclient'); }
});
page.on('response',response=>{
 const req=response.request(),url=new URL(response.url());
 if(req.method()==='PUT') {report.privatePutSucceeded=response.ok();save();return;}
 if(req.method()!=='POST'||url.origin!==base)return;
 pending.push((async()=>{
  const data=await response.json();
  if(url.pathname==='/api/media/authorize'&&response.ok()) {authorized=data.reference;putUrl=data.presignedUrl;report.authorizationSucceeded=Boolean(authorized?.ticket&&putUrl);}
  if(url.pathname==='/api/perception/scene') {report.sceneResponse={status:response.status(),ok:data.ok,kind:data.kind??null};sceneResult=data.scene;Object.assign(report,museSceneReceipt(response.ok(),data));}
  if(url.pathname==='/api/perception') {report.trackingResponse={status:response.status(),ok:data.ok,kind:data.kind??null};report.samResponseReceived=Boolean(response.ok()&&data.ok&&data.perception?.mode==='SAM LIVE');report.privateMediaVerified=Boolean(data.perception?.provenance?.storage?.storageAccess==='private');}
  report.privateMediaVerified ||= Boolean(data.diagnostics?.events?.some(e=>e.type==='media.validated'));
  save();
 })().catch(()=>{}));
});
try {
 assert.equal((await(await page.request.get(base+'/api/health')).json()).metaMode,fixture?'offline':'live');
 await page.goto(base,{waitUntil:'networkidle'});
 await page.locator('.scientist-action button').first().click();
 await page.getByRole('button',{name:/APPROVE.*RUN/i}).first().waitFor();
 await page.locator('.scientist-action button').first().click();
 await page.locator('.compare-transition-btn').first().waitFor();
 await page.getByRole('button',{name:'Recorded signal view',exact:true}).click();
 await page.getByRole('button',{name:'Real-world perception',exact:true}).click();
 await page.getByLabel('Choose video',{exact:true}).setInputFiles('public/perception-calibration.mp4');
 const museResponse=page.waitForResponse(r=>r.url()===base+'/api/perception/scene'&&r.request().method()==='POST',{timeout:250000});
 phase='muse';
 await page.getByRole('button',{name:'DISCOVER WITH META',exact:true}).click();
 await museResponse;await Promise.all(pending);
 save();
 if(report.providerResponseAccepted&&report.sceneParsingSucceeded&&report.parsedCandidateCount===0) {
  report.decisionTreeCase='A';report.finalClassification='MUSE_ZERO_CANDIDATES';throw new Error('Bounded zero-candidate stop');
 }
 if(report.providerResponseAccepted&&report.sceneParsingSucceeded&&report.parsedCandidateCount>0&&report.qualifyingCandidateCount===0) {
  report.decisionTreeCase='B';report.finalClassification='MUSE_SUBTHRESHOLD_CANDIDATES';throw new Error('Bounded confidence stop');
 }
 if(!report.sceneParsingSucceeded||!report.providerResponseAccepted) {
  report.finalClassification=report.sceneResponse?.kind==='malformed'?'MUSE_MALFORMED_RESPONSE':'MUSE_PROVIDER_FAILURE';throw new Error('Bounded provider/parsing stop');
 }
 assert.ok(report.museSceneAcceptedByApplication&&report.qualifyingCandidateCount>=1,'Only an accepted qualifying scene permits the guided handoff');
 report.decisionTreeCase='C';phase='handoff';save();
 assert.ok(sceneResult.result.candidates[0].confidence>=0.5);
 await page.locator('.scene-candidates input[type=radio]').first().waitFor();
 assert.equal(await page.getByRole('button',{name:'Upload again (expired or unavailable media)',exact:true}).count(),0);
 assert.equal(report.attempts.tracking,0,'No automatic SAM call');
 await page.locator('.scene-candidates input[type=radio]').first().check();selectionApproved=true;report.explicitCandidateSelection=true;save();
 assert.equal(await page.locator('.scene-track').isEnabled(),true,'Candidate handoff must enable tracking');
 const samResponse=page.waitForResponse(r=>r.url()===base+'/api/perception'&&r.request().method()==='POST',{timeout:250000});
 phase='sam';
 await page.locator('.scene-track').click();await samResponse;await Promise.all(pending);
 assert.ok(report.samResponseReceived,'SAM must succeed without another upload, manual fallback or retry');
 await page.getByText('META SAM 3.1 — OBJECT TRACKED ✓',{exact:true}).waitFor();
 await page.locator('.perception-player canvas').waitFor();
 report.resultVisiblyAttributed=true;
 assert.deepEqual(report.attempts,{authorization:1,put:1,discovery:1,tracking:1});
 assert.equal(report.blockedRequests,0);
 if(!fixture)assert.equal(report.privateMediaVerified,true);
 report.contiguousGuidedLifecycle=true;phase='layout';
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(400);
 await page.locator('.embodied-stage').screenshot({path:`${dir}/${fixture?`fixture-${fixtureCase}`:'live-after-sam'}-primary-1440.png`});
 report.finalScreenshotAvailable=true;save();
 report.geometry=await videoGeometry(page,dir,fixture?`harness-fixture-${fixtureCase}`:'live-after-sam');
 report.contiguousGuidedLifecycle=true;report.status='PASS — HUMAN REVIEW PENDING';report.finalClassification='FULL_LIVE_ACCEPTANCE_PASS';report.layoutAcceptancePassed=true;
} catch {
 report.status='STOPPED — NO AUTOMATIC RETRY';
 report.failedPhase=phase;
 report.finalClassification??=phase==='layout'?'LAYOUT_ACCEPTANCE_FAILURE':phase==='sam'?(report.samResponseReceived?'GUIDED_HANDOFF_FAILURE':'SAM_PROVIDER_FAILURE'):phase==='handoff'?'GUIDED_HANDOFF_FAILURE':phase==='muse'?'MUSE_PROVIDER_FAILURE':'OTHER_BOUNDED_FAILURE';
 try {await page.locator('.perception-panel').screenshot({path:`${dir}/${fixture?`fixture-${fixtureCase}`:'live'}-stopped.png`});report.finalScreenshotAvailable=true;}catch{ /* No secret-bearing exception output. */ }
 if(!fixture||!['MUSE_ZERO_CANDIDATES','MUSE_SUBTHRESHOLD_CANDIDATES'].includes(report.finalClassification))process.exitCode=1;
} finally {
 await Promise.allSettled(pending);report.completedAt=new Date().toISOString();save();await browser.close();
 console.log(JSON.stringify({status:report.status,fixtureOnly:fixture,attempts:report.attempts,blockedRequests:report.blockedRequests,sameMediaReference:report.sameMediaReference,contiguousGuidedLifecycle:report.contiguousGuidedLifecycle??false,finalClassification:report.finalClassification,parsedCandidateCount:report.parsedCandidateCount,qualifyingCandidateCount:report.qualifyingCandidateCount}));
}
