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
    shared=any(n.startswith('site-factory/scripts/') or n=='.github/workflows/toolbox-pages.yml' for n in changed)
    selected=all_sites if shared else sorted(set(p.split('/')[2] for p in changed if p.startswith('site-factory/sites/') and len(p.split('/'))>=4))
# auto-deploy toolbox-admin catalog after any public site source change
if 'toolbox-admin' in all_sites and selected and 'toolbox-admin' not in selected:
    selected=sorted(set(selected+['toolbox-admin']))
approved=[]
for slug in selected:
    try:
        d,_ = read_site(slug)
        if d['approved']:
            approved.append(slug)
        else:
            print('SKIPPED_UNAPPROVED='+slug)
    except SiteError as ex:
        # Newly deleted sites don't require a deploy; invalid existing sites must fail safely.
        if slug not in all_sites: continue
        raise SystemExit(str(ex))
print('MATRIX='+json.dumps(approved,separators=(',',':')))