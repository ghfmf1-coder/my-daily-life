const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
async function check(file,siteId,origin){let handler,writes=0;const ctx=vm.createContext({Response,Request,URL,AbortSignal,Date,Map,Set,JSON,console,Deno:{serve:f=>handler=f,env:{get:k=>k==='SUPABASE_URL'?'https://storage.test':'fixture-private'}},fetch:async(url)=>{if(url.includes('raw.githubusercontent.com'))return Response.json({sites:[]});writes++;return Response.json(true)}});
vm.runInContext(stripTypeScriptTypes(fs.readFileSync(__dirname+'/'+file,'utf8')),ctx);
async function call(ua,o=origin,id=siteId,pageLang='ko'){return handler(new Request('https://collector.test',{method:'POST',headers:{origin:o,'user-agent':ua,'sec-fetch-mode':'cors'},body:JSON.stringify({siteId:id,eventId:'00000000-0000-4000-8000-000000000001',isVisit:false,pageLang,dryRun:true})}))}
assert.equal((await call('curl','https://evil.test')).status,403);assert.equal((await call('curl',origin,'not-an-approved-site')).status,400);
for(const [ua,type]of[['Googlebot','bot'],['Playwright HeadlessChrome','automated'],['Mozilla/5.0 Chrome/100','unknown'],['missing','unknown']]){const r=await(await call(ua)).json();assert.equal(r.category,type);assert.equal(r.diagnostic,true);assert.equal(r.accepted,false)}assert.equal((await call('Mozilla/5.0',origin,siteId,'invalid')).status,400);assert.equal(writes,0);console.log('PASS:',file,'exact origins/site IDs, four categories and zero diagnostic writes')}
(async()=>{await check('public-visit-edge/index.ts','tb-camera-lens-check','https://tb-camera-lens-check.pages.dev');await check('legacy-visit-edge/index.ts','catalog-toolbox-hub','https://abreda.com')})().catch(e=>{console.error(e);process.exitCode=1});

async function duplicateResponse(){
 let handler,inserted=true;
 const ctx=vm.createContext({Response,Request,URL,AbortSignal,Date,Map,Set,JSON,console,Deno:{serve:f=>handler=f,env:{get:k=>k==='SUPABASE_URL'?'https://storage.test':'fixture-private'}},fetch:async (url,options)=>{
  if(url.includes('raw.githubusercontent.com'))return Response.json({sites:[]});
  if(url.includes('toolbox_public_site_sources?'))return Response.json([{site_id:'tb-camera-lens-check'}]);
  assert(url.endsWith('/rpc/record_toolbox_public_visit'));assert.equal(JSON.parse(options.body).p_page_lang,'en');return Response.json(inserted);
 }});
 vm.runInContext(stripTypeScriptTypes(fs.readFileSync(__dirname+'/public-visit-edge/index.ts','utf8')),ctx);
 const req=()=>new Request('https://collector.test',{method:'POST',headers:{origin:'https://tb-camera-lens-check.pages.dev','user-agent':'Mozilla/5.0 Chrome/100','sec-fetch-mode':'cors'},body:JSON.stringify({siteId:'tb-camera-lens-check',eventId:'00000000-0000-4000-8000-000000000001',isVisit:true,pageLang:'en'})});
 assert.equal((await(await handler(req())).json()).accepted,true);inserted=false;
 const duplicate=await(await handler(req())).json();assert.equal(duplicate.accepted,false);assert.equal(duplicate.duplicate,true);
 console.log('PASS: duplicate RPC rejection is not reported as a new visit');
}
duplicateResponse().catch(e=>{console.error(e);process.exitCode=1});
