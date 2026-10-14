#!/usr/bin/env python3
"""Small Toolbox site factory: safe site validation and packaging, stdlib only."""
from __future__ import annotations
import json
import os
import re
import shutil
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from branding import render_icon

ROOT = Path(__file__).resolve().parents[1]
SITES = ROOT / 'sites'
NAME = re.compile(r'^[a-z][a-z0-9-]{1,39}$')
BLOCKED_PARTS = {'.git', '.github', '.env', 'node_modules', '.DS_Store', '__pycache__', 'private', 'secrets'}
BLOCKED_ENDINGS = ('.pem', '.key', '.p12', '.pfx', '.sqlite', '.db', '.bak', '.log')
ALLOWED_EXT = {'.html', '.css', '.js', '.mjs', '.json', '.txt', '.xml', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.webmanifest', '.pdf', '.wasm', '.csv'}

class SiteError(ValueError):
    pass

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = False
        self.description = False
        self.viewport = False
        self.local_assets = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title':
            self.title = True
        if tag == 'meta' and attrs.get('name','').lower() == 'description' and attrs.get('content','').strip():
            self.description = True
        if tag == 'meta' and attrs.get('name','').lower() == 'viewport':
            self.viewport = True
        if tag in ('script', 'img', 'link'):
            key = 'src' if tag in ('script','img') else 'href'
            if (url := attrs.get(key)):
                self.local_assets.append(url)

def validate_name(name: str) -> str:
    if not isinstance(name, str) or not NAME.fullmatch(name) or '--' in name or name.endswith('-'):
        raise SiteError('site/project 이름은 2~40자 소문자 영문·숫자·하이픈이어야 합니다.')
    return name

def read_site(slug: str, require_approval: bool = False) -> tuple[dict, Path]:
    validate_name(slug)
    directory = SITES / slug
    path = directory / 'site.json'
    if not path.is_file() or path.is_symlink():
        raise SiteError(f'{slug}: site.json 없음')
    data = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(data, dict):
        raise SiteError(f'{slug}: site.json은 객체여야 합니다.')
    if data.get('slug') != slug:
        raise SiteError(f'{slug}: slug 불일치')
    validate_name(data.get('project',''))
    if not data['project'].startswith('tb-'):
        raise SiteError(f'{slug}: 프로젝트 이름은 tb-로 시작해야 합니다. 기존 프로젝트 보호.')
    if type(data.get('approved')) is not bool:
        raise SiteError(f'{slug}: approved는 true 또는 false여야 합니다.')
    if require_approval and not data['approved']:
        raise SiteError(f'{slug}: 사용자 승인 전이므로 배포 금지 (approved=false)')
    for key in ('title','description'):
        if not isinstance(data.get(key),str) or len(data[key].strip()) < 3:
            raise SiteError(f'{slug}: {key} 필수')
    domain = data.get('domain')
    if domain is not None:
        if not isinstance(domain, str) or not re.fullmatch(r'(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}', domain):
            raise SiteError(f'{slug}: domain 값 오류')
    canonical_url = data.get('canonical_url')
    if canonical_url:
        u = urlparse(canonical_url)
        if u.scheme != 'https' or not u.hostname or u.path not in ('','/') or u.query or u.fragment:
            raise SiteError(f'{slug}: canonical_url에는 https 홈페이지 주소만 입력')
        if u.hostname not in (f"{data['project']}.pages.dev", domain):
            raise SiteError(f'{slug}: canonical_url은 배포 주소 또는 확인된 도메인이어야 합니다.')
    return data, directory

def validate_locale_pages(data: dict, public: Path) -> list[str]:
    """Require real, discoverable English interfaces for multilingual public tools.

    Never fabricate localized pages by duplicating Korean content for search bots.
    Explicitly declared locales are a publishing contract, not SEO keywords.
    """
    locales = data.get('locales')
    if locales is None:
        return []
    if locales != ['ko', 'en']:
        raise SiteError('현재 다국어 공개 도구는 locales=["ko","en"]을 사용해야 합니다.')
    for language, rel in (('ko', 'index.html'), ('en', 'en/index.html')):
        path = public / rel
        if not path.is_file():
            raise SiteError(f'{data["slug"]}: {language} 실제 번역 페이지가 필요합니다: {rel}')
        text = path.read_text(encoding='utf-8')
        if 'FACTORY_STARTER_DO_NOT_PUBLISH' in text:
            if data['approved']:
                raise SiteError(f'{data["slug"]}: {language} 미완성 번역 페이지 공개 금지')
        if f'lang="{language}"' not in text:
            raise SiteError(f'{data["slug"]}: {rel}의 html lang 속성이 잘못되었습니다.')
        if language == 'en' and data['approved']:
            stripped = re.sub(r'<[^>]+>', ' ', re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.I | re.S))
            english_words = re.findall(r'\b[A-Za-z]{3,}\b', stripped)
            if len(english_words) < 65 or '<h1' not in text.lower():
                raise SiteError(f'{data["slug"]}: 영어 이용자에게 제공할 충분한 실제 UI·설명이 필요합니다.')
    return locales

