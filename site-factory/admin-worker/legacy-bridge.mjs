import {githubAuthenticated} from './google-oauth-edge/github-oidc.mjs';
// Read-only bridge. Cloudflare Access JWT verification replaces Supabase Auth.
// No CORS, caller-selected tables, SQL, secrets, notes or personal payloads returned.
const ISSUER='https://little-tooth-dff1.cloudflareaccess.com';
const AUD='d9e9318ac18ff0bcca2cc0926ed466fb0cf7e9c548a0a5e6c6b455fad49025dd';
const OWNER='8b060501-8453-4ecb-bbe1-38f33dd05e9f';
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function authenticated(token,fetcher=fetch){
 try{
  if(!token||token.length>16000)return false;
  const parts=token.split('.');if(parts.length!==3)return false;
  const h=JSON.parse(new TextDecoder().decode(decode(parts[0]))),p=JSON.parse(new TextDecoder().decode(decode(parts[1])));
  const t=Date.now()/1000;
  if(h.alg!=='RS256'||p.iss!==ISSUER||!Array.isArray(p.aud)||!p.aud.includes(AUD)||typeof p.exp!=='number'||p.exp<=t||p.nbf>t||String(p.email).toLowerCase()!=='ghfmf1@gmail.com')return false;
  const r=await fetcher(ISSUER+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(8000)});if(!r.ok)return false;
  const key=(await r.json()).keys?.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!key)return false;
  const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false;}
}
export async function handler(req,env,fetcher=fetch){
 if(req.method!=='GET')return json({error:'GET only'},405);
 if(!await authenticated(req.headers.get('cf-access-jwt-assertion'),fetcher)&&!await githubAuthenticated(req.headers.get('Authorization'),fetcher))return json({error:'Administrator authentication required'},401);
 try{
  const key=env.get('SUPABASE_SERVICE_ROLE_KEY'),base=env.get('SUPABASE_URL');
  async function read(path){const r=await fetcher(base+'/rest/v1/'+path,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Read failed');return r.json();}
  const date=new URL(req.url).searchParams.get('date');
  if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))return json({error:'invalid_date'},400);
  const filter=date?'&visit_day=eq.'+date:'';
  async function pages(path){let rows=[];for(let offset=0;offset<100000;offset+=500){const batch=await read(path+'&limit=500&offset='+offset);if(!Array.isArray(batch))throw Error('Invalid source');rows.push(...batch);if(batch.length<500)return rows;}throw Error('Incomplete source');}
  const [ws,traffic,publicSites,publicTraffic,events]=await Promise.all([
   read('toolbox_admin_workspaces?select=payload,version,updated_at&user_id=eq.'+OWNER),
   pages('toolbox_traffic_daily?select=site_id,visit_day,visits,pageviews,updated_at&order=visit_day.desc,site_id'+filter),
   pages('toolbox_public_site_sources?select=site_id,url,title&order=site_id'),
   pages('toolbox_public_visit_daily?select=site_id,visit_day,category,visits,pageviews,updated_at&order=visit_day.desc,site_id,category'+filter),
   pages('toolbox_traffic_classified?select=event_id,site_id,visit_day,category,is_visit,received_at&order=received_at,event_id'+filter)
  ]);
  const grouped=new Map(),seen=new Set();
  for(const e of events){if(seen.has(e.event_id))continue;seen.add(e.event_id);const id=[e.site_id,e.visit_day,e.category].join('|');let row=grouped.get(id);if(!row){row={site_id:e.site_id,visit_day:e.visit_day,category:e.category,visits:0,pageviews:0,updated_at:e.received_at};grouped.set(id,row);}row.pageviews++;if(e.is_visit)row.visits++;if(e.received_at>row.updated_at)row.updated_at=e.received_at;}
  const classifiedTraffic=[...grouped.values()];
  const workspace=ws[0];
  const sites=(workspace?.payload?.sites||[]).map(s=>({id:s.id,url:s.url,name:s.name}));
  const metrics=(workspace?.payload?.metrics||[]).map(m=>({id:m.id,siteId:m.siteId,date:m.date,visitors:m.visitors,pageviews:m.pageviews,impressions:m.impressions,clicks:m.clicks,revenue:m.revenue,source:m.source,botFilter:m.botFilter,updatedAt:m.updatedAt}));
  return json({version:workspace?.version??null,updatedAt:workspace?.updated_at??null,fetchedAt:new Date().toISOString(),sites,metrics,traffic,publicSites,publicTraffic,classifiedTraffic});
 }catch{return json({error:'Legacy data unavailable; original data unchanged'},503);}
}
if(typeof Deno!=='undefined')Deno.serve(req=>handler(req,Deno.env));
