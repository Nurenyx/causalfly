import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';

const sizes = [[1366,768],[1440,900],[1536,1024],[1728,1080],[1920,1080]];

/** Actual status component in an isolated client fixture. The only request is locally intercepted. */
async function reviewMetaState(browser, base) {
  const bundled = await build({stdin:{contents:`import React, {useState} from 'react'; import {createRoot} from 'react-dom/client'; import {MetaStatus} from './src/app/components/status-indicator'; function Fixture(){const [working,setWorking]=useState(false);return <><p>AUTHORED STATUS COMPONENT FIXTURE · NO PROVIDER</p><MetaStatus mode="META LIVE" working={working}/><button onClick={async()=>{setWorking(true);try{await fetch('/fixture-model-request',{method:'POST'});}finally{setWorking(false);}}}>Start explicit model fixture</button></>;} createRoot(document.getElementById('root')).render(<Fixture/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
  const context=await browser.newContext();const page=await context.newPage();
  let release; let requests=0;
  await context.route('**/*',route=>route.abort());
  await context.route('**/fixture-model-request',async route=>{requests++;await new Promise(resolve=>{release=resolve;});await route.fulfill({json:{fixtureOnly:true}});});
  await context.route('**/status-component-fixture',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><div id="root"></div><script>${bundled.outputFiles[0].text}</script>`}));
  try {
    await page.goto(base+'/status-component-fixture');
    await page.getByRole('button',{name:'META READY status',exact:true}).waitFor();
    assert.equal(requests,0);
    await page.getByRole('button',{name:'Start explicit model fixture',exact:true}).click();
    await page.getByRole('button',{name:'META PROCESSING status',exact:true}).waitFor();
    assert.equal(requests,1);
    release(); await page.getByRole('button',{name:'META READY status',exact:true}).waitFor();
    return {name:'meta-ready-processing-boundary',fixtureOnly:true,actualStatusComponent:true,states:['READY','PROCESSING','READY'],interceptedRequests:requests,providerRequests:0};
  } finally { if(release)release();await context.close(); }
}

