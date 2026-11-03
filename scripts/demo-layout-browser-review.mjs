import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {PerspectiveCamera,Vector3} from 'three';

export async function reviewDemoLayout(browser,base,dir) {
 const ctx=await browser.newContext({viewport:{width:1728,height:1080},reducedMotion:'reduce'});const page=await ctx.newPage();const errors=[];const forbidden=[];
 await ctx.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 for(const pattern of ['**/api/media/**','**/api/perception**','**/api/sources/fruitfly/analyze'])await ctx.route(pattern,r=>{forbidden.push(r.request().url());return r.abort();});
 await ctx.routeWebSocket('**',socket=>socket.close());
 page.on('pageerror',e=>errors.push(e.message));
 const capture=async name=>page.screenshot({path:`${dir}/demo-${name}-1728.png`});
 try {
  assert.equal((await(await page.request.get(base+'/api/health')).json()).metaMode,'offline');
  await page.goto(base,{waitUntil:'networkidle'});
  await capture('experiment-initial');
  await page.locator('.fixture-topology').first().scrollIntoViewIfNeeded();await capture('enlarged-topology');
  const topology=await page.locator('.fixture-topology svg').first().boundingBox();assert.ok(topology.height>=270);
  assert.match(await page.locator('.embodied-signals .source-context').textContent(),/ENGINEERING NETWORK/);
  assert.equal(await page.locator('.embodied-signals canvas').count(),0);
  await page.locator('.scientist-action button').first().click();await page.getByRole('button',{name:/APPROVE.*RUN/i}).first().waitFor();await page.locator('.scientist-action button').first().click();await page.locator('.completed-result-summary').waitFor();await page.locator('.compare-transition-btn').first().click();await page.locator('.compare-arena canvas[data-world-camera]').waitFor();
  const views=[];
  for(const [label,focus] of [['Both side-by-side','both'],['01 Control only','control'],['02 Intervention only','perturbed']]){
   await page.getByRole('button',{name:label,exact:true}).click();
   await page.waitForFunction(focus=>JSON.parse(document.querySelector('.compare-arena canvas').getAttribute('data-world-camera')).focus===focus&&JSON.parse(document.querySelector('.compare-arena canvas').getAttribute('data-world-camera')).framing==='visual-bounds',focus);
   await page.waitForTimeout(250);
   const camera=JSON.parse(await page.locator('.compare-arena canvas').getAttribute('data-world-camera'));
   const c=new PerspectiveCamera(camera.fov,camera.width/camera.height,.1,100);c.position.fromArray(camera.position);c.lookAt(new Vector3().fromArray(camera.target));c.updateMatrixWorld();
   for(const x of [camera.bounds.min[0],camera.bounds.max[0]])for(const y of [camera.bounds.min[1],camera.bounds.max[1]])for(const z of [camera.bounds.min[2],camera.bounds.max[2]]) {const p=new Vector3(x,y,z).project(c);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,'Visual bounds contained');}
   const arena=await page.locator('.compare-arena').boundingBox();assert.ok(arena.height>=480&&arena.height<=560);
   const summary=await page.locator('.compare-summary-bar').boundingBox();const controls=await page.locator('.compare-playback-container').boundingBox();assert.ok(summary.y+summary.height<=arena.y&&controls.y+controls.height<=arena.y);
   await page.locator('.compare-condition-readouts').evaluate(el=>el.scrollIntoView({block:'start'}));await capture('compare-'+focus);views.push({focus,camera,arena});
  }
  for(const [width,height] of [[1366,768],[1440,900],[1536,1024],[1728,1080],[1920,1080]]) {await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  assert.deepEqual(errors,[]);assert.deepEqual(forbidden,[]);
  return {name:'demo-experiment-layout',fixtureOnly:true,topology,views,providerRequests:0,realBrainMessages:0,errors};
 }finally{await ctx.close();}
}

