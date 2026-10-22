var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/catalog.mjs
function canonicalUrl(input2) {
  if (typeof input2 !== "string") throw new TypeError("Expected URL");
  const u = new URL(input2);
  if (u.protocol !== "https:" || u.username || u.password || u.port || u.search || u.hash) throw new Error("Only canonical HTTPS URLs allowed");
  const host = u.hostname.toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(host) || host.includes("..")) throw new Error("Invalid host");
  if (host !== "abreda.com" && !host.endsWith(".abreda.com") && !host.endsWith(".pages.dev")) throw new Error("Host is not an approved Small Toolbox website");
  u.hostname = host;
  u.pathname = u.pathname.replace(/\/{2,}/g, "/").replace(/\/?$/, "/");
  return u.toString();
}
__name(canonicalUrl, "canonicalUrl");
function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}
__name(decode, "decode");
function plain(s) {
  return decode(s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
}
__name(plain, "plain");
function publicCatalogFromHtml(html) {
  if (typeof html !== "string") throw new TypeError("Invalid directory");
  const articles = [...html.matchAll(/<article\b[^>]*class=["'][^"']*\btool\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)];
  const catalog = /* @__PURE__ */ new Map();
  for (const [, inside] of articles) {
    const head = inside.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
    const anchor = inside.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i);
    if (!head || !anchor) continue;
    const title = plain(head[1]);
    let url;
    try {
      url = canonicalUrl(decode(anchor[1]));
    } catch {
      continue;
    }
    if (!title || title.length > 300) continue;
    const kind = new URL(url).hostname === "abreda.com" && new URL(url).pathname.startsWith("/tools/") ? "tool_page" : "independent_site";
    if (!catalog.has(url)) catalog.set(url, { url, title, kind, source: "first_party_directory", status: "listed", verified: true });
  }
  if (catalog.size === 0) throw new Error("First-party catalog markup unavailable: preserve last snapshot");
  return [...catalog.values()];
}
__name(publicCatalogFromHtml, "publicCatalogFromHtml");
function isProductionSuccess(project) {
  const dep = project?.canonical_deployment;
  return !!(dep?.environment === "production" && dep?.latest_stage?.status === "success" && !dep?.is_skipped);
}
__name(isProductionSuccess, "isProductionSuccess");
var EXCLUDE_PAGES_PROJECTS = /* @__PURE__ */ new Set([
  "tb-toolbox-admin",
  "tb-toolbox-admin-rebuild",
  "tb-toolbox-hub",
  "tb-deployment-check",
  "tb-naver-keyword-api"
]);
function deployedProjectsFromApi(projects, firstParty = []) {
  const found = [];
  for (const p of projects) {
    const listedHost = firstParty.some((s) => {
      try {
        return new URL(s.url).hostname === `${p?.name}.pages.dev`;
      } catch {
        return false;
      }
    });
    if (!p?.name?.startsWith("tb-") && !listedHost || EXCLUDE_PAGES_PROJECTS.has(p.name)) continue;
    if (!isProductionSuccess(p)) continue;
    const candidate = canonicalUrl("https://" + p.name + ".pages.dev/");
    const domains = /* @__PURE__ */ new Set([new URL(candidate).hostname, ...(Array.isArray(p.domains) ? p.domains : []).map((d) => String(d).toLowerCase())]);
    const slug = p.name.replace(/^tb-pages-/, "").replace(/^tb-/, "");
    const matched = firstParty.find((s) => {
      const u = new URL(s.url);
      return !u.pathname.startsWith("/tools/") && domains.has(u.hostname);
    }) || firstParty.find((s) => {
      const u = new URL(s.url);
      return u.hostname === "abreda.com" && u.pathname === `/tools/${slug}/`;
    });
    found.push({ url: matched?.url || candidate, title: matched?.title || p.name, kind: matched ? new URL(matched.url).hostname === "abreda.com" && new URL(matched.url).pathname.startsWith("/tools/") ? "tool_page" : "independent_site" : "independent_site", source: matched ? "directory_and_pages_api" : "pages_api", status: matched ? "listed" : "deployed_not_listed", verified: !!matched, cfProject: p.name, cfDeploymentId: p.canonical_deployment.id || null });
  }
  return found;
}
__name(deployedProjectsFromApi, "deployedProjectsFromApi");
function combineEvidence(fromHub, fromPages) {
  const merged = new Map(fromHub.map((s) => [s.url, { ...s }]));
  for (const item of fromPages) {
    const earlier = merged.get(item.url);
    if (earlier) merged.set(item.url, { ...earlier, cfProject: item.cfProject, cfDeploymentId: item.cfDeploymentId, source: "directory_and_pages_api" });
    else merged.set(item.url, { ...item });
  }
  return [...merged.values()];
}
__name(combineEvidence, "combineEvidence");

async function readLegacy(request, fetcher=fetch) {
  const token=request?.headers.get('cf-access-jwt-assertion');
  if(!token)return {available:false,error:'Legacy administrator authentication unavailable'};
  try{
    const r=await fetcher('https://ytifxhpizractdeytrok.supabase.co/functions/v1/toolbox-admin-legacy-read',{
      headers:{'cf-access-jwt-assertion':token},redirect:'manual',signal:AbortSignal.timeout(15000)
    });
    if(!r.ok)throw Error('Legacy source HTTP '+r.status);
    const data=await r.json();
    if(!Array.isArray(data.sites)||!Array.isArray(data.metrics)||!Array.isArray(data.traffic))throw Error('Invalid legacy source');
    return {...data,available:true};
  }catch(e){return {available:false,error:String(e.message||e)};}
}
function legacyUrl(url){try{return canonicalUrl(url)}catch{return null}}
function integratePerformance(report,legacy){
  report.legacy={available:legacy.available,fetchedAt:legacy.fetchedAt||null,updatedAt:legacy.updatedAt||null,version:legacy.version??null,error:legacy.error||null};
  if(!legacy.available)return report;
  const sites=new Map(legacy.sites.map(s=>[s.id,s]));
  const knownUrls=new Set(legacy.sites.map(s=>legacyUrl(s.url)).filter(Boolean));
  for(const entry of report.entries)if(knownUrls.has(entry.url))entry.visitors={value:null,status:'no_report_row',source:'Supabase browser beacon',fetchedAt:legacy.fetchedAt};
  const daily=new Map();
  for(const r of legacy.traffic){
    const site=sites.get(r.site_id),url=legacyUrl(site?.url);
    if(!url||r.visit_day!==report.date||!Number.isSafeInteger(r.visits)||r.visits<0||!Number.isSafeInteger(r.pageviews)||r.pageviews<0)continue;
    // one canonical service/day; never sum aliases or duplicate workspace beacon rows
    if(!daily.has(url)||String(r.updated_at)>String(daily.get(url).updated_at))daily.set(url,{...r,title:site.name});
  }
  for(const [url,r] of daily){
    let entry=report.entries.find(s=>s.url===url);
    if(!entry){entry={serviceId:url,url,title:r.title,kind:'independent_site',legacyOnly:true,search:{clicks:null,impressions:null,status:'source_unconnected'},earnings:{value:null,status:'source_unconnected'}};report.entries.push(entry);}
    entry.visitors={value:r.visits,pageviews:r.pageviews,status:'observed',source:'Supabase browser beacon · sessions, not unique people',fetchedAt:legacy.fetchedAt,observedAt:r.updated_at};
  }
  // Preserve original records as history; never add them to daily beacon counts.
  report.history=legacy.metrics.filter(m=>m.date===report.date).map(m=>({...m,url:legacyUrl(sites.get(m.siteId)?.url),title:sites.get(m.siteId)?.name||m.siteId}));
  return report;
}
async function readSourceStatus(env,request){
  const [state,legacy]=await Promise.all([env.REPORT_DB.prepare('SELECT * FROM report_sync ORDER BY source').all(),readLegacy(request)]);
  const rows=state.results||[];
  function set(source,status,detail,time=null){const i=rows.findIndex(r=>r.source===source);const row={source,status,detail,last_check_at:time};if(i>=0)rows[i]=row;else rows.push(row);}
  if(!rows.some(r=>r.source==='GSC'))set('GSC',env.GSC_CLIENT_ID&&env.GSC_CLIENT_SECRET&&env.GSC_REFRESH_TOKEN?'pending':'unconnected','Google Search Console: '+(env.GSC_REFRESH_TOKEN?'최종 확정 자료 수집 대기':'OAuth 연결 없음'));
  if(!rows.some(r=>r.source==='ADSENSE'))set('ADSENSE',env.ADSENSE_CLIENT_ID&&env.ADSENSE_CLIENT_SECRET&&env.ADSENSE_REFRESH_TOKEN&&env.ADSENSE_ACCOUNT?'pending':'unconnected','AdSense: '+(env.ADSENSE_REFRESH_TOKEN?'보고서 수집 대기':'OAuth 연결 없음'));
  set('VISIT',legacy.available?'connected':'error',legacy.available?`기존 Supabase 실시간 조회 · 일별 ${legacy.traffic.length}건 / 원본 성과 ${legacy.metrics.length}건 · 세션과 고유 방문자 구분 · 중복 합산 없음`:legacy.error,legacy.fetchedAt);
  let cache=null;
  if(env.SNS_DB)try{cache=await env.SNS_DB.prepare("SELECT updated_at FROM api_cache WHERE key='buffer'").first()}catch{}
  set('BUFFER',env.BUFFER_API_KEY?(cache&&Date.now()-Date.parse(cache.updated_at)<300000?'connected':'pending'):'unconnected',env.BUFFER_API_KEY?'Buffer API 설정됨 · 최신 검증 상태는 SNS 관제센터에서 확인':'Buffer API 키 미설정',cache?.updated_at);
  return {searchSource:'Google Search Console',searchMetrics:'final reports only, NOT real-time',revenueSource:env.ADSENSE_ACCOUNT?'AdSense configured; check sync status':'AdSense OAuth unconnected',visitorSource:'Supabase read-only browser beacon; sessions, not unique people',sync:rows,legacy:{available:legacy.available,version:legacy.version??null}};
}

// src/registry.mjs
var now = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
async function writeSync(db, source, status, detail) {
  await db.prepare("INSERT INTO report_sync(source,last_check_at,status,detail) VALUES(?,?,?,?) ON CONFLICT(source) DO UPDATE SET last_check_at=excluded.last_check_at,status=excluded.status,detail=excluded.detail").bind(source, now(), status, detail).run();
}
__name(writeSync, "writeSync");
async function getCloudflarePagesProjects(env, fetcher = fetch) {
  if (!env.CF_PAGES_READ_TOKEN || !env.CF_ACCOUNT_ID) return null;
  const all = [];
  for (let page = 1; page <= 30; page++) {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/pages/projects?page=${page}&per_page=10`;
    const r = await fetcher(endpoint, { headers: { Authorization: `Bearer ${env.CF_PAGES_READ_TOKEN}` } });
    if (!r.ok) { const failure=await r.json().catch(()=>null); throw new Error(`Cloudflare Pages query failed: HTTP ${r.status}: ${JSON.stringify(failure?.errors||[]).slice(0,300)}`); }
    const j = await r.json();
    if (!j.success || !Array.isArray(j.result)) throw new Error("Cloudflare Pages schema or auth failure");
    all.push(...j.result);
    if (j.result_info?.total_pages && page >= j.result_info.total_pages) return all;
    if (j.result.length < 10) return all;
  }
  throw new Error("Cloudflare Pages response truncated; refuse partial import");
}
__name(getCloudflarePagesProjects, "getCloudflarePagesProjects");
async function syncRegistry(env, { fetcher = fetch } = {}) {
  if (!env.REPORT_DB) throw new Error("Missing REPORT_DB");
  let hub = null, pages = null, hubError = null, pagesError = null;
  try {
    const r = await fetcher("https://abreda.com/", { headers: { Accept: "text/html" }, redirect: "follow" });
    if (!r.ok) throw new Error("Directory HTTP " + r.status);
    hub = publicCatalogFromHtml(await r.text());
  } catch (e) {
    hubError = String(e.message || e).slice(0, 180);
  }
  try {
    pages = await getCloudflarePagesProjects(env, fetcher);
  } catch (e) {
    pagesError = String(e.message || e).slice(0, 180);
  }
  if (!hub) {
    const msg = `Canonical directory unavailable; preserve registry: hub=${hubError ?? "n/a"}; pages=${pagesError ?? "not connected"}`;
    await writeSync(env.REPORT_DB, "CATALOG", "error", msg);
    throw new Error(msg);
  }
  const evidence = combineEvidence(hub || [], pages ? deployedProjectsFromApi(pages, hub || []) : []);
  const missingPages = !env.CF_PAGES_READ_TOKEN || !env.CF_ACCOUNT_ID;
  const date = now();
  const commands = evidence.map((s) => env.REPORT_DB.prepare(`INSERT INTO services (service_id,canonical_url,title,kind,origin,status,cf_project,cf_deployment_id,first_seen_at,last_seen_at)
 VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(service_id) DO UPDATE SET
 title=excluded.title,kind=excluded.kind,
 origin=CASE WHEN excluded.origin='pages_api' AND services.origin='first_party_directory' THEN services.origin ELSE excluded.origin END,
 status=CASE WHEN excluded.status='deployed_not_listed' AND services.status='listed' THEN services.status ELSE excluded.status END,
 cf_project=COALESCE(excluded.cf_project,services.cf_project),cf_deployment_id=COALESCE(excluded.cf_deployment_id,services.cf_deployment_id),
 last_seen_at=excluded.last_seen_at`).bind(s.url, s.url, s.title, s.kind, s.source, s.status, s.cfProject || null, s.cfDeploymentId || null, date, date));
  for (let i = 0; i < commands.length; i += 60) await env.REPORT_DB.batch(commands.slice(i, i + 60));
  await writeSync(env.REPORT_DB, "CATALOG", hubError || pagesError || missingPages ? "partial" : "ok", `items=${evidence.length}; directory=${hub?.length ?? "unavailable"}; pages=${pages?.length ?? "unavailable"}; ${[hubError, pagesError, missingPages ? "Pages API unconnected" : null].filter(Boolean).join("; ")}`);
  return { updated: evidence.length, fromDirectory: hub?.length ?? null, pagesProjects: pages?.length ?? null, missingSource: hubError || pagesError || (missingPages ? "Pages API unconnected" : null) };
}
__name(syncRegistry, "syncRegistry");
async function readRegistry(env) {
  const r = await env.REPORT_DB.prepare(`SELECT service_id AS serviceId,canonical_url AS url,title,kind,origin,status,cf_project AS cfProject,cf_deployment_id AS cfDeploymentId,first_seen_at AS firstSeenAt,last_seen_at AS lastSeenAt FROM services WHERE status != 'verification_archived' ORDER BY title`).all();
  return { entries: r.results ?? [], source: "Small Toolbox first-party public directory + authorized Cloudflare Pages API", note: "Registered services differ from distinct hostnames; missing analytics must not be represented as zero" };
}
__name(readRegistry, "readRegistry");
async function readPerformance(env, date, request) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid report date");
  const [services, gsc, ads] = await Promise.all([
    readRegistry(env),
    env.REPORT_DB.prepare("SELECT page_url AS url,clicks,impressions,received_at AS fetchedAt FROM gsc_metrics WHERE date=? AND page_url!=?").bind(date, "__PROPERTY__").all(),
    env.REPORT_DB.prepare("SELECT page_url AS url,earnings_krw AS earnings,received_at AS fetched_at FROM adsense_metrics WHERE date=?").bind(date).all()
  ]);
  const search = new Map((gsc.results || []).map((r) => [r.url, r]));
  const money = new Map((ads.results || []).map((r) => [r.url, r]));
  const gscAvailable = Boolean(env.GSC_CLIENT_ID && env.GSC_CLIENT_SECRET && env.GSC_REFRESH_TOKEN);
  const adsAvailable = Boolean(env.ADSENSE_CLIENT_ID && env.ADSENSE_CLIENT_SECRET && env.ADSENSE_REFRESH_TOKEN && env.ADSENSE_ACCOUNT);
  const report = {
    date,
    sourceNotes: { visitors: "Not connected to verified per-service analytics; a browser beacon session is not a unique human", search: "Google Search Console finalized date+page rows only, not real time", revenue: "AdSense estimated earnings in KRW only after verified OAuth connection" },
    entries: services.entries.map((s) => {
      const metric = search.get(s.url), revenue = money.get(s.url), host = new URL(s.url).hostname;
      const covered = host === "abreda.com" || host.endsWith(".abreda.com");
      return {
        ...s,
        visitors: { value: null, status: "source_unconnected" },
        search: { clicks: metric?.clicks ?? null, impressions: metric?.impressions ?? null, status: metric ? "confirmed" : gscAvailable && covered ? "no_final_row" : "source_unconnected", source: metric ? "Google Search Console" : null, fetchedAt: metric?.fetchedAt || null },
        earnings: { value: revenue?.earnings ?? null, currency: "KRW", status: revenue ? "estimated_from_source" : adsAvailable ? "no_report_row" : "source_unconnected", source: revenue ? "AdSense API" : null, fetchedAt: revenue?.fetched_at || null }
      };
    })
  };
  return integratePerformance(report,await readLegacy(request));
}
__name(readPerformance, "readPerformance");

// src/adsense.mjs
var dayOk = /* @__PURE__ */ __name((x) => /^\d{4}-\d{2}-\d{2}$/.test(x), "dayOk");
function decodeAdSenseReport(report) {
  if (!Array.isArray(report.headers) || !Array.isArray(report.rows)) throw new Error("AdSense report invalid");
  const names = report.headers.map((h) => h.name);
  const at = /* @__PURE__ */ __name((name) => names.indexOf(name), "at");
  const d = at("DATE"), u = at("PAGE_URL"), m = at("ESTIMATED_EARNINGS");
  if ([d, u, m].includes(-1)) throw new Error("AdSense columns missing");
  if (Number.isInteger(report.totalMatchedRows) && report.totalMatchedRows > report.rows.length) throw new Error("AdSense report truncated");
  const result = [];
  for (const row of report.rows) {
    const values = row.cells?.map((c) => c.value) || [];
    if (values.length !== names.length || !dayOk(values[d])) continue;
    const v = Number(values[m]);
    if (!Number.isFinite(v) || v < 0) continue;
    let url;
    try {
      url = canonicalUrl(values[u]);
    } catch {
      continue;
    }
    result.push({ date: values[d], url, earnings: v });
  }
  return result;
}
__name(decodeAdSenseReport, "decodeAdSenseReport");
async function adsenseToken(env, fetcher) {
  for (const key of ["ADSENSE_CLIENT_ID", "ADSENSE_CLIENT_SECRET", "ADSENSE_REFRESH_TOKEN", "ADSENSE_ACCOUNT"]) if (!env[key]) return null;
  const body = new URLSearchParams({ client_id: env.ADSENSE_CLIENT_ID, client_secret: env.ADSENSE_CLIENT_SECRET, refresh_token: env.ADSENSE_REFRESH_TOKEN, grant_type: "refresh_token" });
  const r = await fetcher("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) throw new Error("AdSense OAuth failed: " + r.status);
  const obj = await r.json();
  if (!obj.access_token) throw new Error("AdSense token missing");
  return obj.access_token;
}
__name(adsenseToken, "adsenseToken");
async function syncAdsense(env, { fetcher = fetch } = {}) {
  const token = await adsenseToken(env, fetcher);
  if (!token) return { status: "unconnected", imported: null };
  if (!/^accounts\/\d+$/.test(env.ADSENSE_ACCOUNT)) throw new Error("Invalid AdSense account resource");
  const end = /* @__PURE__ */ new Date(), start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 7);
  const parts = /* @__PURE__ */ __name((x) => [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()], "parts");
  const a = parts(start), b = parts(end);
  const u = new URL(`https://adsense.googleapis.com/v2/${env.ADSENSE_ACCOUNT}/reports:generate`);
  const params = { "dateRange": "CUSTOM", "startDate.year": a[0], "startDate.month": a[1], "startDate.day": a[2], "endDate.year": b[0], "endDate.month": b[1], "endDate.day": b[2], currencyCode: "KRW", limit: "100000" };
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  for (const d of ["DATE", "PAGE_URL"]) u.searchParams.append("dimensions", d);
  u.searchParams.append("metrics", "ESTIMATED_EARNINGS");
  const res = await fetcher(u, { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) throw new Error("AdSense report failed: " + res.status);
  const report = await res.json();
  if (report.currencyCode !== "KRW") throw new Error("AdSense response currency mismatch");
  const rows = decodeAdSenseReport(report);
  const statements = rows.map((r) => env.REPORT_DB.prepare(`INSERT INTO adsense_metrics(date,page_url,earnings_krw,source,received_at) VALUES(?,?,?,'AdSense estimated earnings (KRW)',?) ON CONFLICT(date,page_url) DO UPDATE SET earnings_krw=excluded.earnings_krw,received_at=excluded.received_at`).bind(r.date, r.url, r.earnings, (/* @__PURE__ */ new Date()).toISOString()));
  for (let i = 0; i < statements.length; i += 60) await env.REPORT_DB.batch(statements.slice(i, i + 60));
  await env.REPORT_DB.prepare(`INSERT INTO report_sync(source,last_check_at,status,detail) VALUES('ADSENSE',?,?,?) ON CONFLICT(source) DO UPDATE SET last_check_at=excluded.last_check_at,status=excluded.status,detail=excluded.detail`).bind((/* @__PURE__ */ new Date()).toISOString(), "ok", `${rows.length} page/day reports; estimated earnings; original report in KRW`).run();
  return { status: "ok", imported: rows.length };
}
__name(syncAdsense, "syncAdsense");

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


// src/reporting-worker.mjs
var SAFE_DATE = /^\d{4}-\d{2}-\d{2}$/;
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } }), "json");
var base64Url = /* @__PURE__ */ __name((s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0)), "base64Url");
var decodeJson = /* @__PURE__ */ __name((s) => JSON.parse(new TextDecoder().decode(base64Url(s))), "decodeJson");
async function checkAccessJWT(request, env) {
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (!jwt || !env.CF_ACCESS_AUD || !env.CF_ACCESS_TEAM_DOMAIN) return false;
  const chunks = jwt.split(".");
  if (chunks.length !== 3) return false;
  let h, p;
  try {
    h = decodeJson(chunks[0]);
    p = decodeJson(chunks[1]);
  } catch {
    return false;
  }
  const issuer = "https://" + String(env.CF_ACCESS_TEAM_DOMAIN).replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/\.cloudflareaccess\.com$/, "") + ".cloudflareaccess.com";
  const audience = Array.isArray(p.aud) ? p.aud : [p.aud];
  if (h.alg !== "RS256" || !h.kid || p.iss !== issuer || !audience.includes(env.CF_ACCESS_AUD) || !Number.isFinite(p.exp) || p.exp <= Date.now() / 1e3 || p.nbf > Date.now() / 1e3) return false;
  const keysResponse = await fetch(issuer + "/cdn-cgi/access/certs");
  if (!keysResponse.ok) return false;
  const { keys = [] } = await keysResponse.json();
  const jwk = keys.find((k) => k.kid === h.kid);
  if (!jwk) return false;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64Url(chunks[2]), new TextEncoder().encode(chunks[0] + "." + chunks[1]));
}
__name(checkAccessJWT, "checkAccessJWT");
async function googleToken(env) {
  for (const k of ["GSC_CLIENT_ID", "GSC_CLIENT_SECRET", "GSC_REFRESH_TOKEN"]) if (!env[k]) throw new Error("GSC OAuth not connected: " + k);
  const payload = new URLSearchParams({ client_id: env.GSC_CLIENT_ID, client_secret: env.GSC_CLIENT_SECRET, refresh_token: env.GSC_REFRESH_TOKEN, grant_type: "refresh_token" });
  const response2 = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: payload });
  if (!response2.ok) throw new Error("Google OAuth refresh rejected (" + response2.status + ")");
  const data = await response2.json();
  if (!data.access_token) throw new Error("OAuth response has no token");
  return data.access_token;
}
__name(googleToken, "googleToken");
var dateIso = /* @__PURE__ */ __name((dt) => dt.toISOString().slice(0, 10), "dateIso");
var daysAgo = /* @__PURE__ */ __name((n) => {
  const d = /* @__PURE__ */ new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return dateIso(d);
}, "daysAgo");
async function queryGSC(env, token, dimensions) {
  const url = "https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(env.GSC_SITE_URL || "sc-domain:abreda.com") + "/searchAnalytics/query";
  const rows = [];
  let startRow = 0;
  for (let page = 0; page < 25; page++) {
    const body = { startDate: daysAgo(24), endDate: daysAgo(0), dimensions, aggregationType: dimensions.length === 1 ? "byProperty" : "byPage", rowLimit: 25e3, startRow, dataState: "final", type: "web" };
    const r = await fetch(url, { method: "POST", headers: { "Authorization": "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error("Search Console query rejected (" + r.status + ")");
    const result = await r.json();
    const batch = result.rows || [];
    rows.push(...batch);
    if (batch.length < 25e3) return rows;
    startRow += batch.length;
  }
  throw new Error("Search Console 25-page truncation: refusing partial import");
}
__name(queryGSC, "queryGSC");
async function updateGSC(env) {
  if (!env.REPORT_DB) throw new Error("D1 REPORT_DB binding absent");
  const token = await googleToken(env);
  const [totalRows, pageRows] = await Promise.all([queryGSC(env, token, ["date"]), queryGSC(env, token, ["date", "page"])]);
  const good = [];
  for (const r of totalRows) {
    const [d] = r.keys || [];
    if (!SAFE_DATE.test(d) || !Number.isSafeInteger(r.clicks) || !Number.isSafeInteger(r.impressions) || r.clicks < 0 || r.impressions < 0) continue;
    good.push([d, "__PROPERTY__", r.clicks, r.impressions]);
  }
  for (const r of pageRows) {
    const [d, url] = r.keys || [];
    if (!SAFE_DATE.test(d) || !url?.startsWith("https://") || !Number.isSafeInteger(r.clicks) || !Number.isSafeInteger(r.impressions) || r.clicks < 0 || r.impressions < 0) continue;
    good.push([d, url, r.clicks, r.impressions]);
  }
  if (good.length === 0) {
    await env.REPORT_DB.prepare("INSERT INTO report_sync (source,last_check_at,status,detail) VALUES ('GSC',datetime('now'),'no_rows','No final rows returned; no values were overwritten') ON CONFLICT(source) DO UPDATE SET last_check_at=excluded.last_check_at,status=excluded.status,detail=excluded.detail").run();
    return { imported: 0, note: "No final rows; earlier data preserved" };
  }
  const statements = good.map(([d, url, clicks, impressions]) => env.REPORT_DB.prepare("INSERT INTO gsc_metrics (date,page_url,clicks,impressions,source,received_at) VALUES (?,?,?,?,'Google Search Console final',datetime('now')) ON CONFLICT(date,page_url) DO UPDATE SET clicks=excluded.clicks,impressions=excluded.impressions,received_at=excluded.received_at").bind(d, url, clicks, impressions));
  for (let n = 0; n < statements.length; n += 80) await env.REPORT_DB.batch(statements.slice(n, n + 80));
  await env.REPORT_DB.prepare("INSERT INTO report_sync (source,last_check_at,status,detail) VALUES ('GSC',datetime('now'),'ok',?) ON CONFLICT(source) DO UPDATE SET last_check_at=excluded.last_check_at,status=excluded.status,detail=excluded.detail").bind(`${good.length} finalized date/page keys imported`).run();
  return { imported: good.length };
}
__name(updateGSC, "updateGSC");
var reporting_worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/reporting/")) return new Response("Not found", { status: 404 });
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    if (!await checkAccessJWT(request, env)) return json({ error: "Not authenticated in Cloudflare Access" }, 401);
    if (url.pathname === "/api/reporting/legacy") {
      const data=await readLegacy(request);
      return json(data,data.available?200:503);
    }
    if (url.pathname === "/api/reporting/services") return json(await readRegistry(env));
    if (url.pathname === "/api/reporting/performance") {
      const date = url.searchParams.get("date");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return json({ error: "date must be YYYY-MM-DD" }, 400);
      return json(await readPerformance(env, date, request));
    }
    if (url.pathname === "/api/reporting/status") {
      return json(await readSourceStatus(env,request));
    }
    if (url.pathname === "/api/reporting/search") {
      const start = url.searchParams.get("start"), end = url.searchParams.get("end");
      if (!SAFE_DATE.test(start || "") || !SAFE_DATE.test(end || "") || start > end) return json({ error: "start and end must be YYYY-MM-DD and ordered" }, 400);
      const rs = await env.REPORT_DB.prepare("SELECT date,page_url AS pageUrl,clicks,impressions,source,received_at AS fetchedAt FROM gsc_metrics WHERE date>=? AND date<=? ORDER BY date DESC,page_url LIMIT 3000").bind(start, end).all();
      return json({ source: "Google Search Console (final only)", rows: rs.results, missingRowMeaning: "no verified row; NOT zero", revenue: null, revenueState: "unconnected" });
    }
    return json({ error: "Not found" }, 404);
  },
  async scheduled(event, env, ctx) {
    if (event.cron === "* * * * *") ctx.waitUntil(syncRegistry(env));
    if (event.cron === "0 */6 * * *") {
      ctx.waitUntil(syncGoogleReporting(env));
    }
  }
};

// src/sns-worker.mjs
var API_PREFIX = "/api/sns/";
var json2 = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
}), "json");
var err = /* @__PURE__ */ __name((message, status = 400) => json2({ ok: false, error: message }, status), "err");
var now2 = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
var isUUID = /* @__PURE__ */ __name((id) => typeof id === "string" && /^[\da-f-]{36}$/i.test(id), "isUUID");
var isAccountId = /* @__PURE__ */ __name((id) => typeof id === "string" && /^(life|issue|ai)-(instagram|threads|bluesky)$/.test(id), "isAccountId");
var validURL = /* @__PURE__ */ __name((v) => !v || typeof v === "string" && v.length < 1e3 && /^https:\/\/[^\s/]+/i.test(v), "validURL");
var text = /* @__PURE__ */ __name((v) => typeof v === "string" ? v.trim() : "", "text");
function bytesToB64url(s) {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}
__name(bytesToB64url, "bytesToB64url");
function decodeJWT(s) {
  try {
    let [h, p, signature] = s.split(".");
    if (!signature) return null;
    return { header: JSON.parse(new TextDecoder().decode(bytesToB64url(h))), payload: JSON.parse(new TextDecoder().decode(bytesToB64url(p))), signature: bytesToB64url(signature), signed: h + "." + p };
  } catch {
    return null;
  }
}
__name(decodeJWT, "decodeJWT");
async function authorize(req, env, webhook = false) {
  if (!env.CF_ACCESS_AUD || !env.CF_ACCESS_TEAM_DOMAIN || !env.ADMIN_EMAILS) return false;
  const token = req.headers.get("cf-access-jwt-assertion");
  const jwt = token && decodeJWT(token);
  if (!jwt || jwt.header.alg !== "RS256" || !jwt.header.kid) return false;
  const iss = "https://" + env.CF_ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const p = jwt.payload;
  const time = Math.floor(Date.now() / 1e3);
  if (p.iss !== iss || p.exp <= time || p.nbf && p.nbf > time || !(Array.isArray(p.aud) ? p.aud.includes(env.CF_ACCESS_AUD) : p.aud === env.CF_ACCESS_AUD)) return false;
  const allow = String(env.ADMIN_EMAILS).split(",").map((x) => x.trim().toLowerCase());
  if (!webhook && (!p.email || !allow.includes(String(p.email).toLowerCase()))) return false;
  try {
    const certs = await fetch(iss + "/cdn-cgi/access/certs");
    if (!certs.ok) return false;
    const jwks = await certs.json();
    const key = jwks.keys?.find((k) => k.kid === jwt.header.kid);
    if (!key) return false;
    const cryptoKey = await crypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, jwt.signature, new TextEncoder().encode(jwt.signed));
  } catch {
    return false;
  }
}
__name(authorize, "authorize");
async function input(req) {
  if (Number(req.headers.get("content-length") || 0) > 32768) throw Error("\uC694\uCCAD \uD06C\uAE30 \uCD08\uACFC");
  const raw = await req.text();
  if (raw.length > 32768) throw Error("\uC694\uCCAD \uD06C\uAE30 \uCD08\uACFC");
  return JSON.parse(raw);
}
__name(input, "input");
async function dbAll(env, sql, ...bind) {
  return (await env.SNS_DB.prepare(sql).bind(...bind).all()).results || [];
}
__name(dbAll, "dbAll");
async function dbFirst(env, sql, ...bind) {
  return await env.SNS_DB.prepare(sql).bind(...bind).first();
}
__name(dbFirst, "dbFirst");
async function dbRun(env, sql, ...bind) {
  return env.SNS_DB.prepare(sql).bind(...bind).run();
}
__name(dbRun, "dbRun");
async function bufferGraphQL(env, query, variables = {}) {
  if (!env.BUFFER_API_KEY) throw Error("Buffer API \uD0A4 \uBBF8\uC124\uC815");
  const res = await fetch("https://api.buffer.com", { method: "POST", headers: { "authorization": "Bearer " + env.BUFFER_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(1e4) });
  if (!res.ok) throw Error("Buffer HTTP " + res.status);
  const obj = await res.json();
  if (obj.errors?.length) throw Error("Buffer: " + obj.errors.map((x) => x.message).join("; ").slice(0, 300));
  return obj.data;
}
__name(bufferGraphQL, "bufferGraphQL");
var ORGS = `query {account {organizations {id name}}}`;
function postsQuery(orgId, status, metrics = false) {
  const fields = metrics ? "id text channelId status dueAt metrics {type name value unit} metricsUpdatedAt" : "id text channelId status dueAt";
  return `query { posts(first:50,input:{organizationId:${JSON.stringify(orgId)},filter:{status:[${status}]}}){edges{node{${fields}}}pageInfo{hasNextPage endCursor}} }`;
}
__name(postsQuery, "postsQuery");
async function fetchBuffer(env) {
  const orgRes = await bufferGraphQL(env, ORGS);
  const orgs = orgRes?.account?.organizations || [];
  if (!orgs.length) return { organizations: [], channels: [], scheduled: [], sent: [], warnings: [], syncedAt: now2() };
  let allChannels = [], allScheduled = [], allSent = [], warn = [];
  for (const org of orgs) {
    const channels = (await bufferGraphQL(env, `query {channels(input:{organizationId:${JSON.stringify(org.id)}}){id name displayName service isQueuePaused}}`))?.channels || [];
    allChannels.push(...channels.map((x) => ({ ...x, organizationId: org.id })));
    const values = await Promise.allSettled([bufferGraphQL(env, postsQuery(org.id, "scheduled")), bufferGraphQL(env, postsQuery(org.id, "sent", true))]);
    const [scheduled, sent] = values;
    if (scheduled.status === "fulfilled") allScheduled.push(...(scheduled.value?.posts?.edges || []).map((x) => x.node));
    else warn.push("\uC608\uC57D \uAC8C\uC2DC \uC870\uD68C \uC2E4\uD328: " + String(scheduled.reason?.message || "\uC624\uB958"));
    if (sent.status === "fulfilled") allSent.push(...(sent.value?.posts?.edges || []).map((x) => x.node));
    else warn.push("\uBC1C\uD589\xB7\uC131\uACFC \uC870\uD68C \uC2E4\uD328: " + String(sent.reason?.message || "\uC624\uB958"));
    if (scheduled.status === "fulfilled" && scheduled.value.posts.pageInfo?.hasNextPage) warn.push("\uC608\uC57D \uAC8C\uC2DC\uBB3C\uC740 \uC870\uC9C1\uB2F9 \uCD5C\uADFC 50\uAC74\uB9CC \uD45C\uC2DC");
    if (sent.status === "fulfilled" && sent.value.posts.pageInfo?.hasNextPage) warn.push("\uBC1C\uD589 \uAC8C\uC2DC\uBB3C\uC740 \uC870\uC9C1\uB2F9 \uCD5C\uADFC 50\uAC74\uB9CC \uD45C\uC2DC");
  }
  return { organizations: orgs, channels: allChannels, scheduled: allScheduled, sent: allSent, warnings: warn, syncedAt: now2() };
}
__name(fetchBuffer, "fetchBuffer");
async function cacheBuffer(env, force) {
  if (!env.BUFFER_API_KEY) return { status: "unconfigured", data: null, message: "Buffer API \uD0A4 \uBBF8\uC124\uC815" };
  const cache = await dbFirst(env, "SELECT data_json,updated_at FROM api_cache WHERE key=?", "buffer");
  if (!force && cache && Date.now() - Date.parse(cache.updated_at) < 6e4) return { status: "connected", data: JSON.parse(cache.data_json), cached: true };
  try {
    const result = await fetchBuffer(env);
    await dbRun(env, `INSERT INTO api_cache(key,data_json,updated_at) VALUES('buffer',?,?) ON CONFLICT(key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`, JSON.stringify(result), result.syncedAt);
    return { status: "connected", data: result, cached: false };
  } catch (e) {
    return { status: "error", data: cache ? JSON.parse(cache.data_json) : null, message: String(e.message || e), stale: !!cache };
  }
}
__name(cacheBuffer, "cacheBuffer");
async function currentState(env, live = false) {
  const [accounts, drafts, events, expenses, settings] = await Promise.all([
    dbAll(env, "SELECT * FROM accounts ORDER BY id"),
    dbAll(env, "SELECT * FROM drafts ORDER BY updated_at DESC LIMIT 100"),
    dbAll(env, "SELECT * FROM events ORDER BY received_at DESC LIMIT 60"),
    dbAll(env, "SELECT * FROM expenses ORDER BY paid_on DESC LIMIT 100"),
    dbAll(env, "SELECT key,value FROM settings")
  ]);
  return { ok: true, serverTime: now2(), accounts, drafts, events, expenses, settings: Object.fromEntries(settings.map((v) => [v.key, v.value])), buffer: await cacheBuffer(env, live) };
}
__name(currentState, "currentState");
async function api(req, env) {
  if (!env.SNS_DB) return err("D1 \uBC14\uC778\uB529 SNS_DB \uBBF8\uC124\uC815", 503);
  const url = new URL(req.url);
  const path = url.pathname.slice(API_PREFIX.length);
  const method = req.method;
  if (!await authorize(req, env, path === "events" && method === "POST")) return err("Cloudflare Access \uC778\uC99D \uB610\uB294 \uAD00\uB9AC\uC790 \uAD8C\uD55C \uD655\uC778 \uC2E4\uD328", 401);
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    if (path !== "events" && req.headers.get("origin") !== url.origin) return err("\uB3D9\uC77C \uCD9C\uCC98\uC5D0\uC11C\uB9CC \uBCC0\uACBD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4", 403);
  }
  if (path === "state" && method === "GET") return json2(await currentState(env, url.searchParams.get("refresh") === "1"));
  if (path === "accounts" && method === "PUT") {
    const b = await input(req);
    if (!isAccountId(b.id) || !validURL(b.url) || text(b.handle).length > 90 || text(b.memo).length > 500 || text(b.buffer_channel_id).length > 140) return err("\uACC4\uC815 \uC785\uB825\uAC12 \uC624\uB958");
    const handle = text(b.handle).replace(/^@/, "").replace(/\.bsky\.social$/i, "");
    if (handle && !/^[a-zA-Z0-9._-]+$/.test(handle)) return err("\uC0AC\uC6A9\uC790 \uC544\uC774\uB514 \uD615\uC2DD \uC624\uB958");
    await dbRun(env, "UPDATE accounts SET handle=?,buffer_channel_id=?,memo=?,updated_at=? WHERE id=?", handle, text(b.buffer_channel_id), text(b.memo), now2(), b.id);
    return json2({ ok: true });
  }
  if (path === "drafts" && method === "POST") {
    const b = await input(req);
    if (!isAccountId(b.account_id) || !text(b.body) || text(b.body).length > 2200 || !validURL(b.source_url)) return err("\uCF58\uD150\uCE20 \uC785\uB825\uAC12 \uC624\uB958");
    const a = await dbFirst(env, "SELECT * FROM accounts WHERE id=?", b.account_id);
    if (!a) return err("\uACC4\uC815 \uC5C6\uC74C");
    const id = crypto.randomUUID(), timestamp = now2(), locale = a.platform === "bluesky" ? "en" : "ko";
    await dbRun(env, "INSERT INTO drafts(id,account_id,body,source_url,locale,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)", id, b.account_id, text(b.body), text(b.source_url), locale, "draft", timestamp, timestamp);
    return json2({ ok: true, id }, 201);
  }
  if (path === "approve" && method === "POST") {
    const b = await input(req);
    if (!isUUID(b.id)) return err("id \uC624\uB958");
    const d = await dbFirst(env, "SELECT * FROM drafts WHERE id=?", b.id);
    if (!d || d.status !== "draft") return err("\uC2B9\uC778\uD560 \uCD08\uC548\uC774 \uC5C6\uC74C", 409);
    await dbRun(env, "UPDATE drafts SET status=?,updated_at=? WHERE id=? AND status=?", "approved", now2(), b.id, "draft");
    return json2({ ok: true });
  }
  if (path === "queue" && method === "POST") {
    const b = await input(req);
    if (!isUUID(b.id)) return err("id \uC624\uB958");
    const paused = await dbFirst(env, "SELECT value FROM settings WHERE key=?", "automation_paused");
    if (paused?.value === "true") return err("\uC790\uB3D9\uBC1C\uD589 \uC548\uC804 \uC7A0\uAE08\uC774 \uCF1C\uC838 \uC788\uC2B5\uB2C8\uB2E4", 409);
    if (!env.BUFFER_API_KEY) return err("Buffer API \uD0A4 \uBBF8\uC124\uC815", 409);
    const d = await dbFirst(env, "SELECT d.*,a.platform,a.buffer_channel_id FROM drafts d JOIN accounts a ON a.id=d.account_id WHERE d.id=?", b.id);
    if (!d || d.status !== "approved") return err("\uC2B9\uC778\uB41C \uCF58\uD150\uCE20\uB9CC \uC608\uC57D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4", 409);
    if (d.platform === "instagram") return err("\uC778\uC2A4\uD0C0\uADF8\uB7A8\uC740 \uBBF8\uB514\uC5B4\uAC00 \uD544\uC694\uD574 \uD604\uC7AC \uD14D\uC2A4\uD2B8 \uC804\uC6A9 \uBC1C\uD589\uC744 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4", 409);
    if (!d.buffer_channel_id) return err("\uC774 \uACC4\uC815\uC758 Buffer \uCC44\uB110 ID\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4", 409);
    const lock = await dbRun(env, "UPDATE drafts SET status=?,updated_at=? WHERE id=? AND status=?", "sending", now2(), b.id, "approved");
    if (lock.meta?.changes !== 1) return err("\uB2E4\uB978 \uC694\uCCAD\uC774 \uBA3C\uC800 \uCC98\uB9AC\uD588\uC2B5\uB2C8\uB2E4", 409);
    try {
      const query = `mutation {createPost(input:{text:${JSON.stringify(d.body)},channelId:${JSON.stringify(d.buffer_channel_id)},schedulingType:automatic,mode:addToQueue}){... on PostActionSuccess{post{id text dueAt}} ... on MutationError{message}}}`;
      const response2 = await bufferGraphQL(env, query);
      const p = response2?.createPost?.post;
      if (!p?.id) throw Error(response2?.createPost?.message || "Buffer \uC751\uB2F5\uC5D0\uC11C \uAC8C\uC2DC\uBB3C ID \uD655\uC778 \uBD88\uAC00");
      await dbRun(env, "UPDATE drafts SET status=?,buffer_post_id=?,updated_at=? WHERE id=?", "queued", String(p.id), now2(), b.id);
      return json2({ ok: true, postId: p.id });
    } catch (e) {
      await dbRun(env, "UPDATE drafts SET status=?,note=?,updated_at=? WHERE id=?", "needs_reconcile", String(e.message || e).slice(0, 400), now2(), b.id);
      return err("Buffer \uC804\uC1A1 \uACB0\uACFC \uD655\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uC790\uB3D9 \uC7AC\uC804\uC1A1\uD558\uC9C0 \uB9C8\uC138\uC694: " + String(e.message || e), 502);
    }
  }
  if (path === "lock" && method === "POST") {
    const b = await input(req);
    if (typeof b.paused !== "boolean") return err("\uC7A0\uAE08 \uAC12 \uC624\uB958");
    await dbRun(env, `UPDATE settings SET value=? WHERE key='automation_paused'`, String(b.paused));
    return json2({ ok: true });
  }
  if (path === "expenses" && method === "POST") {
    const b = await input(req);
    if (!text(b.label) || text(b.label).length > 100 || !Number.isSafeInteger(b.amount_krw) || b.amount_krw < 1 || b.amount_krw > 1e7 || !/^\d{4}-\d{2}-\d{2}$/.test(b.paid_on)) return err("\uC9C0\uCD9C \uC785\uB825\uAC12 \uC624\uB958");
    await dbRun(env, "INSERT INTO expenses(id,label,amount_krw,paid_on,created_at) VALUES(?,?,?,?,?)", crypto.randomUUID(), text(b.label), b.amount_krw, b.paid_on, now2());
    return json2({ ok: true }, 201);
  }
  if (path === "events" && method === "POST") {
    if (!env.SNS_EVENT_SECRET || req.headers.get("authorization") !== "Bearer " + env.SNS_EVENT_SECRET) return err("\uC774\uBCA4\uD2B8 \uD1A0\uD070 \uC624\uB958", 403);
    const b = await input(req);
    if (!isUUID(b.id) || !["make", "buffer", "manual"].includes(b.provider) || !["run", "publish", "error", "cost", "info"].includes(b.type) || !["success", "failed", "pending", "info"].includes(b.status) || !validURL(b.reference)) return err("\uC774\uBCA4\uD2B8 \uC785\uB825\uAC12 \uC624\uB958");
    if (b.account_id && !isAccountId(b.account_id)) return err("\uACC4\uC815 ID \uC624\uB958");
    const occurred = text(b.occurred_at) || now2();
    if (Number.isNaN(Date.parse(occurred))) return err("\uBC1C\uC0DD \uC2DC\uAC01 \uD615\uC2DD \uC624\uB958");
    const details = text(b.details).slice(0, 1e3);
    const result = await dbRun(env, "INSERT OR IGNORE INTO events(id,provider,type,status,account_id,reference,details,occurred_at,received_at) VALUES(?,?,?,?,?,?,?,?,?)", b.id, b.provider, b.type, b.status, b.account_id || "", text(b.reference).slice(0, 300), details, occurred, now2());
    return json2({ ok: true, inserted: result.meta?.changes === 1 });
  }
  return err("API \uACBD\uB85C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4", 404);
}
__name(api, "api");
var sns_worker_default = { async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname.startsWith(API_PREFIX)) {
    try {
      return await api(request, env);
    } catch (e) {
      return err("\uC11C\uBC84 \uC624\uB958: " + String(e.message || e).slice(0, 200), 500);
    }
  }
  return env.ASSETS.fetch(request);
} };

