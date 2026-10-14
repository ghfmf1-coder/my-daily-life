#!/usr/bin/env python3
"""Read-only Cloudflare Pages root deployment diagnostic; never print credentials."""
import json,os,sys,urllib.request
account=os.getenv("CLOUDFLARE_ACCOUNT_ID");token=os.getenv("CLOUDFLARE_API_TOKEN")
if not account or not token:
    print("Root production diagnostic: Cloudflare secrets unavailable")
    sys.exit(0)
url=f"https://api.cloudflare.com/client/v4/accounts/{account}/pages/projects/my-daily-life"
req=urllib.request.Request(url,headers={"Authorization":"Bearer "+token,"Accept":"application/json"})
try:
    with urllib.request.urlopen(req,timeout=20) as response:
        body=json.load(response)
    if not body.get("success"): raise ValueError("Cloudflare response success=false")
    d=body.get("result") or {}
    src=d.get("source") or {}
    deployment=d.get("latest_deployment") or d.get("canonical_deployment") or {}
    print("Root Pages project:",d.get("name"))
    print("Root Pages production branch:",d.get("production_branch"))
    print("Root Pages source type:",src.get("type","unset"))
    config=src.get("config") or {}
    print("Root Pages Git link:",{"owner":config.get("owner"),"repo_name":config.get("repo_name"),"production_branch":config.get("production_branch")})
    print("Root Pages build configuration:",{k:d.get("build_config",{}).get(k) for k in ("build_command","destination_dir","root_dir")})
    print("Root Pages latest deployment:",{k:deployment.get(k) for k in ("id","url","created_on","modified_on","environment","latest_stage")})
except Exception as ex:
    print("Root deployment diagnostic unavailable:",str(ex)[:200])
