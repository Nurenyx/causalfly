// Offline UX acceptance. Experiment templates are served locally; all live model
// endpoints are blocked and XR telemetry is replayed in this browser only.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const modulePath = process.env.CAUSALFLY_PLAYWRIGHT_MODULE || path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
await context.addInitScript(() => {
  window.__modelStates = [];
  new MutationObserver(records => { for (const r of records) if (r.attributeName === "data-fly-model") window.__modelStates.push(r.target.getAttribute("data-fly-model")); }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-fly-model"] });
  window.EventSource = class { constructor() { window.__offlineStream = this; } close() {} };
});
const page = await context.newPage();
const dir = "docs/review/sprint-10c1"; fs.mkdirSync(dir, { recursive: true });
const errors = [], requests = [], checks = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => { if (request.method() === "POST") requests.push({ path: new URL(request.url()).pathname, body: request.headers()["content-type"]?.includes("json") ? request.postDataJSON() : undefined }); });
await context.route("**/api/perception{,/**}", route => { assert.fail(`No perception requests authorized in this UX review: ${route.request().url()}`); });
await context.route("**/api/sources/fruitfly/analyze", () => assert.fail("No live observational Meta calls"));
const nav = name => page.getByRole("navigation", { name: "Experiment workspaces" }).getByRole("button", { name, exact: true }).click();
async function responsive(state) {
  for (const width of [1920, 1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${state} overflow at ${width}`);
    if (state === "measured-adjusted-input") {
      const legend = await page.locator('.embodied-signals .chart-legend').boundingBox();
      const selector = await page.locator('.embodied-signals .embodied-condition-switch').boundingBox();
      assert.ok(legend.y + legend.height <= selector.y, `Chart legend stays above condition selector at ${width}: legend bottom ${legend.y + legend.height}, selector top ${selector.y}`);
    }
    checks.push({ state, width, noHorizontalOverflow: true });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
}
async function capture(name, width = 1920) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
  await page.evaluate(() => window.scrollTo(0, 0));
  if (name.includes("connectome")) await page.locator("canvas[data-camera-fit]").evaluate(el => el.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: width === 390 });
}
async function help(label, method) {
  const button = page.getByRole("button", { name: `About ${label}`, exact: true }).first();
  if (method === "hover") await button.hover(); else if (method === "focus") await button.focus(); else await button.click();
  assert.equal(await button.getAttribute("aria-expanded"), "true");
  const id = await button.getAttribute("aria-describedby");
  assert.equal(await page.locator(`[id="${id}"]`).isVisible(), true);
  await button.press("Escape");
  assert.equal(await button.getAttribute("aria-expanded"), "false");
  await page.mouse.move(0, 0); await button.evaluate(el => el.blur());
}
async function shellSnapshot() {
  await page.mouse.move(0, 0);
  return page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar'), active = sidebar.querySelector('nav button.active');
    const snapshot = (element, keys) => Object.fromEntries(keys.map(key => [key, getComputedStyle(element)[key]]));
    return {
      width: sidebar.getBoundingClientRect().width,
      sidebar: snapshot(sidebar, ['backgroundColor', 'backgroundImage', 'paddingLeft', 'paddingRight', 'color']),
      active: snapshot(active, ['fontSize', 'fontFamily', 'fontWeight', 'padding', 'minHeight', 'backgroundColor', 'backgroundImage', 'color', 'borderColor']),
      workspace: snapshot(document.querySelector('.workspace'), ['backgroundColor']),
      content: snapshot(document.querySelector('.main-content'), ['backgroundColor', 'paddingLeft', 'paddingRight']),
      header: snapshot(document.querySelector('.topbar'), ['backgroundColor', 'backgroundImage']),
    };
  });
}
async function resetWorld() {
  const world = page.locator('.embodied-arena canvas[data-world-camera]');
  const canonical = JSON.parse(await world.getAttribute('data-world-camera'));
  const box = await world.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 55, box.y + box.height / 2 + 20, { steps: 5 }); await page.mouse.up();
  await page.locator('.embodied-arena').getByRole('button', { name: 'Reset View', exact: true }).click();
  await page.waitForFunction(expected => {
    const view = JSON.parse(document.querySelector('.embodied-arena canvas').getAttribute('data-world-camera-view'));
    return view && view.position.every((value, i) => Math.abs(value - expected.position[i]) < 1e-8) && view.target.every((value, i) => Math.abs(value - expected.target[i]) < 1e-8);
  }, canonical);
}
try {
  let releaseModel;
  const gate = new Promise(resolve => { releaseModel = resolve; });
  await page.route("**/models/flyv2/FlyVisualV2_Web.glb", async route => { await gate; await route.continue(); });
  await page.goto(process.env.CAUSALFLY_REVIEW_URL || "http://127.0.0.1:3122", { waitUntil: "domcontentloaded" });
  assert.match(await page.locator(".header-badges").innerText(), /FAKE META CLIENT/);
  await page.locator('canvas[data-fly-model="loading"]').waitFor();
  assert.equal(await page.getByText("Loading anatomical model…", { exact: true }).isVisible(), true);
  assert.equal(await page.evaluate(() => window.__modelStates.includes("lightweight") || window.__modelStates.includes("fallback")), false, "No procedural flash during GLB load");
  releaseModel();
  await page.locator('canvas[data-fly-model="ready"]').waitFor();
  assert.equal(requests.length, 0);
  await resetWorld();
  await responsive("initial"); await capture("01-initial-anatomical-selector-1920");
  for (const width of [1920, 1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await nav('Experiment'); const experimentShell = await shellSnapshot();
    await nav('Live Connectome'); const connectomeShell = await shellSnapshot();
    await nav('Evidence'); const evidenceShell = await shellSnapshot();
    assert.deepEqual(connectomeShell, experimentShell, `Live Connectome shell consistency at ${width}`);
    assert.deepEqual(evidenceShell, experimentShell, `Evidence shell consistency at ${width}`);
    checks.push({ state: 'shared-shell', width, identicalNavigationAndBackgrounds: true });
  }
  await page.setViewportSize({ width: 1920, height: 1080 }); await nav('Experiment');
  await page.getByRole("button", { name: "Lightweight", exact: true }).click();
  await page.locator('canvas[data-fly-model="lightweight"]').waitFor();
  assert.equal(await page.getByLabel("Stimulus strength", { exact: true }).inputValue(), "1");
  await page.getByRole("button", { name: "Anatomical", exact: true }).click();
  await page.locator('canvas[data-fly-model="ready"]').waitFor(); assert.equal(requests.length, 0);
  await help("Input", "hover"); await help("Stimulus strength", "focus"); await help("Recorded signal", "click"); await help("Real-fly validation", "focus");
  await page.getByRole("button", { name: "Ask Your Own Question", exact: false }).click();
  await page.getByRole("textbox", { name: "Your research question" }).fill("Does silencing primary_a reduce output with a weaker input?");
  assert.equal(requests.length, 0);
  assert.equal(await page.locator(".scientist-action .primary-button").count(), 0, "Save question before design becomes the next action");
  await responsive("question-edit"); await capture("02-custom-question-edit-submit-1920");
  await page.getByRole("textbox", { name: "Your research question" }).press("Control+Enter");
  assert.equal(await page.getByRole("textbox", { name: "Your research question" }).count(), 0);
  assert.equal(requests.length, 0, "Question submission is local only");
  await page.getByRole("button", { name: "Ask Your Own Question", exact: false }).click();
  await page.getByRole("button", { name: "USE THIS QUESTION", exact: true }).click();
  assert.equal(requests.length, 0, "Mouse submission is also local only");
  await page.getByLabel("Stimulus strength", { exact: true }).fill("0.6");
  await page.waitForFunction(() => document.querySelector('#stimulus-strength')?.value === '0.6');
  await nav("Evidence"); await nav("Experiment");
  assert.equal(await page.getByLabel("Stimulus strength", { exact: true }).inputValue(), "0.6", "Draft survives navigation before design");
  await page.getByRole("button", { name: "Design with Meta", exact: false }).click();
  await page.getByRole("button", { name: "Approve & Run Experiment", exact: true }).waitFor();
  const designed = requests.find(r => r.body?.action === "design"); assert.equal(designed.body.stimulusAmplitude, .6);
  await page.getByText("Review Meta design & settings", { exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Approve & Run Experiment", exact: true }).count(), 1);
  await page.getByText("Review Meta design & settings", { exact: true }).click();
  await page.getByLabel("Stimulus strength", { exact: true }).fill("0.4");
  await page.getByRole("button", { name: "Redesign with Meta", exact: false }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Approve & Run Experiment", exact: true }).count(), 0);
  assert.match(await page.locator(".cockpit-command-state").innerText(), /INPUT CHANGED — REDESIGN REQUIRED/);
  assert.equal(await page.getByLabel("Stimulus strength", { exact: true }).inputValue(), "0.4");
  await page.getByRole("button", { name: "Redesign with Meta", exact: false }).click();
  await page.getByRole("button", { name: "Approve & Run Experiment", exact: true }).click();
  await page.getByRole("group", { name: "Select recorded condition" }).waitFor();
  assert.equal(await page.getByLabel("Stimulus strength", { exact: true }).inputValue(), "0.4");
  await help("Control", "focus"); await help("Intervention", "hover");
  const controls = page.getByRole("group", { name: "Select recorded condition" });
  const pane = page.locator(".embodied-signals");
  const c = await controls.boundingBox(), p = await pane.boundingBox();
  assert.ok(Math.abs(c.x + c.width / 2 - p.x - p.width / 2) < 2, "Condition selector centered in Neural System pane");
  const options = await page.locator(".condition-option").evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().toJSON()));
  assert.ok(Math.abs((options[0].left + options[1].right) / 2 - p.x - p.width / 2) < 2, "Actual option pair is centered, not merely its full-width container");
  await controls.getByRole("button", { name: "Intervention", exact: true }).click();
  assert.equal(await controls.getByRole("button", { name: "Intervention", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator(".embodied-signal.perturbed").count(), 1);
  await resetWorld();
  assert.equal(await controls.getByRole('button', { name: 'Intervention', exact: true }).getAttribute('aria-pressed'), 'true', 'Camera-only reset preserves the selected condition');
  assert.equal(await page.getByLabel('Stimulus strength', { exact: true }).inputValue(), '0.4');
  assert.ok((await page.locator(".embodied-signal .synthetic-network").boundingBox()).height >= 80, "Recorded network must retain readable height");
  await responsive("measured-adjusted-input"); await capture("03-neural-controls-adjusted-stimulus-1920");
  await capture("05-mobile-cockpit-390", 390);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await nav("Live Connectome");
  const cloud = page.locator("canvas[data-camera-fit]"); await cloud.waitFor();
  const initial = JSON.parse(await cloud.getAttribute("data-camera-fit"));
  assert.ok(initial.shortAxisCoverage > .7 && initial.shortAxisCoverage <= .8);
  const box = await cloud.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 30, { steps: 8 }); await page.mouse.up();
  const adjusted = await cloud.getAttribute("data-camera-view");
  await page.getByRole("button", { name: "Connect FruitFly XR", exact: true }).first().click();
  const fixtures = JSON.parse(fs.readFileSync("tmp/sprint-6b/browser-fixtures.json", "utf8"));
  for (const snapshot of fixtures.snapshots.slice(0, 3)) await page.evaluate(snapshot => window.__offlineStream.onmessage(new MessageEvent("message", { data: JSON.stringify(snapshot) })), snapshot);
  await page.waitForFunction(() => document.querySelector('[data-structure-count]')?.getAttribute('data-current-ids') !== '0');
  assert.equal(await cloud.getAttribute("data-camera-view"), adjusted, "Telemetry cannot move the user-adjusted camera");
  await page.getByRole("button", { name: "Reset View", exact: true }).click();
  assert.deepEqual(JSON.parse(await cloud.getAttribute("data-camera-fit")), initial);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.waitForFunction(old => JSON.parse(document.querySelector('canvas[data-camera-fit]').getAttribute('data-camera-fit')).aspect !== old, initial.aspect);
  await responsive("connectome");
  await page.getByRole("button", { name: "Reset View", exact: true }).click();
  await capture("04-canonical-live-connectome-1920");
  await nav("Experiment"); await nav("Live Connectome");
  await page.locator("canvas[data-camera-fit]").waitFor();
  assert.deepEqual(JSON.parse(await page.locator("canvas[data-camera-fit]").getAttribute("data-camera-fit")), initial, "Source re-entry restores canonical fit");
  const failurePage = await context.newPage();
  await failurePage.route("**/models/flyv2/FlyVisualV2_Web.glb", route => route.abort());
  await failurePage.goto(process.env.CAUSALFLY_REVIEW_URL || "http://127.0.0.1:3122", { waitUntil: "domcontentloaded" });
  await failurePage.locator('canvas[data-fly-model="fallback"]').waitFor();
  await failurePage.getByText(/Anatomical model unavailable.*Lightweight fallback/).waitFor();
  await failurePage.close();
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.equal(requests.some(r => r.path.includes("perception") || r.path.includes("fruitfly/analyze")), false);
  fs.writeFileSync(`${dir}/browser-checks.json`, JSON.stringify({ checks, sharedNavigationAndBackgrounds: true, inViewportCameraOnlyReset: true, noProceduralLoadingFlash: true, modelToggle: true, automaticFailureFallback: true, sourceReloadRecenters: true, questionSubmissionLocal: true, amplitudePersists: true, staleDesignInvalidated: true, oneApprovalCTA: true, centeredConditionSelector: true, helpMethods: ["hover", "focus", "click", "Escape"], cameraInitial: initial, telemetryDoesNotMoveCamera: true, zeroPaidCalls: true, screenshots: 5, errors, experimentActions: requests.map(r => r.body?.action) }, null, 2) + "\n");
  console.log(JSON.stringify({ responsiveChecks: checks.length, screenshots: 5, paidCalls: 0, errors }));
} finally { await browser.close(); }