def validate_site(slug: str, require_approval: bool = False) -> dict:
    data, site = read_site(slug, require_approval)
    public = site / 'public'
    if not public.is_dir() or public.is_symlink():
        raise SiteError(f'{slug}: public 폴더가 필요합니다.')
    index = public / 'index.html'
    if not index.is_file() or index.is_symlink():
        raise SiteError(f'{slug}: public/index.html 없음')
    validate_locale_pages(data, public)
    if data['approved'] and 'FACTORY_STARTER_DO_NOT_PUBLISH' in index.read_text(encoding='utf-8'):
        raise SiteError(f'{slug}: 빈 템플릿은 공개할 수 없습니다.')
    files = 0
    for p in public.rglob('*'):
        if p.is_symlink():
            raise SiteError(f'{slug}: 심볼릭 링크 금지: {p}')
        if not p.is_file():
            continue
        files += 1
        rel = p.relative_to(public)
        if any(part in BLOCKED_PARTS or part.startswith('.') for part in rel.parts):
            raise SiteError(f'{slug}: 비공개 파일 금지: {rel}')
        if p.suffix.lower() not in ALLOWED_EXT or p.name.lower().endswith(BLOCKED_ENDINGS):
            raise SiteError(f'{slug}: 허용되지 않은 파일: {rel}')
        if p.stat().st_size > 25 * 1024 * 1024:
            raise SiteError(f'{slug}: 파일 크기 제한 초과: {rel}')
        if p.suffix == '.html':
            parser = PageParser()
            text = p.read_text(encoding='utf-8')
            parser.feed(text)
            if not (parser.title and parser.viewport and parser.description):
                raise SiteError(f'{slug}: {rel}: title/viewport/description 필수')
            for url in parser.local_assets:
                u = urlparse(url)
                if u.scheme in ('http','https','data') or url.startswith('//') or url.startswith('#'):
                    continue
                if u.scheme or url.startswith('javascript:'):
                    raise SiteError(f'{slug}: 위험한 에셋 URL: {url}')
                if not u.path:
                    continue
                asset = public / u.path.lstrip('/') if u.path.startswith('/') else p.parent / u.path
                resolved = asset.resolve()
                if not resolved.is_relative_to(public.resolve()) or not resolved.is_file():
                    raise SiteError(f'{slug}: 없는 내부 에셋: {rel}: {url}')
    if files > 20000:
        raise SiteError(f'{slug}: 파일 개수 제한 초과')
    return data

def site_list() -> list[str]:
    if not SITES.exists():
        return []
    return sorted(d.name for d in SITES.iterdir() if d.is_dir() and (d / 'site.json').is_file())

def prepare(slug: str, out: Path) -> tuple[dict, str]:
    data = validate_site(slug, require_approval=True)
    src = SITES / slug / 'public'
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(src, out)
    canonical = (data.get('canonical_url') or f"https://{data['project']}.pages.dev").rstrip('/')
    html_pages = sorted(p for p in out.rglob('*.html') if p.is_file())
    # Private admin and smoke tests must not appear in public sitemaps.
    robots_source = out / 'robots.txt'
    disallow_all = robots_source.is_file() and bool(re.search(
        r'(?im)^\s*Disallow:\s*/\s*$', robots_source.read_text(encoding='utf-8')))
    localized = data.get('locales') == ['ko', 'en']
    alternatives = {'ko': canonical + '/', 'en': canonical + '/en/'} if localized else {}
    indexed_pages = []
    for p in html_pages:
        content = p.read_text(encoding='utf-8')
        rel = p.relative_to(out).as_posix()
        if 'rel="icon"' not in content and "rel='icon'" not in content:
            content = content.replace('</head>',
                '<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg">\n</head>', 1)
        page_url = canonical + ('/' if rel == 'index.html' else
                                '/en/' if rel == 'en/index.html' else '/' + rel)
        if 'rel="canonical"' not in content and "rel='canonical'" not in content:
            content = content.replace('</head>',
                '<link rel="canonical" href="' + escape(page_url, quote=True) + '">\n</head>', 1)
        if localized and rel in ('index.html', 'en/index.html') and 'hreflang=' not in content:
            tags = ''.join('<link rel="alternate" hreflang="' + lang + '" href="' +
                           escape(url, quote=True) + '">' for lang, url in alternatives.items())
            tags += '<link rel="alternate" hreflang="x-default" href="' + \
                    escape(alternatives['ko'], quote=True) + '">'
            content = content.replace('</head>', tags + '\n</head>', 1)
        p.write_text(content, encoding='utf-8')
        is_noindex = any('noindex' in tag.lower() for tag in
                         re.findall(r'<meta[^>]+>', content, flags=re.I)
                         if 'name="robots"' in tag.lower() or "name='robots'" in tag.lower())
        if not disallow_all and not is_noindex and not any(x in {'admin', 'private'} for x in p.parts):
            indexed_pages.append(page_url)
    if not (out / 'favicon.svg').is_file():
        (out / 'favicon.svg').write_text(render_icon(data['title'], slug), encoding='utf-8')
    if not (out / 'sitemap.xml').exists():
        xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        xml += ''.join('  <url><loc>' + escape(url) + '</loc></url>\n' for url in indexed_pages)
        (out / 'sitemap.xml').write_text(xml + '</urlset>\n', encoding='utf-8')
    if not (out / 'robots.txt').exists():
        (out / 'robots.txt').write_text(
            'User-agent: *\nAllow: /\nSitemap: ' + canonical + '/sitemap.xml\n',encoding='utf-8')
    return data, canonical