import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const failures=[];
async function check(slug,fn){
 const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
 try{
  const r=await page.goto('https://abreda.com/tools/'+slug+'/?tb_test=1',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(r.status(),200,'HTTP');
  await page.locator('#status').waitFor();
  await page.waitForFunction(()=>typeof document.getElementById('status')!=='undefined');
  await fn(page);
  console.log('BROWSER_PASS '+slug);
 }catch(e){failures.push({slug,error:String(e.message||e).slice(0,350)});console.error('BROWSER_FAIL '+slug+' '+String(e.message||e).slice(0,350))}finally{await page.close()}
}
await check('privacy-redactor',async p=>{
 const img=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=80;const x=c.getContext('2d');x.fillStyle='#dddddd';x.fillRect(0,0,80,80);return c.toDataURL('image/png').split(',')[1]});
 await p.locator('#image').setInputFiles({name:'qa.png',mimeType:'image/png',buffer:Buffer.from(img,'base64')});
 await p.waitForFunction(()=>document.querySelector('#canvas').width===80);
 const r=await p.locator('#canvas').boundingBox();assert.ok(r);
 await p.mouse.move(r.x+r.width*.15,r.y+r.height*.15);await p.mouse.down();await p.mouse.move(r.x+r.width*.7,r.y+r.height*.7,{steps:4});await p.mouse.up();
 assert.match(await p.locator('#status').textContent(),/가린 영역: 1개/);
 const download=p.waitForEvent('download');await p.locator('#download').click();assert.equal((await download).suggestedFilename(),'private-redacted.png');
});
await check('submission-auditor',async p=>{
 await p.locator('#needed').fill('지원서.pdf');
 await p.locator('#files').setInputFiles([{name:'지원서.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 QA')}]);
 await p.locator('#check').click();assert.match(await p.locator('#result').textContent(),/통과/);
});
await check('shift-calendar',async p=>{
 await p.locator('#make').click();assert.equal(await p.locator('#result details').count(),12);
 assert.match(await p.locator('#status').textContent(),/근무표/);
});
await check('worktime-analyzer',async p=>{
 await p.locator('#steps').fill('준비\n작업');
 await p.locator('#start').click();await p.locator('#mark').click();await p.locator('#mark').click();
 assert.match(await p.locator('#status').textContent(),/완료/);assert.match(await p.locator('#result').textContent(),/준비/);
});
await check('label-sheet-maker',async p=>{
 await p.locator('#text').fill('QA');await p.locator('#make').click();
 assert.equal(await p.locator('.sheet').count(),1);assert.match(await p.locator('#result').textContent(),/QA/);
});
await check('cut-plan-optimizer',async p=>{
 await p.locator('#pieces').fill('600,300,2');await p.locator('#calc').click();
 assert.ok(await p.locator('#result svg rect').count()>=2);assert.match(await p.locator('#status').textContent(),/조각 2개/);
});
await check('recurring-payment-finder',async p=>{
 await p.locator('#file').setInputFiles({name:'qa.csv',mimeType:'text/csv',buffer:Buffer.from('date,merchant,amount\n2026-01-15,TEST,9900\n2026-02-15,TEST,9900\n')});
 await p.locator('#find').click();console.log('RECURRING_DEBUG',JSON.stringify({status:await p.locator('#status').textContent(),result:await p.locator('#result').textContent()}));assert.match(await p.locator('#result').textContent(),/test/);
});
await check('meal-timeline',async p=>{
 await p.locator('#dishes').fill('밥,10,30');await p.locator('#make').click();
 assert.ok(await p.locator('#result tr').count()>=4);assert.match(await p.locator('#status').textContent(),/생성 완료/);
});
await check('handover-checklist',async p=>{
 await p.locator('#items').fill('본체\n충전기');await p.locator('#create').click();
 await p.locator('#checklist input').first().check();await p.locator('#report').click();
 assert.match(await p.locator('#result').textContent(),/본체/);
});
await check('group-order-summary',async p=>{
 await p.locator('#name').fill('QA');await p.locator('#menu').fill('커피');await p.locator('#qty').fill('2');await p.locator('#price').fill('3000');
 await p.locator('#add').click();await p.locator('#summary').click();
 assert.match(await p.locator('#result').textContent(),/6,000원/);
});
await browser.close();
console.log('BROWSER_SMOKE_SUMMARY '+JSON.stringify({passed:10-failures.length,failed:failures.length,failures}));
if(failures.length)process.exitCode=1;
