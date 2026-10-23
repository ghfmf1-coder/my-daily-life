#!/usr/bin/env python3
"""Public Naver discovery; receipt is not console registration or indexing."""
import concurrent.futures,hashlib,json,os,re,shutil,subprocess,tempfile,time,urllib.error,urllib.parse,urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime,timezone
from google_search_setup import ROOT,ledger,source,git,persist,http
from factory import prepare
STATE=ROOT/'site-factory/ops/naver-public-sites.json'
RESULT=ROOT/'site-factory/ops/naver-search-result.json'
AGENT='SmallToolbox-Naver-Discovery/1.0'
def public_text(url,limit=2000000):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':AGENT}),timeout=25) as r:return r.read(limit).decode('utf-8','replace')
def key_for(url):
    # Public file proof, never an account authentication credential.
    return hashlib.sha256(('ghfmf1-coder/my-daily-life:indexnow:v1:'+url).encode()).hexdigest()[:32]
def urls_from_xml(xml,root):
    tree=ET.fromstring(xml)
    if tree.tag.split('}')[-1]!='urlset':raise ValueError('EXPECTED_URLSET')
    base=urllib.parse.urlsplit(root);urls=[]
    for loc in tree.iter():
        if loc.tag.split('}')[-1]!='loc':continue
        raw=(loc.text or '').strip();u=urllib.parse.urlsplit(raw)
        if u.scheme!='https' or u.netloc!=base.netloc or u.username or u.password or u.query or u.fragment:continue
        if re.search(r'/(admin|app|api)(/|$)',u.path):continue
        if raw not in urls:urls.append(raw)
    if not urls:raise ValueError('NO_PUBLIC_SITEMAP_URLS')
    return urls[:10000]
def live_ready(url,row):
    try:
        html=public_text(url);proof=row.get('verificationContent')
        if proof and not re.search(r'<meta\b[^>]*name=["\']naver-site-verification["\'][^>]*content=["\']'+re.escape(proof)+r'["\']',html,re.I):return False
        key=row['indexNowKey']
        return public_text(url+key+'.txt',200).strip()==key
    except (OSError,ValueError):return False
def publish(item):
    url,project,folder,row=item
    if live_ready(url,row):return {'url':url,'publication':'live'}
    stage=Path(tempfile.mkdtemp(prefix='toolbox-naver-'))
    try:
        if folder==ROOT:
            for name in git('ls-files').splitlines():
                origin=ROOT/name
                if not origin.is_file() or origin.is_symlink():continue
                target=stage/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(origin,target)
        elif folder.parent.parent==ROOT/'site-factory/sites':prepare(folder.parent.name,stage)
        else:shutil.copytree(folder,stage,dirs_exist_ok=True)
        env={**os.environ,'CLOUDFLARE_API_TOKEN':os.environ['CLOUDFLARE_PAGES_DEPLOY_TOKEN']}
        p=subprocess.run(['npx','--no-install','wrangler','pages','deploy',str(stage),'--project-name',project,'--branch','main','--commit-hash',git('rev-parse','HEAD'),'--commit-dirty=true'],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=300)
        if p.returncode:return {'url':url,'publication':'deployment_failed'}
        for attempt in range(6):
            if live_ready(url,row):return {'url':url,'publication':'live'}
            time.sleep(3)
        return {'url':url,'publication':'live_proof_not_confirmed'}
    except (OSError,subprocess.SubprocessError):return {'url':url,'publication':'deployment_failed'}
    finally:shutil.rmtree(stage,ignore_errors=True)
