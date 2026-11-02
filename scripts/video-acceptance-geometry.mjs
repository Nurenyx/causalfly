import assert from "node:assert/strict";

/** Inspects real rendered components; no injected layout or fabricated geometry. */
export async function videoGeometry(page, dir, name) {
 const cases=[];
 for(const [width,height] of [[1366,768],[1440,900],[1536,1024],[1920,1080]]) {
  await page.setViewportSize({width,height}); await page.waitForTimeout(400);
  const rail=page.locator('.embodied-context-rail');
  const geometry=await rail.evaluate(el=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   const box=s=>rect(el.querySelector(s));
   const world=el.parentElement.querySelector('.embodied-world-column');
   const panel=el.querySelector('.perception-panel');
   const content=el.querySelector('.perception-content');
   const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
   return {rail:rect(el),world:rect(world),panel:rect(panel),player:box('.perception-player'),controls:box('.perception-player-controls'),attribution:box('.perception-player > small'),scene:box('.meta-scene'),candidates:box('.scene-candidates'),metrics:box('.perception-metrics'),target:box('.context-intervention-deck'),scientist:box('.scientist-action'),orbit:rect(world.querySelector('.recorded-viewport-tools')),instruments:rect(world.querySelector('.recorded-world-instruments')),arena:rect(world.querySelector('.embodied-arena')),children:[...content.children].filter(visible).map(rect),clipped:[panel,content,el.querySelector('.scene-candidates'),el.querySelector('.perception-player')].some(e=>e.scrollHeight>e.clientHeight+2&&['hidden','auto','scroll','clip'].includes(getComputedStyle(e).overflowY))};
  });
  const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
  assert.ok(!overlap(geometry.world,geometry.rail),'World and inspector do not overlap');
  assert.ok(Math.abs(geometry.world.bottom-geometry.rail.bottom)<2,'World stretches to full inspector height');
  assert.ok(Math.abs(geometry.world.y-geometry.rail.y)<2,'Shared row starts align');
  assert.ok(!geometry.clipped,'No perception content clipped by a height cap');
  for(let i=0;i<geometry.children.length;i++)for(let j=i+1;j<geometry.children.length;j++)assert.ok(!overlap(geometry.children[i],geometry.children[j]),'Inspector content siblings cannot overlap');
  assert.ok(geometry.controls.y>=geometry.player.y&&geometry.attribution.y>=geometry.controls.bottom-1,'Controls then attribution follow source video');
  assert.ok(geometry.metrics.y>=geometry.player.bottom-1,'Measurements follow complete player');
  assert.ok(geometry.target.y>=geometry.panel.bottom-1,'Target pathway follows perception');
  assert.ok(geometry.scientist.y>=geometry.target.bottom-1,'Scientist follows target pathway');
  assert.ok(!overlap(geometry.orbit,geometry.arena)&&!overlap(geometry.instruments,geometry.orbit),'World tools and readouts remain unobstructed');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No page horizontal overflow');
  await page.locator('.embodied-stage').screenshot({path:`${dir}/${name}-row-${width}.png`});
  await rail.screenshot({path:`${dir}/${name}-inspector-${width}.png`});
  cases.push({width,height,...geometry});
 }
 return cases;
}
