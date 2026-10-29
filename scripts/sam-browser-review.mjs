// Offline browser integration review. Start production with CAUSALFLY_FAKE_META=1.
// Every non-fixture perception request is intercepted here: ZERO live SAM calls.
import strictAssert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { parseVideoStream } from "@meta-sam/parser";

let browserChecks = 0;
const counted = fn => (...args) => { fn(...args); browserChecks++; };
const assert = { equal: counted(strictAssert.equal), match: counted(strictAssert.match), deepEqual: counted(strictAssert.deepEqual) };

const modulePath = process.env.CAUSALFLY_PLAYWRIGHT_MODULE || path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, reducedMotion: "reduce" });
const posts = [], errors = [];
let mock = "error";
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => { if (request.method() === "POST") posts.push(new URL(request.url()).pathname); });
const outputDir = "tmp/sprint-8b1-review";
fs.mkdirSync(outputDir, { recursive: true });

// Official-parser conformance mask; this is explicitly MOCK perception in browser review only.
const mask = "<|mask;x=0;y=0;data=27,60,~!!!!M!0c[0o91w?q1!pIH4pPRVp2B3'7`e.ioeAf6-k/#Xd8%dX9x(|>";
const wire = Array.from({ length: 60 }, (_, n) => `<${n}f>0<|box;x1=${120 - n};y1=${80 - n};x2=${199 + n};y2=${159 + n};w=320;h=240|>${mask}\n`).join("");
async function* events() { const lane = { item_id: "mock", output_index: 0, content_index: 0 }; yield { type: "response.output_text.delta", ...lane, delta: wire }; yield { type: "response.output_text.done", ...lane, text: wire }; yield { type: "response.completed" }; }
const parsed = await parseVideoStream(events()).finalResult;
assert.equal(parsed.diagnostics.length, 0);
const mockRecord = { id: "00000000-0000-4000-8000-000000000001", model: "sam-3.1", mode: "SAM LIVE", concept: "MOCK red square", media: { width: 320, height: 240, durationSeconds: 2, frameTimes: Array.from({ length: 60 }, (_, n) => n / 30) }, measurement: { objectId: "0", frames: Array.from({ length: 60 }, (_, n) => ({ frameIndex: n, area: ((80 + 2 * n) ** 2) / (320 * 240) })), firstArea: 6400 / 76800, lastArea: (198 ** 2) / 76800, netAreaChange: ((198 ** 2) - 6400) / 76800, amplitude: .85, mappingRule: "MOCK browser-only data" }, provenance: { warnings: ["MOCK BROWSER TEST. NOT A REAL DETECTION."] } };

