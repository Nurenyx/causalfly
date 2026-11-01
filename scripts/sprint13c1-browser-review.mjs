// Sprint 13C.1 Guided Single-Page Experiment Flow Browser Review and Screenshot Generation Script
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = 'docs/review/sprint-13c1';
fs.mkdirSync(dir, { recursive: true });

// Also mirror to docs/review/sprint-13c for compatibility if needed
const dir13c = 'docs/review/sprint-13c';
fs.mkdirSync(dir13c, { recursive: true });

const port = 3459;
const host = '127.0.0.1';
console.log(`Starting Next.js server on ${host}:${port} with CAUSALFLY_FAKE_META=1...`);
const server = spawn(`npx next start -H ${host} -p ${port}`, {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, CAUSALFLY_FAKE_META: '1' },
});

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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  console.log(`Navigating to http://${host}:${port}...`);
  await page.goto(`http://${host}:${port}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ========================================================
  // Screen 01: New Question with Dominant Design CTA
  // ========================================================
  console.log('1. Capturing 01-new-question-next-action.png...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/01-new-question-next-action.png`, fullPage: false });
  await page.screenshot({ path: `${dir13c}/01-new-question-next-action.png`, fullPage: false });
  console.log('Saved 01-new-question-next-action.png');

  // ========================================================
  // Screen 02: Design Ready
  // ========================================================
  console.log('2. Designing experiment with Meta...');
  const designBtn = page.getByRole('button', { name: /Design with Meta/i }).first();
  await designBtn.waitFor({ timeout: 10000 });
  await designBtn.click();
  await page.waitForTimeout(1500);

  console.log('Capturing 02-design-ready-next-action.png...');
  const designSection = page.locator('#demo-design, .design-stage-section, .guided-design-deck').first();
  if (await designSection.count() > 0) {
    await designSection.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/02-design-ready-next-action.png`, fullPage: false });
  await page.screenshot({ path: `${dir13c}/02-design-ready-next-action.png`, fullPage: false });
  console.log('Saved 02-design-ready-next-action.png');

  // ========================================================
  // Screen 03: Approved Run Next Action
  // ========================================================
  console.log('3. Capturing 03-approved-run-next-action.png...');
  const runSection = page.locator('#demo-watch, .run-stage-section').first();
  await runSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/03-approved-run-next-action.png`, fullPage: false });
  await page.screenshot({ path: `${dir13c}/03-approved-run-next-action.png`, fullPage: false });
  console.log('Saved 03-approved-run-next-action.png');

  // ========================================================
  // Screen 04: Experiment Complete -> Compare CTA
  // ========================================================
  console.log('4. Running matched experiment...');
  const approveRunBtn = page.getByRole('button', { name: /Approve & Run Experiment/i }).first();
  await approveRunBtn.waitFor({ timeout: 10000 });
  await approveRunBtn.click();
  await page.waitForTimeout(2000);

  console.log('Capturing 04-experiment-complete-compare-cta.png...');
  const completeBanner = page.locator('.matched-complete-transition');
  if (await completeBanner.count() > 0) {
    await completeBanner.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/04-experiment-complete-compare-cta.png`, fullPage: false });
  await page.screenshot({ path: `${dir13c}/04-experiment-complete-compare-cta.png`, fullPage: false });
  console.log('Saved 04-experiment-complete-compare-cta.png');

  // ========================================================
  // Screen 05: Guided Compare Workspace
  // ========================================================
  console.log('5. Clicking Compare what changed transition button...');
  const compareTransitionBtn = page.getByRole('button', { name: /Compare what changed/i }).first();
  await compareTransitionBtn.waitFor({ timeout: 10000 });
  await compareTransitionBtn.click();
  await page.waitForTimeout(1200);

  console.log('Capturing 05-guided-compare.png...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/05-guided-compare.png`, fullPage: false });
  await page.screenshot({ path: `${dir13c}/05-guided-compare.png`, fullPage: false });
  console.log('Saved 05-guided-compare.png');

  // ========================================================
  // Screen 06: Interpret Next Action
  // ========================================================
  console.log('6. Capturing 06-interpret-next-action.png...');
  const explainDeck = page.locator('.compare-meta-action-deck').first();
  if (await explainDeck.count() > 0) {
    await explainDeck.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/06-interpret-next-action.png`, fullPage: false });
  await page.screenshot({ path: `${dir13c}/06-interpret-next-action.png`, fullPage: false });
  console.log('Saved 06-interpret-next-action.png');

  // ========================================================
  // Screen 07: Next Hypothesis Reset
  // ========================================================
  console.log('7. Requesting Meta explanation...');
  const explainBtn = page.getByRole('button', { name: /Explain with Meta/i }).first();
  await explainBtn.waitFor({ timeout: 10000 });
  await explainBtn.click();
  await page.waitForTimeout(2000);

  console.log('Clicking Test the next hypothesis / Use Next Test...');
  const nextHypothesisBtn = page.getByRole('button', { name: /Use Next Test|Test the next hypothesis/i }).first();
  await nextHypothesisBtn.waitFor({ timeout: 10000 });
  await nextHypothesisBtn.click();
  await page.waitForTimeout(1000);

  console.log('Capturing 07-next-hypothesis-reset.png...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/07-next-hypothesis-reset.png`, fullPage: false });
  await page.screenshot({ path: `${dir13c}/07-next-hypothesis-reset.png`, fullPage: false });
  console.log('Saved 07-next-hypothesis-reset.png');

  // Verify Compare mode is disabled after reset
  const compareTabAfterReset = page.locator('.instrument-mode-tab.compare-tab');
  const isDisabled = await compareTabAfterReset.getAttribute('disabled');
  console.log(`Compare tab disabled attribute after reset: ${isDisabled}`);
  assert.ok(isDisabled !== null, 'Compare tab must be disabled after Use as next test resets the workflow');

  // ========================================================
  // Screen 08: 390px Mobile Guided Flow
  // ========================================================
  console.log('8. Testing mobile 390x844 layout...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  // Check horizontal overflow
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const innerWidth = await page.evaluate(() => window.innerWidth);
  console.log(`Mobile width check: scrollWidth=${scrollWidth}, innerWidth=${innerWidth}`);
  assert.ok(scrollWidth <= innerWidth, `No horizontal overflow at 390px: ${scrollWidth} <= ${innerWidth}`);

  console.log('Capturing 08-390-mobile-guided-flow.png...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/08-390-mobile-guided-flow.png`, fullPage: false });
  await page.screenshot({ path: `${dir13c}/08-390-mobile-guided-flow.png`, fullPage: false });
  console.log('Saved 08-390-mobile-guided-flow.png');

  await browser.close();
  console.log('Sprint 13C.1 browser review screenshots completed successfully.');
  assert.equal(errors.length, 0, `Page errors encountered: ${JSON.stringify(errors)}`);

} finally {
  server.kill('SIGTERM');
  console.log('Server process terminated.');
}
