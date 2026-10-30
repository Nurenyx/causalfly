// Focused offline production UI review. No real provider request is allowed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const fixture=JSON.parse(fs.readFileSync('tmp/evidence-fixtures.json','utf8'));
const internal=process.argv.includes('--internal');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const errors=[], actions=[];page.on('pageerror',e=>errors.push(e.message));
 let releaseDesign, designArrived;
 const designRequested=new Promise(resolve=>{designArrived=resolve;});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(!['localhost','127.0.0.1'].includes(url.hostname))return route.abort();
  if(!url.pathname.startsWith('/api/') || url.pathname==='/api/health')return route.continue();
  assert.equal(url.pathname,'/api/experiments');
  const body=route.request().postDataJSON();actions.push(body.action);
  if(body.action==='design') { releaseDesign=()=>route.fulfill({json:fixture.design});designArrived();return; }
  assert.equal(body.action,'run');return route.fulfill({json:fixture.run});
 });
 await page.goto('http://127.0.0.1:3143',{waitUntil:'domcontentloaded'});
 await page.getByRole('navigation',{name:'Experiment workspaces'}).getByRole('button',{name:'Experiment',exact:true}).click();
 assert.deepEqual(actions,[],'Navigation must not call Meta');
 await page.getByRole('button',{name:/Ask Your Own Question/}).click();
 await page.getByRole('textbox',{name:'Your research question'}).fill(fixture.design.design.researchQuestion);
 await page.getByRole('button',{name:'USE THIS QUESTION',exact:true}).click();
 await page.getByRole('button',{name:/Design with Meta/}).evaluate(button=>{button.click();button.click();});
 await designRequested;
 await page.waitForTimeout(150);
 assert.deepEqual(actions,['design'],'Double submission must generate one API request');
 await releaseDesign();
 await page.getByRole('button',{name:'Approve & Run Experiment',exact:true}).waitFor();
 assert.deepEqual(actions,['design'],'Design never runs the engine');
 await page.getByRole('button',{name:'Approve & Run Experiment',exact:true}).click();
 await page.getByRole('group',{name:'Select recorded condition'}).waitFor();
 await page.getByRole('navigation',{name:'Experiment workspaces'}).getByRole('button',{name:'Evidence',exact:true}).click();
 assert.match(await page.locator('main').innerText(),/EXPERIMENT TRUST/);
 assert.equal(await page.getByRole('button',{name:'EXPORT RUN DIAGNOSTICS',exact:true,includeHidden:true}).count(),internal?1:0);
 await page.locator('.run-diagnostics > summary').first().click();
 assert.match(await page.locator('.run-diagnostics').first().innerText(),/Technical details \/ Flight Recorder/);
 if(internal) {
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'EXPORT RUN DIAGNOSTICS',exact:true}).click()]);
  const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(exported.schemaVersion,'causalfly-flight-recorder-v1');
  assert.deepEqual(exported.manifest.measurements,fixture.run.result.diagnostics.manifest.measurements);
  assert.equal(exported.manifest.run_id,fixture.run.result.run_id);
 }
 assert.deepEqual(errors,[]);
 const result={internal,actions,duplicateSuppression:true,designAwaitingApproval:true,provenanceVisible:true,rawExportVisible:internal,exportDownloadVerified:internal,errors,liveProviderCalls:0};
 fs.mkdirSync('docs/review/sprint-11b/meta-design',{recursive:true});
 fs.writeFileSync(`docs/review/sprint-11b/meta-design/browser-${internal?'internal':'production'}.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
} finally {await browser.close();}
