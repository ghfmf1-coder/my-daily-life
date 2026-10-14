#!/usr/bin/env python3
"""Create a UNAPPROVED starter site in the shared factory repo."""
import argparse
import json
from html import escape
from factory import SITES, SiteError, validate_name
from branding import render_icon

parser = argparse.ArgumentParser()
parser.add_argument('slug')
parser.add_argument('title')
parser.add_argument('description')
a = parser.parse_args()
validate_name(a.slug)
site = SITES / a.slug
if site.exists():
    raise SystemExit(f'Site already exists: {a.slug}')
if len(a.title.strip()) < 3 or len(a.description.strip()) < 3:
    raise SystemExit('Title and description are required')
(site / 'public').mkdir(parents=True)
info = dict(slug=a.slug, project='tb-'+a.slug, title=a.title, description=a.description, approved=False, domain=None, canonical_url=None)
(site / 'site.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(site / 'public' / 'index.html').write_text(f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="{escape(a.description,quote=True)}"><title>{escape(a.title)}</title>
<link rel="icon" type="image/svg+xml" sizes="any" href="./favicon.svg">
<style>body{{font-family:system-ui,sans-serif;max-width:760px;margin:3rem auto;padding:1rem;line-height:1.6}}</style></head>
<body><main><h1>{escape(a.title)}</h1><p>FACTORY_STARTER_DO_NOT_PUBLISH</p></main></body></html>
''',encoding='utf-8')
(site / 'public' / 'favicon.svg').write_text(render_icon(a.title,a.slug),encoding='utf-8')
print(f'Created {site}. Replace starter text, test the tool, then set approved=true ONLY after user approval.')