import assert from 'node:assert/strict';

/** Presentation fixture only: deny uploads and live analysis, never contact providers. */
export async function reviewProxyClarity(browser, base, dir) {
  const context = await browser.newContext();
  const blocked = [];
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (url.pathname.startsWith('/api/media/')) { blocked.push('media'); return route.abort(); }
    if (request.method() === 'POST' && url.pathname.startsWith('/api/perception') && request.postDataJSON().mode !== 'fixture') { blocked.push('live analysis'); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Real-world perception', exact: true }).click();
    await page.getByText('Offline demo / validation', { exact: true }).click();
    await page.getByRole('button', { name: 'Load OFFLINE SCENE-UNDERSTANDING FIXTURE', exact: true }).click();
    await page.locator('.scene-candidates input').first().check();
    await page.getByRole('button', { name: 'LOAD OFFLINE TRACKING FIXTURE', exact: true }).click();
    const panel = page.locator('.perception-panel');
    const action = panel.getByRole('button', { name: 'DESIGN EXPERIMENT WITH THIS PROXY', exact: true });
    await action.waitFor();
    for (const text of ['EXPERIMENTAL PROXY', 'Derived from tracked video geometry.', 'Not yet calibrated to biological visual input.', 'Tracking does not directly drive the fly. Use this proxy to design and run a controlled experiment.']) await panel.getByText(text, { exact: true }).waitFor();
    assert.equal(await page.locator('.guided-experiment-flow').getAttribute('data-measured'), 'false');
    const cases = [];
    for (const [width, height] of [[1366,768],[1440,900],[1536,1024],[1920,1080]]) {
      await page.setViewportSize({ width, height });
      await panel.scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await action.isEnabled(), true);
      const layout = await panel.evaluate(el => {
        const selectors = ['.perception-stages', '.perception-metrics', '.perception-proxy-guidance', '.primary-button'];
        return selectors.map(selector => { const r = el.querySelector(selector).getBoundingClientRect(); return { selector, x:r.x, right:r.right, y:r.y, bottom:r.bottom, width:r.width, height:r.height }; });
      });
      for (const box of layout) assert.ok(box.width > 0 && box.height > 0 && box.x >= 0 && box.right <= width + 1);
      for (let i=1;i<layout.length;i++) assert.ok(layout[i].y >= layout[i-1].bottom - 1, 'Stage, result, guidance and action remain in normal flow');
      await panel.screenshot({ path: `${dir}/experimental-proxy-${width}.png` });
      cases.push({ width, height, layout });
    }
    assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
    return { name:'experimental-proxy-scientific-clarity', fixtureOnly:true, cases, blocked, errors, trackingDidNotExecute:true, approvalRequired:true };
  } finally { await context.close(); }
}
