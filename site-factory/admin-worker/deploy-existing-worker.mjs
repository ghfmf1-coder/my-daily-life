// Existing Worker only: preserve bindings, secrets, routes and Cron. Never log credentials.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export async function deployExistingWorker({env=process.env,fetcher=fetch,readFile=fs.readFileSync,log=console.log}={}){
 const account=env.CLOUDFLARE_ACCOUNT_ID,token=env.CLOUDFLARE_WORKER_DEPLOY_TOKEN;
 if(!account||!token)throw Error('WORKER_DEPLOY_AUTH_REQUIRED');
 if(!/^[a-f0-9]{32}$/i.test(account))throw Error('WORKER_ACCOUNT_ID_FORMAT_INVALID');
 if(/\s/.test(token))throw Error('WORKER_TOKEN_FORMAT_INVALID: store only the raw token, without whitespace or a Bearer prefix');
 const root='https://api.cloudflare.com/client/v4',base=`${root}/accounts/${account}/workers/scripts/tb-toolbox-admin-rebuild`;
 async function read(url,options={}){
  const r=await fetcher(url,{...options,headers:{Authorization:'Bearer '+token,...options.headers}});
  let body;try{body=await r.json()}catch{body={}}
  return {http:r.status,ok:r.ok,body};
 }
 // Different token ownership types have different verification endpoints. Both are read-only.
 async function diagnose(){
  for(const [kind,path] of [['user','/user/tokens/verify'],['account',`/accounts/${account}/tokens/verify`]]){
   const r=await read(root+path),state=r.body?.result?.status;
   const status=['active','disabled','expired'].includes(state)?state:'unknown';
   const codes=(r.body?.errors||[]).map(e=>e.code).filter(Number.isSafeInteger);
   log('WORKER_AUTH_DIAGNOSTIC',JSON.stringify({kind,http:r.http,status,codes}));
   if(r.ok&&r.body?.success&&status!=='unknown')return;
  }
 }
 async function api(url,stage,options={}){
  const r=await read(url,options);
  if(!r.ok||!r.body?.success){
   const codes=(r.body?.errors||[]).map(e=>e.code).filter(Number.isSafeInteger);
   if(r.http===401||r.http===403)await diagnose();
   // Exclude upstream messages, IDs and response bodies: they can echo submitted data.
   throw Error(`WORKER_API_HTTP_${r.http} stage=${stage} cf_codes=${codes.join(',')||'not_provided'}`);
  }
  return r.body.result;
 }
 const before=await api(base+'/settings','settings_read');
 for(const name of ['REPORT_DB','SNS_DB'])if(!before.bindings?.some(b=>b.name===name&&b.type==='d1'))throw Error('EXISTING_BINDINGS_UNCONFIRMED');
 const form=new FormData();form.set('metadata',new Blob([JSON.stringify({main_module:'worker.mjs'})],{type:'application/json'}));
 form.set('worker.mjs',new Blob([readFile('site-factory/admin-worker/worker.mjs')],{type:'application/javascript+module'}),'worker.mjs');
 const deployed=await api(base+'/content','script_upload',{method:'PUT',body:form});
 const after=await api(base+'/settings','settings_verify');
 const signature=xs=>JSON.stringify(xs.map(x=>JSON.stringify(x)).sort());
 if(signature(before.bindings)!==signature(after.bindings))throw Error('BINDING_PRESERVATION_CHECK_FAILED');
 log('EXISTING_WORKER_DEPLOYED:',deployed.id||'tb-toolbox-admin-rebuild');log('BINDINGS_PRESERVED:',before.bindings.length);
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await deployExistingWorker();
