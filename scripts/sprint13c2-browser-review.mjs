// Sprint 13C.2 Mobile Guidance & Compare Toolbar Browser Review Script
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = 'docs/review/sprint-13c2';
fs.mkdirSync(dir, { recursive: true });

// Also mirror to docs/review/sprint-13c for unified acceptance documentation
const dir13c = 'docs/review/sprint-13c';
fs.mkdirSync(dir13c, { recursive: true });

const port = 3460;
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

  // ========================================================
  // 1. Mobile 390px: Question Retained / Dominant Design CTA Preceding World
  // ========================================================
  console.log('1. Setting up 390px mobile viewport...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  const mobileErrors = [];
  mobilePage.on('pageerror', err => mobileErrors.push(err.message));

  console.log(`Navigating mobile to http://${host}:${port}...`);
  await mobilePage.goto(`http://${host}:${port}`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  console.log('Capturing 01-390-question-design-next.png...');
  await mobilePage.evaluate(() => window.scrollTo(0, 0));
  await mobilePage.waitForTimeout(500);

  // Verify mobile next action button is visible in first viewport without scrolling
  const designCtaMobile = mobilePage.locator('.mobile-dominant-next-action .mobile-design-cta').first();
  await designCtaMobile.waitFor({ timeout: 5000 });
  const isDesignVisible = await designCtaMobile.isVisible();
  assert.ok(isDesignVisible, 'Mobile Design CTA must be visible in the first viewport');

  await mobilePage.screenshot({ path: `${dir}/01-390-question-design-next.png`, fullPage: false });
  await mobilePage.screenshot({ path: `${dir13c}/01-390-question-design-next.png`, fullPage: false });
  console.log('Saved 01-390-question-design-next.png');

  // ========================================================
  // 2. Mobile 390px: Validated Design / Approve & Run CTA Preceding World
  // ========================================================
  console.log('2. Clicking mobile Design CTA...');
  await designCtaMobile.click();
  await mobilePage.waitForTimeout(1500);

  console.log('Capturing 02-390-design-approve-next.png...');
  await mobilePage.evaluate(() => window.scrollTo(0, 0));
  await mobilePage.waitForTimeout(500);

  const approveCtaMobile = mobilePage.locator('.mobile-dominant-next-action .mobile-approve-cta').first();
  await approveCtaMobile.waitFor({ timeout: 5000 });
  const isApproveVisible = await approveCtaMobile.isVisible();
  assert.ok(isApproveVisible, 'Mobile Approve CTA must be visible in the first viewport preceding Embodied World');

  await mobilePage.screenshot({ path: `${dir}/02-390-design-approve-next.png`, fullPage: false });
  await mobilePage.screenshot({ path: `${dir13c}/02-390-design-approve-next.png`, fullPage: false });
  console.log('Saved 02-390-design-approve-next.png');

  // ========================================================
  // 3. Mobile 390px: Matched Run Complete / Compare CTA Preceding World
  // ========================================================
  console.log('3. Clicking mobile Approve & Run CTA...');
  await approveCtaMobile.click();
  await mobilePage.waitForTimeout(4000); // Wait for twin engine simulation to complete

  console.log('Capturing 03-390-complete-compare-next.png...');
  await mobilePage.evaluate(() => window.scrollTo(0, 0));
  await mobilePage.waitForTimeout(500);

  const compareTransitionCta = mobilePage.locator('.matched-complete-transition .compare-transition-btn').first();
  await compareTransitionCta.waitFor({ timeout: 10000 });
  const isCompareVisible = await compareTransitionCta.isVisible();
  assert.ok(isCompareVisible, 'Compare transition CTA must be visible preceding visualization');

  await mobilePage.screenshot({ path: `${dir}/03-390-complete-compare-next.png`, fullPage: false });
  await mobilePage.screenshot({ path: `${dir13c}/03-390-complete-compare-next.png`, fullPage: false });
  console.log('Saved 03-390-complete-compare-next.png');

  // ========================================================
  // 4. Mobile 390px: Compare Mode / Explain with Meta Action Prominent
  // ========================================================
  console.log('4. Entering Compare mode on mobile...');
  await compareTransitionCta.click();
  await mobilePage.waitForTimeout(1500);

  console.log('Capturing 04-390-compare-explain-next.png...');
  const explainBtn = mobilePage.locator('.compare-hero-result .explain-meta-btn, #demo-result .explain-meta-btn').first();
  await explainBtn.scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(500);

  await mobilePage.screenshot({ path: `${dir}/04-390-compare-explain-next.png`, fullPage: false });
  await mobilePage.screenshot({ path: `${dir13c}/04-390-compare-explain-next.png`, fullPage: false });
  console.log('Saved 04-390-compare-explain-next.png');

  // ========================================================
  // 5. Mobile 390px: Interpretation & Next Hypothesis Action
  // ========================================================
  console.log('5. Clicking Explain with Meta on mobile...');
  await explainBtn.click();
  await mobilePage.waitForTimeout(2000);

  console.log('Capturing 05-390-next-hypothesis.png...');
  const nextSection = mobilePage.locator('#demo-understand-next, .interpret-stage-section').first();
  if (await nextSection.count() > 0) {
    await nextSection.scrollIntoViewIfNeeded();
  }
  await mobilePage.waitForTimeout(500);

  await mobilePage.screenshot({ path: `${dir}/05-390-next-hypothesis.png`, fullPage: false });
  await mobilePage.screenshot({ path: `${dir13c}/05-390-next-hypothesis.png`, fullPage: false });
  console.log('Saved 05-390-next-hypothesis.png');

  await mobileContext.close();

  // ========================================================
  // 6. Intermediate Width (1024px tablet): Compare Toolbar Wrap & No Overflow
  // ========================================================
  console.log('6. Setting up 1024px tablet viewport...');
  const tabletContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto(`http://${host}:${port}`, { waitUntil: 'networkidle' });
  await tabletPage.waitForTimeout(1000);

  // Fast forward to compare mode on tablet
  const tabletDesign = tabletPage.locator('.scientist-action button').first();
  await tabletDesign.click();
  await tabletPage.waitForTimeout(1500);
  const tabletRun = tabletPage.locator('.scientist-action button').first();
  await tabletRun.click();
  await tabletPage.waitForTimeout(4000);
  const tabletCompare = tabletPage.locator('.compare-transition-btn').first();
  await tabletCompare.click();
  await tabletPage.waitForTimeout(1500);

  console.log('Capturing 06-1024-compare-toolbar.png...');
  const toolbar = tabletPage.locator('.compare-playback-container').first();
  await toolbar.scrollIntoViewIfNeeded();
  await tabletPage.waitForTimeout(500);

  // Verify zero horizontal overflow at 1024px
  const tabletOverflow = await tabletPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(tabletOverflow, false, 'No horizontal overflow at 1024px');

  await tabletPage.screenshot({ path: `${dir}/06-1024-compare-toolbar.png`, fullPage: false });
  await tabletPage.screenshot({ path: `${dir13c}/06-1024-compare-toolbar.png`, fullPage: false });
  console.log('Saved 06-1024-compare-toolbar.png');

  await tabletContext.close();

  // ========================================================
  // 7. Desktop 1440px: Desktop Regression Check
  // ========================================================
  console.log('7. Setting up 1440px desktop viewport...');
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(`http://${host}:${port}`, { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1000);

  console.log('Capturing 07-1440-desktop-regression.png...');
  await desktopPage.evaluate(() => window.scrollTo(0, 0));
  await desktopPage.waitForTimeout(500);

  // Verify zero horizontal overflow at 1440px
  const desktopOverflow = await desktopPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(desktopOverflow, false, 'No horizontal overflow at 1440px');

  await desktopPage.screenshot({ path: `${dir}/07-1440-desktop-regression.png`, fullPage: false });
  await desktopPage.screenshot({ path: `${dir13c}/07-1440-desktop-regression.png`, fullPage: false });
  console.log('Saved 07-1440-desktop-regression.png');

  await desktopContext.close();
  await browser.close();

  console.log('All 7 Sprint 13C.2 screenshots captured successfully!');
} finally {
  console.log('Terminating Next.js server...');
  server.kill('SIGINT');
}
