// Sprint 13A browser review and screenshot generation script
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const dir = 'docs/review/sprint-13a';
fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

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

console.log('Navigating to http://localhost:3000...');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

// 1. Verify First-Run Banner is visible
const banner = page.locator('.first-run-banner');
await page.waitForSelector('.first-run-banner', { timeout: 5000 });
console.log('First-run banner is visible.');

// Capture First-Run Banner screenshot
await banner.screenshot({ path: `${dir}/05-first-run-banner.png` });
console.log('Captured 05-first-run-banner.png');

// 2. 1920 desktop unified shell
await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${dir}/01-desktop-unified-shell-1920.png`, fullPage: false });
console.log('Captured 01-desktop-unified-shell-1920.png');

// 3. 1440 desktop unified shell
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${dir}/02-desktop-unified-shell-1440.png`, fullPage: false });
console.log('Captured 02-desktop-unified-shell-1440.png');

// 4. Live Connectome selected with truthful capability state
// Click "Live Connectome" tab or data source
const liveSourceRadio = page.locator('input[value="FRUITFLY_XR"]');
if (await liveSourceRadio.count() > 0) {
  await liveSourceRadio.click();
} else {
  // If in source picker
  await page.click('text="Live Connectome"');
}
await page.waitForTimeout(600);

// Switch instrument mode to "Perturb" on Live Connectome to trigger capability notice
const perturbTab = page.locator('.instrument-mode-tab.perturb-tab');
await perturbTab.click();
await page.waitForTimeout(500);

await page.screenshot({ path: `${dir}/03-live-connectome-truthful-capability.png`, fullPage: false });
console.log('Captured 03-live-connectome-truthful-capability.png');

// Switch back to Synthetic Fixture via fallback button
const switchBtn = page.locator('.banner-switch-btn');
if (await switchBtn.count() > 0) {
  await switchBtn.click();
  await page.waitForTimeout(500);
}

// 5. 390 mobile shell
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);

// Check no horizontal overflow
const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
const innerWidth = await page.evaluate(() => window.innerWidth);
console.log(`Mobile width check: scrollWidth=${scrollWidth}, innerWidth=${innerWidth}`);
assert.ok(scrollWidth <= innerWidth, `No horizontal overflow at 390px (scrollWidth ${scrollWidth} <= ${innerWidth})`);

await page.screenshot({ path: `${dir}/04-mobile-shell-390.png`, fullPage: false });
console.log('Captured 04-mobile-shell-390.png');

await browser.close();
console.log('Sprint 13A browser review complete. Errors:', errors);
