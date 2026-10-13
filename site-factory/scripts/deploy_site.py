#!/usr/bin/env python3
"""Idempotently create a Cloudflare Pages project and deploy an approved site."""
from __future__ import annotations
import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from factory import ROOT, SiteError, prepare

class CFError(Exception):
    pass

def request(method: str, path: str, data=None):
    account = os.environ['CLOUDFLARE_ACCOUNT_ID']
    token = os.environ['CLOUDFLARE_API_TOKEN']
    url=f'https://api.cloudflare.com/client/v4/accounts/{account}{path}'
    payload=json.dumps(data).encode('utf-8') if data is not None else None
    req=urllib.request.Request(url,data=payload,method=method,headers={
        'Authorization': 'Bearer '+token,
        'Content-Type':'application/json',
        'Accept':'application/json',
        'User-Agent':'small-toolbox-factory/1.0',
    })
    try:
        with urllib.request.urlopen(req,timeout=25) as response:
            body=json.loads(response.read())
            if not body.get('success'):
                raise CFError(f'{method} {path}: Cloudflare response failure: {body.get("errors")}')
            return response.status,body.get('result')
    except urllib.error.HTTPError as exc:
        raw=exc.read().decode('utf-8','replace')[:1500]
        if exc.code==404:
            return 404,None
        raise CFError(f'{method} {path}: HTTP {exc.code}: {raw}') from None

def ensure_project(project: str):
    code,result=request('GET',f'/pages/projects/{project}')
    if code==404:
        _,result=request('POST','/pages/projects',{'name':project,'production_branch':'main'})
        print(f'CREATED_PROJECT: {project}')
    else:
        print(f'EXISTING_PROJECT: {project}')
        # Never deploy to an existing project from another Git integration.
        if result and (result.get('source') or {}).get('type')=='github':
            raise CFError(f'{project} appears to use Git integration; choose a new tb-* project name')
    return result

def attach_domain(project: str, domain: str):
    code,result=request('GET',f'/pages/projects/{project}/domains/{domain}')
    if code==404:
        _,result=request('POST',f'/pages/projects/{project}/domains',{'name':domain})
        print(f'DOMAIN_ADDED: {domain}; DNS verification may still be pending.')
    else:
        print(f'DOMAIN_EXISTING: {domain}; status={result.get("status")}')

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--site',required=True)
    p.add_argument('--attach-domain',action='store_true')
    p.add_argument('--dry-run',action='store_true')
    args=p.parse_args()
    out=ROOT/'.build'/args.site
    data,canonical=prepare(args.site,out)
    print(f'VALIDATED: {args.site}; canonical={canonical}; project={data["project"]}')
    if args.dry_run:
        print(f'DRY_RUN: build generated in {out}')
        return
    for env in ('CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN'):
        if not os.environ.get(env):
            raise SystemExit('Missing GitHub Actions secret: '+env)
    ensure_project(data['project'])
    # Never pass secrets as positional arguments; Wrangler reads env vars.
    cmd=['npx','--no-install','wrangler','pages','deploy',str(out),
         '--project-name',data['project'],'--branch','main']
    if sha:=os.environ.get('GITHUB_SHA'):
        cmd += ['--commit-hash',sha]
    subprocess.run(cmd,check=True,cwd=ROOT)
    print(f'PUBLISHED: https://{data["project"]}.pages.dev')
    if args.attach_domain:
        if not data.get('domain'):
            raise SystemExit('Cannot attach: site.json domain not set')
        attach_domain(data['project'],data['domain'])
    step_summary=os.environ.get('GITHUB_STEP_SUMMARY')
    if step_summary:
        with open(step_summary,'a',encoding='utf-8') as f:
            f.write(f'### {data["title"]}\n- Pages: https://{data["project"]}.pages.dev\n- 배포: 성공 (GitHub Actions)\n- 도메인 연결: {"요청됨(검증 대기 가능)" if args.attach_domain else "요청 안 함"}\n')

if __name__=='__main__':
    try: main()
    except (SiteError,CFError) as exc:
        sys.exit(str(exc))