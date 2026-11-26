import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync(new URL('./index.ts',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('async function githubSetup('),source.indexOf('Deno.serve('));
let authorized=true,puts=0,fail=false,confirm=true;
const context=vm.createContext({Request,Response,URL,Date,AbortSignal,
 githubAuthenticated:async()=>authorized,reportingAccess:async()=>'fixture',
 relevantPage:u=>u.startsWith('https://abreda.com/'),reply:(d,s=200)=>Response.json(d,{status:s}),
 fetch:async(url,opts={})=>{
  if(url.includes('raw.githubusercontent.com'))return Response.json({paused:false});
  if(url.endsWith('/sites'))return Response.json({siteEntry:[{siteUrl:'sc-domain:abreda.com',permissionLevel:'siteOwner'}]});
  const row={path:'https://abreda.com/sitemap.xml',lastSubmitted:'2026-11-26T04:00:00Z',isPending:true,errors:'0'};
  if(url.endsWith('/sitemaps'))return Response.json({sitemap:[row]});
  if(opts.method==='PUT'){puts++;return fail?Response.json({error:{}},{status:403}):new Response(null,{status:204});}
  return Response.json(confirm?row:{});
 }});
vm.runInContext(stripTypeScriptTypes(fn),context);
const request=action=>new Request('https://example.invalid/reporting-github-setup',{method:'POST',body:JSON.stringify({action,urls:['https://abreda.com/']})});
let r=await (await context.githubSetup(request('sitemaps'))).json();assert.equal(r.rows[0].status,'already_submitted');assert.equal(puts,0);
r=await (await context.githubSetup(request('resubmit_sitemaps'))).json();assert.equal(puts,1);assert.equal(r.rows[0].status,'submitted');assert.equal(r.rows[0].isPending,true);
confirm=false;r=await (await context.githubSetup(request('resubmit_sitemaps'))).json();assert.equal(r.rows[0].status,'submission_not_confirmed');
fail=true;r=await (await context.githubSetup(request('resubmit_sitemaps'))).json();assert.equal(r.rows[0].status,'error');assert.equal(r.rows[0].httpStatus,403);
authorized=false;const before=puts;assert.equal((await context.githubSetup(request('resubmit_sitemaps'))).status,401);assert.equal(puts,before);
console.log('PASS: explicit resubmission verifies receipt, ordinary submissions deduplicate, provider failure and identity rejection remain failures');
