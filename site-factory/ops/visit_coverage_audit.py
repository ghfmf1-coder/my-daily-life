#!/usr/bin/env python3
"""Read production HTML and dry-run collectors; never create test visitor events."""
import concurrent.futures,json,urllib.request,urllib.parse,urllib.error,re,uuid
from html.parser import HTMLParser
class LanguageLinks(HTMLParser):
 def __init__(self):super().__init__();self.english=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='link' and a.get('hreflang')=='en' and a.get('rel')=='alternate':self.english=a.get('href')
from pathlib import Path
MANIFEST=Path('site-factory/ops/visit-sites.json')
AGENT='Toolbox-Operational-Audit curl'
def request(url,method='GET',body=None,headers=None):
 h={'User-Agent':AGENT,**(headers or {})}
 data=None if body is None else json.dumps(body).encode()
 req=urllib.request.Request(url,data=data,headers=h,method=method)
 with urllib.request.urlopen(req,timeout=25) as r:return r.status,r.read(1800000).decode('utf-8','replace')
def check(site):
 url=site['url'];sid=site['siteId'];row={'url':url,'siteId':sid}
 try:
  _,html=request(url)
  row['tracking']=bool(re.search(r'<script[^>]+data-toolbox-site=["\']'+re.escape(sid)+r'["\']',html))
  if not row['tracking']:raise ValueError('TRACKING_TAG_MISSING')
  scripts=re.findall(r'<script[^>]*src=["\']([^"\']+)["\'][^>]*data-toolbox-site=["\']'+re.escape(sid),html)
  if not scripts:raise ValueError('TRACKING_SCRIPT_NOT_RESOLVED')
  script=urllib.parse.urljoin(url,scripts[0]);_,code=request(script)
  collector=site.get('collector','toolbox-public-visit')
  row['scriptAvailable']=collector in code
  if not row['scriptAvailable']:raise ValueError('COLLECTOR_ENDPOINT_MISMATCH')
  origin=urllib.parse.urlunsplit((*urllib.parse.urlsplit(url)[:2],'','',''))
  status,response=request('https://ytifxhpizractdeytrok.supabase.co/functions/v1/'+collector,'POST',{'siteId':sid,'eventId':str(uuid.uuid4()),'isVisit':False,'dryRun':True},{'Origin':origin,'Content-Type':'text/plain'})
  reply=json.loads(response);row['collectorDiagnostic']=status==202 and reply.get('diagnostic') is True and reply.get('accepted') is False
  if not row['collectorDiagnostic']:raise ValueError('NO_WRITE_DIAGNOSTIC_UNCONFIRMED')
  row['english']='not_present'
  links=LanguageLinks();links.feed(html)
  if links.english:
   english_url=urllib.parse.urljoin(url,links.english)
   if urllib.parse.urlsplit(english_url).netloc!=urllib.parse.urlsplit(url).netloc:raise ValueError('UNAPPROVED_ENGLISH_HOST')
   _,english=request(english_url);row['english']='tracking_present' if 'data-toolbox-site="'+sid+'"' in english else 'tracking_missing'
   if row['english']=='tracking_missing':raise ValueError('ENGLISH_TRACKING_MISSING')
  row['status']='ok'
 except Exception as e:row['status']='error';row['reason']=str(e)[:120]
 return row
def main():
 sites=json.loads(MANIFEST.read_text())['sites']
 snapshot=Path('/tmp/toolbox-performance-source.json')
 if snapshot.exists():
  known={s['url'] for s in sites}
  for entry in json.loads(snapshot.read_text())['entries']:
   if entry['url'] in known:continue
   _,html=request(entry['url']);found=re.search(r'data-toolbox-site=["\']([^"\']+)',html)
   if not found:raise ValueError('LEDGER_TRACKING_MISSING: '+entry['url'])
   sites.append({'siteId':found.group(1),'url':entry['url'],'collector':'toolbox-visit-collector'})
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:rows=list(pool.map(check,sites))
 for row in rows:print('VISIT_COVERAGE:',json.dumps(row))
 report={'source':'production HTML and no-write diagnostic requests','sites':rows,'failed':[r['url'] for r in rows if r['status']!='ok']}
 Path('/tmp/toolbox-visit-coverage.json').write_text(json.dumps(report,indent=2))
 if report['failed']:raise SystemExit('VISIT_COVERAGE_INCOMPLETE')
 print('VISIT_COVERAGE_COMPLETE:',len(rows))
if __name__=='__main__':main()
