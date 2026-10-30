// Local production acceptance. No external requests or live providers.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.env.CAUSALFLY_PLAYWRIGHT_MODULE || path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs")).href);
const base = "http://127.0.0.1:3142";
const browser = await chromium.launch({channel:"msedge",headless:true});
const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce",acceptDownloads:true});
const page = await context.newPage(), calls = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.origin !== base) return route.abort();
  if (url.pathname.startsWith('/api/')) calls.push({path:url.pathname,method:route.request().method(),bytes:route.request().postDataBuffer()?.length ?? 0});
  return route.continue();
});
const nav = name => page.getByRole('navigation',{name:'Experiment workspaces'}).getByRole('button',{name,exact:true}).click();
const dir = 'docs/review/sprint-11b';fs.mkdirSync(dir,{recursive:true});
try {
  await page.goto(base);
  const health = await (await page.request.get(base+'/api/health')).json();
  assert.equal(health.metaMode,'offline');assert.equal(health.metaEnabled,false);assert.equal(health.providersChecked,false);
  await page.getByRole('button',{name:/Open Experiment/}).click();
  await page.getByRole('button',{name:'Real-world perception',exact:true}).click();
  await page.getByRole('button',{name:'LOAD OFFLINE CALIBRATION SCENE',exact:true}).click();
  await page.getByRole('radio',{name:/red square/}).check();
  await page.getByRole('button',{name:'LOAD OFFLINE TRACKING FIXTURE',exact:true}).click();
  await page.getByRole('button',{name:'DESIGN EXPERIMENT WITH THIS STIMULUS',exact:true}).click();
  await page.getByRole('button',{name:'Approve & Run Experiment',exact:true}).click();
  await page.getByRole('group',{name:'Select recorded condition'}).waitFor();
  assert.match(await page.locator('.perception-metrics').innerText(),/0.640/);
  await nav('Evidence');await nav('Experiment');
  assert.match(await page.locator('.perception-metrics').innerText(),/0.640/);
  // Export the actual retained server record, after deterministic measurement.
  await page.locator('details').evaluateAll(items => items.forEach(item => { item.open = true; }));
  await page.waitForTimeout(200);
  await page.locator('details').evaluateAll(items => items.forEach(item => { item.open = true; }));
  const details = page.locator('details.run-diagnostics').filter({hasText:'experiment.comparison.completed'}).first();
  await details.evaluate(item => { item.open = true; });
  const downloadPromise = page.waitForEvent('download');
  await details.getByRole('button',{name:'EXPORT RUN DIAGNOSTICS',exact:true}).click();
  const download = await downloadPromise;
  const exported = fs.readFileSync(await download.path(),'utf8');
  assert.match(exported,/OFFLINE SAM FIXTURE/);assert.doesNotMatch(exported,/presignedUrl|vercel-blob-signature|clientSigningToken|BLOB_READ_WRITE_TOKEN|Bearer /);
  const diagnostics = JSON.parse(exported);
  assert.equal(diagnostics.manifest.measurements.control.outputPeakActivity,.64);
  assert.equal(diagnostics.manifest.measurements.perturbed.outputPeakActivity,.32);
  await page.screenshot({path:dir+'/05-offline-perception-1440.png',fullPage:true});
  // Mock ONLY the storage/provider boundaries in a second page; test real direct PUT browser transport.
  const uploadPage = await context.newPage();
  await uploadPage.route('**/api/health', route => route.fulfill({json:{metaMode:'live',metaEnabled:true,providersChecked:false}}));
  let authorizationBytes = 0, uploadBytes = 0, referenceBytes = 0, authorizationCalls = 0, sceneAttempts = 0;
  await uploadPage.route('**/api/media/authorize', route => {
    authorizationCalls++; authorizationBytes = route.request().postDataBuffer().length;
    const body = route.request().postDataJSON();assert.equal(body.sizeBytes,20*1024*1024);assert.equal(body.contentType,'video/mp4');assert.equal(body.pathname,undefined);
    return route.fulfill({json:{reference:{ticket:'mock-reference'},presignedUrl:base+'/mock-private-blob'}});
  });
  await uploadPage.route('**/mock-private-blob', async route => {
    assert.equal(route.request().method(),'PUT');uploadBytes=route.request().postDataBuffer().length;
    await new Promise(resolve=>setTimeout(resolve,300));return route.fulfill({status:200,json:{}});
  });
  const fixtureRequest = await page.request.post(base+'/api/perception/scene',{headers:{'X-Scene-Request':crypto.randomUUID()},data:{mode:'fixture'}});
  const fixtureScene = await fixtureRequest.json();
  await uploadPage.route('**/api/perception/scene', route => {
    referenceBytes=route.request().postDataBuffer().length;
    assert.deepEqual(route.request().postDataJSON(),{mode:'live',media:{ticket:'mock-reference'}});
    sceneAttempts++;
    if (sceneAttempts === 1) return route.fulfill({status:502,json:{ok:false,error:'Mock provider unavailable. Retry explicitly.',kind:'provider'}});
    return route.fulfill({json:fixtureScene});
  });
  // Interception bypasses native network upload progress; emulate its event at the storage boundary.
  await uploadPage.addInitScript(() => {
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
      if (body instanceof File) setTimeout(() => this.upload.dispatchEvent(new ProgressEvent('progress',{lengthComputable:true,loaded:body.size/2,total:body.size})),100);
      return Reflect.apply(send,this,[body]);
    };
  });
  await uploadPage.goto(base);await uploadPage.getByRole('button',{name:/Open Experiment/}).click();
  await uploadPage.getByRole('button',{name:'Real-world perception',exact:true}).click();
  const clip=fs.readFileSync('public/perception-calibration.mp4'), padded=Buffer.alloc(20*1024*1024);clip.copy(padded);
  await uploadPage.getByLabel('Choose video',{exact:true}).setInputFiles({name:'boundary.mp4',mimeType:'video/mp4',buffer:padded});
  const discover=uploadPage.getByRole('button',{name:'DISCOVER WITH META',exact:true});await discover.waitFor();
  await uploadPage.evaluate(() => {
    window.__uploadStages = [];
    new MutationObserver(() => document.querySelectorAll('[role="status"]').forEach(item => { const text=item.textContent; if (/Preparing upload|Uploading|Upload complete/.test(text)) window.__uploadStages.push(text); })).observe(document.body,{childList:true,subtree:true,characterData:true});
  });
  await discover.click();
  await uploadPage.getByText('Upload complete · ready',{exact:true}).waitFor();
  await uploadPage.getByRole('alert').filter({hasText:'Mock provider unavailable'}).first().waitFor();
  await uploadPage.getByRole('button',{name:'Discover again with Meta',exact:true}).click();
  await uploadPage.getByRole('radio',{name:/red square/}).waitFor();
  assert.equal(authorizationCalls,1,'Provider retry must reuse the uploaded reference');
  const uploadStages=await uploadPage.evaluate(()=>window.__uploadStages);
  assert.ok(uploadStages.some(stage=>stage.includes('Preparing upload')));
  assert.ok(uploadStages.some(stage=>stage.includes('Uploading — 50%')));
  assert.ok(uploadStages.some(stage=>stage.includes('Upload complete')));
  assert.equal(uploadBytes,20*1024*1024);assert.ok(authorizationBytes<1024);assert.ok(referenceBytes<1024);
  await uploadPage.screenshot({path:dir+'/06-upload-ready-1440.png',fullPage:true});
  assert.equal(errors.length,0,errors.join('\n'));
  fs.writeFileSync(dir+'/perception-checks.json',JSON.stringify({health,calls,offlineEndToEnd:true,diagnosticExportSafe:true,deterministicPeaks:[.64,.32],directUploadBytes:uploadBytes,authorizationBytes,referenceBytes,storageMocked:true,providerRetryReusesUpload:true,uploadStages:[...new Set(uploadStages)],liveMuseCalls:0,liveSamCalls:0,errors},null,2));
  console.log(JSON.stringify({offlineEndToEnd:true,directUploadBytes:uploadBytes,authorizationBytes,referenceBytes,errors}));
} finally {await browser.close();}
