// Local production acceptance: deterministic Meta fixtures; no paid provider or XR calls.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs")).href);
const base = "http://127.0.0.1:3464";
const dir = "docs/review/sprint-16a"; fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
const page = await context.newPage(); const errors = [], checks = [];
page.on("pageerror", error => errors.push(error.message));
await context.route("**/*", route => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const nav = name => page.getByRole("navigation", { name: "Experiment workspaces" }).getByRole("button", { name, exact: true }).click();
async function audit(name, target) {
  for (const [width, height] of [[1920,1080],[1440,900],[1366,768]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(250);
    if (target) await page.locator(target).scrollIntoViewIfNeeded(); else await page.evaluate(() => window.scrollTo(0,0));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: horizontal overflow at ${width}`);
    const header = await page.locator('.page-header').evaluate(el => { const s = getComputedStyle(el); return { padding:s.padding,font:getComputedStyle(el.querySelector('h1')).fontSize }; });
    if (name === "compare") {
      const arena = await page.locator('.compare-arena').boundingBox(); assert.ok(arena.height >= 440);
      const cards = await page.locator('.compare-condition-readouts').boundingBox(); assert.ok(cards.y + cards.height <= arena.y + 1, "Readouts cannot overlap the canvas");
      const controls = await page.locator('.compare-playback-container button:visible').all();
      const rects = await Promise.all(controls.map(el => el.boundingBox()));
      for (let i=0;i<rects.length;i++) for(let j=i+1;j<rects.length;j++) { const a=rects[i],b=rects[j]; assert.ok(!a||!b||Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)<=1||Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)<=1, "Compare buttons overlap"); }
    }
    await page.screenshot({ path:`${dir}/${name}-${width}.png` }); checks.push({ name,width,height,noHorizontalOverflow:true,header });
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
  await page.locator('.compare-transition-btn').first().click();
  await page.locator('.compare-arena canvas').waitFor(); await page.waitForTimeout(700);
  await audit("compare", '.compare-condition-readouts');
  await page.locator('.compare-arena').screenshot({ path:`${dir}/compare-hero.png` });
  const explain = page.locator('.compare-hero-result .explain-meta-btn').first(); await explain.click();
  await page.getByText('Interpretation complete. Next hypothesis ready.', { exact:true }).waitFor();
  await nav('Evidence'); await audit("evidence");
  await page.getByRole('link', { name:'CausalFly home',exact:true }).click(); await audit("overview");
  await nav('Live Connectome'); await page.locator('.live-launcher').waitFor(); await audit("live-offline");
  assert.equal(await page.getByRole('button',{name:'START LIVE TRIAL',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'REPLAY VALIDATED RUN',exact:true}).click();
  await page.getByText('PARTIAL CAPTURE', { exact:false }).waitFor();
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
  checks.push({name:'live-state-transitions',states:['OFFLINE/ERROR','CONNECTING','READY','RUNNING','READY/stale','ERROR','RECORDED_REPLAY']});
  // Independent video session: force explicit live controls, mock only storage and analysis responses.
  const videoContext = await browser.newContext({ viewport:{width:1440,height:900} });
  const video = await videoContext.newPage(); video.on('pageerror',error=>errors.push(error.message));
  await videoContext.route('**/*', route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await videoContext.route('**/api/health',route=>route.fulfill({json:{metaMode:'live'}}));
  let attempts=0;
  await videoContext.route('**/api/media/authorize',route=>{ attempts++; return attempts <= 2 ? route.fulfill({status:503,json:{error:'Private video upload is not enabled on this server. Your video remains local.'}}) : route.fulfill({json:{reference:{ticket:'offline-review-ticket'},presignedUrl:'https://vercel.com/api/blob/?pathname=review.mp4'}}); });
  await video.goto(base,{waitUntil:'networkidle'});
  await video.getByRole('button',{name:'Real-world perception',exact:true}).click();
  await video.getByLabel('Choose video',{exact:true}).setInputFiles('public/perception-calibration.mp4');
  await video.getByRole('button',{name:'DISCOVER WITH META',exact:true}).waitFor();
  await video.getByRole('button',{name:'DISCOVER WITH META',exact:true}).click();
  await video.getByRole('alert').filter({hasText:'Private video upload'}).waitFor();
  assert.equal(await video.getByText('Private video upload is not enabled on this server. Your video remains local.',{exact:true}).count(),1);
  assert.equal(await video.locator('.workflow-error-notice:visible').count(),0);
  await video.getByRole('button',{name:'Retry video analysis',exact:true}).click();
  await video.getByRole('alert').filter({hasText:'Private video upload'}).waitFor(); assert.equal(attempts,2);
  assert.equal(await video.getByLabel('Choose video',{exact:true}).evaluate(el=>el.files.length),1);
  assert.equal(await video.getByText('Private video upload is not enabled on this server. Your video remains local.',{exact:true}).count(),1);
  assert.equal(await video.getByText('META SAM 3.1 — OBJECT TRACKED ✓',{exact:true}).count(),0);
  await video.locator('.perception-error').scrollIntoViewIfNeeded(); await video.screenshot({path:`${dir}/video-failure-retry.png`});
  await videoContext.route('https://vercel.com/api/blob/**', route => route.fulfill({status:200,body:''}));
  const scene = await video.request.post(base+'/api/perception/scene', { headers:{'X-Scene-Request':crypto.randomUUID()}, data:{mode:'fixture'} });
  assert.ok(scene.ok()); const sceneData = await scene.json(); assert.ok(sceneData.ok);
  await videoContext.route('**/api/perception/scene', route => route.fulfill({json:sceneData}));
  await video.getByRole('button',{name:'Retry video analysis',exact:true}).click();
  await video.getByText('Upload complete · not yet analyzed',{exact:true}).waitFor();
  await video.getByText('OFFLINE SCENE-UNDERSTANDING FIXTURE',{exact:true}).first().waitFor();
  assert.equal(await video.locator('.perception-error').count(),0); assert.equal(attempts,3);
  await video.locator('.meta-scene').screenshot({path:`${dir}/video-retry-success-fixture.png`});
  checks.push({name:'video-failure-retry',attempts,visibleFailureErrors:1,fileRetained:true,retryUploadSucceeded:true,trackingAnalyzed:false,analysisResponse:'Authored offline scene fixture'});
  await videoContext.close();
  fs.writeFileSync(`${dir}/results.json`,JSON.stringify({checks,errors},null,2));
  for (const width of [1920,1440,1366]) {
    const headers = checks.filter(c => c.width === width).map(c => c.header);
    assert.ok(headers.every(h => JSON.stringify(h) === JSON.stringify(headers[0])), `Shared header geometry at ${width}`);
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${dir}/results.json`,JSON.stringify({checks,errors,providers:'Local deterministic fixtures and intercepted storage; no live provider verification'},null,2));
  console.log(JSON.stringify({checks:checks.length,errors}));
} finally { await browser.close(); }
