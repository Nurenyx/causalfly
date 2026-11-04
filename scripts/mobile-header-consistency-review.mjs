// Actual local application; installed browsers, intercepted providers and in-memory transport only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findRealFirefoxExecutable,launchRealFirefoxBiDi,launchEdgeAdapter} from './installed-browser-review-drivers.mjs';
const base=process.env.CAUSALFLY_BROWSER_REVIEW_BASE??'http://127.0.0.1:3498';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const dir='docs/review/mobile-header-consistency';
fs.mkdirSync(dir,{recursive:true});
const report={providerCalls:0,realBrainMessages:0,browsers:[]};
const destinations=[['overview','Overview & Orientation','Welcome to CausalFly'],['experiment','Experiment','Scientific Experiment Workspace'],['live','Live Connectome','A brain map in motion.'],['evidence','Evidence','Evidence'],['overview-return','Overview & Orientation','Welcome to CausalFly']];
const measure=`(()=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,right:r.right,bottom:r.bottom+scrollY};};
 const nav=document.querySelector('.primary-navigation'),brand=document.querySelector('.sidebar .brand'),header=document.querySelector('.page-header');
 return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,brand:rect(brand),brandParts:[...brand.children].map(rect),nav:rect(nav),columns:getComputedStyle(nav).gridTemplateColumns,buttons:[...nav.querySelectorAll('button')].map(e=>({label:e.getAttribute('aria-label'),rect:rect(e),parts:[...e.children].map(rect),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,current:e.getAttribute('aria-current'),active:e.classList.contains('active'),font:getComputedStyle(e).fontSize,color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderColor})),headerHeight:rect(header).height,copyFlex:getComputedStyle(document.querySelector('.page-header-copy')).flex,statusGap:document.querySelector('.header-badges').getBoundingClientRect().top-document.querySelector('.workflow-identity').getBoundingClientRect().bottom,workflow:[...document.querySelectorAll('.instrument-mode-tab')].map(e=>({rect:rect(e),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth})),embodiment:Boolean(document.querySelector('[aria-label="Experimental embodiment context"]')),embodimentToggle:[...document.querySelectorAll('button')].some(e=>/^(Open|Close) experimental embodiment/i.test(e.textContent))};
})()`;
function sameRect(actual,expected,label){for(const key of ['x','y','width','height'])assert.ok(Math.abs(actual[key]-expected[key])<=.5,`${label} ${key}: ${actual[key]} versus ${expected[key]}`);}
for(const [name,launch] of [['edge',()=>launchEdgeAdapter(base)],['firefox',()=>launchRealFirefoxBiDi(findRealFirefoxExecutable(),base)]]){
 const d=await launch();const browser={name,version:d.browserName,cases:[]};
 try{
 await d.addInitScript(`()=>{window.EventSource=class{close(){}};window.WebSocket=class{constructor(){throw Error('Real brain transport prohibited');}};}`);
 await d.goto(base);await d.waitFor(`Boolean(document.querySelector('.home-overview'))`);
 assert.equal(await d.evalJson(`fetch('/api/health').then(r=>r.json()).then(r=>r.metaMode)`),'offline');
 for(const [width,height] of [[320,700],[360,800],[390,844],[430,932],[760,900]]){
 await d.setViewportSize({width,height});let baseline;
 for(const [destination,label,title] of destinations){
 await d.waitFor(`(()=>{if(document.querySelector('.page-header h1')?.textContent===${JSON.stringify(title)}&&document.querySelector('.primary-navigation [aria-current="page"]')?.getAttribute('aria-label')===${JSON.stringify(label)})return true;[...document.querySelectorAll('.primary-navigation button')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)})?.click();return false;})()`);
 await d.evalJson(`document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true)))))`);
 if(destination==='experiment')await d.waitFor(`document.querySelector('.embodied-arena')?.dataset.modelStatus!=='loading'`,20000);
 if(destination==='live')await d.waitFor(`document.querySelector('.autonomy-world')?.dataset.modelStatus==='ready'`,20000);
 const m=await d.evalJson(measure);browser.cases.push({destination,height,...m});
 if([320,390].includes(width)&&!destination.endsWith('return'))await d.screenshot(`${dir}/${name}-${destination}-${width}.png`);
 assert.equal(m.overflow,false,`${name} ${width} ${destination}: overflow`);
 assert.equal(m.buttons.length,4);assert.equal(m.columns.split(' ').length,width<360?2:4);
 assert.equal(m.buttons.filter(b=>b.current==='page').length,1);assert.equal(m.buttons.filter(b=>b.active).length,1);
 const selected=m.buttons.find(b=>b.current==='page');assert.equal(selected.label,label);assert.ok(selected.active);
 assert.notEqual(selected.border,m.buttons.find(b=>!b.active).border,'Active border remains visible');
 assert.ok(m.headerHeight<320,`${name} ${width}: compact header`);assert.equal(m.copyFlex,'0 0 auto');assert.ok(m.statusGap>=0&&m.statusGap<=24);
 assert.ok(Math.abs(m.brand.x+m.brand.width/2-width/2)<.5,'Centered brand row');
 for(const b of m.buttons){assert.ok(b.rect.height>=44);assert.ok(b.rect.x>=0&&b.rect.right<=width+.5);assert.ok(b.scrollWidth<=b.clientWidth+1,`${width} ${b.label}: label overflow`);for(const p of b.parts)assert.ok(p.x>=b.rect.x-.5&&p.right<=b.rect.right+.5&&p.y>=b.rect.y-.5&&p.bottom<=b.rect.bottom+.5,`${width} ${b.label}: clipped content`);}
 if(width>=360)assert.ok(m.buttons.every(b=>Math.abs(b.rect.y-m.buttons[0].rect.y)<.5),'One navigation row');else{assert.equal(m.buttons[0].rect.y,m.buttons[1].rect.y);assert.equal(m.buttons[2].rect.y,m.buttons[3].rect.y);assert.ok(m.buttons[2].rect.y>=m.buttons[0].rect.bottom);}
 for(const t of m.workflow)assert.ok(t.rect.x>=0&&t.rect.right<=width+.5&&t.scrollWidth<=t.clientWidth+1,'Workflow remains inside viewport');
 if(destination==='live'){assert.ok(m.embodiment);assert.equal(m.embodimentToggle,false);}
 if(!baseline)baseline=m;else{sameRect(m.brand,baseline.brand,'Brand');sameRect(m.nav,baseline.nav,'Navigation');m.buttons.forEach((b,i)=>sameRect(b.rect,baseline.buttons[i].rect,b.label));m.brandParts.forEach((b,i)=>sameRect(b,baseline.brandParts[i],'Brand content'));}
 console.log(`${name} ${width} ${destination}: PASS`);
 }
 }
 assert.deepEqual(d.errors,[]);assert.deepEqual(d.blocked,[]);browser.errors=d.errors;browser.blocked=d.blocked;report.browsers.push(browser);
 }catch(e){browser.failure=e.stack;fs.writeFileSync(`${dir}/${name}-failure.json`,JSON.stringify(browser,null,2));throw e;}finally{await d.close();fs.writeFileSync(`${dir}/results.json`,JSON.stringify(report,null,2));}
}
