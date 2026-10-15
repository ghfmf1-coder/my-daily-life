"""Generate RSS 2.0 new-tool announcements from *approved* real toolbox sites.

The feed is meant for opt-in subscribers and Metricool's RSS Autolist.
Item URLs/GUIDs remain stable across deploys; feed rendering never posts to social APIs.
"""
from __future__ import annotations
from email.utils import format_datetime
from datetime import datetime
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

RSS_ROOT="https://tb-toolbox-hub.pages.dev"
def generate_feed(packets: dict, lang: str="ko") -> bytes:
    if lang not in ("ko","en"): raise ValueError("Unsupported feed language")
    root=ET.Element("rss",{"version":"2.0"})
    channel=ET.SubElement(root,"channel")
    def text(tag,value,parent=channel):
        element=ET.SubElement(parent,tag)
        element.text=str(value)
        return element
    text("title","작은 도구함 — 새 웹 도구" if lang=="ko" else "Small Toolbox — New Web Tools")
    text("link",RSS_ROOT+("/" if lang=="ko" else "/en/"))
    text("description",("무료 웹 도구의 새 출시 정보와 사용법을 알립니다." if lang=="ko" else
        "Occasional announcements of genuinely usable browser tools."))
    text("language",lang)
    text("generator","Small Toolbox site factory")
    for item in packets.get("sites",[]):
        slug=item.get("slug","")
        if slug in {"toolbox-hub","toolbox-admin","deployment-check"}: continue
        if lang not in item.get("langs",[]) or not item.get("url"): continue
        parsed=urlparse(item["url"])
        if parsed.scheme!="https" or not parsed.hostname or parsed.query or parsed.fragment:
            continue
        link=item["url"] if lang=="ko" else item["url"].rstrip("/")+"/en/"
        summary=item.get("copy",{}).get(lang,{})
        title=" ".join(str(summary.get("title") or item.get("title") or slug).split())[:75]
        description=" ".join(str(summary.get("copy") or item.get("description") or title).split())
        # Metricool maps RSS entries to social posts. Leave room for the canonical
        # link, markup and client-added whitespace under Bluesky's 300-char limit.
        # RSS is for *announcements*, not the full product description.
        max_description=max(0,min(120,275-len(title)-len(link)-8))
        description=description[:max_description].rstrip()
        if max_description and len(description)<len(str(summary.get("copy") or item.get("description") or title)):
            description=description.rstrip(" .,;") + "…"
        entry=ET.SubElement(channel,"item")
        text("title",title,entry)
        text("description",description,entry)
        text("link",link,entry)
        text("guid",link,entry).set("isPermaLink","true")
        # Only include factual first-published dates explicitly maintained for the site.
        if published:=item.get("published_at"):
            try:
                date=datetime.fromisoformat(published.replace("Z","+00:00"))
                if date.tzinfo:
                    text("pubDate",format_datetime(date),entry)
            except ValueError:
                pass
    ET.indent(root,space="  ")
    return ET.tostring(root,encoding="utf-8",xml_declaration=True)
