// Modify only the existing Worker. Preserve settings, bindings, secrets, routes and Cron.
import fs from 'node:fs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_WORKER_DEPLOY_TOKEN;
if(!account||!token)throw Error('WORKER_DEPLOY_AUTH_REQUIRED');
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/tb-toolbox-admin-rebuild`;
async function api(url,options={}){const r=await fetch(url,{...options,headers:{Authorization:'Bearer '+token,...options.headers}});if(!r.ok)throw Error('WORKER_API_HTTP_'+r.status);const d=await r.json();if(!d.success)throw Error('WORKER_API_REJECTED');return d.result}
const before=await api(base+'/settings');
for(const name of ['REPORT_DB','SNS_DB'])if(!before.bindings?.some(b=>b.name===name&&b.type==='d1'))throw Error('EXISTING_BINDINGS_UNCONFIRMED');
const metadata={main_module:'worker.mjs'};
const form=new FormData();form.set('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));form.set('worker.mjs',new Blob([fs.readFileSync('site-factory/admin-worker/worker.mjs')],{type:'application/javascript+module'}),'worker.mjs');
const deployed=await api(base+'/content',{method:'PUT',body:form});const after=await api(base+'/settings');
const signature=xs=>JSON.stringify(xs.map(x=>JSON.stringify(x)).sort());
if(signature(before.bindings)!==signature(after.bindings))throw Error('BINDING_PRESERVATION_CHECK_FAILED');
console.log('EXISTING_WORKER_DEPLOYED:',deployed.id||'tb-toolbox-admin-rebuild');console.log('BINDINGS_PRESERVED:',before.bindings.length);
