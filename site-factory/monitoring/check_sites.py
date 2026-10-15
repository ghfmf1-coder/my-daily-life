#!/usr/bin/env python3
"""Public, read-only maintenance checks of the Small Toolbox fleet.

Runs in GitHub Actions without login tokens, cookies or private user data.
The authoritative roster is the site factory registry plus Haruhankan.
Admin-only items saved privately in a browser are intentionally NOT fetched.
"""
from __future__ import annotations
import argparse
import datetime as dt
import html.parser
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "site-factory" / "scripts"))
from factory import read_site, site_list  # noqa: E402

USER_AGENT = "SmallToolbox-Maintenance/1.0 (+https://github.com/ghfmf1-coder/my-daily-life)"
MAX_BYTES = 1_800_000
TIMEOUT = 13
ALLOWED_HOSTS = {"my-daily-life.pages.dev"}
SITEMAP_NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}

class SiteHTML(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = ""
        self.title = ""
        self.in_title = False
        self.meta = {}
        self.links = []
        self.scripts = []
        self.ids = set()
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "html": self.lang = attrs.get("lang", "")
        if tag == "title": self.in_title = True
        if attrs.get("id"): self.ids.add(attrs["id"])
        if tag == "meta":
            key = (attrs.get("name") or attrs.get("property") or "").lower()
            self.meta[key] = attrs.get("content", "")
        if tag == "link": self.links.append(attrs)
        if tag == "script" and attrs.get("src"): self.scripts.append(attrs["src"])
    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
    def handle_data(self, text):
        if self.in_title: self.title += text
    def alternate(self, lang):
        return next((a.get("href", "") for a in self.links if a.get("rel") == "alternate" and a.get("hreflang") == lang), "")
    def canonical(self):
        return next((a.get("href", "") for a in self.links if a.get("rel") == "canonical"), "")

def roster():
    sites = [{"slug": "my-daily-life", "name": "하루한칸", "origin": "https://my-daily-life.pages.dev",
              "locales": ["ko", "en"], "internal": False, "independent": True}]
    for slug in site_list():
        info, _ = read_site(slug)
        if not info.get("approved"): continue
        url = (info.get("canonical_url") or f"https://{info['project']}.pages.dev").rstrip("/")
        host = urllib.parse.urlparse(url).hostname
        if host not in ALLOWED_HOSTS and host != f"{info['project']}.pages.dev" and host != info.get("domain"):
            raise ValueError("Unapproved monitored host: " + str(host))
        sites.append({"slug": slug, "name": info["title"], "origin": url,
                      "locales": info.get("locales", ["ko"]),
                      "internal": slug in ("toolbox-admin", "deployment-check"), "independent": False})
    return sites

def fetch(url, max_bytes=MAX_BYTES):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT,
      "Accept": "text/html,application/xml,application/json,image/*,*/*;q=0.8"})
    start = time.monotonic()
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
                status = response.status
                location = response.geturl()
                content_type = response.headers.get("Content-Type", "").lower()
                data = response.read(max_bytes + 1)
                if len(data) > max_bytes: raise ValueError("Response larger than monitoring limit")
                if urllib.parse.urlparse(location).scheme != "https":
                    raise ValueError("Unexpected non-HTTPS redirect")
                return {"status": status, "url": location, "content_type": content_type,
                        "body": data, "elapsed_ms": round((time.monotonic()-start)*1000)}
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            last = error
            if attempt < 2: time.sleep(1.2 * (attempt + 1))
    raise RuntimeError("HTTP fetch failed after 3 attempts: " + str(last))

def create_site_record(site):
    return {"slug": site["slug"], "name": site["name"], "url": site["origin"] + "/",
            "type": "internal" if site["internal"] else "public",
            "status": "pass", "checks": [], "warnings": [], "failures": []}

def record(result, name, okay, detail, *, warn=False):
    state = "pass" if okay else ("warning" if warn else "fail")
    line = {"check": name, "status": state, "detail": str(detail)[:230]}
    result["checks"].append(line)
    if not okay:
        (result["warnings"] if warn else result["failures"]).append(f"{name}: {str(detail)[:180]}")
        if not warn: result["status"] = "fail"
        elif result["status"] == "pass": result["status"] = "warning"

