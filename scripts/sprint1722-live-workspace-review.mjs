// Real installed browsers; authored in-memory telemetry, no provider or brain transport.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findRealFirefoxExecutable,launchRealFirefoxBiDi,launchEdgeAdapter} from './installed-browser-review-drivers.mjs';
const base=process.env.CAUSALFLY_BROWSER_REVIEW_BASE??'http://127.0.0.1:3482';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const before=process.argv.includes('--before');
const root=process.env.CAUSALFLY_BROWSER_REVIEW_DIR??'docs/review/sprint-17-2-2';
const dir=`${root}/${before?'before':'after'}`;fs.mkdirSync(dir,{recursive:true});
const original=JSON.parse(fs.readFileSync('docs/review/sprint-6b/recorded-evidence.json','utf8'))[0];
const preload=`() => {window.__workspaceStream=null;window.EventSource=class{constructor(){window.__workspaceStream=this;}close(){}};window.WebSocket=class{constructor(){throw Error('Real brain transport forbidden in workspace acceptance');}};}`;
const metrics=`(() => {
 const selectors={shell:'.app-shell',sidebar:'.sidebar',workspace:'.workspace',main:'main#main',gate:'.live-launcher',session:'[class*="live-session_session__"]',layout:'[class*="live-session_layout__"]',instruments:'[class*="live-session_instruments__"]',hero:'[class*="live-session_heroGrid__"]',observatory:'[class*="live-session_connectome__"]',viewer:'[class*="live-session_viewerSlot__"]',embodiment:'[class*="embodimentHero"]',fly:'.autonomy-world',observations:'aside[aria-label="Received observations"]',timeline:'ol[data-timeline-track]'};
 const boxes=Object.fromEntries(Object.entries(selectors).map(([key,selector])=>{const el=document.querySelector(selector);if(!el)return[key,null];const r=el.getBoundingClientRect(),s=getComputedStyle(el);return[key,{x:r.x,y:r.y+scrollY,width:r.width,height:r.height,right:r.right,maxWidth:s.maxWidth,cssWidth:s.width,columns:s.gridTemplateColumns,display:s.display,marginLeft:s.marginLeft}];}));
 return {viewport:{width:innerWidth,height:innerHeight},boxes,scrollY,documentHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,heading:document.querySelector('.live-launcher h2')?.textContent,gateText:document.querySelector('.live-launcher')?.innerText,laneIds:[...document.querySelectorAll('ol[data-timeline-track] > li')].map(el=>el.dataset.lane),categories:[...document.querySelectorAll('[data-timeline-category]')].map(el=>el.textContent)};
})()`;
const report={before,fixtureOnly:true,providerRequests:0,realBrainMessages:0,browsers:[]};
async function captureState(driver,file){
 await driver.evalJson(`(() => {document.querySelector('.live-launcher').scrollIntoView({block:'start'});return true;})()`);
 await driver.screenshot(file);
 await driver.evalJson(`(() => {scrollTo(0,0);return true;})()`);
}
for(const [name,launch] of [...(before?[]:[['firefox',()=>launchRealFirefoxBiDi(findRealFirefoxExecutable(),base)]]),['edge',()=>launchEdgeAdapter(base)]]){
 const driver=await launch();const cases=[];
 try{
  await driver.addInitScript(preload);
  for(const [width,height] of [[1728,1080],[1440,900],[1366,768],[1024,768],[760,1080]]){
   console.log(`${driver.browserName}: workspace ${width}x${height}`);
   await driver.setViewportSize({width,height});await driver.goto(base);
   assert.equal((await driver.evalJson(`fetch('/api/health').then(r=>r.json())`)).metaMode,'offline');
   await driver.evalJson('document.fonts.ready.then(()=>true)');
   await driver.waitFor(`(() => {if(document.querySelector('ol[data-timeline-track]'))return true;[...document.querySelectorAll('aside.sidebar button')].find(b=>/Live Connectome/i.test(b.textContent))?.click();return false;})()`);
   await driver.evalJson('new Promise(r=>setTimeout(()=>r(true),700))');
   const disconnected=await driver.evalJson(metrics);await captureState(driver,`${dir}/${name}-${width}-disconnected.png`);
   await driver.evalJson(`(() => {if(!window.__workspaceStream)[...document.querySelectorAll('.source-connection button,.live-launcher button')].find(b=>/Reconnect simulation|Reconnect backend/i.test(b.textContent))?.click();window.__workspaceStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'CONNECTED',message:'Authored read-only connection; waiting for host frames',evidence:null})});return true;})()`);
   await driver.evalJson('new Promise(r=>setTimeout(()=>r(true),220))');
   const waiting=await driver.evalJson(metrics);await captureState(driver,`${dir}/${name}-${width}-waiting.png`);
   await driver.evalJson(`(() => {
    const original=${JSON.stringify(original)};
    window.__workspaceEmit=sequence=>{const f=structuredClone(original);f.receivedAt=new Date(Date.now()-5).toISOString();Object.assign(f.telemetry,{sessionId:'workspace-${name}-${width}',sequence,neuralTick:1000+sequence,simulationMs:sequence*50,inputSequence:Math.floor(sequence/5),motorMode:sequence%20<10?'WALK':'ESCAPE',inputFresh:true,totalSpikeEvents:620+sequence,activeNeuronCount:7239+sequence});window.__workspaceStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'DATA RECEIVED',message:'Authored offline layout fixture',evidence:f,retentionId:'workspace-fixture'})});};
    window.__workspaceEmit(1);return true;
   })()`);
   await driver.waitFor(`Boolean(document.querySelector('.telemetry-primary'))`);
   await driver.evalJson('new Promise(r=>setTimeout(()=>r(true),700))');
   const natural=await driver.evalJson(metrics);
   if(!natural.boxes.embodiment){await driver.evalJson(`(() => {[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Open experimental embodiment')?.click();return true;})()`);}
   await driver.waitFor(`Boolean(document.querySelector('.autonomy-world canvas'))`);
   await driver.waitFor(`document.querySelector('.autonomy-world')?.dataset.modelStatus==='ready'`);
   await driver.evalJson('new Promise(r=>setTimeout(()=>r(true),300))');
   const expanded=await driver.evalJson(metrics);
   if(!before) await captureState(driver,`${dir}/${name}-${width}-receiving.png`);
   await driver.evalJson(`(() => {document.querySelector('[class*="heroGrid"]').scrollIntoView({block:'start'});return true;})()`);
   await driver.screenshot(`${dir}/${name}-${width}-instruments.png`);
   await driver.evalJson(`(() => {
    scrollTo(0,0);window.__workspaceSamples=[];window.__workspaceIdentities=[...document.querySelectorAll('ol[data-timeline-track] > li')];window.__workspaceReplacements=[];
    const measure=()=>{const nodes=[...document.querySelectorAll('ol[data-timeline-track] > li')];if(nodes.some((n,i)=>n!==window.__workspaceIdentities[i]))window.__workspaceReplacements.push('lane');window.__workspaceSamples.push(${metrics});window.__workspaceRaf=requestAnimationFrame(measure);};measure();return true;
   })()`);
   await driver.evalJson(`(async()=>{for(let sequence=2;sequence<=135;sequence++){window.__workspaceEmit(sequence);await new Promise(r=>setTimeout(r,12));}await new Promise(r=>setTimeout(r,240));cancelAnimationFrame(window.__workspaceRaf);return true;})()`);
   const rapid=await driver.evalJson(`({samples:window.__workspaceSamples,replacements:window.__workspaceReplacements,buffer:[...document.querySelectorAll('span')].find(el=>/^DISPLAY BUFFER/.test(el.textContent))?.textContent})`);
   const dims=['x','y','width','height'];let maximumDelta=0;
   for(const sample of rapid.samples)for(const key of ['gate','session','layout','instruments','hero','observatory','viewer','embodiment','fly','observations','timeline']){const a=rapid.samples[0].boxes[key],b=sample.boxes[key];if(a&&b)for(const dim of dims)maximumDelta=Math.max(maximumDelta,Math.abs(a[dim]-b[dim]));}
   const valuesBefore=await driver.evalJson(`document.querySelector('.telemetry-primary dl').textContent`);
   await driver.evalJson(`(() => {[...document.querySelectorAll('.source-connection button')].find(b=>b.textContent.trim()==='Disconnect').click();return true;})()`);
   await driver.evalJson('new Promise(r=>setTimeout(()=>r(true),240))');
   const retained=await driver.evalJson(metrics);const valuesAfter=await driver.evalJson(`document.querySelector('.telemetry-primary dl').textContent`);
   await captureState(driver,`${dir}/${name}-${width}-retained.png`);
   const result={width,height,disconnected,waiting,natural,expanded,retained,steady:{maximumDelta,replacements:rapid.replacements,documentHeightRange:Math.max(...rapid.samples.map(s=>s.documentHeight))-Math.min(...rapid.samples.map(s=>s.documentHeight)),scrollRange:Math.max(...rapid.samples.map(s=>s.scrollY))-Math.min(...rapid.samples.map(s=>s.scrollY)),samples:rapid.samples.length},valuesRetained:valuesBefore===valuesAfter,buffer:rapid.buffer};cases.push(result);
   fs.writeFileSync(`${dir}/${name}-progress.json`,JSON.stringify(cases,null,2));
   for(const state of [disconnected,waiting,natural,expanded,retained]){assert.equal(state.overflow,false,`${name} ${width}: horizontal overflow`);assert.deepEqual(state.laneIds,['frame','neural','input','decoder','stream']);assert.deepEqual(state.categories,['FRAME','NEURAL','INPUT','DECODER','STREAM']);}
   assert.ok(maximumDelta<=1,`${name} ${width}: steady movement ${maximumDelta}px`);assert.deepEqual(rapid.replacements,[]);assert.equal(result.valuesRetained,true);assert.match(rapid.buffer,/120 \/ 120/);
   assert.ok(result.steady.documentHeightRange<=1,'No steady document-height movement');assert.ok(result.steady.scrollRange<=1,'No steady scroll movement');assert.equal(rapid.samples.some(s=>s.overflow),false);
   if(!before){
    assert.match(waiting.gateText,/WAITING FOR SIMULATION/);assert.match(waiting.gateText,/read.only/i);assert.match(waiting.gateText,/unavailable on this host/i);
    assert.doesNotMatch(waiting.gateText,/Backend ready|START LIVE TRIAL/);
    if(width>=1440) assert.ok(waiting.boxes.embodiment,'The procedural fly stays visible while waiting for host telemetry');
    if(width>=1440){assert.ok(natural.boxes.embodiment,'Read-only telemetry shows embodiment without requiring a control endpoint');assert.ok(expanded.boxes.main.right>=width-1,'Main uses viewport width');const available=width-expanded.boxes.sidebar.width;assert.ok(expanded.boxes.main.width>=available*.98);const usable=expanded.boxes.observatory.width+expanded.boxes.embodiment.width+expanded.boxes.observations.width;assert.ok(expanded.boxes.observatory.width/usable>=.45);assert.ok(expanded.boxes.embodiment.width/usable>=.25);assert.ok(expanded.boxes.observations.width/usable>=.17);assert.ok(expanded.boxes.fly.y+expanded.boxes.fly.height<=expanded.boxes.embodiment.y+expanded.boxes.embodiment.height+1,'Complete fly surface is visible before secondary controls');}
   }
  }
  assert.deepEqual(driver.errors,[]);assert.deepEqual(driver.blocked,[]);report.browsers.push({name,version:driver.browserName,cases,errors:driver.errors,blocked:driver.blocked});
 }catch(error){fs.writeFileSync(`${dir}/${name}-failure.json`,JSON.stringify({error:error.stack,errors:driver.errors,blocked:driver.blocked},null,2));throw error;}finally{await driver.close();}
}
fs.writeFileSync(`${dir}/results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({before,browsers:report.browsers.map(b=>({name:b.version,cases:b.cases.map(c=>({width:c.width,observatory:c.expanded.boxes.observatory.width,embodiment:c.expanded.boxes.embodiment.width,rail:c.expanded.boxes.observations?.width,steady:c.steady,valuesRetained:c.valuesRetained})),errors:b.errors}))},null,2));