try {
  let releaseFailure;
  let failDesign = true, rejectReceipt = false, expireNextRun = false;
  const actions = [];
  await page.route("**/api/perception", async route => {
    const req = route.request();
    if (req.headers()["content-type"]?.startsWith("application/json") && req.postDataJSON()?.mode === "fixture") return route.continue();
    if (mock === "error") await new Promise(resolve => { releaseFailure = resolve; });
    return route.fulfill({ status: mock === "error" ? 502 : 200, contentType: "application/json", body: JSON.stringify(mock === "error" ? { ok: false, kind: "provider", error: "OFFLINE BROWSER TEST: injected SAM failure. Retry explicitly." } : { ok: true, perception: mockRecord, overlay: { ...parsed, rawOutput: "" } }) });
  });
  await page.route("**/api/experiments", async route => {
    const body = route.request().postDataJSON(); actions.push(body);
    if (body.action === "run" && expireNextRun) { expireNextRun = false; return route.continue({ postData: JSON.stringify({ ...body, id: crypto.randomUUID() }) }); }
    if (body.action === "design" && failDesign) return route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ ok: false, kind: "provider", error: "Offline injected design failure; retained stimulus is unchanged." }) });
    if (body.action === "stimulus" && body.perceptionId && rejectReceipt) return route.continue({ postData: JSON.stringify({ ...body, perceptionReceipt: body.perceptionReceipt + "tampered" }) });
    return route.continue();
  });
  const nav = name => page.getByRole("navigation", { name: "Experiment workspaces" }).getByRole("button", { name, exact: true }).click();
  const panel = page.locator(".perception-panel");
  const changeVideo = () => page.getByRole("button", { name: "CHANGE VIDEO", exact: true }).click();
  const loadFixture = async () => {
    if (await page.getByRole("button", { name: "CHANGE VIDEO", exact: true }).count()) await changeVideo();
    await page.locator(".perception-offline-option summary").click();
    await page.getByRole("button", { name: "Load OFFLINE SAM FIXTURE", exact: true }).click();
    await page.getByText("OFFLINE SAM FIXTURE · NO LIVE DETECTION", { exact: true }).waitFor();
  };
  await page.goto(process.env.CAUSALFLY_REVIEW_URL || "http://127.0.0.1:3117", { waitUntil: "networkidle" });
  assert.match(await page.locator(".header-badges").innerText(), /FAKE META CLIENT/);
  assert.equal(posts.length, 0);
  await page.getByRole("button", { name: "Real-world perception", exact: true }).click();
  await page.getByLabel("Choose video", { exact: true }).setInputFiles("public/perception-calibration.mp4");
  assert.equal(await page.getByLabel("Object concept").inputValue(), "red square");
  await page.waitForFunction(() => !document.querySelector('.perception-upload button').disabled);
  assert.equal(posts.length, 0, "Selecting source and the known clip makes no SAM request");
  await page.getByRole("button", { name: "Analyze with SAM 3.1", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.perception-upload button')?.getAttribute('aria-busy') === 'true');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  while (!releaseFailure) await new Promise(resolve => setTimeout(resolve, 10));
  releaseFailure();
  const notification = page.getByRole("alert", { name: "Action failed", exact: true });
  await notification.waitFor();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await notification.boundingBox();
    assert.equal(bounds.y >= 0 && bounds.y + bounds.height < 900, true, "Error stays visible at the bottom of a long page");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "Show action & recovery", exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === "perception-source");
  assert.equal(await panel.evaluate(el => el === document.activeElement), true);
  await page.getByRole("button", { name: "Dismiss error notification", exact: true }).click();
  assert.equal(await notification.count(), 0);
  assert.match(await panel.innerText(), /injected SAM failure/);
  assert.equal(await page.locator(".perception-metrics").count(), 0, "Live failure cannot become fake success");

  mock = "success";
  await page.getByRole("button", { name: "Retry with SAM 3.1", exact: true }).click();
  await page.getByRole("button", { name: "Play tracked video", exact: true }).waitFor();
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(el => el.textContent === 'Play tracked video')?.disabled);
  await page.getByLabel("Tracked video frame", { exact: true }).fill("40");
  await page.waitForFunction(() => document.querySelector('.perception-player output')?.textContent.includes('41 / 60'));
  assert.equal(await page.locator(".perception-player canvas").count(), 1);
  assert.equal(await page.getByLabel("Choose video", { exact: true }).count(), 0, "Success collapses the form");
  assert.match(await panel.innerText(), /OBJECT TRACKED ✓/);
  await nav("Evidence"); await nav("Experiment");
  assert.equal(await page.locator(".perception-player canvas").count(), 1, "File and overlay survive panel unmount/remount");
  await page.getByRole("button", { name: "Ask CausalFly", exact: true }).click(); await page.keyboard.press("Escape");
  assert.match(await panel.innerText(), /MOCK red square/);
  assert.equal(actions.length, 0);
  await changeVideo();
  await page.getByLabel("Choose video", { exact: true }).setInputFiles({ name: "invalid.txt", mimeType: "text/plain", buffer: Buffer.from("invalid media") });
  await notification.waitFor();
  assert.equal(await page.locator(".perception-upload button").isDisabled(), true, "An invalid selection cannot leave the previous draft file ready to send");
  await page.getByRole("button", { name: "Dismiss error notification", exact: true }).click();
  await page.getByLabel("Object concept").fill("blue cup");
  await page.getByLabel("Choose video", { exact: true }).setInputFiles({ name: "custom.mp4", mimeType: "video/mp4", buffer: fs.readFileSync("public/perception-calibration.mp4") });
  assert.equal(await page.getByLabel("Object concept").inputValue(), "blue cup");
  await page.getByRole("button", { name: "Keep retained result", exact: true }).click();
  assert.match(await panel.innerText(), /MOCK red square/, "Editing a different clip cannot relabel the old track");

  await loadFixture();
  const firstRecord = JSON.parse(await panel.locator(".perception-details pre").textContent());
  assert.equal(await page.getByRole("button", { name: "DESIGN EXPERIMENT WITH THIS STIMULUS", exact: true }).isEnabled(), true);
  await page.getByRole("button", { name: "DESIGN EXPERIMENT WITH THIS STIMULUS", exact: true }).click();
  await notification.waitFor();
  assert.match(await notification.innerText(), /Meta experiment design failed/);
  assert.equal(JSON.parse(await panel.locator(".perception-details pre").textContent()).id, firstRecord.id);
  await page.getByRole("button", { name: "Dismiss error notification", exact: true }).click();
  await nav("Evidence"); await nav("Experiment");
  assert.equal(JSON.parse(await panel.locator(".perception-details pre").textContent()).id, firstRecord.id);
  failDesign = false;
  await page.getByRole("button", { name: "DESIGN EXPERIMENT WITH THIS STIMULUS", exact: true }).click();
  await page.getByText(/STIMULUS READY ✓/).waitFor();
  assert.equal(actions[1].perceptionId, firstRecord.id);
  assert.equal(typeof actions[1].perceptionReceipt, "string");
  assert.equal(await page.locator("#stimulus-strength").inputValue(), "0.64");
  assert.equal(await page.locator(".demo-measured-stage").count(), 0, "Design with stimulus cannot execute the engine");
  assert.equal(await page.locator(".demo-progress li").count(), 5);
  await page.locator(".embodied-run-action").getByRole("button", { name: "Approve & Run Experiment", exact: true }).click();
  await page.locator(".demo-measured-stage").waitFor();
  assert.match(await page.locator("#demo-result").innerText(), /DETERMINISTIC MODEL RESULT/);
  assert.equal(await page.locator(".result-validity details").getAttribute("open"), null);
  assert.equal(await page.getByText("VIEW TECHNICAL ANALYSIS", { exact: true }).evaluate(el => el.parentElement.open), false);
  await page.locator(".demo-explain-action button").click();
  await page.locator(".demo-explanation-grid").waitFor();
  await nav("Evidence");
  assert.equal(JSON.parse(await page.locator(".perception-evidence .perception-details pre").textContent()).id, firstRecord.id);
  await nav("Experiment");
  await page.getByRole("button", { name: "Synthetic stimulus", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('#stimulus-strength')?.disabled);
  assert.equal(await page.locator(".demo-measured-stage").count(), 0, "Source changes cannot reuse stale measurements or interpretation");
  await page.getByRole("button", { name: "Real-world perception", exact: true }).click();
  rejectReceipt = true;
  await page.getByRole("button", { name: "USE AS EXPERIMENT STIMULUS", exact: true }).click();
  await notification.waitFor();
  assert.match(await notification.innerText(), /Re-analyze the video/);
  await page.getByRole("button", { name: "Show action & recovery", exact: true }).click();
  await page.getByLabel("Choose video", { exact: true }).waitFor();
  await page.waitForFunction(() => document.activeElement?.id === "perception-source");
  assert.equal(await panel.evaluate(el => el === document.activeElement), true);
  await page.getByRole("button", { name: "Dismiss error notification", exact: true }).click();
  assert.match(await panel.innerText(), /server can no longer verify/);
  rejectReceipt = false;
  await loadFixture();
  await page.getByRole("button", { name: "USE AS EXPERIMENT STIMULUS", exact: true }).click();
  await page.getByText(/STIMULUS READY ✓/).waitFor();
  assert.equal(await page.locator(".demo-measured-stage").count(), 0);
  assert.equal(await page.locator("#stimulus-strength").inputValue(), "0.64");
  expireNextRun = true;
  await page.locator(".embodied-run-action").getByRole("button", { name: "Approve & Run Experiment", exact: true }).click();
  await notification.waitFor();
  assert.match(await notification.innerText(), /Experiment design expired/);
  assert.equal(await page.getByRole("button", { name: "DESIGN EXPERIMENT WITH THIS STIMULUS", exact: true }).isEnabled(), true);
  await page.getByRole("button", { name: "Dismiss error notification", exact: true }).click();
  await page.getByRole("button", { name: "DESIGN EXPERIMENT WITH THIS STIMULUS", exact: true }).click();
  await page.getByText(/STIMULUS READY ✓/).waitFor();
  assert.equal(await page.locator(".demo-measured-stage").count(), 0, "Expired draft recovery must design again, without silently running");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ browserChecks, runtimeErrors: errors.length, liveSamCalls: 0, mockedSamRequests: 2, offlineFixtureRequests: 2, experimentActions: actions.map(a => a.action) }));
} catch (error) {
  console.error(JSON.stringify({ visibleAlerts: await page.getByRole("alert").allTextContents(), runtimeErrors: errors, posts }));
  throw error;
} finally { await browser.close(); }
