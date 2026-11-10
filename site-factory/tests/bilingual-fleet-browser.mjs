import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const native=["privacy-redactor","submission-auditor","shift-calendar","worktime-analyzer","label-sheet-maker","cut-plan-optimizer","recurring-payment-finder","meal-timeline","handover-checklist","group-order-summary","image-compress-lab","pdf-page-workshop","bulk-file-renamer","room-layout-planner","quote-document-maker","warranty-deadline-tracker","share-qr-card","seller-profit-math","color-contrast-audit","document-scan-studio"];const work=["audio-quality","certificate-batch","class-schedule-check","detail-image-review","dst-embroidery","epub-preflight","event-seating","exam-variants","inventory-diff","invoice-reconcile","lease-registry-diff","move-evidence","moving-boxes","option-combinations","pdf-preflight","photo-contact-sheet","photo-duplicates","purchase-three-way","question-similarity","shipping-audit","shotlist-maker","show-cues","silence-finder","static-site-check","survey-review","svg-laser-check","tournament-maker","trip-supplies","video-delivery-check","webtoon-preflight"];
const browser=await chromium.launch({headless:true});const failures=[];
async function check(slug,type){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const url=type==='hub'?'http://127.0.0.1:8088/en/tools/'+slug+'/':'http://127.0.0.1:8089/'+slug+'/public/en/';
  const issues=[];page.on('pageerror',e=>issues.push(e.message));
  try{
    const resp=await page.goto(url+'?tb_test=1',{waitUntil:'domcontentloaded',timeout:20000});assert.equal(resp.status(),200);
    await page.waitForTimeout(150);
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    const title=await page.title(),heading=(await page.locator('h1').first().textContent()).trim();
    assert.ok(!/[가-힣]/.test(title),'Korean title: '+title);
    assert.ok(!/[가-힣]/.test(heading),'Korean heading: '+heading);
    assert.ok((await page.locator('head link[rel=canonical]').getAttribute('href')).includes('/en/'),'English canonical missing');
    assert.ok(await page.locator('head link[hreflang=ko]').count());
    assert.ok(await page.locator('head link[hreflang=en]').count());
    assert.ok(await page.locator('.tb-editorial').count());
    assert.ok(await page.locator('a[hreflang=ko]').count());
    assert.ok(await page.locator('button').count()>0,'No tool controls');
    assert.ok(await page.locator('input,select,textarea').count()>0,'No input controls');
    assert.equal(issues.length,0,issues.join(' | '));
    // The language layer must not break interactions and local file selection.
    if(type==='hub'&&slug==='room-layout-planner'){
       await page.locator('#add').click();assert.match(await page.locator('#status').textContent(),/1|one/);
    }
    if(type==='hub'&&slug==='seller-profit-math'){
       await page.locator('#calc').click();assert.ok((await page.locator('#result').textContent()).length>30);
    }
    if(type==='hub'&&slug==='color-contrast-audit'){
       await page.locator('#check').click();assert.match(await page.locator('#result').textContent(),/21.00|contrast/i);
    }
    console.log('BILINGUAL_QA_PASS',slug,type);
  }catch(e){failures.push({slug,type,error:String(e.message||e).slice(0,400)});console.log('BILINGUAL_QA_FAIL',slug,String(e.message||e).slice(0,300))}
  finally{await page.close()}
}
for(const slug of native)await check(slug,'hub');
for(const slug of work)await check(slug,'work');
await browser.close();
console.log('BILINGUAL_QA_SUMMARY',JSON.stringify({passed:50-failures.length,failed:failures.length,failures}));
if(failures.length)process.exitCode=1;