def notify(url,row):
    result={'url':url,'consoleStatus':row.get('consoleStatus','not_registered'),'sitemapSubmission':row.get('sitemapStatus','not_submitted'),'indexing':'unknown'}
    try:
        urls=urls_from_xml(public_text(url+'sitemap.xml'),url);result['sitemapFile']='valid'
        robots=public_text(url+'robots.txt',200000)
        result['robotsSitemap']='present' if url+'sitemap.xml' in robots else 'missing'
        key=row['indexNowKey']
        if public_text(url+key+'.txt',200).strip()!=key:raise ValueError('LIVE_KEY_MISMATCH')
        digest=hashlib.sha256('\n'.join(sorted(urls)).encode()).hexdigest();previous=row.get('lastIndexNow',{})
        if previous.get('digest')==digest and previous.get('http') in (200,202) and time.time()-float(previous.get('time',0))<7*86400:
            result['indexNow']={'status':'previous_receipt','http':previous['http'],'at':previous.get('at'),'count':len(urls)};return result
        payload={'host':urllib.parse.urlsplit(url).hostname,'key':key,'keyLocation':url+key+'.txt','urlList':urls}
        if len(urls)==1:
            target='https://searchadvisor.naver.com/indexnow?'+urllib.parse.urlencode({'url':urls[0],'key':key})
            req=urllib.request.Request(target,headers={'User-Agent':AGENT},method='GET')
        else:
            req=urllib.request.Request('https://searchadvisor.naver.com/indexnow',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json; charset=utf-8','User-Agent':AGENT},method='POST')
        try:
            with urllib.request.urlopen(req,timeout=30) as r:code=r.status
        except urllib.error.HTTPError as e:
            code=e.code
            raw=e.read(4000).decode('utf-8','replace')
            try:
                body=json.loads(raw)
                # Allow only short public provider diagnostics, never request payloads.
                msg=str(body.get('message') or body.get('error') or '')
                result['providerMessage']=re.sub(r'https?://\S+|[a-f0-9]{24,}', '[redacted]',msg)[:180]
            except (ValueError,AttributeError):result['providerMessage']='non_json_error'
        result['indexNow']={'status':'received' if code==200 else 'key_validation_pending' if code==202 else 'not_confirmed','http':code,'count':len(urls)}
        if code in (200,202):row['lastIndexNow']={'digest':digest,'http':code,'time':time.time(),'at':datetime.now(timezone.utc).isoformat()}
    except (OSError,ValueError,ET.ParseError) as e:
        result['error']=type(e).__name__;result.setdefault('indexNow',{'status':'not_confirmed'})
    return result
def main():
    if json.loads((ROOT/'site-factory/ops/search-setup-request.json').read_text()).get('paused') is not False:raise SystemExit('OWNER_PAUSED')
    entries=ledger()
    # Resolve aliases from actual Pages custom-domain assignments before selecting source.
    base='https://api.cloudflare.com/client/v4/accounts/'+os.environ['CLOUDFLARE_ACCOUNT_ID']+'/pages/projects'
    aliases={}
    for page in range(1,101):
        inventory=http(base+'?per_page=100&page='+str(page),os.environ['CLOUDFLARE_PAGES_DEPLOY_TOKEN'])
        if not inventory.get('success'):raise SystemExit('PAGES_ALIAS_INVENTORY_FAILED')
        batch=inventory.get('result',[])
        for project in batch:
            for domain in project.get('domains',[]):aliases[domain]=project['name']
        if len(batch)<100:break
    for url in entries:
        host=urllib.parse.urlsplit(url).hostname
        if host in aliases and entries[url]!=aliases[host]:
            print('NAVER_PROJECT_ALIAS:',json.dumps({'url':url,'ledgerProject':entries[url],'servingProject':aliases[host]}))
            entries[url]=aliases[host]
    state=json.loads(STATE.read_text()) if STATE.exists() else {'sites':{}}
    sites=state['sites'];changed=[];jobs=[];results=[]
    for url,project in sorted(entries.items()):
        row=sites.setdefault(url,{'consoleStatus':'not_registered','sitemapStatus':'not_submitted'})
        try:
            folder=source(project);path=folder/'index.html';html=path.read_text();proof=row.get('verificationContent')
            if proof:
                if not re.fullmatch(r'[a-f0-9]{40}',proof):raise ValueError('INVALID_PUBLIC_PROOF')
                if proof not in html:
                    if not re.search(r'</head\s*>',html,re.I):raise ValueError('HTML_HEAD_MISSING')
                    path.write_text(re.sub(r'</head\s*>','<meta name="naver-site-verification" content="'+proof+'">\n</head>',html,count=1,flags=re.I));changed.append(path)
            row['indexNowKey']=key_for(url);keypath=folder/(row['indexNowKey']+'.txt')
            if not keypath.exists() or keypath.read_text()!=row['indexNowKey']:keypath.write_text(row['indexNowKey']);changed.append(keypath)
            robots=folder/'robots.txt';text=robots.read_text() if robots.exists() else 'User-agent: *\nAllow: /\n'
            line='Sitemap: '+url+'sitemap.xml'
            if line not in text:robots.write_text(text.rstrip()+'\n'+line+'\n');changed.append(robots)
            jobs.append((url,project,folder,row))
        except (OSError,ValueError,RuntimeError):results.append({'url':url,'publication':'source_preparation_failed','indexing':'unknown'})
    STATE.write_text(json.dumps(state,indent=2,sort_keys=True)+'\n');changed.append(STATE);persist(changed)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for outcome in pool.map(publish,jobs):
            url=outcome['url']
            outcome.update({'consoleStatus':sites[url].get('consoleStatus','not_registered'),'sitemapSubmission':sites[url].get('sitemapStatus','not_submitted'),'indexing':'unknown'})
            if outcome['publication']=='live':outcome.update(notify(url,sites[url]))
            results.append(outcome);print('NAVER_SEARCH_RESULT:',json.dumps(outcome),flush=True)
    report={'checkedAt':datetime.now(timezone.utc).isoformat(),'sourceCommit':git('rev-parse','HEAD'),'roots':len(entries),'sites':results,'limitations':['IndexNow is not Search Advisor console registration or sitemap submission.','No indexing guarantee.','No private login session is stored.']}
    STATE.write_text(json.dumps(state,indent=2,sort_keys=True)+'\n');RESULT.write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
    Path('/tmp/toolbox-naver-search-result.json').write_text(json.dumps(report,indent=2));persist([STATE,RESULT])
    failed=[r for r in results if r.get('publication')!='live' or r.get('error') or r.get('indexNow',{}).get('status') not in ('received','key_validation_pending','previous_receipt')]
    pending=[r['url'] for r in results if r.get('consoleStatus')!='verified' or r.get('sitemapSubmission')!='submitted']
    print('NAVER_TECHNICAL_FAILURE_COUNT:',len(failed));print('NAVER_CONSOLE_PENDING_URLS:',json.dumps(pending))
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as summary:summary.write(f'## Naver public discovery\n\nRoots: {len(entries)}; technical failures: {len(failed)}; console ownership/submission pending: {len(pending)}.\n\nReceipt does not guarantee indexing or console registration.\n')
    if failed:raise SystemExit('NAVER_DISCOVERY_NEEDS_ATTENTION')
if __name__=='__main__':main()
