#!/usr/bin/env python3
"""List changed approved sites for a GitHub Actions matrix (no shell eval)."""
import argparse
import json
import subprocess
from factory import site_list, read_site, SiteError

p = argparse.ArgumentParser()
p.add_argument('--site', default='')
p.add_argument('--before', default='')
p.add_argument('--after', default='HEAD')
a=p.parse_args()
all_sites=site_list()
if a.site:
    selected=all_sites if a.site=='all' else [a.site]
    if a.site!='all' and a.site not in all_sites:
        raise SystemExit('Site does not exist: '+a.site)
else:
    # All-zero git before SHA is the first commit of an empty repo.
    if not a.before or set(a.before)=={'0'}:
        changed=subprocess.check_output(['git','ls-files'],text=True).splitlines()
    else:
        changed=subprocess.check_output(['git','diff','--name-only',a.before,a.after],text=True).splitlines()
    # A shared factory change intentionally redeploys every approved site, repairing any missed per-site pushes.
    # Reconciliation run after traffic dashboard integration: republish approved builds once.
    # A reviewed blog rollout only needs the public hub. Do not redeploy every
    # existing Pages project because the shared factory gains a blog renderer.
    blog_release_paths={'site-factory/scripts/factory.py','site-factory/scripts/targets.py',
                        'site-factory/scripts/blog_articles.py','site-factory/scripts/new_site.py',
                        '.github/workflows/toolbox-pages.yml','.github/workflows/abreda-blog-validation.yml',
                        '.github/workflows/abreda-blog-browser.yml'}
    blog_release=(
        'site-factory/scripts/blog_articles.py' in changed and
        all(n in blog_release_paths or n.startswith('site-factory/content/blog/') or
            n.startswith('site-factory/sites/toolbox-hub/public/') or
            n.startswith('site-factory/tests/test_blog_articles.py') or
            n.startswith('site-factory/tests/blog-browser.mjs') for n in changed)
    )
    shared=not blog_release and any(n.startswith('site-factory/scripts/') or n=='.github/workflows/toolbox-pages.yml' for n in changed)
    new_blog=any(n.startswith('site-factory/content/blog/') or n.startswith('work-sites/') and n.endswith('/blog.json') for n in changed)
    selected=['toolbox-hub'] if blog_release else all_sites if shared else sorted(set(p.split('/')[2] for p in changed if p.startswith('site-factory/sites/') and len(p.split('/'))>=4))
    if new_blog and 'toolbox-hub' in all_sites:
        selected=sorted(set(selected+['toolbox-hub']))
# Redeploy the live directory whenever another approved public tool changes.
# Do not cause a loop for automated admin maintenance-report refreshes.
if 'toolbox-hub' in all_sites and any(s not in {'toolbox-hub','toolbox-admin','deployment-check'} for s in selected):
    selected=sorted(set(selected+['toolbox-hub']))
# auto-deploy toolbox-admin catalog after any public site source change
if 'toolbox-admin' in all_sites and selected and 'toolbox-admin' not in selected and not (locals().get('blog_release',False) or (locals().get('new_blog',False) and selected==['toolbox-hub'])):
    selected=sorted(set(selected+['toolbox-admin']))
approved=[]
for slug in selected:
    try:
        d,_ = read_site(slug)
        if d.get('deploy_mode')=='hub_only':
            print('SERVED_BY_HUB='+slug)
            continue
        if d['approved']:
            approved.append(slug)
        else:
            print('SKIPPED_UNAPPROVED='+slug)
    except SiteError as ex:
        # Newly deleted sites don't require a deploy; invalid existing sites must fail safely.
        if slug not in all_sites: continue
        raise SystemExit(str(ex))
approved.sort(key=lambda slug: (0 if slug=='toolbox-hub' else 1 if slug=='toolbox-admin' else 2,slug))
print('MATRIX='+json.dumps(approved,separators=(',',':')))