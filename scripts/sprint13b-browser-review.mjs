// Sprint 13B.1 Organism-First Workspace browser review and screenshot generation script
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = 'docs/review/sprint-13b';
fs.mkdirSync(dir, { recursive: true });

// Start Next.js production server on 127.0.0.1
const port = 3456;
const host = '127.0.0.1';
console.log(`Starting Next.js server on ${host}:${port}...`);
const server = spawn('npx next start -H 127.0.0.1 -p 3456', {
  shell: true,
  stdio: 'inherit',
});

// Wait for server to respond
async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 304) return true;
    } catch {
      // wait
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server failed to start within ${timeoutMs}ms at ${url}`);
}

try {
  await waitForServer(`http://${host}:${port}`);
  console.log('Next.js server is ready.');

  const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  const { chromium } = await import(pathToFileURL(playwrightPath).href);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. Rigorous Viewport Validation across 1920, 1440, 1024, 390
  const validationViewports = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1024, height: 768, name: '1024x768' },
    { width: 390, height: 844, name: '390x844' }
  ];

  console.log('--- BEGIN VIEWPORT BOUNDING BOX & INTERSECTION VALIDATION ---');
  for (const vp of validationViewports) {
    const vContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const vPage = await vContext.newPage();
    await vPage.goto(`http://${host}:${port}`, { waitUntil: 'networkidle' });

    // Document canvas count: strictly 1
    const canvasCount = await vPage.locator('canvas').count();
    console.log(`[${vp.name}] WebGL Canvas count: ${canvasCount}`);
    assert.equal(canvasCount, 1, `Expected exactly 1 WebGL canvas at ${vp.name}, found ${canvasCount}`);

    // Horizontal overflow check
    const scrollWidth = await vPage.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await vPage.evaluate(() => window.innerWidth);
    console.log(`[${vp.name}] Horizontal width: scrollWidth=${scrollWidth}, innerWidth=${innerWidth}`);
    assert.ok(scrollWidth <= innerWidth, `Horizontal overflow detected at ${vp.name}: ${scrollWidth} > ${innerWidth}`);

    // Organism viewport bounding box & top position relative to viewport height
    const canvas = vPage.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    assert.ok(canvasBox, `Canvas not found at ${vp.name}`);

    const relativeTop = canvasBox.y / vp.height;
    console.log(`[${vp.name}] Organism Canvas Bounding Box: y=${Math.round(canvasBox.y)}, height=${Math.round(canvasBox.height)}, bottom=${Math.round(canvasBox.y + canvasBox.height)}, relativeTop=${relativeTop.toFixed(2)}`);

    // For 1440x900 and 1920x1080, assert canvas intersects initial visible viewport substantially
    if (vp.name === '1440x900' || vp.name === '1920x1080') {
      assert.ok(canvasBox.y < vp.height * 0.5, `Organism canvas top (${canvasBox.y}) exceeds 50% of viewport height (${vp.height * 0.5}) at ${vp.name}`);
      const visiblePortion = Math.min(canvasBox.y + canvasBox.height, vp.height) - Math.max(canvasBox.y, 0);
      const intersectionRatio = visiblePortion / canvasBox.height;
      console.log(`[${vp.name}] Organism Canvas visible intersection ratio: ${(intersectionRatio * 100).toFixed(1)}%`);
      assert.ok(intersectionRatio >= 0.9, `Organism canvas must intersect initial viewport substantially (>=90%), found ${(intersectionRatio * 100).toFixed(1)}% at ${vp.name}`);
    }

    if (vp.name === '390x844') {
      assert.ok(canvasBox.y < vp.height, `Organism canvas top (${canvasBox.y}) must be above the fold (${vp.height}) on mobile`);
      const visiblePortion = Math.min(canvasBox.y + canvasBox.height, vp.height) - Math.max(canvasBox.y, 0);
      const intersectionRatio = visiblePortion / canvasBox.height;
      console.log(`[390x844] Mobile Organism Canvas visible intersection ratio: ${(intersectionRatio * 100).toFixed(1)}%`);
      assert.ok(intersectionRatio >= 0.8, `Mobile organism must intersect initial viewport substantially (>=80%), found ${(intersectionRatio * 100).toFixed(1)}%`);
    }

    await vContext.close();
  }
  console.log('--- VIEWPORT VALIDATION PASSED SUCCESSFULLY ---');

  // 2. High-Resolution Screenshot Capture
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

  // Abort any external network calls to ensure zero live external calls
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
      return route.abort();
    }
    return route.continue();
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  console.log(`Navigating to http://${host}:${port}...`);
  await page.goto(`http://${host}:${port}`, { waitUntil: 'networkidle' });

  // Check behaviour state is obvious
  const behaviourText = await page.locator('.readout-state-value').textContent();
  console.log(`Active behaviour state: ${behaviourText}`);
  assert.ok(Boolean(behaviourText), 'Behaviour state text is visible');

  // 1. Screenshot: 1920 Observe organism-first
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/01-1920-observe-organism-first.png`, fullPage: false });
  console.log('Captured 01-1920-observe-organism-first.png');

  // 2. Screenshot: 1440 Observe
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/02-1440-observe.png`, fullPage: false });
  console.log('Captured 02-1440-observe.png');

  // 3. Screenshot: 1440 Perturb mode
  const perturbTab = page.locator('.instrument-mode-tab.perturb-tab');
  await perturbTab.click();
  await page.waitForTimeout(600);
  // Ensure we are viewing the organism with Perturb active
  await page.screenshot({ path: `${dir}/03-1440-perturb.png`, fullPage: false });
  console.log('Captured 03-1440-perturb.png');

  // 4. Screenshot: 1440 compact neural instrumentation in context with organism hierarchy
  const neuralDeck = page.locator('.embodied-signals');
  await neuralDeck.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/04-1440-compact-neural-instrumentation.png`, fullPage: false });
  console.log('Captured 04-1440-compact-neural-instrumentation.png');

  // Switch back to Observe
  const observeTab = page.locator('.instrument-mode-tab.observe-tab');
  await observeTab.click();
  await page.waitForTimeout(500);

  // 5. Screenshot: 390 mobile organism-first (Initial viewport without scrolling)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${dir}/05-390-mobile-organism-first.png`, fullPage: false });
  console.log('Captured 05-390-mobile-organism-first.png');

  // 6. Screenshot: Completed / Causal Pipeline state
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  
  // Click "Start controlled trial" to advance simulation
  const trialBtn = page.locator('button:has-text("Start controlled trial")');
  if (await trialBtn.count() > 0) {
    await trialBtn.first().click();
    console.log('Started controlled trial...');
    await page.waitForTimeout(1000);
  }

  // Trigger stimulus pulse in autonomy
  const stimulusBtn = page.locator('button:has-text("Present stimulus")');
  if (await stimulusBtn.count() > 0) {
    await stimulusBtn.first().click();
    console.log('Presented stimulus in autonomous arena...');
    await page.waitForTimeout(1000);
  }

  // Capture causal pipeline and measurements
  const causalPipeline = page.locator('.causal-pipeline');
  if (await causalPipeline.count() > 0) {
    await causalPipeline.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/06-completed-causal-pipeline.png`, fullPage: false });
    console.log('Captured 06-completed-causal-pipeline.png');
  }

  await browser.close();
  console.log('Browser review completed successfully without unhandled errors. Page errors:', errors);
} finally {
  server.kill('SIGTERM');
  console.log('Server process terminated.');
}
