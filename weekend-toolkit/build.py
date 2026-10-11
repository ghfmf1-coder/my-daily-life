#!/usr/bin/env python3
"""Zero-dependency static site generator for a growing collection of browser tools."""
from __future__ import annotations

import html
import json
import os
import re
import shutil
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).parent.resolve()
DIST = ROOT / 'dist'
APP_ROOT = ROOT / 'apps'
H = lambda x: html.escape(str(x), quote=True)
SLUG = re.compile(r'^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$')
ID = re.compile(r'^ca-pub-\d{16}$')


def read_json(path: Path):
    with path.open(encoding='utf-8') as f:
        return json.load(f)


def metadata():
    cfg = read_json(ROOT / 'site.json')
    raw = os.environ.get('SITE_URL', cfg.get('site_url', '')).strip().rstrip('/')
    if raw:
        u = urlsplit(raw)
        if u.scheme != 'https' or not u.netloc or u.path not in ('', '/') or u.query or u.fragment or u.username:
            raise ValueError('site_url must be an HTTPS origin, e.g. https://tools.example.com (no /path)')
        cfg['site_url'] = raw
    else:
        cfg['site_url'] = ''
    pub = cfg.get('adsense_publisher_id', '').strip()
    if pub and not ID.fullmatch(pub):
        raise ValueError('adsense_publisher_id must look like ca-pub- followed by 16 digits')
    if cfg.get('ads_enabled') and not pub:
        raise ValueError('ads_enabled is true but adsense_publisher_id is empty')
    for key in ('google_verification', 'naver_verification'):
        if cfg.get(key) and not re.fullmatch(r'[a-zA-Z0-9_-]{8,160}', str(cfg[key])):
            raise ValueError(f'{key} has invalid characters')
    return cfg


def tools_list():
    found=[]
    for folder in sorted(APP_ROOT.iterdir()):
        if not folder.is_dir():
            continue
        if not SLUG.fullmatch(folder.name):
            raise ValueError(f'Invalid app slug {folder.name}')
        if not (folder/'app.json').exists():
            continue
        app=read_json(folder/'app.json')
        for field in ('title', 'description', 'category', 'icon', 'intro'):
            if not isinstance(app.get(field), str) or not app[field].strip():
                raise ValueError(f'{folder.name}: missing {field}')
        if not isinstance(app.get('keywords'), list) or not isinstance(app.get('how_to'), list) or not isinstance(app.get('faq'), list):
            raise ValueError(f'{folder.name}: keywords/how_to/faq should be lists')
        if not (folder/'widget.html').exists():
            raise ValueError(f'{folder.name}: widget.html missing')
        if not (folder/'widget.js').exists():
            raise ValueError(f'{folder.name}: widget.js missing')
        app['slug']=folder.name
        found.append(app)
    return found


def url(cfg, path=''):
    return cfg['site_url'] + '/' + path.lstrip('/') if cfg['site_url'] else ''


