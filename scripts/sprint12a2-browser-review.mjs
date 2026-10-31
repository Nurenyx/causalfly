// Focused Sprint 12A.2 UX acceptance: local production app, real clocks, no provider calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const dir = 'docs/review/sprint-12a2';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1200 }, acceptDownloads: true });
const errors = [], blocked = [], checks = [], layouts = [];
await context.addInitScript(() => {
  window.EventSource = class { close() {} };
  const create = URL.createObjectURL.bind(URL);
  URL.createObjectURL = blob => { if (blob.type === 'application/json') blob.text().then(text => window.__recording = text); return create(blob); };
});
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || (url.pathname.startsWith('/api/') && url.pathname !== '/api/health')) { blocked.push(url.pathname); return route.abort(); }
  return route.continue();
});
await context.routeWebSocket('**/brain/v1', ws => { blocked.push('brain socket'); ws.close(); });
const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
const panel = () => page.getByRole('region', { name: 'Autonomous experimental behaviour', exact: true });
async function screenshot(name, target = panel()) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(0, 0);
  await target.screenshot({ path: `${dir}/${name}.png`, style: '.skip-link {visibility:hidden !important;}' });
}
async function recording() {
  await page.evaluate(() => window.__recording = null);
  await panel().getByRole('button', { name: 'Export autonomy evidence' }).click();
  await page.waitForFunction(() => typeof window.__recording === 'string');
  return JSON.parse(await page.evaluate(() => window.__recording));
}
async function responsive(width) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1200 });
  await page.waitForTimeout(200);
  const metrics = await page.evaluate(() => {
    const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; };
    return { width: innerWidth, documentWidth: document.documentElement.scrollWidth, world: rect('.embodied-world-column'), arena: rect('.autonomy-world'), scientist: rect('.cockpit-scientist'), neural: rect('.embodied-signals') };
  });
  assert.ok(metrics.documentWidth <= width, `No document overflow at ${width}`);
  assert.ok(metrics.arena.height >= 390, 'Readable world height');
  assert.ok(metrics.neural.y >= metrics.world.bottom - 1, 'Neural view is below world');
  if (width > 1100) { assert.ok(metrics.world.width / (metrics.world.width + metrics.scientist.width) >= .64); assert.ok(metrics.scientist.x > metrics.world.x); }
  else assert.ok(metrics.scientist.y >= metrics.world.bottom - 1, 'Scientist rail stacks after organism');
  assert.equal(await panel().evaluate(el => el.scrollWidth <= el.clientWidth), true);
  layouts.push(metrics);
}
try {
  await page.goto('http://127.0.0.1:3147');
  await page.getByRole('navigation', { name: 'Experiment workspaces' }).getByRole('button', { name: 'Experiment', exact: true }).click();
  await page.locator('canvas[data-fly-model="ready"]').waitFor({ timeout: 30000 });
  await responsive(1920);
  await screenshot('01-organism-first-1920', page.locator('.embodied-stage'));
  await responsive(1440); await responsive(1024); await responsive(390); await responsive(1440);
  const first = await recording(); await page.waitForTimeout(1000); const moving = await recording();
  assert.notDeepEqual(first.conditions[0].trajectory.at(-1).after, moving.conditions[0].trajectory.at(-1).after);
  checks.push('Organism primary at desktop; world, scientist, neural order stacks at 1024/390; readable moving exploration');
  await panel().getByRole('button', { name: 'Compare synthetic intervention', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector('.autonomy-panel').dataset.altitude) > .8, {}, { timeout: 20000 });
  await panel().getByRole('button', { name: 'Pause autonomy', exact: true }).evaluate(el => el.click()); await page.waitForTimeout(150);
  const aerial = await recording();
  assert.equal(await panel().locator('.comparison-world-labels span').count(), 2);
  assert.match(await panel().innerText(), /Normal \/ intact pathway/); assert.match(await panel().innerText(), /Primary A silenced/);
  assert.match(await panel().innerText(), /same scheduled stimulus/);
  assert.deepEqual(aerial.conditions[0].inputs.map(i => i.stimulus), aerial.conditions[1].inputs.map(i => i.stimulus));
  assert.ok(aerial.conditions[0].trajectory.some(f => (f.after.altitude ?? 0) > .8));
  assert.ok(aerial.conditions[1].trajectory.every(f => (f.after.altitude ?? 0) === 0));
  const escaping = aerial.conditions[0].trajectory.filter(f => f.decision.state === 'ESCAPE');
  assert.ok(Math.hypot(escaping.at(-1).after.x - escaping[0].before.x, escaping.at(-1).after.z - escaping[0].before.z) > .7);
  await screenshot('02-aerial-control-grounded-intervention-1440');
  checks.push('Matched stimulus inputs; persistent Control/Intervention labels; control aerial with lateral separation, intervention grounded');
  await panel().getByRole('button', { name: 'Resume autonomy', exact: true }).click();
  console.log('Waiting for this single real-clock matched trial to complete; no repeated prior acceptance scenarios.');
  await page.waitForFunction(() => document.querySelector('.autonomy-panel').innerText.includes('Trial complete'), {}, { timeout: 90000 });
  assert.match(await panel().innerText(), /PHENOTYPE CHANGED/); assert.match(await panel().innerText(), /NO ESCAPE RECORDED/);
  const completed = await recording(); assert.equal(completed.conditions[0].ticks, 1200); assert.equal(completed.conditions[1].ticks, 1200);
  await screenshot('03-completed-phenotype-summary');
  await panel().getByRole('button', { name: 'Replay recorded experiment', exact: true }).click();
  await panel().getByRole('button', { name: 'Play replay', exact: true }).click(); await page.waitForTimeout(4000);
  await panel().getByRole('button', { name: 'Pause replay', exact: true }).click(); await page.waitForTimeout(120);
  assert.equal(await panel().getAttribute('data-mode'), 'replay'); assert.ok(Number(await panel().getAttribute('data-tick')) > 20);
  assert.match(await panel().innerText(), /Does not rerun the experiment/);
  assert.deepEqual(await recording(), completed);
  await screenshot('04-recorded-experiment-replay');
  await responsive(390); await screenshot('05-mobile-replay-390');
  checks.push('Completed retained phenotype precedes telemetry; replay moves recorded poses without changing engine evidence; mobile wraps');
  assert.deepEqual(errors, []); assert.deepEqual(blocked, []);
  fs.writeFileSync(`${dir}/acceptance-trace.json`, JSON.stringify({ disclosure: 'Local production browser, real clocks, provider and brain routes blocked. No live neural/Meta/SAM calls.', checks, layouts, errors, blocked, screenshots: 5, ticks: completed.conditions.map(c => c.ticks), peakAltitude: completed.conditions.map(c => Math.max(...c.trajectory.map(f => f.after.altitude ?? 0))) }, null, 2));
  console.log(JSON.stringify({ checks, errors, blocked, screenshots: 5 }));
} catch (error) { console.log(JSON.stringify({ errors, blocked })); throw error; }
finally { await context.close(); await browser.close(); }
