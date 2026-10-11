#!/usr/bin/env python3
"""Bind SEO metadata/sitemap to the actual production URL *after* first deployment."""
from pathlib import Path
from urllib.parse import urlparse
from xml.sax.saxutils import escape
import html,sys
if len(sys.argv)!=2:
    raise SystemExit('Usage: python prepare_seo.py https://YOUR-REAL-DEPLOYMENT-DOMAIN[/optional-prefix]')
base=sys.argv[1].rstrip('/')
u=urlparse(base)
if u.scheme!='https' or not u.hostname or u.query or u.fragment:
    raise SystemExit('Actual HTTPS deployment URL required')
root=Path(__file__).resolve().parent
index=root/'index.html';s=index.read_text()
if '<link rel="canonical"' not in s:
    s=s.replace('<meta name="description"','<link rel="canonical" href="'+html.escape(base+'/')+'">\n<meta property="og:url" content="'+html.escape(base+'/')+'">\n<meta name="description"',1)
else:
    import re
    s=re.sub(r'<link rel="canonical" href="[^"]*">','<link rel="canonical" href="'+html.escape(base+'/')+'">',s)
    s=re.sub(r'<meta property="og:url" content="[^"]*">','<meta property="og:url" content="'+html.escape(base+'/')+'">',s)
index.write_text(s)
entries=['','privacy.html','terms.html']
xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
for item in entries:
    xml+='  <url><loc>'+escape(base+'/'+item)+'</loc></url>\n'
(root/'sitemap.xml').write_text(xml+'</urlset>\n')
(root/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /app/\nSitemap: '+base+'/sitemap.xml\n')
print('Wrote sitemap.xml, robots.txt, canonical and og:url for',base)
