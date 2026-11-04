// Actual local production app; providers and real brain transport blocked by installed browser adapters.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findRealFirefoxExecutable,launchRealFirefoxBiDi,launchEdgeAdapter} from './installed-browser-review-drivers.mjs';
const base=process.env.CAUSALFLY_BROWSER_REVIEW_BASE??'http://127.0.0.1:3499';
const before=process.argv.includes('--before');
const dir='docs/review/mobile-perception-topology';fs.mkdirSync(dir,{recursive:true});
const clip=fs.readFileSync('public/perception-calibration.mp4');
const filename='Samsung_recording_'+('very-long-selected-filename_'.repeat(8))+'.mp4';
const report={before,providerCalls:0,realBrainMessages:0,browsers:[]};
const measure=`(()=>{
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,right:r.right,bottom:r.bottom+scrollY,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth};};
 const figure=document.querySelector('.embodied-signals .fixture-topology'),svg=figure?.querySelector('svg'),panel=document.querySelector('.perception-content'),input=document.querySelector('input[type=file]'),stages=document.querySelector('.perception-stages');
 return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,topology:svg?{figure:box(figure),svg:box(svg),viewBox:svg.getAttribute('viewBox'),heading:box(figure.querySelector('figcaption')),text:[...svg.querySelectorAll('text')].map(e=>({label:e.textContent,rect:box(e)})),caption:box(figure.querySelector('p')),source:box(figure.parentElement.querySelector('.source-context')),nodes:[...svg.querySelectorAll(':scope > g')].filter(g=>g.querySelector('circle')).map(g=>({label:g.querySelector('text').textContent,rect:box(g.querySelector('text')),font:parseFloat(getComputedStyle(g.querySelector('text')).fontSize)*Math.abs(svg.getScreenCTM().a)})),edges:[...svg.querySelectorAll(':scope > g')].filter(g=>g.querySelector('path')).map(g=>({weight:g.querySelector('text').textContent,path:g.querySelector('path').getAttribute('d')}))}:null,upload:input?{panel:box(panel),form:box(input.closest('.perception-upload')),label:box(input.parentElement),input:box(input),accept:input.accept,filename:input.files[0]?.name,focusable:input.tabIndex>=0,focused:document.activeElement===input,outline:getComputedStyle(input).outlineStyle}:null,stages:stages?{rect:box(stages),columns:getComputedStyle(stages).gridTemplateColumns,items:[...stages.children].map(e=>({label:e.querySelector('strong').textContent,rect:box(e),description:box(e.querySelector('small')),font:getComputedStyle(e.querySelector('small')).fontSize,arrow:getComputedStyle(e,'::before').content}))}:null};
})()`;
for(const [name,launch] of [['edge',()=>launchEdgeAdapter(base)],['firefox',()=>launchRealFirefoxBiDi(findRealFirefoxExecutable(),base)]]){
 const d=await launch();const browser={name,version:d.browserName,cases:[]};
 try{
 await d.addInitScript(`()=>{window.EventSource=class{close(){}};window.WebSocket=class{constructor(){throw Error('Real brain transport prohibited');}};}`);
 for(const [width,height] of (before?[[390,844],[1440,900]]:[[320,700],[360,800],[390,844],[430,932],[760,900],[1440,900]])){
 await d.setViewportSize({width,height});await d.goto(base);
 await d.waitFor(`(()=>{if(document.querySelector('.research-cockpit'))return true;document.querySelector('.primary-navigation [aria-label="Experiment"]')?.click();return false;})()`);
 await d.evalJson('document.fonts.ready.then(()=>true)');
 await d.waitFor(`document.querySelector('.embodied-arena')?.dataset.modelStatus!=='loading'`,20000);
 await d.waitFor(`Boolean(document.querySelector('.fixture-topology'))`);
 const topology=await d.evalJson(measure);
 await d.evalJson(`(()=>{document.querySelector('.fixture-topology').scrollIntoView({block:'start'});return true;})()`);
 await d.screenshot(`${dir}/${before?'before':'after'}-${name}-${width}-topology.png`);
 await d.evalJson(`(()=>{[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Real-world perception')?.click();return true;})()`);
 await d.waitFor(`Boolean(document.querySelector('input[type=file]'))`);
 await d.evalJson(`(()=>{document.querySelector('.perception-content').scrollIntoView({block:'start'});document.querySelector('input[type=file]').focus();return true;})()`);
 const empty=await d.evalJson(measure);
 if(!before){
  if(name==='edge'&&width===390){
   const chooser=d.page.waitForEvent('filechooser',{timeout:5000});await d.page.getByLabel('Choose video',{exact:true}).focus();await d.page.keyboard.press('Space');await(await chooser).setFiles({name:filename,mimeType:'video/mp4',buffer:clip});
  }else await d.evalJson(`(()=>{const e=document.querySelector('input[type=file]'),t=new DataTransfer();t.items.add(new File([Uint8Array.from(atob(${JSON.stringify(clip.toString('base64'))}),c=>c.charCodeAt(0))],${JSON.stringify(filename)},{type:'video/mp4'}));e.files=t.files;e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await d.waitFor(`document.querySelector('.scene-status')?.textContent==='VIDEO SELECTED'`);
 }
 const selected=await d.evalJson(measure);browser.cases.push({width,height,topology,empty,selected});
 await d.evalJson(`(()=>{document.querySelector('.perception-content').scrollIntoView({block:'start'});return true;})()`);
 await d.screenshot(`${dir}/${before?'before':'after'}-${name}-${width}-picker-stages.png`);
 if(!before){
  for(const m of [topology,empty,selected])assert.equal(m.overflow,false,`${name} ${width}: page overflow`);
  for(const m of [empty,selected]){const u=m.upload;assert.ok(u.input.x>=u.label.x-.5&&u.input.right<=u.label.right+.5,'Input contained by label');assert.ok(u.label.x>=u.panel.x-.5&&u.label.right<=u.panel.right+.5,'Label contained by panel');assert.ok(u.label.scrollWidth<=u.label.clientWidth+1&&u.form.scrollWidth<=u.form.clientWidth+1,'Native file text stays within its panel');assert.equal(u.accept,'.mp4,.mov,video/mp4,video/quicktime');assert.ok(u.focusable);}
  assert.ok(empty.upload.focused);assert.equal(selected.upload.filename,filename);
  const st=selected.stages;assert.deepEqual(st.items.map(e=>e.label),['SEE','TRACK','MEASURE','TEST']);
  for(const item of st.items){assert.ok(parseFloat(item.font)>=12);assert.ok(item.description.right<=item.rect.right+.5);assert.ok(item.rect.right<=st.rect.right+.5);}
  if(width<=600){assert.equal(st.columns.split(' ').length,1);for(let i=1;i<4;i++)assert.ok(st.items[i].rect.y-st.items[i-1].rect.bottom>=20,'Stage spacing');}
  const t=topology.topology;assert.equal(t.nodes.length,7);assert.deepEqual(t.edges.map(e=>e.weight),['1','1','1','0.5','1','1','1']);
  if(width<=760){assert.equal(t.viewBox,'0 0 360 360');assert.ok(t.svg.width>=t.figure.width*.98,'Topology full width');assert.ok(t.nodes.every(n=>n.font>=12),'Legible topology labels');assert.ok(t.caption.y>=t.svg.bottom,'Caption separated');assert.ok(t.source.y>=t.caption.bottom,'Source separated');assert.ok(t.svg.y-t.heading.bottom<=16&&t.caption.y-t.svg.bottom<=28&&t.figure.bottom-t.caption.bottom<=16,'No reserved empty height');for(let i=0;i<t.text.length;i++)for(let j=i+1;j<t.text.length;j++){const a=t.text[i].rect,b=t.text[j].rect;assert.ok(Math.min(a.right,b.right)-Math.max(a.x,b.x)<=.5||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<=.5,"Topology labels overlap: "+t.text[i].label+' / '+t.text[j].label);}for(const n of t.nodes)assert.ok(n.rect.x>=t.svg.x-.5&&n.rect.right<=t.svg.right+.5,'Topology label fits');}
 }
 console.log(`${name} ${width}: ${before?'baseline':'PASS'}`);
 }
 assert.deepEqual(d.errors,[]);assert.deepEqual(d.blocked,[]);browser.errors=d.errors;report.browsers.push(browser);
 }catch(e){browser.failure=e.stack;fs.writeFileSync(`${dir}/${before?'before':'after'}-${name}-failure.json`,JSON.stringify(browser,null,2));throw e;}finally{await d.close();fs.writeFileSync(`${dir}/${before?'before':'after'}.json`,JSON.stringify(report,null,2));}
}
