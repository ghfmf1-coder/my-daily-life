// Small Toolbox API gateway. No provider calls unless verified and explicitly enabled.
// Required secrets: ADMIN_TOKEN, SITE_TOKENS_JSON; optional USDA_API_KEY.
// KV binding USAGE is required. Fail closed when absent.
import providers from '../providers.json';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const same=(a,b)=>{if(!a||!b||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0};
const allowedOrigin=(request,env)=>{const origin=request.headers.get('origin');return !origin||origin===env.ADMIN_ORIGIN};
const corsHeaders=(request,env)=>request.headers.get('origin')===env.ADMIN_ORIGIN?{'access-control-allow-origin':env.ADMIN_ORIGIN,'vary':'Origin'}:{};
function authenticate(request,env,admin=false){
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Bearer '))return null;
  const token=header.slice(7);
  if(admin)return same(token,env.ADMIN_TOKEN)?{id:'admin'}:null;
  let sites;try{sites=JSON.parse(env.SITE_TOKENS_JSON||'{}')}catch{return null}
  for(const [id,credential] of Object.entries(sites)){
    if(/^[a-z][a-z0-9-]{1,39}$/.test(id)&&typeof credential==='string'&&same(token,credential))return {id};
  }
  return null;
}
// KST calendar-day window; next reset is midnight Asia/Seoul.
function quotaWindow(now=Date.now()){
  const shifted=now+9*60*60*1000;
  const day=new Date(shifted).toISOString().slice(0,10);
  const resetAt=new Date((Math.floor(shifted/86400000)+1)*86400000-9*3600000).toISOString();
  return {day,resetAt};
}
async function visitorHash(request,env,day){
  const ip=request.headers.get('CF-Connecting-IP');
  if(!ip||!env.VISITOR_HASH_SECRET)throw Error('Visitor identification unavailable');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.VISITOR_HASH_SECRET),'HMAC',false,['sign']);
  const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(day+':'+ip));
  return Array.from(new Uint8Array(signed)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function budget(request,env,site,provider){
  if(!env.USAGE)throw Error('Usage KV is not configured');
  const {day,resetAt}=quotaWindow();
  const visitor=await visitorHash(request,env,day);
  const visitorLimit=Math.min(Math.max(Number(env.DAILY_VISITOR_LIMIT)||5,1),100);
  const siteLimit=Math.min(Math.max(Number(env.DAILY_SITE_LIMIT)||100,1),10000);
  const userKey='visitor:'+day+':'+site+':'+provider+':'+visitor;
  const siteKey='usage:'+day+':'+site+':'+provider;
  const [used,siteUsed]=await Promise.all([env.USAGE.get(userKey),env.USAGE.get(siteKey)]);
  const count=Number(used||0),total=Number(siteUsed||0);
  if(count>=visitorLimit)return {ok:false,reason:'daily_limit_reached',count,limit:visitorLimit,resetAt};
  if(total>=siteLimit)return {ok:false,reason:'site_capacity_reached',count,limit:visitorLimit,resetAt};
  // Best-effort KV counters; not atomic under concurrency. Paid providers remain disabled.
  await Promise.all([
    env.USAGE.put(userKey,String(count+1),{expirationTtl:172800}),
    env.USAGE.put(siteKey,String(total+1),{expirationTtl:172800})
  ]);
  return {ok:true,count:count+1,limit:visitorLimit,resetAt};
}
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(!allowedOrigin(request,env))return json({error:'origin_not_allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...corsHeaders(request,env),'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization, content-type','access-control-max-age':'600'}});
  if(request.method==='GET'&&url.pathname==='/health')return json({status:'ok',provider_calls_enabled:env.ENABLE_PROVIDER_CALLS==='true',quota_mode:'daily_kst_kv_best_effort'});
  if(request.method==='GET'&&url.pathname==='/admin/providers'){
    if(!authenticate(request,env,true))return json({error:'unauthorized'},401);
    return json({providers:providers.providers.map(({id,name,status,category,last_verified,live_test})=>({id,name,status,category,last_verified,live_test}))});
  }
  if(request.method==='GET'&&url.pathname==='/admin/usage'){
    if(!authenticate(request,env,true))return json({error:'unauthorized'},401);
    if(!env.USAGE)return json({error:'usage_storage_unavailable'},503);
    const day=/^\\d{4}-\\d{2}-\\d{2}$/.test(url.searchParams.get('day')||'')?url.searchParams.get('day'):new Date().toISOString().slice(0,10);
    const prefix='usage:'+day+':';let cursor;const rows=[];
    do{const page=await env.USAGE.list({prefix,limit:100,...(cursor?{cursor}:{})});for(const key of page.keys){if(rows.length>=500)break;rows.push({key:key.name.slice(prefix.length),count:Number(await env.USAGE.get(key.name)||0)});}cursor=page.list_complete?null:page.cursor;}while(cursor&&rows.length<500);
    return json({day,usage:rows,truncated:!!cursor});
  }
  if(request.method!=='POST'||url.pathname!=='/v1/lookup')return json({error:'not_found'},404);
  const caller=authenticate(request,env);
  if(!caller)return json({error:'unauthorized'},401);
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({error:'json_required'},415);
  const raw=await request.text();if(raw.length>2048)return json({error:'payload_too_large'},413);
  let input;try{input=JSON.parse(raw)}catch{return json({error:'invalid_json'},400)}
  if(!input||typeof input.provider!=='string'||typeof input.query!=='string'||input.query.length<2||input.query.length>100)return json({error:'invalid_input'},400);
  const provider=providers.providers.find(p=>p.id===input.provider);
  if(!provider)return json({error:'unknown_provider'},404);
  if(provider.status!=='connected'||env.ENABLE_PROVIDER_CALLS!=='true')return json({error:'provider_not_enabled'},503);
  // Explicit adapter allowlist: never accept arbitrary URLs or provider paths from callers.
  if(provider.id!=='usda-fooddata')return json({error:'adapter_unavailable'},503);
  if(!env.USDA_API_KEY)return json({error:'provider_secret_missing'},503);
  let quota;try{quota=await budget(request,env,caller.id,provider.id)}catch{return json({error:'quota_unavailable'},503)}
  if(!quota.ok)return json({error:quota.reason,message:quota.reason==='daily_limit_reached'?'오늘 무료 이용 횟수를 모두 사용했어요. 내일 오전 0시부터 다시 이용할 수 있어요.':'현재 무료 API 제공량이 소진됐어요. 내일 다시 이용해 주세요.',used:quota.count,limit:quota.limit,reset_at:quota.resetAt},429);
  const upstream=new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  upstream.searchParams.set('api_key',env.USDA_API_KEY);
  let response;try{
    response=await fetch(upstream,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:input.query,pageSize:5}),signal:AbortSignal.timeout(8000)});
  }catch{return json({error:'provider_unavailable'},502)}
  if(!response.ok)return json({error:'provider_temporarily_unavailable',retryable:[429,500,502,503,504].includes(response.status)},502);
  const result=await response.json();
  return json({provider:provider.id,foods:(result.foods||[]).slice(0,5).map(x=>({description:x.description,fdcId:x.fdcId,brandOwner:x.brandOwner||null})),usage:quota.count,limit:quota.limit,reset_at:quota.resetAt});
}};