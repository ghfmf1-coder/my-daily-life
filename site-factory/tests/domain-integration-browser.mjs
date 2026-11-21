import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const routes=JSON.parse(await fs.readFile('site-factory/ops/domain-routes.json','utf8')).routes;
const base=process.env.HUB_BASE_URL||'https://abreda.com';
const browser=await chromium.launch({headless:true});const results=[];
for(const row of routes)for(const lang of ['ko','en']){
 const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(base.startsWith('http://127.0.0.1'))await page.route('https://abreda.com/**',async route=>{const u=new URL(route.request().url());const response=await route.fetch({url:base+u.pathname+u.search});await route.fulfill({response})});
 try{
  const path=new URL(row[lang+'_url']).pathname;
  const response=await page.goto(base+path+'?tb_test=1',{waitUntil:'networkidle'});assert.equal(response.status(),200);
  assert.equal(await page.locator('html').getAttribute('lang'),lang);
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),row[lang+'_url']);
  assert.equal(await page.locator('link[hreflang='+lang+']').getAttribute('href'),row[lang+'_url']);
  assert(await page.locator('h1').count());assert(await page.locator('input,textarea,select').count());
  const other=lang==='ko'?'en':'ko';assert(await page.locator('a[href="'+row[other+'_url']+'"]').count(),'language link missing');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'mobile page overflow');
  if(row.source==='factory'){
   if(row.slug==='subtitle-sync-studio'){
    assert(await page.locator('#saveBtn').isDisabled());
    await page.locator('#pasteText').fill('1\n00:00:01,000 --> 00:00:02,000\nQA subtitle\n');await page.locator('#loadPaste').click();
    await page.locator('#offset').fill('1');await page.locator('#applyOffset').click();
    const d=page.waitForEvent('download');await page.locator('#saveBtn').click();const file=await d;const data=await fs.readFile(await file.path(),'utf8');assert(data.includes('00:00:02')&&data.includes('QA subtitle'));
   }else{
    await page.locator('#model').fill('QA-domain-migration');await page.locator('#generate').click();
    const d=page.waitForEvent('download');await page.locator('#download').click();const file=await d;const data=await fs.readFile(await file.path(),'utf8');assert(data.includes('QA-domain-migration'));
   }
  }
  if(row.slug==='shipping-audit'){
   assert(await page.locator('#download').isDisabled());await page.locator('#demo').click();await page.locator('#run').click();
   const d=page.waitForEvent('download');await page.locator('#download').click();const file=await d;assert((await fs.readFile(await file.path())).length>20);
  }
  assert.deepEqual(errors,[]);results.push({slug:row.slug,lang,status:'pass',core:row.source==='factory'||row.slug==='shipping-audit'});
 }catch(e){results.push({slug:row.slug,lang,status:'fail',error:String(e.message).slice(0,400)})}finally{await page.close()}
}
await browser.close();await fs.writeFile('/tmp/domain-browser-results.json',JSON.stringify(results,null,2));
console.log('DOMAIN_BROWSER_RESULTS',JSON.stringify(results));if(results.some(x=>x.status==='fail'))process.exitCode=1;
