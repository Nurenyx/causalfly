// Offline integration review. No live Muse or SAM request may leave this harness.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const modulePath = process.env.CAUSALFLY_PLAYWRIGHT_MODULE || path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
const dir = "docs/review/sprint-10c"; fs.mkdirSync(dir, { recursive: true });
const errors = [], posts = [], checks = [];
page.on("pageerror", e => errors.push(e.message));
page.on("request", r => { if (r.method() === "POST") posts.push(new URL(r.url()).pathname); });
let sceneCalls = 0, samCalls = 0;
await page.route("**/api/perception/scene", route => {
  if (route.request().postData()?.includes('name="mode"\r\n\r\nfixture')) return route.continue();
  sceneCalls++;
  return route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ ok: false, kind: "provider", error: "Muse scene understanding unavailable. Enter a concept manually or retry." }) });
});
await page.route("**/api/perception", route => {
  if (route.request().headers()["content-type"]?.startsWith("application/json")) return route.continue();
  samCalls++;
  assert.match(route.request().postData(), /red square|blue cup/);
  return route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ ok: false, kind: "provider", error: "SAM could not track the selected object. Choose another suggestion or refine the concept." }) });
});
async function responsive(state) {
  for (const width of [1920, 1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${state} overflow at ${width}`);
    checks.push({ state, width, noHorizontalOverflow: true });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
}
async function capture(name, width = 1920) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".perception-panel").evaluate(el => { el.scrollTop = 0; });
  if (name.includes("candidate-selection")) {
    const visibility = await page.evaluate(() => {
      const panel = document.querySelector(".perception-panel").getBoundingClientRect();
      const card = document.querySelector(".scene-candidates label").getBoundingClientRect();
      const cta = document.querySelector(".scene-track").getBoundingClientRect();
      return { cardVisible: card.top >= panel.top && card.bottom <= panel.bottom, ctaVisible: cta.top >= panel.top && cta.bottom <= panel.bottom };
    });
    if (!visibility.ctaVisible) console.log(await page.locator(".perception-panel").evaluate(el => ({panel: el.getBoundingClientRect().toJSON(), scroll: el.scrollHeight, style: getComputedStyle(el).maxHeight, source: el.querySelector(".perception-source").getBoundingClientRect().toJSON(), scene: el.querySelector(".meta-scene").getBoundingClientRect().toJSON(), cta: el.querySelector(".scene-track").getBoundingClientRect().toJSON()})));
    assert.deepEqual(visibility, { cardVisible: true, ctaVisible: true }, "Candidate and dominant CTA must fit inside the cockpit panel");
  }
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: width === 390 });
}
try {
  await page.goto(process.env.CAUSALFLY_REVIEW_URL || "http://127.0.0.1:3120", { waitUntil: "networkidle" });
  assert.match(await page.locator(".header-badges").innerText(), /FAKE META CLIENT/);
  assert.equal(posts.length, 0);
  await page.getByRole("button", { name: "Real-world perception", exact: true }).click();
  await page.getByLabel("Choose video", { exact: true }).setInputFiles("public/perception-calibration.mp4");
  await page.getByRole("button", { name: "DISCOVER WITH META", exact: true }).waitFor();
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => b.textContent === 'DISCOVER WITH META')?.disabled);
  assert.equal(posts.length, 0, "Selecting video never calls Muse or SAM");
  await responsive("video-selected"); await capture("01-video-selected-1920");
  await page.getByRole("button", { name: "DISCOVER WITH META", exact: true }).click();
  await page.getByRole("alert", { name: "Action failed", exact: true }).waitFor();
  assert.equal(sceneCalls, 1); assert.equal(samCalls, 0);
  await page.getByRole("button", { name: "Dismiss error notification", exact: true }).click();
  await page.getByLabel("Object concept").fill("blue cup");
  await page.getByRole("button", { name: "TRACK BLUE CUP WITH SAM 3.1", exact: true }).click();
  await page.getByRole("alert", { name: "Action failed", exact: true }).waitFor();
  assert.equal(samCalls, 1); assert.match(await page.locator(".perception-error").first().innerText(), /SAM tracking failed/);
  await page.getByRole("button", { name: "Dismiss error notification", exact: true }).click();
  await page.locator(".perception-offline-option summary").click();
  await page.getByRole("button", { name: "Load OFFLINE SCENE-UNDERSTANDING FIXTURE", exact: true }).click();
  await page.getByRole("radiogroup", { name: "Trackable concepts" }).waitFor();
  assert.equal(samCalls, 1, "Muse result never starts SAM");
  assert.equal(await page.getByRole("radiogroup", { name: "Trackable concepts" }).getByRole("radio").isChecked(), false);
  await page.getByRole("radiogroup", { name: "Trackable concepts" }).getByRole("radio").check();
  assert.equal(samCalls, 1, "Candidate selection alone never starts SAM");
  await page.locator(".perception-offline-option summary").click();
  await responsive("candidates"); await capture("02-scene-candidate-selection-1920");
  await capture("05-mobile-candidate-selection-390", 390);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole("button", { name: "TRACK RED SQUARE WITH SAM 3.1", exact: true }).click();
  await page.getByRole("alert", { name: "Action failed", exact: true }).waitFor();
  assert.equal(await page.getByRole("radiogroup", { name: "Trackable concepts" }).getByRole("radio").isChecked(), true, "SAM failure retains the selected suggestion");
  await page.getByRole("button", { name: "Dismiss error notification", exact: true }).click();
  await page.locator(".perception-offline-option summary").click();
  await page.getByRole("button", { name: "Load OFFLINE SAM FIXTURE", exact: true }).click();
  await page.getByRole("button", { name: "DESIGN EXPERIMENT WITH THIS STIMULUS", exact: true }).waitFor();
  assert.match(await page.locator(".perception-panel").innerText(), /0.640/);
  await responsive("tracked-stimulus"); await capture("03-tracked-derived-stimulus-1920");
  await page.getByRole("button", { name: "DESIGN EXPERIMENT WITH THIS STIMULUS", exact: true }).click();
  await page.locator(".scientist-action").getByRole("button", { name: "Approve & Run Experiment", exact: true }).waitFor();
  await page.locator(".scientist-action").getByRole("button", { name: "Approve & Run Experiment", exact: true }).click();
  await page.locator(".scientist-action").getByRole("button", { name: "Explain with Meta", exact: false }).waitFor();
  await page.locator(".scientist-action").getByRole("button", { name: "Explain with Meta", exact: false }).click();
  await page.getByRole("button", { name: "Use as next test", exact: false }).waitFor();
  await responsive("completed-interpretation"); await capture("04-completed-meta-interpretation-1920");
  assert.equal(errors.length, 0, errors.join("\n"));
  fs.writeFileSync(`${dir}/browser-checks.json`, JSON.stringify({ checks, sceneCallsIntercepted: sceneCalls, samCallsIntercepted: samCalls, paidProviderCalls: 0, screenshots: 5, errors, posts }, null, 2) + "\n");
  console.log(JSON.stringify({ responsiveStates: checks.length, screenshots: 5, paidProviderCalls: 0, errors }));
} finally { await browser.close(); }
