/* Owner-only authenticated administration. Only public Supabase publishable keys. */
(()=>{'use strict';
const cfg=window.TOOLBOX_ADMIN_CONFIG,BASE=cfg?.supabaseUrl,KEY=cfg?.supabasePublishableKey;
const SESS='small-toolbox-admin-owner-session',LOCAL='small-toolbox-admin-v1';
const gate=document.getElementById('adminGate'),shell=document.querySelector('.app-shell');
const message=document.getElementById('adminAuthMessage'),form=document.getElementById('adminLoginForm');
const statusEl=document.getElementById('cloudSyncStatus'),signout=document.getElementById('adminSignout');
let session=null,owner=null,remoteVersion=0,writing=Promise.resolve(),booted=false;
const status=(msg,error=false)=>{if(statusEl){statusEl.textContent=msg;statusEl.style.color=error?'#bb443e':'#176347'}};
const error=msg=>{message.textContent=String(msg||'Could not sign in.');message.setAttribute('role','alert')};
function stash(){try{sessionStorage.setItem(SESS,JSON.stringify(session))}catch{}}
function clear(){session=null;owner=null;remoteVersion=0;sessionStorage.removeItem(SESS)}
function accept(tokens){session={access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires_at:Math.floor(Date.now()/1000)+(tokens.expires_in||3600)};stash()}
async function call(url,{method='GET',body=null,token=null,prefer=null}={}){
  const headers={apikey:KEY,Accept:'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  if(body!==null)headers['Content-Type']='application/json';
  if(prefer)headers.Prefer=prefer;
  const r=await fetch(BASE+url,{method,headers,cache:'no-store',...(body!==null?{body:JSON.stringify(body)}:{})});
  let payload;
  try{payload=await r.json()}catch{payload=null}
  if(!r.ok)throw Error(payload?.error_description||payload?.message||payload?.msg||payload?.error||'HTTP '+r.status);
  return payload;
}
async function token(){
  if(!session?.access_token)throw Error('Please sign in.');
  if(session.expires_at>Date.now()/1000+90)return session.access_token;
  if(!session.refresh_token)throw Error('Session expired.');
  const next=await call('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});
  accept(next);return session.access_token;
}
async function readWorkspace(){
  const auth=await token();
  const rows=await call('/rest/v1/toolbox_admin_workspaces?select=payload,version,updated_at&user_id=eq.'+encodeURIComponent(owner),{token:auth});
  return Array.isArray(rows)&&rows.length?rows[0]:null;
}
function mergeRecords(remote,local){
  if(!remote||typeof remote!=='object')return local;
  if(!local||typeof local!=='object')return remote;
  const result=JSON.parse(JSON.stringify(remote));
  const fields=['sites','domains','ideas','tasks','metrics','audits','activity'];
  for(const kind of fields){
    const fromRemote=Array.isArray(result[kind])?result[kind]:[];
    const fromLocal=Array.isArray(local[kind])?local[kind]:[];
    const byId=new Map(fromRemote.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
    for(const entry of fromLocal){
      if(!entry||typeof entry.id!=='string')continue;
      const prev=byId.get(entry.id);
      if(!prev||String(entry.updatedAt||entry.timestamp||'')>String(prev.updatedAt||prev.timestamp||''))byId.set(entry.id,entry);
    }
    result[kind]=[...byId.values()].slice(0,3000);
  }
  return result;
}
async function persist(snapshot){
  if(!owner||!session)throw Error('Not signed in.');
  const auth=await token();
  const payload=JSON.parse(snapshot);
  if(JSON.stringify(payload).length>850000)throw Error('Workspace exceeds cloud size limit. Export a backup.');
  const now=new Date().toISOString();
  let rows;
  if(remoteVersion===0){
    rows=await call('/rest/v1/toolbox_admin_workspaces?select=version',{method:'POST',token:auth,
      body:{user_id:owner,payload,version:1,updated_at:now},prefer:'return=representation'});
  }else{
    rows=await call('/rest/v1/toolbox_admin_workspaces?select=version&user_id=eq.'+encodeURIComponent(owner)+'&version=eq.'+remoteVersion,
      {method:'PATCH',token:auth,body:{payload,version:remoteVersion+1,updated_at:now},prefer:'return=representation'});
  }
  if(!Array.isArray(rows)||rows.length!==1){
    status('Cloud conflict: another device has newer data. Local copy kept; refresh before editing.',true);
    throw Error('Cloud revision conflict. Local backup was retained.');
  }
  remoteVersion=Number(rows[0].version||remoteVersion+1);
  status('Cloud synced · revision '+remoteVersion);
}
function enqueue(data){
 const serialized=JSON.stringify(data);
 status('Saving to cloud...');
 const current=writing.then(()=>persist(serialized)).catch(e=>{
   console.warn('Toolbox cloud save not confirmed:',String(e.message||e));
   status('Cloud save pending: '+String(e.message||e),true);
 });
 writing=current;
 return current;
}
async function googleAdsApi(action,body=null){
  const auth=await token();
  const url=BASE+'/functions/v1/toolbox-google-ads-oauth/'+action;
  const response=await fetch(url,{
    method:body===null?'GET':'POST',
    headers:{'Authorization':'Bearer '+auth,apikey:KEY,Accept:'application/json',...(body===null?{}:{'Content-Type':'application/json'})},
    cache:'no-store',...(body===null?{}:{body:JSON.stringify(body)})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error([String(data.error||'HTTP '+response.status),data.httpStatus?'Google HTTP '+data.httpStatus:'',data.googleCode||data.googleStatus||'',data.googleMessage||'',data.requestId?'Request ID '+data.requestId:''].filter(Boolean).join(' · ').slice(0,650));
  return data;
}

async function authenticate(){
  const auth=await token();
  const account=await call('/auth/v1/user',{token:auth});
  if(!account?.id)throw Error('Account validation failed.');
  const rows=await call('/rest/v1/toolbox_admin_members?select=user_id&user_id=eq.'+encodeURIComponent(account.id),{token:auth});
  if(!Array.isArray(rows)||rows.length!==1)throw Error('This account does not have administrator access.');
  owner=account.id;
  const remote=await readWorkspace();
  const existing=localStorage.getItem(LOCAL);
  let local=null;
  if(existing){try{local=JSON.parse(existing)}catch{}}
  if(remote){
    remoteVersion=Number(remote.version)||1;
    const merged=mergeRecords(remote.payload,local);
    if(existing)try{localStorage.setItem(LOCAL+'-backup-'+new Date().toISOString().slice(0,10),existing)}catch{}
    localStorage.setItem(LOCAL,JSON.stringify(merged));
    if(JSON.stringify(merged)!==JSON.stringify(remote.payload))await enqueue(merged);
    else status('Cloud synced · revision '+remoteVersion);
  }else{
    remoteVersion=0;status('Cloud workspace ready · first sync pending');
    // Existing browser data is preserved and uploaded after the manager initializes.
    if(local&&typeof local==='object')await enqueue(local);
  }
  window.TOOLBOX_CLOUD=Object.freeze({googleAds:googleAdsApi,save:enqueue,readMetrics:async()=>{const ws=await readWorkspace();if(ws)remoteVersion=Number(ws.version)||remoteVersion;return Array.isArray(ws?.payload?.metrics)?ws.payload.metrics:[];}});
  gate.hidden=true;shell.style.display='flex';signout.hidden=false;
  if(!booted){
    booted=true;
    const script=document.createElement('script');
    script.src='./app.js';script.async=false;
    script.onerror=()=>{error('Could not load the operations console.');gate.hidden=false;shell.style.display='none'};
    document.head.appendChild(script);
  }
}
form.addEventListener('submit',async event=>{
 event.preventDefault();error('');
 const button=form.querySelector('button[type=submit]');button.disabled=true;
 try{
   if(!BASE||!KEY)throw Error('Cloud configuration is unavailable.');
   const email=String(form.elements.email.value||'').trim(),password=String(form.elements.password.value||'');
   if(!email||!password)throw Error('Enter your email and password.');
   const response=await call('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
   accept(response);await authenticate();
   form.elements.password.value='';
 }catch(e){clear();error(String(e.message||e));}
 finally{button.disabled=false;}
});
signout.addEventListener('click',()=>{
 clear();window.TOOLBOX_CLOUD=undefined;
 sessionStorage.removeItem(SESS);
 location.reload();
});
(async()=>{
 try{
   const saved=sessionStorage.getItem(SESS);
   if(!saved)return;
   session=JSON.parse(saved);
   await authenticate();
 }catch(e){clear();error('Please sign in again. '+String(e.message||e))}
})();
})();