def safe_page(site, result, path, *, lang="ko", indexable=True):
    origin = site["origin"]
    address = origin + path
    try:
        response = fetch(address)
        record(result, "page_" + (lang if indexable else path.strip("/").replace("/", "_") or "internal"),
               response["status"] == 200 and "text/html" in response["content_type"],
               f"HTTP {response['status']}, {response['elapsed_ms']}ms, {response['content_type']}")
        if response["status"] != 200 or "text/html" not in response["content_type"]: return None
        text = response["body"].decode("utf-8", "replace")
        parser = SiteHTML()
        parser.feed(text)
        record(result, "title_" + lang, len(parser.title.strip()) >= 8, parser.title[:125])
        record(result, "meta_description_" + lang, len(parser.meta.get("description", "").strip()) >= (45 if indexable else 10),
               parser.meta.get("description", "")[:110])
        record(result, "html_lang_" + lang, parser.lang == lang, "expected " + lang + "; got " + parser.lang)
        robots = parser.meta.get("robots", "").lower()
        record(result, "index_directive_" + lang,
               "noindex" not in robots if indexable else "noindex" in robots,
               robots or "(meta robots unspecified)")
        if indexable:
            record(result, "canonical_" + lang, parser.canonical().rstrip("/") == address.rstrip("/"),
                   parser.canonical() or "missing canonical")
            if "en" in site["locales"]:
                for code, link in (("ko", origin + "/"), ("en", origin + "/en/")):
                    record(result, "hreflang_" + lang + "_" + code, parser.alternate(code) == link,
                           parser.alternate(code) or "missing")
        return parser
    except Exception as ex:
        record(result, "page_" + lang, False, str(ex))
        return None

def check_file(site, result, path, *, kind, necessary=True):
    address = site["origin"] + path
    try:
        response = fetch(address, max_bytes=500_000 if kind in ("icon", "text") else MAX_BYTES)
        body = response["body"]
        if kind == "icon":
            okay = response["status"] == 200 and len(body) > 32 and body[:4] == bytes((0,0,1,0))
        elif kind == "svg":
            okay = response["status"] == 200 and b"<svg" in body[:300]
        elif kind == "script":
            okay = response["status"] == 200 and (b"function" in body or b"const " in body or b"(()=>{" in body or b"'use strict'" in body or b"window." in body or b"Object.freeze" in body)
        elif kind == "sitemap":
            okay = response["status"] == 200 and b"<urlset" in body
        else:
            okay = response["status"] == 200
        record(result, kind + "_" + path.strip("/").replace("/", "_"), okay,
               "HTTP " + str(response["status"]) + ", " + str(len(body)) + " bytes",warn=not necessary)
        return response if okay else None
    except Exception as ex:
        record(result, kind + "_" + path.strip("/").replace("/", "_"), False, str(ex),warn=not necessary)
        return None

def is_access_challenge(response):
    """A verified Cloudflare Access login page is the healthy public boundary.

    Do not fetch or crawl an owner-only site behind its Access challenge.
    """
    if response.get("status") != 200 or "text/html" not in response.get("content_type",""):
        return False
    body=response.get("body",b"").decode("utf-8","replace")
    return ("Cloudflare Access" in body or "cloudflareaccess.com" in body) and (
        "Log in" in body or "Sign in" in body or "cloudflareaccess.com" in body)