// src/deploy-events.mjs
var enc = new TextEncoder();
var json3 = /* @__PURE__ */ __name((x, status = 200) => new Response(JSON.stringify(x), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }), "json");
var now3 = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
var projectName = /* @__PURE__ */ __name((s) => typeof s === "string" && /^tb-[a-z0-9-]{2,70}$/.test(s) && !["tb-toolbox-admin", "tb-toolbox-admin-rebuild", "tb-naver-keyword-api"].includes(s), "projectName");
var deploymentId = /* @__PURE__ */ __name((s) => typeof s === "string" && /^[a-zA-Z0-9_-]{8,128}$/.test(s), "deploymentId");
var eventId = /* @__PURE__ */ __name((s) => typeof s === "string" && /^[a-zA-Z0-9_.:-]{8,160}$/.test(s), "eventId");
var goodTitle = /* @__PURE__ */ __name((s) => typeof s === "string" && s.trim().length > 0 && s.trim().length <= 240, "goodTitle");
function parseDeploymentEvent(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid event object");
  const { eventId: event, project, deploymentId: dep, url, title } = data;
  const platform = data.platform || "pages";
  if (!["pages", "worker"].includes(platform)) throw new Error("Unsupported deployment platform");
  if (!eventId(event) || !projectName(project) || !deploymentId(dep) || !goodTitle(title)) throw new Error("Invalid event properties");
  const canonical = canonicalUrl(url);
  const u = new URL(canonical);
  if (u.hostname === "adminivo.com" || u.hostname === "tb-toolbox-admin.pages.dev" || u.hostname === "tb-toolbox-admin-rebuild.pages.dev") throw new Error("Admin cannot be a public tool");
  if (u.hostname === "abreda.com" && !u.pathname.startsWith("/tools/")) throw new Error("Internal tools require /tools/ route");
  if (platform === "worker" && !(u.hostname === "abreda.com" || u.hostname.endsWith(".abreda.com"))) throw new Error("Worker publication requires an authorized abreda.com route or custom domain");
  return { eventId: event, project, deploymentId: dep, url: canonical, title: title.trim(), kind: u.hostname === "abreda.com" ? "tool_page" : "independent_site", platform };
}
__name(parseDeploymentEvent, "parseDeploymentEvent");
async function verifyHmac(secret, raw, signature) {
  if (typeof secret !== "string" || secret.length < 32 || typeof signature !== "string" || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from(signature.slice(7).match(/../g), (x) => parseInt(x, 16));
  return crypto.subtle.verify("HMAC", key, bytes, enc.encode(raw));
}
__name(verifyHmac, "verifyHmac");
function confirmedProductionDeployment(response2, project, deploymentId2) {
  if (!response2 || response2.id !== deploymentId2 || response2.project_name && response2.project_name !== project) return false;
  return response2.environment === "production" && response2.latest_stage?.status === "success" && !response2.is_skipped;
}
__name(confirmedProductionDeployment, "confirmedProductionDeployment");
async function confirmWorkerProduction(env, event, fetcher = fetch) {
  const token = env.CF_WORKERS_READ_TOKEN;
  if (!token || !env.CF_ACCOUNT_ID) throw new Error("Worker read API credentials missing");
  const origin = `https://api.cloudflare.com/client/v4`;
  const head = { Authorization: `Bearer ${token}` };
  const endpoint = `${origin}/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/workers/scripts/${encodeURIComponent(event.project)}/deployments?per_page=1`;
  const r = await fetcher(endpoint, { headers: head, signal: AbortSignal.timeout(12e3) });
  if (!r.ok) throw new Error("Worker deployment inspection failed");
  const data = await r.json(), latest = data.result?.deployments?.[0];
  if (!data.success || latest?.id !== event.deploymentId) throw new Error("Not the current Worker deployment");
  const url = new URL(event.url);
  const domainsResponse = await fetcher(`${origin}/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/workers/domains`, { headers: head, signal: AbortSignal.timeout(12e3) });
  if (!domainsResponse.ok) throw new Error("Worker custom domains unavailable");
  const domains = await domainsResponse.json();
  if (!domains.success || !Array.isArray(domains.result)) throw new Error("Worker domain API failed");
  if (domains.result.some((d) => d.hostname === url.hostname && d.service === event.project && d.enabled === true)) return true;
  if (!env.CF_ZONE_ID) throw new Error("Zone id required to verify Worker route");
  const rr = await fetcher(`${origin}/zones/${encodeURIComponent(env.CF_ZONE_ID)}/workers/routes`, { headers: head, signal: AbortSignal.timeout(12e3) });
  if (!rr.ok) throw new Error("Worker routes unavailable");
  const routes = await rr.json();
  if (!routes.success || !Array.isArray(routes.result)) throw new Error("Route API failed");
  const target = url.hostname + url.pathname;
  const matches = /* @__PURE__ */ __name((pattern) => {
    const escaped = String(pattern).replace(/([.+?^${}()|[\]\\])/g, "\\$1").replace(/\*/g, ".*");
    return new RegExp("^" + escaped + "$", "i").test(target);
  }, "matches");
  if (!routes.result.some((route) => route.script === event.project && matches(route.pattern))) throw new Error("Worker route does not serve target URL");
  return true;
}
__name(confirmWorkerProduction, "confirmWorkerProduction");
async function confirmCloudflareProduction(env, event, fetcher = fetch) {
  if (!env.CF_PAGES_READ_TOKEN || !env.CF_ACCOUNT_ID) throw new Error("Cloudflare Pages read-only API credentials not configured");
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/pages/projects/${encodeURIComponent(event.project)}/deployments/${encodeURIComponent(event.deploymentId)}`;
  const res = await fetcher(endpoint, { headers: { Authorization: `Bearer ${env.CF_PAGES_READ_TOKEN}` }, signal: AbortSignal.timeout(12e3) });
  if (!res.ok) throw new Error(`Cloudflare deployment verification HTTP ${res.status}`);
  const json5 = await res.json();
  if (!json5.success || !confirmedProductionDeployment(json5.result, event.project, event.deploymentId)) throw new Error("Deployment is not a verified successful production release");
  const u = new URL(event.url);
  const expectedHost = event.project + ".pages.dev";
  const projectEndpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/pages/projects/${encodeURIComponent(event.project)}`;
  const projectRes = await fetcher(projectEndpoint, { headers: { Authorization: `Bearer ${env.CF_PAGES_READ_TOKEN}` }, signal: AbortSignal.timeout(12e3) });
  if (!projectRes.ok) throw new Error("Unable to validate latest production deployment");
  const projectBody = await projectRes.json();
  if (!projectBody.success || projectBody.result?.canonical_deployment?.id !== event.deploymentId)
    throw new Error("Deployment is not the active production release");
  if (u.hostname !== expectedHost) {
    const domains = (projectBody.result?.domains || []).map((x) => String(x).toLowerCase());
    if (!domains.includes(u.hostname)) throw new Error("URL host not assigned to this Cloudflare Pages project");
  }
  return true;
}
__name(confirmCloudflareProduction, "confirmCloudflareProduction");
async function processDeploymentEvent(env, event) {
  const db = env.REPORT_DB;
  if (!db) throw new Error("REPORT_DB not configured");
  const stamp = now3();
  const first = db.prepare(`INSERT OR IGNORE INTO deployment_events(event_id,deployment_id,project,canonical_url,received_at,verified_at,verification_source) VALUES(?,?,?,?,?,?,?)`).bind(event.eventId, event.deploymentId, event.project, event.url, stamp, stamp, event.platform === "worker" ? "Cloudflare Workers API" : "Cloudflare Pages API");
  const save = db.prepare(`INSERT INTO services(service_id,canonical_url,title,kind,origin,status,cf_project,cf_deployment_id,first_seen_at,last_seen_at)
 SELECT canonical_url,canonical_url,?,?,?,?,?,?,?,? FROM deployment_events
 WHERE event_id=? AND deployment_id=? AND canonical_url=? AND project=?
 ON CONFLICT(service_id) DO UPDATE SET title=excluded.title, status='deployed_success',cf_project=excluded.cf_project,cf_deployment_id=excluded.cf_deployment_id,last_seen_at=excluded.last_seen_at`).bind(
    event.title,
    event.kind,
    "verified_deployment",
    "deployed_success",
    event.project,
    event.deploymentId,
    stamp,
    stamp,
    event.eventId,
    event.deploymentId,
    event.url,
    event.project
  );
  const [inserted] = await db.batch([first, save]);
  const rev = await db.prepare("SELECT revision,changed_at FROM registry_revision WHERE id=1").first();
  return { accepted: true, duplicate: inserted.meta?.changes === 0, revision: rev?.revision ?? null, serviceId: event.url };
}
__name(processDeploymentEvent, "processDeploymentEvent");
async function handleDeploymentRequest(req, env, { fetcher = fetch } = {}) {
  if (req.method !== "POST") return json3({ error: "POST only" }, 405);
  if (!env.DEPLOY_HOOK_SECRET || !env.CF_ACCOUNT_ID) return json3({ error: "Deployment API not configured" }, 503);
  if (Number(req.headers.get("content-length") || 0) > 8192) return json3({ error: "Payload too large" }, 413);
  const raw = await req.text();
  if (raw.length > 8192) return json3({ error: "Payload too large" }, 413);
  if (!await verifyHmac(env.DEPLOY_HOOK_SECRET, raw, req.headers.get("x-toolbox-signature"))) return json3({ error: "Invalid deployment signature" }, 401);
  let event;
  try {
    event = parseDeploymentEvent(JSON.parse(raw));
  } catch (e) {
    return json3({ error: String(e.message) }, 400);
  }
  try {
    if (event.platform === "worker") await confirmWorkerProduction(env, event, fetcher);
    else await confirmCloudflareProduction(env, event, fetcher);
    const result = await processDeploymentEvent(env, event);
    return json3({ ...result, source: event.platform === "worker" ? "verified Cloudflare Worker deployment" : "verified Cloudflare Pages production deployment" }, 200);
  } catch (e) {
    return json3({ error: String(e.message || e) }, 409);
  }
}
__name(handleDeploymentRequest, "handleDeploymentRequest");

// src/assets.generated.mjs
var STATIC_HTML = "<!doctype html>\n<html lang=\"ko\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow,noarchive\"><meta name=\"color-scheme\" content=\"light\"><title>작은도구함 — 운영 관제센터 v2</title><link rel=\"stylesheet\" href=\"./styles.css\"></head>\n<body>\n<div class=\"mobile-head\"><span class=\"logo-mark\">✦</span><strong>작은도구함 관리센터</strong><button id=\"mobile-menu\" aria-label=\"메뉴 열기\">☰</button></div>\n<div class=\"app-shell\"><aside class=\"sidebar\" id=\"sidebar\">\n  <div class=\"brand\"><span class=\"logo-mark\">✦</span><div><strong>작은도구함</strong><small>OPERATIONS CONTROL</small></div></div>\n  <div class=\"sidebar-label\">워크스페이스</div>\n  <nav id=\"nav\" aria-label=\"관리 메뉴\">\n    <button class=\"nav-link selected\" data-page=\"overview\"><span>▦</span> 전체 현황</button>\n    <button class=\"nav-link\" data-page=\"services\"><span>◈</span> 서비스 관리</button>\n    <button class=\"nav-link\" data-page=\"performance\"><span>▥</span> 성과 기록</button>\n    <button class=\"nav-link\" data-page=\"sources\"><span>◉</span> 데이터 연결 상태</button>\n    <a class=\"nav-link\" href=\"./sns/\"><span>◎</span> SNS 통합 관제센터 <span class=\"nav-arrow\">↗</span></a>\n  </nav>\n  <div class=\"sidebar-sep\"></div>\n  <div class=\"sidebar-label\">바로가기</div>\n  <a class=\"nav-link secondary\" href=\"https://abreda.com/\" target=\"_blank\" rel=\"noopener noreferrer\"><span>↗</span> 공개 서비스</a>\n  <a class=\"nav-link secondary\" href=\"https://adminivo.com/\" target=\"_blank\" rel=\"noopener noreferrer\"><span>↗</span> 기존 관리자</a>\n  <div class=\"sidebar-foot\"><span class=\"pulse\"></span><span>실제 데이터만 표시</span><small>미연결 ≠ 0 · 스냅샷 ≠ 실시간</small></div>\n</aside>\n<main class=\"content\"><header class=\"topbar\"><div><div class=\"eyebrow\">SMALL TOOLBOX / MANAGEMENT</div><h1 id=\"page-title\">운영 현황</h1><p id=\"page-subtitle\">배포, 방문, 검색 성과를 한곳에서 확인하세요.</p></div><div class=\"top-actions\"><span class=\"state-tag\" id=\"source-tag\">연결 확인 중</span><button type=\"button\" class=\"btn\" id=\"refresh\">↻ 새로고침</button></div></header>\n<div id=\"alert\" class=\"alert\" role=\"status\" hidden></div>\n<section class=\"page\" id=\"page-overview\"><div class=\"kpis\">\n <article class=\"kpi\"><div class=\"kpi-label\">등록된 서비스 <span>↗</span></div><div class=\"kpi-value\" id=\"kpi-services\">—</div><div class=\"kpi-hint\" id=\"kpi-services-hint\">공식 목록 확인 중</div></article>\n <article class=\"kpi\"><div class=\"kpi-label\">별도 주소 기반 서비스 <span>◈</span></div><div class=\"kpi-value\" id=\"kpi-sites\">—</div><div class=\"kpi-hint\">홈페이지 하위 도구와 구분</div></article>\n <article class=\"kpi\"><div class=\"kpi-label\">선택일 방문 세션 <span>◉</span></div><div class=\"kpi-value muted\" id=\"kpi-visitors\">—</div><div class=\"kpi-hint\" id=\"kpi-visitors-hint\">연동된 원천 데이터 없음</div></article>\n <article class=\"kpi\"><div class=\"kpi-label\">선택일 예상 수익 <span>₩</span></div><div class=\"kpi-value muted\" id=\"kpi-revenue\">—</div><div class=\"kpi-hint\" id=\"kpi-revenue-hint\">AdSense 원천 미연결</div></article>\n</div>\n<div class=\"split\"><section class=\"panel\"><div class=\"panel-head\"><div><span class=\"eyebrow\">SERVICE COVERAGE</span><h2>서비스 등록 현황</h2></div><button type=\"button\" class=\"text-btn\" data-page=\"services\">전체 보기 ↗</button></div><p class=\"panel-desc\">서비스 목록은 사이트의 공식 디렉터리와 성공한 Cloudflare Pages 배포를 대조합니다.</p><div class=\"coverage\"><div class=\"ring\" id=\"cover-ring\"><div><b id=\"ring-total\">—</b><small>목록</small></div></div><div class=\"coverage-legend\" id=\"cover-legend\"></div></div><div class=\"detail-note\">동일 서비스의 중복 호스트는 별도로 분류하며, 도구 개수와 고유 호스트 개수를 혼동하지 않습니다.</div></section>\n<section class=\"panel\"><div class=\"panel-head\"><div><span class=\"eyebrow\">DATA INTEGRITY</span><h2>데이터 수집 상태</h2></div><button type=\"button\" class=\"text-btn\" data-page=\"sources\">연결 관리 ↗</button></div><div class=\"source-list\" id=\"source-summary\"></div><div class=\"detail-note\">검색 실적은 Google의 확정 데이터만 집계하며, 자료가 없으면 0으로 대신 채우지 않습니다.</div></section></div>\n<section class=\"panel\"><div class=\"panel-head\"><div><span class=\"eyebrow\">LATEST SERVICES</span><h2>서비스 목록 미리보기</h2></div><button type=\"button\" class=\"text-btn\" data-page=\"services\">모두 보기 ↗</button></div><div class=\"mini-services\" id=\"recent-services\"></div></section>\n</section>\n<section class=\"page\" id=\"page-services\" hidden><div class=\"panel\"><div class=\"panel-head\"><div><span class=\"eyebrow\">DEPLOYMENT REGISTRY</span><h2>자동 등록 서비스 목록</h2></div><button class=\"btn primary\" id=\"sync\">↻ 서비스 동기화</button></div><p class=\"panel-desc\">도구 등록은 공식 디렉터리와 성공한 프로덕션 배포만 반영해요. 공개 목록에만 존재하는 항목은 ‘공식 목록’으로 표시돼요.</p>\n<div class=\"filters\"><input id=\"filter-input\" type=\"search\" placeholder=\"이름 또는 주소 검색\" aria-label=\"서비스 검색\"><select id=\"filter-kind\" aria-label=\"서비스 종류\"><option value=\"all\">전체 서비스</option><option value=\"independent_site\">별도 주소 기반</option><option value=\"tool_page\">홈페이지 내부 도구</option></select></div><div class=\"table-scroller\"><table><thead><tr><th>서비스</th><th>종류</th><th>확인 단계</th><th>출처</th><th>마지막 발견</th><th>접속</th></tr></thead><tbody id=\"services-tbody\"></tbody></table></div><div class=\"table-foot\" id=\"services-footer\"></div></div></section>\n<section class=\"page\" id=\"page-performance\" hidden><div class=\"panel\"><div class=\"panel-head\"><div><span class=\"eyebrow\">VERIFIED PERFORMANCE</span><h2>날짜별 성과기록</h2></div><div class=\"date-actions\"><label for=\"report-date\">기록 날짜</label><input id=\"report-date\" type=\"date\"><button class=\"btn\" id=\"load-performance\">조회</button></div></div>\n<div class=\"metric-note\">방문 세션 = 브라우저 비콘의 추정 세션 (봇 포함 가능) · 검색 노출/클릭 = Search Console 확정치 · 수익 = 승인된 AdSense 보고값. <strong>미연결/미확정은 0이 아니야.</strong></div>\n<div class=\"table-scroller\"><table><thead><tr><th>서비스</th><th>방문 세션</th><th>검색 노출</th><th>검색 클릭</th><th>광고 수익</th><th>원천 / 갱신</th></tr></thead><tbody id=\"performance-tbody\"></tbody></table></div><div class=\"table-foot\" id=\"performance-footer\"></div><div id=\"legacy-history\" class=\"panel-desc\"></div></div></section>\n<section class=\"page\" id=\"page-sources\" hidden><div class=\"panel\"><div class=\"panel-head\"><div><span class=\"eyebrow\">CONNECTED SOURCES</span><h2>원천 데이터 · 자동 갱신</h2></div><button class=\"btn\" id=\"sources-refresh\">↻ 연결 검사</button></div><p class=\"panel-desc\">연결된 공급자의 응답과 마지막 정상 수집 시각을 보여줘요. 연결이 없거나 오류가 나면 이전 수치를 최신값으로 속이지 않아요.</p><div class=\"top-actions\"><a class=\"btn\" id=\"google-connect\" href=\"/api/v2/google/connect\">Google 검색·광고 수익 연결</a><button class=\"btn\" id=\"google-sync\">Google 자료 수집</button></div><div id=\"source-rows\" class=\"sources-grid\"></div><h3 class=\"subhead\">자동 갱신 원칙</h3><div class=\"policy-grid\"><article><strong>신규 배포</strong><p>Cloudflare Pages 성공한 운영 배포만 등록. 공식 서비스 목록은 별도 동기화.</p></article><article><strong>검색 지표</strong><p>Search Console의 확정 자료를 정기 수집. 통계 반영에 지연이 있어요.</p></article><article><strong>방문자·매출</strong><p>검증된 수집원·권한이 없으면 <em>미연결</em>로 표시해요.</p></article></div></div></section>\n<footer>작은도구함 · 운영 관제센터 v2 <span>—</span> 수치의 출처를 확인하세요. 공개 여부와 도구 정확성은 별도 품질 점검 대상이에요.</footer>\n</main></div>\n<script src=\"./seed.js\"></script><script src=\"./app.js\" defer></script></body></html>\n";
var STATIC_CSS = ":root{color-scheme:light;--ink:#172d42;--muted:#6b8095;--blue:#3b66d6;--bg:#f6f8fc;--panel:#fff;--line:#e6ebf3;--soft:#f0f4fa;--success:#279b78;--warning:#c17e2c;--bad:#b75459}\n*{box-sizing:border-box}body{margin:0;background:var(--bg);font:14px/1.55 system-ui,-apple-system,'Malgun Gothic',sans-serif;color:var(--ink)}button,input,select{font:inherit}button{cursor:pointer}a{color:inherit;text-decoration:none}button:focus-visible,input:focus-visible,a:focus-visible,select:focus-visible{outline:3px solid #8eb0ff;outline-offset:3px}.app-shell{display:grid;grid-template-columns:254px minmax(0,1fr);min-height:100vh}.sidebar{background:#fff;border-right:1px solid var(--line);padding:31px 17px;position:sticky;height:100vh;top:0;display:flex;flex-direction:column}.brand{display:flex;align-items:center;gap:11px;padding:4px 10px 35px}.logo-mark{background:#345ed1;color:#fff;font-size:22px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;box-shadow:0 5px 16px #345ed12b}.brand strong{font-size:17px;letter-spacing:-.03em}.brand small{display:block;color:#94a3b5;font-size:10px;font-weight:780;letter-spacing:.13em}.sidebar-label{padding:3px 13px 7px;color:#93a1b2;font-size:10px;letter-spacing:.13em;font-weight:800}.nav-link{width:100%;border:0;display:flex;gap:13px;align-items:center;background:transparent;padding:13px 13px;margin:2px 0;text-align:left;color:#5c708a;font-weight:650;border-radius:11px;font-size:13px}.nav-link>span:first-child{font-size:20px;line-height:1;width:23px;text-align:center;font-weight:650}.nav-link.selected,.nav-link:hover{background:#ecf2ff;color:#2e5dcf}.nav-link.secondary{font-weight:560}.nav-arrow{margin-left:auto;font-size:12px}.sidebar-sep{height:1px;background:#edf0f5;margin:23px 12px 17px}.sidebar-foot{margin-top:auto;background:#f6f8fc;border:1px solid var(--line);padding:15px 14px;border-radius:13px;font-size:12px;font-weight:700}.sidebar-foot small{display:block;color:#8c9aad;font-size:11px;font-weight:500;margin-top:6px}.pulse{display:inline-block;border-radius:50%;height:8px;width:8px;background:#43a887;margin-right:6px}.content{width:100%;max-width:1650px;margin:0 auto;padding:36px 43px 34px;min-width:0}.topbar{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:26px}.eyebrow{font-size:10px;font-weight:850;letter-spacing:.17em;color:#6d8dc9}.topbar h1{margin:6px 0 2px;letter-spacing:-.055em;font-size:31px}.topbar p{margin:0;color:var(--muted)}.top-actions{display:flex;gap:10px;align-items:center}.state-tag{font-size:11px;padding:8px 11px;border-radius:10px;background:#fff;border:1px solid var(--line);color:#73869c;white-space:nowrap;font-weight:660}.state-tag.ok{background:#eaf8f2;color:#198064;border-color:#bfe7d7}.state-tag.warn{background:#fff6e8;color:#98661b;border-color:#f4e2bd}.btn{border:1px solid #dce4f1;background:#fff;color:#436085;padding:10px 14px;border-radius:10px;font-weight:750;font-size:12px;white-space:nowrap}.btn:hover{background:#f5f8fd}.btn.primary{background:#3b66d6;border-color:#3b66d6;color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}.alert{padding:14px 18px;border:1px solid #ead7b8;background:#fff8ef;color:#815a2c;border-radius:12px;margin-bottom:20px}.alert[hidden],.page[hidden]{display:none!important}.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin-bottom:18px}.kpi,.panel{background:var(--panel);border:1px solid var(--line);box-shadow:0 10px 30px #21385106;border-radius:17px}.kpi{padding:21px}.kpi-label{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#74869a;font-weight:720}.kpi-label span{font-size:19px;color:#a8b6cb}.kpi-value{font-size:32px;font-weight:850;letter-spacing:-.06em;margin:8px 0 3px}.kpi-value.muted{color:#8a9aaa}.kpi-hint{font-size:11px;color:#8a9aaa}.split{display:grid;grid-template-columns:1.13fr .87fr;gap:17px;margin-bottom:17px}.panel{padding:24px;margin-bottom:17px}.panel-head{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:10px}.panel-head h2{font-size:18px;margin:3px 0 0;letter-spacing:-.035em}.text-btn{color:#416cce;background:none;border:0;font-weight:750;font-size:12px;white-space:nowrap}.panel-desc{color:var(--muted);margin:0 0 17px;font-size:12px}.coverage{display:flex;align-items:center;justify-content:space-evenly;gap:22px;padding:14px 0}.ring{width:160px;height:160px;border-radius:50%;background:conic-gradient(#496fd7 0 75%,#87afec 75% 100%);display:grid;place-items:center;flex-shrink:0}.ring>div{border-radius:50%;background:white;width:120px;height:120px;display:flex;flex-direction:column;justify-content:center;align-items:center}.ring b{font-size:31px;letter-spacing:-.07em}.ring small{color:#8295a8}.coverage-legend{font-size:13px;display:grid;gap:13px;width:48%}.legend-line{display:flex;align-items:center;justify-content:space-between;gap:12px}.swatch{display:inline-block;width:9px;height:9px;background:#496fd7;border-radius:3px;margin-right:8px}.swatch.alt{background:#87afec}.detail-note{margin-top:15px;padding:12px 14px;border-radius:9px;background:#f7f9fd;color:#8798ab;font-size:11px}.source-list{display:grid;gap:13px;margin:22px 0}.source-item{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f0f2f5;padding-bottom:12px;gap:14px}.source-name{font-weight:750}.source-name small{display:block;font-weight:500;color:#91a1b3;font-size:11px}.chip{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;font-size:11px;white-space:nowrap;border-radius:8px;background:#eef1f5;color:#778a9d;font-weight:750}.chip.ok{color:#21815e;background:#e6f6ee}.chip.warn{color:#a67828;background:#fff1d9}.chip.error{color:#a95057;background:#ffedef}.mini-services{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}.service-small{display:flex;gap:12px;align-items:center;padding:13px;background:#f8fafe;border:1px solid #edf1f7;border-radius:11px;min-width:0}.service-icon{display:grid;place-items:center;width:37px;height:37px;flex-shrink:0;border-radius:10px;background:#e8efff;color:#4d72cb;font-size:17px}.service-title{font-weight:740;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.service-url{font-size:11px;color:#8899ab;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.filters,.date-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.filters{margin:20px 0}.filters input{flex:1;min-width:160px}.filters select{min-width:175px}.filters input,.filters select,.date-actions input{border:1px solid #dae2ee;background:#fafdff;padding:11px 13px;border-radius:9px;color:#53667d;max-width:100%}.date-actions label{font-size:12px;color:#6b7e93}.table-scroller{width:100%;overflow:auto}table{border-collapse:collapse;min-width:760px;width:100%;text-align:left}th,td{border-bottom:1px solid #eaf0f5;padding:13px 10px;text-align:left;font-size:12px;vertical-align:middle}th{font-size:11px;color:#8293a7;background:#f7f9fd;font-weight:790}tbody tr:hover{background:#f9fbff}.table-name{font-weight:700;font-size:12px;max-width:350px}.table-url{color:#91a1b2;font-size:11px;max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.type{font-size:11px;font-weight:700;color:#5274a8}.mono{font-variant-numeric:tabular-nums}.muted{color:#98a6b8}.linkout{color:#476ac0;font-weight:750}.table-foot{padding:15px 0 0;color:#8a9caf;font-size:11px}.metric-note{border-radius:11px;background:#f5f8ff;border:1px solid #e6ecfb;padding:14px 17px;margin:22px 0 15px;color:#74849e;font-size:12px}.metric-note strong{color:#3f679e}.sources-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.source-card{border:1px solid #e6ebf3;border-radius:13px;padding:20px;background:#fbfcff}.source-card h3{font-size:14px;margin:0 0 10px}.source-card p{font-size:12px;color:#71869a;margin:10px 0 0;line-height:1.6}.source-card .time{margin-top:12px;color:#9aabba;font-size:11px}.subhead{margin-top:30px}.policy-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.policy-grid article{padding:16px;border-radius:12px;background:#f7f9fd}.policy-grid p{font-size:12px;color:#7f90a5}footer{font-size:11px;color:#97a5b5;padding:17px 0}footer span{padding:0 8px}.mobile-head{display:none}\n@media(max-width:1100px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.split{grid-template-columns:1fr}.content{padding:27px}.sources-grid{grid-template-columns:1fr}}\n@media(max-width:720px){.app-shell{display:block}.sidebar{display:none;position:fixed;top:55px;left:0;z-index:20;height:calc(100vh - 55px);box-shadow:7px 12px 30px #172d4220}.sidebar.open{display:flex}.mobile-head{height:55px;display:flex;align-items:center;gap:10px;background:white;border-bottom:1px solid var(--line);padding:8px 15px;position:sticky;top:0;z-index:21}.mobile-head .logo-mark{width:29px;height:29px;font-size:17px;border-radius:8px}.mobile-head strong{font-size:14px;flex:1}.mobile-head button{background:#f3f6fc;border:none;border-radius:7px;padding:6px 10px}.content{padding:21px 14px}.topbar{align-items:flex-start;flex-direction:column}.topbar h1{font-size:26px}.top-actions{width:100%;justify-content:space-between}.kpis{gap:9px}.kpi{padding:14px}.kpi-value{font-size:26px}.kpi-label{font-size:11px}.panel{padding:17px}.mini-services,.policy-grid{grid-template-columns:1fr}.coverage{flex-direction:column}.coverage-legend{width:100%}.sources-grid{grid-template-columns:1fr}.panel-head{flex-wrap:wrap}}\n";
var STATIC_JS = "(()=>{'use strict';\nconst $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\nconst seed=(window.TOOLBOX_SNAPSHOT||[]).map((x,i)=>({serviceId:x.url,url:x.url,title:x.title,kind:new URL(x.url).hostname==='abreda.com'&&new URL(x.url).pathname.startsWith('/tools/')?'tool_page':'independent_site',origin:'first_party_directory',status:'catalog_snapshot',lastSeenAt:'2026-10-21',cfProject:null,cfDeploymentId:null}));\nlet services=seed,report=null,source='snapshot',statusRows=[],sources={},view='overview',registryRevision=null,statusFailed=false,reportFailed=false;\nconst pageTitles={overview:['운영 현황','배포, 방문, 검색 성과를 한곳에서 확인하세요.'],services:['서비스 관리','공식 목록과 성공한 배포가 자동으로 반영되는 원장'],performance:['성과 기록','확인된 원천 데이터와 집계 지연을 구분해 표시'],sources:['데이터 연결 상태','각 데이터 출처와 마지막 갱신 상태']};\nconst defined=(v)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));\nconst number=v=>defined(v)?Number(v).toLocaleString('ko-KR'):'—';\nconst won=v=>defined(v)?'₩'+Number(v).toLocaleString('ko-KR'):'—';\nconst meta=s=>{if(!s)return '—';try{return new URL(s).hostname}catch{return '—'}};\nfunction showMessage(text,type='warn'){$('alert').hidden=!text;$('alert').textContent=text||'';$('alert').style.borderColor=type==='error'?'#f1bfc2':'#ead7b8'}\nfunction navigate(name){view=name;for(const el of document.querySelectorAll('.page'))el.hidden=el.id!=='page-'+name;for(const el of document.querySelectorAll('[data-page]'))el.classList.toggle('selected',el.dataset.page===name);$('page-title').textContent=pageTitles[name][0];$('page-subtitle').textContent=pageTitles[name][1];$('sidebar').classList.remove('open');window.location.hash=name; if(name==='performance'&&!report)loadReport();}\nfunction sourceChip(state){const s=String(state||'').toLowerCase().trim();if(['ok','connected','success'].includes(s))return{label:'정상',css:'ok'};if(['error','failed'].includes(s))return{label:'오류',css:'error'};if(['partial','no_rows'].includes(s))return{label:s==='no_rows'?'확정 자료 없음':'부분 연결',css:'warn'};if(s==='pending')return{label:'집계 대기',css:'warn'};if(['unconnected','source_unconnected','disconnected','unconfigured'].includes(s))return{label:'미연결',css:''};return{label:'확인 필요',css:'warn'}}\nfunction sourceInfo(){const map=new Map(statusRows.map(r=>[r.source,String(r.status||'')]));if(statusFailed)return ['CATALOG','GSC','VISIT','ADSENSE','BUFFER'].map((key,i)=>({key,title:['도구 목록','Google 검색 실적','방문 세션','광고 수익','SNS 관제센터'][i],description:'연결 상태 API 조회 실패',status:'error',detail:'새로고침 후 확인하세요. 연결 없음으로 단정하지 않습니다.',time:null}));return [\n {key:'CATALOG',title:'도구 목록',description:source==='live'?'공식 사이트 목록 / Cloudflare 배포':'공식 사이트 목록 · 2026-10-21 스냅샷',status:source==='live'?(map.get('CATALOG')||'partial'):'unconnected',detail:statusRows.find(r=>r.source==='CATALOG')?.detail||'동기화 서버 연결 전',time:statusRows.find(r=>r.source==='CATALOG')?.last_check_at},\n {key:'GSC',title:'Google 검색 실적',description:'Google Search Console · 최종 확정된 날짜/페이지별 실적',status:map.get('GSC')||'unconnected',detail:statusRows.find(r=>r.source==='GSC')?.detail||'OAuth 조회 권한 또는 확정 자료 연결 필요',time:statusRows.find(r=>r.source==='GSC')?.last_check_at},\n {key:'VISIT',title:'방문 세션',description:'Supabase 브라우저 비콘 · 고유 방문자와 구분',status:map.get('VISIT')||'pending',detail:statusRows.find(r=>r.source==='VISIT')?.detail||'연결 확인 중',time:statusRows.find(r=>r.source==='VISIT')?.last_check_at},\n {key:'ADSENSE',title:'광고 수익',description:'Google AdSense 실제 승인 계정의 보고값',status:map.get('ADSENSE')||'unconnected',detail:statusRows.find(r=>r.source==='ADSENSE')?.detail||'AdSense 연결 및 승인 상태 미확인',time:statusRows.find(r=>r.source==='ADSENSE')?.last_check_at},\n {key:'BUFFER',title:'SNS 관제센터',description:'Buffer / Make · SNS 연결 상태',status:map.get('BUFFER')||'pending',detail:statusRows.find(r=>r.source==='BUFFER')?.detail||'연결 확인 중',time:statusRows.find(r=>r.source==='BUFFER')?.last_check_at}];}\nfunction sourceRows(){const list=sourceInfo();$('source-summary').innerHTML=list.slice(0,4).map(s=>{const c=sourceChip(s.status);return `<div class=\"source-item\"><div class=\"source-name\">${esc(s.title)}<small>${esc(s.description)}</small></div><span class=\"chip ${c.css}\">${c.label}</span></div>`}).join('');$('source-rows').innerHTML=list.map(s=>{const c=sourceChip(s.status);return `<article class=\"source-card\"><div class=\"panel-head\"><h3>${esc(s.title)}</h3><span class=\"chip ${c.css}\">${c.label}</span></div><p>${esc(s.description)}</p><p>${esc(s.detail)}</p><div class=\"time\">마지막 수집: ${esc(s.time||'확인되지 않음')}</div></article>`}).join('')}\nfunction overview(){const inside=services.filter(x=>x.kind==='tool_page').length;const outside=services.filter(x=>x.kind==='independent_site').length;$('kpi-services').textContent=number(services.length);$('kpi-services-hint').textContent=source==='live'?(statusRows.some(r=>r.source==='CATALOG'&&r.status==='ok')?'공식 목록·Cloudflare 배포 대조 완료':'공식 목록 연결 · Cloudflare 대조 확인 필요'):'2026-10-21 공식 목록 스냅샷';$('kpi-sites').textContent=number(outside);$('ring-total').textContent=number(services.length);$('cover-ring').style.background=`conic-gradient(#496fd7 0 ${outside/Math.max(1,services.length)*100}%,#87afec ${outside/Math.max(1,services.length)*100}% 100%)`;$('cover-legend').innerHTML=`<div class=\"legend-line\"><span><span class=\"swatch\"></span>별도 주소 기반</span><b>${outside}</b></div><div class=\"legend-line\"><span><span class=\"swatch alt\"></span>홈페이지 내부 도구</span><b>${inside}</b></div>`;$('recent-services').innerHTML=services.slice(0,8).map(s=>`<a class=\"service-small\" href=\"${esc(s.url)}\" target=\"_blank\" rel=\"noopener noreferrer\"><span class=\"service-icon\">${s.kind==='tool_page'?'◈':'↗'}</span><div style=\"min-width:0\"><div class=\"service-title\">${esc(s.title)}</div><div class=\"service-url\">${esc(meta(s.url))}</div></div></a>`).join('');let visitor=report?.entries?.filter(x=>defined(x.visitors?.value))||[];let earn=report?.entries?.filter(x=>defined(x.earnings?.value))||[]; $('kpi-visitors').textContent=visitor.length>0?number(visitor.reduce((a,x)=>a+Number(x.visitors.value),0)):'—'; $('kpi-visitors-hint').textContent=visitor.length>0?`기록된 ${visitor.length}/${report?.entries?.length||services.length}개 서비스 합계 · 전체 방문자 수 아님`:(report?.legacy?.available?'선택일 수집 기록 없음 · 0으로 간주하지 않음':reportFailed?'성과 API 조회 오류':'방문 원천 조회 필요');$('kpi-revenue').textContent=earn.length>0?won(earn.reduce((a,x)=>a+Number(x.earnings.value),0)):'—';$('kpi-revenue-hint').textContent=earn.length>0?`AdSense 기록 ${earn.length}개 서비스 합계`:'AdSense 일부 또는 전체 미연결';sourceRows();}\nfunction rowServices(){const q=$('filter-input').value.trim().toLocaleLowerCase('ko-KR'),kind=$('filter-kind').value;const filtered=services.filter(s=>(kind==='all'||s.kind===kind)&&(!q||(s.title+' '+s.url).toLocaleLowerCase('ko-KR').includes(q)));$('services-tbody').innerHTML=filtered.length?filtered.map(s=>`<tr><td><div class=\"table-name\">${esc(s.title)}</div><div class=\"table-url\" title=\"${esc(s.url)}\">${esc(s.url)}</div></td><td><span class=\"type\">${s.kind==='tool_page'?'내부 도구':'별도 주소'}</span></td><td><span class=\"chip ${['listed','deployed_success'].includes(s.status)?'ok':''}\">${esc(s.status==='catalog_snapshot'?'목록 스냅샷':s.status==='listed'?'공식 목록':s.status==='deployed_not_listed'?'배포 성공·목록 미등록':s.status==='deployed_success'?'운영 배포 검증 완료':s.status)}</span></td><td>${esc(s.cfProject|| (s.origin==='first_party_directory'?'공식 목록':s.origin||'—'))}</td><td class=\"mono\">${esc(s.lastSeenAt||'—')}</td><td><a class=\"linkout\" href=\"${esc(s.url)}\" target=\"_blank\" rel=\"noopener noreferrer\">열기 ↗</a></td></tr>`).join(''):'<tr><td colspan=\"6\" class=\"muted\">검색 결과가 없습니다.</td></tr>';$('services-footer').textContent=`${filtered.length}개 표시 / 전체 ${services.length}개 · ${source==='live'?'데이터 서버 연결':'2026-10-21 목록 스냅샷 (실시간 아님)'}`}\nfunction stateLabel(cell,v){if(defined(v))return `<strong class=\"mono\">${number(v)}</strong>`;let state=cell?.status||'source_unconnected';let map={source_unconnected:'미연결',no_final_row:'확정 자료 없음',pending:'집계 대기',no_report_row:'보고 자료 없음',error:'연동 오류'};return `<span class=\"muted\">${esc(map[state]||'미확인')}</span>`}\nfunction rowPerformance(){let rows=report?.entries?.length?report.entries:services.map(s=>({...s,visitors:{value:null,status:'source_unconnected'},search:{impressions:null,clicks:null,status:'source_unconnected'},earnings:{value:null,status:'source_unconnected'}}));$('performance-tbody').innerHTML=rows.map(r=>`<tr><td><div class=\"table-name\">${esc(r.title)}</div><div class=\"table-url\">${esc(meta(r.url))}</div></td><td>${stateLabel(r.visitors,r.visitors?.value)}</td><td>${stateLabel(r.search,r.search?.impressions)}</td><td>${stateLabel(r.search,r.search?.clicks)}</td><td>${defined(r.earnings?.value)?won(r.earnings.value):stateLabel(r.earnings,null)}</td><td><span class=\"muted\">${esc(r.visitors?.source||r.search?.source||r.earnings?.source||'연결된 데이터 없음')}<br>${esc(r.visitors?.observedAt||r.search?.fetchedAt||r.earnings?.fetchedAt||'—')}</span></td></tr>`).join('');$('performance-footer').textContent=`${$('report-date').value} · ${report?`원천 API 조회 · 기존 성과 ${report.history?.length||0}건 별도 보존 · 비콘과 중복 합산 없음`:'원천 연결 전: 공식 서비스 목록 표시 · 수치는 제공되지 않음'}`;overview()}\nasync function api(path,options={}){const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});let body=await r.json().catch(()=>null);if(!r.ok)throw new Error(body?.error||`HTTP ${r.status}`);return body}\nasync function loadServices(){try{const data=await api('/api/reporting/services');if(!Array.isArray(data.entries)||!data.entries.length)throw Error('동기화된 목록 없음');services=data.entries;source='live';$('source-tag').textContent='서버 연결';$('source-tag').className='state-tag ok';showMessage('');}catch(e){source='snapshot';services=seed;$('source-tag').textContent='기준 목록 · 미연결';$('source-tag').className='state-tag warn';showMessage('서비스 API 조회에 실패해 2026-10-21 기준 목록을 표시합니다. 현재 배포 여부나 최신 데이터로 간주하지 마세요.')}rowServices();overview();}\nasync function loadStatus(){try{const s=await api('/api/reporting/status');statusRows=s.sync||[];statusFailed=false;}catch{statusFailed=true;}sourceRows()}\nasync function loadReport(){const day=$('report-date').value;try{const r=await api('/api/reporting/performance?date='+encodeURIComponent(day));if(!Array.isArray(r.entries))throw Error('성과 구조 확인 불가');report=r;reportFailed=false;}catch{report=null;reportFailed=true;}rowPerformance();renderHistory()}\nfunction renderHistory(){const rows=report?.history||[];$('legacy-history').innerHTML=rows.length?'<h3>기존 성과 원본 이력 · 일별 집계와 중복 합산하지 않음</h3><div class=\"table-scroller\"><table><thead><tr><th>서비스 / 날짜</th><th>세션</th><th>페이지뷰</th><th>원천 / 갱신</th></tr></thead><tbody>'+rows.map(m=>`<tr><td>${esc(m.title)}<br>${esc(m.date)}</td><td>${number(m.visitors)}</td><td>${number(m.pageviews)}</td><td>${esc(m.source)}<br>${esc(m.updatedAt)}</td></tr>`).join('')+'</tbody></table></div>':'<p class=\"panel-desc\">선택일 기존 이력 '+(report?.legacy?.available?'없음':'조회 불가')+'</p>';}\nasync function checkRevision(){\n try{\n  const result=await api('/api/v2/registry/version');\n  if(registryRevision===null){registryRevision=result.revision;return;}\n  if(result.revision!==registryRevision){\n   registryRevision=result.revision;\n   // All screens use the same services table, not independently maintained lists.\n   await fullRefresh();\n   // fullRefresh() also reloads the overview KPI data from the same performance API.\n  }\n }catch{} // Keep current data; header already marks disconnected state.\n}\nasync function fullRefresh(){ $('refresh').disabled=true;try{await Promise.all([loadServices(),loadStatus()]);await loadReport()}finally{$('refresh').disabled=false}}\nasync function syncNow(){const b=$('sync');b.disabled=true;try{const r=await api('/api/v2/sync',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});showMessage(`등록 원장 동기화가 완료됐습니다: ${r.updated}개.`, 'ok');await fullRefresh()}catch(e){showMessage('서버 동기화를 실행하지 못했어요: '+e.message,'error')}finally{b.disabled=false}}\nfor(const el of document.querySelectorAll('[data-page]'))el.addEventListener('click',e=>{e.preventDefault();navigate(el.dataset.page)});\n$('google-sync').onclick=async()=>{const b=$('google-sync');b.disabled=true;try{const r=await api('/api/v2/google/sync',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});showMessage('Google 자료 수집: 검색 '+r.gsc.status+' · 광고 '+r.adsense.status);await fullRefresh()}catch(e){showMessage('Google 자료 수집 실패: '+e.message,'error')}finally{b.disabled=false}};\n$('mobile-menu').onclick=()=>$('sidebar').classList.toggle('open');$('refresh').onclick=fullRefresh;$('sync').onclick=syncNow;$('load-performance').onclick=loadReport;$('sources-refresh').onclick=loadStatus;$('filter-input').oninput=rowServices;$('filter-kind').onchange=rowServices;\n$('report-date').value=new Date(Date.now()-3*86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});\nconst target=location.hash.replace('#','');navigate(Object.hasOwn(pageTitles,target)?target:'overview');overview();rowServices();rowPerformance();fullRefresh();checkRevision();setInterval(()=>{if(document.visibilityState==='visible')checkRevision()},5000);setInterval(()=>{if(document.visibilityState==='visible')fullRefresh()},60000);\n})();\n";
var STATIC_SEED = "window.TOOLBOX_SNAPSHOT = [{\"title\": \"하루한칸 — 하루 루틴·교대근무·지출 관리\", \"url\": \"https://my-daily-life.pages.dev/\"}, {\"title\": \"수족관 수질 분석실\", \"url\": \"https://tb-aquarium-water-lab.pages.dev/\"}, {\"title\": \"중고 카메라 렌즈 검수\", \"url\": \"https://tb-camera-lens-check.pages.dev/\"}, {\"title\": \"트레이딩 카드 PSA 사전 감정 분석 | 포켓몬·원피스·스포츠 카드\", \"url\": \"https://tb-card-grading-lab.pages.dev/\"}, {\"title\": \"코믹북·만화책 상태 검수\", \"url\": \"https://tb-comic-condition-lab.pages.dev/\"}, {\"title\": \"CSV 열 선택 추출기\", \"url\": \"https://abreda.com/tools/csv-column-extractor/\"}, {\"title\": \"CSV 빈 행 제거기\", \"url\": \"https://abreda.com/tools/csv-empty-row-remover/\"}, {\"title\": \"CSV 파일 열 이름이 달라도 한 번에 병합하고 중복 제거하기\", \"url\": \"https://csv.abreda.com/\"}, {\"title\": \"보석·원석 외관 검수\", \"url\": \"https://tb-gem-photo-inspection.pages.dev/\"}, {\"title\": \"JSONL 파일 오류 검사기\", \"url\": \"https://abreda.com/tools/jsonl-validator/\"}, {\"title\": \"키보드 키 입력 진단실\", \"url\": \"https://tb-keyboard-switch-diagnostics.pages.dev/\"}, {\"title\": \"웹소설 원고의 반복 표현과 긴 문장을 빠르게 확인하는 원고돋보기\", \"url\": \"https://manuscript.abreda.com/\"}, {\"title\": \"웹소설 회차·복선·등장인물을 한 화면에서 추적하는 연재 설계실\", \"url\": \"https://novel.abreda.com/\"}, {\"title\": \"스니커즈 중고 상태 검수\", \"url\": \"https://tb-sneaker-condition-lab.pages.dev/\"}, {\"title\": \"SRT 자막 효과음·화자 표시 제거기\", \"url\": \"https://abreda.com/tools/srt-sdh-cleaner/\"}, {\"title\": \"3D 프린팅 출력 사전 점검\", \"url\": \"https://stl-print-check.abreda.com/\"}, {\"title\": \"자막 싱크 조정기 | SRT VTT 변환·자막 시간 오류 검사\", \"url\": \"https://tb-subtitle-sync-studio.pages.dev/\"}, {\"title\": \"중고차 구매 전 검수실\", \"url\": \"https://tb-used-car-inspection.pages.dev/\"}, {\"title\": \"LP 레코드 상태 검수\", \"url\": \"https://tb-vinyl-condition-lab.pages.dev/\"}, {\"title\": \"VTT 자막 정리기\", \"url\": \"https://abreda.com/tools/vtt-cleaner/\"}, {\"title\": \"명품시계 외관 검수\", \"url\": \"https://watch-inspection-lab.abreda.com/\"}];\n";
var SNS_HTML = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="color-scheme" content="dark"><title>SNS \uD1B5\uD569 \uAD00\uC81C\uC13C\uD130 \xB7 \uC791\uC740\uB3C4\uAD6C\uD568</title>
<style>
:root{--bg:#0a111d;--side:#0e1726;--panel:#121d2d;--panel2:#19263a;--ink:#eef4ff;--soft:#a0b1c8;--border:#2a3b52;--accent:#7ba7ff;--ok:#6bdbad;--warn:#ffcb83;--bad:#ff9d9b}*{box-sizing:border-box}body{font:14px/1.55 system-ui,-apple-system,'Malgun Gothic',sans-serif;background:var(--bg);color:var(--ink);margin:0}button,input,textarea,select{font:inherit}button{cursor:pointer}a{color:var(--accent)}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.shell{display:grid;grid-template-columns:242px minmax(0,1fr);min-height:100vh}.sidebar{background:var(--side);border-right:1px solid var(--border);padding:24px 16px;position:sticky;top:0;height:100vh}.brand-logo{font-weight:840;font-size:17px;line-height:1.2;padding:10px 10px 35px;display:flex;align-items:center;gap:11px}.symbol{display:grid;place-items:center;background:#3969d4;color:white;width:40px;height:40px;border-radius:12px;font-size:21px}.brand-logo small{font-size:11px;color:var(--soft);font-weight:500}.navhead{font-size:10px;letter-spacing:.17em;color:#7890ab;font-weight:800;padding:0 12px;margin:11px 0}.navitem{display:flex;align-items:center;gap:12px;width:100%;border:0;background:transparent;color:#b7c7dc;text-align:left;padding:12px;border-radius:10px;margin:3px 0;font-weight:620}.navitem.active{background:#213554;color:#eff6ff}.navitem span{width:22px;text-align:center;font-size:19px}.sidebarfoot{border:1px solid #314863;background:#14243a;border-radius:12px;padding:13px;margin-top:28px;color:#aebfd5;font-size:12px}.sidebarfoot b{color:#fff}.main{padding:34px 42px 70px;max-width:1600px;width:100%;min-width:0;margin:auto}.eyebrow{color:#84acfb;font-size:11px;font-weight:850;letter-spacing:.17em}.top{display:flex;gap:20px;justify-content:space-between;align-items:center}.top h1{font-size:30px;letter-spacing:-.8px;margin:5px 0}.sub{color:var(--soft);margin:0}.actions{display:flex;gap:8px;flex-wrap:wrap}.btn{background:#233650;border:1px solid #3a5070;padding:9px 14px;color:var(--ink);border-radius:9px;font-weight:700}.btn:hover{background:#304a70}.btn.primary{background:#4177d7;border-color:#6296f6;color:white}.btn.danger{background:#55333d;border-color:#82505d;color:#ffd4d7}.btn:disabled{cursor:not-allowed;opacity:.5}.btn.small{font-size:12px;padding:6px 10px}.btn.flat{background:transparent}.tag{font-size:11px;display:inline-flex;align-items:center;gap:4px;border:1px solid #3e536b;padding:4px 9px;border-radius:999px;color:#bac9df;background:#1b293d;white-space:nowrap}.tag.ok{border-color:#2b7566;color:#83edc0;background:#123931}.tag.warn{border-color:#766040;color:#ffdaa1;background:#392c1c}.tag.bad{border-color:#78434a;color:#ffbbbd;background:#392127}.livebanner{margin-top:21px;padding:13px 15px;border:1px solid #304d72;border-radius:12px;background:#14253b;color:#c7d8f3;display:flex;justify-content:space-between;gap:10px;align-items:center}.muted{color:var(--soft)}.grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-top:23px}.metric{border-radius:14px;background:var(--panel);border:1px solid var(--border);padding:18px}.metric .key{color:#a8b9d1;font-size:12px}.metric .val{font-size:28px;font-weight:850;letter-spacing:-.7px;margin:5px 0}.metric .hint{color:#8195b2;font-size:11px}.grid2{display:grid;grid-template-columns:1.15fr .85fr;gap:15px}.grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.section{margin-top:29px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:13px}.section-head h2{font-size:18px;letter-spacing:-.3px;margin:0}.panel{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:19px;min-width:0}.brandcard .name{font-weight:800;font-size:16px}.brandcard .note{font-size:12px;color:var(--soft);margin-bottom:11px}.accrow{border-top:1px solid var(--border);padding:12px 0;display:flex;align-items:center;gap:9px}.accrow:last-child{padding-bottom:0}.accrow .plat{width:32px;height:32px;display:grid;place-items:center;background:#21334b;border-radius:9px;font-size:17px}.accmain{flex:1;min-width:0}.accmain .handle{font-weight:700;font-size:12px;overflow-wrap:anywhere}.accmain .kind{font-size:11px;color:var(--soft)}.tablewrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:650px;text-align:left}td,th{border-bottom:1px solid var(--border);padding:12px 11px;font-size:12px;vertical-align:middle}th{color:#97abc9}td{overflow-wrap:anywhere}tbody tr:hover{background:#18263b}.pill{display:inline-flex;border-radius:6px;padding:3px 7px;color:#e7d7ff;background:#423355}.pill.approved{color:#ffe0a7;background:#4b3922}.pill.queued{color:#9ee9ce;background:#1b493b}.pill.sending{color:#cae5ff;background:#274663}.pill.needs_reconcile{color:#ffd0c7;background:#52322f}.empty{padding:22px 16px;background:#152235;border:1px dashed #39516d;border-radius:11px;color:#9fb4d2;text-align:center}.scroll{max-height:350px;overflow-y:auto}.event{display:flex;gap:13px;padding:11px 0;border-bottom:1px solid var(--border)}.event:last-child{border:0}.eventdot{width:8px;height:8px;margin-top:7px;border-radius:50%;background:#7b9dde;flex-shrink:0}.eventdot.failed{background:#f09c9c}.eventdot.success{background:#66d6a4}.event .e-title{font-weight:700}.event .meta{font-size:11px;color:var(--soft)}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.row.right{justify-content:flex-end}.field{margin-bottom:14px}.field label{display:block;margin-bottom:6px;color:#c1cfe2;font-size:12px;font-weight:730}.field input,.field select,.field textarea{background:#0c182a;color:var(--ink);border:1px solid #3b4e6a;padding:10px 11px;border-radius:8px;width:100%;min-width:0}.field textarea{min-height:125px;resize:vertical}.formtwo{display:grid;grid-template-columns:1fr 1fr;gap:13px}.formtwo .wide{grid-column:1/-1}.bar{height:10px;background:#24354a;border-radius:40px;overflow:hidden}.bar span{height:100%;background:#5f9aff;display:block;width:0}.tabpage[hidden]{display:none!important}.modal{position:fixed;inset:0;background:#020810cf;display:none;align-items:center;justify-content:center;padding:15px;z-index:10}.modal.open{display:flex}.dialog{width:min(610px,100%);max-height:90vh;overflow-y:auto;background:#18283e;border:1px solid #4a607c;border-radius:17px;padding:24px}.dialog h2{margin:0 0 20px}.msg{position:fixed;bottom:20px;right:20px;background:#284e43;border:1px solid #4b9079;border-radius:10px;padding:12px 16px;box-shadow:0 12px 30px #0009;z-index:20;display:none;max-width:440px}.msg.show{display:block}.minor{font-size:12px;color:#93a8c4}.space{height:6px}.warnnote{border-left:3px solid #e2a863;padding:12px 14px;color:#dcc5a5;background:#322719;border-radius:4px;margin-top:14px}.kv{display:flex;justify-content:space-between;gap:15px;padding:11px 0;border-bottom:1px solid var(--border)}.kv:last-child{border:0}.mobilebar{display:none}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#0c1625;padding:12px;border-radius:10px;color:#b4c7e2;font-size:12px}@media(max-width:1100px){.main{padding:26px}.grid4{grid-template-columns:repeat(2,minmax(0,1fr))}.grid3{grid-template-columns:1fr 1fr}.grid2{grid-template-columns:1fr}}@media(max-width:760px){.shell{display:block}.sidebar{display:none}.mobilebar{display:flex;align-items:center;gap:9px;overflow-x:auto;background:var(--side);padding:10px;position:sticky;top:0;z-index:5}.mobilebar button{white-space:nowrap}.main{padding:19px 14px 50px}.top{align-items:flex-start;flex-direction:column}.top h1{font-size:25px}.grid4{gap:9px}.metric{padding:14px}.metric .val{font-size:24px}.grid3{grid-template-columns:1fr}.formtwo{grid-template-columns:1fr}.formtwo .wide{grid-column:auto}.livebanner{align-items:flex-start;flex-direction:column}}
</style></head><body>
<div class="mobilebar" id="mobile-nav"></div>
<div class="shell"><aside class="sidebar"><div class="brand-logo"><div class="symbol">\u25C8</div><div>\uC791\uC740\uB3C4\uAD6C\uD568<br><small>ADMIN CONSOLE</small></div></div><div class="navhead">SNS OPERATIONS</div><div id="nav"></div><div class="sidebarfoot"><b>\uBC1C\uD589 \uC548\uC804 \uC815\uCC45</b><br>\uC2E4\uC81C \uBC1C\uD589\uC740 \uBA85\uC2DC\uC801 \uC2B9\uC778 \uD6C4 \uC2E4\uD589\uD569\uB2C8\uB2E4. \uC790\uB3D9\uD654\uB294 \uAE30\uBCF8 \uC7A0\uAE08 \uC0C1\uD0DC\uC785\uB2C8\uB2E4.<p><a href="https://adminivo.com/">\u2190 \uAD00\uB9AC\uC790 \uD648\uC73C\uB85C</a></p></div></aside>
<main class="main"><div class="top"><div><div class="eyebrow">SOCIAL COMMAND CENTER / 2026</div><h1>SNS \uD1B5\uD569 \uAD00\uC81C\uC13C\uD130</h1><p class="sub">\uD55C\uAD6D\uC5B4 6\uCC44\uB110 \xB7 \uC601\uC5B4 3\uCC44\uB110 \xB7 \uC2E4\uB370\uC774\uD130 \uAE30\uBC18 \uBAA8\uB2C8\uD130\uB9C1</p></div><div class="actions"><button class="btn" id="refresh">\u27F3 \uC9C0\uAE08 \uC0C8\uB85C\uACE0\uCE68</button><a class="btn" href="https://adminivo.com/" style="text-decoration:none">\uAD00\uB9AC\uC790 \uD648 \u2197</a></div></div>
<div class="livebanner"><div class="row"><span class="tag warn" id="connection-tag">\uC5F0\uACB0 \uD655\uC778 \uC911</span><span id="connection-summary">Buffer\xB7Make\xB7D1 \uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.</span></div><div class="minor" id="sync-time">\uB9C8\uC9C0\uB9C9 \uD655\uC778 \u2014</div></div>
<section id="overview" class="tabpage"><div class="grid4"><div class="metric"><div class="key">\uD655\uC778\uB41C \uAC1C\uC124 \uACC4\uC815</div><div class="val" id="m-accounts">9</div><div class="hint">\uC0AC\uC6A9\uC790 \uD655\uC778 \uAE30\uC900 \xB7 \uC5F0\uB3D9 \uC0C1\uD0DC \uBCC4\uB3C4</div></div><div class="metric"><div class="key">Buffer \uC5F0\uACB0 \uCC44\uB110</div><div class="val" id="m-channels">\u2014</div><div class="hint">Buffer \uC2E4\uC2DC\uAC04 API \uAE30\uBC18</div></div><div class="metric"><div class="key">\uC870\uD68C\uB41C \uC608\uC57D \uAC8C\uC2DC\uBB3C</div><div class="val" id="m-scheduled">\u2014</div><div class="hint">\uCD5C\uADFC \uC870\uD68C \uBC94\uC704 \xB7 \uC804\uCCB4 \uD569\uACC4 \uC544\uB2D8</div></div><div class="metric"><div class="key">\uBC1C\uD589 \uACB0\uACFC / \uCD5C\uADFC \uC870\uD68C</div><div class="val" id="m-sent">\u2014</div><div class="hint">Buffer\uAC00 \uC751\uB2F5\uD55C \uCD5C\uADFC \uAC8C\uC2DC\uBB3C</div></div></div>
<div class="section grid2"><div class="panel"><div class="section-head"><h2>\uCC44\uB110\uBCC4 \uC5F0\uACB0 \uC0C1\uD0DC</h2><button class="btn small" data-page="accounts">\uC804\uCCB4 \uACC4\uC815 \u2197</button></div><div id="summary-accounts" class="muted">\uC5F0\uACB0\uB41C \uB370\uC774\uD130 \uB300\uAE30 \uC911...</div></div><div class="panel"><div class="section-head"><h2>\uCD5C\uADFC \uC790\uB3D9\uD654 \uC774\uBCA4\uD2B8</h2><button class="btn small" data-page="monitor">\uC774\uBCA4\uD2B8 \uC804\uCCB4 \u2197</button></div><div id="summary-events" class="scroll"><div class="empty">Make \uC774\uBCA4\uD2B8 \uC544\uC9C1 \uC5C6\uC74C</div></div></div></div>
<div class="section grid2"><div class="panel"><div class="section-head"><h2>\uCD5C\uADFC Buffer \uAC8C\uC2DC\uBB3C \uC131\uACFC</h2><span class="tag">\uACF5\uC2DD API \uAC12\uB9CC \uD45C\uC2DC</span></div><div id="summary-metrics" class="empty">\uC5F0\uACB0\uB41C \uC131\uACFC \uB370\uC774\uD130 \uC5C6\uC74C</div></div><div class="panel"><div class="section-head"><h2>\uC9C4\uD589 \uC0C1\uD0DC</h2></div><div class="kv"><span>SNS 9\uAC1C \uACC4\uC815 \uAC1C\uC124</span><span class="tag ok">\uC0AC\uC6A9\uC790 \uD655\uC778 \uC644\uB8CC</span></div><div class="kv"><span>Buffer \uC5F0\uB3D9</span><span id="step-buffer" class="tag">\uD655\uC778 \uC911</span></div><div class="kv"><span>Make \uC2E4\uD589 \uC774\uBCA4\uD2B8</span><span id="step-make" class="tag">\uC218\uC2E0 \uB300\uAE30</span></div><div class="kv"><span>\uCF58\uD150\uCE20\xB7\uC0AC\uC774\uD2B8 \uB3C4\uAD6C \uD655\uCDA9</span><span class="tag warn">\uC120\uD589 \uC791\uC5C5</span></div></div></div></section>
<section id="accounts" class="tabpage" hidden><div class="section-head section"><h2>\uBE0C\uB79C\uB4DC\xB7\uACC4\uC815 \uC6B4\uC601 \uB300\uC7A5</h2><span class="tag">\uACC4\uC815\uBCC4 Buffer \uCC44\uB110 ID \uC5F0\uACB0</span></div><div class="grid3" id="account-grid"></div><div class="warnnote">\uAC01 SNS\uC758 \uC2E4\uC81C \uB85C\uADF8\uC778\uC740 Buffer \uACF5\uC2DD \uACC4\uC815 \uC5F0\uACB0\uC5D0\uC11C \uC9C4\uD589\uD558\uC138\uC694. \uBE44\uBC00\uBC88\uD638\xB7API \uD0A4\uB294 \uC5EC\uAE30 \uC785\uB825\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uCC44\uB110 ID\uB294 Buffer \uC5F0\uACB0 \uD6C4 \uAC00\uC838\uC628 \uAC12\uC744 \uB4F1\uB85D\uD569\uB2C8\uB2E4.</div></section>
<section id="contents" class="tabpage" hidden><div class="section section-head"><h2>\uCF58\uD150\uCE20 \uC2B9\uC778\xB7\uC608\uC57D \uAD00\uC81C</h2><button class="btn primary" id="new-draft">+ \uC0C8 \uCF58\uD150\uCE20</button></div><div class="panel"><div class="tablewrap"><table><thead><tr><th>\uCF58\uD150\uCE20</th><th>\uB300\uC0C1</th><th>\uC0C1\uD0DC</th><th>\uC0DD\uC131\uC77C</th><th>\uC870\uCE58</th></tr></thead><tbody id="draft-rows"></tbody></table></div><div id="draft-empty" class="empty">\uB4F1\uB85D\uB41C \uCF58\uD150\uCE20\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div></div><div class="warnnote">Buffer \uC608\uC57D \uBC1C\uD589\uC740 [\uCD08\uC548 \uC791\uC131] \u2192 [\uC2B9\uC778] \u2192 [\uC608\uC57D \uBC1C\uD589]\uC744 \uAC70\uCE69\uB2C8\uB2E4. \uC778\uC2A4\uD0C0\uADF8\uB7A8\uC740 \uC774\uBBF8\uC9C0/\uC601\uC0C1 \uC5F0\uACB0 \uB85C\uC9C1 \uC900\uBE44 \uC804\uAE4C\uC9C0 \uD14D\uC2A4\uD2B8\uB9CC \uBC1C\uD589\uD560 \uC218 \uC5C6\uB3C4\uB85D \uCC28\uB2E8\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.</div></section>
<section id="monitor" class="tabpage" hidden><div class="section section-head"><h2>\uC5F0\uB3D9\xB7\uC624\uB958\xB7\uC2E4\uD589 \uC774\uBCA4\uD2B8</h2><span class="tag">Make \u2192 \uBCF4\uD638\uB41C \uC774\uBCA4\uD2B8 \uC5D4\uB4DC\uD3EC\uC778\uD2B8</span></div><div class="grid2"><div class="panel"><div class="section-head"><h2>\uC774\uBCA4\uD2B8 \uC218\uC2E0 \uB85C\uADF8</h2></div><div id="all-events" class="scroll"><div class="empty">\uC218\uC2E0\uB41C \uC774\uBCA4\uD2B8 \uC5C6\uC74C</div></div></div><div class="panel"><div class="section-head"><h2>Buffer \uC5F0\uACB0 \uC0C1\uD0DC</h2></div><div id="remote-status" class="muted">API \uC5F0\uACB0 \uC5C6\uC74C</div><div class="space"></div><div class="section-head" style="margin-top:24px"><h2>\uC2E4\uD328 \uBC0F \uD655\uC778 \uD544\uC694</h2></div><div id="needs-attention" class="empty">\uAE30\uB85D\uB41C \uC624\uB958 \uC5C6\uC74C</div></div></div></section>
<section id="budget" class="tabpage" hidden><div class="section section-head"><h2>\uC6D4 \uC6B4\uC601\uBE44 \xB7 \uC2E4\uC81C \uC9C0\uCD9C \uC7A5\uBD80</h2><button class="btn primary" id="new-expense">+ \uACB0\uC81C \uAE30\uB85D</button></div><div class="grid2"><div class="panel"><div class="minor">\uC6D4 \uC6B4\uC601 \uD55C\uB3C4 \xB7 KRW</div><div class="metric val" style="padding:8px 0 3px;border:0;background:transparent" id="budget-total">100,000\uC6D0</div><div class="kv"><span>\uB2F9\uC6D4 \uD655\uC778\uB41C \uACB0\uC81C</span><b id="spent-total">\u2014</b></div><div class="kv"><span>\uB0A8\uC740 \uC608\uC0B0</span><b id="remaining">\u2014</b></div><div class="bar" style="margin:13px 0"><span id="budget-bar"></span></div><div class="minor">\uC2E4\uC81C \uC785\uB825\uD55C \uACB0\uC81C \uAC74\uB9CC \uD569\uC0B0. \uCCAD\uAD6C\uB418\uC9C0 \uC54A\uC740 API \uD1A0\uD070\xB7\uD574\uC678 \uACB0\uC81C \uC218\uC218\uB8CC\uB294 \uBCC4\uB3C4\uB85C \uD655\uC778\uD574\uC57C \uD569\uB2C8\uB2E4.</div></div><div class="panel"><div class="section-head"><h2>\uC2E4\uC81C \uACB0\uC81C \uAE30\uB85D</h2></div><div class="tablewrap"><table><thead><tr><th>\uACB0\uC81C\uC77C</th><th>\uD56D\uBAA9</th><th>\uC6D0\uD654</th></tr></thead><tbody id="expense-rows"></tbody></table></div><div id="expense-empty" class="empty">\uC544\uC9C1 \uAE30\uB85D\uB41C \uACB0\uC81C \uC5C6\uC74C</div></div></div></section>
<section id="settings" class="tabpage" hidden><div class="section section-head"><h2>\uC6B4\uC601 \uC124\uC815\xB7\uBCF4\uC548</h2><span class="tag warn">\uC0AC\uC774\uD2B8 \uB3C4\uAD6C \uD655\uCDA9 \uC804 \uBC1C\uD589 \uBCF4\uB958</span></div><div class="grid2"><div class="panel"><div class="section-head"><h2>\uC2E0\uADDC \uBC1C\uD589 \uC548\uC804 \uC7A0\uAE08</h2><span id="lock-status" class="tag warn">\uC7A0\uAE40</span></div><p class="muted">\uC7A0\uACA8 \uC788\uC73C\uBA74 \uC774 \uAD00\uC81C\uC13C\uD130\uC5D0\uC11C \uC0C8 \uAC8C\uC2DC\uBB3C\uC744 Buffer \uB300\uAE30\uC5F4\uB85C \uC804\uC1A1\uD560 \uC218 \uC5C6\uC5B4. \uC774\uBBF8 Buffer\uC5D0 \uC608\uC57D\uB41C \uAE00\uC774\uB098 \uC678\uBD80 Make \uC2DC\uB098\uB9AC\uC624\uB294 \uC774 \uBC84\uD2BC\uC73C\uB85C \uC911\uB2E8\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.</p><button id="toggle-lock" class="btn danger" disabled>\uC124\uC815 \uB85C\uB529 \uC911</button><div class="warnnote">\uC790\uB3D9\uBC1C\uD589\uC744 \uC911\uC9C0\uD558\uB824\uBA74 Make \uC2DC\uB098\uB9AC\uC624\uB3C4 \uB530\uB85C \uBE44\uD65C\uC131\uD654\uD558\uACE0 Buffer \uC608\uC57D \uD050\uB3C4 \uC9C1\uC811 \uD655\uC778\uD558\uC138\uC694.</div></div><div class="panel"><div class="section-head"><h2>\uC5F0\uACB0 \uC900\uBE44 \uC0AC\uD56D</h2></div><div class="kv"><span>Cloudflare Access</span><span class="tag">\uC11C\uBC84 \uAC80\uC99D \uD544\uC218</span></div><div class="kv"><span>D1 \uB370\uC774\uD130\uBCA0\uC774\uC2A4</span><span class="tag">SNS_DB</span></div><div class="kv"><span>Buffer \uAC1C\uC778 API \uD0A4</span><span class="tag">\uC11C\uBC84 \uBE44\uBC00\uBCC0\uC218</span></div><div class="kv"><span>Make \uC774\uBCA4\uD2B8 \uD1A0\uD070</span><span class="tag">\uC11C\uBC84 \uBE44\uBC00\uBCC0\uC218</span></div><p class="minor">\uBE44\uBC00\uD0A4\uB97C \uBE0C\uB77C\uC6B0\uC800\xB7\uB85C\uCEEC\uC2A4\uD1A0\uB9AC\uC9C0\uC5D0 \uC800\uC7A5\uD558\uC9C0 \uC54A\uC73C\uBA70 \uC778\uC99D\uC815\uBCF4\uB294 \uC11C\uBC84\uC5D0\uC11C\uB9CC \uC0AC\uC6A9\uD569\uB2C8\uB2E4.</p></div></div></section>
<footer style="margin:40px 0 0;border-top:1px solid var(--border);padding-top:16px;color:#8397b6;font-size:12px">\uC791\uC740\uB3C4\uAD6C\uD568 SNS \uAD00\uC81C\uC13C\uD130 v0.3 \xB7 \uC2E4\uC81C API \uC5F0\uACB0 \uC804\uC5D0\uB294 \uC870\uD68C \uC218\uCE58\uAC00 \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \xB7 <a href="https://adminivo.com/">\uAD00\uB9AC\uC790 \uD648</a></footer></main></div>
<div class="modal" id="modal"><div class="dialog"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h2 id="modal-title">\uC815\uBCF4 \uD3B8\uC9D1</h2><button class="btn small" id="modal-close">\uB2EB\uAE30 \u2715</button></div><form id="form"><div id="modal-fields"></div><div class="row right"><button class="btn primary" type="submit" id="modal-submit">\uC800\uC7A5</button></div></form></div></div><div id="toast" class="msg" role="status"></div>
<script>
(()=>{'use strict';const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const won=v=>Number(v).toLocaleString('ko-KR')+'\uC6D0';
const nav=[['overview','\u25A6','\uC804\uCCB4 \uD604\uD669'],['accounts','\u25CE','\uACC4\uC815 9\uAC1C'],['contents','\u25A4','\uAC8C\uC2DC\uBB3C \uC2B9\uC778'],['monitor','\u2301','\uC2E4\uC2DC\uAC04 \uC774\uBCA4\uD2B8'],['budget','\u25C9','\uBE44\uC6A9 \uAD00\uB9AC'],['settings','\u2699','\uC124\uC815\xB7\uC548\uC804 \uC7A0\uAE08']];
const brandNames={issue:'\uC9C0\uAE08\uC774\uC288 / Now Trending',life:'\uC0DD\uD65C\uD55C\uC785 / Life in a Bite',ai:'AI \uB808\uC774\uB354 / AI Radar'};const platformNames={instagram:'\uC778\uC2A4\uD0C0\uADF8\uB7A8',threads:'\uC2A4\uB808\uB4DC',bluesky:'\uBE14\uB8E8\uC2A4\uCE74\uC774'};const symbols={instagram:'\u25CE',threads:'\uFF20',bluesky:'\u{1F98B}'};
let data=null,modalAction=null,busy=false,active='overview';
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),4000)}
function page(id){active=id;nav.forEach(([x])=>{$(x).hidden=x!==id;document.querySelectorAll('[data-page="'+x+'"]').forEach(b=>b.classList.toggle('active',x===id))});}
for(const [id,symbol,label] of nav){const button=\`<button type="button" class="navitem" data-page="\${id}"><span>\${symbol}</span>\${label}</button>\`;$('nav').insertAdjacentHTML('beforeend',button);$('mobile-nav').insertAdjacentHTML('beforeend',button.replace('navitem','btn small'));}
document.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)page(b.dataset.page);});page(active);
async function request(path,method='GET',obj){const opts={method,credentials:'same-origin',headers:{}};if(obj!==undefined){opts.headers['content-type']='application/json';opts.body=JSON.stringify(obj);}const res=await fetch('/api/sns/'+path,opts);let body;try{body=await res.json()}catch{throw Error('API \uC751\uB2F5\uC744 \uC77D\uC744 \uC218 \uC5C6\uC74C (HTTP '+res.status+')')}if(!res.ok||body.ok===false)throw Error(body.error||'HTTP '+res.status);return body;}
function statusTag(status){const map={draft:['\uCD08\uC548',''],approved:['\uC2B9\uC778\uB428','warn'],sending:['\uC804\uC1A1 \uC911','warn'],queued:['Buffer \uC608\uC57D \uB4F1\uB85D','ok'],needs_reconcile:['\uACB0\uACFC \uC7AC\uD655\uC778 \uD544\uC694','bad']};const [label,cls]=map[status]||[status,''];return \`<span class="tag \${cls}">\${esc(label)}</span>\`}
function bufferInfo(){return data?.buffer?.data||null}
function bufferAccounts(){return bufferInfo()?.channels||[]}
function accStatus(a){if(!data)return '<span class="tag">\uD655\uC778 \uBD88\uAC00</span>';const ch=bufferAccounts().find(x=>x.id===a.buffer_channel_id);return ch?'<span class="tag ok">Buffer \uC5F0\uACB0 \uD655\uC778</span>':a.buffer_channel_id?'<span class="tag warn">ID \uAC80\uC99D \uD544\uC694</span>':'<span class="tag">\uBBF8\uC5F0\uACB0</span>'}
function time(s){if(!s)return '\u2014';const d=new Date(s);return Number.isNaN(d.getTime())?'\u2014':d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'});}
function eventHTML(v){return \`<div class="event"><span class="eventdot \${esc(v.status)}"></span><div><div class="e-title">\${esc(v.provider)} \xB7 \${esc(v.type)} \xB7 \${esc(v.status)}</div><div>\${esc(v.details||'\uC138\uBD80 \uAE30\uB85D \uC5C6\uC74C')}</div><div class="meta">\${time(v.occurred_at)} \xB7 \${esc(v.account_id||'\uC804\uCCB4')} \xB7 \uC774\uBCA4\uD2B8 ID \${esc(v.id.slice(0,8))}</div></div></div>\`}
function metricsHTML(posts){const p=posts.filter(x=>Array.isArray(x.metrics)&&x.metrics.length>0).slice(0,8);return p.length?p.map(x=>\`<div class="kv"><span style="max-width:52%;overflow-wrap:anywhere">\${esc((x.text||'\uAC8C\uC2DC\uBB3C').slice(0,70))}<div class="minor">\${time(x.dueAt)}</div></span><span style="text-align:right">\${x.metrics.map(m=>\`\${esc(m.name)} \${esc(m.value)}\${m.unit?' '+esc(m.unit):''}\`).join('<div></div>')}</span></div>\`).join(''):'<div class="empty">\uC81C\uACF5\uB41C \uAC8C\uC2DC\uBB3C \uC131\uACFC \uC5C6\uC74C \xB7 \uC5F0\uACB0 \uC804 \uB610\uB294 API \uBBF8\uC81C\uACF5</div>'}
function render(){if(!data)return;
$('connection-tag').className='tag '+(data.buffer.status==='connected'?'ok':data.buffer.status==='error'?'bad':'warn');$('connection-tag').textContent=data.buffer.status==='connected'?'Buffer API \uC815\uC0C1':data.buffer.status==='error'?'Buffer \uC870\uD68C \uC624\uB958':'Buffer \uBBF8\uC124\uC815';$('connection-summary').textContent=data.buffer.status==='error'?(data.buffer.message||'\uD655\uC778 \uBD88\uAC00'):'D1 \uB3D9\uAE30\uD654 \uC644\uB8CC \xB7 Buffer \uB370\uC774\uD130 '+(data.buffer.status==='connected'?'\uD655\uC778\uB428':'\uC5F0\uACB0 \uB300\uAE30');$('sync-time').textContent='\uC870\uD68C '+time(data.serverTime)+(data.buffer.data?.syncedAt?' \xB7 Buffer '+time(data.buffer.data.syncedAt):'');
$('m-accounts').textContent='9';$('m-channels').textContent=data.buffer.status==='connected'?bufferAccounts().length:'\u2014';$('m-scheduled').textContent=data.buffer.status==='connected'?(bufferInfo()?.scheduled.length??'\u2014'):'\u2014';$('m-sent').textContent=data.buffer.status==='connected'?(bufferInfo()?.sent.length??'\u2014'):'\u2014';
$('summary-accounts').innerHTML=data.accounts.map(a=>\`<div class="kv"><span>\${esc(brandNames[a.brand]?.split(' / ')[0])} \xB7 \${esc(platformNames[a.platform])}<div class="minor">\${a.handle?'@'+esc(a.handle):'\uC544\uC774\uB514 \uD655\uC778 \uD544\uC694'}</div></span>\${accStatus(a)}</div>\`).join('');
$('summary-events').innerHTML=data.events.length?data.events.slice(0,6).map(eventHTML).join(''):'<div class="empty">\uC218\uC2E0\uB41C Make/Buffer \uC774\uBCA4\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';$('summary-metrics').innerHTML=metricsHTML(bufferInfo()?.sent||[]);$('summary-metrics').className='';
$('step-buffer').textContent=data.buffer.status==='connected'?'\uC5F0\uB3D9 \uC815\uC0C1':'\uC5F0\uB3D9 \uB300\uAE30';$('step-buffer').className='tag '+(data.buffer.status==='connected'?'ok':'warn');$('step-make').textContent=data.events.some(e=>e.provider==='make')?'\uC218\uC2E0 \uAE30\uB85D \uC788\uC74C':'\uBBF8\uC5F0\uACB0';
$('account-grid').innerHTML=['issue','life','ai'].map(br=>\`<div class="panel brandcard"><div class="name">\${esc(brandNames[br])}</div><div class="note">\${br==='issue'?'\uB274\uC2A4\xB7\uC2E4\uC2DC\uAC04 \uC774\uC288':br==='life'?'\uC0DD\uD65C\uC815\uBCF4\xB7\uC2E4\uC6A9 \uD301':'AI\xB7\uAE30\uC220\xB7\uC790\uB3D9\uD654'}</div>\${data.accounts.filter(a=>a.brand===br).sort((a,b)=>['instagram','threads','bluesky'].indexOf(a.platform)-['instagram','threads','bluesky'].indexOf(b.platform)).map(a=>\`<div class="accrow"><div class="plat">\${symbols[a.platform]}</div><div class="accmain"><div class="handle">\${a.handle?'@'+esc(a.handle):'\uC2E4\uC81C \uC544\uC774\uB514 \uBBF8\uD655\uC778'}</div><div class="kind">\${platformNames[a.platform]}</div>\${accStatus(a)}</div><button class="btn small" data-edit-account="\${a.id}">\uD3B8\uC9D1</button></div>\`).join('')}</div>\`).join('');
$('draft-rows').innerHTML=data.drafts.map(d=>\`<tr><td><b>\${esc(d.body.slice(0,110))}</b>\${d.source_url?\`<div><a href="\${esc(d.source_url)}" target="_blank" rel="noopener noreferrer">\uC6D0\uCC9C \uCD9C\uCC98 \u2197</a></div>\`:''}\${d.note?\`<div class="minor">\${esc(d.note)}</div>\`:''}</td><td>\${esc(d.account_id)}</td><td>\${statusTag(d.status)}</td><td>\${time(d.created_at)}</td><td>\${d.status==='draft'?\`<button class="btn small" data-approve="\${d.id}">\uC2B9\uC778</button>\`:d.status==='approved'?\`<button class="btn small primary" data-queue="\${d.id}">Buffer \uC608\uC57D</button>\`:'\u2014'}</td></tr>\`).join('');$('draft-empty').hidden=data.drafts.length>0;
$('all-events').innerHTML=data.events.length?data.events.map(eventHTML).join(''):'<div class="empty">\uC774\uBCA4\uD2B8 \uC5C6\uC74C</div>';
$('remote-status').innerHTML=\`<div class="kv"><span>Buffer API</span><span class="tag \${data.buffer.status==='connected'?'ok':'warn'}">\${esc(data.buffer.status)}</span></div><div class="kv"><span>\uB9C8\uC9C0\uB9C9 Buffer \uB3D9\uAE30\uD654</span><b>\${time(data.buffer.data?.syncedAt)}</b></div><div class="kv"><span>\uC5F0\uACB0\uB41C \uCC44\uB110 \uC218</span><b>\${data.buffer.status==='connected'?bufferAccounts().length:'\u2014'}</b></div>\${(data.buffer.data?.warnings||[]).map(w=>\`<p class="minor" style="color:var(--warn)">\${esc(w)}</p>\`).join('')}\`;
const issues=[...data.events.filter(e=>e.status==='failed').slice(0,10).map(e=>e.details),...data.drafts.filter(d=>d.status==='needs_reconcile').map(d=>'Buffer \uC804\uC1A1 \uC7AC\uD655\uC778: '+d.id)];$('needs-attention').innerHTML=issues.length?issues.map(x=>'<div class="kv">'+esc(x||'\uC624\uB958 \uC124\uBA85 \uC5C6\uC74C')+'</div>').join(''):'\uAE30\uB85D\uB41C \uC624\uB958 \uC5C6\uC74C';
const current=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}).slice(0,7);const spent=data.expenses.filter(x=>x.paid_on.startsWith(current)).reduce((s,x)=>s+Number(x.amount_krw),0);const budget=Number(data.settings.monthly_budget_krw||100000);$('budget-total').textContent=won(budget);$('spent-total').textContent=won(spent);$('remaining').textContent=won(budget-spent);$('remaining').style.color=spent>budget?'var(--bad)':'var(--ok)';$('budget-bar').style.width=Math.min(100,spent/budget*100)+'%';$('budget-bar').style.background=spent>budget?'var(--bad)':'#5f9aff';$('expense-rows').innerHTML=data.expenses.map(x=>\`<tr><td>\${esc(x.paid_on)}</td><td>\${esc(x.label)}</td><td>\${won(x.amount_krw)}</td></tr>\`).join('');$('expense-empty').hidden=data.expenses.length>0;
const paused=data.settings.automation_paused==='true';$('lock-status').textContent=paused?'\uC2E0\uADDC \uBC1C\uD589 \uC7A0\uAE40':'\uC2E0\uADDC \uBC1C\uD589 \uD5C8\uC6A9';$('lock-status').className='tag '+(paused?'warn':'bad');$('toggle-lock').disabled=false;$('toggle-lock').textContent=paused?'\uC548\uC804 \uC7A0\uAE08 \uD574\uC81C':'\uC2E0\uADDC \uBC1C\uD589 \uC7A0\uAE08';}
function showModal(title,html,handler){$('modal-title').textContent=title;$('modal-fields').innerHTML=html;modalAction=handler;$('modal').classList.add('open');}
function closeModal(){$('modal').classList.remove('open');$('form').reset();modalAction=null;}
$('modal-close').onclick=closeModal;$('modal').onclick=e=>{if(e.target===$('modal'))closeModal()};document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
$('form').onsubmit=async e=>{e.preventDefault();if(!modalAction)return;const payload=Object.fromEntries(new FormData($('form')).entries());try{$('modal-submit').disabled=true;await modalAction(payload);closeModal();toast('\uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4');await load(false);}catch(err){toast('\uC624\uB958: '+err.message)}finally{$('modal-submit').disabled=false;}};
document.addEventListener('click',async e=>{const acc=e.target.closest('[data-edit-account]');if(acc){const a=data?.accounts.find(x=>x.id===acc.dataset.editAccount);if(!a)return;const channels=bufferAccounts();showModal(platformNames[a.platform]+' \xB7 \uACC4\uC815 \uD3B8\uC9D1',\`<div class="field"><label>\uC544\uC774\uB514 (\uBE44\uBC00\uBC88\uD638 \uC544\uB2D8)</label><input name="handle" value="\${esc(a.handle)}" maxlength="90"></div><div class="field"><label>Buffer \uCC44\uB110 \uC120\uD0DD</label><select name="buffer_channel_id"><option value="">\uC544\uC9C1 \uC5F0\uB3D9 \uC548 \uB428</option>\${channels.map(c=>\`<option value="\${esc(c.id)}" \${a.buffer_channel_id===c.id?'selected':''}>\${esc(c.displayName||c.name)} \xB7 \${esc(c.service)}</option>\`).join('')}</select></div><div class="field"><label>\uAD00\uB9AC \uBA54\uBAA8</label><textarea name="memo" maxlength="500">\${esc(a.memo)}</textarea></div>\`,p=>request('accounts','PUT',{id:a.id,...p}));return;}
const approve=e.target.closest('[data-approve]');if(approve){if(!confirm('\uC6D0\uCC9C \uC790\uB8CC\uC640 \uCF58\uD150\uCE20\uB97C \uAC80\uC99D\uD558\uACE0 \uC2B9\uC778\uD588\uB098\uC694?'))return;try{await request('approve','POST',{id:approve.dataset.approve});toast('\uC2B9\uC778 \uC644\uB8CC \xB7 \uC544\uC9C1 \uAC8C\uC2DC\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4');await load(false)}catch(x){toast(x.message)}return;}
const queue=e.target.closest('[data-queue]');if(queue){if(!confirm('\uC774 \uCF58\uD150\uCE20\uB97C Buffer \uBC1C\uD589 \uB300\uAE30\uC5F4\uC5D0 \uCD94\uAC00\uD560\uAE4C\uC694? \uC2E4\uC81C \uC608\uC57D \uB4F1\uB85D\uC774 \uC218\uD589\uB429\uB2C8\uB2E4.'))return;try{await request('queue','POST',{id:queue.dataset.queue});toast('Buffer \uC608\uC57D \uB4F1\uB85D \uD655\uC778');await load(true)}catch(x){toast(x.message);await load(false)}return;}
});
$('new-draft').onclick=()=>{if(!data)return toast('\uC11C\uBC84 \uC5F0\uACB0\uC744 \uD655\uC778\uD558\uC138\uC694');const choices=data.accounts.map(a=>\`<option value="\${a.id}">\${esc(brandNames[a.brand]?.split(' / ')[0])} \xB7 \${platformNames[a.platform]}\${a.handle?' @'+esc(a.handle):''}</option>\`).join('');showModal('\uC0C8 \uCF58\uD150\uCE20 \uCD08\uC548',\`<div class="field"><label>\uB300\uC0C1 \uACC4\uC815</label><select name="account_id" required>\${choices}</select></div><div class="field"><label>\uAC8C\uC2DC\uBB3C \uC6D0\uACE0</label><textarea name="body" required maxlength="2200" placeholder="\uC2E4\uC81C \uD655\uC778\uB41C \uC815\uBCF4\uB9CC \uC785\uB825"></textarea></div><div class="field"><label>\uC815\uBCF4 \uCD9C\uCC98 (\uC120\uD0DD)</label><input name="source_url" type="url" placeholder="https://..."></div>\`,p=>request('drafts','POST',p));};
$('new-expense').onclick=()=>{showModal('\uC2E4\uC81C \uACB0\uC81C\uC561 \uAE30\uB85D',\`<div class="field"><label>\uD56D\uBAA9</label><input name="label" required maxlength="100" placeholder="\uC608: Buffer \uC6D4 \uC0AC\uC6A9\uB8CC"></div><div class="formtwo"><div class="field"><label>\uC6D0\uD654 \uACB0\uC81C\uC561</label><input name="amount_krw" type="number" min="1" max="10000000" step="1" required></div><div class="field"><label>\uACB0\uC81C\uC77C</label><input name="paid_on" type="date" required value="\${new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'})}"></div></div>\`,p=>request('expenses','POST',{...p,amount_krw:Number(p.amount_krw)}));};
$('toggle-lock').onclick=async()=>{if(!data)return;const paused=data.settings.automation_paused==='true';if(paused&&!confirm('\uC790\uB3D9\uBC1C\uD589 \uC548\uC804 \uC7A0\uAE08\uC744 \uD574\uC81C\uD560\uAE4C\uC694? \uC774 \uAD00\uC81C\uC13C\uD130\uC5D0\uC11C \uC2B9\uC778\uB41C \uAE00\uC744 Buffer \uC608\uC57D \uB300\uAE30\uC5F4\uC5D0 \uB123\uC744 \uC218 \uC788\uAC8C \uB429\uB2C8\uB2E4.'))return;try{await request('lock','POST',{paused:!paused});toast('\uC2E0\uADDC \uBC1C\uD589 \uC7A0\uAE08 \uC124\uC815 \uBCC0\uACBD');await load(false);}catch(x){toast(x.message)}};
async function load(refresh){if(busy)return;busy=true;$('refresh').disabled=true;try{data=await request('state'+(refresh?'?refresh=1':''));render();}catch(x){$('connection-tag').className='tag bad';$('connection-tag').textContent='\uC11C\uBC84 \uBBF8\uC5F0\uACB0';$('connection-summary').textContent=x.message+' \xB7 \uC11C\uBC84 \uC124\uC815 \uC644\uB8CC \uC804\uC5D0\uB294 \uC2E4\uC2DC\uAC04 \uB370\uC774\uD130\uC640 \uC800\uC7A5 \uAE30\uB2A5\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.';$('sync-time').textContent='\uC2E4\uB370\uC774\uD130 \uC5C6\uC74C';toast('\uC11C\uBC84 \uC5F0\uACB0 \uC624\uB958: '+x.message);}finally{busy=false;$('refresh').disabled=false;}}
$('refresh').onclick=()=>load(true);load(false);setInterval(()=>{if(document.visibilityState==='visible')load(false)},60000);
})();
<\/script></body></html>
`;

// src/worker.mjs
var noStore = { "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-frame-options": "DENY" };
var CSP = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; form-action 'self'";
var response = /* @__PURE__ */ __name((text2, status = 200, contentType = "text/plain; charset=utf-8", sns = false) => new Response(text2, { status, headers: { ...noStore, "content-type": contentType, "content-security-policy": sns ? CSP.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'").replace("style-src 'self'", "style-src 'self' 'unsafe-inline'") : CSP } }), "response");
var json4 = /* @__PURE__ */ __name((data, status = 200) => response(JSON.stringify(data), status, "application/json; charset=utf-8"), "json");
function isAllowedHost(host, env) {
  return host === String(env.ADMIN_HOST || "adminivo.com");
}
__name(isAllowedHost, "isAllowedHost");
function originMatch(req) {
  const o = req.headers.get("origin");
  return o !== null && o === new URL(req.url).origin;
}
__name(originMatch, "originMatch");
async function safeAuth(req, env, webhook = false) {
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD || !env.ADMIN_EMAILS) return false;
  try {
    return await authorize(req, env, webhook);
  } catch {
    return false;
  }
}
__name(safeAuth, "safeAuth");
async function safeReporting(req, env) {
  if (!env.REPORT_DB) return json4({ error: "REPORT_DB database binding not configured" }, 503);
  try {
    return await reporting_worker_default.fetch(req, env);
  } catch (e) {
    return json4({ error: "Reporting database or provider unavailable" }, 503);
  }
}
__name(safeReporting, "safeReporting");
var worker_default = {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), path = url.pathname;
    if (!isAllowedHost(url.hostname, env)) return response("Not found", 404);
    const admin = path === "/next" || path.startsWith("/next/") || path.startsWith("/api/reporting/") || path.startsWith("/api/v2/") || path.startsWith("/api/sns/");
    if (!admin) return response("Not found", 404);
    if (path === "/api/v2/google/connect") {
      if(req.method!=="GET")return json({error:"GET only"},405);
      return googleConnect(req);
    }
    if (path === "/api/v2/google/sync") {
      if(req.method!=="POST")return json({error:"POST only"},405);
      if(req.headers.get("origin")!=="https://adminivo.com")return json({error:"Origin rejected"},403);
      try{return json(await syncGoogleReporting(env,req));}catch{return json({error:"Google reporting unavailable; previous data preserved"},503);}
    }
    if (path === "/api/v2/deployments") return handleDeploymentRequest(req, env);
    const webhook = path === "/api/sns/events" && req.method === "POST";
    if (!await safeAuth(req, env, webhook)) return json4({ error: "Cloudflare Access administrator authentication required" }, 401);
    if (path.startsWith("/api/sns/")) {
      if (!env.SNS_DB) return json4({ error: "SNS_DB missing; no live SNS data" }, 503);
      return sns_worker_default.fetch(req, env);
    }
    if (path.startsWith("/api/reporting/")) return safeReporting(req, env);
    if (path === "/api/v2/registry/audit") {
      if (!env.REPORT_DB) return json4({ error: "REPORT_DB not bound" }, 503);
      const [counts, recent, state, revision] = await Promise.all([
        env.REPORT_DB.prepare(`SELECT COUNT(*) AS services,COUNT(DISTINCT cf_project) AS linkedPagesProjects,
       SUM(CASE WHEN status='deployed_not_listed' THEN 1 ELSE 0 END) AS deployedNotListed,
       SUM(CASE WHEN kind='tool_page' THEN 1 ELSE 0 END) AS internalTools
       FROM services WHERE status != 'verification_archived'`).first(),
        env.REPORT_DB.prepare("SELECT service_id AS serviceId,title,status,last_seen_at AS lastSeenAt FROM services ORDER BY last_seen_at DESC LIMIT 15").all(),
        env.REPORT_DB.prepare("SELECT source,last_check_at AS lastCheckedAt,status,detail FROM report_sync ORDER BY source").all(),
        env.REPORT_DB.prepare("SELECT revision,changed_at AS changedAt FROM registry_revision WHERE id=1").first()
      ]);
      return json4({
        revision: revision?.revision ?? 0,
        counts,
        recent: recent.results ?? [],
        sources: state.results ?? [],
        warning: "A deploy outside the approved release pipeline cannot be guaranteed instantaneous; reconciliation catches listed or recognized Pages projects."
      });
    }
    if (path === "/api/v2/registry/version") {
      if (!env.REPORT_DB) return json4({ error: "REPORT_DB not bound" }, 503);
      const rev = await env.REPORT_DB.prepare("SELECT revision,changed_at AS changedAt FROM registry_revision WHERE id=1").first();
      return json4({ revision: rev?.revision ?? 0, changedAt: rev?.changedAt ?? null, source: "single registry database" });
    }
    if (path === "/api/v2/sync") {
      if (req.method !== "POST") return json4({ error: "Method not allowed" }, 405);
      if (!originMatch(req)) return json4({ error: "Invalid origin" }, 403);
      if (!env.REPORT_DB) return json4({ error: "REPORT_DB not bound" }, 503);
      try {
        const data = await syncRegistry(env);
        return json4(data);
      } catch (e) {
        return json4({ error: "Data sync failed; previous records preserved" }, 503);
      }
    }
    if (req.method !== "GET" && req.method !== "HEAD") return response("Method not allowed", 405);
    const map = /* @__PURE__ */ new Map([
      ["/next/", [STATIC_HTML, "text/html; charset=utf-8"]],
      ["/next/index.html", [STATIC_HTML, "text/html; charset=utf-8"]],
      ["/next/styles.css", [STATIC_CSS, "text/css; charset=utf-8"]],
      ["/next/app.js", [STATIC_JS, "text/javascript; charset=utf-8"]],
      ["/next/seed.js", [STATIC_SEED, "text/javascript; charset=utf-8"]],
      ["/next/sns/", [SNS_HTML, "text/html; charset=utf-8"]],
      ["/next/sns/index.html", [SNS_HTML, "text/html; charset=utf-8"]]
    ]);
    const value = map.get(path === "/next" ? "/next/" : path);
    if (!value) return response("Not found", 404);
    return response(req.method === "HEAD" ? "" : value[0], 200, value[1], path.startsWith("/next/sns/"));
  },
  async scheduled(event, env, ctx) {
    return reporting_worker_default.scheduled(event, env, ctx);
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
