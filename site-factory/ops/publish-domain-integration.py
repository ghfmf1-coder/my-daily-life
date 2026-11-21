"""Publish only existing projects after build/browser gates; never mutate DNS."""
import argparse,json,sys,subprocess,tempfile,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'site-factory/scripts'))
from hub_domains import ROUTES
from factory import prepare
from deploy_site import request
from bilingual_en import generate_work
p=argparse.ArgumentParser();p.add_argument('target');args=p.parse_args()
if args.target in ('toolbox-hub','toolbox-admin'):
 rows=[{'slug':args.target,'source':'factory','project':'tb-'+args.target}]
else:rows=[r for r in ROUTES if r['slug']==args.target]
if not rows:raise SystemExit('Unregistered migration target')
for row in rows:
 status,data=request('GET','/pages/projects/'+row['project'])
 if status!=200 or data['name']!=row['project']:raise SystemExit('Existing project not verified')
 with tempfile.TemporaryDirectory() as temp:
  out=Path(temp)/'public'
  if row['source']=='factory':prepare(row['slug'],out)
  else:
   shutil.copytree(ROOT/'work-sites'/row['slug']/'public',out);generate_work(row['slug'],public_root=out)
  import os
  subprocess.run(['npx','--no-install','wrangler','pages','deploy',str(out),'--project-name',row['project'],'--branch','main','--commit-hash',os.environ['GITHUB_SHA']],check=True)
 print('EXISTING_PROJECT_PUBLISHED',row['project'])
