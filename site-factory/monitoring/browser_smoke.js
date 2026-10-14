#!/usr/bin/env node
'use strict';
/* Read-only, credential-free browser checks against live Small Toolbox sites. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const flag=process.argv.indexOf('--output'),destination=flag>=0?process.argv[flag+1]:'/tmp/browser-report.json';
const checkItems=[];
const origin=s=>'https://'+s+'.pages.dev/';
let browser=null;
const wait=ms=>new Promise(done=>setTimeout(done,ms));
const assert=(predicate,msg)=>{if(!predicate)throw Error(msg)};
async function check(name,url,device,run){
 let context;
 const start=Date.now();
 try{
  context=await browser.newContext(device==='mobile'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1280,height:850}});
  const page=await context.newPage();page.setDefaultTimeout(14000);
  let response;
  for(let i=0;i<2;i++){
    try{response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});if(response?.status()!==200)throw Error('HTTP '+(response?.status()||'missing'));break}
    catch(e){if(i===1)throw e;await wait(1600)}
  }
  const detail=await run(page);
  checkItems.push({name,url,device,status:'pass',detail:String(detail).slice(0,200),elapsedMs:Date.now()-start});
  console.log('PASS',device,name);
 }catch(e){
  checkItems.push({name,url,device,status:'fail',detail:String(e.message||e).slice(0,350),elapsedMs:Date.now()-start});
  console.error('FAIL',device,name,String(e.message||e));
 }finally{await context?.close()}
}
function finalize(extraFailure){
 if(extraFailure)checkItems.push({name:'browser_startup',status:'fail',detail:String(extraFailure).slice(0,350)});
 const summary={total:checkItems.length,passed:checkItems.filter(x=>x.status==='pass').length,failed:checkItems.filter(x=>x.status==='fail').length};
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 fs.writeFileSync(destination,JSON.stringify({schemaVersion:1,checkedAt:new Date().toISOString(),summary,checks:checkItems},null,2)+'\n');
 console.log('Browser smoke:',summary.passed,'passed /',summary.failed,'failed');
 if(summary.failed)process.exitCode=1;
}
(async()=>{
 browser=await chromium.launch({headless:true});
 const novel=origin('tb-novel-planner'),lens=origin('tb-manuscript-lens'),csv=origin('tb-csv-merge-studio');
 await check('Korean plot planner',novel,'desktop',async page=>{
  await page.locator('#epTitle').fill('자동 테스트 회차');await page.locator('#addEp').click();
  assert((await page.locator('#episodes').innerText()).includes('자동 테스트 회차'),'Chapter not saved');
  await page.locator('#clue').fill('수수께끼');await page.locator('#addClue').click();
  assert((await page.locator('#alerts').innerText()).includes('수수께끼'),'Unresolved clue missing');
  return 'Local chapter and plot thread functions';
 });
 await check('English plot planner',novel+'en/','mobile',async page=>{
  await page.locator('#epTitle').fill('The First Chapter');await page.locator('#addEp').click();
  await page.locator('#person').fill('Mira');await page.locator('#addPerson').click();
  assert((await page.locator('#episodes').innerText()).includes('The First Chapter'),'English chapter missing');
  assert((await page.locator('#people').innerText()).includes('Mira'),'English character missing');
  return 'English chapter and character saved locally on mobile';
 });
 await check('Korean manuscript',lens,'desktop',async page=>{
  await page.locator('#source').fill('서연은 서연은 서연은 문을 열었다.\n\n“누구세요?”');
  await page.locator('#analyze').click();
  assert((await page.locator('#repeats').innerText()).includes('서연은'),'Repeated Korean phrase missing');
  return 'Korean word repetition detection';
 });
 await check('English manuscript',lens+'en/','mobile',async page=>{
  await page.locator('#source').fill('The door opened. The door creaked. The door shut.');
  await page.locator('#analyze').click();
  assert((await page.locator('#repeats').innerText()).includes('door'),'Repeated English word missing');
  await page.locator('#needle').fill('door');await page.locator('#find').click();
  assert((await page.locator('#matches').innerText()).includes('Match 1'),'Phrase search failed');
  return 'English phrase search and repetition detection';
 });
 await check('Korean CSV merger',csv,'desktop',async page=>{
  await page.locator('#demoBtn').click();await page.locator('#mergeBtn').click();
  assert(await page.locator('#preview tbody tr').count()===3,'Expected 3 unique rows');
  return 'CSV header mapping and deduplication';
 });
 await check('English CSV merger',csv+'en/','mobile',async page=>{
  await page.locator('#demoBtn').click();await page.locator('#mergeBtn').click();
  assert(await page.locator('#preview tbody tr').count()===3,'Expected 3 unique English CSV rows');
  return 'English CSV header mapping and deduplication';
 });
 await check('Haru English landing','https://my-daily-life.pages.dev/en/','mobile',async page=>{
  await page.getByRole('heading',{name:/better routine/i}).waitFor();
  assert((await page.title()).includes('Habit'),'English title missing');
  const width=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert(width<=430,'Horizontal overflow on mobile: '+width);
  return 'English landing search content and mobile layout';
 });
 await check('Haru English app','https://my-daily-life.pages.dev/en/app/','mobile',async page=>{
  await page.locator('#authForm').waitFor();
  await page.getByText('Log in',{exact:true}).first().waitFor({timeout:14000});
  return 'Unauthenticated English login displayed';
 });
 await check('Admin authentication gate',origin('tb-toolbox-admin'),'mobile',async page=>{
  await page.locator('#adminLoginForm').waitFor();
  assert(await page.locator('#adminGate').isVisible(),'Login gate hidden');
  assert(!(await page.locator('.app-shell').isVisible()),'Admin private UI visible');
  return 'Owner login required before dashboard rendering';
 });
 await check('Toolbox hub search','https://tb-toolbox-hub.pages.dev/','mobile',async page=>{
  await page.locator('#toolSearch').fill('CSV');
  assert(await page.locator('.tool:visible').count()===1,'Hub search should find CSV tool');
  assert((await page.locator('.tool:visible').innerText()).includes('CSV'),'Wrong result');
  return 'Curated live site directory with working search';
 });
 await check('Technical deployment smoke',origin('tb-deployment-check'),'desktop',async page=>{
  await page.locator('#run').click();
  assert((await page.locator('#output').innerText()).trim().length>0,'JS transform did not run');
  return 'Deployment-check JavaScript functional';
 });
 await browser.close();finalize();
})().catch(async e=>{console.error(e);try{await browser?.close()}catch{}finalize(e.message||String(e))});
