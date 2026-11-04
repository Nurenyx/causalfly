// Local acceptance only. HTTP is intercepted by the installed drivers; brain sockets are in memory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {findRealFirefoxExecutable, launchRealFirefoxBiDi, launchEdgeAdapter} from './installed-browser-review-drivers.mjs';

const base = process.env.CAUSALFLY_BROWSER_REVIEW_BASE ?? 'http://127.0.0.1:3496';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const dir = 'docs/review/final-hotfix-landing-feedback';
fs.mkdirSync(dir, {recursive: true});
const report = {fixtureOnly: true, realBrainMessages: 0, providerCalls: 0, browsers: []};
const fixtureBundles = {};
for (const configured of [false, true]) {
  const bundle = await build({
    stdin: {resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {AutonomyPanel} from './src/app/components/autonomy-panel';
      import {disconnectedFruitFly} from './src/lib/sources/contracts';
      import {connectomeHash} from './src/lib/sources/fruitfly-protocol';
      const sessionId = '00000000-0000-4000-8000-000000000001';
      window.fakeSockets = []; window.fakeMode = 'pending';
      window.WebSocket = class {
        bufferedAmount = 0; listeners = {}; sends = []; closed = false; sequence = 0;
        constructor(url) { if (url !== 'wss://brain.invalid/brain/v1') throw Error('Unexpected endpoint'); window.fakeSockets.push(this); }
        addEventListener(name, callback) { this.listeners[name] = callback; }
        emit(value) { this.listeners.message?.({data: JSON.stringify(value)}); }
        hello() { this.emit({version:1,type:'hello',sessionId,dataset:'male-cns:v1.0',sha256:connectomeHash,neurons:176422,edges:6287749,dtMs:.5,tickMs:50,gain:.65,seed:20260903}); }
        send(json) {
          if (this.closed) throw Error('Closed fake socket');
          const input = JSON.parse(json); this.sends.push(input);
          if (window.fakeMode === 'pending') return;
          // Real network delivery is asynchronous, after the send call returns.
          queueMicrotask(() => this.emit({version:1,type:'telemetry',sessionId,sequence:++this.sequence,inputSequence:input.sequence,capturedMs:input.capturedMs,simulationMs:this.sequence*50,inputFresh:window.fakeMode!=='stale',inputAgeMs:10,computeMs:25,realTimeFactor:2,lagMs:0,takeoff:0,activeNeurons:2,spikes:1,totalSpikes:1,status:'OK',motorMode:'IDLE',jump:false,escape:false,sensoryProvenance:'PROXY',decisionProvenance:'CONNECTOME',embodimentProvenance:'SCRIPTED',landingProvenance:'SCRIPTED',populations:[],channels:[]}));
        }
        close() { this.closed = true; }
        disconnect() { this.listeners.close?.({}); }
      };
      createRoot(document.getElementById('root')).render(<><p id="telemetry">READ-ONLY TELEMETRY: CONNECTED (authored fixture)</p><AutonomyPanel model="lightweight" snapshot={{...disconnectedFruitFly(),state:'CONNECTED'}} /></>);
    `},
    bundle: true, write: false, platform: 'browser', jsx: 'automatic',
    define: {'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL': JSON.stringify(configured ? 'wss://brain.invalid/brain/v1' : '')},
    plugins: [{name: 'world-placeholder', setup(b) {
      b.onResolve({filter: /^\.\/embodied-world$/}, () => ({path: 'world', namespace: 'fixture'}));
      b.onLoad({filter: /.*/, namespace: 'fixture'}, () => ({contents: 'export default function World(){return null}', loader: 'js'}));
    }}],
  });
  fixtureBundles[configured] = bundle.outputFiles[0].text;
}

for (const [name, launch] of [
  ['edge', () => launchEdgeAdapter(base)],
  ['firefox', () => launchRealFirefoxBiDi(findRealFirefoxExecutable(), base)],
]) {
  const driver = await launch();
  const result = {name, version: driver.browserName, landing: [], navigation: [], feedback: []};
  const click = async text => {
    assert.equal(await driver.evalJson(`(() => {const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}||b.getAttribute('aria-label')===${JSON.stringify(text === 'Overview' ? 'Overview & Orientation' : text)});if(!b||b.disabled)return false;b.click();return true;})()`), true, `Enabled button: ${text}`);
  };
  const expectFeedback = async state => {
    await driver.waitFor(`document.querySelector('.sensory-feedback')?.dataset.feedback===${JSON.stringify(state)}`);
    result.feedback.push(state);
  };
  try {
    await driver.addInitScript(`() => {window.EventSource=class {close(){}};window.WebSocket=class {constructor(){throw Error('Real brain connection prohibited');}};}`);
    await driver.goto(base);
    await driver.waitFor(`Boolean(document.querySelector('.home-overview'))`);
    assert.equal((await driver.evalJson(`fetch('/api/health').then(r=>r.json())`)).metaMode, 'offline');
    const styles = await driver.evalJson(`[...document.querySelectorAll('link[rel=stylesheet]')].map(n=>n.href)`);
    const htmlClass = await driver.evalJson(`document.documentElement.className`);
    for (const width of [320, 360, 390, 430, 760, 1024, 1100, 1440, 1920]) {
      await driver.setViewportSize({width, height: 1080});
      await driver.evalJson(`document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>r(true))))`);
      const metrics = await driver.evalJson(`(() => {
        const box=s=>{const el=document.querySelector(s),r=el.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,right:r.right,display:getComputedStyle(el).display};};
        const heroStyle=getComputedStyle(document.querySelector('.home-hero'));
        const copyBottom=document.querySelector('.page-header-copy').lastElementChild.getBoundingClientRect().bottom;
        return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,headerHeight:box('.page-header').height,headerBlankGap:document.querySelector('.page-header-tools').getBoundingClientRect().top-copyBottom,hero:box('.home-hero'),heroPadding:parseFloat(heroStyle.paddingLeft)+parseFloat(heroStyle.paddingRight),instrument:box('.home-instrument'),svg:box('.home-instrument svg'),heading:box('#home-title'),cta:box('.home-introduction button'),ctaDisabled:document.querySelector('.home-introduction button').disabled,columns:heroStyle.gridTemplateColumns};
      })()`);
      assert.equal(metrics.overflow, false, `${name} ${width}: no horizontal overflow`);
      assert.ok(metrics.instrument.width > 0 && metrics.svg.height > 0);
      assert.ok(metrics.heading.right <= width + 1 && metrics.cta.right <= width + 1);
      assert.equal(metrics.ctaDisabled, false);
      if (width <= 760) assert.ok(metrics.headerBlankGap <= 32, `${name} ${width}: no empty mobile header region`);
      if (width <= 1100) {
        assert.ok(metrics.svg.height >= 220 && metrics.svg.height <= 300);
        assert.equal(metrics.columns.split(' ').length, 1);
        assert.ok(Math.abs(metrics.hero.width - metrics.heroPadding - metrics.instrument.width) <= 1);
      }
      result.landing.push(metrics);
      if ([320,390].includes(width)) {
        await driver.evalJson(`(() => {scrollTo(0,0);return true;})()`);
        await driver.screenshot(`${dir}/${name}-top-${width}.png`);
        await driver.evalJson(`(() => {document.querySelector('#home-title').scrollIntoView({block:'start'});return true;})()`);
        await driver.screenshot(`${dir}/${name}-heading-${width}.png`);
      }
      await driver.evalJson(`(() => {document.querySelector('.home-instrument').scrollIntoView({block:'center'});return true;})()`);
      await driver.screenshot(`${dir}/${name}-landing-${width}.png`);
    }
    await driver.setViewportSize({width:1440,height:1080});
    await driver.evalJson(`(() => {document.querySelector('.home-introduction button').click();return true;})()`);
    await driver.waitFor(`Boolean(document.querySelector('.research-cockpit'))`);
    result.navigation.push('CTA → Experiment');
    for (const [label, selector] of [['Live Connectome','.live-launcher'], ['Evidence','.evidence-view'], ['Overview','.home-overview'], ['Experiment','.research-cockpit'], ['Overview','.home-overview']]) {
      await click(label);
      await driver.waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
      result.navigation.push(label);
    }
    await driver.hardReload();
    await driver.waitFor(`Boolean(document.querySelector('.home-overview'))`);
    result.navigation.push('fresh reload → Overview');

    for (const configured of [false, true]) {
      await driver.gotoFixture();
      await driver.evalJson(`(() => {
        document.documentElement.className=${JSON.stringify(htmlClass)};
        document.head.innerHTML=${JSON.stringify(styles.map(h=>`<link rel="stylesheet" href="${h}">`).join(''))};
        document.body.innerHTML='<div id="root"></div>';
        const script=document.createElement('script');script.textContent=${JSON.stringify(fixtureBundles[configured])};document.body.appendChild(script);return true;
      })()`);
      if (!configured) {
        await expectFeedback('NOT CONFIGURED');
        assert.equal(await driver.evalJson(`document.querySelector('.sensory-feedback input').disabled`), true);
        assert.match(await driver.evalJson(`document.querySelector('.sensory-feedback').textContent`), /Read-only telemetry is connected, but the experimental brain-input endpoint is not configured/);
        assert.equal(await driver.evalJson(`window.fakeSockets.length`), 0);
        continue;
      }
      await expectFeedback('OFF');
      assert.equal(await driver.evalJson(`document.querySelector('.sensory-feedback input').disabled`), false);
      assert.equal(await driver.evalJson(`window.fakeSockets.length`), 0);
      await driver.evalJson(`(() => {document.querySelector('.sensory-feedback input').click();return true;})()`);
      await expectFeedback('ARMED');
      await driver.waitFor(`window.fakeSockets.length===1`);
      assert.equal(await driver.evalJson(`window.fakeSockets[0].sends.length`), 0);
      await driver.evalJson(`(() => {window.fakeSockets[0].hello();return true;})()`);
      await expectFeedback('SENDING');
      assert.doesNotMatch(await driver.evalJson(`document.querySelector('.sensory-feedback').textContent`), /Last stimulus referenced/);
      await driver.evalJson(`(() => {window.fakeMode='valid';return true;})()`);
      await expectFeedback('ACCEPTED');
      await driver.evalJson(`(() => {window.fakeMode='stale';return true;})()`);
      await expectFeedback('REJECTED');
      await driver.evalJson(`(() => {window.fakeSockets[0].disconnect();return true;})()`);
      // Rejected receipts remain rejected until explicitly reset, including after close.
      await expectFeedback('REJECTED');
      await driver.evalJson(`(() => {document.querySelector('.sensory-feedback input').click();return true;})()`);
      await expectFeedback('OFF');
      assert.equal(await driver.evalJson(`document.querySelector('.sensory-feedback input').disabled`), false);
      await driver.evalJson(`(() => {document.querySelector('.sensory-feedback input').click();return true;})()`);
      await expectFeedback('ARMED');
      await driver.waitFor(`window.fakeSockets.length===2`);
      await driver.evalJson(`(() => {window.fakeSockets[1].disconnect();return true;})()`);
      await expectFeedback('DISCONNECTED');
      assert.equal(await driver.evalJson(`document.querySelector('.sensory-feedback input').disabled`), false);
      await click('Pause autonomy'); await expectFeedback('PAUSED');
      await click('Resume autonomy'); await expectFeedback('DISCONNECTED');
      await driver.waitFor(`document.querySelector('.autonomy-panel').dataset.tick>=2`);
      await click('Replay recorded experiment'); await expectFeedback('REPLAY');
      assert.equal(await driver.evalJson(`document.querySelector('.sensory-feedback input').disabled`), true);
      assert.match(await driver.evalJson(`document.querySelector('#telemetry').textContent`), /CONNECTED/);
      result.fakeMessages = await driver.evalJson(`window.fakeSockets.reduce((n,s)=>n+s.sends.length,0)`);
      await driver.screenshot(`${dir}/${name}-feedback-replay.png`);
    }
    assert.deepEqual(driver.errors, []);
    assert.deepEqual(driver.blocked, []);
    result.errors = driver.errors;
    report.browsers.push(result);
    fs.writeFileSync(`${dir}/browser-results.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({browser:result.version,landingWidths:result.landing.map(m=>m.width),navigation:result.navigation,feedback:result.feedback,fakeMessages:result.fakeMessages,errors:result.errors}));
  } catch (error) {
    fs.writeFileSync(`${dir}/${name}-failure.json`, JSON.stringify({error:error.stack,errors:driver.errors,blocked:driver.blocked,result},null,2));
    throw error;
  } finally { await driver.close(); }
}
