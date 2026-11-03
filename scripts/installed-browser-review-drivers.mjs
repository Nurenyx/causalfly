// Installed browser drivers shared by offline acceptance scripts. No downloads.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);

export function findRealFirefoxExecutable() {
  const candidates = [
    process.env.CAUSALFLY_FIREFOX_BIN,
    path.join(os.homedir(), 'AppData/Local/Microsoft/WindowsApps/firefox.exe'),
    'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const res = spawnSync(candidate, ['--version'], { timeout: 5000, encoding: 'utf8' });
      if (res.status === 0 && /Mozilla Firefox/i.test(res.stdout || '')) return candidate;
    } catch {}
  }
  return null;
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      srv.close(err => (err ? reject(err) : resolve(port)));
    });
    srv.on('error', reject);
  });
}

export async function launchRealFirefoxBiDi(executablePath, base, options = {}) {
  const port = await getFreePort();
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'causalfly-ff-bidi-172-'));
  fs.writeFileSync(
    path.join(profileDir, 'user.js'),
    [
      'user_pref("datareporting.policy.dataSubmissionEnabled", false);',
      'user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);',
      'user_pref("browser.shell.checkDefaultBrowser", false);',
      'user_pref("browser.startup.homepage_override.mstone", "ignore");',
      'user_pref("browser.tabs.warnOnClose", false);',
      'user_pref("network.captive-portal-service.enabled", false);',
      'user_pref("browser.cache.disk.enable", false);',
      'user_pref("browser.cache.memory.enable", false);',
      'user_pref("network.http.use-cache", false);',
    ].join('\n')
  );

  const proc = spawn(
    executablePath,
    ['--headless', '--no-remote', '--profile', profileDir, '--remote-debugging-port', String(port), 'about:blank'],
    { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' } }
  );

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for Firefox WebDriver BiDi')), 15000);
    const onData = chunk => {
      const text = chunk.toString();
      if (text.includes('WebDriver BiDi listening on')) {
        clearTimeout(timer);
        resolve();
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.once('exit', code => {
      clearTimeout(timer);
      reject(new Error(`Firefox exited early with code ${code}`));
    });
  });

  const ws = new WebSocket(`ws://127.0.0.1:${port}/session`);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const errors = [];
  const blocked = [];
  const fixtureUrl = base + '/__causalfly_timeline_fixture';
  const fixtureHtml = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';
  let serveFixture = false;
  const activeRequests = new Set();
  let lastNetworkActivity = Date.now();

  ws.addEventListener('message', event => {
    const msg = JSON.parse(String(event.data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.type === 'error' || msg.error) {
        reject(new Error(`${msg.error}: ${msg.message}`));
      } else {
        resolve(msg.result);
      }
    } else if (msg.method === 'network.responseCompleted' || msg.method === 'network.fetchError') {
      activeRequests.delete(msg.params.request.request);
      lastNetworkActivity = Date.now();
    } else if (msg.method === 'network.beforeRequestSent' && msg.params?.isBlocked) {
      activeRequests.add(msg.params.request.request);
      lastNetworkActivity = Date.now();
      const url = new URL(msg.params.request.url);
      const allowed = url.origin === new URL(base).origin && (!url.pathname.startsWith('/api/') || url.pathname === '/api/health' || (options?.allowLocalExperiments && url.pathname === '/api/experiments'));
      if (!allowed) blocked.push(url.origin + url.pathname);
      if (allowed && serveFixture && url.href === fixtureUrl) {
        send('network.provideResponse', {request:msg.params.request.request,statusCode:200,headers:[{name:'Content-Type',value:{type:'string',value:'text/html; charset=utf-8'}}],body:{type:'string',value:fixtureHtml}}).catch(e=>errors.push(e.message));
        return;
      }
      send(allowed ? 'network.continueRequest' : 'network.failRequest', { request: msg.params.request.request }).catch(e => errors.push(e.message));
    } else if (msg.method === 'log.entryAdded' && msg.params?.level === 'error' && msg.params?.type === 'javascript') {
      errors.push(msg.params.text || 'JavaScript error');
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error('BiDi command timed out: ' + method)); }, 30000);
      pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const sessionInfo = await send('session.new', { capabilities: {} });
  const browserVersion = sessionInfo?.capabilities?.browserVersion ?? 'unknown';
  const created = await send('browsingContext.create', { type: 'tab' });
  const context = created.context;
  await send('session.subscribe', { events: ['log.entryAdded', 'network.beforeRequestSent', 'network.responseCompleted', 'network.fetchError'], contexts: [context] });
  await send('network.addIntercept', { phases: ['beforeRequestSent'], contexts: [context] });
  assert.match(browserVersion, /^159\.0(?:\.|$)/, 'Acceptance requires installed Firefox 159.0');

  const evalJson = async expression => {
    const wrapped = `(async () => { const __v = await (${expression}); return JSON.stringify(__v === undefined ? null : __v); })()`;
    const res = await send('script.evaluate', {
      expression: wrapped,
      target: { context },
      awaitPromise: true,
      resultOwnership: 'none',
    });
    if (res.type === 'exception') {
      throw new Error(`Firefox evaluate exception: ${res.exceptionDetails?.text ?? JSON.stringify(res)}`);
    }
    return JSON.parse(res.result.value);
  };
  const waitForNetworkIdle = async () => {
    const deadline = Date.now() + 20000;
    while (activeRequests.size || Date.now() - lastNetworkActivity < 500) {
      if (Date.now() > deadline) throw new Error('Firefox network did not settle before navigation: ' + [...activeRequests].join(', '));
      await new Promise(r => setTimeout(r, 50));
    }
  };

  return {
    browserName: `Mozilla Firefox ${browserVersion}`,
    errors,
    blocked,
    async setViewportSize({ width, height }) {
      await send('browsingContext.setViewport', { context, viewport: { width, height } });
    },
    async addInitScript(fnSource) {
      await send('script.addPreloadScript', {
        functionDeclaration: fnSource,
        contexts: [context],
      });
    },
    async goto(url) {
      await waitForNetworkIdle();
      await send('browsingContext.navigate', { context, url, wait: 'complete' });
      await waitForNetworkIdle();
    },
    async gotoFixture() {
      serveFixture = true;
      await waitForNetworkIdle();
      await send('browsingContext.navigate', { context, url:fixtureUrl, wait:'complete' });
      await waitForNetworkIdle();
    },
    async hardReload() {
      // Firefox 159 rejects BiDi ignoreCache. This isolated profile disables
      // disk, memory and HTTP caches before startup, so reload is cache-cold.
      await waitForNetworkIdle();
      await send('browsingContext.reload', { context, wait: 'complete' });
      await waitForNetworkIdle();
    },
    evalJson,
    async waitFor(predicateExpr, timeoutMs = 10000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const ok = await evalJson(predicateExpr);
        if (ok) return ok;
        await new Promise(r => setTimeout(r, 50));
      }
      throw new Error(`Timed out waiting for: ${predicateExpr}`);
    },
    async screenshot(filePath) {
      await evalJson(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => resolve(true), 100))))`);
      const shot = await send('browsingContext.captureScreenshot', { context });
      fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
    },
    async close() {
      try {
        await send('browser.close');
      } catch { /* Browser may already have exited after a failed command. */ }
      try {
        ws.close();
      } catch {}
      try {
        proc.kill();
      } catch {}
      await new Promise(r => setTimeout(r, 200));
      try {
        if (path.resolve(profileDir).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(profileDir).startsWith('causalfly-ff-bidi-172-')) fs.rmSync(profileDir, { recursive: true, force: true });
      } catch {}
    },
  };
}

export async function launchEdgeAdapter(base, options = {}) {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1728, height: 1080 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  const blocked = [];
  const fixtureUrl = base + '/__causalfly_timeline_fixture';
  let serveFixture = false;
  page.on('pageerror', e => errors.push(e.message));
  await context.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.origin !== new URL(base).origin || (u.pathname.startsWith('/api/') && u.pathname !== '/api/health' && !(options?.allowLocalExperiments && u.pathname === '/api/experiments'))) {
      blocked.push(u.origin + u.pathname);
      return r.abort();
    }
    if(serveFixture && u.href===fixtureUrl) return r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'});
    return r.continue();
  });
  await context.routeWebSocket('**', s => s.close());

  return {
    browserName: `Microsoft Edge ${browser.version()}`,
    errors,
    blocked,
    page,
    context,
    async setViewportSize({ width, height }) {
      await page.setViewportSize({ width, height });
    },
    async addInitScript(fnSource) {
      await page.addInitScript(`(${fnSource})()`);
    },
    async goto(url) {
      await page.goto(url, { waitUntil: 'networkidle' });
    },
    async gotoFixture() {
      serveFixture = true;
      await page.goto(fixtureUrl, {waitUntil:'networkidle'});
    },
    async hardReload() {
      await page.reload({ waitUntil: 'networkidle' });
    },
    async evalJson(expression) {
      return page.evaluate(`(async () => (${expression}))()`);
    },
    async waitFor(predicateExpr, timeoutMs = 10000) {
      await page.waitForFunction(predicateExpr, undefined, { timeout: timeoutMs });
    },
    async screenshot(filePath) {
      await page.screenshot({ path: filePath });
    },
    async close() {
      await context.close();
      await browser.close();
    },
  };
}

