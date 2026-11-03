// Offline production-component and real-app cold-start semantic lane stability acceptance.
// No provider, upload, SSE or brain socket can escape.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';

import {findRealFirefoxExecutable,launchRealFirefoxBiDi,launchEdgeAdapter} from './installed-browser-review-drivers.mjs';

const base = process.env.CAUSALFLY_BROWSER_REVIEW_BASE ?? 'http://127.0.0.1:3465';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local fixture host only');
const dir = process.env.CAUSALFLY_BROWSER_REVIEW_DIR ?? 'docs/review/sprint-17-2-1';
fs.mkdirSync(dir, { recursive: true });
const original = JSON.parse(fs.readFileSync('docs/review/sprint-6b/recorded-evidence.json', 'utf8'))[0];

const bundle = await build({
  stdin: {
    contents: `
import React, { useState, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { EventTimeline } from './src/app/components/live-session';

const original = ${JSON.stringify(original)};
const burstValues = [1, 9, 99, 284, 999, 1000, 18421, 99999, 192000];

function makeFrame(seq, tick, simMs, motorMode, inputSeq, receivedAt) {
  const f = structuredClone(original);
  f.receivedAt = receivedAt;
  Object.assign(f.telemetry, {
    sessionId: 'sprint172-semantic-fixture',
    sequence: seq,
    neuralTick: tick,
    simulationMs: simMs,
    motorMode,
    inputSequence: inputSeq,
    inputFresh: true,
    totalSpikeEvents: 620,
    displaySpikeEvents: 512,
    activeNeuronCount: 7239,
  });
  return f;
}

function buildScenario(step) {
  const frames = [];
  let historical = false;
  let reconnectedAt = null;
  let receivedAt = '2026-03-29T21:07:10.000Z';

  if (step === 0) {
    return { frames, historical, reconnectedAt, receivedAt, stepName: 'Initial empty' };
  }
  frames.push(makeFrame(1, 284, 14200, 'IDLE', 1, '2026-03-29T21:07:10.000Z'));
  if (step === 1) return { frames, historical, reconnectedAt, receivedAt, stepName: 'Frame received', targetLane: [0, 1] };

  receivedAt = '2026-03-29T21:07:11.000Z';
  frames.push(makeFrame(2, 285, 14250, 'IDLE', 1, receivedAt));
  if (step === 2) return { frames, historical, reconnectedAt, receivedAt, stepName: 'Neural tick', targetLane: [0, 1] };

  receivedAt = '2026-03-29T21:07:12.000Z';
  frames.push(makeFrame(3, 286, 14300, 'IDLE', 2, receivedAt));
  if (step === 3) return { frames, historical, reconnectedAt, receivedAt, stepName: 'Input reference changed', targetLane: [0, 1, 2] };

  receivedAt = '2026-03-29T21:07:13.000Z';
  frames.push(makeFrame(4, 287, 14350, 'ESCAPE', 2, receivedAt));
  if (step === 4) return { frames, historical, reconnectedAt, receivedAt, stepName: 'Decoder changed', targetLane: [0, 1, 3] };

  receivedAt = '2026-03-29T21:07:14.000Z';
  frames.push(makeFrame(5, 288, 14400, 'ESCAPE', 3, receivedAt));
  if (step === 5) return { frames, historical, reconnectedAt, receivedAt, stepName: 'Input reference changed (2)', targetLane: [0, 1, 2] };

  receivedAt = '2026-03-29T21:07:15.000Z';
  frames.push(makeFrame(6, 289, 14450, 'ESCAPE', 3, receivedAt));
  if (step === 6) return { frames, historical, reconnectedAt, receivedAt, stepName: 'Neural tick (2)', targetLane: [0, 1] };

  reconnectedAt = Date.parse('2026-03-29T21:07:20.000Z');
  if (step === 7) return { frames, historical, reconnectedAt, receivedAt, stepName: 'Stream reconnected', targetLane: [4] };

  receivedAt = '2026-03-29T21:07:21.000Z';
  frames.push(makeFrame(7, 290, 14500, 'ESCAPE', 3, receivedAt));
  if (step === 8) return { frames, historical, reconnectedAt, receivedAt, stepName: 'Frame received (post-reconnect)', targetLane: [0, 1] };

  receivedAt = '2026-03-29T21:07:22.000Z';
  frames.push(makeFrame(8, 291, 14550, 'ESCAPE', 4, receivedAt));
  if (step === 9) return { frames, historical, reconnectedAt, receivedAt, stepName: 'Input reference changed (3)', targetLane: [0, 1, 2] };

  if (step === 10) {
    historical = true;
    return { frames, historical, reconnectedAt, receivedAt, stepName: 'Stream inactive', targetLane: [4] };
  }

  let mode = 'ESCAPE';
  let inputSeq = 4;
  for (let s = 11; s <= step; s++) {
    const val = burstValues[(s - 11) % burstValues.length];
    const kind = (s - 11) % 4;
    if (kind === 1) inputSeq++;
    if (kind === 2) mode = mode === 'ESCAPE' ? 'WALK' : mode === 'WALK' ? 'TAKEOFF' : 'ESCAPE';
    const tick = kind === 3 ? frames.at(-1).telemetry.neuralTick : val + s;
    receivedAt = '2026-03-29T21:08:00.000Z';
    frames.push(makeFrame(s - 2, tick, val * 50, mode, inputSeq, receivedAt));
  }
  historical = step % 19 === 0;
  return { frames: frames.slice(-120), historical, reconnectedAt, receivedAt, stepName: 'Burst-' + step };
}

function Fixture() {
  const [step, setStep] = useState(0);
  window.timelineSetStep = setStep;
  const state = buildScenario(step);
  window.currentStepMeta = { step, stepName: state.stepName, targetLane: state.targetLane ?? null };
  useLayoutEffect(() => window.timelineMeasure?.('commit'));
  return (
    <div className="app-shell instrument-shell guided-shell workspace-shell live-shell">
      <aside className="sidebar">AUTHORED SEMANTIC LANE FIXTURE<br/>NO LIVE DATA OR PROVIDER</aside>
      <div className="workspace">
        <main className="main-content">
          <div style={{ height: 900 }}>Semantic timeline stability fixture</div>
          <div id="timeline-wrapper" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <EventTimeline
                frames={state.frames}
                historical={state.historical}
                receivedAt={state.receivedAt}
                reconnectedAt={state.reconnectedAt}
              />
            </div>
            <aside>Reserved observation rail</aside>
          </div>
          <div style={{ height: 1000 }} />
          <footer id="timeline-footer">END OF SEMANTIC LANE FIXTURE</footer>
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<Fixture />);
`,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  write: false,
  outdir: 'tmp/sprint172-timeline',
  platform: 'browser',
  jsx: 'automatic',
  loader: { '.css': 'local-css' },
  define: { 'process.env.NODE_ENV': '"production"' },
});

const preloadScriptSource = `() => {
  window.__blockedUrls = [];
  window.__mockEventSources = [];
  window.__activeEventSource = null;
  class OfflineEventSource {
    constructor(url) {
      this.url = String(url);
      this.readyState = 0;
      this.onmessage = null;
      this.onerror = null;
      this.onopen = null;
      window.__mockEventSources.push(this);
      window.__activeEventSource = this;
    }
    close() {
      this.readyState = 2;
    }
  }
  window.EventSource = OfflineEventSource;
  window.WebSocket = class BlockedWebSocket {
    constructor(url) {
      window.__blockedUrls.push(String(url));
      throw new Error('Blocked WebSocket in offline acceptance test: ' + url);
    }
  };
}`;

async function runRealAppColdStartAndLifecycle(driver, browserTag, width = 1728, scrollPosition = 'top', embodiment = false) {
  const tag = `${browserTag}-${width}-${scrollPosition}${embodiment ? '-embodiment' : ''}`;
  await driver.setViewportSize({ width, height: 1080 });

  await driver.goto(base);
  // Cache-cold reload: Firefox profile disables all HTTP caches; Edge routing disables its cache.
  await driver.hardReload();
  const health = await driver.evalJson(`fetch(${JSON.stringify(base + '/api/health')}).then(r => r.json())`);
  assert.equal(health.metaMode, 'offline');
  await driver.waitFor(`Boolean(document.querySelector('aside.sidebar') && document.querySelector('main#main'))`);
  await driver.evalJson(`document.fonts.ready.then(() => true)`);

  // Navigate to Live Connectome workspace before any telemetry exists
  await driver.evalJson(`(() => {
    const btn = [...document.querySelectorAll('aside.sidebar button')].find(b => /Live Connectome/i.test(b.textContent || ''));
    if (!btn) throw new Error('Live Connectome nav button not found');
    btn.click();
    return true;
  })()`);

  await driver.waitFor(
    `(() => {
      if (document.querySelector('section[aria-label="Waiting for first telemetry frame"]') && document.querySelector('ol[data-timeline-track]')) return true;
      // The server shell can precede hydration after a cache-cold reload.
      // Retry the ordinary navigation action until its handler is attached.
      [...document.querySelectorAll('aside.sidebar button')].find(b => /Live Connectome/i.test(b.textContent || ''))?.click();
      return false;
    })()`
  );
  if (embodiment) {
    await driver.evalJson(`(() => { if(document.querySelector('.autonomy-world')) return true; const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Open experimental embodiment'); if(!btn) throw Error('Missing embodiment action'); btn.click(); return true; })()`);
    await driver.waitFor(`Boolean(document.querySelector('.autonomy-world'))`);
  }
  await driver.evalJson(`(() => { scrollTo(0, ${scrollPosition === 'bottom' ? 'document.documentElement.scrollHeight' : scrollPosition === 'middle' ? '(document.documentElement.scrollHeight - innerHeight) / 2' : '0'}); return true; })()`);

  // 1. Capture Cold-Start State & Install Identity + Mutation Guards
  const coldStart = await driver.evalJson(`(() => {
    const waiting = document.querySelector('section[aria-label="Waiting for first telemetry frame"]');
    const panel = document.querySelector('[class*="timeline"][class*="panel"]');
    const track = panel?.querySelector('ol[data-timeline-track]');
    const history = panel?.querySelector('details[data-timeline-history]');
    if (!waiting || !panel || !track || !history) {
      throw new Error('Missing cold-start elements');
    }
    const items = [...track.querySelectorAll('li')];
    const nodes = new Map();
    nodes.set('panel', panel);
    nodes.set('track', track);
    nodes.set('history', history);
    items.forEach((el, i) => {
      nodes.set('slot-' + i, el);
      nodes.set('label-' + i, el.querySelector('strong[data-timeline-label]'));
      nodes.set('tick-' + i, el.querySelector('[data-timeline-tick]'));
      nodes.set('time-' + i, el.querySelector('[data-timeline-time]'));
      nodes.set('category-' + i, el.querySelector('[data-timeline-category]'));
      nodes.set('marker-' + i, el.querySelector('[data-timeline-marker]'));
      nodes.set('baseline-' + i, el.querySelector('[data-timeline-baseline]'));
    });

    const watchedSet = new Set(nodes.values());
    window.__realAppIdentity = {
      nodes,
      replacements: [],
      mutationRemovals: [],
      mutationAdditions: [],
      laneOrderViolations: [],
      singleLaneUpdateViolations: [],
      lifecycleSteps: [],
      liveBaselineRects: null,
      liveGeometrySamples: [],
      animationSamples: [],
      phase: 'cold-start',
    };
    const sampleAnimation = () => {
      const st = window.__realAppIdentity;
      const p = document.querySelector('ol[data-timeline-track]')?.parentElement;
      if (p) {
        const r = p.getBoundingClientRect();
        st.animationSamples.push({phase:st.phase, t:performance.now(), scrollY, height:document.documentElement.scrollHeight, overflow:document.documentElement.scrollWidth > innerWidth, x:r.x, y:r.y + scrollY, width:r.width, panelHeight:r.height, canvases:document.querySelectorAll('canvas').length});
      }
      st.raf = requestAnimationFrame(sampleAnimation);
    };
    sampleAnimation();

    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const removed of m.removedNodes) {
          if (watchedSet.has(removed) || (removed.nodeType === 1 && [...watchedSet].some(w => removed.contains(w)))) {
            window.__realAppIdentity.mutationRemovals.push(removed.tagName || removed.nodeName);
          }
        }
        for (const added of m.addedNodes) {
          if (watchedSet.has(added)) {
            window.__realAppIdentity.mutationAdditions.push(added.tagName || added.nodeName);
          }
        }
      }
    });
    observer.observe(document.querySelector('main#main'), { childList: true, subtree: true });
    window.__realAppObserver = observer;

    window.__inspectRealAppTimeline = (phase, expectedTargetLane = null) => {
      const st = window.__realAppIdentity;
      st.phase = phase;
      const curPanel = document.querySelector('[class*="timeline"][class*="panel"]');
      const curTrack = curPanel?.querySelector('ol[data-timeline-track]');
      const curHistory = curPanel?.querySelector('details[data-timeline-history]');
      const rects = {};
      const checkNode = (key, el) => {
        if (!el) {
          st.replacements.push(key + ':missing');
          return;
        }
        if (st.nodes.get(key) !== el) {
          st.replacements.push(key);
        }
        const r = el.getBoundingClientRect();
        rects[key] = { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      checkNode('panel', curPanel);
      checkNode('track', curTrack);
      checkNode('history', curHistory);
      const curItems = [...(curTrack?.querySelectorAll('li') ?? [])];
      const categories = [];
      const laneIds = [];
      const laneSnapshots = [];
      curItems.forEach((el, i) => {
        checkNode('slot-' + i, el);
        const label = el.querySelector('strong[data-timeline-label]');
        const tick = el.querySelector('[data-timeline-tick]');
        const time = el.querySelector('[data-timeline-time]');
        const category = el.querySelector('[data-timeline-category]');
        const marker = el.querySelector('[data-timeline-marker]');
        const baseline = el.querySelector('[data-timeline-baseline]');
        checkNode('label-' + i, label);
        checkNode('tick-' + i, tick);
        checkNode('time-' + i, time);
        checkNode('category-' + i, category);
        checkNode('marker-' + i, marker);
        checkNode('baseline-' + i, baseline);
        categories.push(category?.textContent);
        laneIds.push(el.getAttribute('data-lane'));
        laneSnapshots.push({
          category: category?.textContent,
          title: label?.textContent,
          value: tick?.textContent,
          time: time?.textContent,
          empty: el.getAttribute('data-empty'),
        });
      });

      if (JSON.stringify(categories) !== JSON.stringify(['FRAME', 'NEURAL', 'INPUT', 'DECODER', 'STREAM'])) {
        st.laneOrderViolations.push({ phase, categories });
      }
      if (JSON.stringify(laneIds) !== JSON.stringify(['frame', 'neural', 'input', 'decoder', 'stream'])) {
        st.laneOrderViolations.push({ phase, laneIds });
      }
      for (let i = 1; i < curItems.length; i++) {
        if (!(rects['slot-' + i].x > rects['slot-' + (i - 1)].x)) {
          st.laneOrderViolations.push({ phase, nonMonotonicX: [i - 1, i] });
        }
      }

      const prevStep = st.lifecycleSteps.at(-1);
      const changedLanes = prevStep
        ? laneSnapshots
            .map((snap, idx) => (JSON.stringify(snap) !== JSON.stringify(prevStep.laneSnapshots[idx]) ? idx : -1))
            .filter(idx => idx >= 0)
        : [];

      if (expectedTargetLane !== null) {
        if (JSON.stringify(changedLanes) !== JSON.stringify(expectedTargetLane)) {
          st.singleLaneUpdateViolations.push({
            phase,
            expectedLane: expectedTargetLane,
            actualChangedLanes: changedLanes,
            previous: prevStep?.laneSnapshots,
            current: laneSnapshots,
          });
        }
      }

      const waitingVisible = Boolean(document.querySelector('section[aria-label="Waiting for first telemetry frame"]'));
      const activityVisible = Boolean(document.querySelector('section[aria-label="Received simulation activity"]'));
      const internalRects = {};
      const pRect = rects.panel;
      for (const [k, r] of Object.entries(rects)) {
        internalRects[k] = {
          relX: r.x - pRect.x,
          relY: r.y - pRect.y,
          width: r.width,
          height: r.height,
        };
      }
      if (!st.coldStartInternalRects) {
        st.coldStartInternalRects = internalRects;
      }
      st.internalGeometrySamples = st.internalGeometrySamples || [];
      st.internalGeometrySamples.push({ phase, internalRects });

      if (activityVisible) {
        if (!st.liveBaselineRects) {
          st.liveBaselineRects = rects;
        }
        st.liveGeometrySamples.push({ phase, rects });
      }

      const record = {
        phase,
        waitingVisible,
        activityVisible,
        categories,
        laneIds,
        laneSnapshots,
        changedLanes,
        scrollY,
        documentHeight: document.documentElement.scrollHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
        panel: rects.panel,
      };
      st.lifecycleSteps.push(record);
      return record;
    };

    return window.__inspectRealAppTimeline('cold-start', null);
  })()`);

  await driver.screenshot(`${dir}/real-app-${tag}-1-cold-start.png`);
  // Observe lazy anatomy/WebGL initialization while still waiting for telemetry.
  await driver.evalJson(`new Promise(r => setTimeout(() => r(window.__inspectRealAppTimeline('cold-start-mounted')), 1200))`);
  if (embodiment || await driver.evalJson(`Boolean(document.querySelector('.autonomy-world'))`)) {
    await driver.waitFor(`Boolean(document.querySelector('.autonomy-world canvas'))`);
    await driver.waitFor(`document.querySelector('.autonomy-world')?.getAttribute('data-model-status') === 'ready'`);
  }

  // 2. Transition to CONNECTED (before telemetry starts)
  const connectedStep = await driver.evalJson(`(async () => {
    if (!window.__activeEventSource) {
      const connectBtn = [...document.querySelectorAll('.source-connection button, .live-launcher button')].find(b => /Reconnect simulation|Reconnect backend/i.test((b.textContent || '').trim()));
      if (!connectBtn) throw new Error('Connect button not found');
      connectBtn.click();
    }
    if (!window.__activeEventSource) throw new Error('EventSource was not created by connect action');
    window.__activeEventSource.onmessage({
      data: JSON.stringify({
        source: 'FRUITFLY_XR',
        state: 'CONNECTED',
        message: 'Connected to simulation stream. Waiting for first frame.',
        evidence: null,
      }),
    });
    await new Promise(r => setTimeout(r, 60));
    return window.__inspectRealAppTimeline('connected-waiting', null);
  })()`);

  await driver.screenshot(`${dir}/real-app-${tag}-2-connected.png`);

  // 3. Deliver Live Telemetry Sequence through the real app EventSource
  await driver.evalJson(`(async () => {
    const baseFrame = ${JSON.stringify(original)};
    const sendFrame = async (seq, tick, simMs, motorMode, inputSeq, phase, expectedLane) => {
      const frame = structuredClone(baseFrame);
      frame.receivedAt = new Date(Date.now() - 15).toISOString();
      Object.assign(frame.telemetry, {
        sessionId: 'sprint172-real-app-session',
        sequence: seq,
        neuralTick: tick,
        simulationMs: simMs,
        motorMode,
        inputSequence: inputSeq,
        inputFresh: true,
        totalSpikeEvents: 620 + seq,
        displaySpikeEvents: 512,
        activeNeuronCount: 7239 + seq,
      });
      window.__activeEventSource.onmessage({
        data: JSON.stringify({
          source: 'FRUITFLY_XR',
          state: 'DATA RECEIVED',
          message: 'Live connectome telemetry received.',
          evidence: frame,
          retentionId: 'ret-' + seq,
        }),
      });
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline) {
        const trackText = document.querySelector('ol[data-timeline-track]')?.textContent || '';
        if (trackText.includes('Tick ' + tick)) break;
        await new Promise(r => setTimeout(r, 20));
      }
      if (seq === 1) {
        await new Promise(r => setTimeout(r, 150));
        // First receipt reveals deferred instruments and changes page extent.
        // Re-establish the requested position once before the stationary live
        // measurement, so "bottom" also means bottom during rapid telemetry.
        scrollTo(0, ${scrollPosition === 'bottom' ? 'document.documentElement.scrollHeight' : scrollPosition === 'middle' ? '(document.documentElement.scrollHeight - innerHeight) / 2' : '0'});
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      window.__inspectRealAppTimeline(phase, expectedLane);
    };

    // Frame 1 transitions Cold Start -> Live Telemetry (updates FRAME + STREAM together)
    await sendFrame(1, 284, 14200, 'IDLE', 1, 'live-1-frame-received', null);
    // Subsequent live frames must update ONLY their single semantic lane
    await sendFrame(2, 285, 14250, 'IDLE', 1, 'live-2-neural-tick', [0, 1]);
    await sendFrame(3, 286, 14300, 'IDLE', 2, 'live-3-input-changed', [0, 1, 2]);
    await sendFrame(4, 287, 14350, 'ESCAPE', 2, 'live-4-decoder-changed', [0, 1, 3]);
    await sendFrame(5, 288, 14400, 'ESCAPE', 3, 'live-5-input-changed-2', [0, 1, 2]);
    await sendFrame(6, 289, 14450, 'ESCAPE', 3, 'live-6-neural-tick-2', [0, 1]);
    return true;
  })()`);

  await driver.screenshot(`${dir}/real-app-${tag}-3-live-telemetry.png`);

  // 4. Transition to DISCONNECTED -> RECONNECTED -> Post-Reconnect Telemetry -> Final DISCONNECTED
  const lifecycleSummary = await driver.evalJson(`(async () => {
    const baseFrame = ${JSON.stringify(original)};
    // Disconnect via the real UI button in LiveSessionHeader
    const clickConnectionButton = labelRegex => {
      const btn = [...document.querySelectorAll('.source-connection button, .live-launcher button')].find(b => labelRegex.test((b.textContent || '').trim()));
      if (!btn) throw new Error('Connection button not found for ' + labelRegex);
      btn.click();
    };

    clickConnectionButton(/^Disconnect$/i);
    await new Promise(r => setTimeout(r, 80));
    window.__inspectRealAppTimeline('disconnected-retained', [4]);

    // Reconnect via the real UI button
    clickConnectionButton(/Reconnect simulation|Reconnect backend/i);
    window.__activeEventSource.onmessage({
      data: JSON.stringify({
        source: 'FRUITFLY_XR',
        state: 'CONNECTED',
        message: 'Reconnected to simulation stream.',
        evidence: null,
      }),
    });
    await new Promise(r => setTimeout(r, 80));
    window.__inspectRealAppTimeline('reconnected-transport', [4]);

    // First frame after reconnect updates FRAME (lane 0) in-place
    const f7 = structuredClone(baseFrame);
    f7.receivedAt = new Date(Date.now() - 10).toISOString();
    Object.assign(f7.telemetry, {
      sessionId: 'sprint172-real-app-session',
      sequence: 7,
      neuralTick: 290,
      simulationMs: 14500,
      motorMode: 'ESCAPE',
      inputSequence: 3,
      inputFresh: true,
      totalSpikeEvents: 627,
      displaySpikeEvents: 512,
      activeNeuronCount: 7246,
    });
    window.__activeEventSource.onmessage({
      data: JSON.stringify({
        source: 'FRUITFLY_XR',
        state: 'DATA RECEIVED',
        message: 'Live connectome telemetry received.',
        evidence: f7,
        retentionId: 'ret-7',
      }),
    });
    for (let w = 0; w < 80 && !(document.querySelector('ol[data-timeline-track]')?.textContent || '').includes('Tick 290'); w++) {
      await new Promise(r => setTimeout(r, 25));
    }
    window.__inspectRealAppTimeline('post-reconnect-frame', [0, 1]);

    // Next frame updates INPUT (lane 2) in-place
    const f8 = structuredClone(baseFrame);
    f8.receivedAt = new Date(Date.now() - 10).toISOString();
    Object.assign(f8.telemetry, {
      sessionId: 'sprint172-real-app-session',
      sequence: 8,
      neuralTick: 291,
      simulationMs: 14550,
      motorMode: 'ESCAPE',
      inputSequence: 4,
      inputFresh: true,
      totalSpikeEvents: 628,
      displaySpikeEvents: 512,
      activeNeuronCount: 7247,
    });
    window.__activeEventSource.onmessage({
      data: JSON.stringify({
        source: 'FRUITFLY_XR',
        state: 'DATA RECEIVED',
        message: 'Live connectome telemetry received.',
        evidence: f8,
        retentionId: 'ret-8',
      }),
    });
    for (let w = 0; w < 80 && !(document.querySelector('ol[data-timeline-track]')?.textContent || '').includes('Tick 291'); w++) {
      await new Promise(r => setTimeout(r, 25));
    }
    window.__inspectRealAppTimeline('post-reconnect-input', [0, 1, 2]);

    // Sustained rapid receipts cross the unchanged 120-frame retention boundary.
    window.__realAppIdentity.phase = 'rapid-telemetry';
    for (let seq = 9; seq <= 160; seq++) {
      const frame = structuredClone(baseFrame);
      frame.receivedAt = new Date(Date.now() - 5).toISOString();
      Object.assign(frame.telemetry, {
        sessionId: 'sprint172-real-app-session', sequence:seq,
        neuralTick:283 + seq, simulationMs:14150 + seq * 50,
        motorMode:seq % 20 < 10 ? 'WALK' : 'ESCAPE',
        inputSequence:4 + Math.floor(seq / 5), inputFresh:true,
        totalSpikeEvents:620 + seq, displaySpikeEvents:512, activeNeuronCount:7239 + seq,
      });
      window.__activeEventSource.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'DATA RECEIVED',message:'Authored rapid telemetry fixture',evidence:frame,retentionId:'fixture-retained'})});
      await new Promise(r => setTimeout(r, 12));
    }
    for (let w=0; w<100 && !document.querySelector('[data-lane="frame"] [data-timeline-tick]')?.textContent.includes('443'); w++) await new Promise(r=>setTimeout(r,20));
    window.__inspectRealAppTimeline('live-rapid-complete');
    const retainedValues = document.querySelector('.telemetry-primary dl')?.textContent;
    // Final Disconnect
    clickConnectionButton(/^Disconnect$/i);
    await new Promise(r => setTimeout(r, 80));
    window.__inspectRealAppTimeline('final-disconnected', [4]);
    const retainedValuesUnchanged = retainedValues === document.querySelector('.telemetry-primary dl')?.textContent;
    await new Promise(r => setTimeout(r, 500));
    window.__inspectRealAppTimeline('retained-settled');

    const st = window.__realAppIdentity;
    const baseRects = st.liveBaselineRects;
    const dims = ['x', 'y', 'width', 'height'];
    let maxLiveGeometryDelta = 0;
    for (const sample of st.liveGeometrySamples) {
      for (const k of Object.keys(baseRects)) {
        for (const d of dims) {
          const delta = Math.abs(sample.rects[k][d] - baseRects[k][d]);
          if (delta > maxLiveGeometryDelta) maxLiveGeometryDelta = delta;
        }
      }
    }

    let maxInternalTimelineGeometryDelta = 0;
    const baseInternal = st.coldStartInternalRects;
    for (const sample of st.internalGeometrySamples) {
      for (const k of Object.keys(baseInternal)) {
        for (const d of ['relX', 'relY', 'width', 'height']) {
          const delta = Math.abs(sample.internalRects[k][d] - baseInternal[k][d]);
          if (delta > maxInternalTimelineGeometryDelta) maxInternalTimelineGeometryDelta = delta;
        }
      }
    }

    return {
      replacements: [...new Set(st.replacements)],
      mutationRemovals: st.mutationRemovals,
      mutationAdditions: st.mutationAdditions,
      laneOrderViolations: st.laneOrderViolations,
      singleLaneUpdateViolations: st.singleLaneUpdateViolations,
      maxLiveGeometryDelta,
      maxInternalTimelineGeometryDelta,
      historyOpen: document.querySelector('details[data-timeline-history]').hasAttribute('open'),
      historyCount: document.querySelectorAll('details[data-timeline-history] [role="listitem"][data-empty="false"]').length,
      blockedUrls: window.__blockedUrls,
      lifecycleSteps: st.lifecycleSteps,
      animationSamples: st.animationSamples,
      retainedValuesUnchanged,
      bufferText: [...document.querySelectorAll('span')].find(el => /^DISPLAY BUFFER/.test(el.textContent))?.textContent,
    };
  })()`);

  await driver.screenshot(`${dir}/real-app-${tag}-4-disconnected.png`);

  return {
    width,
    scrollPosition,
    embodiment,
    browserName: driver.browserName,
    coldStart,
    connectedStep,
    ...lifecycleSummary,
  };
}

async function runFixtureCases(driver, tag) {
  const { css, htmlClass } = await driver.evalJson(`({
    css: [...document.querySelectorAll('link[rel=stylesheet]')].map(n => n.href),
    htmlClass: document.documentElement.className,
  })`);
  // Use an inert same-origin document rather than removing a still-mounted
  // Next/React application while its lazy model loader can start requests.
  await driver.gotoFixture();
  const js = bundle.outputFiles.find(f => f.path.endsWith('.js')).text;
  const cssText = bundle.outputFiles
    .filter(f => f.path.endsWith('.css'))
    .map(f => f.text)
    .join('\n');

  // Inject the compiled fixture into the live document so both Playwright and Firefox BiDi execute identically
  await driver.evalJson(`(async () => {
    document.documentElement.className = ${JSON.stringify(htmlClass)};
    document.head.innerHTML = ${JSON.stringify(css.map(h => `<link rel="stylesheet" href="${h}">`).join(''))};
    const style = document.createElement('style');
    style.textContent = ${JSON.stringify(cssText)};
    document.head.appendChild(style);
    document.body.innerHTML = '<div id="root"></div>';
    return true;
  })()`);
  await driver.evalJson(`(() => { ${js}\n return true; })()`);

  await driver.waitFor(`Boolean(window.timelineSetStep)`);
  await driver.waitFor(`[...document.querySelectorAll('link[rel="stylesheet"]')].every(link => Boolean(link.sheet))`);
  await driver.evalJson(`document.fonts.ready.then(() => true)`);

  const cases = [];
  for (const width of [1728, 1366, 760]) {
    await driver.setViewportSize({ width, height: 1080 });
    await driver.evalJson(`(() => {
      document.getElementById('timeline-wrapper').style.gridTemplateColumns = ${width} < 1000 ? 'minmax(0,1fr)' : 'minmax(0,1fr) 280px';
      return true;
    })()`);
    await new Promise(r => setTimeout(r, 80));

    for (const scrollPosition of [0, 800, 'bottom']) {
      await driver.evalJson(`(() => { window.timelineSetStep(0); return true; })()`);
      await new Promise(r => setTimeout(r, 30));
      await driver.evalJson(`(() => { scrollTo(0, ${scrollPosition === 'bottom' ? 'document.documentElement.scrollHeight' : scrollPosition}); return true; })()`);
      await new Promise(r => setTimeout(r, 80));

      await driver.evalJson(`(() => {
        window.timelineSamples = [];
        window.timelineNodes = new Map();
        window.timelineReplacements = [];
        window.laneOrderViolations = [];
        window.singleLaneUpdateViolations = [];
        let previous = null;

        window.timelineMeasure = kind => {
          const rects = {};
          const box = (key, el) => {
            if (!el) throw new Error('Missing element for ' + key);
            if (window.timelineNodes.has(key) && window.timelineNodes.get(key) !== el) {
              window.timelineReplacements.push(key);
            }
            window.timelineNodes.set(key, el);
            const r = el.getBoundingClientRect();
            rects[key] = { x: r.x, y: r.y, width: r.width, height: r.height };
          };

          const panel = document.querySelector('[class*="timeline"][class*="panel"]');
          const track = panel.querySelector('ol[data-timeline-track]');
          const history = panel.querySelector('details[data-timeline-history]');
          box('panel', panel);
          box('track', track);
          box('history', history);
          box('footer', document.querySelector('#timeline-footer'));

          const items = [...track.querySelectorAll('li')];
          const categories = [];
          const laneIds = [];
          const laneSnapshots = [];

          items.forEach((el, i) => {
            box('slot-' + i, el);
            const label = el.querySelector('strong[data-timeline-label]');
            const tick = el.children[1];
            const time = el.children[2];
            const category = el.querySelector('[data-timeline-category]');
            const marker = el.querySelector('[data-timeline-marker]');
            const baseline = el.querySelector('[data-timeline-baseline]');
            box('label-' + i, label);
            box('tick-' + i, tick);
            box('time-' + i, time);
            box('category-' + i, category);
            box('marker-' + i, marker);
            box('baseline-' + i, baseline);
            categories.push(category.textContent);
            laneIds.push(el.getAttribute('data-lane'));
            laneSnapshots.push({
              category: category.textContent,
              title: label.textContent,
              value: tick.textContent,
              time: time.textContent,
              empty: el.getAttribute('data-empty'),
            });
          });

          if (JSON.stringify(categories) !== JSON.stringify(['FRAME', 'NEURAL', 'INPUT', 'DECODER', 'STREAM'])) {
            window.laneOrderViolations.push({ step: window.currentStepMeta?.step, categories });
          }
          if (JSON.stringify(laneIds) !== JSON.stringify(['frame', 'neural', 'input', 'decoder', 'stream'])) {
            window.laneOrderViolations.push({ step: window.currentStepMeta?.step, laneIds });
          }
          for (let i = 1; i < items.length; i++) {
            if (!(rects['slot-' + i].x > rects['slot-' + (i - 1)].x)) {
              window.laneOrderViolations.push({ step: window.currentStepMeta?.step, nonMonotonicX: [i - 1, i] });
            }
          }

          const meta = window.currentStepMeta ?? { step: 0, stepName: 'Initial', targetLane: null };
          if (kind === 'commit' && previous && meta.step >= 2 && meta.step <= 10 && previous.step === meta.step - 1) {
            const changedLanes = laneSnapshots
              .map((snap, idx) => (JSON.stringify(snap) !== JSON.stringify(previous.laneSnapshots[idx]) ? idx : -1))
              .filter(idx => idx >= 0);
            if (JSON.stringify(changedLanes) !== JSON.stringify(meta.targetLane)) {
              window.singleLaneUpdateViolations.push({
                step: meta.step,
                stepName: meta.stepName,
                expectedLane: meta.targetLane,
                actualChangedLanes: changedLanes,
                previous: previous.laneSnapshots,
                current: laneSnapshots,
              });
            }
          }

          const sample = {
            kind,
            step: meta.step,
            stepName: meta.stepName,
            scrollY,
            scrollHeight: document.documentElement.scrollHeight,
            overflow: document.documentElement.scrollWidth > innerWidth,
            categories,
            laneIds,
            laneSnapshots,
            rects,
          };
          previous = sample;
          window.timelineSamples.push(sample);
        };
        window.timelineMeasure('initial');
        return true;
      })()`);

      await driver.evalJson(`(async () => {
        for (let s = 1; s <= 100; s++) {
          window.timelineSetStep(s);
          await new Promise(r => setTimeout(r, 10));
          window.timelineMeasure('after-layout');
        }
        return true;
      })()`);

      const result = await driver.evalJson(`({
        samples: window.timelineSamples,
        replacements: [...new Set(window.timelineReplacements)],
        laneOrderViolations: window.laneOrderViolations,
        singleLaneUpdateViolations: window.singleLaneUpdateViolations,
        historyOpen: document.querySelector('details[data-timeline-history]').hasAttribute('open'),
        historyCount: document.querySelectorAll('details[data-timeline-history] [role="listitem"][data-empty="false"]').length,
      })`);

      const initial = result.samples[0];
      const dimensions = ['x', 'y', 'width', 'height'];
      result.maxima = Object.fromEntries(
        Object.keys(initial.rects).map(k => [
          k,
          Object.fromEntries(dimensions.map(d => [d, Math.max(...result.samples.map(s => Math.abs(s.rects[k][d] - initial.rects[k][d])))])),
        ])
      );
      result.maxGeometryDelta = Math.max(...Object.values(result.maxima).flatMap(Object.values));
      result.scrollDelta = Math.max(...result.samples.map(s => Math.abs(s.scrollY - initial.scrollY)));
      result.documentHeightRange =
        Math.max(...result.samples.map(s => s.scrollHeight)) - Math.min(...result.samples.map(s => s.scrollHeight));
      result.hasHorizontalOverflow = result.samples.some(s => s.overflow);
      result.width = width;
      result.scrollPosition = scrollPosition;
      result.step10Snapshot = result.samples.find(s => s.step === 10 && s.kind === 'commit')?.laneSnapshots ?? null;
      delete result.samples;
      cases.push(result);
      await driver.screenshot(`${dir}/semantic-timeline-${tag}-${width}-${scrollPosition}.png`);
    }
  }

  const scrolling = await driver.evalJson(`(() => {
    const before = scrollY;
    scrollBy(0, -100);
    return { before, after: scrollY };
  })()`);
  assert.ok(scrolling.after !== scrolling.before, 'Normal page scrolling works');

  return { cases, scrolling };
}

const realFirefoxBin = findRealFirefoxExecutable();
assert.ok(realFirefoxBin, 'Real Mozilla Firefox executable must be present for Sprint 17.2 acceptance');

const report = {
  fixtureOnly: true,
  tolerancePx: 1,
  expectedCategories: ['FRAME', 'NEURAL', 'INPUT', 'DECODER', 'STREAM'],
  expectedLaneIds: ['frame', 'neural', 'input', 'decoder', 'stream'],
  firefoxExecutable: realFirefoxBin,
  browsers: [],
  providerRequests: 0,
  realBrainMessages: 0,
};

for (const [name, launchFn] of [
  ['firefox', () => launchRealFirefoxBiDi(realFirefoxBin, base)],
  ['edge', () => launchEdgeAdapter(base)],
]) {
  const driver = await launchFn();
  try {
    await driver.addInitScript(preloadScriptSource);
    const realAppCases = [];
    for (const width of [1728, 1366, 760]) {
      for (const scroll of ['top', 'middle', 'bottom']) {
        console.log(`${driver.browserName}: real app ${width} ${scroll}`);
        realAppCases.push(await runRealAppColdStartAndLifecycle(driver, name, width, scroll));
        fs.writeFileSync(`${dir}/${name}-real-app-progress.json`, JSON.stringify(realAppCases, null, 2));
      }
    }
    console.log(`${driver.browserName}: real app 1728 top with procedural embodiment`);
    realAppCases.push(await runRealAppColdStartAndLifecycle(driver, name, 1728, 'top', true));
    fs.writeFileSync(`${dir}/${name}-real-app-progress.json`, JSON.stringify(realAppCases, null, 2));
    const realAppLifecycle = realAppCases[0];
    const { cases, scrolling } = await runFixtureCases(driver, name);
    report.browsers.push({
      name,
      browserVersion: driver.browserName,
      realAppLifecycle,
      realAppCases,
      cases,
      scrolling,
      errors: driver.errors,
      blocked: driver.blocked,
    });
  } catch (error) {
    fs.writeFileSync(`${dir}/${name}-failure.json`, JSON.stringify({ error:error.stack, errors:driver.errors, blocked:driver.blocked, state:await driver.evalJson(`({url:location.href,body:document.body.innerText.slice(-14000)})`).catch(()=>null) }, null, 2));
    await driver.screenshot(`${dir}/${name}-failure.png`).catch(()=>{});
    throw error;
  } finally {
    await driver.close();
  }
}

const range = (samples, key) => Math.max(...samples.map(s => s[key])) - Math.min(...samples.map(s => s[key]));
const summary = report.browsers.map(browser => ({
  browser: browser.browserVersion,
  errors: browser.errors,
  blocked: browser.blocked,
  realAppCases: browser.realAppCases.map(life => {
    const cold = life.animationSamples.filter(s => s.phase.startsWith('cold-start'));
    const rapid = life.animationSamples.filter(s => s.phase === 'rapid-telemetry');
    const waiting = life.lifecycleSteps.find(s => s.phase === 'connected-waiting');
    const first = life.lifecycleSteps.find(s => s.phase === 'live-1-frame-received');
    return {
      width: life.width, scroll: life.scrollPosition, embodiment:life.embodiment,
      laneOrderViolations: life.laneOrderViolations, eventIsolationViolations:life.singleLaneUpdateViolations,
      replacements: life.replacements, mutationRemovals:life.mutationRemovals, mutationAdditions:life.mutationAdditions,
      coldMountRange:Object.fromEntries(['x','y','width','panelHeight','scrollY','height'].map(key=>[key,range(cold,key)])),
      rapidRange:Object.fromEntries(['x','y','width','panelHeight','scrollY','height'].map(key=>[key,range(rapid,key)])),
      maxLiveGeometryDelta:life.maxLiveGeometryDelta, maxInternalTimelineGeometryDelta:life.maxInternalTimelineGeometryDelta,
      firstReceiptInitialization:{documentHeightDelta:first.documentHeight-waiting.documentHeight,panelDocumentYDelta:first.panel.y+first.scrollY-waiting.panel.y-waiting.scrollY},
      retainedValuesUnchanged:life.retainedValuesUnchanged, buffer:life.bufferText,
      horizontalOverflow:life.animationSamples.some(s=>s.overflow), samples:life.animationSamples.length,
    };
  }),
  fixtureCases:browser.cases.map(c=>({width:c.width,scroll:c.scrollPosition,geometry:c.maxGeometryDelta,scrollDelta:c.scrollDelta,heightRange:c.documentHeightRange,replacements:c.replacements,eventIsolationViolations:c.singleLaneUpdateViolations})),
}));
fs.writeFileSync(`${dir}/timeline-semantic-stability.json`, JSON.stringify(report, null, 2));
fs.writeFileSync(`${dir}/summary.json`, JSON.stringify(summary, null, 2));
console.log(
  JSON.stringify(
    {
      firefoxExecutable: report.firefoxExecutable,
      browsers: report.browsers.map(b => ({
        name: b.name,
        browserVersion: b.browserVersion,
        realAppLifecycle: {
          coldStartWaitingVisible: b.realAppLifecycle.coldStart.waitingVisible,
          coldStartCategories: b.realAppLifecycle.coldStart.categories,
          coldStartPlaceholders: b.realAppLifecycle.coldStart.laneSnapshots.map(l => l.title),
          connectedCategories: b.realAppLifecycle.connectedStep.categories,
          connectedPlaceholders: b.realAppLifecycle.connectedStep.laneSnapshots.map(l => l.title),
          replacements: b.realAppLifecycle.replacements,
          mutationRemovals: b.realAppLifecycle.mutationRemovals,
          mutationAdditions: b.realAppLifecycle.mutationAdditions,
          laneOrderViolations: b.realAppLifecycle.laneOrderViolations,
          singleLaneUpdateViolations: b.realAppLifecycle.singleLaneUpdateViolations,
          maxLiveGeometryDelta: b.realAppLifecycle.maxLiveGeometryDelta,
          maxInternalTimelineGeometryDelta: b.realAppLifecycle.maxInternalTimelineGeometryDelta,
          historyOpen: b.realAppLifecycle.historyOpen,
          historyCount: b.realAppLifecycle.historyCount,
          phasesTested: b.realAppLifecycle.lifecycleSteps.map(s => s.phase),
        },
        cases: b.cases.map(c => ({
          width: c.width,
          scroll: c.scrollPosition,
          maxGeometryDelta: c.maxGeometryDelta,
          scrollDelta: c.scrollDelta,
          documentHeightRange: c.documentHeightRange,
          replacements: c.replacements,
          laneOrderViolations: c.laneOrderViolations,
          singleLaneUpdateViolations: c.singleLaneUpdateViolations,
          historyOpen: c.historyOpen,
          historyCount: c.historyCount,
        })),
        errors: b.errors,
      })),
    },
    null,
    2
  )
);

for (const b of report.browsers) {
  assert.deepEqual(b.errors, [], `${b.name}: unexpected browser errors`);
  assert.deepEqual(b.blocked, [], `${b.name}: unexpected blocked requests`);
  for (const life of b.realAppCases) {
  assert.equal(life.coldStart.waitingVisible, true, `${b.name}: cold start must show Waiting for first frame`);
  assert.deepEqual(life.coldStart.categories, ['FRAME', 'NEURAL', 'INPUT', 'DECODER', 'STREAM'], `${b.name}: cold start categories`);
  assert.deepEqual(life.coldStart.laneIds, ['frame', 'neural', 'input', 'decoder', 'stream'], `${b.name}: cold start lane IDs`);
  for (const lane of life.coldStart.laneSnapshots) {
    assert.equal(lane.empty, 'true', `${b.name}: cold start lane must have data-empty="true"`);
    assert.equal(lane.title, '—', `${b.name}: cold start lane title must be "—"`);
    assert.equal(lane.value, '—', `${b.name}: cold start lane value must be "—"`);
    assert.equal(lane.time, '—', `${b.name}: cold start lane time must be "—"`);
  }
  assert.deepEqual(life.connectedStep.laneSnapshots.map(l => l.title), ['—', '—', '—', '—', '—'], `${b.name}: connected waiting state keeps placeholders`);
  assert.deepEqual(life.replacements, [], `${b.name}: real app replaced timeline container or lane DOM nodes across lifecycle`);
  assert.deepEqual(life.mutationRemovals, [], `${b.name}: real app removed timeline container or lane DOM nodes`);
  assert.deepEqual(life.mutationAdditions, [], `${b.name}: real app re-added timeline container or lane DOM nodes`);
  assert.deepEqual(life.laneOrderViolations, [], `${b.name}: real app lane order violated`);
  assert.deepEqual(life.singleLaneUpdateViolations, [], `${b.name}: real app single-lane update violated`);
  assert.ok(life.maxLiveGeometryDelta <= 1, `${b.name}: real app live timeline geometry moved ${life.maxLiveGeometryDelta}px`);
  assert.ok(life.maxInternalTimelineGeometryDelta <= 1, `${b.name}: real app internal timeline geometry moved ${life.maxInternalTimelineGeometryDelta}px across cold-start -> live -> disconnect`);
  assert.equal(life.historyOpen, false, `${b.name}: real app secondary history collapsed by default`);
  assert.ok(life.historyCount >= 6, `${b.name}: real app secondary history retains canonical events`);
  assert.equal(life.retainedValuesUnchanged, true, 'Disconnect preserves received values');
  assert.match(life.bufferText, /DISPLAY BUFFER 120 \/ 120/, 'Rapid receipts preserve the 120-frame limit');
  const firstLive = life.lifecycleSteps.find(s => s.phase === 'live-1-frame-received');
  const expectedScroll = life.scrollPosition === 'bottom' ? firstLive.documentHeight - 1080 : life.scrollPosition === 'middle' ? (firstLive.documentHeight - 1080) / 2 : 0;
  assert.ok(Math.abs(firstLive.scrollY - Math.max(0, expectedScroll)) <= 1, 'Requested stationary live scroll position is established after initialization');
  const rapidComplete = life.lifecycleSteps.find(s => s.phase === 'live-rapid-complete');
  assert.deepEqual(rapidComplete.laneSnapshots.slice(0,4).map(l => l.value), ['Tick 443','Tick 443','Tick 443','ESCAPE → WALK'], 'Latest receipt and simultaneous input/decoder transitions remain in their own lanes');
  assert.equal(life.animationSamples.some(s => s.overflow), false, 'No full-app horizontal overflow');
  const rapid = life.animationSamples.filter(s => s.phase === 'rapid-telemetry');
  assert.ok(rapid.length >= 5, 'Rapid telemetry has animation-frame samples');
  for (const key of ['x', 'y', 'width', 'panelHeight', 'scrollY', 'height']) {
    const delta = Math.max(...rapid.map(s => s[key])) - Math.min(...rapid.map(s => s[key]));
    assert.ok(delta <= 1, `${b.name} ${life.width} ${life.scrollPosition}: rapid ${key} changed ${delta}px`);
  }
  const cold = life.animationSamples.filter(s => s.phase.startsWith('cold-start'));
  for (const key of ['x', 'y', 'width', 'panelHeight', 'scrollY', 'height']) {
    const delta = Math.max(...cold.map(s => s[key])) - Math.min(...cold.map(s => s[key]));
    assert.ok(delta <= 1, `${b.name} ${life.width} ${life.scrollPosition}: cold mounting ${key} changed ${delta}px`);
  }
  }

  for (const c of b.cases) {
    assert.ok(c.maxGeometryDelta <= 1, `${b.name} ${c.width}: timeline geometry moved ${c.maxGeometryDelta}px`);
    assert.ok(c.scrollDelta <= 1, `${b.name} ${c.width}: scrollY moved ${c.scrollDelta}px`);
    assert.ok(c.documentHeightRange <= 1, `${b.name} ${c.width}: documentHeight changed ${c.documentHeightRange}px`);
    assert.equal(c.hasHorizontalOverflow, false, 'No page horizontal overflow');
    assert.deepEqual(c.replacements, [], `${b.name} ${c.width}: DOM nodes replaced`);
    assert.deepEqual(c.laneOrderViolations, [], `${b.name} ${c.width}: lane order violated`);
    assert.deepEqual(c.singleLaneUpdateViolations, [], `${b.name} ${c.width}: single-lane update violated`);
    assert.equal(c.historyOpen, false, 'Secondary chronological history remains collapsed by default');
    assert.ok(c.historyCount > 0, 'Secondary chronological history retains canonical events');
  }
}
