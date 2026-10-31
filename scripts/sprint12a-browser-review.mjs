// Sprint 12A correction acceptance. Real browser clocks; offline SSE fixtures only.
import assert from 'node:assert/strict';
import { compactAcceptanceTrace } from './sprint12a-review-summary.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
const {chromium}=await import(pathToFileURL(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const dir='docs/review/sprint-12a-corrections';fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],blocked=[],checks=[];let downloads=0;
async function setup(){
 const context=await browser.newContext({viewport:{width:1600,height:1100},acceptDownloads:true});
 await context.addInitScript(()=>{
  window.__streams=[];
  window.EventSource=class {constructor(url){this.url=url;window.__streams.push(this);window.__offlineStream=this;}close(){this.closed=true;}};
  const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type==='application/json')blob.text().then(text=>{window.__autonomyExport=text;});return create(blob);};
 });
 await context.routeWebSocket('**/brain/v1',ws=>{blocked.push('brain socket');ws.close();});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(url.hostname)||(url.pathname.startsWith('/api/')&&url.pathname!=='/api/health')){blocked.push(url.pathname);return route.abort();}return route.continue();});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('download',()=>downloads++);
 return {context,page};
}
const {context,page}=await setup();
const nav=name=>page.getByRole('navigation',{name:'Experiment workspaces'}).getByRole('button',{name,exact:true}).click();
const panel=()=>page.getByRole('region',{name:'Autonomous experimental behaviour',exact:true});
const step=name=>page.getByRole('button',{name:new RegExp(`^Stage 0[123]: ${name}`)});
async function recording(){await page.evaluate(()=>{window.__autonomyExport=null;});await panel().getByRole('button',{name:'Export autonomy evidence'}).click();await page.waitForFunction(()=>typeof window.__autonomyExport==='string');return JSON.parse(await page.evaluate(()=>window.__autonomyExport));}
async function send(snapshot){await page.evaluate(snapshot=>{if(snapshot.evidence)snapshot.evidence.receivedAt=new Date().toISOString();window.__offlineStream.onmessage(new MessageEvent('message',{data:JSON.stringify(snapshot)}));},snapshot);}
async function screenshot(name){await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);await page.waitForTimeout(100);await panel().screenshot({style:".skip-link { visibility: hidden !important; }",path:`${dir}/${name}.png`});}
async function responsive(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No document horizontal overflow');assert.equal(await panel().evaluate(el=>el.scrollWidth<=el.clientWidth),true,'No autonomy horizontal scroll trap');}
try{
 await page.goto('http://127.0.0.1:3145');await page.waitForTimeout(1000);await nav('Live Connectome');
 await page.waitForFunction(()=>window.__streams.length===1);
 assert.equal(await step('OBSERVE').isDisabled(),true);assert.equal(await step('UNDERSTAND').isDisabled(),true);
 assert.equal(await page.getByRole('button',{name:'Open experimental embodiment'}).count(),0);
 checks.push('Live opens one configured read-only auto-connection; Observe/Understand locked before question');
 await send({source:'FRUITFLY_XR',state:'CONNECTED',message:'OFFLINE connection fixture; no live source',evidence:null});
 const fixture=JSON.parse(fs.readFileSync('docs/review/sprint-12a/mock-observatory.json','utf8')).snapshot;
 fixture.message='OFFLINE MOCK decoder; not a live neural trial';fixture.evidence.telemetry.inputFresh=true;
 await send(fixture);await page.waitForTimeout(100);
 await page.getByRole('button',{name:'Set Investigation Question',exact:true}).click();
 assert.equal(await step('OBSERVE').isDisabled(),false);assert.equal(await step('UNDERSTAND').isDisabled(),true);
 checks.push('Question retention unlocks Observe; earlier historical telemetry cannot unlock Understand');
 await page.getByRole('button',{name:'ID raster',exact:true}).click();
 await page.getByRole('button',{name:'Open experimental embodiment',exact:true}).click();await panel().waitFor();
 await page.locator('canvas[data-fly-model="ready"]').waitFor({timeout:30000});
 const fresh=structuredClone(fixture);fresh.evidence.telemetry.sequence++;fresh.evidence.telemetry.neuralTick++;fresh.evidence.telemetry.simulationMs+=50;fresh.evidence.telemetry.inputSequence++;
 await page.waitForTimeout(100);await send(fresh);
 await page.waitForFunction(()=>document.querySelector('.autonomy-panel').dataset.source==='FRUITFLY_DECODER'&&Number(document.querySelector('.autonomy-panel').dataset.altitude)>.2);
 await panel().getByRole('button',{name:'Pause autonomy',exact:true}).click();await page.waitForTimeout(120);
 const neural=await recording();const selected=neural.conditions[0].trajectory.find(f=>f.decision.source==='FRUITFLY_DECODER');
 assert.equal(selected.motor.execution,'CAUSALFLY_PROCEDURAL_CONTROLLER');assert.equal(selected.decision.trigger.reference.transport,'observatory/v1');
 assert.equal(await step('UNDERSTAND').isDisabled(),false);
 await panel().evaluate(el=>{const p=document.createElement('p');p.textContent='OFFLINE MOCK · source-attributed decision, engineered motor execution';p.style.cssText='padding:10px;color:#ffd27a;font-weight:bold';el.prepend(p);});
 await screenshot('04-mock-connectome-aerial-escape');checks.push('Relevant evidence unlocks Understand; mock decoder ESCAPE has aerial phenotype and procedural execution provenance');
 await page.getByRole('button',{name:'Change question',exact:true}).click();await page.getByLabel('What do you want to understand from this simulation?').fill('A new investigation must not reuse the prior ESCAPE evidence.');await page.getByRole('button',{name:'Set Investigation Question',exact:true}).click();assert.equal(await step('UNDERSTAND').isDisabled(),true);
 checks.push('New retained question re-locks Understand despite retained prior evidence');
 await nav('Experiment');await panel().waitFor();await page.locator('canvas[data-fly-model="ready"]').waitFor();
 assert.match(await panel().innerText(),/Baseline locomotion is engineered/);
 // Real wall-clock acceptance, deliberately not a fast-forwarded engine or browser clock.
 await page.waitForFunction(()=>Number(document.querySelector('.autonomy-panel').dataset.tick)>1240,{}, {timeout:105000});
 const exploration=await recording();assert.equal(exploration.conditions[0].config.mode,'exploration');assert.ok(exploration.conditions[0].ticks>1200);assert.ok(exploration.conditions[0].inputs.length<=1200);assert.ok(exploration.conditions[0].checkpoint.tick>=1200);
 await screenshot('01-continuous-exploration-after-60s');checks.push('Real browser exploration continues beyond 60 seconds with bounded checkpointed retention');
 await page.getByRole('button',{name:'Lightweight',exact:true}).click();await page.locator('canvas[data-fly-model="lightweight"]').waitFor();
 await panel().getByRole('button',{name:'Recorded output replay',exact:true}).click();await page.waitForTimeout(150);
 assert.equal(await panel().getAttribute('data-mode'),'replay');const frozen=await recording();assert.ok(new Set(frozen.conditions[0].trajectory.map(frame=>`${frame.after.x.toFixed(4)},${frame.after.z.toFixed(4)}`)).size>5,'Replay contains changing retained positions');const first=Number(await panel().getAttribute('data-tick'));assert.equal(first,frozen.conditions[0].trajectory[0].tick);
 await panel().getByRole('button',{name:'Play replay',exact:true}).click();await page.waitForTimeout(700);await panel().getByRole('button',{name:'Pause replay',exact:true}).click();await page.waitForTimeout(150);
 const replayTick=Number(await panel().getAttribute('data-tick'));assert.ok(replayTick>first);
 const pose=frozen.conditions[0].trajectory.find(frame=>frame.tick===replayTick);assert.ok(pose);assert.notDeepEqual(pose.after,frozen.conditions[0].trajectory[0].after);assert.equal(await panel().getAttribute('data-behaviour'),pose.decision.state);
 assert.deepEqual(await recording(),frozen);await screenshot('03-retained-motion-replay');
 await panel().getByRole('button',{name:'Restart replay',exact:true}).click();await page.waitForTimeout(150);assert.equal(Number(await panel().getAttribute('data-tick')),first);
 checks.push('Replay visibly advances exact retained trajectory, pauses/restarts, and leaves engine/evidence unchanged; Lightweight works');
 await panel().getByRole('button',{name:'Return to live autonomy',exact:true}).click();
 await page.getByRole('button',{name:'Anatomical',exact:true}).click();
 await panel().getByRole('button',{name:'Compare synthetic intervention',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.autonomy-panel').dataset.behaviour==='ESCAPE'&&Number(document.querySelector('.autonomy-panel').dataset.altitude)>.2,{}, {timeout:15000});
 await panel().getByRole('button',{name:'Pause autonomy',exact:true}).click();await page.waitForTimeout(120);
 const matched=await recording();assert.ok(matched.conditions[0].trajectory.some(f=>f.decision.state==='ESCAPE'&&(f.after.altitude??0)>.2));assert.ok(matched.conditions[1].trajectory.every(f=>f.decision.state!=='ESCAPE'&&(f.after.altitude??0)===0));
 await screenshot('02-synthetic-aerial-escape-comparison');await panel().getByRole('button',{name:'Resume autonomy',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.autonomy-panel').innerText.includes('Trial complete'),{}, {timeout:105000});
 assert.equal(await panel().getAttribute('data-tick'),'1200');await page.waitForTimeout(300);assert.equal(await panel().getAttribute('data-tick'),'1200');assert.match(await panel().innerText(),/60.0 \/ 60.0 s/);
 const completed=await recording();checks.push('Bounded 60-second controlled trial ends visibly as Trial complete, with Replay/Evidence/Compare actions');
 await page.setViewportSize({width:390,height:844});await panel().getByText('Autonomy evidence details',{exact:true}).click();await responsive();await screenshot('05-mobile-trial-complete-details');
 await page.setViewportSize({width:1600,height:1100});await responsive();
 await panel().getByRole('button',{name:'Replay trial',exact:true}).click();await page.waitForTimeout(150);assert.equal(await panel().getAttribute('data-mode'),'replay');assert.equal(await panel().getAttribute('data-tick'),'1');
 checks.push('Completed trial replay starts at recorded beginning; desktop/mobile details wrap without horizontal scrolling');
 const other=await setup();await other.page.goto('http://127.0.0.1:3146');await other.page.waitForTimeout(1000);await other.page.getByRole('navigation',{name:'Experiment workspaces'}).getByRole('button',{name:'Live Connectome',exact:true}).click();
 await other.page.getByRole('alert').filter({hasText:'No research/brain-server endpoint is configured.'}).waitFor();assert.equal(await other.page.evaluate(()=>window.__streams.length),0);assert.equal(await other.page.getByRole('button',{name:/^Stage 03: UNDERSTAND/}).isDisabled(),true);await other.context.close();
 checks.push('Unconfigured source shows explicit connection error, opens no stream and fabricates no telemetry');
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);assert.ok(downloads>0);
 fs.writeFileSync(`${dir}/acceptance-trace.json`,JSON.stringify(compactAcceptanceTrace({disclosure:'Real browser timing; all neural telemetry is explicitly offline mock. No live provider/SAM/brain transport.',checks,errors,blocked,downloads,exploration,matched,completed,neural}),null,2));
 console.log(JSON.stringify({checks,errors,blocked,downloads,screenshots:5}));
}catch(error){console.log(JSON.stringify({errors,blocked,body:(await page.locator('body').innerText()).slice(0,6000)}));throw error;}finally{await context.close();await browser.close();}
