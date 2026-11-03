import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const base=process.env.CAUSALFLY_BROWSER_REVIEW_BASE??'http://127.0.0.1:3465';assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const before=process.argv.includes('--before');const dir=process.env.CAUSALFLY_BROWSER_REVIEW_DIR??'docs/review/sprint-17-1';fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1728,height:1080},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];const blocked=[];const actions=[];let measured;
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname==='/api/experiments'&&r.method()==='POST')actions.push(r.postDataJSON().action);});
page.on('response',async r=>{if(new URL(r.url()).pathname==='/api/experiments'&&r.request().postDataJSON()?.action==='run')measured=(await r.json()).result;});
await context.route('**/*',r=>{const u=new URL(r.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname)||/\/api\/(media|perception)|\/fruitfly\/analyze/.test(u.pathname)){blocked.push(u.pathname);return r.abort();}return r.continue();});await context.routeWebSocket('**',s=>s.close());await context.addInitScript(()=>{window.EventSource=class{close(){}};window.WebSocket=class{constructor(){throw Error('Brain control forbidden in fixture review');}};});
const region=()=>page.locator('.embodied-signals').first();
const geometry=()=>region().evaluate(el=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y+scrollY,width:r.width,height:r.height};};return{outer:rect(el),network:rect(el.querySelector('.synthetic-network')),trace:rect(el.querySelector('.activity-chart')),figure:rect(el.querySelector('.network-figure')),toolbar:rect(el.querySelector('.embodied-condition-switch')),response:el.querySelector('.neural-response-measured')?rect(el.querySelector('.neural-response-measured')):null,scrollY,documentHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth};});
const snapshots=[];
try{
 assert.equal((await(await page.request.get(base+'/api/health')).json()).metaMode,'offline');await page.goto(base,{waitUntil:'networkidle'});await page.locator('.scientist-action button').first().click();await page.getByRole('button',{name:/APPROVE.*RUN/i}).first().waitFor();await page.locator('.scientist-action button').first().click();await page.locator('.completed-result-summary').waitFor();await page.getByRole('button',{name:'Recorded signal view',exact:true}).click();
 for(const width of [1728,1366,760]){
  await page.setViewportSize({width,height:1080});await page.waitForTimeout(200);await region().evaluate(el=>el.scrollIntoView({block:'start'}));
  for(const condition of ['Control','Intervention']){
   await region().getByRole('button',{name:condition,exact:true}).click();await page.waitForTimeout(80);
   const selector=page.getByRole('slider',{name:'Simulation step',exact:true});const max=Number(await selector.getAttribute('max'));await selector.focus();await selector.press('Home');await page.waitForTimeout(40);const first=await geometry();
   for(let index=0;index<=max;index++){
    if(index>0)await selector.press('ArrowRight');await page.waitForTimeout(40);const boxes=await geometry();
    const state=await region().evaluate(el=>({condition:document.querySelector('.organism-first-workspace[data-view=recorded]').getAttribute('data-condition'),nodes:[...el.querySelectorAll('[data-node]')].map(n=>({id:n.getAttribute('data-node'),value:n.getAttribute('data-activity')})),edges:[...el.querySelectorAll('[data-edge]')].map(e=>({id:e.getAttribute('data-edge'),drive:e.getAttribute('data-drive')})),facts:[...el.querySelectorAll('[data-measure]')].map(n=>({name:n.getAttribute('data-measure'),value:n.getAttribute('data-value'),text:n.textContent})),trace:el.querySelector('.activity-chart').outerHTML}));
    if(!before){for(const key of ['outer','network','trace','figure','toolbar','response'])for(const d of ['x','y','width','height'])assert.ok(Math.abs(boxes[key][d]-first[key][d])<=1,`${width} ${condition} step ${index}: ${key} ${d}`);assert.equal(boxes.overflow,false);assert.ok(Math.abs(boxes.scrollY-first.scrollY)<=1);assert.equal(boxes.documentHeight,first.documentHeight);
     const trial=measured.measuredEvidence[condition==='Control'?'control':'perturbed'];const step=Number(await selector.getAttribute('aria-valuetext').then(t=>t.match(/\d+/)[0]));const sample=trial.activity.find(s=>s.step===step);
     for(const node of state.nodes)assert.equal(node.value,sample?String(sample.nodes[node.id]):null,'Node value is retained evidence');
     if(condition==='Intervention')for(const edge of state.edges.filter(e=>e.id.includes(measured.spec.perturbation.targetNodeId)))assert.equal(Number(edge.drive),0,'No invented activity across silenced edges');
     assert.equal(Number(state.facts.find(f=>f.name==='peak').value),trial.outputPeakActivity);assert.equal(state.facts.find(f=>f.name==='response-step').value,trial.outputThresholdCrossingStep===null?'':String(trial.outputThresholdCrossingStep));assert.equal(state.facts.find(f=>f.name==='outcome').value,trial.outcome);
    }
    snapshots.push({width,condition,index,boxes,state});
   }
   await region().screenshot({path:`${dir}/neural-${before?'before':'after'}-${condition.toLowerCase()}-${width}.png`});
   await region().evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${dir}/neural-${before?'before':'after'}-${condition.toLowerCase()}-${width}-viewport.png`});
  }
  if(!before){const a=snapshots.find(s=>s.width===width&&s.condition==='Control');const b=snapshots.find(s=>s.width===width&&s.condition==='Intervention');for(const key of ['outer','network','trace','figure','toolbar','response'])for(const d of ['x','y','width','height'])assert.ok(Math.abs(a.boxes[key][d]-b.boxes[key][d])<=1,`${width}: condition change moves ${key} ${d}`);}
 }
 if(!before){await page.setViewportSize({width:1728,height:1080});const baselineDir=process.env.CAUSALFLY_NEURAL_BASELINE_DIR??'docs/review/sprint-17-1';const previous=JSON.parse(fs.readFileSync(`${baselineDir}/neural-before.json`));const a=previous.snapshots.find(s=>s.width===1728);const b=snapshots.find(s=>s.width===1728);assert.ok(b.boxes.network.height>=a.boxes.network.height*1.35,'Network usable height grows at least 35%');assert.ok(b.boxes.trace.height>=a.boxes.trace.height*2,'Trace height at least doubles');
  // Same recorded samples/axes/colours, with the existing full-size chart presentation.
  for(const s of snapshots){assert.ok(s.state.trace.includes('Normalized activity'));assert.ok(s.state.trace.includes('Simulation step'));assert.ok(s.state.trace.includes('gaps are not interpolated'));const old=previous.snapshots.find(p=>p.width===s.width&&p.condition===s.condition&&p.index===s.index);assert.deepEqual([...s.state.trace.matchAll(/<title>(.*?)<\/title>/g)].map(m=>m[1]),[...old.state.trace.matchAll(/<title>(.*?)<\/title>/g)].map(m=>m[1]),'Exact retained trace samples are unchanged');}
 }
 assert.deepEqual(actions,['design','run']);assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
 fs.writeFileSync(`${dir}/neural-${before?'before':'after'}.json`,JSON.stringify({before,fixtureOnly:true,snapshots,actions,errors,blocked,providerRequests:0,realBrainMessages:0},null,2));console.log(JSON.stringify({before,playbackStates:snapshots.length,geometry:snapshots.filter(s=>s.index===0).map(s=>({width:s.width,condition:s.condition,boxes:s.boxes})),actions,errors,blocked},null,2));
}finally{await context.close();await browser.close();}
