#!/usr/bin/env python3
"""Inspect existing sitemap articles via the authorized Google reporting bridge."""
import json, os, re, urllib.request, urllib.parse, urllib.error, datetime
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET

BRIDGE='https://ytifxhpizractdeytrok.supabase.co/functions/v1/toolbox-google-ads-oauth/reporting-github-data'
SITEMAP='https://abreda.com/sitemap.xml'
OUT=Path('/tmp/abreda-blog-index-audit.json')
def read(req,timeout=100):
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return r.read()
def identity():
    endpoint=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']+'&audience='+urllib.parse.quote('small-toolbox-google-readonly',safe='')
    req=urllib.request.Request(endpoint,headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
    return json.loads(read(req))['value']
def inspect(urls):
    req=urllib.request.Request(BRIDGE,data=json.dumps({'urls':urls,'inspectionOnly':True}).encode(),headers={'Authorization':'Bearer '+identity(),'Content-Type':'application/json'},method='POST')
    return json.loads(read(req,140))
def main():
    xml=read(urllib.request.Request(SITEMAP,headers={'User-Agent':'ABREDA-IndexAudit/1.0'}))
    urls=sorted(set(n.text for n in ET.fromstring(xml).findall('.//{*}loc') if n.text and re.fullmatch(r'https://abreda[.]com/(?:en/)?blog/[a-z0-9-]+/',n.text)))
    if not urls:raise RuntimeError('No live sitemap article URLs')
    report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceCommit':os.getenv('GITHUB_SHA'),'source':SITEMAP,'urls':len(urls),'results':[],'errors':[]}
    for i in range(0,len(urls),12):
        batch=urls[i:i+12]
        try:
            response=inspect(batch)
            if response.get('status')!='ok':raise RuntimeError('Google bridge returned non-ok status')
            rows={r.get('url'):r for r in response.get('sites',[])}
            for u in batch:
                row=rows.get(u,{})
                index=row.get('index')
                if not isinstance(index,dict):index={'status':'unverified'}
                report['results'].append({'url':u,'property':row.get('property'),'ownership':row.get('ownership'),'sitemaps':row.get('sitemaps'),'index':index})
        except Exception as ex:
            report['errors'].append({'urls':batch,'error':type(ex).__name__,'httpStatus':getattr(ex,'code',None)})
        OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2))
    report['coverageStates']=dict(Counter((x['index'].get('coverageState') or x['index'].get('status') or 'unknown') for x in report['results']))
    report['checked']=sum(r['index'].get('status')=='ok' for r in report['results'])
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({'requested':len(urls),'checked':report['checked'],'coverageStates':report['coverageStates'],'failedBatches':len(report['errors'])},ensure_ascii=False))
    if report['checked']!=len(urls):raise RuntimeError('Some URL inspections unavailable; consult artifact')
if __name__=='__main__':main()
