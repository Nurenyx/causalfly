// 10C.2 acceptance: all API actions intercepted; no live Muse/SAM or XR connection.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const modulePath = process.env.CAUSALFLY_PLAYWRIGHT_MODULE || path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");
const reviewURL = new URL(process.env.CAUSALFLY_REVIEW_URL || "http://127.0.0.1:3142");
assert.ok(["127.0.0.1", "localhost"].includes(reviewURL.hostname) && reviewURL.port === "3142", "Review must use local port 3142");
const { chromium } = await import(pathToFileURL(modulePath).href);
const fixtures = JSON.parse(fs.readFileSync("tmp/sprint10c2-fixtures.json", "utf8"));
const xr = JSON.parse(fs.readFileSync("tmp/sprint-6b/browser-fixtures.json", "utf8"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
await context.addInitScript(() => {
  window.EventSource = class { constructor() { window.__offlineStream = this; } close() {} };
});
const page = await context.newPage();
const dir = "docs/review/sprint-11a";
fs.mkdirSync(dir, { recursive: true });
const errors = [], checks = [], actions = [], blocked = [];
let modelDownloads = 0;
page.on("request", request => { if (request.url().endsWith("/FlyVisualV2_Web.glb")) modelDownloads++; });
page.on("pageerror", error => errors.push(error.message));
await context.route("**/*", async route => {
  const url = new URL(route.request().url());
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) { blocked.push(url.origin); return route.abort(); }
  if (!url.pathname.startsWith("/api/")) return route.continue();
  if (url.pathname === "/api/experiments") {
    const body = route.request().postDataJSON(); actions.push(body);
    const fixture = fixtures.find(f => body.action === "design" ? f.amplitude === body.stimulusAmplitude : f.design.design.id === body.id);
    assert.ok(fixture, `Unexpected fixture request ${JSON.stringify(body)}`);
    return route.fulfill({ json: body.action === "design" ? fixture.design : fixture.run });
  }
  assert.fail(`No API request authorized: ${url.pathname}`);
});
const nav = name => page.getByRole("navigation", { name: "Experiment workspaces" }).getByRole("button", { name, exact: true }).click();
const home = () => page.getByRole("link", { name: "CausalFly home", exact: true }).click();
const sourceConnect = () => page.locator(".source-connection").getByRole("button");
async function responsive(state) {
  for (const [width, height] of [[1920, 1080], [1440, 900], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    const toggle = page.getByRole('button', {name:/^Sources & connection/});
    if (width === 390 && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
    const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed').map(el => ({ tag: el.tagName, cls: el.className, right: el.getBoundingClientRect().right })).slice(0, 8));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${state} overflow at ${width}: ${JSON.stringify(overflow)}`);
    assert.equal(await sourceConnect().isVisible(), true);
    checks.push({ state, width, height, noHorizontalOverflow: true });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
}
async function popover(button, method) {
  await page.mouse.move(0, 0); await page.evaluate(() => document.activeElement?.blur());
  if (method === "hover") await button.hover(); else if (method === "focus") await button.focus(); else await button.click();
  assert.equal(await button.getAttribute("aria-expanded"), "true");
  const id = await button.getAttribute("aria-describedby");
  const tip = page.locator(`[id="${id}"]`);
  assert.equal(await tip.isVisible(), true);
  const rect = await tip.boundingBox(); const size = page.viewportSize();
  assert.ok(rect.x >= 0 && rect.x + rect.width <= size.width && rect.y + rect.height <= size.height, "Popover stays in viewport");
  await button.press("Escape");
  assert.equal(await button.getAttribute("aria-expanded"), "false");
  await page.mouse.move(0, 0); await button.evaluate(el => el.blur());
}
async function shell() {
  return page.locator('.primary-navigation button[aria-current="page"]').evaluate(el => {
    const s = getComputedStyle(el);
    return Object.fromEntries(['fontSize','fontFamily','fontWeight','padding','minHeight','backgroundColor','color','borderColor','boxShadow'].map(key => [key,s[key]]));
  });
}
async function capture(name, mobile = false) {
  await page.setViewportSize({ width: mobile ? 390 : 1920, height: mobile ? 844 : 1080 });
  if (mobile) {
    const toggle = page.getByRole('button', {name:/^Sources & connection/});
    if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click();
  }
  await page.mouse.move(0, 0); await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: mobile });
}
try {
  await page.goto(reviewURL.href, { waitUntil: "domcontentloaded" });
  await page.getByRole('heading', { name: 'Ask a nervous system a question.' }).waitFor();
  assert.equal(await page.locator('.primary-navigation [aria-current]').count(), 0);
  assert.equal(actions.length, 0);
  await responsive('home');
  const meta = page.locator('.status-indicator-button').first();
  for (const method of ['hover','focus','click']) await popover(meta, method);
  assert.match(await page.locator('.status-indicator').first().textContent(), /META AI AVAILABLE|OFFLINE META MODE/);
  await popover(page.getByRole('button', { name: 'FRUITFLY XR status', exact: true }), 'focus');
  for (const label of ['Open Experiment', 'Open Live Connectome', 'Open Evidence']) {
    await page.getByRole('button', { name: new RegExp(label) }).click();
    assert.equal(await page.getByRole('heading', { name: 'Welcome to CausalFly', exact: true }).count(), 0);
    await home();
  }
  for (const [width,height] of [[1920,1080],[1440,900],[390,844]]) {
    await page.setViewportSize({width,height});
    await nav('Experiment'); const first = await shell();
    await nav('Live Connectome'); assert.deepEqual(await shell(), first);
    await nav('Evidence'); assert.deepEqual(await shell(), first);
    assert.equal(await page.getByRole('navigation', { name: 'Live Connectome progress' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Connect FruitFly XR', exact: true }).count(), 1);
    checks.push({state:'identical-primary-navigation',width,height});
  }
  await page.setViewportSize({width:1920,height:1080}); await nav('Experiment');
  assert.equal(await page.getByRole('button', {name:'Anatomical',exact:true}).getAttribute('aria-pressed'), 'true');
  const world = page.locator('canvas[data-world-camera]');
  await page.locator('canvas[data-fly-model="ready"]').waitFor();
  const worldInitial = JSON.parse(await world.getAttribute('data-world-camera'));
  const worldBox = await world.boundingBox();
  await page.mouse.move(worldBox.x+worldBox.width/2,worldBox.y+worldBox.height/2);
  await page.mouse.down(); await page.mouse.move(worldBox.x+worldBox.width/2+60,worldBox.y+worldBox.height/2+20,{steps:8}); await page.mouse.up();
  assert.notDeepEqual(JSON.parse(await world.getAttribute('data-world-camera-view')).position,worldInitial.position);
  await page.mouse.wheel(0,120);
  await page.getByRole('button',{name:'Reset View',exact:true}).click();
  await page.waitForFunction(expected => JSON.parse(document.querySelector('canvas[data-world-camera]').getAttribute('data-world-camera-view')).position.every((v,i)=>Math.abs(v-expected[i])<1e-8),worldInitial.position);
  await page.getByRole('button', { name: 'Ask Your Own Question', exact: false }).click();
  await page.getByRole('textbox', {name:'Your research question'}).fill('Does silencing primary_a reduce output with a weaker input?');
  await page.getByRole('button', {name:'USE THIS QUESTION',exact:true}).click();
  assert.equal(await page.getByRole('textbox', {name:'Your research question'}).count(),0);
  assert.equal(actions.length,0);
  await page.getByLabel('Stimulus strength',{exact:true}).fill('0.6');
  await home(); await page.getByRole('button',{name:/Open Experiment/}).click();
  assert.equal(await page.getByLabel('Stimulus strength',{exact:true}).inputValue(),'0.6');
  assert.match(await page.locator('.retained-question').innerText(),/weaker input/);
  await page.getByRole('button',{name:'Lightweight',exact:true}).click();
  assert.equal(await page.getByLabel('Stimulus strength',{exact:true}).inputValue(),'0.6');
  await page.getByRole('button',{name:'Design with Meta',exact:false}).click();
  await page.getByRole('button',{name:'Approve & Run Experiment',exact:true}).waitFor();
  await page.getByText('Review Meta design & settings',{exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Approve & Run Experiment',exact:true}).count(),1);
  await page.getByText('Review Meta design & settings',{exact:true}).click();
  await page.getByLabel('Stimulus strength',{exact:true}).fill('0.4');
  await page.getByRole('button',{name:'Redesign with Meta',exact:false}).click();
  await page.getByRole('button',{name:'Approve & Run Experiment',exact:true}).click();
  const controls = page.getByRole('group',{name:'Select recorded condition'});
  await controls.waitFor();
  assert.equal(await page.getByLabel('Stimulus strength',{exact:true}).inputValue(),'0.4');
  const pane = await page.locator('.embodied-signals').boundingBox(), c = await controls.boundingBox();
  assert.ok(Math.abs(c.x+c.width/2-pane.x-pane.width/2)<2);
  assert.equal(await page.locator('.embodied-caption details[open]').count(),0);
  for (const label of ['Input','Stimulus strength','Recorded signal','Real-fly validation','Controlled model','Flight Recorder']) await popover(page.getByRole('button',{name:`About ${label}`,exact:true}).first(),'focus');
  await responsive('experiment-measured');
  await nav('Live Connectome');
  await page.getByRole('button',{name:'Stage 03: UNDERSTAND',exact:true}).click();
  await page.getByLabel('FruitFly XR observational analysis',{exact:true}).waitFor();
  assert.equal(await page.locator('.primary-navigation [aria-current="page"]').getAttribute('aria-label'),'Live Connectome');
  assert.match(await page.locator('.xr-scientific-limit').innerText(),/does not establish causal effect/);
  assert.equal(actions.length,3);
  await responsive('connectome-understand');
  await page.getByRole('button',{name:'Stage 01: QUESTION',exact:true}).click();
  await page.getByRole('button',{name:'Set Investigation Question',exact:true}).click();
  const cloud = page.locator('canvas[data-camera-fit]'); await cloud.waitFor();
  const initial = JSON.parse(await cloud.getAttribute('data-camera-fit'));
  assert.ok(initial.shortAxisCoverage>.7 && initial.shortAxisCoverage<=.8);
  await cloud.scrollIntoViewIfNeeded();
  const visibleBox=await cloud.boundingBox();
  await page.mouse.move(visibleBox.x+visibleBox.width/2,visibleBox.y+visibleBox.height/2);await page.mouse.down();await page.mouse.move(visibleBox.x+visibleBox.width/2+80,visibleBox.y+visibleBox.height/2+25,{steps:8});await page.mouse.up();
  await page.waitForFunction(expected => {
    const view = JSON.parse(document.querySelector('canvas[data-camera-fit]').getAttribute('data-camera-view'));
    return view.position.some((value,i) => Math.abs(value-expected.position[i])>1e-5);
  }, initial);
  const adjusted=await cloud.getAttribute('data-camera-view');
  await sourceConnect().click();
  for (const snapshot of xr.snapshots.slice(0,3)) await page.evaluate(snapshot => window.__offlineStream.onmessage(new MessageEvent('message',{data:JSON.stringify(snapshot)})),snapshot);
  assert.equal(await cloud.getAttribute('data-camera-view'),adjusted);
  assert.equal(await sourceConnect().innerText(),'Disconnect');
  await page.getByRole('button',{name:'Reset View',exact:true}).click();
  await page.waitForFunction(expected => {
    const view = JSON.parse(document.querySelector('canvas[data-camera-fit]').getAttribute('data-camera-view'));
    return view.position.every((value,i) => Math.abs(value-expected.position[i])<1e-8) && view.target.every((value,i) => Math.abs(value-expected.center[i])<1e-8);
  }, initial);
  await nav('Evidence');assert.equal(await sourceConnect().innerText(),'Disconnect');
  assert.equal(await page.getByRole('navigation',{name:'Live Connectome progress'}).count(),0);
  assert.equal(await page.locator('.evidence-methodology[open]').count(),0);
  await responsive('evidence');
  await nav('Live Connectome');
  await page.getByRole('button',{name:'Stage 03: UNDERSTAND',exact:true}).click();
  await page.getByLabel('FruitFly XR observational analysis',{exact:true}).waitFor();
  assert.match(await page.locator('.xr-question-answer').innerText(),/QUESTION ASKED/);
  await page.getByRole('button',{name:'Stage 02: OBSERVE',exact:true}).click();
  await page.getByRole('button',{name:'Reset View',exact:true}).click();
  assert.deepEqual(JSON.parse(await cloud.getAttribute('data-camera-fit')),initial);
  await page.setViewportSize({width:1440,height:900});
  await page.waitForFunction(old=>JSON.parse(document.querySelector('canvas[data-camera-fit]').getAttribute('data-camera-fit')).aspect!==old,initial.aspect);
  await responsive('connectome-observe');
  await nav('Experiment');await nav('Live Connectome');
  assert.deepEqual(JSON.parse(await cloud.getAttribute('data-camera-fit')),initial);
  await sourceConnect().click();
  await page.setViewportSize({width:390,height:844});
  await popover(page.getByRole('button',{name:'FRUITFLY XR status',exact:true}),'click');
  await home();await popover(meta,'click');
  // Four final screenshots only, after all assertions and layout adjustments.
  await capture('01-home-overview-1920');
  await nav('Experiment');await page.getByRole('button',{name:'Anatomical',exact:true}).click();
  await page.locator('canvas[data-fly-model="ready"]').waitFor();
  await capture('02-experiment-1920');
  await nav('Live Connectome');await page.getByRole('button',{name:'Reset View',exact:true}).click();
  await capture('03-live-connectome-1920');
  await nav('Experiment');await capture('04-experiment-mobile-390',true);
  assert.equal(modelDownloads,1,'GLB is cached across workspace/model changes');
  const failurePage = await context.newPage();
  await failurePage.route('**/models/flyv2/FlyVisualV2_Web.glb', route => route.abort());
  await failurePage.goto(reviewURL.href,{waitUntil:'domcontentloaded'});
  await failurePage.getByRole('button',{name:/Open Experiment/}).click();
  await failurePage.locator('canvas[data-fly-model="fallback"]').waitFor();
  await failurePage.getByText(/Anatomical model unavailable.*Lightweight fallback/).waitFor();
  await failurePage.close();
  assert.equal(errors.length,0,errors.join('\n'));
  fs.writeFileSync(`${dir}/browser-checks.json`,JSON.stringify({checks,actions,errors,blockedExternalOrigins:blocked,liveMuseCalls:0,liveSamCalls:0,screenshots:4,modelDownloads,anatomicalDefault:true,experimentOrbitZoomReset:true,automaticFailureFallback:true,cameraInitial:initial,sourceReloadRecenters:true,telemetryPreservesCamera:true,questionSubmissionExplicit:true,homeRetainsDraft:true,singleApproval:true,methodologyInitiallyClosed:true,statusInteractionMethods:['hover','focus','click','Escape'],liveUnderstandContained:true},null,2)+'\n');
  console.log(JSON.stringify({responsiveChecks:checks.length,actions:actions.length,screenshots:4,liveMuseCalls:0,liveSamCalls:0,errors}));
} finally { await browser.close(); }
