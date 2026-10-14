#!/usr/bin/env python3
"""Bind public SEO metadata to the actual deployment base URL, preserving locales."""
from __future__ import annotations
from pathlib import Path
from urllib.parse import urlparse
from xml.sax.saxutils import escape
import html
import re
import sys

if len(sys.argv)!=2:
    raise SystemExit('Usage: python prepare_seo.py https://YOUR-REAL-DEPLOYMENT-DOMAIN[/optional-prefix]')
base=sys.argv[1].rstrip('/')
u=urlparse(base)
if u.scheme!='https' or not u.hostname or u.query or u.fragment:
    raise SystemExit('Actual HTTPS deployment URL required')
root=Path(__file__).resolve().parent
def update_head(path:Path, page_url:str):
    text=path.read_text(encoding='utf-8')
    target=html.escape(page_url,quote=True)
    if re.search(r'<link rel="canonical" href="[^"]*">',text):
        text=re.sub(r'<link rel="canonical" href="[^"]*">','<link rel="canonical" href="'+target+'">',text)
    else:
        text=text.replace('</head>','<link rel="canonical" href="'+target+'">\n</head>',1)
    if re.search(r'<meta property="og:url" content="[^"]*">',text):
        text=re.sub(r'<meta property="og:url" content="[^"]*">','<meta property="og:url" content="'+target+'">',text)
    else:
        text=text.replace('</head>','<meta property="og:url" content="'+target+'">\n</head>',1)
    if (root/'en/index.html').exists():
        for language,path_url in [('ko',base+'/'),('en',base+'/en/'),('x-default',base+'/')]:
            url=html.escape(path_url,quote=True)
            pattern=r'(<link rel="alternate" hreflang="'+re.escape(language)+r'" href=")[^"]*(")'
            replace=lambda m:m.group(1)+url+m.group(2)
            if re.search(pattern,text):
                text=re.sub(pattern,replace,text)
            else:
                text=text.replace('</head>','<link rel="alternate" hreflang="'+language+'" href="'+url+'">\n</head>',1)
    path.write_text(text,encoding='utf-8')

update_head(root/'index.html',base+'/')
has_en=(root/'en/index.html').exists()
if has_en:update_head(root/'en/index.html',base+'/en/')
entries=['']+(['en/'] if has_en else [])+['privacy.html','terms.html']
xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
xml+=''.join('  <url><loc>'+escape(base+'/'+item)+'</loc></url>\n' for item in entries)
(root/'sitemap.xml').write_text(xml+'</urlset>\n',encoding='utf-8')
robots='User-agent: *\nAllow: /\nDisallow: /app/\n'
if has_en:robots+='Disallow: /en/app/\n'
robots+='Sitemap: '+base+'/sitemap.xml\n'
(root/'robots.txt').write_text(robots,encoding='utf-8')
print('Prepared deployment SEO URLs including English locale:',base,'/en/ enabled:',has_en)
