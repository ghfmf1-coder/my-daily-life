// Small Toolbox browser pageview collector; no IP addresses, cookies or fingerprint persisted.
const ORIGINS: Record<string, string[]> = {
  'catalog-toolbox-hub': ['https://abreda.com','https://www.abreda.com','https://tb-toolbox-hub.pages.dev'],
  'toolbox-csv-merge-studio': ['https://csv.abreda.com','https://tb-csv-merge-studio.pages.dev'],
  'toolbox-novel-planner': ['https://novel.abreda.com','https://tb-novel-planner.pages.dev'],
  'toolbox-manuscript-lens': ['https://manuscript.abreda.com','https://tb-manuscript-lens.pages.dev'],
  '3b329586-c3fd-45ce-8a29-2f976e96f45c': [
    'https://my-daily-life.pages.dev','https://ghfmf1-coder.github.io'
  ],
};
const reject = (status: number, msg: string) =>
  new Response(JSON.stringify({error:msg}), {status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async (req:Request) => {
  if(req.method!=='POST' && req.method!=='OPTIONS') return reject(405,'method_not_allowed');
  const origin=req.headers.get('origin')||'';
  const sites=Object.entries(ORIGINS).filter(([,hosts])=>hosts.includes(origin));
  if(!sites.length) return reject(403,'origin_not_allowed');
  const cors={
    'Access-Control-Allow-Origin':origin,
    'Vary':'Origin',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
    'Access-Control-Max-Age':'3600',
    'Cache-Control':'no-store'
  };
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  const reply=(status:number,obj:object)=>new Response(JSON.stringify(obj),{status,headers:{...cors,'Content-Type':'application/json'}});
  const ua=(req.headers.get('user-agent')||'').slice(0,300);
  const knownBot=/bot|spider|crawler/i.test(ua);
  const automation=/headless|lighthouse|curl|wget|python|httpclient|postman|monitor|uptime|preview|selenium|playwright|puppeteer/i.test(ua);
  const browserUA=/Mozilla\/5\.0.*(Chrome|Firefox|Safari|Edg|OPR)/i.test(ua);
  const fetchMode=req.headers.get('sec-fetch-mode')||'';
  const category=knownBot?'bot':automation?'automated':browserUA && fetchMode==='cors'?'likely_human':'unknown';
  if(Number(req.headers.get('content-length')||0)>1200) return reply(413,{error:'too_large'});
  let body:Record<string,unknown>;
  try { body=JSON.parse((await req.text()).slice(0,1201)); } catch {return reply(400,{error:'invalid_json'});}
  const siteId=typeof body.siteId==='string'?body.siteId:'';
  const eventId=typeof body.eventId==='string'?body.eventId:'';
  if(!sites.some(([id])=>id===siteId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)
     || typeof body.isVisit!=='boolean') return reply(400,{error:'invalid_event'});
  if(body.dryRun===true)return reply(202,{accepted:false,diagnostic:true,category});
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key) return reply(503,{error:'collector_not_configured'});
  try {
    const upstream=await fetch(url+'/rest/v1/rpc/record_toolbox_traffic',{
      method:'POST',
      headers:{'Authorization':'Bearer '+key,'apikey':key,'Content-Type':'application/json'},
      body:JSON.stringify({p_event_id:eventId,p_site_id:siteId,p_is_visit:body.isVisit})
    });
    if(!upstream.ok){console.error('Tracking database RPC status',upstream.status);return reply(503,{error:'storage_error'});}
    const classified=await fetch(url+'/rest/v1/rpc/record_toolbox_traffic_classified',{
      method:'POST',headers:{'Authorization':'Bearer '+key,'apikey':key,'Content-Type':'application/json'},
      body:JSON.stringify({p_event_id:eventId,p_site_id:siteId,p_category:category,p_is_visit:body.isVisit})
    });
    if(!classified.ok){console.error('Classification RPC status',classified.status);return reply(503,{error:'classification_storage_error'});}
    return reply(202,{accepted:true});
  } catch(error) {console.error('Tracking request failed');return reply(503,{error:'storage_unavailable'});}
});
