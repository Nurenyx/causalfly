// Run the production preview with CAUSALFLY_FAKE_META=1 first.
// Prepare offline responses: node node_modules/tsx/dist/cli.mjs --conditions=react-server scripts/assistant-review-fixtures.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const modulePath = process.env.CAUSALFLY_PLAYWRIGHT_MODULE;
const playwright = await import(modulePath ? pathToFileURL(modulePath).href : "playwright").catch(async error => {
  const bundled = path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");
  if (!fs.existsSync(bundled)) throw error;
  return import(pathToFileURL(bundled).href);
});
const { chromium } = playwright;
const fixtures = JSON.parse(fs.readFileSync("tmp/sprint-6b/browser-fixtures.json", "utf8"));
const dir = "docs/review/sprint-6b";
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [], checks = [], posts = [];
let observationCalls = 0, failObservation = false, delayObservation = false, release;
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => { if (request.method() === "POST") posts.push(new URL(request.url()).pathname); });
const nav = name => page.getByRole("navigation", { name: "Experiment workspaces" }).getByRole("button", { name, exact: true }).click();
const drawer = page.getByRole("dialog", { name: "CAUSALFLY ASSISTANT" });
const open = () => page.getByRole("button", { name: "Ask CausalFly", exact: true }).click();
const close = () => drawer.getByRole("button", { name: "Close CausalFly Assistant" }).click();
const ask = async question => { await drawer.locator("#assistant-question").fill(question); await drawer.getByRole("button", { name: "Submit question locally" }).click(); };
const settle = async () => { await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }); await page.waitForTimeout(300); };
async function capture(name, widths = [1920, 1440]) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await settle();
    const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, drawerOverflow: (() => { const d = document.querySelector(".assistant-drawer"); return d.open ? d.scrollWidth > d.clientWidth : false; })() }));
    assert.equal(size.scrollWidth, width, `${name}: page overflow`);
    assert.equal(size.drawerOverflow, false, `${name}: drawer overflow`);
    checks.push({ state: name, ...size });
    await page.screenshot({ path: `${dir}/${name}-${width}.png` });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
}
async function scrollTo(selector) {
  await drawer.locator(selector).evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await settle();
}

