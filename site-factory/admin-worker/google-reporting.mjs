const GOOGLE_REPORTING_ROOT='https://ytifxhpizractdeytrok.supabase.co/functions/v1/toolbox-google-ads-oauth/';
async function googleConnect(request){
 const r=await fetch(GOOGLE_REPORTING_ROOT+'reporting-start',{headers:{'cf-access-jwt-assertion':request.headers.get('cf-access-jwt-assertion')||''},signal:AbortSignal.timeout(20000)});
 const value=await r.json();if(!r.ok)return json({error:value.error||'Google connection unavailable'},r.status);
 const target=new URL(value.authorizationUrl);if(target.origin!=='https://accounts.google.com'||target.pathname!=='/o/oauth2/v2/auth')throw Error('Invalid OAuth destination');
 return new Response(null,{status:303,headers:{Location:target.toString(),'cache-control':'no-store','referrer-policy':'no-referrer'}});
}
async function syncGoogleReporting(env,request){
 const headers=env.REPORTING_BRIDGE_KEY?{'x-toolbox-reporting-key':env.REPORTING_BRIDGE_KEY}:{'cf-access-jwt-assertion':request?.headers.get('cf-access-jwt-assertion')||''};
 if(!request&&!env.REPORTING_BRIDGE_KEY)return {status:'unconnected',detail:'Scheduled reporting credential missing'};
 const end=new Date(Date.now()-3*86400000).toISOString().slice(0,10),start=new Date(Date.now()-27*86400000).toISOString().slice(0,10);
 let data;
 try{
  const r=await fetch(GOOGLE_REPORTING_ROOT+'reporting-data?start='+start+'&end='+end,{headers,signal:AbortSignal.timeout(55000)});
  if(!r.ok)throw Error('Reporting bridge HTTP '+r.status);data=await r.json();
 }catch(e){for(const source of ['GSC','ADSENSE'])await writeSync(env.REPORT_DB,source,'error',String(e.message).slice(0,400));throw e;}
 const result={};
 for(const [key,source] of [['gsc','GSC'],['adsense','ADSENSE']]){
  const provider=data[key];if(!provider||!['ok','no_rows','error','unconnected'].includes(provider.status)||!Array.isArray(provider.rows))throw Error('Invalid reporting response');
  const rows=provider.rows,statements=[];
  if(['ok','no_rows'].includes(provider.status))for(const row of rows){
   const validUrl=(()=>{try{const u=new URL(row.url);return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='abreda.com'||u.hostname.endsWith('.abreda.com')||/^(tb-[a-z0-9-]+|my-daily-life)\.pages\.dev$/.test(u.hostname))}catch{return false}})();
   if(!validUrl||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||row.date<start||row.date>end)throw Error('Invalid report row');
   if(key==='gsc'){
    if(!Number.isSafeInteger(row.clicks)||!Number.isSafeInteger(row.impressions)||row.clicks<0||row.impressions<0)throw Error('Invalid search metrics');
    statements.push(env.REPORT_DB.prepare("INSERT INTO gsc_metrics(date,page_url,clicks,impressions,source,received_at) VALUES(?,?,?,?,'Google Search Console final',datetime('now')) ON CONFLICT(date,page_url) DO UPDATE SET clicks=excluded.clicks,impressions=excluded.impressions,received_at=excluded.received_at").bind(row.date,row.url,row.clicks,row.impressions));
   }else{
    if(provider.currency!=='KRW'||!Number.isFinite(row.earnings)||row.earnings<0)throw Error('Invalid earnings');
    statements.push(env.REPORT_DB.prepare("INSERT INTO adsense_metrics(date,page_url,earnings_krw,source,received_at) VALUES(?,?,?,'AdSense estimated earnings (KRW)',datetime('now')) ON CONFLICT(date,page_url) DO UPDATE SET earnings_krw=excluded.earnings_krw,received_at=excluded.received_at").bind(row.date,row.url,row.earnings));
   }
  }
  for(let i=0;i<statements.length;i+=60)await env.REPORT_DB.batch(statements.slice(i,i+60));
  await writeSync(env.REPORT_DB,source,provider.status,String(provider.detail||'').slice(0,800));result[key]={status:provider.status,imported:statements.length,detail:provider.detail};
 }
 return {start,end,...result};
}

