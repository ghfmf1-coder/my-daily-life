"""Mount reviewed, stateless existing tools in the existing Abreda hub.

The route manifest is explicit. No project or DNS creation, no user data migration.
Old projects retain their application and use canonical links to the same content.
"""
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from html import escape, unescape
import json,re,shutil,tempfile
ROOT=Path(__file__).resolve().parents[2]
ROUTES=json.loads((ROOT/'site-factory/ops/domain-routes.json').read_text())['routes']
BY_SLUG={r['slug']:r for r in ROUTES}

def canonical_pair(slug):
    row=BY_SLUG.get(slug)
    return (row['ko_url'],row['en_url']) if row else None

def rewrite_links(text):
    # Longest first: English documents are not children of the Korean tool URL.
    for r in ROUTES:
        text=text.replace(r['old_url']+'en/',r['en_url']).replace(r['old_url'],r['ko_url'])
    return text

def mount_html(text,row,language,config):
    old=row['old_url']+('en/' if language=='en' else '')
    def attr(m):
        name,q,raw=m.groups();value=unescape(raw)
        if not value or value.startswith(('#','data:','mailto:','javascript:')):return m.group(0)
        absolute=urljoin(old,value);p=urlsplit(absolute)
        if p.netloc!=urlsplit(old).netloc:return m.group(0)
        path=p.path
        if path in ('/','/index.html','/ko/','/ko/index.html'):target=row['ko_url']
        elif path in ('/en','/en/','/en/index.html'):target=row['en_url']
        elif path in ('/privacy','/privacy.html','/terms','/terms.html','/contact','/contact/'):
            target='https://abreda.com'+path
        else:target=row['ko_url']+path.lstrip('/')
        if p.query:target+='?'+p.query
        if p.fragment:target+='#'+p.fragment
        return name+'='+q+escape(target,quote=True)+q
    # Only HTML attributes; never rewrite application JavaScript or uploaded data.
    text=re.sub(r'\b(href|src|action)\s*=\s*([\"\'])(.*?)\2',attr,text,flags=re.I)
    text=re.sub(r'<link\b(?=[^>]*\brel=[\"\']canonical[\"\'])[^>]*>','',text,flags=re.I)
    text=re.sub(r'<link\b(?=[^>]*\bhreflang=)[^>]*>','',text,flags=re.I)
    text=re.sub(r'<script\b[^>]*src=[\"\'][^\"\']*toolbox-ga4[.]js[^\"\']*[\"\'][^>]*>\s*</script>','',text,flags=re.I)
    tags='<link rel="canonical" href="'+row[language+'_url']+'">'
    tags+=''.join('<link rel="alternate" hreflang="'+lang+'" href="'+row[lang+'_url']+'">' for lang in ('ko','en'))
    tags+='<link rel="alternate" hreflang="x-default" href="'+row['ko_url']+'">'
    title=re.search(r'<title>(.*?)</title>',text,re.I|re.S).group(1)
    if config.get("ga4_measurement_id") and config.get("ga4_collection_enabled"):
        tags+='<script defer src="/toolbox-ga4.js" data-measurement-id="'+config["ga4_measurement_id"]+'" data-page-title="'+escape(unescape(title),quote=True)+'"></script>'
    if 'toolbox-public-traffic.js' not in text:
        text=text.replace('</body>','<script defer src="https://abreda.com/toolbox-public-traffic.js" data-toolbox-site="tb-'+row['slug']+'"></script></body>')
    return text.replace('</head>',tags+'</head>',1)

def integrate(out,config):
    from factory import prepare
    from bilingual_en import generate_work
    for row in ROUTES:
        slug=row['slug']
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/'public'
            if row['source']=='factory':prepare(slug,source)
            else:
                shutil.copytree(ROOT/'work-sites'/slug/'public',source)
                generate_work(slug,public_root=source)
            ko=out/'tools'/slug;en=out/'en/tools'/slug
            if ko.exists() or en.exists():raise ValueError('Route conflict: '+slug)
            # Preserve the complete source asset tree; no flattened filenames.
            shutil.copytree(source,ko,ignore=shutil.ignore_patterns("*.html", "robots.txt", "sitemap.xml"));en.mkdir(parents=True)
            for language,target in [('ko',ko),('en',en)]:
                original=source/('index.html' if language=='ko' else 'en/index.html')
                (target/'index.html').write_text(mount_html(original.read_text(),row,language,config))
    # Update catalogues, blog tool links, JSON-LD and published navigation together.
    for path in out.rglob('*'):
        if path.is_file() and path.suffix in ('.html','.xml','.json'):
            content=path.read_text();updated=rewrite_links(content)
            if content!=updated:path.write_text(updated)
    sitemap=out/'sitemap.xml';xml=sitemap.read_text()
    urls=[row[lang+'_url'] for row in ROUTES for lang in ('ko','en')]
    additions=''.join('<url><loc>'+u+'</loc></url>\n' for u in urls if '<loc>'+u+'</loc>' not in xml)
    sitemap.write_text(xml.replace('</urlset>',additions+'</urlset>'))
    # Existing Pages project aliases remain accessible. Canonical, not an untested redirect.
