// Staged, non-destructive migration of manifest-approved public Pages sites.
// Modes: self-test, plan, attach, status, dns, retry. Existing pages.dev stays live.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(fs.readFileSync(new URL('./visit-sites.json',import.meta.url),'utf8'));
const exclusions=new Set(['tb-toolbox-admin','tb-deployment-check','tb-toolbox-hub']);
function candidates(){
  const targets=[];
  for(const s of manifest.sites||[]){
    if(!/^tb-[a-z0-9-]+$/.test(s.siteId)||exclusions.has(s.siteId))throw Error('Unexpected site ID');
    const url=new URL(s.url);
    if(url.protocol!=='https:')throw Error('Unexpected non-HTTPS site');
    if(!url.hostname.endsWith('.pages.dev'))continue; // Already canonical on abreda.com
    const project=url.hostname.slice(0,-'.pages.dev'.length);
    if(!/^tb-[a-z0-9-]+$/.test(project))throw Error('Pages project mismatch');
    const domain=s.siteId.slice(3)+'.abreda.com';
    targets.push({id:s.siteId,project,domain});
  }
  assert.equal(new Set(targets.map(t=>t.domain)).size,targets.length,'Duplicate target domain');
  return targets;
}
const mode=process.argv[2]||'plan';
const targets=candidates();
if(mode==='self-test'){
  assert(targets.some(x=>x.id==='tb-camera-lens-check'));
  assert(targets.some(x=>x.id==='tb-card-grading-lab'));
  assert(targets.every(x=>x.domain.endsWith('.abreda.com')&&x.project.startsWith('tb-')));
  console.log('DOMAIN_MIGRATION_SELFTEST_PASS',JSON.stringify({mode,inventory:targets.length}));
  process.exit(0);
}
if(!['plan','attach','status','dns','retry'].includes(mode))throw Error('Unsupported mode');
if(mode==='plan'){
  console.log('DOMAIN_MIGRATION_PLAN',JSON.stringify({targets,excludedAlreadyCanonical:(manifest.sites||[]).filter(s=>!new URL(s.url).hostname.endsWith('.pages.dev')).map(s=>s.siteId)}));
  process.exit(0);
}
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const pagesToken=process.env.CLOUDFLARE_API_TOKEN||'';
const dnsToken=process.env.CLOUDFLARE_DNS_TOKEN||'';
if(!/^[a-f0-9]{32}$/i.test(account)||!pagesToken||/\s/.test(pagesToken))throw Error('Missing/malformed Pages credentials');
if(mode==='dns'&&(!dnsToken||/\s/.test(dnsToken)))throw Error('CLOUDFLARE_DNS_TOKEN missing or malformed; no DNS changes attempted');
const api='https://api.cloudflare.com/client/v4';
async function cf(method,path,token,body){
  const response=await fetch(api+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const json=await response.json().catch(()=>({}));
  return {ok:response.ok&&json.success===true,http:response.status,data:json.result,codes:(json.errors||[]).map(x=>x.code)};
}
const root='/accounts/'+account+'/pages/projects/';
let zone=null;
if(mode==='dns'){
  const pilot=await cf('GET',root+'tb-card-grading-lab/domains/card-grading-lab.abreda.com',pagesToken);
  zone=pilot.data?.zone_tag;
  if(!pilot.ok||!/^[a-f0-9]{32}$/i.test(zone||''))throw Error('Unable to verify pilot abreda.com zone; no DNS changes attempted');
  const zoneInfo=await cf('GET','/zones/'+zone,dnsToken);
  if(!zoneInfo.ok||zoneInfo.data?.name!=='abreda.com')throw Error('DNS token cannot read abreda.com zone; no DNS changes attempted');
}
const output=[];
for(const target of targets){
  const project=await cf('GET',root+encodeURIComponent(target.project),pagesToken);
  if(!project.ok){
    output.push({id:target.id,project:target.project,domain:target.domain,result:'project_unavailable',http:project.http,codes:project.codes});
    continue;
  }
  if(project.data?.name!==target.project){
    output.push({id:target.id,result:'project_name_mismatch'});
    continue;
  }
  const attached=(project.data.domains||[]).includes(target.domain);
  const conflict=(project.data.domains||[]).find(x=>(x==='abreda.com'||x.endsWith('.abreda.com'))&&x!==target.domain);
  if(conflict){
    output.push({id:target.id,domain:target.domain,result:'already_has_other_custom_domain'});
    continue;
  }
  const domainPath=root+encodeURIComponent(target.project)+'/domains/'+encodeURIComponent(target.domain);
  const check=await cf('GET',domainPath,pagesToken);
  if(mode==='attach'){
    if(attached||check.ok){
      output.push({id:target.id,domain:target.domain,result:check.ok&&check.data?.status==='deactivated'?'deactivated_waiting_dns':'already_registered',status:check.data?.status||null});
      continue;
    }
    const created=await cf('POST',root+encodeURIComponent(target.project)+'/domains',pagesToken,{name:target.domain});
    output.push({id:target.id,domain:target.domain,result:created.ok?'attached_pending_dns':'attach_failed',http:created.http,codes:created.codes});
    continue;
  }
  if(mode==='status'){
    output.push({id:target.id,domain:target.domain,result:check.ok?(check.data?.status||'unknown'):'not_attached',http:check.http,codes:check.codes});
    continue;
  }
  if(mode==='retry'){
    if(!check.ok){
      output.push({id:target.id,domain:target.domain,result:'not_attached',http:check.http,codes:check.codes});
      continue;
    }
    if(!['deactivated','error'].includes(check.data?.status)){
      output.push({id:target.id,domain:target.domain,result:'no_retry_needed',status:check.data?.status||null});
      continue;
    }
    // Existing domain only: never create projects, edit DNS, or touch active domains.
    const retried=await cf('PATCH',domainPath,pagesToken);
    output.push({id:target.id,domain:target.domain,result:retried.ok?'validation_retry_requested':'validation_retry_failed',http:retried.http,codes:retried.codes,status:retried.data?.status||null});
    continue;
  }
  if(!check.ok||check.data?.status==='blocked'){
    output.push({id:target.id,domain:target.domain,result:'pages_domain_not_ready',http:check.http});
    continue;
  }
  const dnsPath='/zones/'+zone+'/dns_records';
  const lookup=await cf('GET',dnsPath+'?name='+encodeURIComponent(target.domain),dnsToken);
  if(!lookup.ok){
    output.push({id:target.id,domain:target.domain,result:'dns_read_failed',http:lookup.http,codes:lookup.codes});
    continue;
  }
  const records=lookup.data||[];
  const expected=target.project+'.pages.dev';
  let dnsResult;
  if(records.length){
    const exact=records.length===1&&records[0].type==='CNAME'&&records[0].content.replace(/\.$/,'').toLowerCase()===expected;
    dnsResult=exact?'dns_already_correct':'dns_conflict_not_modified';
  }else{
    const added=await cf('POST',dnsPath,dnsToken,{type:'CNAME',name:target.domain,content:expected,ttl:1,proxied:false});
    dnsResult=added.ok?'dns_created':'dns_write_failed';
  }
  if((dnsResult==='dns_created'||dnsResult==='dns_already_correct')&&['deactivated','error'].includes(check.data?.status)){
    const retry=await cf('PATCH',domainPath,pagesToken);
    dnsResult+=retry.ok?'_validation_retried':'_validation_retry_failed';
  }
  output.push({id:target.id,domain:target.domain,result:dnsResult});
}
console.log('DOMAIN_MIGRATION_RESULT',JSON.stringify({mode,output}));
if(output.some(x=>/failed|unavailable|mismatch|conflict/.test(x.result)))process.exitCode=1;