export async function reviewDemoLive(browser,base,dir) {
 const original=JSON.parse(fs.readFileSync('docs/review/sprint-6b/recorded-evidence.json','utf8'))[0];
 const bundled=await build({stdin:{contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {useFruitFlySource} from './src/app/components/data-source-panel';import {LiveSessionWorkspace,StreamHealth} from './src/app/components/live-session';
window.EventSource=class {constructor(){window.demoStream=this;}close(){}};
window.WebSocket=class {constructor(){throw Error('No real brain socket permitted in presentation fixture');}};
function Fixture(){const live=useFruitFlySource();window.demoConnect=live.connect;window.demoEvidence=()=>live.current();return <main style={{padding:12}}><div style={{color:'#e8c97a',fontSize:12}}>AUTHORED RAPID TELEMETRY FIXTURE · NOT LIVE ACCEPTANCE · NO REAL BRAIN CONTROL</div><LiveSessionWorkspace snapshot={live.snapshot} frames={live.frames} now={live.now} readSnapshot={live.readSnapshot} onEvidence={()=>{}} onConnect={live.connect} onDisconnect={live.disconnect}/><footer id="demo-footer">END OF RETAINED PRESENTATION · all received frames enter the evidence reducer.</footer></main>;}
createRoot(document.getElementById('root')).render(<Fixture/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outdir:'tmp/demo-live-bundle',platform:'browser',jsx:'automatic',loader:{'.css':'local-css'},define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL':'"wss://fixture.invalid/brain/v1"'}});
 const ctx=await browser.newContext({viewport:{width:1728,height:1080},reducedMotion:'reduce'});const page=await ctx.newPage();const errors=[];const forbidden=[];
 page.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)||(u.pathname.startsWith('/api/')&&u.pathname!=='/api/health')){forbidden.push(u.pathname);return r.abort();}return r.continue();});
 await ctx.routeWebSocket('**',socket=>socket.close());
 await page.goto(base,{waitUntil:'networkidle'});const css=await page.locator('link[rel=stylesheet]').evaluateAll(links=>links.map(l=>l.href));
 const js=bundled.outputFiles.find(f=>f.path.endsWith('.js')).text;const localCss=bundled.outputFiles.filter(f=>f.path.endsWith('.css')).map(f=>f.text).join('\n');
 await ctx.route('**/demo-live-fixture',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html><head>${css.map(h=>`<link rel="stylesheet" href="${h}">`).join('')}<style>${localCss}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`}));
 const fixed=Date.parse('2026-11-02T18:00:00Z');let sequence=0;const authored=[];
 const authoredFrame=index=>{
  const f=structuredClone(original);sequence++;Object.assign(f.telemetry,{sequence,neuralTick:[9,99,999,12000][index],simulationMs:sequence*50,totalSpikeEvents:[0,620,3314,18421][index],activeNeuronCount:[0,7239,59294,100001][index],displaySpikeEvents:index===0?0:512,displayTruncated:index>0,motorMode:['IDLE','ESCAPE','WALK','IDLE'][index],inputFresh:index%2===0,inputSequence:sequence,droppedDisplayFrames:index,droppedSubscriberMessages:index});
  // Sequential tick identities remain valid while each repeated burst uses the specified display values.
  f.telemetry.sessionId='authored-demo-presentation';f.telemetry.neuralTick=Math.floor((sequence-1)/4)*12000+[9,99,999,12000][index];f.receivedAt=new Date(fixed).toISOString();authored.push(f);
  return f;
 };
 const emit=async (index,{stop=false}={})=>{
  if(stop){await page.evaluate(()=>window.demoStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'DISCONNECTED',message:'Authored fixture ended',evidence:null})}));return;}
  await page.evaluate(f=>window.demoStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'DATA RECEIVED',message:'Authored telemetry values',evidence:f})}),authoredFrame(index));
 };
 const boxes=()=>page.evaluate(()=>{const selectors=['[class*="layout"]','[class*="heroGrid"]','[class*="timeline"]','[class*="health"]','[class*="streamNotes"]','[class*="investigate"]','[class*="provenance"]','.telemetry-primary','.live-state-summary','#demo-footer'];const result=Object.fromEntries(selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x,y:r.y+scrollY,width:r.width,height:r.height}];}));return{rects:result,documentHeight:document.documentElement.scrollHeight};});
 let maximumDelta=0;const samples=[];const measurements=[];const same=(a,b,label)=>{assert.ok(Math.abs(a.documentHeight-b.documentHeight)<=.5,label+' document height');for(const k of Object.keys(a.rects))for(const d of ['x','y','width','height']){const delta=Math.abs(a.rects[k][d]-b.rects[k][d]);maximumDelta=Math.max(maximumDelta,delta);assert.ok(delta<=.5,`${label}: ${k} ${d} ${a.rects[k][d]} → ${b.rects[k][d]}`);}};
 const capture=async name=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${dir}/demo-${name}-1728.png`});};
 try {
  await page.goto(base+'/demo-live-fixture',{waitUntil:'networkidle'});await page.evaluate(()=>window.demoConnect());await page.evaluate(()=>window.demoStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'CONNECTED',message:'Waiting fixture',evidence:null})}));
  await page.getByText('Waiting for first frame',{exact:true}).waitFor();assert.equal(await page.getByRole('region',{name:'Experimental embodiment context',exact:true}).count(),1);assert.match(await page.getByRole('region',{name:'Experimental embodiment context',exact:true}).innerText(),/NO TELEMETRY|PROCEDURAL EMBODIMENT/);assert.equal(await page.getByRole('region',{name:'Received simulation activity',exact:true}).count(),0,'A procedural visualizer does not establish received neural measurements');await capture('live-waiting');
  await page.clock.setFixedTime(new Date(fixed+200));await emit(0);await page.getByRole('region',{name:'Experimental embodiment context',exact:true}).waitFor();await page.locator('[class*="spatialViewer"] canvas').waitFor();await page.locator('.autonomy-world canvas').waitFor();await page.waitForTimeout(500);await capture('live-telemetry');await page.locator('[class*=heroGrid]').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:dir+'/demo-live-embodiment-1728.png'});
  // Deliberate collapse survives subsequent evidence; expand explicitly for the stable split fixture.
  await page.getByRole('button',{name:'Close experimental embodiment',exact:true}).click();await emit(1);await page.waitForTimeout(200);assert.equal(await page.getByRole('region',{name:'Experimental embodiment context',exact:true}).count(),0);await page.getByRole('button',{name:'Open experimental embodiment',exact:true}).click();await emit(2);await emit(3);await page.waitForTimeout(400);
  for(const [width,height] of [[1366,768],[1440,900],[1536,1024],[1728,1080],[1920,1080]]) {
   await page.setViewportSize({width,height});await page.waitForTimeout(250);const before=await boxes();
   await page.evaluate(()=>{window.demoPaintTicks=[];if(!window.demoPaintObserver){window.demoPaintObserver=new MutationObserver(()=>window.demoPaintTicks.push(document.querySelector('.telemetry-primary dd').textContent));window.demoPaintObserver.observe(document.querySelector('.telemetry-primary dd'),{subtree:true,childList:true,characterData:true});}});
   const rawBefore=await page.evaluate(()=>window.demoEvidence().frames.length);
   // Bursts hit the actual EventSource callback and unchanged ingestion reducer, not React setters.
   const burst=[];for(let round=0;round<3;round++)for(let index=0;index<4;index++)burst.push(authoredFrame(index));
   // Deliver one actual rapid burst inside the renderer. Separate automation
   // round trips and forced layout reads could otherwise span several 180ms
   // presentation intervals and turn the repaint bound into a machine-speed test.
   samples.push(...await page.evaluate(async burst=>{
    const samples=[];
    for(const f of burst){
    window.demoStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'DATA RECEIVED',message:'Authored telemetry values',evidence:f})});
    const selectors=['[class*="layout"]','[class*="heroGrid"]','[class*="timeline"]','[class*="health"]','[class*="streamNotes"]','[class*="investigate"]','[class*="provenance"]','.telemetry-primary','.live-state-summary','#demo-footer'];
    samples.push({rects:Object.fromEntries(selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x,y:r.y+scrollY,width:r.width,height:r.height}];})),documentHeight:document.documentElement.scrollHeight});
    // Yield between receipts: React can commit, so this still exercises the
    // presentation sampler rather than relying on one synchronous React batch.
    await new Promise(resolve=>setTimeout(resolve,5));
    }
    return samples;
   },burst));
   assert.equal(await page.evaluate(()=>window.demoEvidence().frames.length),Math.min(120,rawBefore+12));await page.waitForTimeout(220);
   const after=await boxes();const paintTicks=await page.evaluate(()=>window.demoPaintTicks);assert.ok(paintTicks.length<=4,'Twelve packets coalesce into bounded visible tick changes');same(before,after,'burst '+width);const during=samples.splice(0);for(const sample of during)same(before,sample,'during '+width);measurements.push({width,height,before,during,after,receivedInBurst:12,visibleTickRepaints:paintTicks.length});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow '+width);const timeline=await page.locator('[class*=timeline] ol').evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight}));assert.ok(timeline.scroll<=timeline.client,'Timeline fixed rows have no vertical clipping at '+width);
  }
  await page.setViewportSize({width:1728,height:1080});await page.waitForTimeout(300);await capture('live-rapid-update');const before=await boxes();
  await page.clock.setFixedTime(new Date(fixed+7900));await emit(3,{stop:true});await page.locator('.telemetry-primary[data-retained=true]').waitFor();same(before,await boxes(),'terminal retained flush');await capture('retained-snapshot');
  const raw=await page.evaluate(()=>window.demoEvidence());assert.deepEqual(raw.frames,authored.slice(-120));
  assert.equal(raw.snapshot.evidence.telemetry.sequence,sequence);assert.deepEqual(errors,[]);assert.deepEqual(forbidden,[]);
  return {name:'demo-live-cadence-and-document-stability',fixtureOnly:true,actualIngestionHook:true,displayCadenceMs:180,receivedFrames:sequence,retainedFrames:raw.frames.length,measurements,allExistingReducerFramesPreserved:true,maximumGeometryDeltaPx:maximumDelta,tolerancePx:.5,documentHeightStable:true,terminalFlush:true,collapseChoicePreserved:true,viewports:[[1366,768],[1440,900],[1536,1024],[1728,1080],[1920,1080]],providerRequests:0,realBrainMessages:0,errors};
 }finally{await ctx.close();}
}
