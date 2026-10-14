"""Generate ethical, review-before-posting organic promotion briefs.

Never auto-post to communities, never create keyword-stuffed doorway pages,
never report a search engine submission as indexed/approved.
"""
from __future__ import annotations
import json
from pathlib import Path
from urllib.parse import urlencode
from factory import ROOT, SITES, read_site, site_list

SOURCE = ROOT / "marketing" / "briefs.json"
CHANNEL_IDS = {"showhn", "producthunt", "community", "blog"}
def packet_url(url: str, source: str, slug: str, *, language: str = "ko") -> str:
    from urllib.parse import urlsplit, urlunsplit
    if source not in CHANNEL_IDS: raise ValueError("Unknown promotion channel")
    if language not in ("ko", "en"): raise ValueError("Unknown language")
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.query or parsed.fragment:
        raise ValueError("Valid HTTPS canonical required")
    if language=="en":parsed=parsed._replace(path=parsed.path.rstrip("/")+"/en/")
    params=urlencode({"utm_source":source,"utm_medium":"community" if source in ("showhn","community") else "referral",
                       "utm_campaign":"toolbox_"+slug.replace("-","_")})
    return urlunsplit(parsed._replace(query=params))
def build_packets():
    metadata=json.loads(SOURCE.read_text(encoding="utf-8"))
    briefs=metadata["briefs"]
    channels=metadata["channels"]
    allowed={x["id"] for x in channels}
    packets=[]
    all_slugs=["my-daily-life"]+[s for s in site_list() if s not in ("toolbox-admin","deployment-check")]
    for slug in all_slugs:
        if slug=="my-daily-life":
            url="https://my-daily-life.pages.dev/"
            langs=["ko","en"]
            title="하루한칸 — 루틴·교대근무 관리"
            description="하루 목표·일정·지출 관리"
        else:
            info,_=read_site(slug)
            if not info["approved"]:continue
            url=(info.get("canonical_url") or f"https://{info['project']}.pages.dev")+"/"
            title=info["title"];description=info["description"]
            langs=info.get("locales",["ko"])
        copy=briefs.get(slug,{})
        verified_copy=all(k in copy and isinstance(copy[k],dict) and copy[k].get("copy") and copy[k].get("title") for k in langs)
        selected=copy.get("channels",["community"]) if verified_copy else []
        if not set(selected).issubset(allowed):raise ValueError("Unknown channel in "+slug)
        sharelinks={channel:{lang:packet_url(url,channel,slug,language=lang)
                             for lang in langs} for channel in selected}
        packets.append({
           "slug":slug,"title":title,"description":description,"url":url,
           "langs":langs,"status":"draft-ready" if verified_copy else "needs-editorial-review",
           "copy":{lang:copy[lang] for lang in langs} if verified_copy else {},
           "recommendedChannels":selected,"shareLinks":sharelinks
        })
    return {"schemaVersion":1,"notice":"User must approve and manually publish off-site promotions. No bulk posting.",
            "channels":channels,"sites":packets}
