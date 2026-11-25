import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync(new URL('./index.ts',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('async function githubReporting('),source.indexOf('async function githubSetup('));
let authorized=true,failInspection=false,reportCalls=0,readinessCalls=0,googleCalls=0;
const context=vm.createContext({Request,Response,URL,Date,fetch,
 githubAuthenticated:async()=>authorized,
 reportingAccess:async cb=>{cb?.([]);return 'fixture-token'},
 relevantPage:u=>u.startsWith('https://abreda.com/'),
 reply:(data,status=200)=>Response.json(data,{status}),
 REPORTING_ADSENSE:'fixture-account',
 reportingData:async()=>{reportCalls++;return {gsc:{status:'fixture'},adsense:{status:'fixture'}}},
 readAdSenseSites:async()=>{readinessCalls++;return {status:'fixture'}},
 googleRead:async(token,url,body)=>{
  googleCalls++;
  if(url.endsWith('/sites'))return {siteEntry:[{siteUrl:'https://abreda.com/',permissionLevel:'siteOwner'}]};
  if(url.endsWith('/sitemaps'))return {sitemap:[]};
  assert.ok(url.endsWith('/urlInspection/index:inspect'));
  assert.equal(body.inspectionUrl,'https://abreda.com/blog/example/');
  if(failInspection)throw Error('fixture upstream error');
  return {inspectionResult:{indexStatusResult:{verdict:'NEUTRAL',coverageState:'fixture-not-indexed'}}};
 }
});
vm.runInContext(stripTypeScriptTypes(fn),context);
const request=(extra={})=>new Request('https://example.invalid/reporting-github-data',{method:'POST',body:JSON.stringify({urls:['https://abreda.com/blog/example/'],...extra})});
let result=await (await context.githubReporting(request({inspectionOnly:true}))).json();
assert.equal(result.sites[0].index.verdict,'NEUTRAL');assert.equal(reportCalls,0);assert.equal(readinessCalls,0);
failInspection=true;result=await (await context.githubReporting(request({inspectionOnly:true}))).json();
assert.equal(result.sites[0].index.status,'query_failed');assert.equal(reportCalls,0);
failInspection=false;await context.githubReporting(request());assert.equal(reportCalls,1);assert.equal(readinessCalls,1);
authorized=false;const before=googleCalls;assert.equal((await context.githubReporting(request({inspectionOnly:true}))).status,401);assert.equal(googleCalls,before);
console.log('PASS: inspection-only skips unrelated reports, preserves provider failure and authentication; default reporting unchanged');
