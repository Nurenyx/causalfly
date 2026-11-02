// Local production acceptance: deterministic Meta fixtures; no paid provider or XR calls.
import { humanRecoveryMeasurement, reviewRetainedStimulusRecovery } from "./retained-stimulus-browser-review.mjs";
import { videoGeometry } from "./video-acceptance-geometry.mjs";
import { reviewProxyClarity } from "./proxy-clarity-browser-review.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs")).href);
const base = process.env.CAUSALFLY_BROWSER_REVIEW_BASE ?? "http://127.0.0.1:3464";
const dir = process.env.CAUSALFLY_BROWSER_REVIEW_DIR ?? "docs/review/sprint-16b1b"; fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
const page = await context.newPage(); const errors = [], checks = [];
page.on("pageerror", error => errors.push(error.message));
await context.route("**/*", route => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const nav = name => page.getByRole("navigation", { name: "Experiment workspaces" }).getByRole("button", { name, exact: true }).click();
async function audit(name, target) {
  for (const [width, height] of [[1920,1080],[1536,1024],[1440,900],[1366,768]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(250);
    if (target) await page.locator(target).scrollIntoViewIfNeeded(); else await page.evaluate(() => window.scrollTo(0,0));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: horizontal overflow at ${width}`);
    const header = await page.locator('.page-header').evaluate(el => { const s = getComputedStyle(el); return { padding:s.padding,font:getComputedStyle(el.querySelector('h1')).fontSize }; });
    if (name === "compare") {
      const arena = await page.locator('.compare-arena').boundingBox(); assert.ok(arena.height >= 440);
      const heroCamera=JSON.parse(await page.locator('.compare-arena canvas').getAttribute('data-world-camera')); assert.equal(heroCamera.fitComparisonToPanel,false,'Full-screen Compare camera does not opt into embedded-panel framing');
      const cards = await page.locator('.compare-condition-readouts').boundingBox(); assert.ok(cards.y + cards.height <= arena.y + 1, "Readouts cannot overlap the canvas");
      const controls = await page.locator('.compare-playback-container button:visible').all();
      const rects = await Promise.all(controls.map(el => el.boundingBox()));
      for (let i=0;i<rects.length;i++) for(let j=i+1;j<rects.length;j++) { const a=rects[i],b=rects[j]; assert.ok(!a||!b||Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)<=1||Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)<=1, "Compare buttons overlap"); }
    }
    await page.screenshot({ path:`${dir}/${name}-${width}.png` }); checks.push({ name,width,height,noHorizontalOverflow:true,header });
  }
}
async function recordedGeometry(state) {
  for (const [width,height] of [[1366,768],[1440,900],[1536,1024],[1920,1080]]) {
    await page.setViewportSize({width,height}); await page.waitForTimeout(250);
    const world=page.locator('.organism-first-workspace[data-view="recorded"] .embodied-world-column');
    await world.scrollIntoViewIfNeeded();
    await world.locator('.embodied-arena canvas').waitFor();
    await page.waitForTimeout(300);
    if(state === 'experiment-recorded-compare') {
      const camera = JSON.parse(await world.locator('canvas').getAttribute('data-world-camera'));
      const distance = Math.hypot(...camera.position.map((value,index)=>value-camera.target[index]));
      const horizontalSpan = 2*distance*Math.tan(camera.fov*Math.PI/360)*camera.width/camera.height;
      assert.ok(camera.fitComparisonToPanel && horizontalSpan >= (4.7+3.6)*1.1-.01,'Both fly bounds fit the embedded comparison camera');
    }
    const geometry=await world.evaluate(el=>{
      const box=selector=>{const r=el.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
      const rect=el.getBoundingClientRect(),rail=el.parentElement.querySelector('.embodied-context-rail').getBoundingClientRect();
      return {world:{y:rect.y,height:rect.height,bottom:rect.bottom},rail:{y:rail.y,height:rail.height,bottom:rail.bottom},canvas:box('.embodied-arena'),webgl:box('.embodied-arena canvas'),cards:box('.world-condition-labels'),readout:box('.recorded-behaviour-chip'),orbit:box('.world-orbit-hint'),step:box('.readout-telemetry-strip')};
    });
    const intersects=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${state}: overflow ${width}`);
    assert.ok(Math.abs(geometry.canvas.height-geometry.webgl.height)<2,'WebGL fills the stretched visualization');
    assert.ok(Math.abs(geometry.world.bottom-geometry.rail.bottom)<2,`World/inspector bottoms align at ${width}`);
    assert.ok(Math.abs(geometry.world.y-geometry.rail.y)<2,`Shared row starts align at ${width}`);
    for(const target of ['readout','orbit','step']) assert.ok(!intersects(geometry.cards,geometry[target]),`Condition cards cannot overlap ${target}`);
    assert.ok(!intersects(geometry.readout,geometry.orbit),'Readout/orbit regions do not overlap');
    assert.ok(!intersects(geometry.cards,geometry.canvas),'Cards are outside the canvas');
    const growth=await world.evaluate(el=>{
      const rail=el.parentElement.querySelector('.embodied-context-rail'), canvas=el.querySelector('.embodied-arena');
      const before=canvas.getBoundingClientRect().height,original=rail.style.height;
      rail.style.height=`${el.getBoundingClientRect().height+240}px`;
      const after=canvas.getBoundingClientRect().height;
      rail.style.height=original; return {before,after};
    });
    assert.ok(growth.after-growth.before>=235,'Canvas consumes additional grid-row room, rather than leaving background below');
    await page.screenshot({path:`${dir}/${state}-${width}.png`,fullPage:false});
    await world.screenshot({path:`${dir}/${state}-panel-${width}.png`});
    checks.push({name:state,width,height,geometry,growth,noHorizontalOverflow:true});
  }
}
try {
  assert.equal((await (await page.request.get(base+"/api/health")).json()).metaMode,"offline","Review requires CAUSALFLY_FAKE_META=1; no paid calls permitted");
  await page.goto(base, { waitUntil:"networkidle" });
  await audit("experiment");
  assert.ok((await page.locator(".embodied-signals .fixture-topology svg").boundingBox()).width > 400, "Preview topology uses available width");
  await page.locator(".embodied-signals").scrollIntoViewIfNeeded(); await page.locator(".embodied-signals").screenshot({path:`${dir}/preview-neural-system.png`});
  await page.locator('.scientist-action button').first().click();
  await page.getByRole('button', { name:/APPROVE.*RUN/i }).first().waitFor();
  await page.locator('.scientist-action button').first().click();
  await page.locator('.compare-transition-btn').first().waitFor();
  await audit("measured-experiment", '.embodied-signals');
  await page.getByRole('button',{name:'Recorded signal view',exact:true}).click();
  await recordedGeometry('experiment-recorded-single');
  await page.getByRole('button',{name:'Compare runs',exact:true}).click();
  await recordedGeometry('experiment-recorded-compare');
  await page.locator('.compare-transition-btn').first().click();
  await page.locator('.compare-arena canvas').waitFor(); await page.waitForTimeout(700);
  await audit("compare", '.compare-condition-readouts');
  await page.locator('.compare-arena').screenshot({ path:`${dir}/compare-hero.png` });
  const explain = page.locator('.compare-hero-result .explain-meta-btn').first(); await explain.click();
  await page.getByText('Interpretation complete. Next hypothesis ready.', { exact:true }).waitFor();
  await nav('Evidence'); await audit("evidence");
  await page.getByRole('link', { name:'CausalFly home',exact:true }).click(); await audit("overview");
  await nav('Live Connectome'); await page.locator('.live-launcher').waitFor(); await audit("live-offline");
  assert.equal(await page.locator('.live-launcher').getAttribute('data-live-state'),'OFFLINE');
  assert.equal(await page.getByRole('button',{name:'START LIVE TRIAL',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'REPLAY VALIDATED RUN',exact:true}).click();
  await page.getByText('PARTIAL CAPTURE', { exact:false }).waitFor();
  await page.getByRole('button',{name:'Pause recorded replay',exact:true}).click();
  await page.getByText('REPLAY FRAME 1 / 4',{exact:true}).waitFor();
  assert.ok((await page.locator('.live-event-highlight').textContent()).includes('CURRENT FRAME'));
  assert.ok(!(await page.locator('.live-event-highlight').textContent()).includes('peaked'));
  assert.ok((await page.locator('.live-launcher').textContent()).includes('Protocol/source validated · Not biological validation'));
  await page.getByRole('button',{name:'Continue recorded replay',exact:true}).click();
  await audit("recorded-replay", '.live-launcher');
  assert.equal(await page.locator('.live-launcher').getAttribute('data-live-state'),'RECORDED_REPLAY');
  assert.equal(await page.locator('.live-launcher').getByText('LIVE', {exact:true}).count(),0);
  await page.getByRole('button',{name:/^View diagnostics/}).click();
  await page.getByRole('heading',{name:'Recorded simulation evidence',exact:true}).waitFor();
  await page.getByRole('button',{name:'REPLAY VALIDATED RUN',exact:true}).click();
  await page.getByRole('button',{name:'Pause recorded replay',exact:true}).click();
  await nav('Evidence'); await page.getByRole('region',{name:'Recorded simulation provenance'}).waitFor(); await audit('recorded-evidence'); await nav('Live Connectome');
  await page.getByRole('button',{name:'Return to live connection',exact:true}).click();
  assert.notEqual(await page.locator('.live-launcher').getAttribute('data-live-state'),'RECORDED_REPLAY');
  // Drive a fake EventSource through backend states, with genuine unmodified captured evidence.
  await page.evaluate(() => {
    window.EventSource = class { constructor() { window.__testerStream=this; } close(){} };
  });
  await page.getByRole('button',{name:'Reconnect backend',exact:true}).click();
  assert.equal(await page.locator('.live-launcher').getAttribute('data-live-state'),'CONNECTING');
  const recorded = JSON.parse(fs.readFileSync('docs/review/sprint-6b/recorded-evidence.json','utf8'));
  await page.evaluate(() => window.__testerStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'CONNECTED',message:'Verified offline review transport',evidence:null})}));
  await page.locator('.live-launcher[data-live-state=READY]').waitFor();
  // No host control endpoint exists: a ready telemetry-only connection must not claim trial control.
  assert.equal(await page.getByRole('button',{name:'START LIVE TRIAL',exact:true}).isDisabled(),true);
  await page.clock.install({ time:new Date(recorded[0].receivedAt) });
  await page.evaluate(evidence => window.__testerStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'DATA RECEIVED',message:'Genuine captured frame under fixed review clock',evidence})}),recorded[0]);
  await page.locator('.live-launcher[data-live-state=RUNNING]').waitFor();
  await page.clock.fastForward(5100); await page.locator('.live-launcher[data-live-state=READY]').waitFor();
  await page.evaluate(() => window.__testerStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'ERROR',message:'Review connection error',evidence:null})}));
  await page.locator('.live-launcher[data-live-state=ERROR]').waitFor();
  checks.push({name:'live-state-transitions',states:['OFFLINE','CONNECTING','READY','RUNNING','READY/stale','ERROR','RECORDED_REPLAY']});
  // Independent video session: force explicit live controls, mock only storage and analysis responses.
  const videoContext = await browser.newContext({ viewport:{width:1440,height:900} });
  const video = await videoContext.newPage(); video.on('pageerror',error=>errors.push(error.message));
  await videoContext.route('**/*', route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await videoContext.route('**/api/health',route=>route.fulfill({json:{metaMode:'live'}}));
  let attempts=0;
  await videoContext.route('**/api/media/authorize',route=>{ attempts++; return attempts === 1 ? route.fulfill({status:503,json:{error:'Private video upload is not enabled on this server.',code:'UPLOAD_NOT_CONFIGURED'}}) : attempts <= 3 ? route.fulfill({status:503,json:{error:'Private storage is temporarily unavailable. Retry explicitly.',code:'STORAGE_UNAVAILABLE'}}) : route.fulfill({json:{reference:{ticket:attempts===4?'offline-review-ticket':'replacement-review-ticket'},presignedUrl:'https://vercel.com/api/blob/?pathname=review.mp4'}}); });
  await video.goto(base,{waitUntil:'networkidle'});
  await video.locator('.scientist-action button').first().click();
  await video.getByRole('button', {name:/APPROVE.*RUN/i}).first().waitFor();
  await video.locator('.scientist-action button').first().click();
  await video.locator('.compare-transition-btn').first().waitFor();
  await video.getByRole('button',{name:'Recorded signal view',exact:true}).click();
  await video.getByRole('button',{name:'Real-world perception',exact:true}).click();
  await video.getByLabel('Choose video',{exact:true}).setInputFiles('public/perception-calibration.mp4');
  await video.getByRole('button',{name:'DISCOVER WITH META',exact:true}).waitFor();
  await video.getByRole('button',{name:'DISCOVER WITH META',exact:true}).click();
  await video.getByRole('alert').filter({hasText:'Private video upload'}).waitFor();
  assert.equal(await video.getByText('Private video upload is not enabled on this server.',{exact:true}).count(),1);
  assert.equal(await video.getByRole('button',{name:'Retry video analysis',exact:true}).count(),0);
  await video.getByText('VIDEO ANALYSIS UNAVAILABLE ON THIS HOST',{exact:true}).waitFor();
  await video.locator('.perception-error').scrollIntoViewIfNeeded(); await video.screenshot({path:`${dir}/video-configuration-blocked.png`});
  assert.equal(await video.getByRole('button',{name:'DISCOVER WITH META',exact:true}).isDisabled(),true);
  assert.equal(await video.getByLabel('Choose video',{exact:true}).evaluate(el=>el.files.length),1);
  await video.reload({waitUntil:'networkidle'});
  await video.locator('.scientist-action button').first().click();
  await video.getByRole('button', {name:/APPROVE.*RUN/i}).first().waitFor();
  await video.locator('.scientist-action button').first().click();
  await video.locator('.compare-transition-btn').first().waitFor();
  await video.getByRole('button',{name:'Recorded signal view',exact:true}).click();
  await video.getByRole('button',{name:'Real-world perception',exact:true}).click();
  await video.getByLabel('Choose video',{exact:true}).setInputFiles('public/perception-calibration.mp4');
  await video.getByRole('button',{name:'DISCOVER WITH META',exact:true}).click();
  await video.getByRole('alert').filter({hasText:'temporarily unavailable'}).waitFor();
  assert.equal(await video.locator('.workflow-error-notice:visible').count(),0);
  await video.getByRole('button',{name:'Retry video analysis',exact:true}).click();
  await video.getByRole('alert').filter({hasText:'temporarily unavailable'}).waitFor(); assert.equal(attempts,3);
  assert.equal(await video.getByLabel('Choose video',{exact:true}).evaluate(el=>el.files.length),1);
  assert.equal(await video.getByText('Private storage is temporarily unavailable. Retry explicitly.',{exact:true}).count(),1);
  assert.equal(await video.getByText('META SAM 3.1 — OBJECT TRACKED ✓',{exact:true}).count(),0);
  await video.locator('.perception-error').scrollIntoViewIfNeeded(); await video.screenshot({path:`${dir}/video-failure-retry.png`});
  let puts=0;
  await videoContext.route('https://vercel.com/api/blob/**', route => {puts++;return route.fulfill({status:200,body:''});});
  const scene = await video.request.post(base+'/api/perception/scene', { headers:{'X-Scene-Request':crypto.randomUUID()}, data:{mode:'fixture'} });
  assert.ok(scene.ok()); const sceneData = await scene.json(); assert.ok(sceneData.ok);
  const fixtureTracking=await (await video.request.post(base+'/api/perception',{headers:{'X-Perception-Request':crypto.randomUUID()},data:{mode:'fixture'}})).json();
  sceneData.scene.mode='META LIVE';sceneData.scene.model='INTERCEPTED FIXTURE — NO LIVE MUSE';
  sceneData.scene.result.summary=('Populated layout fixture. A growing calibration object can be selected explicitly. '.repeat(8)).slice(0,400);
  sceneData.scene.result.limitations=Array.from({length:5},()=>('Fixture limitation. No live model call or biological inference. '.repeat(8)).slice(0,400));
  const firstCandidate=sceneData.scene.result.candidates[0];
  sceneData.scene.result.candidates=Array.from({length:5},(_,i)=>({...firstCandidate,label:(i===0?'red square — ':'Layout candidate '+(i+1)+' — ').padEnd(80,'fixture ' ).slice(0,80),samPrompt:i===0?'red square':`candidate ${i+1}`,reason:('Fixture candidate explanation. Apparent expansion remains an input proxy and does not establish biological perception. '.repeat(5)).slice(0,400)}));
  const mediaRequests=[];
  let discoveries=0;
  await videoContext.route('**/api/perception/scene', async route => {discoveries++;mediaRequests.push(route.request().postDataJSON().media);await new Promise(resolve=>setTimeout(resolve,250));return route.fulfill({json:sceneData});});
  await video.getByRole('button',{name:'Retry video analysis',exact:true}).click();
  await video.getByText('UPLOAD RETAINED · Select an object to track.',{exact:true}).waitFor();
  await video.locator('.scene-candidates').waitFor();
  assert.equal(await video.getByRole('button',{name:'Upload again (expired or unavailable media)',exact:true}).count(),0);
  assert.equal(puts,1);
  assert.equal(await video.locator('.perception-error').count(),0); assert.equal(attempts,4);
  await video.locator('.meta-scene').screenshot({path:`${dir}/video-retry-success-fixture.png`});
  await video.locator('.scene-candidates').screenshot({path:`${dir}/scene-candidate-before-tracking.png`});
  await video.locator('.scene-candidates input[type=radio]').first().check();
  let trackingAttempts=0;
  fixtureTracking.perception.mode='SAM LIVE';
  fixtureTracking.perception.concept='red square';
  fixtureTracking.perception.measurement=humanRecoveryMeasurement(fixtureTracking.perception.media);
  fixtureTracking.perception.provenance.warnings.push('Authored human failure recovery fixture; no live provider request.');
  fixtureTracking.overlay={media:'video',revision:1,records:fixtureTracking.perception.measurement.frames.map((f,order)=>({kind:'box',order,objectId:'0',frame:{frameIndex:f.frameIndex},left:f.left,top:f.top,right:f.right,bottom:f.bottom})),diagnostics:[],rawOutput:''};
  await videoContext.route('**/api/perception',route=>{mediaRequests.push(route.request().postDataJSON().media);return ++trackingAttempts===1?route.fulfill({status:502,json:{ok:false,kind:'provider',error:'Temporary tracking transport failure.'}}):route.fulfill({json:fixtureTracking});});
  await video.locator('.scene-track').click();
  await video.getByRole('alert').filter({hasText:'Temporary tracking transport failure.'}).waitFor();
  await video.getByRole('button',{name:'Retry video analysis',exact:true}).click();
  await video.getByText('META SAM 3.1 — OBJECT TRACKED ✓',{exact:true}).waitFor();
  await video.locator('.perception-player canvas').waitFor();
  assert.equal(trackingAttempts,2,'Retry resumes tracking, rather than restarting discovery');
  assert.equal(attempts,4,'Tracking retry reuses the selected private upload');
  assert.equal(puts,1,'One PUT across Muse, candidate selection, failed SAM and explicit SAM retry');
  assert.equal(discoveries,1);
  assert.deepEqual(mediaRequests,Array(3).fill({ticket:'offline-review-ticket'}),'Muse and both SAM attempts receive the SAME reference');
  checks.push({name:'one-upload-guided-handoff',authorizationAttempts:attempts,successfulUploads:puts,discoveries,trackingAttempts,sameReference:true,fixtureOnly:true});
  await video.locator('.scene-limitations').evaluate(el=>el.open=true);
  const populated=await videoGeometry(video,dir,'populated-video-fixture');
  checks.push(...populated.map(c=>({name:'populated-video-fixture',...c,fixtureOnly:true})));
  checks.push(await reviewRetainedStimulusRecovery(video,videoContext,base,dir,fixtureTracking));
  // Intentional replacement discards old reference, requiring exactly one fresh upload.
  await video.getByRole('button',{name:'CHANGE VIDEO',exact:true}).click();
  await video.getByRole('button',{name:'Choose another video',exact:true}).click();
  await video.getByLabel('Choose video',{exact:true}).setInputFiles({name:'replacement.mp4',mimeType:'video/mp4',buffer:fs.readFileSync('public/perception-calibration.mp4')});
  await videoContext.route('**/api/perception/scene',route=>{assert.equal(route.request().postDataJSON().media.ticket,'replacement-review-ticket','Replacing the video must not submit the previous reference');return route.fulfill({status:400,json:{ok:false,kind:'media',mediaUnavailable:true,error:'Secure reference expired.'}});});
  await video.getByRole('button',{name:'DISCOVER WITH META',exact:true}).click();
  await video.getByText('Secure reference expired.',{exact:true}).waitFor();
  await video.getByRole('button',{name:'Upload again (expired or unavailable media)',exact:true}).waitFor();
  assert.equal(attempts,5);assert.equal(puts,2,'Replacing the selected file intentionally invalidates its old upload');
  checks.push({name:'replacement-and-verified-expiry',newUploadRequired:true,unavailableOnlyAfterServerVerification:true});
  await videoContext.close();
  checks.push(await reviewProxyClarity(browser,base,dir));
  fs.writeFileSync(`${dir}/results.json`,JSON.stringify({checks,errors},null,2));
  for (const width of [1920,1536,1440,1366]) {
    const headers = checks.filter(c => c.width === width && c.header).map(c => c.header);
    assert.ok(headers.every(h => JSON.stringify(h) === JSON.stringify(headers[0])), `Shared header geometry at ${width}`);
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${dir}/results.json`,JSON.stringify({checks,errors,providers:'Local deterministic fixtures and intercepted storage; no live provider verification'},null,2));
  console.log(JSON.stringify({checks:checks.length,errors}));
} finally { await browser.close(); }