try {
  await page.route("**/api/sources/fruitfly", route => {
    const data = fixtures.snapshots.map(snapshot => `data: ${JSON.stringify(snapshot)}\n\n`).join("");
    return route.fulfill({ status: 200, contentType: "text/event-stream", body: data });
  });
  await page.route("**/api/sources/fruitfly/analyze", async route => {
    observationCalls++;
    const input = route.request().postDataJSON();
    if (delayObservation) await new Promise(resolve => { release = resolve; });
    if (failObservation) return route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ ok: false, kind: "provider", error: "Offline injected failure" }) });
    const response = fixtures.responses[input.researchQuestion];
    assert(response, "Unexpected question cannot call provider");
    assert.deepEqual(input.sequences, response.result.evidence.frames.map(f => f.sequence));
    assert.equal(input.sessionId, response.result.evidence.sessionId);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.goto(process.env.CAUSALFLY_REVIEW_URL ?? "http://127.0.0.1:3000", { waitUntil: "networkidle" });
  assert.match(await page.locator(".header-badges").innerText(), /FAKE META CLIENT/, "Preview must force offline mode");
  // Review-only label lives in the automation, never in product code.
  await page.evaluate(() => {
    const label = document.createElement("div"); label.id = "offline-review-label";
    label.textContent = "OFFLINE REVIEW · recorded simulation evidence replay · no live Meta";
    label.style.cssText = "position:fixed;top:0;left:0;z-index:9999;pointer-events:none;padding:3px 8px;background:#00111c;color:#a2bac7;font:9px monospace;max-width:100vw";
    document.body.append(label);
    const modalLabel = label.cloneNode(true);
    modalLabel.id = "offline-modal-review-label";
    modalLabel.textContent = "RECORDED EVIDENCE REPLAY · OFFLINE REVIEW";
    modalLabel.style.cssText = "position:absolute;top:0;right:8px;z-index:9999;pointer-events:none;padding:2px 4px;color:#688796;font:7px monospace;max-width:100%";
    document.querySelector(".assistant-drawer").append(modalLabel);
  });
  for (const source of ["Synthetic Fixture", "FruitFly XR"]) {
    await page.getByRole("radio", { name: source, exact: true }).check();
    for (const name of ["Observatory", "Live Session", "Compare", "AI Scientist", "Evidence"]) {
      await nav(name);
      assert(await page.getByRole("button", { name: "Ask CausalFly", exact: true }).isVisible());
      await open();
      assert.match(await drawer.locator(".assistant-context").innerText(), new RegExp(name));
      assert.match(await drawer.locator(".assistant-context").innerText(), new RegExp(source));
      await page.keyboard.press("Escape");
      assert.equal(await drawer.count(), 0);
      assert.equal(await page.getByRole("button", { name: "Ask CausalFly", exact: true }).evaluate(el => el === document.activeElement), true);
    }
  }
  assert.equal(posts.length, 0);
  await nav("Live Session"); await open();
  assert.match(await drawer.innerText(), /0 retained frames/);
  assert.equal(observationCalls, 0); await close();
  await page.getByRole("main").getByRole("button", { name: "Connect FruitFly XR", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".assistant-context")?.textContent.includes("4 retained frames"));
  await page.locator("canvas").first().waitFor();
  await page.waitForTimeout(1500); // Let the unchanged lazy 3D viewer finish its first GPU frame.
  await capture("01-fruitfly-live-launcher");
  // Keyboard activation, native focus trap, and Escape return focus.
  await page.getByRole("button", { name: "Ask CausalFly", exact: true }).focus(); await page.keyboard.press("Enter");
  await drawer.waitFor();
  for (let i = 0; i < 24; i++) { await page.keyboard.press("Tab"); assert(await drawer.evaluate(el => el.contains(document.activeElement))); }
  await drawer.getByRole("button", { name: "Close CausalFly Assistant" }).focus();
  await page.keyboard.press("Shift+Tab"); assert(await drawer.evaluate(el => el.contains(document.activeElement)));
  await page.keyboard.press("Tab");
  assert(await drawer.getByRole("button", { name: "Close CausalFly Assistant" }).evaluate(el => el === document.activeElement));
  await drawer.locator(".assistant-scroll").evaluate(el => { el.scrollTop = 0; });
  await capture("02-fruitfly-live-assistant");
  const question = "Which received frame showed the largest spike-event count?";
  await drawer.locator("#assistant-question").fill(question);
  await capture("03-fruitfly-retained-question");
  await drawer.getByRole("button", { name: "Submit question locally" }).click();
  await scrollTo(".assistant-question");
  assert.match(await drawer.innerText(), /3,317 simulated spike events/);
  assert.equal(observationCalls, 0);
  await capture("04-fruitfly-local-answer");
  await scrollTo(".assistant-meta");
  await capture("05-fruitfly-meta-available");
  // Explicit analysis is exactly one intercepted POST, including rapid double clicks.
  delayObservation = true;
  await drawer.getByRole("button", { name: "Analyze with Meta", exact: true }).dblclick();
  await page.waitForFunction(() => document.querySelector(".assistant-meta")?.getAttribute("aria-busy") === "true");
  assert.equal(observationCalls, 1);
  await close(); await open(); assert.equal(observationCalls, 1);
  await drawer.getByRole("button", { name: "Inspect evidence ↗", exact: true }).click();
  assert.match(await drawer.locator(".assistant-context").innerText(), /Evidence/);
  assert.equal(observationCalls, 1);
  assert(await page.getByRole("radio", { name: "FruitFly XR", exact: true }).isChecked());
  release(); delayObservation = false;
  await drawer.getByText("Validated response for this exact question and frozen window.").waitFor();
  assert.match(await drawer.locator(".assistant-meta").innerText(), /OFFLINE \/ FAKE TEMPLATE/);
  await close(); await nav("Compare"); await open();
  assert.match(await drawer.innerText(), /Controlled comparison requires matched trials/);
  assert.doesNotMatch(await drawer.innerText(), /primary_a|THRESHOLD_REACHED/);
  await close(); await nav("Live Session"); await open();
  await ask(question); assert.equal(observationCalls, 1);
  // A fresh explicit action reuses the already accepted response even in the full workspace.
  await drawer.getByRole("button", { name: "Open full analysis ↗", exact: true }).click();
  await close();
  await page.getByRole("button", { name: "ANALYZE WITH META", exact: true }).click();
  await settle(); assert.equal(observationCalls, 1);
  // Error/retry uses a different frozen question. Neither reopening nor navigation retries.
  await open();
  const second = "What changed before the decoder entered ESCAPE?";
  await ask(second); failObservation = true;
  await drawer.getByRole("button", { name: "Analyze with Meta", exact: true }).click();
  await drawer.getByRole("button", { name: "Retry Meta analysis", exact: true }).waitFor();
  assert.equal(observationCalls, 2);
  await close(); await open();
  await drawer.getByRole("button", { name: "Inspect evidence ↗", exact: true }).click();
  await settle(); assert.equal(observationCalls, 2);
  assert.match(await drawer.innerText(), /Your frozen local evidence is preserved/);
  failObservation = false;
  await drawer.getByRole("button", { name: "Retry Meta analysis", exact: true }).click();
  await drawer.getByText("Validated response for this exact question and frozen window.").waitFor();
  assert.equal(observationCalls, 3);
  await close(); await page.getByRole("radio", { name: "Synthetic Fixture", exact: true }).check(); await nav("Observatory"); await open();
  await capture("06-synthetic-observatory-assistant");
  await ask("What will be measured?");
  assert.match(await drawer.innerText(), /Matched control and single-silence intervention trials/);
  assert.equal(posts.filter(p => p === "/api/experiments").length, 0);
  await drawer.getByRole("button", { name: "Review question in Observatory ↗", exact: true }).click();
  assert.equal(await page.locator("#research-question").inputValue(), "What will be measured?");
  const experimentResponse = page.waitForResponse(r => r.url().endsWith("/api/experiments") && r.request().method() === "POST");
  await page.getByRole("button", { name: /DESIGN & RUN EXPERIMENT/ }).click();
  const experiment = await (await experimentResponse).json(); assert(experiment.ok); assert.equal(experiment.result.mode, "FAKE META CLIENT");
  await page.locator(".condition-grid").waitFor();
  await open(); await ask("Explain the measured difference"); await scrollTo(".assistant-question");
  await capture("07-synthetic-compare-assistant");
  await close(); await page.getByRole("radio", { name: "FruitFly XR", exact: true }).check(); await nav("Compare"); await open();
  assert.match(await drawer.innerText(), /4 retained frames/);
  await drawer.getByRole("button", { name: "Use Synthetic Fixture", exact: true }).click();
  assert(await page.getByRole("radio", { name: "Synthetic Fixture", exact: true }).isChecked());
  assert.match(await drawer.innerText(), /Matched experiment retained/);
  await close(); await page.getByRole("radio", { name: "FruitFly XR", exact: true }).check(); await nav("Live Session"); await open();
  await ask(question); await scrollTo(".assistant-question");
  await capture("08-mobile-assistant", [390]);
  assert.equal(observationCalls, 3);
  // Fresh app session: no retained evidence must leave explicit analysis disabled.
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "FruitFly XR", exact: true }).check();
  await nav("Live Session"); await open();
  await ask(question);
  assert.match(await drawer.innerText(), /0 retained frames/);
  assert(await drawer.getByRole("button", { name: "Analyze with Meta", exact: true }).isDisabled());
  assert.equal(observationCalls, 3);
  assert.deepEqual(errors, []);
  const verification = { checks, pageErrors: errors, liveMetaCalls: 0, interceptedObservationPosts: observationCalls, actualFakeSyntheticPosts: 1, launcherWorkspaces: 10, keyboardTrap: "PASS", escapeRestoresLauncherFocus: "PASS", sourcePersistence: "PASS", noAutomaticMetaCalls: "PASS", explicitRetryOnly: "PASS", sharedAnalysisReuse: "PASS", evidenceReplay: "Original Sprint 5.6 received snapshots; original receipt times and telemetry preserved. Review banner only, never loaded by application code." };
  fs.writeFileSync(`${dir}/verification.json`, JSON.stringify(verification, null, 2) + "\n");
  console.log(JSON.stringify(verification, null, 2));
} finally { await browser.close(); }
