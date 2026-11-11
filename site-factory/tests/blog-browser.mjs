import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
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
const contentDir='site-factory/content/blog';
const jsonFiles=(await readdir(contentDir)).filter(name=>name.endsWith('.json'));
const posts=(await Promise.all(jsonFiles.map(async name=>JSON.parse(await readFile(contentDir+'/'+name,'utf8'))))).filter(post=>post.status==='reviewed');
const infoSet=new Set(posts.filter(post=>post.type==='information').map(post=>post.slug));
const hrefs=posts.map(post=>post.slug);
assert.equal(new Set(hrefs).size,hrefs.length,'Duplicate article slugs');
for(const [lang,prefix] of [['ko','/blog/'],['en','/en/blog/']]){
 await check(prefix,async p=>{
  assert.equal(await p.locator('html').getAttribute('lang'),lang);
  assert.equal(await p.locator('#articleGrid .tile').count(),posts.length-1); // Featured lead article renders outside the grid
  assert.ok(await p.locator('.featured img').count()===1);
  assert.ok(await p.locator('#articleSearch').count()===1);
  assert.ok(await p.locator('head link[rel=canonical]').count());
  const boxes=p.locator('.filters button');
  assert.ok(await boxes.count()>3);
  await p.locator('#articleSearch').fill('no-such-article-zzzz');
  assert.equal(await p.locator('#articleGrid .tile:visible').count(),0);
  assert.ok(await p.locator('#noResults').isVisible());
  await p.locator('#articleSearch').fill('');
  await p.locator('button[data-filter=knowledge]').click();
  assert.ok(await p.locator('#articleGrid .tile:visible').count()>=2);
  await p.locator('button[data-filter=all]').click();
 });
 for(const slug of hrefs)await check(prefix+slug+'/',async p=>{
  assert.equal(await p.locator('html').getAttribute('lang'),lang);
  assert.ok(await p.locator('article ol.steps li').count()>=3);
  assert.equal(await p.locator('.cta a').count(),infoSet.has(slug)?0:1);
  assert.equal(await p.locator('article figure.hero img').count(),1);
  const img=p.locator('article figure.hero img');
  assert.ok((await img.getAttribute('alt')).trim().length>=18,'Descriptive localized image alt text required');
  assert.match(await img.getAttribute('src'),/^https:\/\/images\.unsplash\.com\/photo-/);
  assert.equal(await p.locator('article figure.hero figcaption a[href^="https://unsplash.com/photos/"]').count(),1);
  assert.ok(await p.locator('head meta[property="og:image"]').count());
  assert.ok(await p.locator('head link[hreflang=ko]').count());
  assert.ok(await p.locator('head link[hreflang=en]').count());
  assert.equal(await p.locator('script[type="application/ld+json"]').count(),2);
  if(infoSet.has(slug))assert.ok(await p.locator('#sources ~ ul.sources li').count()>0);
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
