// Offline Sprint 17.3 Browser Verification: Question UX, Stimulus-Response vs Neural-Intervention,
// Zero-Stimulus Guard, and Decoder-Driven Procedural Motion in Compare.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findRealFirefoxExecutable, launchRealFirefoxBiDi, launchEdgeAdapter } from './installed-browser-review-drivers.mjs';

const base = process.env.CAUSALFLY_BROWSER_REVIEW_BASE ?? 'http://127.0.0.1:3465';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local fixture host only');
const outDir = process.env.CAUSALFLY_SPRINT173_REVIEW_DIR ?? 'docs/review/sprint-17-3';
fs.mkdirSync(outDir, { recursive: true });

const preloadScriptSource = `() => {
  window.__blockedUrls = [];
  window.EventSource = class BlockedEventSource {
    constructor(url) {
      window.__blockedUrls.push(String(url));
    }
    close() {}
  };
  window.WebSocket = class BlockedWebSocket {
    constructor(url) {
      window.__blockedUrls.push(String(url));
      throw new Error('Blocked WebSocket in offline acceptance test: ' + url);
    }
  };
}`;

async function runJourneys(driver, browserTag) {
  await driver.setViewportSize({ width: 1728, height: 1080 });
  await driver.goto(base);
  const health = await driver.evalJson(`fetch(${JSON.stringify(base + '/api/health')}).then(r => r.json())`);
  assert.equal(health.metaMode, 'offline');
  await driver.waitFor(`Boolean(document.querySelector('aside.sidebar') && document.querySelector('#demo-question'))`);

  // Ensure we are on Experiment workspace (not Home overview)
  await driver.evalJson(`(() => {
    const expBtn = [...document.querySelectorAll('aside.sidebar button')].find(b => /^\\s*01\\s*Experiment/i.test(b.textContent || '') || /Experiment/i.test(b.textContent || ''));
    if (expBtn && !document.querySelector('#demo-question .research-question')) expBtn.click();
    return true;
  })()`);
  await driver.waitFor(`Boolean(document.querySelector('#demo-question .research-question'))`);

  // =========================================================================
  // JOURNEY A: Question Editing (One-Click EDIT QUESTION & NEW QUESTION)
  // =========================================================================
  const journeyAInitial = await driver.evalJson(`(() => {
    const q = document.querySelector('#demo-question .research-question');
    const buttons = [...q.querySelectorAll('button')].map(b => b.textContent.trim());
    return { editing: q.getAttribute('data-editing'), buttons, text: q.querySelector('.retained-question')?.textContent?.trim() };
  })()`);
  assert.equal(journeyAInitial.editing, 'false');
  assert.ok(journeyAInitial.buttons.includes('EDIT QUESTION'), 'EDIT QUESTION button visible');
  assert.ok(journeyAInitial.buttons.includes('NEW QUESTION'), 'NEW QUESTION button visible');

  // Click EDIT QUESTION once -> textarea immediately mounted with existing question
  await driver.evalJson(`(() => {
    const btn = [...document.querySelectorAll('#demo-question button')].find(b => b.textContent.trim() === 'EDIT QUESTION');
    btn.click();
    return true;
  })()`);
  await driver.waitFor(`Boolean(document.querySelector('textarea#research-question') && document.activeElement?.id === 'research-question')`);
  const editState = await driver.evalJson(`(() => {
    const ta = document.querySelector('textarea#research-question');
    return {
      editing: document.querySelector('#demo-question .research-question')?.getAttribute('data-editing'),
      value: ta?.value,
      focused: document.activeElement === ta,
    };
  })()`);
  assert.equal(editState.editing, 'true');
  assert.ok(editState.value.length > 0, 'EDIT QUESTION preserves existing question text in one click');
  assert.equal(editState.focused, true, 'EDIT QUESTION focuses textarea in one click');

  // Cancel back to retained question, then click NEW QUESTION once -> empty composer in one click
  await driver.evalJson(`(() => {
    const cancelBtn = [...document.querySelectorAll('#demo-question button')].find(b => /Cancel edit/i.test(b.textContent));
    cancelBtn.click();
    return true;
  })()`);
  await driver.waitFor(`document.querySelector('#demo-question .research-question')?.getAttribute('data-editing') === 'false'`);
  await driver.evalJson(`(() => {
    const newBtn = [...document.querySelectorAll('#demo-question button')].find(b => b.textContent.trim() === 'NEW QUESTION');
    newBtn.click();
    return true;
  })()`);
  await driver.waitFor(`Boolean(document.querySelector('textarea#research-question') && document.activeElement?.id === 'research-question')`);
  const newQuestionState = await driver.evalJson(`(() => {
    const ta = document.querySelector('textarea#research-question');
    return {
      editing: document.querySelector('#demo-question .research-question')?.getAttribute('data-editing'),
      value: ta?.value,
      focused: document.activeElement === ta,
    };
  })()`);
  assert.equal(newQuestionState.editing, 'true');
  assert.equal(newQuestionState.value, '', 'NEW QUESTION opens clean empty draft in one click');
  assert.equal(newQuestionState.focused, true, 'NEW QUESTION focuses textarea in one click');
  await driver.screenshot(`${outDir}/${browserTag}-journey-a-question-editing.png`);

  // Cancel back so we have a question
  await driver.evalJson(`(() => {
    const cancelBtn = [...document.querySelectorAll('#demo-question button')].find(b => /Cancel edit/i.test(b.textContent));
    cancelBtn?.click();
    return true;
  })()`);
  await driver.waitFor(`document.querySelector('#demo-question .research-question')?.getAttribute('data-editing') === 'false'`);

  // =========================================================================
  // JOURNEY D: Zero-Stimulus Guard & One-Click Stimulus Comparison
  // =========================================================================
  await driver.evalJson(`(() => {
    const slider = document.querySelector('#stimulus-strength');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(slider, '0');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await driver.waitFor(`Boolean(document.querySelector('.zero-stimulus-guard'))`);
  const zeroGuardState = await driver.evalJson(`(() => {
    const guard = document.querySelector('.zero-stimulus-guard');
    return {
      text: guard?.textContent?.trim(),
      hasCompareBtn: Boolean([...guard.querySelectorAll('button')].find(b => /COMPARE NO STIMULUS VS STIMULUS/i.test(b.textContent))),
    };
  })()`);
  assert.match(zeroGuardState.text, /Both runs (will receive|received) stimulus 0\.0/i);
  assert.equal(zeroGuardState.hasCompareBtn, true);
  await driver.screenshot(`${outDir}/${browserTag}-journey-d-zero-stimulus-guard.png`);

  // Click COMPARE NO STIMULUS VS STIMULUS -> switches to The environment (STIMULUS_RESPONSE) with stimulus 1.0
  await driver.evalJson(`(() => {
    const btn = [...document.querySelectorAll('.zero-stimulus-guard button')].find(b => /COMPARE NO STIMULUS VS STIMULUS/i.test(b.textContent));
    btn.click();
    return true;
  })()`);
  await driver.waitFor(`!document.querySelector('.zero-stimulus-guard')`);

  // =========================================================================
  // JOURNEY B: Environment / Stimulus-Response Experiment (0.0 vs 1.0)
  // =========================================================================
  const envSelected = await driver.evalJson(`(() => {
    const envBtn = [...document.querySelectorAll('.experiment-type-choice button')].find(b => /The environment/i.test(b.textContent));
    return { pressed: envBtn?.getAttribute('aria-pressed'), question: document.querySelector('#demo-question .retained-question')?.textContent?.trim() };
  })()`);
  assert.equal(envSelected.pressed, 'true');

  // Design with Meta (offline fake client) -> Approve & Run Experiment -> Compare
  await driver.evalJson(`(() => {
    const designBtn = [...document.querySelectorAll('button')].find(b => /Design with Meta|Design experiment with Meta/i.test(b.textContent) && !b.disabled);
    if (!designBtn) throw new Error('Design button not found');
    designBtn.click();
    return true;
  })()`);
  await driver.waitFor(`Boolean([...document.querySelectorAll('button')].find(b => /Approve & Run Experiment/i.test(b.textContent) && !b.disabled))`);
  await driver.evalJson(`(() => {
    const runBtn = [...document.querySelectorAll('button')].find(b => /Approve & Run Experiment/i.test(b.textContent) && !b.disabled);
    runBtn.click();
    return true;
  })()`);
  await driver.waitFor(`Boolean(document.querySelector('.completed-result-summary'))`);

  // Switch to Compare mode
  await driver.evalJson(`(() => {
    const cmpBtn = [...document.querySelectorAll('button')].find(b => /Compare what changed|Compare/i.test(b.textContent) && !b.disabled);
    cmpBtn.click();
    return true;
  })()`);
  await driver.waitFor(`Boolean(document.querySelector('.compare-workspace .experiment-conditions') && document.querySelector('.compare-arena canvas[data-world-camera]'))`);
  await driver.evalJson(`new Promise(r => setTimeout(() => r(true), 500))`);

  // Inspect step 0..6 in STIMULUS_RESPONSE Compare
  const stimulusCompareSteps = await driver.evalJson(`(() => {
    const slider = document.querySelector('.compare-playback-container input[type="range"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const setStep = (s) => {
      setter.call(slider, String(s));
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const steps = [];
    for (let s = 0; s <= Number(slider.max); s++) {
      setStep(s);
      const ctrl = document.querySelector('.control-overlay');
      const test = document.querySelector('.intervention-overlay');
      steps.push({
        step: s,
        control: {
          decoder: ctrl?.getAttribute('data-decoder'),
          motor: ctrl?.getAttribute('data-motor'),
          note: ctrl?.querySelector('.procedural-trajectory-note')?.textContent?.trim(),
        },
        test: {
          decoder: test?.getAttribute('data-decoder'),
          motor: test?.getAttribute('data-motor'),
          note: test?.querySelector('.procedural-trajectory-note')?.textContent?.trim(),
        },
      });
    }
    setStep(3);
    const cond = document.querySelector('.experiment-conditions');
    const persistentQuestion = Boolean(document.querySelector('#demo-question button') && [...document.querySelectorAll('#demo-question button')].some(b => b.textContent.trim() === 'EDIT QUESTION'));
    return {
      experimentType: cond?.getAttribute('data-experiment-type'),
      conditionsText: cond?.textContent?.replace(/\\s+/g, ' ').trim(),
      persistentQuestionInCompare: persistentQuestion,
      steps,
    };
  })()`);

  assert.equal(stimulusCompareSteps.experimentType, 'STIMULUS RESPONSE');
  assert.equal(stimulusCompareSteps.persistentQuestionInCompare, true);
  for (const s of [0, 1, 2]) {
    assert.equal(stimulusCompareSteps.steps[s].control.decoder, 'IDLE');
    assert.equal(stimulusCompareSteps.steps[s].control.motor, 'GROUNDED');
    assert.equal(stimulusCompareSteps.steps[s].test.decoder, 'IDLE');
    assert.equal(stimulusCompareSteps.steps[s].test.motor, 'GROUNDED', `Test fly stationary at step ${s} before ESCAPE onset`);
  }
  assert.equal(stimulusCompareSteps.steps[3].control.decoder, 'IDLE');
  assert.equal(stimulusCompareSteps.steps[3].control.motor, 'GROUNDED');
  assert.match(stimulusCompareSteps.steps[3].control.note, /0\.00 scene units/);
  assert.equal(stimulusCompareSteps.steps[3].test.decoder, 'ESCAPE');
  assert.equal(stimulusCompareSteps.steps[3].test.motor, 'TAKEOFF_ESCAPE');
  assert.match(stimulusCompareSteps.steps[3].test.note, /1\.39 scene units/);
  await driver.evalJson(`(() => { document.querySelector('.compare-condition-readouts')?.scrollIntoView({ block: 'start' }); return true; })()`);
  await driver.evalJson(`new Promise(r => setTimeout(() => r(true), 400))`);
  await driver.screenshot(`${outDir}/${browserTag}-journey-b-stimulus-response-compare-step3.png`);

  // =========================================================================
  // JOURNEY C: Neural Intervention Experiment (Primary A Silenced)
  // =========================================================================
  await driver.evalJson(`(() => {
    const neuralBtn = [...document.querySelectorAll('.experiment-type-choice button')].find(b => /The nervous system/i.test(b.textContent));
    neuralBtn.click();
    return true;
  })()`);
  await driver.waitFor(`Boolean([...document.querySelectorAll('.experiment-type-choice button')].find(b => /The nervous system/i.test(b.textContent))?.getAttribute('aria-pressed') === 'true')`);

  await driver.evalJson(`(() => {
    const designBtn = [...document.querySelectorAll('button')].find(b => /Design with Meta|Design experiment with Meta/i.test(b.textContent) && !b.disabled);
    designBtn.click();
    return true;
  })()`);
  await driver.waitFor(`Boolean([...document.querySelectorAll('button')].find(b => /Approve & Run Experiment/i.test(b.textContent) && !b.disabled))`);
  await driver.evalJson(`(() => {
    const runBtn = [...document.querySelectorAll('button')].find(b => /Approve & Run Experiment/i.test(b.textContent) && !b.disabled);
    runBtn.click();
    return true;
  })()`);
  await driver.waitFor(`Boolean(document.querySelector('.completed-result-summary'))`);
  await driver.evalJson(`(() => {
    const cmpBtn = [...document.querySelectorAll('button')].find(b => /Compare what changed|Compare/i.test(b.textContent) && !b.disabled);
    cmpBtn.click();
    return true;
  })()`);
  await driver.waitFor(`document.querySelector('.compare-workspace .experiment-conditions')?.getAttribute('data-experiment-type') === 'NEURAL INTERVENTION' && Boolean(document.querySelector('.compare-arena canvas[data-world-camera]'))`);
  await driver.evalJson(`new Promise(r => setTimeout(() => r(true), 500))`);

  const neuralCompareSteps = await driver.evalJson(`(() => {
    const slider = document.querySelector('.compare-playback-container input[type="range"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const setStep = (s) => {
      setter.call(slider, String(s));
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const steps = [];
    for (let s = 0; s <= Number(slider.max); s++) {
      setStep(s);
      const ctrl = document.querySelector('.control-overlay');
      const intv = document.querySelector('.intervention-overlay');
      steps.push({
        step: s,
        control: {
          decoder: ctrl?.getAttribute('data-decoder'),
          motor: ctrl?.getAttribute('data-motor'),
          note: ctrl?.querySelector('.procedural-trajectory-note')?.textContent?.trim(),
        },
        intervention: {
          decoder: intv?.getAttribute('data-decoder'),
          motor: intv?.getAttribute('data-motor'),
          note: intv?.querySelector('.procedural-trajectory-note')?.textContent?.trim(),
        },
      });
    }
    setStep(3);
    const cond = document.querySelector('.experiment-conditions');
    return {
      experimentType: cond?.getAttribute('data-experiment-type'),
      conditionsText: cond?.textContent?.replace(/\\s+/g, ' ').trim(),
      steps,
    };
  })()`);

  assert.equal(neuralCompareSteps.experimentType, 'NEURAL INTERVENTION');
  // At step 3, Control reaches ESCAPE / TAKEOFF_ESCAPE, while Intervention (Silence Primary A) is still IDLE / GROUNDED!
  assert.equal(neuralCompareSteps.steps[3].control.decoder, 'ESCAPE');
  assert.equal(neuralCompareSteps.steps[3].control.motor, 'TAKEOFF_ESCAPE');
  assert.equal(neuralCompareSteps.steps[3].intervention.decoder, 'IDLE');
  assert.equal(neuralCompareSteps.steps[3].intervention.motor, 'GROUNDED');
  // At step 4, Intervention reaches ESCAPE / TAKEOFF_ESCAPE via alternate pathway
  assert.equal(neuralCompareSteps.steps[4].intervention.decoder, 'ESCAPE');
  assert.equal(neuralCompareSteps.steps[4].intervention.motor, 'TAKEOFF_ESCAPE');
  await driver.evalJson(`(() => { document.querySelector('.compare-condition-readouts')?.scrollIntoView({ block: 'start' }); return true; })()`);
  await driver.evalJson(`new Promise(r => setTimeout(() => r(true), 400))`);
  await driver.screenshot(`${outDir}/${browserTag}-journey-c-neural-intervention-compare-step3.png`);

  return {
    browserTag,
    journeyAInitial,
    editState,
    newQuestionState,
    zeroGuardState,
    stimulusCompareSteps,
    neuralCompareSteps,
  };
}

const firefoxPath = findRealFirefoxExecutable();
assert.ok(firefoxPath, 'Genuine desktop Firefox executable required');
const results = {};

const ff = await launchRealFirefoxBiDi(firefoxPath, base, { allowLocalExperiments: true });
try {
  await ff.addInitScript(preloadScriptSource);
  results.firefox = await runJourneys(ff, 'firefox-real');
} finally {
  await ff.close();
}

const edge = await launchEdgeAdapter(base, { allowLocalExperiments: true });
try {
  await edge.addInitScript(preloadScriptSource);
  results.edge = await runJourneys(edge, 'msedge');
} finally {
  await edge.close();
}

fs.writeFileSync(`${outDir}/sprint173-compare-and-question-review.json`, JSON.stringify(results, null, 2));
console.log('Sprint 17.3 Browser Verification Passed:', Object.keys(results));
