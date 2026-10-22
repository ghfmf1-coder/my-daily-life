#!/usr/bin/env python3
"""Reconcile Google ownership and sitemaps using GitHub identity; never export OAuth credentials."""
import concurrent.futures, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT=Path.cwd()
BRIDGE='https://ytifxhpizractdeytrok.supabase.co/functions/v1/toolbox-google-ads-oauth/reporting-github-setup'
def http(url,token,body=None,timeout=30):
    req=urllib.request.Request(url,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','User-Agent':'Toolbox-Google-Setup'},method='GET' if body is None else 'POST')
    try:
        with urllib.request.urlopen(req,timeout=timeout) as response:return json.load(response)
    except urllib.error.HTTPError as error:raise RuntimeError('API_HTTP_'+str(error.code)) from None
def identity():
    url=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']+'&audience=small-toolbox-google-setup'
    result=http(url,os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN'])
    if not result.get('value'):raise RuntimeError('GITHUB_IDENTITY_MISSING')
    return result['value']
def bridge(action,urls):
    output=[]
    for offset in range(0,len(urls),80):
        data=http(BRIDGE,identity(),{'action':action,'urls':urls[offset:offset+80]},timeout=140)
        if not isinstance(data.get('rows'),list):raise RuntimeError('INVALID_BRIDGE_RESULT')
        output.extend(data['rows'])
    return output
def emit(stage,row):
    safe={k:v for k,v in row.items() if k!='verificationContent'}
    print('GOOGLE_SETUP_'+stage+':',json.dumps(safe,ensure_ascii=True),flush=True)
def ledger():
    base='https://api.cloudflare.com/client/v4/accounts/'+os.environ['CLOUDFLARE_ACCOUNT_ID']+'/d1/database'
    token=os.environ['CLOUDFLARE_D1_READ_TOKEN']
    dbs=http(base,token)
    if not dbs.get('success'):raise RuntimeError('D1_LIST_REJECTED')
    database=next((d for d in dbs.get('result',[]) if d['name']=='tb-admin-reporting'),None)
    if not database:raise RuntimeError('REPORTING_DATABASE_NOT_FOUND')
    data=http(base+'/'+database['uuid']+'/query',token,{'sql':"SELECT canonical_url,cf_project FROM services WHERE status != 'verification_archived'"})
    if not data.get('success'):raise RuntimeError('D1_QUERY_REJECTED')
    entries={}
    for row in data['result'][0].get('results',[]):
        u=urllib.parse.urlsplit(row['canonical_url'])
        host=u.hostname or ''
        if u.scheme!='https' or u.username or u.password or u.query or u.fragment:continue
        if not (host=='abreda.com' or host.endswith('.abreda.com') or re.fullmatch(r'(tb-[a-z0-9-]+|my-daily-life)\.pages\.dev',host)):continue
        root=urllib.parse.urlunsplit(('https',u.netloc,'/','',''))
        entries.setdefault(root,row.get('cf_project'))
    return entries
def source(project):
    if project=='my-daily-life':return ROOT
    for manifest in (ROOT/'site-factory/sites').glob('*/site.json'):
        metadata=json.loads(manifest.read_text())
        if metadata.get('project')==project and metadata.get('approved') is True:return manifest.parent/'public'
    if isinstance(project,str) and re.fullmatch(r'tb-[a-z0-9-]+',project):
        folder=ROOT/'work-sites'/project.removeprefix('tb-')/'public'
        if (folder/'index.html').is_file():return folder
    raise RuntimeError('APPROVED_SOURCE_MAPPING_MISSING')
def git(*args):return subprocess.run(['git',*args],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True).stdout.strip()
def persist(paths):
    if not paths:return
    git('config','user.name','github-actions[bot]')
    git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
    git('add','--',*[str(path.relative_to(ROOT)) for path in paths])
    if not subprocess.run(['git','diff','--cached','--quiet']).returncode:return
    git('commit','-m','chore(seo): preserve public Google ownership verification tags [skip ci]')
    for attempt in range(3):
        try:
            git('pull','--rebase','origin','main');git('push','origin','HEAD:main')
            return
        except subprocess.CalledProcessError:
            if attempt==2:raise RuntimeError('VERIFICATION_SOURCE_PUSH_FAILED') from None
            time.sleep(2)
def deploy(item):
    url,project,folder,content=item
    stage=None
    try:
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Toolbox-Verification'}),timeout=15) as response:
                live=response.read(1500000).decode('utf-8','replace')
            if 'content="'+content+'"' in live or "content='"+content+"'" in live:return {'url':url,'status':'verification_tag_live'}
        except (urllib.error.URLError,TimeoutError):pass
        if folder==ROOT:
            stage=Path(tempfile.mkdtemp(prefix='toolbox-root-'))
            for name in git('ls-files').splitlines():
                origin=ROOT/name
                if not origin.is_file() or origin.is_symlink():continue
                target=stage/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(origin,target)
            folder=stage
        env={**os.environ,'CLOUDFLARE_API_TOKEN':os.environ['CLOUDFLARE_PAGES_DEPLOY_TOKEN']}
        result=subprocess.run(['npx','--no-install','wrangler','pages','deploy',str(folder),'--project-name',project,'--branch','main','--commit-hash',git('rev-parse','HEAD'),'--commit-dirty=true'],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=300)
        if result.returncode:return {'url':url,'status':'deployment_failed'}
        for attempt in range(6):
            try:
                with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Toolbox-Verification'}),timeout=20) as response:
                    html=response.read(1500000).decode('utf-8','replace')
                if 'content="'+content+'"' in html or "content='"+content+"'" in html:return {'url':url,'status':'verification_tag_live'}
            except (urllib.error.URLError,TimeoutError):pass
            time.sleep(3)
        return {'url':url,'status':'verification_tag_not_live'}
    except (RuntimeError,subprocess.SubprocessError,OSError):return {'url':url,'status':'deployment_failed'}
    finally:
        if stage:shutil.rmtree(stage,ignore_errors=True)
def sitemap_valid(url):
    try:
        target=urllib.parse.urljoin(url,'sitemap.xml')
        with urllib.request.urlopen(urllib.request.Request(target,headers={'User-Agent':'Toolbox-Sitemap-Validation'}),timeout=20) as response:
            root=ET.fromstring(response.read(2000000))
        return root.tag.split('}')[-1] in ('urlset','sitemapindex') and any(node.tag.split('}')[-1]=='loc' and node.text for node in root.iter())
    except (urllib.error.URLError,TimeoutError,ET.ParseError):return False
def main():
    entries=ledger();urls=sorted(entries)
    tokens=bridge('tokens',urls)
    changed=[];deployments=[];failures=[]
    for row in tokens:
        emit('TOKEN',row)
        if row['status']=='already_accessible':continue
        if row['status']!='verification_tag_ready':failures.append(row);continue
        try:
            content=row['verificationContent']
            if not re.fullmatch(r'[A-Za-z0-9_-]+',content):raise RuntimeError('INVALID_PUBLIC_VERIFICATION_TAG')
            folder=source(entries[row['url']]);path=folder/'index.html';html=path.read_text(encoding='utf-8')
            tag='<meta name="google-site-verification" content="'+content+'">'
            if content not in html:
                if not re.search(r'</head\s*>',html,re.I):raise RuntimeError('HTML_HEAD_MISSING')
                html=re.sub(r'</head\s*>',tag+'\n</head>',html,count=1,flags=re.I)
                path.write_text(html,encoding='utf-8');changed.append(path)
            deployments.append((row['url'],entries[row['url']],folder,content))
        except (RuntimeError,OSError):
            failure={'url':row['url'],'status':'source_mapping_or_html_failed'};emit('SOURCE',failure);failures.append(failure)
    persist(changed)
    deployed=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for row in pool.map(deploy,deployments):
            emit('DEPLOY',row)
            if row['status']=='verification_tag_live':deployed.append(row['url'])
            else:failures.append(row)
    verified=[]
    for index,url in enumerate(deployed):
        if index:time.sleep(4)
        results=bridge('verify',[url])
        if any(row.get('httpStatus')==429 for row in results):
            print('GOOGLE_SETUP_RATE_LIMIT_BACKOFF: waiting before one retry',flush=True)
            time.sleep(20)
            results=bridge('verify',[url])
        for row in results:
            verified.append(row);emit('VERIFY',row)
            if row['status'] not in ('verified_and_property_added','already_accessible'):failures.append(row)
        if any(row.get('httpStatus')==429 for row in results):
            for pending_url in deployed[index+1:]:
                row={'url':pending_url,'status':'deferred_after_provider_quota'}
                verified.append(row);failures.append(row);emit('VERIFY',row)
            break
    ready=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for url,valid in zip(urls,pool.map(sitemap_valid,urls)):
            if valid:ready.append(url)
            else:
                failure={'url':url,'status':'live_sitemap_missing_or_invalid'};emit('SITEMAP',failure);failures.append(failure)
    submitted=bridge('sitemaps',ready)
    for row in submitted:
        emit('SITEMAP',row)
        if row['status'] not in ('submitted','already_submitted'):failures.append(row)
    report={'sourceCommit':git('rev-parse','HEAD'),'roots':len(urls),'verificationResults':verified,'sitemapResults':submitted,'failures':failures,'indexing':'NOT_GUARANTEED_BY_VERIFICATION_OR_SITEMAP_SUBMISSION'}
    Path('/tmp/toolbox-google-setup-result.json').write_text(json.dumps(report,ensure_ascii=True,indent=2))
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as summary:
        summary.write('## Google search setup\n\n'+f"Site roots: {len(urls)}; attention items: {len(failures)}.\n\nOwnership and sitemap submission do not guarantee indexing.\n")
    print('GOOGLE_SETUP_ATTENTION_COUNT:',len(failures))
    if failures:raise SystemExit('GOOGLE_SETUP_NEEDS_ATTENTION')
if __name__=='__main__':main()
