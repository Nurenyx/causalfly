// Offline production-component acceptance. No provider, upload, SSE or brain socket can escape.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const playwright = await import(pathToFileURL(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const base = process.env.CAUSALFLY_BROWSER_REVIEW_BASE ?? 'http://127.0.0.1:3464';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local fixture host only');
const baseline = process.argv.includes('--baseline');
const anchorProbe = process.argv.includes('--anchor-none');
const dir = process.env.CAUSALFLY_BROWSER_REVIEW_DIR ?? 'docs/review/sprint-17';
fs.mkdirSync(dir, { recursive: true });
const recorded = JSON.parse(fs.readFileSync('docs/review/sprint-6b/recorded-evidence.json', 'utf8'))[0];
const eventSamples = JSON.parse(fs.readFileSync('docs/review/sprint-6b/recorded-evidence.json', 'utf8')).slice(1).map(f=>f.telemetry.spikeEvents);
const bundle = await build({ stdin: { contents: `
import React,{useLayoutEffect} from 'react';import {createRoot} from 'react-dom/client';
import {useFruitFlySource} from './src/app/components/data-source-panel';
import {LiveSessionWorkspace} from './src/app/components/live-session';
import {receiveSnapshot,emptyLiveSession} from './src/lib/sources/live-session';
import {SensoryFeedbackControl} from './src/app/components/sensory-feedback-control';
window.EventSource=class{constructor(){window.fixtureStream=this;}close(){}};
window.WebSocket=class{constructor(){throw Error('Real brain sockets forbidden');}};
const original=${JSON.stringify(recorded)};let sequence=0;let epoch=0;let previousIndex=-1;let session=1;let expected=emptyLiveSession();let authored=[];
const eventSamples=${JSON.stringify(eventSamples)};
window.fixtureNewSession=()=>{session++;sequence=0;epoch=0;previousIndex=-1;expected=emptyLiveSession();authored=[];};
window.fixtureEmit=(index)=>{const f=structuredClone(original);if(index<=previousIndex)epoch+=200000;previousIndex=index;sequence++;
Object.assign(f.telemetry,{sessionId:'sprint17-authored-fixture-'+session,sequence,neuralTick:epoch+[9,99,999,9999,99999,192000][index],simulationMs:sequence*50,totalSpikeEvents:[0,620,3314,18421,620,18421][index],activeNeuronCount:[0,7239,59294,100001,7239,100001][index],displaySpikeEvents:index?512:0,displayTruncated:index!==0,motorMode:['IDLE','ESCAPE','WALK','IDLE','TAKEOFF','IDLE'][index],inputSequence:index===4?-1:sequence,inputFresh:index%2===0,droppedDisplayFrames:index%3?99999:0,droppedSubscriberMessages:index%2?192000:0});
f.telemetry.spikeEvents=index?eventSamples[index%eventSamples.length].map(e=>({...e,spikeTimeMs:f.telemetry.simulationMs})):[];f.receivedAt=new Date(Date.now()-100).toISOString();
const snapshot={source:'FRUITFLY_XR',state:'DATA RECEIVED',message:'AUTHORED OFFLINE PRESENTATION FIXTURE',evidence:f};
authored.push(f);authored=authored.slice(-120);expected=receiveSnapshot(expected,snapshot);window.fixtureStream.onmessage({data:JSON.stringify(snapshot)});};
function Fixture(){const live=useFruitFlySource();window.fixtureConnect=live.connect;window.fixtureRaw=()=>live.current();
window.fixtureVerify=()=>({received:sequence,retained:live.current().frames.length,evidenceUnchanged:JSON.stringify(expected)===JSON.stringify(live.current())&&JSON.stringify(authored)===JSON.stringify(live.current().frames)});
useLayoutEffect(()=>{window.fixtureCommits=(window.fixtureCommits??0)+1;window.fixturePresented=live.snapshot.evidence?.telemetry;});
return <div className="app-shell instrument-shell guided-shell workspace-shell live-shell"><aside className="sidebar">AUTHORED OFFLINE TELEMETRY FIXTURE<br/>NOT GENUINE LIVE ACCEPTANCE</aside><div className="workspace"><header className="page-header"><h1>Live connectome presentation fixture</h1></header><main className="main-content"><LiveSessionWorkspace embodimentChoice={true} readSnapshot={live.readSnapshot} snapshot={live.snapshot} frames={live.frames} now={live.now} onEvidence={()=>{}} onConnect={live.connect} onDisconnect={live.disconnect}/></main><footer className="scientific-disclaimer" id="fixture-footer">END OF RECEIVED SIMULATION WINDOW · simulated dynamics, procedural movement, no biological validation.</footer></div></div>}
createRoot(document.getElementById('root')).render(<Fixture/>);
// Separate semantic states exercise the real control with authored receipts, never a transport.
window.fixtureFeedback=(state)=>{const root=window.feedbackRoot??=createRoot(document.getElementById('feedback-fixture'));root.render(<SensoryFeedbackControl armed={!['OFF','UNAVAILABLE'].includes(state)} available={state!=='UNAVAILABLE'} receipt={['OFF','UNAVAILABLE'].includes(state)?'ARMED':state} detail="Authored fixture receipt only; no brain message sent." onChange={()=>{}}/>);};
`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, outdir: 'tmp/sprint17-bundle', platform: 'browser', jsx: 'automatic', loader: { '.css': 'local-css' }, define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL': '"wss://fixture.invalid/brain/v1"' } });

const selectors = {
  summary: '[aria-label="Live connectome simulation session status"]',
  observatory: '[class*="connectome"][class*="panel"]', timeline: '[class*="timeline"]',
  spikes: 'figure:nth-of-type(1)', active: 'figure:nth-of-type(2)',
  observations: '[aria-label="Received observations"]', notes: '[class*="streamNotes"]',
  investigate: '[class*="investigate"]', source: '[class*="provenance"]',
  embodiment: '[aria-label="Experimental embodiment context"]', output: '[class*="output"][class*="panel"]',
  health: '[class*="health"][class*="panel"]', footer: '#fixture-footer',
  mapping: '[aria-label="Supplied neuron ID mapping"]', chartSvgSpikes: 'figure:nth-of-type(1) svg', chartSvgActive: 'figure:nth-of-type(2) svg',
  decoder: '.telemetry-primary dl > div:nth-child(4)', counters: '.telemetry-primary dl',
  autonomyControls: '.autonomy-controls', autonomyLineage: '.autonomy-lineage', autonomyReadout: '.autonomy-readout',
  autonomyTelemetry: '.readout-telemetry-strip', feedback: '.sensory-feedback',
};
for (let i = 1; i <= 5; i++) for (const [key, child] of [['slot',''], ['title',' strong'], ['tick',' > span:nth-child(2)'], ['time',' > span:nth-child(3)']]) selectors[`timeline-${i}-${key}`] = `[class*="timeline"] li:nth-child(${i})${child}`;

if(!baseline)for(let i=0;i<4;i++)selectors[`notes-slot-${i}`]=`[data-note-slot="${i}"]`;
const report = { fixtureOnly: true, viewport: [1728,1080], baseline, anchorProbe, tolerancePx: 1, durationPerPositionMs: 7000, requestedInputHz: 1000, packetsPerBurst: 10, browsers: [], firefox: { available: fs.existsSync(playwright.firefox.executablePath()) }, providerRequests: 0, mediaUploads: 0, realBrainMessages: 0 };
const engines = [['edge',playwright.chromium,{channel:'msedge'}]];
if (report.firefox.available) engines.push(['firefox',playwright.firefox,{}]);
else report.firefox.limitation = 'Playwright Firefox runtime is absent; no browser download attempted. Human Firefox live acceptance required.';

for (const [engine, browserType, options] of engines) {
  const browser = await browserType.launch({headless:true,...options});
  const context = await browser.newContext({viewport:{width:1728,height:1080},reducedMotion:'reduce'});
  const page = await context.newPage();const errors=[];const forbidden=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname)||(u.pathname.startsWith('/api/')&&u.pathname!=='/api/health')){forbidden.push(u.pathname);return r.abort();}return r.continue();});
  await context.routeWebSocket('**',s=>{forbidden.push('real-websocket');s.close();});
  try {
    assert.equal((await(await page.request.get(base+'/api/health')).json()).metaMode,'offline');
    await page.goto(base,{waitUntil:'networkidle'});
    const css=await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const htmlClass=await page.locator('html').getAttribute('class');
    assert.ok((await Promise.all(css.map(async url=>(await page.request.get(url)).text()))).some(text=>text.includes('.telemetry-primary')), 'Build current sources before review: running CSS lacks live telemetry contracts');
    const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text;
    await context.route('**/sprint17-fixture',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html class="${htmlClass}"><head>${css.map(h=>`<link rel="stylesheet" href="${h}">`).join('')}<style>${bundle.outputFiles.filter(f=>f.path.endsWith('.css')).map(f=>f.text).join('\n')}</style></head><body><div id="root"></div><div id="feedback-fixture"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`}));
    await page.goto(base+'/sprint17-fixture',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>Boolean(window.fixtureConnect));
    await page.evaluate(()=>{window.fixtureConnect();window.fixtureStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'CONNECTED',message:'Offline fixture waiting',evidence:null})});});
    await page.getByRole('heading',{name:'Waiting for first frame',exact:true}).waitFor();
    await page.evaluate(()=>window.fixtureEmit(0));
    await page.locator('[class*="spatialViewer"] canvas').waitFor();await page.locator('.autonomy-world canvas').waitFor();
    await page.waitForTimeout(800);
    if(anchorProbe) await page.addStyleTag({content:'[class*="session"] { overflow-anchor:none; }'});
    await page.evaluate(selectors=>{
      const missing=Object.entries(selectors).filter(([,s])=>!document.querySelector(s));if(missing.length)throw Error('Missing targets: '+JSON.stringify(missing));
      window.measurements=[];window.longTasks=[];window.frameIntervals=[];window.mutations=0;window.identityChanges=[];window.presentationTimes=[];window.coherenceFailures=[];window.noteStructureChanges=[];
      let prior=null;let previousTime=null;let lastCommit=-1;const identities=new Map();
      const measure=kind=>{if(!window.measuring)return;const rects={};
        for(const [key,selector] of Object.entries(selectors)){const el=document.querySelector(selector);if(identities.has(key)&&identities.get(key)!==el)window.identityChanges.push(key);identities.set(key,el);const r=el.getBoundingClientRect();const value={top:r.top,left:r.left,width:r.width,height:r.height,documentTop:r.top+scrollY};value.delta=Object.fromEntries(['top','left','width','height','documentTop'].map(k=>[k,prior?value[k]-prior.rects[key][k]:0]));rects[key]=value;}
        const notes=document.querySelector('[class*="streamNotes"]');const noteStructure=[...notes.children].map(n=>n.tagName+':'+n.children.length).join(',');if(prior&&prior.noteStructure!==noteStructure)window.noteStructureChanges.push({from:prior.noteStructure,to:noteStructure});
        const sample={time:performance.now(),kind,commit:window.fixtureCommits,scrollY,scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,noteStructure,rects};
        window.measurements.push(sample);prior=sample;
        if(lastCommit!==window.fixtureCommits){lastCommit=window.fixtureCommits;const t=window.fixturePresented;window.presentationTimes.push({time:sample.time,sequence:t.sequence,tick:t.neuralTick});const actual=[...document.querySelectorAll('.telemetry-primary dd')].map(n=>n.textContent);const expected=[t.neuralTick,t.totalSpikeEvents,t.activeNeuronCount].map(v=>v.toLocaleString('en-US')).concat(t.motorMode);if(JSON.stringify(actual)!==JSON.stringify(expected))window.coherenceFailures.push({actual,expected});}
      };
      new MutationObserver(records=>{if(window.measuring)window.mutations+=records.length;measure('DOM presentation update');}).observe(document.getElementById('root'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-feedback','data-retained','data-state']});
      let pending=false;new MutationObserver(()=>{pending=true;}).observe(document.getElementById('root'),{subtree:true,childList:true,characterData:true});
      function frame(time){if(window.measuring&&previousTime!==null)window.frameIntervals.push(time-previousTime);previousTime=time;if(pending){pending=false;measure('next animation frame');}requestAnimationFrame(frame);}requestAnimationFrame(frame);
      try{new PerformanceObserver(list=>{if(window.measuring)window.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})));}).observe({entryTypes:['longtask']});}catch{}
      window.startMeasurement=()=>{prior=null;lastCommit=-1;window.measuring=true;measure('initial');};
    },selectors);
    const runs=[];
    for(const position of ['top','middle','bottom']) {
      // Exactly one initial scroll; no scrolling, locator actions or screenshots during a measured run.
      await page.evaluate(position=>{window.measuring=false;window.scrollTo(0,position==='top'?0:position==='middle'?(document.documentElement.scrollHeight-innerHeight)/2:document.documentElement.scrollHeight-innerHeight);},position);
      await page.waitForTimeout(200);
      await page.evaluate(()=>{window.measurements=[];window.presentationTimes=[];window.frameIntervals=[];window.longTasks=[];window.mutations=0;window.noteStructureChanges=[];window.startMeasurement();});
      const memoryBefore=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null);
      const rawBefore=await page.evaluate(()=>window.fixtureVerify().received);
      await page.evaluate(async duration=>{let index=0;await new Promise(resolve=>{const interval=setInterval(()=>{for(let packet=0;packet<10;packet++)window.fixtureEmit(index++%6);},10);setTimeout(()=>{clearInterval(interval);resolve();},duration);});},report.durationPerPositionMs);
      await page.waitForTimeout(220);
      const run=await page.evaluate(()=>{window.measuring=false;return {samples:window.measurements,presentations:window.presentationTimes,longTasks:window.longTasks,frameIntervals:window.frameIntervals,domMutationCount:window.mutations,memoryAfter:performance.memory?.usedJSHeapSize??null,coherenceFailures:window.coherenceFailures,noteStructureChanges:window.noteStructureChanges,identityChanges:[...new Set(window.identityChanges)],retention:window.fixtureVerify()};});
      run.position=position;run.memoryBefore=memoryBefore;
      run.receivedInRun=run.retention.received-rawBefore;
      const first=run.samples[0];run.maximumScrollDeltaPx=Math.max(...run.samples.map(s=>Math.abs(s.scrollY-first.scrollY)));
      run.documentHeightRangePx=Math.max(...run.samples.map(s=>s.scrollHeight))-Math.min(...run.samples.map(s=>s.scrollHeight));
      run.maximumDisplacement=Object.fromEntries(Object.keys(selectors).map(key=>[key,Object.fromEntries(['top','left','width','height','documentTop'].map(d=>[d,Math.max(...run.samples.map(s=>Math.abs(s.rects[key][d]-first.rects[key][d])))]))]));
      run.presentationHz=(run.presentations.length-1)/((run.samples.at(-1).time-first.time)/1000);
      run.telemetryPresentationHz=run.presentations.filter((p,i,a)=>i&&p.sequence!==a[i-1].sequence).length/((run.samples.at(-1).time-first.time)/1000);
      run.actualInputHz=run.receivedInRun/((run.samples.at(-1).time-first.time)/1000);
      run.horizontalOverflow=run.samples.some(s=>s.scrollWidth>1728);
      runs.push(run);
    }
    const numericContracts=[];
    for(let index=0;index<6;index++){await page.evaluate(index=>{window.fixtureNewSession();window.fixtureEmit(index);},index);await page.waitForTimeout(210);numericContracts.push(await page.evaluate(()=>({values:[...document.querySelectorAll('.telemetry-primary dd')].map(n=>n.textContent),rects:[...document.querySelectorAll('.telemetry-primary dl > div')].map(n=>{const r=n.getBoundingClientRect();return{left:r.left,top:r.top+scrollY,width:r.width,height:r.height};})})));}
    for(const contract of numericContracts)for(const [i,r] of contract.rects.entries())for(const d of ['left','top','width','height'])assert.ok(Math.abs(r[d]-numericContracts[0].rects[i][d])<=1,`Numeric contract ${contract.values[0]} ${d}`);
    const captures=[];
    for(const [name,index] of [['live-low-values',0],['live-six-digit-values',5],['decoder-idle',0],['decoder-escape',1]]) {await page.evaluate(index=>{window.fixtureNewSession();window.fixtureEmit(index);},index);await page.waitForTimeout(210);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${dir}/${engine}-${name}-1728.png`});captures.push(name);}
    const feedback=[];
    await page.evaluate(()=>{document.getElementById('feedback-fixture').style.cssText='width:600px;position:fixed;top:20px;left:20px;z-index:100;background:#071c27';});
    for(const state of ['OFF','ARMED','SENDING','ACCEPTED','REJECTED','UNAVAILABLE']) {await page.evaluate(state=>window.fixtureFeedback(state),state);await page.locator(`#feedback-fixture [data-feedback="${state}"]`).waitFor();feedback.push({state,rect:await page.locator('#feedback-fixture .sensory-feedback').boundingBox()});await page.screenshot({path:`${dir}/${engine}-feedback-${state.toLowerCase()}-1728.png`});}
    await page.evaluate(()=>{document.getElementById('feedback-fixture').style.display='none';window.fixtureStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'DISCONNECTED',message:'Fixture stopped; snapshot retained',evidence:null})});});
    await page.locator('.telemetry-primary[data-retained=true]').waitFor();await page.screenshot({path:`${dir}/${engine}-retained-snapshot-1728.png`});
    const anchoring=await page.evaluate(()=>({supported:CSS.supports('overflow-anchor','none'),html:getComputedStyle(document.documentElement).overflowAnchor,live:getComputedStyle(document.querySelector('[class*="session"]')).overflowAnchor}));
    const graphics=await page.evaluate(()=>{const canvas=document.querySelector('[class*="spatialViewer"] canvas');const gl=canvas?.getContext('webgl2');const info=gl?.getExtension('WEBGL_debug_renderer_info');return info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):'Unavailable';});
    report.browsers.push({engine,runs,numericContracts,feedback,captures,anchoring,graphics,errors,forbidden});
  } finally {await context.close();await browser.close();}
}
const name=baseline?'layout-instability-before':anchorProbe?'layout-instability-anchor-probe':'layout-instability';
fs.writeFileSync(`${dir}/${name}.json`,JSON.stringify(report,null,2));
const summary=report.browsers.map(b=>({engine:b.engine,runs:b.runs.map(r=>({position:r.position,samples:r.samples.length,received:r.retention.received,retained:r.retention.retained,evidenceUnchanged:r.retention.evidenceUnchanged,scrollDelta:r.maximumScrollDeltaPx,heightRange:r.documentHeightRangePx,maximumPrimaryDelta:Math.max(...Object.entries(r.maximumDisplacement).filter(([k])=>!k.startsWith('timeline-')).flatMap(([,v])=>Object.values(v))),maximumSlotDelta:Math.max(...Object.entries(r.maximumDisplacement).filter(([k])=>k.startsWith('timeline-')).flatMap(([,v])=>Object.values(v))),presentationHz:r.presentationHz,identityChanges:r.identityChanges,longTasks:r.longTasks.length,memoryGrowth:r.memoryAfter-r.memoryBefore})),errors:b.errors,forbidden:b.forbidden}));
fs.writeFileSync(`${dir}/${name}-summary.json`,JSON.stringify({summary,firefox:report.firefox},null,2));
console.log(JSON.stringify({summary,firefox:report.firefox},null,2));
if(!baseline&&!anchorProbe)for(const b of report.browsers){assert.deepEqual(b.errors,[]);assert.deepEqual(b.forbidden,[]);for(const r of b.runs){assert.ok(r.maximumScrollDeltaPx<=1,`${b.engine} ${r.position}: scroll bounce`);assert.ok(r.documentHeightRangePx<=1,`${b.engine} ${r.position}: document height oscillates`);assert.equal(r.horizontalOverflow,false);assert.deepEqual(r.identityChanges,[]);assert.deepEqual(r.coherenceFailures,[]);assert.equal(r.retention.evidenceUnchanged,true);for(const [key,v] of Object.entries(r.maximumDisplacement))for(const [d,delta] of Object.entries(v))assert.ok(delta<=1,`${b.engine} ${r.position} ${key} ${d}: ${delta}px`);}for(const f of b.feedback)assert.ok(Math.abs(f.rect.height-b.feedback[0].rect.height)<=1,`Feedback ${f.state} geometry`);}