def head(cfg, title, desc, path='', keywords=(), script=''):
    canonical=url(cfg,path)
    result=['<!doctype html>','<html lang="ko"><head>','<meta charset="utf-8">','<meta name="viewport" content="width=device-width,initial-scale=1">',
            f'<title>{H(title)}</title>',f'<meta name="description" content="{H(desc)}">',
            '<meta name="theme-color" content="#f8fafc">','<meta name="robots" content="index,follow">',
            '<meta property="og:type" content="website">',f'<meta property="og:site_name" content="{H(cfg["site_name"])}">',
            f'<meta property="og:title" content="{H(title)}">',f'<meta property="og:description" content="{H(desc)}">',
            '<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">',
            '<link rel="stylesheet" href="/assets/site.css">']
    if canonical:
        result.extend([f'<link rel="canonical" href="{H(canonical)}">',f'<meta property="og:url" content="{H(canonical)}">'])
    if keywords:
        result.append(f'<meta name="keywords" content="{H(", ".join(keywords))}">')
    for name, key in (('google-site-verification','google_verification'),('naver-site-verification','naver_verification')):
        if cfg.get(key):result.append(f'<meta name="{name}" content="{H(cfg[key])}">')
    if cfg.get('ads_enabled'):
        pub=cfg['adsense_publisher_id']
        result.append(f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={pub}" crossorigin="anonymous"></script>')
        result.append(f'<meta name="google-adsense-account" content="{pub}">')
    if script:result.append(f'<script src="{H(script)}" defer></script>')
    return '\n'.join(result)+'\n</head><body>\n'


def header(cfg):
    return f'''<a class="skip" href="#main">본문으로 이동</a>
<header class="site-header"><div class="wrap header-inner"><a class="brand" href="/"><span class="brand-mark">✦</span>{H(cfg['site_name'])}</a>
<nav class="top-nav" aria-label="주요 메뉴"><a href="/#tools">전체 도구</a><a href="/about/">소개</a></nav></div></header>
<main id="main">'''


def footer(cfg):
    return f'''</main><footer class="site-footer"><div class="wrap footer-inner"><span>© {date.today().year} {H(cfg['site_name'])}</span>
<nav class="footer-links" aria-label="안내"><a href="/about/">사이트 소개</a><a href="/privacy/">개인정보 안내</a><a href="/terms/">이용 안내</a></nav></div></footer>
</body></html>'''


def write(path, content):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(content,encoding='utf-8')


def rich(data):
    return '<script type="application/ld+json">'+json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+'</script>'


def home(cfg, apps):
    cards=''.join(f'''<a class="tool-card" href="/tools/{H(a['slug'])}/" data-filter="{H(' '.join([a['title'],a['category'],a['description'],*a['keywords']]))}">
<span class="tool-icon" aria-hidden="true">{H(a['icon'])}</span><h3>{H(a['title'])}</h3><p>{H(a['description'])}</p><span class="chip">{H(a['category'])}</span></a>''' for a in apps)
    body=f'''<section class="hero"><p class="eyebrow">FREE ONLINE TOOLS</p><h1>필요할 때 바로 쓰는<br>작고 편리한 도구들</h1>
<p class="lead">{H(cfg['site_description'])}</p><div class="search"><label class="label" for="tool-search">도구 검색</label><input id="tool-search" type="search" placeholder="예: 글자 수, 퍼센트" autocomplete="off"></div></section>
<section id="tools"><div class="section-head"><h2>전체 도구 <small class="muted">{len(apps)}개</small></h2><span class="muted">무료 · 회원가입 없이 사용</span></div><div class="card-grid" id="tool-grid">{cards}<p id="search-empty" class="empty" hidden>검색 결과가 없습니다.</p></div></section>'''
    doc=head(cfg,f"{cfg['site_name']} | 무료 계산기·온라인 편의 도구",cfg['site_description'],script='/assets/search.js')+header(cfg)+body+footer(cfg)
    write(DIST/'index.html',doc)


def tool_page(cfg,a):
    path=f"tools/{a['slug']}/"
    widget=(APP_ROOT/a['slug']/'widget.html').read_text(encoding='utf-8')
    steps=''.join(f'<li>{H(x)}</li>' for x in a['how_to'])
    qa=''.join(f'<details><summary>{H(x["q"])}</summary><p>{H(x["a"])}</p></details>' for x in a['faq'])
    body=f'''<div class="breadcrumb"><a href="/">전체 도구</a> / {H(a['category'])} / {H(a['title'])}</div>
<section class="tool-intro"><p class="eyebrow">{H(a['category'])} · 무료 온라인 도구</p><h1>{H(a['title'])}</h1><p>{H(a['intro'])}</p></section>
{widget}
<section class="article"><h2>이용 방법</h2><ol>{steps}</ol>
<h2>{H(a['title'])} 자주 묻는 질문</h2>{qa}
<h2>다른 도구도 둘러보세요</h2><p><a href="/#tools">전체 도구 목록 보기 →</a></p></section>'''
    doc=head(cfg,f"{a['title']} | {cfg['site_name']}",a['description'],path,a['keywords'],script='/tools/'+a['slug']+'/widget.js')+header(cfg)+body+footer(cfg)
    # page-specific metadata for ordinary public static utility pages
    data={'@context':'https://schema.org','@type':'WebApplication','name':a['title'],'description':a['description'],
        'inLanguage':'ko','applicationCategory':'UtilitiesApplication','operatingSystem':'Any','isAccessibleForFree':True}
    if url(cfg,path): data['url']=url(cfg,path)
    doc=doc.replace('</head>',rich(data)+'</head>',1)
    write(DIST/path/'index.html',doc)
    shutil.copyfile(APP_ROOT/a['slug']/'widget.js',DIST/path/'widget.js')


def static(cfg):
    notice='<div class="notice">정식 공개 전에 운영자 연락처, 개인정보 처리 안내 및 광고 이용 여부를 확인해야 합니다.</div>' if not cfg.get('contact_email') else ''
    email=H(cfg.get('contact_email') or '연락처 등록 예정')
    pages={
      'about': ('사이트 소개','작은도구함에서 제공하는 무료 온라인 도구와 이용 방식 안내',
            f'<h1>사이트 소개</h1><p>{H(cfg["site_name"])}은 일상에서 자주 필요한 계산과 간단한 작업을 회원가입 없이 수행할 수 있도록 만든 무료 도구 모음입니다.</p><p>각 도구는 모바일과 PC에서 이용할 수 있습니다. 기능별 설명과 사용 방법을 함께 제공합니다.</p><p>문의: {email}</p>'),
      'privacy': ('개인정보 안내','작은도구함의 브라우저 계산과 사이트 운영 관련 개인정보 안내',
            f'<h1>개인정보 안내</h1>{notice}<p>현재 제공되는 계산 도구의 입력값은 사용자의 브라우저에서 계산하며, 입력한 값 자체를 서버에 전송하거나 회원 데이터베이스에 저장하지 않습니다.</p><p>실제 운영 시에는 호스팅 업체가 서비스 운영·보안 목적으로 접속 기록이나 IP 주소 등 관련 정보를 처리할 수 있습니다. 호스팅 업체·문의처·보유기간·쿠키 관련 고지는 서비스 공개 전에 실제 설정에 맞게 보완해야 합니다.</p><p>애드센스 광고가 활성화되면 Google 등 광고 제공업체의 쿠키·데이터 처리에 대한 추가 안내 및 해당 지역 법규에 따른 동의 관리가 필요할 수 있습니다.</p><p>문의: {email}</p>'),
      'terms': ('이용 안내','작은도구함 무료 도구 사용 안내',
            f'<h1>이용 안내</h1>{notice}<p>본 사이트의 계산 결과는 일반적인 정보 제공 및 편의 목적입니다. 계산 방식과 입력 조건을 확인하고 중요한 결정에 사용하기 전에 별도로 검증해 주세요.</p><p>서비스의 정상 동작과 보안을 위해 필요한 유지보수 또는 운영 중단이 발생할 수 있습니다.</p><p>문의: {email}</p>')
    }
    for folder,(title,desc,body) in pages.items():
        p=folder+'/'
        content=head(cfg,f'{title} | {cfg["site_name"]}',desc,p)+header(cfg)+f'<section class="article">{body}</section>'+footer(cfg)
        write(DIST/p/'index.html',content)


def machine(cfg, apps):
    base=cfg['site_url']
    if base:
        ET.register_namespace('', 'http://www.sitemaps.org/schemas/sitemap/0.9')
        root=ET.Element('{http://www.sitemaps.org/schemas/sitemap/0.9}urlset')
        for path in ('','about/','privacy/','terms/',*(f'tools/{a["slug"]}/' for a in apps)):
            url_el=ET.SubElement(root, '{http://www.sitemaps.org/schemas/sitemap/0.9}url')
            ET.SubElement(url_el,'{http://www.sitemaps.org/schemas/sitemap/0.9}loc').text=url(cfg,path)
        ET.ElementTree(root).write(DIST/'sitemap.xml',encoding='utf-8',xml_declaration=True)
        write(DIST/'robots.txt','User-agent: *\nAllow: /\nSitemap: '+base+'/sitemap.xml\n')
    else:
        write(DIST/'robots.txt','User-agent: *\nAllow: /\n# Set site_url (or SITE_URL) to generate sitemap.xml before public launch.\n')
    pub=cfg.get('adsense_publisher_id','')
    if cfg.get('ads_enabled') and pub:
        write(DIST/'ads.txt',f'google.com, {pub.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n')
    write(DIST/'_headers','/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n')
    write(DIST/'manifest.json',json.dumps({'name':cfg['site_name'],'url':base,'apps':[{'slug':a['slug'],'title':a['title'],'url':url(cfg,f'tools/{a["slug"]}/')} for a in apps]},ensure_ascii=False,indent=2))


def main():
    cfg=metadata();apps=tools_list()
    if DIST.exists():shutil.rmtree(DIST)
    DIST.mkdir(parents=True)
    shutil.copytree(ROOT/'assets',DIST/'assets')
    home(cfg,apps)
    for app in apps:tool_page(cfg,app)
    static(cfg)
    machine(cfg,apps)
    print(f'✓ Built {len(apps)} tools -> {DIST}')
    if not cfg['site_url']:print('! site_url not yet configured: sitemap.xml/canonical are intentionally omitted')
    if not cfg.get('ads_enabled'):print('! AdSense disabled until the site is approved and configured')


if __name__=='__main__':
    try:main()
    except (ValueError,KeyError,FileNotFoundError) as e:
        print(f'Build error: {e}',file=sys.stderr)
        raise SystemExit(1)
