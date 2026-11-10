import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const host='http://127.0.0.1:8088';
const failed=[];
async function check(path,fn){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
 try{const r=await page.goto(host+path,{waitUntil:'domcontentloaded',timeout:20000});assert.equal(r.status(),200);await fn(page);assert.deepEqual(jsErrors,[]);console.log('BLOG_BROWSER_PASS',path)}
 catch(e){failed.push({path,error:String(e.message).slice(0,250)});console.log('BLOG_BROWSER_FAIL',path,String(e.message).slice(0,250))}
 finally{await page.close()}
}
for(const [lang,prefix] of [['ko','/blog/'],['en','/en/blog/']]){
 await check(prefix,async p=>{
  assert.equal(await p.locator('html').getAttribute('lang'),lang);
  assert.equal(await p.locator('.tile').count(),10);
  assert.ok(await p.locator('head link[rel=canonical]').count());
 });
 const hrefs=['photo-file-size-guide','pdf-merge-reorder-guide','recurring-bank-payments-guide','shift-pattern-to-calendar','guest-wifi-qr-card','bulk-rename-photos-files','hide-private-info-in-photos','seller-item-profit-guide','fix-csv-empty-rows','straighten-document-photo'];
 for(const slug of hrefs)await check(prefix+slug+'/',async p=>{
  assert.equal(await p.locator('html').getAttribute('lang'),lang);
  assert.equal(await p.locator('article ol li').count(),3);
  assert.equal(await p.locator('.cta a').count(),1);
  assert.ok(await p.locator('head link[hreflang=ko]').count());
  assert.ok(await p.locator('head link[hreflang=en]').count());
 });
}
for(const [path,nav] of [['/','/blog/'],['/en/','/en/blog/']])await check(path,async p=>{
 assert.ok(await p.locator('a[href="'+nav+'"]').count());
 const cards=p.locator('#toolGrid .tool');
 assert.ok(await cards.count()>15);
 const sizes=await cards.evaluateAll(xs=>xs.slice(0,5).map(x=>[x.getBoundingClientRect().width,x.getBoundingClientRect().height]));
 assert.ok(sizes.every(s=>s[0]<205&&s[1]<185),JSON.stringify(sizes));
});
await browser.close();
console.log('BLOG_BROWSER_SUMMARY',JSON.stringify({failed:failed.length,errors:failed}));
if(failed.length)process.exitCode=1;
