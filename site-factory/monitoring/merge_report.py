#!/usr/bin/env python3
"""Consolidate live/Chromium/source checks into public safe maintenance metadata."""
from __future__ import annotations
import argparse
import datetime as dt
import json
from pathlib import Path
def load(path):
    try: return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError,ValueError): return None
def assemble(live, browser, source_ok=True):
    issues=[]
    records=(live or {}).get("sites",[])
    for site in records:
        for label in site.get("failures",[]):
            issues.append({"scope":site.get("slug","unknown"),"details":str(label)[:250]})
    tests=(browser or {}).get("checks",[])
    for check in tests:
        if check.get("status") == "fail":
            issues.append({"scope":"browser:"+str(check.get("name","test"))[:80],
                           "details":str(check.get("detail","failed"))[:250]})
    if not source_ok:
        issues.append({"scope":"source","details":"Repository unit/regression checks failed."})
    if live is None:issues.append({"scope":"monitor","details":"Could not produce a live site report."})
    if browser is None:issues.append({"scope":"browser","details":"Could not produce a browser smoke report."})
    summary={"sites":len(records),"sitePassed":sum(x.get("status")=="pass" for x in records),
             "siteWarnings":sum(x.get("status")=="warning" for x in records),
             "siteFailed":sum(x.get("status")=="fail" for x in records),
             "browserPassed":sum(x.get("status")=="pass" for x in tests),
             "browserFailed":sum(x.get("status")=="fail" for x in tests),
             "sourceTestsPassed":bool(source_ok),"issues":len(issues)}
    status="fail" if issues else "warning" if summary["siteWarnings"] else "pass"
    return {"schemaVersion":1,"checkedAt":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "status":status,"summary":summary,"sites":records,"browserChecks":tests,
            "issues":issues[:100],"scope":"Factory registry + Haruhankan; private manual-only records excluded",
            "definitions":{"pass":"Checks passed (not a guarantee of no defects)",
             "warning":"Non-critical issue or missing optional asset",
             "fail":"Checks detected actionable failures"}}
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--live",required=True);p.add_argument("--browser",required=True)
    p.add_argument("--output",required=True);p.add_argument("--source-ok",default="1")
    args=p.parse_args()
    report=assemble(load(args.live),load(args.browser),args.source_ok=="1")
    dest=Path(args.output);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("SUMMARY",report["status"],report["summary"])
    for issue in report["issues"][:12]:print("ISSUE",issue["scope"],issue["details"])
    return 0 if report["status"]!="fail" else 1
if __name__=="__main__":
    raise SystemExit(main())
