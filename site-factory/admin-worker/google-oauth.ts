import {authenticated} from "./access-auth.mjs";
// Small Toolbox Google Ads OAuth. Sensitive credentials are never returned to the browser.
const ROOT = "https://ytifxhpizractdeytrok.supabase.co";
const CALLBACK = ROOT + "/functions/v1/toolbox-google-ads-oauth/callback";
const ADMIN = "https://tb-toolbox-admin.pages.dev/";
const ORIGINS = new Set(["https://tb-toolbox-admin.pages.dev","https://adminivo.com"]);
const encoder = new TextEncoder();
const d = new TextDecoder();
const env = (key:string) => Deno.env.get(key) || "";
const clientId = () => env("GOOGLE_ADS_CLIENT_ID");
const clientSecret = () => env("GOOGLE_ADS_CLIENT_SECRET");
const secretKey = () => {
  if (env("SUPABASE_SERVICE_ROLE_KEY")) return env("SUPABASE_SERVICE_ROLE_KEY");
  try {return JSON.parse(env("SUPABASE_SECRET_KEYS")).default || ""} catch{return ""}
};
const publicKey = () => {
  if(env("SUPABASE_ANON_KEY")) return env("SUPABASE_ANON_KEY");
  try{return JSON.parse(env("SUPABASE_PUBLISHABLE_KEYS")).default || ""}catch{return ""}
};
const rand=(len:number)=>crypto.getRandomValues(new Uint8Array(len));
const b64=(a:Uint8Array)=>btoa(String.fromCharCode(...a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const un64=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4)),ch=>ch.charCodeAt(0));
const sha = async (s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(s)))).map(x=>x.toString(16).padStart(2,"0")).join("");
const reply=(data:unknown,status=200,cors:Record<string,string>={})=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...cors}});
const baseHead = {"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"};
// Supabase hosted Edge Functions do not render HTML on GET. Redirect to our trusted UI.
const page = (ok:boolean)=>new Response(null,{status:303,headers:{...baseHead,"Location":ADMIN+(ok?"?google_ads=connected":"?google_ads=retry")}});
async function db(path:string, method="GET", body?:unknown, returnRepresentation=false){
  const key=secretKey();if(!key)throw Error("server_database_key_unavailable");
  const r=await fetch(ROOT+"/rest/v1/"+path,{method,headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Accept":"application/json",...(returnRepresentation?{"Prefer":"return=representation"}:method==="POST"&&path.includes("on_conflict")?{"Prefer":"resolution=merge-duplicates"}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(!r.ok)throw Error("database_request_"+r.status);
  const str=await r.text();return str?JSON.parse(str):null;
}
async function owner(req:Request){
  const raw=req.headers.get("Authorization")||"";
  if(!/^Bearer [A-Za-z0-9._~-]+$/.test(raw))throw Error("not_authenticated");
  const key=publicKey();if(!key)throw Error("auth_not_configured");
  const r=await fetch(ROOT+"/auth/v1/user",{headers:{Authorization:raw,apikey:key}});
  if(!r.ok)throw Error("not_authenticated");
  const user=await r.json();
  if(!/^[0-9a-f-]{36}$/i.test(String(user.id||"")))throw Error("not_authenticated");
  const rows=await db("toolbox_admin_members?select=user_id&user_id=eq."+encodeURIComponent(user.id));
  if(!Array.isArray(rows)||rows.length!==1)throw Error("not_authorized");
  return user.id as string;
}
async function cryptoKey(salt:Uint8Array,usage:KeyUsage[]){
  const input=await crypto.subtle.importKey("raw",encoder.encode(clientSecret()),"HKDF",false,["deriveKey"]);
  return await crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:salt as BufferSource,info:encoder.encode("small-toolbox-google-ads-refresh-v1")},input,{name:"AES-GCM",length:256},false,usage);
}
async function protect(token:string){
  const salt=rand(32),iv=rand(12);
  const key=await cryptoKey(salt,["encrypt"]);
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:iv as BufferSource},key,encoder.encode(token)));
  return {encrypted_refresh:b64(ciphertext),encryption_iv:b64(iv),encryption_salt:b64(salt)};
}
async function unprotect(link:Record<string,string>){
  const key=await cryptoKey(un64(link.encryption_salt),["decrypt"]);
  return d.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:un64(link.encryption_iv) as BufferSource},key,un64(link.encrypted_refresh) as BufferSource));
}
async function access(ownerId:string){
  const rows=await db("toolbox_google_ads_connections?select=encrypted_refresh,encryption_iv,encryption_salt&owner_id=eq."+encodeURIComponent(ownerId));
  if(!Array.isArray(rows)||rows.length!==1)throw Error("google_not_connected");
  const refresh=await unprotect(rows[0]);
  const form=new URLSearchParams({client_id:clientId(),client_secret:clientSecret(),refresh_token:refresh,grant_type:"refresh_token"});
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form});
  if(!r.ok)throw Error("google_refresh_failed");
  const result=await r.json();
  if(!result.access_token)throw Error("google_refresh_failed");
  return result.access_token as string;
}
async function listCustomers(ownerId:string){
  const token=await access(ownerId);
  const r=await fetch("https://googleads.googleapis.com/v26/customers:listAccessibleCustomers",{headers:{"Authorization":"Bearer "+token}});
  if(!r.ok)throw Error("google_ads_accounts_"+r.status);
  const v=await r.json();
  return (v.resourceNames||[]).filter((x:unknown)=>typeof x==="string").map((x:string)=>x.replace(/^customers\//,""));
}
const REPORTING_OWNER='8b060501-8453-4ecb-bbe1-38f33dd05e9f';
const REPORTING_SCOPES=['https://www.googleapis.com/auth/adwords','https://www.googleapis.com/auth/webmasters.readonly','https://www.googleapis.com/auth/adsense.readonly'];
const REPORTING_ADSENSE='accounts/pub-1802341703309961';
const relevantPage=(raw:string)=>{try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='abreda.com'||u.hostname.endsWith('.abreda.com')||/^(tb-[a-z0-9-]+|my-daily-life)\.pages\.dev$/.test(u.hostname));}catch{return false}};
async function reportingJob(req:Request){
 const key=req.headers.get('x-toolbox-reporting-key')||'';if(key.length<40||key.length>150)return false;
 const hash=await sha(key);
 const rows=await db('toolbox_reporting_job_keys?select=key_hash&key_name=eq.worker-reporting&key_hash=eq.'+hash);
 return Array.isArray(rows)&&rows.length===1;
}
async function reportingAccess(){return access(REPORTING_OWNER)}
async function googleRead(token:string,url:string,body?:unknown){
 const r=await fetch(url,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(18000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok){const e=new Error('Google HTTP '+r.status+': '+String(data.error?.message||'request failed').replace(/[\r\n<>]/g,' ').slice(0,350));throw e;}
 return data;
}
async function reportingData(start:string,end:string){
 let token:string;
 try{token=await reportingAccess()}catch{return {gsc:{status:'unconnected',detail:'Google OAuth 연결 필요',rows:[]},adsense:{status:'unconnected',detail:'Google OAuth 연결 필요',rows:[]},generatedAt:new Date().toISOString()};}
 const [gsc,adsense]=await Promise.all([
  (async()=>{try{
   const sites=await googleRead(token,'https://www.googleapis.com/webmasters/v3/sites');
   const available=(sites.siteEntry||[]).filter((s:any)=>s.permissionLevel!=='siteUnverifiedUser');
   const domain=available.some((s:any)=>s.siteUrl==='sc-domain:abreda.com');
   const selected=available.filter((s:any)=>s.siteUrl==='sc-domain:abreda.com'||(!domain&&/^https:\/\/([a-z0-9-]+\.)?abreda\.com\/$/.test(s.siteUrl))||s.siteUrl==='https://my-daily-life.pages.dev/');
   if(!selected.length)return {status:'unconnected',detail:'조회 가능한 작은도구함 Search Console 속성 없음',rows:[],properties:[]};
   const byKey=new Map();
   for(const site of selected){for(let offset=0;offset<100000;offset+=25000){
    const data=await googleRead(token,'https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(site.siteUrl)+'/searchAnalytics/query',{startDate:start,endDate:end,dimensions:['date','page'],dataState:'final',rowLimit:25000,startRow:offset});
    const rows=data.rows||[];
    for(const r of rows)if(r.keys?.length===2&&relevantPage(r.keys[1])&&Number.isFinite(r.clicks)&&Number.isFinite(r.impressions)&&r.clicks>=0&&r.impressions>=0)byKey.set(r.keys[0]+'\n'+r.keys[1],{date:r.keys[0],url:r.keys[1],clicks:r.clicks,impressions:r.impressions,property:site.siteUrl});
    if(rows.length<25000)break;if(offset===75000)throw Error('Search Console report limit reached; refusing incomplete import');
   }}
   return {status:byKey.size?'ok':'no_rows',detail:'Search Console 연결 확인 · 최종 확정 자료 '+byKey.size+'건',rows:[...byKey.values()],properties:selected.map((s:any)=>s.siteUrl)};
  }catch(e){return {status:'error',detail:String((e as Error).message),rows:[]};}})(),
  (async()=>{try{
   const accounts=await googleRead(token,'https://adsense.googleapis.com/v2/accounts');
   const account=(accounts.accounts||[]).find((a:any)=>a.name===REPORTING_ADSENSE);if(!account)return {status:'unconnected',detail:'기존 AdSense 계정 조회 권한 없음',rows:[]};
   const parts=(s:string)=>s.split('-').map(Number),a=parts(start),b=parts(end);
   const url=new URL('https://adsense.googleapis.com/v2/'+account.name+'/reports:generate');
   const params:any={dateRange:'CUSTOM','startDate.year':a[0],'startDate.month':a[1],'startDate.day':a[2],'endDate.year':b[0],'endDate.month':b[1],'endDate.day':b[2],currencyCode:'KRW',limit:100000};
   Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v)));['DATE','PAGE_URL'].forEach(d=>url.searchParams.append('dimensions',d));url.searchParams.append('metrics','ESTIMATED_EARNINGS');
   const report=await googleRead(token,url.toString());
   const headers=report.headers||[],rows=report.rows||[],names=headers.map((h:any)=>h.name),di=names.indexOf('DATE'),ui=names.indexOf('PAGE_URL'),mi=names.indexOf('ESTIMATED_EARNINGS');
   if([di,ui,mi].includes(-1))throw Error('AdSense report columns missing');
   if(Number(report.totalMatchedRows||0)>rows.length)throw Error('AdSense report truncated');
   const currency=headers[mi]?.currencyCode||report.currencyCode;if(currency!=='KRW')throw Error('AdSense currency mismatch');
   const relevant=rows.flatMap((row:any)=>{const c=(row.cells||[]).map((v:any)=>v.value),n=Number(c[mi]);return relevantPage(c[ui])&&/^\d{4}-\d{2}-\d{2}$/.test(c[di])&&Number.isFinite(n)&&n>=0?[{date:c[di],url:c[ui],earnings:n}]:[]});
   return {status:relevant.length?'ok':'no_rows',detail:'AdSense 계정·보고서 연결 확인 · 작은도구함 페이지 '+relevant.length+'건 · 행 없음은 수익 0 확정 아님',rows:relevant,account:account.name,currency:'KRW',reportingTimeZone:account.timeZone||null};
  }catch(e){return {status:'error',detail:String((e as Error).message),rows:[]};}})()
 ]);
 return {gsc,adsense,start,end,generatedAt:new Date().toISOString()};
}
async function reportingRoute(req:Request,u:URL,route:string){
 if(!['reporting-start','reporting-data'].includes(route))return reply({error:'not_found'},404);
 const admin=await authenticated(req.headers.get('cf-access-jwt-assertion'));
 if(route==='reporting-start'){
  if(!admin)return reply({error:'not_authenticated'},401);
  if(req.method!=='GET')return reply({error:'GET_only'},405);
  if(!clientId()||!clientSecret())return reply({error:'google_secrets_missing'},503);
  const state='rpt_'+b64(rand(32)),verifier=b64(rand(32));
  const hash=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))));
  await db('toolbox_google_ads_oauth_flows','POST',{state_hash:await sha(state),owner_id:REPORTING_OWNER,code_verifier:verifier,expires_at:new Date(Date.now()+10*60000).toISOString()});
  const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  Object.entries({client_id:clientId(),redirect_uri:CALLBACK,response_type:'code',scope:REPORTING_SCOPES.join(' '),access_type:'offline',prompt:'consent',include_granted_scopes:'true',state,code_challenge:hash,code_challenge_method:'S256'}).forEach(([k,v])=>auth.searchParams.set(k,v));
  return reply({authorizationUrl:auth.toString()});
 }
 if(!admin&&!await reportingJob(req))return reply({error:'not_authorized'},401);
 if(req.method!=='GET')return reply({error:'GET_only'},405);
 const end=u.searchParams.get('end')||new Date(Date.now()-3*86400000).toISOString().slice(0,10),start=u.searchParams.get('start')||end;
 const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!validDate(start)||!validDate(end)||start>end||Date.parse(end)-Date.parse(start)>32*86400000)return reply({error:'invalid_date_range'},400);
 return reply(await reportingData(start,end));
}

