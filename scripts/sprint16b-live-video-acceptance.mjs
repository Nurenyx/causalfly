// Exactly one explicit acceptance attempt. Never log grants, tickets, URLs or provider bodies.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const continuing=process.argv.includes("--continue-tracking-once");
assert.ok(process.argv.includes("--live-once")||continuing,"Explicit --live-once required; one Muse and one SAM action maximum.");
const dir="docs/review/sprint-16b", reportPath=`${dir}/live-video-acceptance.json`, base="http://127.0.0.1:3465";
const previous=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,"utf8")):null;
if(continuing) assert.ok(previous?.museResponseReceived&&previous.attempts.tracking===0&&!previous.trackingContinuationStarted,"Only the unused tracking stage can continue once; discovery must not repeat.");
else assert.ok(!previous,"Acceptance already attempted. Refusing automatic repeat.");
fs.mkdirSync(dir,{recursive:true});
const report=previous??{startedAt:new Date().toISOString(),attempts:{authorization:0,put:0,discovery:0,tracking:0},localSelected:false,authorizationSucceeded:false,privatePutSucceeded:false,storedObjectVerified:false,museResponseReceived:false,samResponseReceived:false,resultVisiblyAttributed:false,status:"STARTED"};
if(continuing) {report.trackingContinuationStarted=true;report.manualConceptContinuation=true;report.contiguousGuidedLifecycle=false;}
const save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n"); save();
const {chromium}=await import(pathToFileURL(path.join(os.homedir(),".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs")).href);
const browser=await chromium.launch({channel:"msedge",headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
const pending=[];
page.on("request",request=>{
 const url=new URL(request.url());
 if(request.method()==="PUT") report.attempts.put++;
 if(url.origin===base&&request.method()==="POST") {
  if(url.pathname==="/api/media/authorize") report.attempts.authorization++;
  if(url.pathname==="/api/perception/scene") report.attempts.discovery++;
  if(url.pathname==="/api/perception") report.attempts.tracking++;
 }
});
page.on("response",response=>{
 const request=response.request(),url=new URL(response.url());
 if(request.method()==="PUT") {report.privatePutSucceeded=response.ok();}
 if(url.origin!==base) return;
 if(url.pathname==="/api/media/authorize") {report.authorizationSucceeded=response.ok();}
 if(["/api/perception/scene","/api/perception"].includes(url.pathname)) pending.push((async()=>{
  const data=await response.json();
  const events=data.diagnostics?.events??[];
  report.storedObjectVerified ||= events.some(event=>event.type==="media.validated");
  if(url.pathname.endsWith("scene")) {report.museResponseReceived=data.ok&&data.scene?.mode==="META LIVE";}
  else {report.samResponseReceived=data.ok&&data.perception?.mode==="SAM LIVE";report.storedObjectVerified ||= data.perception?.provenance?.storage?.storageAccess==="private";}
 })().catch(()=>{}));
});
try {
 assert.equal((await(await page.request.get(base+"/api/health")).json()).metaMode,"live","Live test must not use fixtures");
 await page.goto(base,{waitUntil:"networkidle"});
 await page.getByRole("button",{name:"Real-world perception",exact:true}).click();
 await page.getByLabel("Choose video",{exact:true}).setInputFiles("public/perception-calibration.mp4"); report.localSelected=true; save();
 if(continuing) {
  report.failedStage="manual-tracking-control";save();
  await page.getByRole("button",{name:"Enter a different concept",exact:true}).click();
  await page.getByRole("textbox",{name:"Object concept",exact:true}).fill("red square");
 } else {
 report.failedStage="discovery-control";save();
 await page.getByRole("button",{name:"DISCOVER WITH META",exact:true}).click();
 await page.waitForFunction(()=>Boolean(document.querySelector('.scene-summary')||document.querySelector('.perception-error')),{},{timeout:250000});
 await Promise.allSettled(pending);
 }
 if(await page.locator('.perception-error').count()) {
  report.status=await page.locator('.perception-error').getAttribute('data-failure-kind')==="configuration"?"CONFIGURATION BLOCKED":"LIFECYCLE BLOCKED";
  report.failedStage=report.privatePutSucceeded?"scene-discovery":report.authorizationSucceeded?"private-put":"authorization";
 } else {
  assert.equal(report.museResponseReceived,true,"Do not track an offline fixture");
  if(!continuing) await page.locator('.scene-candidates input[type=radio]').first().check();
  report.failedStage="tracking-control";save();
  await page.locator('.scene-track').click();
  await page.waitForFunction(()=>Boolean(document.querySelector('.perception-panel[data-success=true]')||document.querySelector('.perception-error')),{},{timeout:250000});
  await Promise.allSettled(pending);
  report.resultVisiblyAttributed=await page.getByText("META SAM 3.1 — OBJECT TRACKED ✓",{exact:true}).isVisible();
  report.status=report.samResponseReceived&&report.resultVisiblyAttributed?(continuing?"LIVE STAGES VERIFIED; GUIDED HANDOFF NOT ACCEPTED":"PASS"):"LIFECYCLE BLOCKED";
  if(!report.samResponseReceived) report.failedStage="tracking"; else delete report.failedStage;
 }
 const target=page.locator('.perception-error').first();
 if(await target.count()) await target.scrollIntoViewIfNeeded(); else await page.locator('.perception-panel').scrollIntoViewIfNeeded();
 await page.screenshot({path:`${dir}/${report.samResponseReceived&&report.resultVisiblyAttributed?"live-video-success":"live-video-blocked"}.png`});
} catch {
 try { await page.screenshot({path:`${dir}/live-video-handoff-blocked.png`}); } catch { /* No raw exception/URL logging. */ }
 report.status="LIFECYCLE BLOCKED";report.failedStage??="transport-or-browser";
 // Never serialize a raw exception; it can carry a signed URL or provider body.
} finally {
 await Promise.allSettled(pending);
 report.completedAt=new Date().toISOString();save();await browser.close();
 console.log(JSON.stringify(report));
}
