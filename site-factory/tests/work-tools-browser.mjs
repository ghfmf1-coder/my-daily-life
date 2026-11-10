import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const png=null;const csv=(text,name='qa.csv')=>({name,mimeType:'text/csv',buffer:Buffer.from(text)}),text=(data,name='qa.txt',mimeType='text/plain')=>({name,mimeType,buffer:Buffer.from(data)});
const cases={
'invoice-reconcile':[[csv('invoice,amount\nA,100'),csv('reference,amount\nA,90')],/금액 불일치/],
'purchase-three-way':[[csv('sku,qty,price\nA,1,10'),csv('sku,qty,price\nA,2,10'),csv('sku,qty,price\nA,3,10')],/수량 차이/],
'inventory-diff':[[csv('sku,qty\nA,1'),csv('sku,qty\nA,2')],/수량 불일치/],
'class-schedule-check':[[csv('day,start,end,teacher,room\n월,09:00,10:00,QA,R\n월,09:30,10:30,QA,R')],/중복 배정/],
'certificate-batch':[[csv('name,course,date\nQA,Test,2026-11-10')],/생성 완료/],
'lease-registry-diff':[[text('old'),text('new')],/새로운 문구/],
'event-seating':[[csv('name,group\nQA,G\nQB,G')],/테이블 1/],
'exam-variants':[[csv('question,answer\nQA,A\nQB,B')],/시험지 작성/],
'moving-boxes':[[csv('box,item\n1,QA')],/박스 1/],
'option-combinations':[[csv('product,color,size\nA,red,M\nA,red,M')],/중복 옵션/],
'question-similarity':[[csv('question\nQA question\nQA question')],/중복 의심/],
'shotlist-maker':[[csv('scene,location,cast,props\nQA,B,Q,P\nQB,A,Q,P')],/촬영 1/],
'show-cues':[[csv('cue,time\nQA,10:00\nQB,10:00')],/동시간 배정/],
'static-site-check':[[text('<!doctype html><html><img src="missing.png"></html>','qa.html','text/html')],/로컬 파일 참조 누락/],
'survey-review':[[csv('id,scale\n1,yes\n1,yes')],/번호 중복/],
'svg-laser-check':[[text('<svg xmlns="http://www.w3.org/2000/svg" width="10"><line x1="0" y1="0" x2="0" y2="0"/></svg>','qa.svg','image/svg+xml')],/길이 0인 선/],
'tournament-maker':[[csv('name\nQA\nQB\nQC')],/부전승/],
'trip-supplies':[[csv('item,qty\nQA,9')],/조 1/],
'video-delivery-check':[[csv('filename\nmissing.mp4'),text('filename-only QA fixture','extra.mp4','video/mp4')],/납품 파일 누락/],
'dst-embroidery':[[],/스티치 추정/], 'epub-preflight':[[],/기본 검사 완료/], 'pdf-preflight':[[],/도련/],
'audio-quality':[[],/피크/], 'silence-finder':[[],/무음 후보/],
'webtoon-preflight':[[],/너비 점검/], 'detail-image-review':[[],/너비 점검/],
'photo-contact-sheet':[[],/사진 배치/], 'move-evidence':[[],/사진 배치/], 'photo-duplicates':[[],/완전 중복/]
};
function wav(){const rate=8000,buf=Buffer.alloc(44+rate*2);buf.write('RIFF');buf.writeUInt32LE(buf.length-8,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(rate,24);buf.writeUInt32LE(rate*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(rate*2,40);for(let i=6400;i<rate;i++)buf.writeInt16LE(3000,44+i*2);return {name:'qa.wav',mimeType:'audio/wav',buffer:buf}}
const browser=await chromium.launch({headless:true});const results=[];
for(const [slug,[initial,expected]] of Object.entries(cases)){
 const p=await browser.newPage({acceptDownloads:true,viewport:{width:1200,height:800}}),faults=[];p.on('pageerror',e=>faults.push(e.message));
 try{
  const response=await p.goto('https://tb-'+slug+'.pages.dev/?tb_test=1',{waitUntil:'domcontentloaded',timeout:25000});assert.equal(response.status(),200);await p.locator('#form').waitFor();
  await p.locator('#form button[type=submit]').click();assert(await p.locator('#save').isDisabled(),'missing-file input accepted');
  let files=[...initial];
  if(['webtoon-preflight','detail-image-review','photo-contact-sheet','move-evidence','photo-duplicates'].includes(slug)){const bytes=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;c.getContext('2d').fillRect(0,0,100,100);return Array.from(Uint8Array.from(atob(c.toDataURL().split(',')[1]),c=>c.charCodeAt(0)))});files=[{name:'qa.png',mimeType:'image/png',buffer:Buffer.from(bytes)}];if(slug==='photo-duplicates')files.push({...files[0],name:'qa-copy.png'})}
  if(['audio-quality','silence-finder'].includes(slug))files=[wav()];
  if(slug==='pdf-preflight')files=[{name:'qa.pdf',mimeType:'application/pdf',buffer:await p.pdf()}];
  if(slug==='dst-embroidery'){const buf=Buffer.alloc(518);buf.write('LA:QA');buf[514]=3;buf[517]=0xf3;files=[{name:'qa.dst',mimeType:'application/octet-stream',buffer:buf}]}
  if(slug==='epub-preflight'){const bytes=execFileSync('python3',['-c',"import io,sys,zipfile; b=io.BytesIO(); z=zipfile.ZipFile(b,'w'); z.writestr('mimetype','application/epub+zip'); z.writestr('META-INF/container.xml','<container/>'); z.writestr('content.opf','<package/>'); z.close(); sys.stdout.buffer.write(b.getvalue())"]);files=[{name:'qa.epub',mimeType:'application/epub+zip',buffer:bytes}]}
  const inputs=await p.locator('input[type=file]').count();if(inputs===1)await p.locator('#file0').setInputFiles(files);else for(let i=0;i<inputs;i++)await p.locator('#file'+i).setInputFiles(files[i]);
  await p.locator('#form button[type=submit]').click();await p.waitForFunction(()=>!document.querySelector('#save').disabled,{timeout:15000});assert.match(await p.locator('#out').textContent(),expected);
  const promise=p.waitForEvent('download');await p.locator('#save').click();const download=await promise,data=await fs.readFile(await download.path());assert(data.length>20);assert(data.toString('utf8').includes(','),'CSV structure missing');assert.equal(faults.length,0,faults.join('; '));
  console.log('WORK_CORE_PASS',slug);results.push({slug,status:'pass'});
 }catch(e){console.error('WORK_CORE_FAIL',slug,e.message);results.push({slug,status:'fail',error:e.message.slice(0,300)})}finally{await p.close()}
}
await browser.close();console.log('WORK_CORE_RESULTS',JSON.stringify(results));if(results.some(x=>x.status==='fail'))process.exitCode=1;
