import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import {readdir,readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const host='http://127.0.0.1:8088';
const failed=[];
async function check(path,fn){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 // Production-equivalent builds use canonical absolute tool asset URLs; map those requests to the local QA build rather than the older live site.
 await page.route('https://abreda.com/tools/**',async route=>{const u=new URL(route.request().url());if(!/\.(?:js|css|svg|png|ico)$/.test(u.pathname))return route.continue();const response=await route.fetch({url:host+u.pathname+u.search});await route.fulfill({response});});
 const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
 try{const r=await page.goto(host+path,{waitUntil:'domcontentloaded',timeout:20000});assert.equal(r.status(),200);await fn(page);assert.deepEqual(jsErrors,[]);console.log('BLOG_BROWSER_PASS',path)}
 catch(e){failed.push({path,error:String(e.message).slice(0,250)});console.log('BLOG_BROWSER_FAIL',path,String(e.message).slice(0,250))}
 finally{await page.close()}
}
const contentDir='site-factory/content/blog';
const jsonFiles=(await readdir(contentDir)).filter(name=>name.endsWith('.json'));
const posts=(await Promise.all(jsonFiles.map(async name=>JSON.parse(await readFile(contentDir+'/'+name,'utf8'))))).filter(post=>post.status==='reviewed');
const infoSet=new Set(posts.filter(post=>post.type==='information').map(post=>post.slug));
const independentSet=new Set(posts.filter(post=>post.independent_locales).map(post=>post.slug));
const hrefs=posts.map(post=>post.slug);
assert.equal(new Set(hrefs).size,hrefs.length,'Duplicate article slugs');
for(const [lang,prefix] of [['ko','/blog/'],['en','/en/blog/']]){
 await check(prefix,async p=>{
  assert.equal(await p.locator('html').getAttribute('lang'),lang);
  assert.ok(await p.locator('#articleGrid .tile').count()>=posts.length-1); // Tool-specific articles are also included in the grid
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
  assert.match(await p.locator('article figure.hero figcaption').innerText(),/사진 출처|Photo source/i);
  assert.ok(await p.locator('head meta[property="og:image"]').count());
  if(independentSet.has(slug)){
   assert.equal(await p.locator('head link[hreflang]').count(),0);
   assert.equal(await p.locator('.article-bottom a[hreflang]').count(),0);
  }else{
   assert.ok(await p.locator('head link[hreflang=ko]').count());
   assert.ok(await p.locator('head link[hreflang=en]').count());
  }
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
// Full consumer release: bilingual controls, calculation outputs, photo identity and PDF output.
const fixtures=[
 ['unit-price-calculator',{a:'5000',aq:'500',b:'7200',bq:'900',unit:'100'},'B'],
 ['discount-coupon-calculator',{a:'10000',ar:'20',ac:'1000',as:'3000',b:'9000',br:'10',bc:'0',bs:'0'},'B'],
 ['business-days-calculator',{start:'2026-11-23',end:'2026-11-29',include:'yes',holidays:'2026-11-25\n2026-11-25\n2026-11-28'},'4'],
 ['appliance-energy-calculator',{watts:'1000',hours:'3',days:'30',rate:'200'},'18,000'],
 ['text-to-columns-converter',{input:'"a,b",c\nx,,y',delimiter:'comma'},'a,b\tc\nx\t\ty'],
 ['dimensional-weight-calculator',{l:'40',w:'30',h:'20',kg:'3',divisor:'5000'},'4.8'],
 ['recipe-serving-calculator',{from:'2',to:'5',items:'flour,200,g\negg,2,item'},'flour (g): 500'],
 ['file-transfer-time-calculator',{size:'1',unit:'GB',speed:'100'},'80'],
 ['fuel-cost-calculator',{distance:'150',economy:'15',price:'1700',mode:'metric'},'17,000']
];
const fixtureTools=[...fixtures.map(row=>row[0]),'pdf-compressor'];
const toolPosts=await Promise.all(fixtureTools.map(s=>readFile('site-factory/sites/'+s+'/blog.json','utf8').then(JSON.parse)));
const allNew=[...toolPosts,...posts.filter(p=>p.published>='2026-11-28')];
const newPhotoIds=new Set();
for(const [lang,prefix] of [['ko','/'],['en','/en/']]){
 for(const [tool,values,expected] of fixtures){
  await check(prefix+'tools/'+tool+'/',async p=>{
   assert.equal(await p.locator('html').getAttribute('lang'),lang);
   for(const [k,v] of Object.entries(values)){
    const el=p.locator('#'+k);
    if(await el.evaluate(e=>e.tagName)==='SELECT')await el.selectOption(v);
    else await el.fill(v);
   }
   await p.locator('#toolForm button[type=submit]').click();
   await p.waitForFunction(()=>document.getElementById('out').textContent.length>0);
   assert.ok((await p.locator('#out').innerText()).includes(expected),'Incorrect calculator output');
   await p.locator('#toolForm button[type=reset]').click();
   assert.equal(await p.locator('#out').innerText(),'');
  });
 }
 // Use a reproducible synthetic two-page image document, never a user's document.
 await check(prefix+'tools/pdf-compressor/',async p=>{
  const image=await p.evaluate(()=>{
   const c=document.createElement('canvas');c.width=1200;c.height=1600;const x=c.getContext('2d');
   const d=x.createImageData(c.width,c.height);let seed=12345;
   for(let i=0;i<d.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;let n=(seed>>>24);d.data[i]=n;d.data[i+1]=n;d.data[i+2]=n;d.data[i+3]=255}
   x.putImageData(d,0,0);return c.toDataURL('image/jpeg',.98);
  });
  const original=await PDFDocument.create();const jpg=await original.embedJpg(image);
  for(let i=0;i<2;i++){let page=original.addPage([612,792]);page.drawImage(jpg,{x:0,y:0,width:612,height:792});}
  const source=await original.save();
  await p.locator('#pdf').setInputFiles({name:'synthetic-scan.pdf',mimeType:'application/pdf',buffer:Buffer.from(source)});
  await p.locator('#dpi').selectOption('96');await p.locator('#quality').selectOption('0.45');
  await p.locator('#confirm').check();await p.locator('#run').click();
  await p.locator('#download').waitFor({state:'visible',timeout:90000});
  const output=Uint8Array.from(await p.evaluate(async()=>Array.from(new Uint8Array(await (await fetch(document.getElementById('download').href)).arrayBuffer()))));
  const result=await PDFDocument.load(output);
  assert.equal(result.getPageCount(),2);
  assert.deepEqual(result.getPage(0).getSize(),{width:612,height:792});
  assert.ok(output.byteLength<source.byteLength,'Synthetic image-heavy fixture was not reduced');
  console.log('PDF_BROWSER_VERIFIED',lang,source.byteLength,output.byteLength);
  await p.locator('#pdf').setInputFiles({name:'corrupt.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a PDF')});
  await p.locator('#run').click();
  await p.waitForFunction(()=>/실패|failed/i.test(document.getElementById('status').textContent),{},{timeout:90000});
  assert.equal(await p.locator('#download').isVisible(),false);
 });
 for(const post of allNew)await check(prefix+'blog/'+post.slug+'/',async p=>{
   const photos=p.locator('article figure.hero img, article figure.article-photo img');
   assert.equal(await photos.count(),3);
   for(const img of await photos.all()){
    const src=(await img.getAttribute('src')).split('?')[0];
    assert.match(src,/^https:\/\/images\.unsplash\.com\/photo-/);
    assert.ok(!newPhotoIds.has(src),'Duplicate new article image');
    newPhotoIds.add(src);
    assert.ok((await img.getAttribute('alt')).trim().length>=15);
   }
   if(post.tool && fixtureTools.includes(post.tool))assert.equal(await p.locator('.cta a').getAttribute('href'),'https://abreda.com'+prefix+'tools/'+post.tool+'/');
   if(post.independent_locales){assert.equal(await p.locator('head link[hreflang]').count(),0);assert.equal(await p.locator('.article-bottom a[hreflang]').count(),0);}
 });
}
await browser.close();
console.log('BLOG_BROWSER_SUMMARY',JSON.stringify({failed:failed.length,errors:failed,newPhotoCount:newPhotoIds.size}));
if(failed.length)process.exitCode=1;
