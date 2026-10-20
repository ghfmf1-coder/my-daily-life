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
async function budget(env,site,provider){
  if(!env.USAGE)throw Error('Usage KV is not configured');
  const day=new Date().toISOString().slice(0,10);
  const key='usage:'+day+':'+site+':'+provider;
  const max=Math.min(Math.max(Number(env.DAILY_SITE_LIMIT)||20,1),1000);
  const count=Number(await env.USAGE.get(key)||0);
  if(count>=max)return {ok:false,count,max};
  // KV counters are best-effort and not atomic. Strict paid quotas require Durable Objects.
  await env.USAGE.put(key,String(count+1),{expirationTtl:172800});
  return {ok:true,count:count+1,max};
}
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(!allowedOrigin(request,env))return json({error:'origin_not_allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...corsHeaders(request,env),'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization, content-type','access-control-max-age':'600'}});
  if(request.method==='GET'&&url.pathname==='/health')return json({status:'ok',provider_calls_enabled:env.ENABLE_PROVIDER_CALLS==='true',quota_mode:'kv_best_effort'});
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
  let quota;try{quota=await budget(env,caller.id,provider.id)}catch{return json({error:'quota_unavailable'},503)}
  if(!quota.ok)return json({error:'upgrade_required',message:'무료 사용량을 모두 사용했어요. 유료 이용권을 확인하거나 내일 다시 이용할 수 있어요.',upgrade_url:env.UPGRADE_URL||null,reset:'next_utc_day'},429);
  const upstream=new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  upstream.searchParams.set('api_key',env.USDA_API_KEY);
  let response;try{
    response=await fetch(upstream,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:input.query,pageSize:5}),signal:AbortSignal.timeout(8000)});
  }catch{return json({error:'provider_unavailable'},502)}
  if(!response.ok)return json({error:'provider_temporarily_unavailable',retryable:[429,500,502,503,504].includes(response.status)},502);
  const result=await response.json();
  return json({provider:provider.id,foods:(result.foods||[]).slice(0,5).map(x=>({description:x.description,fdcId:x.fdcId,brandOwner:x.brandOwner||null})),usage:quota.count,limit:quota.max});
}};