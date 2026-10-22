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
