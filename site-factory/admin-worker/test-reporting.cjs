const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
let permitted=false,jobRows=[],calls=[];
const context=vm.createContext({URL,Request,Response,AbortSignal,Date,Map,Number,Error,crypto:require('node:crypto').webcrypto,encoder:new TextEncoder(),b64:a=>Buffer.from(a).toString('base64url'),rand:n=>require('node:crypto').randomBytes(n),sha:async s=>require('node:crypto').createHash('sha256').update(s).digest('hex'),authenticated:async()=>permitted,db:async(...args)=>{calls.push(args);return jobRows},access:async()=>{throw Error('not_connected')},reply:(v,s=200)=>Response.json(v,{status:s}),clientId:()=> 'fixture-client',clientSecret:()=> 'fixture-secret',CALLBACK:'https://example.test/callback'});
vm.runInContext(stripTypeScriptTypes(fs.readFileSync(__dirname+'/reporting-routes.ts','utf8')),context);
async function invoke(route,query='',headers={}){const u=new URL('https://example.test/'+route+query);return context.reportingRoute(new Request(u,{headers}),u,route)}
(async()=>{
 assert.equal((await invoke('reporting-data')).status,401);
 assert.equal((await invoke('reporting-start')).status,401);
 assert.equal((await invoke('reporting-unknown')).status,404);
 permitted=true;
 for(const q of ['?start=2026-02-30&end=2026-03-01','?start=2026-01-01&end=2026-03-01','?start=2026-10-22&end=2026-10-21'])assert.equal((await invoke('reporting-data',q)).status,400);
 const result=await (await invoke('reporting-data','?start=2026-10-18&end=2026-10-19')).json();
 assert.equal(result.gsc.status,'unconnected');assert.equal(result.adsense.status,'unconnected');assert.equal(result.gsc.rows.length,0);
 const start=await (await invoke('reporting-start')).json(),auth=new URL(start.authorizationUrl);
 assert.equal(auth.origin,'https://accounts.google.com');assert.equal(auth.searchParams.get('code_challenge_method'),'S256');assert.ok(auth.searchParams.get('state').startsWith('rpt_'));assert.match(auth.searchParams.get('scope'),/webmasters.readonly/);assert.match(auth.searchParams.get('scope'),/adsense.readonly/);
 assert.equal(calls.at(-1)[0],'toolbox_google_ads_oauth_flows');assert.ok(!JSON.stringify(calls).includes('fixture-secret'));
 permitted=false;jobRows=[{key_hash:'fixture'}];assert.equal((await invoke('reporting-data','?start=2026-10-18&end=2026-10-19',{'x-toolbox-reporting-key':'a'.repeat(64)})).status,200);
 assert.equal(vm.runInContext("relevantPage('https://abreda.com/tool')",context),true);assert.equal(vm.runInContext("relevantPage('https://evilabreda.com/tool')",context),false);assert.equal(vm.runInContext("relevantPage('https://abreda.com@evil.test/')",context),false);
 console.log('Reporting access, OAuth PKCE, dates, missing data, job key and host restrictions passed');
})().catch(e=>{console.error(e);process.exitCode=1});