Deno.serve(async(req:Request)=>{
  const u=new URL(req.url),route=u.pathname.split("/").pop();
  if(route?.startsWith("reporting-")){try{return await reportingRoute(req,u,route);}catch{return reply({error:"reporting_unavailable"},503);}}
  if(route==="health"&&req.method==="GET")return reply({ok:true,version:2,configured:!!(clientId()&&clientSecret()),callback:CALLBACK});
  if(route==="callback"){
    if(req.method!=="GET")return page(false);
    const state=u.searchParams.get("state")||"",code=u.searchParams.get("code")||"";
    if(!/^[0-9A-Za-z_-]{35,150}$/.test(state)||!code||code.length>4096||u.searchParams.get("error"))return page(false);
    try{
      const rows=await db("toolbox_google_ads_oauth_flows?state_hash=eq."+await sha(state)+"&select=owner_id,code_verifier,expires_at","DELETE",undefined,true);
      if(!Array.isArray(rows)||rows.length!==1||Date.parse(rows[0].expires_at)<=Date.now())return page(false);
      const form=new URLSearchParams({client_id:clientId(),client_secret:clientSecret(),grant_type:"authorization_code",code,redirect_uri:CALLBACK,code_verifier:rows[0].code_verifier});
      const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form});
      if(!r.ok)return page(false);
      const body=await r.json();
      if(typeof body.refresh_token!=="string"||!body.refresh_token)return page(false);
      const protectedToken=await protect(body.refresh_token);
      await db("toolbox_google_ads_connections?on_conflict=owner_id","POST",{owner_id:rows[0].owner_id,...protectedToken,connected_at:new Date().toISOString(),updated_at:new Date().toISOString()},false);
      if(state.startsWith("rpt_"))return new Response(null,{status:303,headers:{...baseHead,Location:"https://adminivo.com/next/#sources"}});
      return page(true);
    }catch(e){console.error("OAuth callback failed",String(e).slice(0,130));return page(false);}
  }
  const origin=req.headers.get("Origin")||"";
  if(!ORIGINS.has(origin))return reply({error:"origin_not_allowed"},403);
  const cors={"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Authorization, apikey, Content-Type"};
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  try{
    const ownerId=await owner(req);
    if(route==="status"&&req.method==="GET"){
      const rows=await db("toolbox_google_ads_connections?select=connected_at&owner_id=eq."+encodeURIComponent(ownerId));
      return reply({configured:!!(clientId()&&clientSecret()),connected:Array.isArray(rows)&&rows.length===1},200,cors);
    }
    if(route==="start"&&req.method==="POST"){
      if(!clientId()||!clientSecret())return reply({error:"google_secrets_missing"},503,cors);
      const state=b64(rand(32)),verifier=b64(rand(32));
      const hash=b64(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(verifier))));
      await db("toolbox_google_ads_oauth_flows","POST",{state_hash:await sha(state),owner_id:ownerId,code_verifier:verifier,expires_at:new Date(Date.now()+10*60*1000).toISOString()});
      const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
      const params={client_id:clientId(),redirect_uri:CALLBACK,response_type:"code",scope:"https://www.googleapis.com/auth/adwords",access_type:"offline",prompt:"consent",state,code_challenge:hash,code_challenge_method:"S256"};
      Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
      return reply({authorizationUrl:url.toString()},200,cors);
    }
    if(route==="accounts"&&req.method==="GET"){
      return reply({accounts:await listCustomers(ownerId)},200,cors);
    }
    if(route==="keywords"&&req.method==="POST"){
      const reqBody=await req.json();
      const customerId=String(reqBody?.customerId||"").replace(/-/g,"");
      const keywords=reqBody?.keywords;
      if(!/^\d{10}$/.test(customerId)||!Array.isArray(keywords)||keywords.length<1||keywords.length>20||keywords.some((x:unknown)=>typeof x!=="string"||x.trim().length<2||x.length>100))return reply({error:"invalid_keywords_or_account"},400,cors);
      const target=String(reqBody?.target||"KR");
      if(!["KR","US"].includes(target))return reply({error:"invalid_target"},400,cors);
      const tok=await access(ownerId);
      const payload={keywordSeed:{keywords:keywords.map((x:string)=>x.trim())},language:target==="KR"?"languageConstants/1012":"languageConstants/1000",geoTargetConstants:[target==="KR"?"geoTargetConstants/2410":"geoTargetConstants/2840"],keywordPlanNetwork:"GOOGLE_SEARCH",pageSize:50,includeAdultKeywords:false};
      const resp=await fetch("https://googleads.googleapis.com/v26/customers/"+customerId+":generateKeywordIdeas",{method:"POST",headers:{"Authorization":"Bearer "+tok,"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(!resp.ok){
        // Expose only a bounded, sanitized Google Ads error to the authenticated owner.
        // Never return raw response headers, tokens, account credentials or input payload.
        const data=await resp.json().catch(()=>({}));
        const error=data && typeof data==="object" && data.error && typeof data.error==="object"?data.error:{};
        const detail=Array.isArray(error.details)?error.details:[];
        const googleAdsFailure=detail.flatMap((d:Record<string,unknown>)=>Array.isArray(d.errors)?d.errors:[])[0]||{};
        const errorCodes=googleAdsFailure.errorCode && typeof googleAdsFailure.errorCode==="object"?Object.values(googleAdsFailure.errorCode):[];
        const code=String(errorCodes[0]||error.status||"UNKNOWN").replace(/[^A-Z0-9_]/gi,"").slice(0,85);
        const message=String(googleAdsFailure.message||error.message||"Google did not provide a diagnostic message").replace(/[\r\n\t<>]/g," ").slice(0,420);
        const requestId=String(resp.headers.get("request-id")||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);
        console.warn("Google Ads keywords error:",resp.status,code,requestId);
        return reply({error:"google_ads_keyword_request_failed",httpStatus:resp.status,googleStatus:String(error.status||"").slice(0,45),googleCode:code,googleMessage:message,requestId},502,cors);
      }
      const result=await resp.json();
      return reply({results:(result.results||[]).slice(0,50).map((x:Record<string,unknown>)=>({keyword:x.text,metrics:x.keywordIdeaMetrics||null})),nextPageToken:result.nextPageToken||null},200,cors);
    }
    return reply({error:"not_found"},404,cors);
  }catch(e){
    const label=String((e as Error).message||"server_error");
    const safe=/^(not_authenticated|not_authorized|auth_not_configured|google_not_connected|google_refresh_failed|google_ads_accounts_\d{3}|database_request_\d{3}|server_database_key_unavailable)$/.test(label)?label:"operation_failed";
    console.error("Google Ads backend:",safe);
    return reply({error:safe},label==="not_authenticated"?401:label==="not_authorized"?403:503,cors);
  }
});
