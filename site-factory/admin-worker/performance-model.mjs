// Classified sessions are observations, not verified unique people. Missing values stay null.
export function sourceState(row){
 if(!row)return {status:'unverified',connected:null,checkedAt:null};
 let meta={};try{meta=JSON.parse(row.detail)}catch{}
 const connected=['ok','no_rows','connected'].includes(row.status)?true:row.status==='unconnected'?false:null;
 const stale=connected===true&&(!row.last_check_at||!Number.isFinite(Date.parse(row.last_check_at))||Date.now()-Date.parse(row.last_check_at)>9*3600000);
 return {...meta,status:stale?'stale':row.status,connected,checkedAt:row.last_check_at||null};
}
function visitUrl(raw){try{return new URL(raw).toString()}catch{return null}}
export function metricOwner(raw,entries){
 try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password)return null;
 const path=u.pathname.replace(/^\/en(?=\/)/,'');
 return entries.filter(e=>{const v=new URL(e.url);return v.hostname===u.hostname&&(path===v.pathname.replace(/\/$/,'')||path.startsWith(v.pathname))}).sort((a,b)=>new URL(b.url).pathname.length-new URL(a.url).pathname.length)[0]?.url||null;
 }catch{return null}
}
export function aggregatePages(rows,entries,fields){
 const out=new Map();for(const row of rows){const url=metricOwner(row.url,entries);if(!url||fields.some(k=>!Number.isFinite(row[k])||row[k]<0))continue;
 let item=out.get(url);if(!item){item={fetchedAt:null,pages:0};for(const k of fields)item[k]=0;out.set(url,item)}
 for(const k of fields)item[k]+=row[k];item.pages++;
 const t=row.fetchedAt||row.fetched_at;if(t&&(!item.fetchedAt||t>item.fetchedAt))item.fetchedAt=t;
 }return out;
}
export function integratePerformance(report,legacy){
 report.legacy={available:legacy.available,fetchedAt:legacy.fetchedAt||null,version:legacy.version??null,error:legacy.error||null};
 if(!legacy.available){for(const e of report.entries)e.visitors={value:null,status:'error',source:'Supabase'};return report}
 const sites=new Map((legacy.sites||[]).map(s=>[s.id,s])),modern=new Map((legacy.publicSites||[]).map(s=>[s.site_id,s]));
 const entries=new Map(report.entries.map(e=>[e.url,e]));
 const urlFor=(r,pub)=>visitUrl((pub?modern:sites).get(r.site_id)?.url);
 for(const s of [...sites.values(),...modern.values()]){const e=entries.get(visitUrl(s.url));if(e)e.visitors={value:null,status:'no_report_row',classification:{},source:'Supabase',fetchedAt:legacy.fetchedAt}}
 const publicRows=(legacy.publicTraffic||[]).filter(r=>r.visit_day===report.date),modernUrls=new Set(publicRows.map(r=>urlFor(r,true)).filter(Boolean));
 const rows=[...(legacy.classifiedTraffic||[]).filter(r=>r.visit_day===report.date&&!modernUrls.has(urlFor(r,false))).map(r=>({...r,url:urlFor(r,false)})),...publicRows.map(r=>({...r,url:urlFor(r,true)}))];
 for(const r of rows){const e=entries.get(r.url);if(!e||!['likely_human','bot','automated','unknown'].includes(r.category)||!Number.isSafeInteger(r.visits)||r.visits<0||!Number.isSafeInteger(r.pageviews)||r.pageviews<0)continue;
 const v=e.visitors;v.classification||={};const old=v.classification[r.category];if(old&&String(old.observedAt)>=String(r.updated_at))continue;
 v.classification[r.category]={sessions:r.visits,pageviews:r.pageviews,observedAt:r.updated_at};v.status='observed';v.source=modernUrls.has(r.url)?'Supabase public visit daily':'Supabase legacy classified events';v.fetchedAt=legacy.fetchedAt;
 }
 for(const e of report.entries){const h=e.visitors?.classification?.likely_human;if(h){e.visitors.value=h.sessions;e.visitors.pageviews=h.pageviews;e.visitors.observedAt=h.observedAt}}
 for(const r of legacy.traffic||[]){if(r.visit_day!==report.date)continue;const e=entries.get(urlFor(r,false));if(!e)continue;e.visitors.legacyTotal={sessions:r.visits,pageviews:r.pageviews,observedAt:r.updated_at};if(!Object.keys(e.visitors.classification||{}).length)e.visitors.status='legacy_unclassified'}
 report.legacyDaily=(legacy.traffic||[]).filter(r=>r.visit_day===report.date).map(r=>({...r,url:urlFor(r,false),title:sites.get(r.site_id)?.name||r.site_id}));
 report.history=(legacy.metrics||[]).filter(m=>m.date===report.date).map(m=>({...m,url:visitUrl(sites.get(m.siteId)?.url),title:sites.get(m.siteId)?.name||m.siteId}));
 report.visitPolicy='Public classified snapshot per canonical/day takes precedence over legacy classification. Raw legacy totals and manual history are separate, never added. Missing category is unknown, not zero. Historical automated includes bots.';
 return report;
}
export function buildPerformance(entries,gsc,ads,sync,date){
 const states=Object.fromEntries(sync.map(r=>[r.source,sourceState(r)])),search=aggregatePages(gsc,entries,['clicks','impressions']),money=aggregatePages(ads,entries,['earnings']);
 const fallback=(s,empty)=>s?.status==='error'?'error':s?.status==='stale'?'stale':s?.connected===true?empty:s?.connected===false?'source_unconnected':'unverified';
 const end=states.GSC?.end||new Date(Date.now()-3*86400000).toISOString().slice(0,10);
 return {date,sources:states,searchFinalThrough:end,sourceNotes:{visitors:'Classified sessions, not unique people; KST dates',search:'Google final date/page reports, not real time',revenue:'AdSense estimated earnings in KRW; missing is not zero'},entries:entries.map(s=>{
 const m=search.get(s.url),v=money.get(s.url),g=states.GSC,a=states.ADSENSE;
 const covered=!g?.properties||g.properties.some(p=>p.startsWith('sc-domain:')?(new URL(s.url).hostname===p.slice(10)||new URL(s.url).hostname.endsWith('.'+p.slice(10))):s.url.startsWith(p));
 return {...s,visitors:{value:null,status:'unverified'},search:{clicks:m?.clicks??null,impressions:m?.impressions??null,status:m?(['error','stale'].includes(g?.status)?'stale_error':'confirmed'):g?.status==='error'?'error':g?.status==='stale'?'stale':date>end?'pending':g?.connected===true&&!covered?'property_unavailable':fallback(g,'no_final_row'),source:'Google Search Console',fetchedAt:m?.fetchedAt||g?.checkedAt||null,connectionStatus:g?.status||'unverified',finalThrough:end},earnings:{value:v?.earnings??null,currency:'KRW',status:v?(['error','stale'].includes(a?.status)?'stale_error':'estimated_from_source'):fallback(a,'no_report_row'),source:'AdSense API',fetchedAt:v?.fetchedAt||a?.checkedAt||null,connectionStatus:a?.status||'unverified'}};
 })};
}
