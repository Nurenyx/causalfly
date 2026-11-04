// Judge path against the locally built app. Offline templates only; no real media or brain transport.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {PerspectiveCamera,Vector3} from 'three';
const {chromium}=await import(pathToFileURL(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const base=process.env.CAUSALFLY_BROWSER_REVIEW_BASE??'http://127.0.0.1:3464';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const dir=process.env.CAUSALFLY_BROWSER_REVIEW_DIR??'docs/review/sprint-17';fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1728,height:1080},reducedMotion:'reduce'});
const page=await context.newPage();const errors=[];const blocked=[];const actions=[];const frames=JSON.parse(fs.readFileSync('docs/review/sprint-6b/recorded-evidence.json','utf8'));
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(new URL(r.url()).pathname==='/api/experiments'&&r.method()==='POST')actions.push(r.postDataJSON().action);});
await context.route('**/*',r=>{const u=new URL(r.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname)||/\/api\/(media|perception)|\/fruitfly\/analyze/.test(u.pathname)){blocked.push(u.pathname);return r.abort();}return r.continue();});
await context.routeWebSocket('**',s=>{blocked.push('websocket');s.close();});
await context.addInitScript(()=>{window.EventSource=class{constructor(){window.judgeStream=this;}close(){}};window.WebSocket=class{constructor(){throw Error('Real brain messages forbidden in judge fixture');}};});
const capture=async name=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow: '+name);await page.screenshot({path:`${dir}/judge-${name}-1728.png`});};
const nav=label=>page.getByRole('navigation',{name:'Experiment workspaces'}).getByRole('button',{name:label,exact:true}).click();
const keyboardActivate=async locator=>{await locator.focus();const outline=await locator.evaluate(el=>({style:getComputedStyle(el).outlineStyle,width:parseFloat(getComputedStyle(el).outlineWidth)}));assert.notEqual(outline.style,'none');assert.ok(outline.width>0);await page.keyboard.press('Enter');};
const views=[];let topology;let passiveViewingActions;let stableFocusButton;
try {
  assert.equal((await(await page.request.get(base+'/api/health')).json()).metaMode,'offline');
  await page.goto(base,{waitUntil:'networkidle'});
  await keyboardActivate(page.getByRole('link',{name:'CausalFly home',exact:true}));
  await page.getByRole('heading',{name:/Ask a nervous system/}).waitFor();
  await capture('overview');
  assert.deepEqual(actions,[],'Overview/navigation never designs or runs an experiment');
  await keyboardActivate(page.getByRole('button',{name:/Run your first experiment/}));
  assert.match(await page.locator('.research-cockpit').textContent(),/What happens if I silence the primary pathway\?/);
  assert.match(await page.locator('.scientist-provider-note').textContent(),/OFFLINE.*Fixed template/);
  await page.locator('.fixture-topology').first().scrollIntoViewIfNeeded();
  const svg=page.locator('.fixture-topology svg').first();
  topology=await svg.evaluate(el=>{const r=el.getBoundingClientRect();return{width:r.width,height:r.height,labels:[...el.querySelectorAll('text')].map(n=>({text:n.textContent,visible:n.getBoundingClientRect().width>0}))};});
  assert.ok(topology.height>=270);assert.ok(topology.labels.every(l=>l.visible));
  assert.match(await page.locator('.embodied-signals .source-context').textContent(),/ENGINEERING NETWORK.*no male-cns connectome activity/s);
  await capture('topology-source-context');
  const design=page.locator('.scientist-action button').first();
  await design.scrollIntoViewIfNeeded();
  const buttonGeometry=()=>design.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y+scrollY,width:r.width,height:r.height};});
  const initial=await buttonGeometry();await design.hover();const hovered=await buttonGeometry();await design.focus();const focused=await buttonGeometry();
  stableFocusButton={initial,hovered,focused};assert.deepEqual(initial,hovered);assert.deepEqual(initial,focused);
  // Two same-turn input events exercise the existing synchronous in-flight guard.
  await design.evaluate(el=>{el.click();el.click();});
  await page.getByRole('button',{name:/APPROVE.*RUN/i}).first().waitFor();assert.deepEqual(actions,['design']);
  assert.equal(await page.locator('.completed-result-summary').count(),0,'No measured result before explicit approval');
  await capture('design-awaiting-approval');
  await keyboardActivate(page.getByRole('button',{name:/APPROVE.*RUN/i}).first());
  await page.getByText('Signal reduced 50%',{exact:true}).first().waitFor();assert.deepEqual(actions,['design','run']);
  await page.locator('.completed-result-summary').scrollIntoViewIfNeeded();await capture('measured-experiment');
  await page.locator('.compare-transition-btn').first().click();await page.locator('.compare-arena canvas[data-world-camera]').waitFor();
  for(const [label,focus] of [['Both side-by-side','both'],['01 Control only','control'],['02 Intervention only','perturbed']]) {
    await page.getByRole('button',{name:label,exact:true}).click();
    // Capture the validated snapshot in the same evaluation: a responsive resize
    // may publish a provisional camera between a separate wait and attribute read.
    const cameraHandle=await page.waitForFunction(f=>{const c=JSON.parse(document.querySelector('.compare-arena canvas').getAttribute('data-world-camera'));return c.focus===f&&c.framing==='visual-bounds'&&c.bounds?.min&&c.bounds?.max?c:false;},focus);
    const camera=await cameraHandle.jsonValue();await cameraHandle.dispose();
    const c=new PerspectiveCamera(camera.fov,camera.width/camera.height,.1,100);c.position.fromArray(camera.position);c.lookAt(new Vector3().fromArray(camera.target));c.updateMatrixWorld();
    const projected=[];for(const x of [camera.bounds.min[0],camera.bounds.max[0]])for(const y of [camera.bounds.min[1],camera.bounds.max[1]])for(const z of [camera.bounds.min[2],camera.bounds.max[2]]){const p=new Vector3(x,y,z).project(c);projected.push([p.x,p.y]);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,'Fly/arena/stimulus visual bounds contained');}
    const distance=new Vector3().fromArray(camera.position).distanceTo(new Vector3().fromArray(camera.target));
    views.push({focus,camera,distance,projected});await page.locator('.compare-condition-readouts').evaluate(el=>el.scrollIntoView({block:'start'}));await capture('compare-'+focus);
  }
  assert.ok(views[1].distance<views[0].distance&&views[2].distance<views[0].distance,'Single subject receives a closer fit');
  assert.deepEqual(actions,['design','run'],'Compare never calls Meta passively');
  await page.locator('.compare-hero-result .explain-meta-btn').first().click();
  await page.getByText('Interpretation complete. Next hypothesis ready.',{exact:true}).waitFor();assert.deepEqual(actions,['design','run','interpret']);
  await nav('Evidence');await page.locator('.evidence-view').waitFor();await page.evaluate(()=>scrollTo(0,0));await capture('evidence');
  assert.match(await page.locator('main').textContent(),/measurement|measured/i);assert.match(await page.locator('main').textContent(),/OFFLINE|FAKE|template/i);
  await nav('Live Connectome');await page.getByRole('button',{name:'Reconnect backend',exact:true}).click();
  await page.evaluate(()=>window.judgeStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'CONNECTED',message:'Authored offline transport',evidence:null})}));
  await page.getByRole('heading',{name:'Waiting for first frame',exact:true}).waitFor();
  for(const original of frames)await page.evaluate(original=>{const evidence={...original,receivedAt:new Date(Date.now()-100).toISOString()};window.judgeStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'DATA RECEIVED',message:'AUTHORED TRANSPORT · RECORDED SIMULATION VALUES · NOT LIVE ACCEPTANCE',evidence})});},original);
  await page.locator('.telemetry-primary[data-retained=false]').waitFor();
  await page.locator('.telemetry-primary').scrollIntoViewIfNeeded();await capture('live-connectome');
  if(await page.getByRole('button',{name:'Open experimental embodiment',exact:true}).count()) await page.getByRole('button',{name:'Open experimental embodiment',exact:true}).click();
  await page.getByRole('region',{name:'Experimental embodiment context',exact:true}).waitFor();
  await page.locator('.autonomy-world canvas').waitFor();await page.locator('.procedural-boundary').scrollIntoViewIfNeeded();
  assert.match(await page.locator('.procedural-boundary').textContent(),/Decoder selects supported states; CausalFly executes movement/);
  await capture('experimental-embodiment');
  // This production build has no control endpoint. Never enable a real control adapter here.
  assert.equal(await page.locator('.sensory-feedback [type=checkbox]').isChecked(),false);
  passiveViewingActions=[...actions];assert.deepEqual(passiveViewingActions,['design','run','interpret']);
  await page.evaluate(()=>window.judgeStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'DISCONNECTED',message:'Fixture disconnected; received evidence retained',evidence:null})}));
  await page.locator('.telemetry-primary[data-retained=true]').waitFor();await capture('retained');
  assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
  fs.writeFileSync(`${dir}/judge-journey.json`,JSON.stringify({fixtureOnly:true,viewport:[1728,1080],question:'What happens if I silence the primary pathway?',result:'Signal reduced 50%',actions,passiveViewingActions,explicitApproval:true,doubleSubmitGuard:true,keyboardActivation:true,stableFocusButton,topology,views,errors,blocked,providerRequests:0,mediaUploads:0,realBrainMessages:0,feedback:'OFF in app; authored ARMED/ACCEPTED/REJECTED covered by live-layout and existing real-adapter fixture'},null,2));
  console.log(JSON.stringify({judgeJourney:'PASS',actions,views:views.map(v=>({focus:v.focus,distance:v.distance})),errors,blocked}));
} finally {await context.close();await browser.close();}
