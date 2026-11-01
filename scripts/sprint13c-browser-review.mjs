// Sprint 13C Control vs Intervention Comparison Workspace browser review and screenshot generation script
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = 'docs/review/sprint-13c';
fs.mkdirSync(dir, { recursive: true });

// Start Next.js production server on 127.0.0.1:3458
const port = 3458;
const host = '127.0.0.1';
console.log(`Starting Next.js server on ${host}:${port} with CAUSALFLY_FAKE_META=1...`);
const server = spawn('npx next start -H 127.0.0.1 -p 3458', {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, CAUSALFLY_FAKE_META: '1' },
});

// Wait for server to respond
async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 304) return true;
    } catch {
      // retry
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server failed to start within ${timeoutMs}ms at ${url}`);
}

try {
  await waitForServer(`http://${host}:${port}`);
  console.log('Next.js server is ready.');

  const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  let playwright;
  if (fs.existsSync(playwrightPath)) {
    playwright = await import(pathToFileURL(playwrightPath).href);
  } else {
    playwright = await import('playwright');
  }
  const { chromium } = playwright;

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  console.log(`Navigating to http://${host}:${port}...`);
  await page.goto(`http://${host}:${port}`, { waitUntil: 'networkidle' });

  // 1. Initial WebGL Canvas check & design flow
  const initialCanvasCount = await page.locator('canvas').count();
  console.log(`Initial WebGL Canvas count: ${initialCanvasCount}`);
  assert.equal(initialCanvasCount, 1, `Expected exactly 1 canvas on entry, found ${initialCanvasCount}`);

  // Design experiment with Meta
  console.log('Designing experiment with Meta...');
  const designBtn = page.getByRole('button', { name: /Design with Meta/i });
  await designBtn.waitFor({ timeout: 10000 });
  await designBtn.click();

  // Approve & Run Experiment
  console.log('Waiting for Approve & Run Experiment button...');
  const approveBtn = page.getByRole('button', { name: /Approve & Run Experiment/i });
  await approveBtn.waitFor({ timeout: 10000 });
  await approveBtn.click();

  // Wait for experiment result to record
  console.log('Waiting for experiment execution to complete...');
  await page.waitForTimeout(2000);

  // Switch to COMPARE mode
  console.log('Switching to COMPARE mode...');
  const compareTab = page.locator('.instrument-mode-tab.compare-tab');
  await compareTab.waitFor({ timeout: 5000 });
  await compareTab.click();
  await page.waitForTimeout(1000);

  // 2. Viewport and Single Canvas Assertions across all screen sizes
  const validationViewports = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1024, height: 768, name: '1024x768' },
    { width: 390, height: 844, name: '390x844' }
  ];

  console.log('--- BEGIN VIEWPORT VALIDATION IN COMPARE MODE ---');
  for (const vp of validationViewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    // Canvas count MUST strictly be 1
    const compareCanvasCount = await page.locator('canvas').count();
    console.log(`[${vp.name}] WebGL Canvas count in Compare: ${compareCanvasCount}`);
    assert.equal(compareCanvasCount, 1, `Expected strictly 1 WebGL canvas in Compare at ${vp.name}, found ${compareCanvasCount}`);

    // Horizontal overflow check
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    console.log(`[${vp.name}] Horizontal width: scrollWidth=${scrollWidth}, innerWidth=${innerWidth}`);
    assert.ok(scrollWidth <= innerWidth, `Horizontal overflow in Compare at ${vp.name}: ${scrollWidth} > ${innerWidth}`);
  }
  console.log('--- VIEWPORT VALIDATION IN COMPARE MODE PASSED ---');

  // Verify key Compare mode elements
  assert.ok(await page.locator('.compare-playback-container').isVisible(), 'Playback container must be visible');
  assert.ok(await page.locator('.compare-hero-result').isVisible(), 'Hero result must be visible');
  assert.ok(await page.locator('.difference-table').isVisible(), 'Difference table must be visible');
  assert.ok(await page.locator('.compare-trust-card').isVisible(), 'Trust card must be visible');
  assert.ok(await page.locator('.compare-neural-grid').isVisible(), 'Neural comparison must be visible');

  // 3. Capture screenshots required for Sprint 13C

  // 01: 1920 Compare Full Workspace
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/01-1920-compare-full-workspace.png`, fullPage: false });
  console.log('Captured 01-1920-compare-full-workspace.png');

  // 02: 1440 Compare Control vs Intervention
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/02-1440-compare-control-intervention.png`, fullPage: false });
  console.log('Captured 02-1440-compare-control-intervention.png');

  // 03: 1440 Compare Measured Result
  const heroResult = page.locator('.compare-hero-result');
  await heroResult.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/03-1440-compare-measured-result.png`, fullPage: false });
  console.log('Captured 03-1440-compare-measured-result.png');

  // 04: 1440 Neural Comparison
  const neuralSection = page.locator('.compare-neural-section');
  await neuralSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/04-1440-neural-comparison.png`, fullPage: false });
  console.log('Captured 04-1440-neural-comparison.png');

  // 05: 1440 Matched Conditions & Trust Card
  const trustCard = page.locator('.compare-trust-card');
  await trustCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/05-1440-matched-conditions.png`, fullPage: false });
  console.log('Captured 05-1440-matched-conditions.png');

  // 06: 390 Mobile Compare
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  // Test mobile focus controls
  const focusControlBtn = page.getByRole('button', { name: 'Control', exact: true });
  if (await focusControlBtn.count() > 0) {
    await focusControlBtn.first().click();
    await page.waitForTimeout(200);
  }
  const focusBothBtn = page.getByRole('button', { name: 'Both', exact: true });
  if (await focusBothBtn.count() > 0) {
    await focusBothBtn.first().click();
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: `${dir}/06-390-mobile-compare.png`, fullPage: false });
  console.log('Captured 06-390-mobile-compare.png');

  // 07: Observe Regression Check (1440x900)
  await page.setViewportSize({ width: 1440, height: 900 });
  const observeTab = page.locator('.instrument-mode-tab.observe-tab');
  await observeTab.click();
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${dir}/07-observe-regression-check.png`, fullPage: false });
  console.log('Captured 07-observe-regression-check.png');

  // 08: Perturb Regression Check (1440x900)
  const perturbTab = page.locator('.instrument-mode-tab.perturb-tab');
  await perturbTab.click();
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${dir}/08-perturb-regression-check.png`, fullPage: false });
  console.log('Captured 08-perturb-regression-check.png');

  await browser.close();
  console.log('Browser review completed successfully. Total page errors:', errors.length);
  assert.equal(errors.length, 0, `Page errors encountered during review: ${JSON.stringify(errors)}`);

} finally {
  server.kill('SIGTERM');
  console.log('Server process terminated.');
}
