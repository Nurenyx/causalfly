import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const {chromium,firefox}=await import(pathToFileURL(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const base=process.env.CAUSALFLY_BROWSER_REVIEW_BASE??'http://127.0.0.1:3465';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const before=process.argv.includes('--before');const dir=process.env.CAUSALFLY_BROWSER_REVIEW_DIR??'docs/review/sprint-17-1';fs.mkdirSync(dir,{recursive:true});
const original=JSON.parse(fs.readFileSync('docs/review/sprint-6b/recorded-evidence.json','utf8'))[0];
const bundle=await build({stdin:{contents:`
import React,{useState,useLayoutEffect} from 'react';import{createRoot}from'react-dom/client';import{EventTimeline}from'./src/app/components/live-session';
const original=${JSON.stringify(original)};const values=[1,9,99,284,999,1000,18421,99999,192000];
function Fixture(){const[step,setStep]=useState(0);window.timelineUpdate=setStep;const value=values[step%values.length];const frames=Array.from({length:step%11===0?1:6},(_,i)=>{const f=structuredClone(original);Object.assign(f.telemetry,{sequence:step*6+i+1,neuralTick:value+i,simulationMs:value+i,inputSequence:step%3?i:1,motorMode:step%4===0&&i>2?'ESCAPE':'IDLE'});return f;});
useLayoutEffect(()=>window.timelineMeasure?.('commit'));
return <div className="app-shell instrument-shell guided-shell workspace-shell live-shell"><aside className="sidebar">AUTHORED GEOMETRY FIXTURE<br/>NO LIVE DATA OR PROVIDER</aside><div className="workspace"><main className="main-content"><div style={{height:900}}>Timeline geometry fixture</div><div id="timeline-wrapper" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 280px',gap:12}}><div style={{minWidth:0}}><EventTimeline frames={frames} historical={step%13===0} receivedAt="2026-11-02T20:00:00Z" reconnectedAt={step%17===0?Date.parse('2026-11-02T20:00:00Z'):null}/></div><aside>Reserved observation rail</aside></div><div style={{height:1000}}/><footer id="timeline-footer">END OF AUTHORED FIXTURE</footer></main></div></div>}
createRoot(document.getElementById('root')).render(<Fixture/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outdir:'tmp/sprint171-timeline',platform:'browser',jsx:'automatic',loader:{'.css':'local-css'},define:{'process.env.NODE_ENV':'"production"'}});
const report={before,fixtureOnly:true,tolerancePx:1,firefoxAvailable:fs.existsSync(firefox.executablePath()),browsers:[],providerRequests:0,realBrainMessages:0};
for(const [name,type,options] of [['edge',chromium,{channel:'msedge'}],...(report.firefoxAvailable?[['firefox',firefox,{}]]:[])]){
 const browser=await type.launch({headless:true,...options});const context=await browser.newContext({viewport:{width:1728,height:1080},reducedMotion:'no-preference'});const page=await context.newPage();const errors=[];const blocked=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>{const u=new URL(r.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname)||u.pathname.startsWith('/api/')&&u.pathname!=='/api/health'){blocked.push(u.pathname);return r.abort();}return r.continue();});await context.routeWebSocket('**',s=>s.close());
 try{
  assert.equal((await(await page.request.get(base+'/api/health')).json()).metaMode,'offline');await page.goto(base,{waitUntil:'networkidle'});const css=await page.locator('link[rel=stylesheet]').evaluateAll(ns=>ns.map(n=>n.href));const htmlClass=await page.locator('html').getAttribute('class');
  const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text;await context.route('**/sprint171-timeline',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html class="${htmlClass}"><head>${css.map(h=>`<link rel="stylesheet" href="${h}">`).join('')}<style>${bundle.outputFiles.filter(f=>f.path.endsWith('.css')).map(f=>f.text).join('\n')}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`}));
  await page.goto(base+'/sprint171-timeline',{waitUntil:'networkidle'});await page.waitForFunction(()=>Boolean(window.timelineUpdate));await page.evaluate(()=>document.fonts.ready);const cases=[];
  for(const width of [1728,1366,760]){
   await page.setViewportSize({width,height:1080});await page.evaluate(width=>{document.getElementById('timeline-wrapper').style.gridTemplateColumns=width<1000?'minmax(0,1fr)':'minmax(0,1fr) 280px';},width);await page.waitForTimeout(100);
   for(const scrollPosition of [0,800]){
    await page.evaluate(y=>scrollTo(0,y),scrollPosition);await page.waitForTimeout(100);
    await page.evaluate(()=>{
     window.timelineSamples=[];window.timelineNodes=new Map();window.timelineReplacements=[];window.timelineTitles=new Set();let previous=null;
     window.timelineMeasure=kind=>{
      const rects={};const box=(key,el)=>{if(window.timelineNodes.has(key)&&window.timelineNodes.get(key)!==el)window.timelineReplacements.push(key);window.timelineNodes.set(key,el);const r=el.getBoundingClientRect();rects[key]={x:r.x,y:r.y,width:r.width,height:r.height};};
      const panel=document.querySelector('[class*="timeline"][class*="panel"]');box('panel',panel);box('track',panel.querySelector('ol'));box('footer',document.querySelector('#timeline-footer'));
      panel.querySelectorAll('li').forEach((el,i)=>{box('slot-'+i,el);const label=el.querySelector('strong');window.timelineTitles.add(label.textContent);box('label-'+i,label);box('tick-'+i,el.children[1]);box('time-'+i,el.children[2]);
       const marker=el.querySelector('[data-timeline-marker]');const baseline=el.querySelector('[data-timeline-baseline]');
       if(marker){box('marker-'+i,marker);box('baseline-'+i,baseline);}else{const r=el.getBoundingClientRect(),s=getComputedStyle(el,'::before');rects['marker-'+i]={x:r.x+parseFloat(s.left),y:r.y+parseFloat(s.top),width:parseFloat(s.width),height:parseFloat(s.height)};rects['baseline-'+i]={x:r.x,y:r.y,width:r.width,height:parseFloat(getComputedStyle(el).borderTopWidth)};}
       const range=document.createRange();range.selectNodeContents(label);const fragments=[...range.getClientRects()].map(r=>({x:r.x,y:r.y,width:r.width,height:r.height}));rects['labelText-'+i]=fragments;
      });
      const sample={kind,time:performance.now(),scrollY,scrollHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,rects};if(previous)sample.delta=Object.fromEntries(Object.entries(rects).filter(([,r])=>!Array.isArray(r)).map(([k,r])=>[k,Object.fromEntries(['x','y','width','height'].map(d=>[d,r[d]-previous.rects[k][d]]))]));previous=sample;window.timelineSamples.push(sample);
     };window.timelineMeasure('initial');
    });
    // Allow every authored presentation to commit, with normal motion preferences.
    await page.evaluate(async()=>{for(let i=1;i<=270;i++){window.timelineUpdate(i);await new Promise(r=>setTimeout(r,10));window.timelineMeasure('after-layout');}});
    const result=await page.evaluate(()=>({samples:window.timelineSamples,replacements:[...new Set(window.timelineReplacements)],titles:[...window.timelineTitles]}));
    const initial=result.samples[0];const dimensions=['x','y','width','height'];result.maxima=Object.fromEntries(Object.keys(initial.rects).filter(k=>!k.startsWith('labelText')).map(k=>[k,Object.fromEntries(dimensions.map(d=>[d,Math.max(...result.samples.map(s=>Math.abs(s.rects[k][d]-initial.rects[k][d])))]))]));
    result.maxGeometryDelta=Math.max(...Object.values(result.maxima).flatMap(Object.values));result.scrollDelta=Math.max(...result.samples.map(s=>Math.abs(s.scrollY-initial.scrollY)));result.documentHeightRange=Math.max(...result.samples.map(s=>s.scrollHeight))-Math.min(...result.samples.map(s=>s.scrollHeight));result.width=width;result.scrollPosition=scrollPosition;cases.push(result);
    await page.screenshot({path:`${dir}/timeline-${before?'before':'after'}-${name}-${width}-${scrollPosition}.png`});
   }
  }
  const scrolling=await page.evaluate(()=>{const before=scrollY;scrollBy(0,100);return{before,after:scrollY};});assert.ok(scrolling.after>scrolling.before,'Normal page scrolling works');
  report.browsers.push({name,cases,scrolling,errors,blocked});
 }finally{await context.close();await browser.close();}
}
fs.writeFileSync(`${dir}/timeline-${before?'before':'after'}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({before,firefoxAvailable:report.firefoxAvailable,browsers:report.browsers.map(b=>({name:b.name,cases:b.cases.map(c=>({width:c.width,scroll:c.scrollPosition,samples:c.samples.length,maximum:c.maxGeometryDelta,scrollDelta:c.scrollDelta,heightRange:c.documentHeightRange,titles:c.titles})),errors:b.errors,blocked:b.blocked}))},null,2));
if(!before)for(const b of report.browsers){assert.deepEqual(b.errors,[]);assert.deepEqual(b.blocked,[]);for(const c of b.cases){assert.ok(c.maxGeometryDelta<=1,`${b.name} ${c.width}: timeline moves ${c.maxGeometryDelta}px`);assert.ok(c.scrollDelta<=1);assert.ok(c.documentHeightRange<=1);assert.deepEqual(c.replacements,[]);assert.equal(c.samples.some(s=>s.overflow),false);}}
