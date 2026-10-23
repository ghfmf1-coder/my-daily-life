#!/usr/bin/env python3
"""Bing/IndexNow change notification for newly deployed PUBLIC tools only.

Do not ping Google (it does not support IndexNow). Naver supports its official
IndexNow endpoint; receipt does not mean console registration or indexing.
"""
from __future__ import annotations
import json
import os
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from xml.etree import ElementTree as ET

INTERNAL = frozenset(("toolbox-admin", "deployment-check"))
AGENT = "SmallToolbox-IndexNow/1.0 (+https://github.com/ghfmf1-coder/my-daily-life)"

def is_indexable(info: dict) -> bool:
    """Never expose the owner dashboard, demo/smoke sites or unapproved drafts."""
    return bool(info.get("approved") is True and info.get("slug") not in INTERNAL)

def generate_verification(build_dir: Path, info: dict) -> str | None:
    """Generate a fresh unpredictable ownership key per successful deployment."""
    if not is_indexable(info):
        return None
    key = secrets.token_hex(16)
    (build_dir / (key + ".txt")).write_text(key, encoding="utf-8")
    return key

def indexable_urls(build_dir: Path, canonical: str, info: dict) -> list[str]:
    if not is_indexable(info):
        return []
    p = build_dir / "sitemap.xml"
    if not p.exists():
        return []
    root=ET.fromstring(p.read_text(encoding="utf-8"))
    candidates=[tag.text or "" for tag in root.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    urls=[]
    domain=urllib.parse.urlsplit(canonical).hostname
    for raw in candidates:
        parts=urllib.parse.urlsplit(raw)
        if parts.scheme!="https" or parts.hostname!=domain or not raw.startswith(canonical+"/"):
            continue
        if "/admin/" in parts.path or "/app/" in parts.path:
            continue
        if parts.query or parts.fragment:
            continue
        if raw not in urls:
            urls.append(raw)
    return urls[:20]

def ping_indexnow(build_dir: Path, canonical: str, info: dict, key: str | None, *, request=None, attempts=3, provider='indexnow') -> dict:
    urls=indexable_urls(build_dir,canonical,info)
    if not key or not urls:
        return {"status":"skipped","reason":"No indexable public URL", "count":0}
    host=urllib.parse.urlsplit(canonical).hostname
    if not host:
        return {"status":"skipped","reason":"Missing HTTPS host","count":0}
    key_location=canonical+"/"+key+".txt"
    endpoints={"indexnow":"https://api.indexnow.org/indexnow","naver":"https://searchadvisor.naver.com/indexnow"}
    if provider not in endpoints:raise ValueError("Unsupported IndexNow provider")
    request_url=endpoints[provider]
    payload=json.dumps({"host":host,"key":key,"keyLocation":key_location,"urlList":urls},separators=(",",":")).encode("utf-8")
    sender=request or urllib.request.urlopen
    req=urllib.request.Request(request_url,data=payload,headers={
        "Content-Type":"application/json; charset=utf-8","User-Agent":AGENT},method="POST")
    err=None
    for i in range(attempts):
        try:
            with sender(req,timeout=12) as resp:
                code=resp.status
                if code in (200,202):
                    return {"status":"received","http":code,"count":len(urls),"host":host,"provider":provider,"keyValidation":"pending" if code==202 else "accepted","indexing":"unknown"}
                err=f"IndexNow HTTP {code}"
        except (urllib.error.URLError,TimeoutError,OSError) as exc:
            err=type(exc).__name__ + ": " + str(exc)[:130]
        if i + 1 < attempts:
            time.sleep((i+1)*2)
    return {"status":"not_confirmed","reason":err,"count":len(urls),"host":host}