def check_site(site):
    result = create_site_record(site)
    origin = site["origin"]
    # The admin console may now be guarded by Cloudflare Access even at pages.dev.
    # Report that the login boundary works rather than treating private routes as broken.
    if site["slug"] == "toolbox-admin":
        try:
            challenge=fetch(origin+"/")
            if is_access_challenge(challenge):
                record(result,"admin_access_protection",True,"Cloudflare Access login challenge")
                return result
        except (RuntimeError, ValueError):
            pass
    is_internal = site["internal"]
    locales = site["locales"]
    root = safe_page(site,result,"/",lang="ko",indexable=not is_internal)
    english = None
    if "en" in locales and not is_internal:
        english = safe_page(site,result,"/en/",lang="en",indexable=True)
    ico = check_file(site,result,"/favicon.ico",kind="icon")
    svg = check_file(site,result,"/icon.svg" if site["slug"] == "my-daily-life" else "/favicon.svg",kind="svg",necessary=False)
    robots = check_file(site,result,"/robots.txt",kind="text")
    if robots:
        text = robots["body"].decode("utf-8","replace")
        disallow = any(line.strip().lower().replace(" ","") == "disallow:/" for line in text.splitlines())
        record(result,"robots_publicity", disallow if is_internal else not disallow,
               "noindex internal" if disallow else "crawlable public")
    sitemap = check_file(site,result,"/sitemap.xml",kind="sitemap")
    if sitemap:
        try:
            doc=ET.fromstring(sitemap["body"])
            urls=[tag.text or "" for tag in doc.findall(".//s:loc",SITEMAP_NS)]
            targets=[] if is_internal else [origin+"/"]+([origin+"/en/"] if "en" in locales else [])
            record(result,"sitemap_content",all(x in urls for x in targets) and
                   (not is_internal or not urls), "entries: "+str(len(urls)))
        except ET.ParseError as ex:
            record(result,"sitemap_xml",False,str(ex))
    if root:
        for item in root.scripts[:12]:
            target=urllib.parse.urljoin(origin+"/",item)
            if urllib.parse.urlparse(target).hostname == urllib.parse.urlparse(origin).hostname:
                check_file(site,result,urllib.parse.urlparse(target).path,kind="script")
    if english:
        for item in english.scripts[:12]:
            target=urllib.parse.urljoin(origin+"/en/",item)
            if urllib.parse.urlparse(target).hostname == urllib.parse.urlparse(origin).hostname:
                check_file(site,result,urllib.parse.urlparse(target).path,kind="script")
    if site["slug"] == "toolbox-hub":
        # Metricool can consume these public RSS feeds for owner-authorized autolists.
        for feed_path in ("/feed.xml", "/en/feed.xml"):
            rss=check_file(site,result,feed_path,kind="text")
            if not rss:continue
            try:
                data=ET.fromstring(rss["body"])
                entries=data.findall("./channel/item")
                links=[(x.findtext("link") or "") for x in entries]
                record(result,"rss_"+feed_path.strip("/").replace("/","_"),
                       data.tag=="rss" and data.attrib.get("version")=="2.0"
                       and bool(entries) and all(x.startswith("https://") for x in links)
                       and len(links)==len(set(links))
                       and not any("toolbox-admin" in x or "deployment-check" in x for x in links),
                       str(len(entries))+" valid RSS entries")
            except ET.ParseError as ex:
                record(result,"rss_xml",False,str(ex))
    if site["slug"] == "my-daily-life":
        safe_page(site,result,"/app/",lang="ko",indexable=False)
        safe_page(site,result,"/en/app/",lang="en",indexable=False)
    if site["slug"] == "toolbox-admin":
        if root:
            record(result, "admin_login_gate", "adminGate" in root.ids and
                   "adminLoginForm" in root.ids, "login gate present" if "adminGate" in root.ids else "login gate missing")
        for asset in ("/auth.js", "/admin-config.js", "/sites-catalog.json"):
            check_file(site,result,asset,kind="text")
    return result

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    names=roster()
    results=[check_site(site) for site in names]
    summary={"passed":sum(r["status"]=="pass" for r in results),
             "warnings":sum(r["status"]=="warning" for r in results),
             "failed":sum(r["status"]=="fail" for r in results),
             "total":len(results)}
    report={"schemaVersion":1,"checkedAt":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "source":"GitHub Actions live site read-only checks",
            "summary":summary,"sites":results}
    pathlib.Path(args.output).parent.mkdir(parents=True,exist_ok=True)
    pathlib.Path(args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Live maintenance: {summary['passed']} passed, {summary['warnings']} warnings, {summary['failed']} failed")
    for r in results:
        print("  ",r["slug"],r["status"],",".join(r["failures"][:3]))
    return 1 if summary["failed"] else 0

if __name__=="__main__":
    sys.exit(main())
