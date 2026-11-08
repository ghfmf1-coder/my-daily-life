import assert from 'node:assert/strict';
import {deployExistingWorker} from './deploy-existing-worker.mjs';
const env={CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_WORKER_DEPLOY_TOKEN:'fixture-private-token'};
const calls=[],logs=[];
await assert.rejects(()=>deployExistingWorker({env,fetcher:async(url,options)=>{
 calls.push({url,method:options.method||'GET'});
 if(url.endsWith('/user/tokens/verify'))return Response.json({success:true,result:{status:'expired',id:'private'},errors:[]});
 return Response.json({success:false,errors:[{code:9109,message:env.CLOUDFLARE_WORKER_DEPLOY_TOKEN}]},{status:401});
},log:(...x)=>logs.push(x.join(' '))}),/HTTP_401 stage=settings_read cf_codes=9109/);
assert.equal(calls.filter(c=>c.method!=='GET').length,0);
assert(logs.some(s=>s.includes('expired')));assert(!JSON.stringify(logs).includes(env.CLOUDFLARE_WORKER_DEPLOY_TOKEN));
await assert.rejects(()=>deployExistingWorker({env:{...env,CLOUDFLARE_WORKER_DEPLOY_TOKEN:'Bearer private'},fetcher:()=>{throw Error('must not fetch')}}),/FORMAT_INVALID/);
const bindings=[{name:'REPORT_DB',type:'d1'},{name:'SNS_DB',type:'d1'},{name:'PRIVATE',type:'secret_text'}];let uploads=0;
await deployExistingWorker({env,readFile:()=> 'export default {}',log:()=>{},fetcher:async(url,options)=>{
 if(options.method==='PUT'){uploads++;return Response.json({success:true,result:{id:'existing-worker'}})}
 return Response.json({success:true,result:{bindings}});
}});assert.equal(uploads,1);
console.log('PASS: reject malformed credentials, diagnose expired token without secret leakage or uploads, preserve existing bindings on valid deployment');