export async function reviewHumanStates(browser,base,dir) {
  const context=await browser.newContext({viewport:{width:1728,height:1080}});
  const errors=[];const blocked=[];const actions=[];
  await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  for(const pattern of ['**/api/media/**','**/api/perception','**/api/perception/scene','**/api/sources/fruitfly/analyze']) await context.route(pattern,route=>{blocked.push(new URL(route.request().url()).pathname);return route.abort();});
  await context.addInitScript(()=>{window.EventSource=class {constructor(){window.__humanStream=this;}close(){}};});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{if(new URL(request.url()).pathname==='/api/experiments'&&request.method()==='POST')actions.push(request.postDataJSON().action);});
  const nav=name=>page.getByRole('button',{name,exact:true}).click();
  const capture=async name=>{await page.screenshot({path:`${dir}/human-${name}-1728.png`});};
  const geometry=async name=>{
    const cases=[];
    for(const [width,height] of sizes) {
      await page.setViewportSize({width,height});
      await page.waitForTimeout(180);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name}: no horizontal overflow at ${width}`);
      if(name.startsWith('live-')) {
        const state=page.getByRole('region',{name:'Live connectome simulation session status',exact:true});
        await state.evaluate(el=>el.scrollIntoView({block:'start'}));
        const boxes=await page.evaluate(()=>{
          const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
          const observer=document.querySelector('[aria-label="Received observations"]');
          const instrumentPanels=[...document.querySelector('[class*="instruments"]').children].map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};});
          const charts=document.querySelector('[aria-label="Received simulation activity"]');
          return {instrumentPanels,summary:rect('.live-session-title'), ...(observer?{observer:rect('[aria-label="Received observations"]')}:{}), ...(charts?{charts:rect('[aria-label="Received simulation activity"]')}:{} )};
        });
        assert.ok(boxes.summary.y>=-1&&boxes.summary.bottom<=height,'Primary status summary remains visible');
        if(boxes.observer&&boxes.charts)assert.ok(boxes.charts.right<=boxes.observer.x+1,'Right-hand observations do not crowd or overlap charts');
        for(let i=0;i<boxes.instrumentPanels.length;i++)for(let j=i+1;j<boxes.instrumentPanels.length;j++){const a=boxes.instrumentPanels[i],b=boxes.instrumentPanels[j];assert.ok(Math.min(a.right,b.right)-Math.max(a.x,b.x)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<=1,'Live instrument panels cannot collide');}
        cases.push({width,height,boxes,noHorizontalOverflow:true});
      } else cases.push({width,height,noHorizontalOverflow:true});
      if(width===1728)await capture(name);
    }
    await page.setViewportSize({width:1728,height:1080});
    return cases;
  };
  try {
    assert.equal((await(await page.request.get(base+'/api/health')).json()).metaMode,'offline');
    await page.goto(base,{waitUntil:'networkidle'});
    await page.getByRole('link',{name:'CausalFly home',exact:true}).click();
    const overview=await geometry('overview');
    const source=page.getByRole('button',{name:'Connectome: male-cns:v1.0 status',exact:true});
    await source.hover();assert.equal(await source.getAttribute('aria-expanded'),'false','Hover cannot open source status');
    await source.click();assert.equal(await source.getAttribute('aria-expanded'),'true');
    const popover=page.locator('.status-indicator .context-popover:visible');
    const popoverBox=await popover.boundingBox();assert.ok(popoverBox.width<=301&&popoverBox.height<=211,'Status disclosure stays compact');
    await capture('source-popover');
    await page.locator('h1').click();assert.equal(await source.getAttribute('aria-expanded'),'false');
    await source.focus();await page.keyboard.press('Enter');assert.equal(await source.getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');assert.equal(await source.getAttribute('aria-expanded'),'false');
    await source.click();await page.locator('.home-paths button').filter({hasText:'Open Experiment'}).click();
    assert.equal(await page.locator('.status-indicator .context-popover:visible').count(),0,'Navigation closes the source popover');
    await page.locator('.scientist-action button').first().click();
    await page.getByRole('button',{name:/APPROVE.*RUN/i}).first().waitFor();
    await page.locator('.scientist-action button').first().click();
    await page.locator('.completed-result-summary').waitFor();
    await page.evaluate(()=>window.scrollTo(0,0));
    const experiment=await geometry('experiment-completed');
    assert.equal(await page.locator('.completed-setup').getAttribute('open'),null);
    await page.getByRole('button',{name:'EDIT QUESTION',exact:true}).waitFor();
    await page.getByRole('button',{name:'NEW QUESTION',exact:true}).waitFor();
    await page.locator('.completed-setup > summary').click();
    await page.locator('.completed-setup > summary').click();
    await page.locator('.compare-transition-btn').first().click();
    await page.locator('.compare-arena canvas').waitFor();
    await page.evaluate(()=>window.scrollTo(0,0));
    const compare=await geometry('compare');
    await page.locator('.compare-hero-result .explain-meta-btn').first().click();
    await page.getByText('Interpretation complete. Next hypothesis ready.',{exact:true}).waitFor();
    assert.deepEqual(actions,['design','run','interpret']);
    await nav('Live Connectome');
    const fixed=Date.parse('2026-11-02T18:00:00Z');
    await page.clock.setFixedTime(new Date(fixed-1000));
    await page.getByRole('button',{name:'Set Investigation Question',exact:true}).click();
    await nav('Reconnect backend');
    await page.evaluate(()=>window.__humanStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'CONNECTED',message:'Authored fixture transport connected',evidence:null})}));
    await page.getByRole('region',{name:'Live connectome simulation session status',exact:true}).locator('[data-state="WAITING FOR FIRST FRAME"]').waitFor();
    assert.equal(await page.getByRole('region',{name:'Received simulation activity',exact:true}).count(),0,'No empty measurement charts before first frame');
    await page.getByRole('heading',{name:'Connectome observatory',exact:true}).waitFor();
    const waiting=await geometry('live-waiting');
    await page.clock.setFixedTime(new Date(fixed));
    // Original measurement values preserved; receipt times are explicitly fixture wall-clock timestamps.
    const frames=JSON.parse(fs.readFileSync('docs/review/sprint-6b/recorded-evidence.json','utf8')).map(f=>({...f,receivedAt:new Date(fixed).toISOString()}));
    const emit=async evidence=>page.evaluate(evidence=>window.__humanStream.onmessage({data:JSON.stringify({source:'FRUITFLY_XR',state:'DATA RECEIVED',message:'Authored fixture transport; recorded simulated measurements',retentionId:'10000000-0000-4000-8000-000000000001',evidence})}),evidence);
    for(const frame of frames)await emit(frame);
    await page.locator('.telemetry-primary[data-retained=false]').waitFor();
    await page.getByRole('region',{name:'Received simulation activity',exact:true}).waitFor();
    const live=await geometry('live-telemetry');
    await page.getByRole('button',{name:/Review interpretation/}).click();
    const observedExplanation=page.getByRole('button',{name:'EXPLAIN WITH META',exact:true});await observedExplanation.waitFor();assert.equal(await observedExplanation.isEnabled(),true,'Observed ESCAPE keeps normal interpretation available');
    await page.getByRole('button',{name:'Stage 02: OBSERVE',exact:true}).click();
    if(await page.getByRole('button',{name:'Open experimental embodiment',exact:true}).count()) await nav('Open experimental embodiment');
    assert.equal(await page.getByRole('region',{name:'Experimental embodiment context',exact:true}).isVisible(),true);
    await page.locator('.autonomy-world canvas').waitFor();
    await page.locator('.autonomy-world:not([data-model-status="loading"])').waitFor();
    await page.waitForFunction(()=>Number(document.querySelector('.autonomy-panel')?.getAttribute('data-tick'))>2);
    await page.locator('.procedural-boundary').evaluate(el=>el.scrollIntoView({block:'start'}));
    await page.getByText('Decoder selects supported states; CausalFly executes movement.',{exact:true}).waitFor();
    await capture('procedural-embodiment');
    await nav('Close experimental embodiment');
    const values=await page.locator('.telemetry-primary dl').textContent();
    await page.clock.setFixedTime(new Date(fixed+6000));
    await page.locator('.telemetry-primary[data-retained=true]').waitFor();
    assert.equal(await page.locator('.telemetry-primary dl').textContent(),values,'Retained values do not change when stream stops');
    await page.getByText(/^Last received:/).waitFor();
    await page.waitForFunction(()=>document.querySelector('.source-state-detail')?.textContent.includes('STREAM INACTIVE'));
    const retained=await geometry('live-retained-snapshot');
    // A new investigation receives only the capture's original first IDLE frame, in a separate authored session.
    await nav('Change question');
    await page.locator('#fruitfly-question').fill('What changed before the decoder switched to ESCAPE?');
    await nav('Set Investigation Question');
    await page.clock.setFixedTime(new Date(fixed+7000));
    const idle=structuredClone(frames[0]);idle.receivedAt=new Date(fixed+7000).toISOString();idle.telemetry.sessionId='authored-idle-only-fixture';
    await emit(idle);
    await page.getByText('ESCAPE was not observed in the retained window.',{exact:true}).waitFor();
    await page.getByRole('button',{name:/Review interpretation/}).click();
    await page.getByRole('button',{name:'INSPECT OBSERVED DECODER STATES',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:/EXPLAIN WITH META|RETRY META ANALYSIS/i}).count(),0,'Absent-event interpretation controls are omitted, not merely disabled');
    assert.equal(await page.getByRole('heading',{name:'Ask CausalFly to explain',exact:true}).count(),0);
    assert.equal(await page.locator('.xr-exact-question').textContent(),'What changed before the decoder switched to ESCAPE?','Original question remains unchanged provenance');
    await page.locator('.xr-question-answer').evaluate(el=>el.scrollIntoView({block:'start'}));
    await capture('escape-not-observed');
    await page.getByRole('button',{name:'Ask CausalFly',exact:true}).click();
    await page.getByRole('button',{name:'Ask about my investigation question ↗',exact:true}).click();
    const assistant=page.getByRole('dialog',{name:'Ask CausalFly',exact:true});
    await assistant.getByRole('button',{name:'INSPECT OBSERVED DECODER STATES',exact:true}).waitFor();
    assert.equal(await assistant.getByRole('region',{name:'Optional Meta analysis',exact:true}).count(),0);
    assert.equal(await assistant.getByRole('button',{name:/Explain with Meta|Retry Meta analysis/i}).count(),0);
    assert.equal(await assistant.locator('.assistant-question p').textContent(),'What changed before the decoder switched to ESCAPE?');
    await page.getByRole('button',{name:'Close CausalFly Assistant',exact:true}).click();
    await page.getByRole('button',{name:'INSPECT OBSERVED DECODER STATES',exact:true}).click();
    await page.getByRole('heading',{name:'Live connectome simulation evidence',exact:true}).waitFor();
    assert.match(await page.locator('.network-provenance').textContent(),/Motor decoder modeIDLE/);
    assert.match(await page.locator('.workflow-investigation').textContent(),/What changed before the decoder switched to ESCAPE\?/);
    assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);
    return {name:'human-ux-state-journeys',fixtureOnly:true,viewport:{width:1728,height:1080},overview,experiment,compare,waiting,live,retained,actions,popoverBox,sourcePopover:{clickOnly:true,outsideClose:true,escapeClose:true,navigationClose:true,keyboardAccessible:true},retainedValuesUnchanged:true,escapeNotObserved:true,escapeInterpretationOfferRemoved:true,observedEventInterpretationAvailable:true,originalQuestionPreserved:true,observedStateInspectable:true,assistantAbsentEventOfferRemoved:true,proceduralDisclosure:true,blocked,errors,providerRequests:0};
  } finally {await context.close();}
}

export async function reviewHumanAcceptance(browser,base,dir) {
  return [await reviewHumanStates(browser,base,dir),await reviewMetaState(browser,base)];
}
