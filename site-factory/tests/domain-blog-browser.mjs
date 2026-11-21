import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const xml=execFileSync('curl',['-fsS','--max-time','25','https://abreda.com/sitemap.xml'],{encoding:'utf8'});
const urls=[...xml.matchAll(/<loc>([^<]+\/blog\/[^<]*)<\/loc>/g)].map(m=>m[1]);
assert(urls.length>0,'no blog pages');
const browser=await chromium.launch({headless:true});const results=[];
for(const url of urls){
 const p=await browser.newPage({viewport:{width:390,height:844}});
 try{
  const r=await p.goto(url+'?tb_test=1',{waitUntil:'domcontentloaded'});assert.equal(r.status(),200);
  assert.equal(await p.locator('link[rel=canonical]').getAttribute('href'),url);
  assert.equal(await p.locator('html').getAttribute('lang'),url.includes('/en/')?'en':'ko');
  assert.equal(await p.locator('h1').count(),1);
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'horizontal overflow');
  assert.equal(await p.locator('img:not([alt]),img[alt=""]').count(),0);
  assert.equal(await p.locator('a[href*="tb-"][href*="pages.dev"]').count(),0,'old tool link');
  results.push({url,status:'pass',scope:'mobile layout, metadata, image ALT, migrated tool links'});
 }catch(e){results.push({url,status:'fail',error:e.message})}finally{await p.close()}
}
const p=await browser.newPage();await p.goto('https://abreda.com/en/tools/subtitle-sync-studio/?tb_test=1');
for(const path of ['privacy','terms'])assert(await p.locator('a[href="https://abreda.com/en/'+path+'"]').count(),'English '+path+' link');
await browser.close();await fs.writeFile('/tmp/domain-blog-results.json',JSON.stringify(results,null,2));console.log('DOMAIN_BLOG_RESULTS',JSON.stringify(results));if(results.some(r=>r.status==='fail'))process.exitCode=1;
