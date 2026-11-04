import fs from 'node:fs';
import assert from 'node:assert/strict';
import {findRealFirefoxExecutable,launchRealFirefoxBiDi,launchEdgeAdapter} from './installed-browser-review-drivers.mjs';
const base=process.env.CAUSALFLY_BROWSER_REVIEW_BASE??'http://127.0.0.1:3132';
const before=process.argv.includes('--before');
const dir='docs/review/final-responsive-layout';
const report=[];
for(const [name,launch] of [['edge',()=>launchEdgeAdapter(base)],['firefox',()=>launchRealFirefoxBiDi(findRealFirefoxExecutable(),base)]]){
 const d=await launch();const cases=[];
 try{
 await d.addInitScript(`()=>{window.EventSource=class{constructor(){window.layoutStream=this;}close(){}};window.WebSocket=class{constructor(){throw Error('Real brain transport prohibited');}};}`);
 for(const [width,height] of (before?[[390,844],[1440,900]]:[[320,700],[360,800],[390,844],[430,932],[760,900],[1366,768],[1440,900],[1728,1080]])){
 await d.setViewportSize({width,height});await d.goto(base);
 await d.waitFor(`(()=>{if(document.querySelector('.instrument-mode-bar'))return true;[...document.querySelectorAll('button')].find(b=>/Live Connectome/i.test(b.textContent))?.click();return false;})()`);
 await d.evalJson('document.fonts.ready.then(()=>true)');if(!before)await d.waitFor("document.querySelector('.autonomy-world')?.dataset.modelStatus==='ready'",20000);
 const m=await d.evalJson(`(()=>{const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,flex:c.flex,flexDirection:c.flexDirection,scrollWidth:e.scrollWidth};};return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,header:box('.page-header'),copy:box('.page-header-copy'),subtitle:box('.workflow-identity'),tools:box('.page-header-tools'),badges:box('.header-badges'),toolbar:box('.instrument-mode-bar'),tabs:[...document.querySelectorAll('.instrument-mode-tab')].map(e=>({label:e.textContent,disabled:e.disabled,description:document.getElementById(e.getAttribute('aria-describedby'))?.textContent,x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width,scrollWidth:e.scrollWidth})),context:box('[class*=contextSlot]'),embodiment:box('[aria-label="Experimental embodiment context"]'),toggles:[...document.querySelectorAll('button')].filter(e=>/^(Open|Close) experimental embodiment/i.test(e.textContent)).length,lanes:[...document.querySelectorAll('ol[data-timeline-track]>li')].map(e=>e.dataset.lane)};})()`);
 cases.push(m);await d.screenshot(`${dir}/${before?'before':'after'}-${name}-${width}.png`);
 if(!before){assert.equal(m.overflow,false,`${name} ${width} overflow`);assert.ok(m.embodiment);assert.equal(m.toggles,0);assert.deepEqual(m.lanes,['frame','neural','input','decoder','stream']);for(const t of m.tabs){assert.ok(t.x>=0&&t.right<=width+1&&t.scrollWidth<=t.width+1,`${name} ${width} clipped ${t.label}`);}if(width<=760){assert.ok(m.header.height<320);assert.ok(m.badges.y-m.subtitle.bottom<=24);assert.ok(m.toolbar.y-m.header.bottom<=24);}}
  if(!before){
 await d.evalJson(`(()=>{[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Experiment')?.click();return true;})()`);
 await d.waitFor(`Boolean(document.querySelector('.research-cockpit'))`);
 await d.waitFor("document.querySelector('.embodied-arena')?.dataset.modelStatus!=='loading'",20000);const experiment=await d.evalJson(`(()=>{const tabs=[...document.querySelectorAll('.instrument-mode-tab')];return {overflow:document.documentElement.scrollWidth>innerWidth,tabs:tabs.map(e=>({label:e.querySelector('.mode-label').textContent,x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width,scrollWidth:e.scrollWidth,disabled:e.disabled,description:document.getElementById(e.getAttribute('aria-describedby'))?.textContent})),headerHeight:document.querySelector('.page-header').getBoundingClientRect().height};})()`);
 m.experiment=experiment;assert.equal(experiment.overflow,false);assert.equal(experiment.tabs.length,3);
 for(const t of experiment.tabs)assert.ok(t.x>=0&&t.right<=width+1&&t.scrollWidth<=t.width+1,`${name} ${width} experiment clipped ${t.label}`);
 assert.ok(experiment.tabs[2].disabled&&experiment.tabs[2].description);
 if(width<=760)assert.ok(experiment.headerHeight<320);
 await d.screenshot(`${dir}/after-${name}-${width}-experiment.png`);
 }
 console.log(name,width,JSON.stringify(m));
 }
 if(!before)assert.deepEqual(d.errors,[]);report.push({name,cases,errors:d.errors,blocked:d.blocked});
 }finally{await d.close();fs.writeFileSync(`${dir}/${before?'before':'after'}.json`,JSON.stringify([...report,...(report.some(r=>r.name===name)?[]:[{name,cases}])],null,2));}
}
