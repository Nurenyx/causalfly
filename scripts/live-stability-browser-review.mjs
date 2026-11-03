import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';

export async function reviewLiveStability(browser,base,dir) {
  const recorded=JSON.parse(fs.readFileSync('docs/review/sprint-6b/recorded-evidence.json','utf8'))[0];
  const bundled=await build({stdin:{contents:`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {LiveSessionWorkspace,StreamHealth} from './src/app/components/live-session';
import {AutonomyPanel} from './src/app/components/autonomy-panel';
import {ExperimentalBrainAdapter} from './src/lib/sources/fruitfly-closed-loop';
const originalPublish=ExperimentalBrainAdapter.prototype.publish;window.fixtureFreezePublish=(freeze)=>{ExperimentalBrainAdapter.prototype.publish=freeze?function(){}:originalPublish;};
const original=${JSON.stringify(recorded)};
let sockets=[];
window.WebSocket=class { bufferedAmount=0; listeners={}; sent=[]; constructor(){sockets.push(this);}addEventListener(name,fn){this.listeners[name]=fn;}send(json){this.sent.push(JSON.parse(json));}close(){} message(value){this.listeners.message?.({data:JSON.stringify(value)});} };
window.fixtureBrain=(kind)=>{const s=sockets.at(-1);if(!s)throw Error('Fixture socket missing');if(kind==='hello'){s.message({version:1,type:'hello',sessionId:'00000000-0000-4000-8000-000000000001',dataset:'male-cns:v1.0',sha256:original.provenance.connectomeSha256,neurons:176422,edges:6287749,dtMs:.5,tickMs:50,gain:.65,seed:20260903});return;}
if(kind==='unavailable'){s.listeners.error?.();return;}
if(kind==='reject'){s.message({malformed:true});return;}
const input=s.sent.at(-1);if(!input)throw Error('No authored stimulus sent');
s.message({version:1,type:'telemetry',sessionId:input.sessionId,sequence:1,inputSequence:input.sequence,capturedMs:input.capturedMs,simulationMs:50,inputFresh:true,inputAgeMs:10,computeMs:25,realTimeFactor:2,lagMs:0,takeoff:0,activeNeurons:2,spikes:1,totalSpikes:1,status:'OK',motorMode:'IDLE',jump:false,escape:false,sensoryProvenance:'PROXY',decisionProvenance:'CONNECTOME',embodimentProvenance:'SCRIPTED',landingProvenance:'SCRIPTED',populations:[],channels:[]});};
window.fixtureCounts=()=>sockets.reduce((n,s)=>n+s.sent.length,0);
function Fixture(){const [config,setConfig]=useState({count:1,mode:'IDLE',retained:false,age:null});window.fixtureUpdate=setConfig;
const f=structuredClone(original);f.receivedAt='2026-11-02T18:00:00.000Z';Object.assign(f.telemetry,{neuralTick:config.count,sequence:config.count,totalSpikeEvents:config.count,activeNeuronCount:config.count,displaySpikeEvents:config.count,motorMode:config.mode,inputFresh:config.count%2===0,inputSequence:config.count,droppedDisplayFrames:config.count,droppedSubscriberMessages:config.count});
const prior=structuredClone(f);Object.assign(prior.telemetry,{neuralTick:Math.max(0,config.count-1),sequence:Math.max(0,config.count-1),inputSequence:config.count-1,motorMode:'IDLE'});const history=config.count===1?[f]:[prior,f];
const snapshot={source:'FRUITFLY_XR',state:'DATA RECEIVED',message:'Authored fixture only',evidence:f};
return <main style={{padding:'12px',maxWidth:'none'}}><p style={{fontSize:12,color:'#e8c97a'}}>AUTHORED PRESENTATION FIXTURE · NO NETWORK BRAIN CONTROL · NOT LIVE ACCEPTANCE</p><div id="fixture-hero"><AutonomyPanel model="lightweight" snapshot={snapshot}/></div><LiveSessionWorkspace embodimentChoice={false} snapshot={snapshot} frames={history} now={Date.parse(f.receivedAt)+(config.retained?6000:0)} onEvidence={()=>{}} onConnect={()=>{}} onDisconnect={()=>{}}/><div id="fixture-age"><StreamHealth evidence={f} ageMs={config.age} onEvidence={()=>{}}/></div></main>;}
createRoot(document.getElementById('root')).render(<Fixture/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outdir:'tmp/stability-bundle',platform:'browser',jsx:'automatic',loader:{'.css':'local-css'},define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL':'"wss://fixture.invalid/brain/v1"'}});
  const context=await browser.newContext({viewport:{width:1728,height:1080},reducedMotion:'reduce'}); const page=await context.newPage();const errors=[];const blocked=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)||(u.pathname.startsWith('/api/')&&u.pathname!=='/api/health')){blocked.push(u.pathname);return route.abort();}return route.continue();});
  await page.goto(base,{waitUntil:'networkidle'});
  const css=await page.locator('link[rel=stylesheet]').evaluateAll(links=>links.map(l=>l.href));
  const js=bundled.outputFiles.find(f=>f.path.endsWith('.js')).text;
  const localCss=bundled.outputFiles.filter(f=>f.path.endsWith('.css')).map(f=>f.text).join('\n');
  await context.route('**/live-stability-fixture',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head>${css.map(h=>`<link rel="stylesheet" href="${h}">`).join('')}<style>${localCss}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`}));
  const boxes=async()=>page.evaluate(()=>Object.fromEntries(['.sensory-feedback','.feedback-status','.autonomy-world','.autonomy-controls','.telemetry-primary','.live-session-title .live-state-summary','.live-session-title .live-state-summary > div:nth-child(1)','.live-session-title .live-state-summary > div:nth-child(2)','.live-session-title .live-state-summary > div:nth-child(3)','.telemetry-primary dl > div:nth-child(1)','.telemetry-primary dl > div:nth-child(2)','.telemetry-primary dl > div:nth-child(3)','.telemetry-primary dl > div:nth-child(4)','[class*="instruments"]','[class*="timeline"]','[class*="lowerPanels"]','[class*="health"]','[aria-label="Supplied neuron ID mapping"]','#fixture-age'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [selector,{x:r.x,y:r.y,width:r.width,height:r.height}];})));
  let maximumGeometryDeltaPx=0;
  const same=(a,b,label)=>{for(const key of Object.keys(a))for(const dimension of ['x','y','width','height']){maximumGeometryDeltaPx=Math.max(maximumGeometryDeltaPx,Math.abs(a[key][dimension]-b[key][dimension]));assert.ok(Math.abs(a[key][dimension]-b[key][dimension])<=.5,`${label} ${key} ${dimension}: ${a[key][dimension]} → ${b[key][dimension]}`);}};
  const capture=async name=>{if(name.startsWith('live-')||name==='retained-snapshot')await page.getByRole('region',{name:'Live connectome simulation session status',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));else await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${dir}/stability-${name}-1728.png`});};
  const update=async config=>{await page.evaluate(config=>window.fixtureUpdate(config),config);await page.waitForTimeout(130);};
  const cases=[];
  try {
    await page.goto(base+'/live-stability-fixture',{waitUntil:'networkidle'});
    await page.locator('.sensory-feedback').waitFor();await page.locator('.autonomy-world canvas').waitFor();
    await page.waitForTimeout(300);
    for(const [width,height] of [[1366,768],[1440,900],[1536,1024],[1728,1080],[1920,1080]]) {
      await page.setViewportSize({width,height});await update({count:1,mode:'IDLE',retained:false,age:null});
      const before=await boxes();
      for(const [i,count] of [9,620,3314,12408].entries()) {await update({count,mode:i%2?'ESCAPE':'IDLE',retained:false,age:count});same(before,await boxes(),`rapid counter/decoder/age at ${width}`);}
      await update({count:12408,mode:'ESCAPE',retained:true,age:6000});same(before,await boxes(),`retained timeline at ${width}`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`No horizontal overflow ${width}`);
      cases.push({width,height,tolerancePx:0.5,maximumGeometryDeltaPx,baseline:before,counters:[1,9,620,3314,12408],decoder:['IDLE','ESCAPE'],age:['Unavailable','numeric'],retainedStable:true});
    }
    await page.setViewportSize({width:1728,height:1080});await update({count:620,mode:'IDLE',retained:false,age:null});
    await capture('feedback-off');const initial=await boxes();
    const toggle=page.getByRole('checkbox',{name:'SENSORY FEEDBACK TO CONNECTOME',exact:true});await toggle.check();
    await page.locator('[data-feedback=ARMED]').waitFor();same(initial,await boxes(),'OFF to ARMED');await capture('feedback-armed');
    await page.evaluate(()=>window.fixtureBrain('hello'));await page.locator('[data-feedback=SENDING]').waitFor();same(initial,await boxes(),'ARMED to SENDING');
    await page.evaluate(()=>{window.fixtureFreezePublish(true);window.fixtureBrain('accept');});
    await page.locator('[data-feedback=ACCEPTED]').waitFor({timeout:3000});same(initial,await boxes(),'SENDING to ACCEPTED');await capture('feedback-accepted');
    await toggle.uncheck();await page.evaluate(()=>window.fixtureFreezePublish(false));await toggle.check();
    await page.locator('[data-feedback=ARMED]').waitFor();await page.evaluate(()=>window.fixtureBrain('hello'));await page.locator('[data-feedback=SENDING]').waitFor();
    await page.evaluate(()=>window.fixtureBrain('reject'));
    await page.locator('[data-feedback=REJECTED]').waitFor();same(initial,await boxes(),'SENDING to REJECTED');await capture('feedback-rejected');
    assert.match(await page.locator('.feedback-status').textContent(),/Experimental brain message rejected/);
    assert.equal(await page.locator('[data-feedback=ACCEPTED]').count(),0);
    await update({count:620,mode:'IDLE',retained:false,age:100});await capture('live-idle');
    await update({count:12408,mode:'ESCAPE',retained:false,age:100});await capture('live-escape');
    await update({count:12408,mode:'ESCAPE',retained:true,age:6000});await capture('retained-snapshot');
    await toggle.uncheck();await toggle.check();await page.evaluate(()=>window.fixtureBrain('unavailable'));await page.locator('[data-feedback=UNAVAILABLE]').waitFor();same(initial,await boxes(),'server unavailable');assert.equal(await page.locator('[data-feedback=ACCEPTED]').count(),0);
    assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
    return {name:'live-stream-stability',fixtureOnly:true,actualComponents:true,cases,maximumGeometryDeltaPx,feedbackStates:['OFF','ARMED','SENDING','ACCEPTED','REJECTED','UNAVAILABLE'],brainMessages:'in-memory socket only',providerRequests:0,realBrainMessages:0,errors,blocked};
  } finally {await context.close();}
}
