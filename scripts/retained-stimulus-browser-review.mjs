import assert from "node:assert/strict";
import { tsImport } from "tsx/esm/api";
const { extractFeatures } = await tsImport("../src/lib/perception/features.ts", import.meta.url);

/** Authored geometry for the human's displayed 0.488 state; not new live SAM evidence. */
export function humanRecoveryMeasurement(media) {
 const boxes=media.frameTimes.map((_,frameIndex)=>{
  const fraction=frameIndex/(media.frameTimes.length-1),area=0.08+0.244*fraction;
  const width=media.width*(0.25+0.25*fraction),height=area*media.width*media.height/width;
  return {frameIndex,left:(media.width-width)/2,right:(media.width+width)/2,top:(media.height-height)/2,bottom:(media.height+height)/2};
 });
 return extractFeatures("0",boxes,media);
}

export async function reviewRetainedStimulusRecovery(video,context,base,dir,analysis) {
 const question="What happens if I silence the primary pathway?";
 const counters={authorization:0,put:0,muse:0,sam:0,run:0};const actions=[];
 const before=JSON.parse(await video.locator('.perception-details pre').textContent());
 assert.equal(before.measurement.amplitude.toFixed(3),"0.488");
 assert.equal(await video.locator('.scene-candidates input:checked').count(),1);
 const seed=await(await video.request.post(base+'/api/experiments',{data:{action:'design',researchQuestion:question}})).json();assert.ok(seed.ok);
 // Authored response fixture isolates browser state; server tests independently verify real signed receipts across a new process.
 const fresh={...seed.design,id:crypto.randomUUID(),perceptionInput:analysis.perception,spec:{...seed.design.spec,stimulus:{amplitude:analysis.perception.measurement.amplitude}},diagnostics:undefined};
 const experiments=async route=>{
  const body=route.request().postDataJSON();actions.push(body.action);
  if(body.action==='stimulus')return route.fulfill({status:400,json:{ok:false,kind:'validation',code:'DESIGN_UNAVAILABLE',retainedStimulusReceipt:{id:analysis.perception.id,receipt:'migrated-recovery-fixture-receipt'},error:'This design expired or the server restarted. Design the experiment again; displayed evidence remains available for inspection.'}});
  if(body.action==='design'){
   assert.equal(body.researchQuestion,question);assert.equal(body.perceptionId,analysis.perception.id);assert.equal(body.perceptionReceipt,'migrated-recovery-fixture-receipt');
   assert.equal(body.id,undefined);assert.equal(body.nextFromId,undefined);assert.equal(body.stimulusAmplitude,undefined);
   return route.fulfill({json:{ok:true,design:fresh}});
  }
  if(body.action==='run')counters.run++;
  return route.abort();
 };
 const guards=[];
 for(const [pattern,key] of [['**/api/media/authorize','authorization'],['**/api/perception/scene','muse'],['**/api/perception','sam'],['https://vercel.com/api/blob/**','put']]){
  const handler=route=>{counters[key]++;return route.abort();};guards.push([pattern,handler]);await context.route(pattern,handler);
 }
 await context.route('**/api/experiments',experiments);
 await video.getByRole('button',{name:'DESIGN EXPERIMENT WITH THIS PROXY',exact:true}).click();
 await video.getByText('Proxy retained. The previous experiment design expired, so create a new design using this experimental proxy.',{exact:true}).waitFor();
 const designButton=video.getByRole('button',{name:'DESIGN EXPERIMENT WITH THIS PROXY',exact:true});await designButton.waitFor();
 assert.equal(await video.locator('.error-panel,.workflow-error-notice,.perception-error').count(),0,'No terminal error or loss-of-analysis presentation');
 assert.equal(await video.locator('.scene-candidates input:checked').count(),1,'Selected Muse candidate survives stale-design recovery');
 await video.locator('.perception-player canvas').waitFor();
 assert.deepEqual(JSON.parse(await video.locator('.perception-details pre').textContent()),before,'All retained SAM geometry/provenance remains unchanged');
 assert.deepEqual(actions,['stimulus'],'Recovery offers fresh design without automatically calling a model or approving a run');
 assert.deepEqual(counters,{authorization:0,put:0,muse:0,sam:0,run:0});
 await video.screenshot({path:`${dir}/retained-stimulus-recovery-offered-1920.png`,fullPage:true});
 await designButton.click();await video.getByRole('button',{name:/APPROVE.*RUN/i}).first().waitFor();
 assert.deepEqual(actions,['stimulus','design']);assert.equal(await video.locator('.guided-experiment-flow').getAttribute('data-measured'),'false');
 assert.equal(await video.getByRole('button',{name:/APPROVE.*RUN/i}).first().isEnabled(),true,'New design still awaits explicit approval');
 assert.deepEqual(counters,{authorization:0,put:0,muse:0,sam:0,run:0});
 await video.screenshot({path:`${dir}/retained-stimulus-fresh-design-awaiting-approval-1920.png`,fullPage:true});
 await context.unroute('**/api/experiments',experiments);
 for(const [pattern,handler] of guards)await context.unroute(pattern,handler);
 return {name:'retained-stimulus-stale-design-recovery',fixtureOnly:true,questionRetained:true,measuredStimulus:0.488,perceptionEvidenceUnchanged:true,selectedCandidateRetained:true,actions,counters,freshDesignOffered:true,freshDesignCreated:true,approvalRequired:true};
}
