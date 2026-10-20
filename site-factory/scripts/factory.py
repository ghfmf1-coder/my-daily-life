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
from branding import render_icon, render_ico

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
    # AUTO_HUB_CATALOG: genuine human-useful navigation, server-rendered for
    # people and crawlers; no thin keyword pages, hidden content or fake links.
    if slug == 'toolbox-hub':
        from marketing import build_packets
        items=build_packets()['sites']
        category_map={'my-daily-life':'routine','csv-merge-studio':'data',
                      'novel-planner':'writing','manuscript-lens':'writing','subtitle-sync-studio':'data'}
        def cards(language: str) -> str:
            blocks=[]
            for site in items:
                if site['slug'] == 'toolbox-hub':
                    continue
                # Keep language-specific catalogues separate; never show untranslated tools.
                if language not in site.get('langs',[]):
                    continue
                info=site.get('copy',{}).get(language,{})
                localized_titles={
                    'csv-column-extractor':{'ko':'CSV 열 선택 추출기','en':'CSV Column Extractor'},
                    'csv-empty-row-remover':{'ko':'CSV 빈 행 제거기','en':'CSV Empty Row Remover'},
                    'jsonl-validator':{'ko':'JSONL 파일 오류 검사기','en':'JSONL File Validator'},
                    'srt-sdh-cleaner':{'ko':'SRT 자막 효과음·화자 표시 제거기','en':'SRT SDH Cleaner'},
                    'vtt-cleaner':{'ko':'VTT 자막 정리기','en':'VTT Subtitle Cleaner'},
                }
                name=localized_titles.get(site['slug'],{}).get(language) or info.get('title') or site['title']
                # No raw slug or generic English title may leak into the Korean catalogue.
                if language=='ko' and not re.search(r'[가-힣]',name):
                    continue
                if language=='en' and re.search(r'[가-힣]',name):
                    continue
                intro=info.get('copy') or (site['description'] if language=='ko' else '')
                if language=='en' and not info.get('title') and site['slug'] not in localized_titles:
                    continue  # Only allow explicitly translated English titles
                category=category_map.get(site['slug'],'other')
                slug=site['slug'].lower()
                if any(word in slug for word in ('csv','tsv','json','jsonl','table','column','row','data')):
                    category='data'
                elif any(word in slug for word in ('novel','manuscript','markdown','writing')):
                    category='writing'
                elif any(word in slug for word in ('subtitle','srt','vtt')):
                    category='data'
                elif any(word in slug for word in ('daily','habit','routine')):
                    category='routine'
                cat_label={
                    'ko':{'routine':'일상·루틴','data':'데이터·파일','writing':'웹소설·글쓰기','other':'기타 도구'},
                    'en':{'routine':'Daily life','data':'Data & files','writing':'Writing','other':'Other tools'},
                }[language][category]
                # Only migrated tools use the unified domain; other tools keep their verified URLs.
                unified_slugs={'csv-column-extractor','csv-empty-row-remover','jsonl-validator','srt-sdh-cleaner','vtt-cleaner'}
                if site['slug'] in unified_slugs:
                    target='https://abreda.com/'+('en/' if language=='en' else '')+'tools/'+site['slug']+'/'
                else:
                    target=site['url'] if language=='ko' else site['url'].rstrip('/')+'/en/'
                label='바로 사용하기 ↗' if language=='ko' else 'Open tool ↗'
                # Each card has its own meaningful, lightweight SVG illustration.
                # The descriptions remain in data-search and on the destination page,
                # but are deliberately not displayed in the visual catalogue.
                # Each tool gets its own illustration: subject-specific, no shared generic icon.
                artwork={
                  'my-daily-life':('<rect x="30" y="22" width="100" height="82" rx="12" fill="#fff" stroke="#5d91d9" stroke-width="3"/><path d="M30 43h100" stroke="#5d91d9" stroke-width="3"/><path d="M53 22v14m54-14v14" stroke="#275eb7" stroke-width="5"/><path d="m46 62 8 8 14-18m8 12 7 7 14-18" fill="none" stroke="#19ad83" stroke-width="5" stroke-linecap="round"/><circle cx="110" cy="84" r="10" fill="#ffe3a2"/>'),
                  'csv-column-extractor':('<rect x="22" y="23" width="116" height="80" rx="8" fill="#fff" stroke="#5385ca" stroke-width="3"/><path d="M22 44h116M60 23v80M99 23v80M22 65h116M22 84h116" stroke="#a3bfe9" stroke-width="2"/><rect x="61" y="45" width="37" height="57" fill="#ffdc78" opacity=".9"/><path d="m82 80 12 14 4-9 11-3z" fill="#2d69e0" stroke="#fff" stroke-width="2"/>'),
                  'csv-empty-row-remover':('<rect x="18" y="22" width="85" height="81" rx="8" fill="#fff" stroke="#4eae94" stroke-width="3"/><path d="M18 43h85M18 65h85M50 22v81" stroke="#9ad4c2" stroke-width="3"/><path d="M65 54h21" stroke="#ef7676" stroke-width="5"/><path d="m111 48 15 16-15 16" stroke="#1db98a" stroke-width="5" fill="none"/><rect x="124" y="41" width="23" height="44" rx="5" fill="#ddf8ef" stroke="#39ad89" stroke-width="2"/>'),
                  'csv-merge-studio':('<rect x="12" y="31" width="62" height="70" rx="7" fill="#fff" stroke="#68a4d8" stroke-width="3"/><rect x="86" y="22" width="62" height="70" rx="7" fill="#fff" stroke="#68a4d8" stroke-width="3"/><path d="M21 50h44M21 64h44M95 42h44M95 56h44" stroke="#a4c3e8" stroke-width="4"/><path d="M65 78h30m-8-8 8 8-8 8" stroke="#f2a43a" stroke-width="5" fill="none"/>'),
                  'jsonl-validator':('<rect x="33" y="19" width="94" height="90" rx="9" fill="#19283d"/><path d="M47 37h36M47 51h62M47 65h53M47 79h30" stroke="#7fc6b9" stroke-width="4" stroke-linecap="round"/><circle cx="113" cy="87" r="17" fill="#e95466"/><path d="M113 77v13m0 7v1" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'),
                  'manuscript-lens':('<path d="M25 34q27-10 55 6v63q-28-16-55-7zm55 6q28-16 55-6v62q-27-9-55 7z" fill="#fff5e6" stroke="#b88954" stroke-width="3"/><path d="M38 52h28M38 64h25M93 52h26M93 64h23" stroke="#d5b18a" stroke-width="3"/><circle cx="105" cy="76" r="18" fill="#e0f6ff" fill-opacity=".85" stroke="#398ac2" stroke-width="5"/><path d="m118 89 15 15" stroke="#398ac2" stroke-width="6"/>'),
                  'novel-planner':('<rect x="20" y="20" width="120" height="86" rx="9" fill="#fff" stroke="#9777d5" stroke-width="3"/><path d="M34 43h92M34 65h92M34 87h92" stroke="#ded1f6" stroke-width="3"/><circle cx="48" cy="43" r="7" fill="#8c72d7"/><circle cx="93" cy="65" r="7" fill="#edab4f"/><circle cx="117" cy="87" r="7" fill="#39b7a0"/><path d="m55 44 32 18 23 21" stroke="#9473c6" stroke-width="3" fill="none"/>'),
                  'srt-sdh-cleaner':('<path d="M35 18h68l20 20v66H35z" fill="#fff" stroke="#557fb8" stroke-width="3"/><path d="M103 18v20h20" fill="none" stroke="#557fb8" stroke-width="3"/><text x="46" y="58" font-size="20" font-weight="bold" fill="#284f91">SRT</text><path d="M48 72h55M48 83h35" stroke="#a1b7d8" stroke-width="4"/><path d="m111 79 11 10 17-22" fill="none" stroke="#29b89b" stroke-width="6"/>'),
                  'subtitle-sync-studio':('<rect x="19" y="27" width="122" height="73" rx="9" fill="#203d67"/><path d="m62 47 24 16-24 16z" fill="#fff"/><path d="M35 89h91" stroke="#92b1e6" stroke-width="3"/><circle cx="85" cy="89" r="6" fill="#f3c264"/><path d="M38 17v15M52 17v15M66 17v15" stroke="#e2a95b" stroke-width="3"/>'),
                  'vtt-cleaner':('<path d="M30 22h100v81H30z" rx="7" fill="#fff" stroke="#9277c8" stroke-width="3"/><rect x="42" y="35" width="76" height="25" rx="6" fill="#6246b9"/><text x="57" y="54" font-size="17" font-weight="bold" fill="#fff">VTT</text><path d="M46 75h67M46 88h43" stroke="#b6a3dc" stroke-width="4"/><path d="m112 88 9 8 13-17" stroke="#32bdad" stroke-width="5" fill="none"/>'),
                }
                if slug in artwork:
                    motif=artwork[slug]
                elif 'csv' in slug:
                    motif='<rect x="22" y="23" width="116" height="82" rx="10" fill="#fff" stroke="#76a7c7" stroke-width="3"/><path d="M22 45h116M22 67h116M60 23v82M99 23v82" stroke="#b3d3e8" stroke-width="3"/><circle cx="118" cy="83" r="13" fill="#e4a849"/>'
                elif 'subtitle' in slug or 'srt' in slug or 'vtt' in slug:
                    motif='<rect x="21" y="27" width="118" height="70" rx="10" fill="#203c6b"/><path d="m66 47 26 16-26 16z" fill="#fff"/><path d="M37 88h87" stroke="#91b4ec" stroke-width="4"/>'
                elif 'novel' in slug or 'manuscript' in slug:
                    motif='<path d="M24 30q26-9 56 9v62q-30-18-56-9zm56 9q30-18 56-9v62q-26-9-56 9z" fill="#fff2dc" stroke="#b48b5a" stroke-width="3"/>'
                else:
                    motif='<rect x="28" y="24" width="104" height="79" rx="12" fill="#fff" stroke="#78a5ca" stroke-width="3"/><circle cx="80" cy="64" r="23" fill="#dff4ec" stroke="#39b39a" stroke-width="4"/><path d="m70 64 8 8 15-18" fill="none" stroke="#248f79" stroke-width="5"/>'
                visual='<div class="tool-art" aria-hidden="true"><svg viewBox="0 0 160 124" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg">'+motif+'</svg></div>'
                blocks.append(
                    '<article class="tool" data-category="'+escape(category,quote=True)+'" data-search="'+
                    escape(' '.join((name,site['title'],site['description'],intro,site['slug'])),quote=True)+'">'+
                    '<span class="tag">'+escape(cat_label)+'</span>'+visual+
                    '<h3>'+escape(name)+'</h3><div class="actions"><a href="'+escape(target,quote=True)+'" rel="noopener noreferrer">'+
                    label+'</a></div></article>'
                )
            return '\n'.join(blocks)
        for language, relative in (('ko','index.html'),('en','en/index.html')):
            path=out/relative
            source=path.read_text(encoding='utf-8')
            if '<!-- AUTO_CATALOG_CARDS -->' not in source:
                raise SiteError('toolbox-hub: missing catalog placeholder in '+relative)
            path.write_text(source.replace('<!-- AUTO_CATALOG_CARDS -->',cards(language)),encoding='utf-8')
    # UNIFIED_DOMAIN_PHASE_1: serve proven bilingual browser-only utilities on
    # abreda.com/tools/<slug>/ and abreda.com/en/tools/<slug>/.
    # Legacy Pages domains remain live until redirects are separately verified.
    if slug == 'toolbox-hub':
        migrated=('csv-column-extractor','csv-empty-row-remover',
                  'jsonl-validator','srt-sdh-cleaner','vtt-cleaner')
        for tool_slug in migrated:
            source=SITES/tool_slug/'public'
            for lang,prefix in (('ko','tools'),('en','en/tools')):
                original=source/('index.html' if lang=='ko' else 'en/index.html')
                if not original.is_file():
                    raise SiteError('Missing bilingual tool: '+str(original))
                dest=out/prefix/tool_slug
                dest.mkdir(parents=True,exist_ok=True)
                html=original.read_text(encoding='utf-8')
                page_url='https://abreda.com/'+prefix+'/'+tool_slug+'/'
                html=re.sub(r'<link\s+rel=["\']canonical["\'][^>]*>','',html,flags=re.I)
                html=re.sub(r'<link\s+rel=["\']alternate["\'][^>]*hreflang=[^>]*>','',html,flags=re.I)
                ko_url='https://abreda.com/tools/'+tool_slug+'/'
                en_url='https://abreda.com/en/tools/'+tool_slug+'/'
                tags=('<link rel="canonical" href="'+page_url+'">'
                      '<link rel="alternate" hreflang="ko" href="'+ko_url+'">'
                      '<link rel="alternate" hreflang="en" href="'+en_url+'">'
                      '<link rel="alternate" hreflang="x-default" href="'+ko_url+'">')
                html=html.replace('</head>',tags+'</head>',1)
                (dest/'index.html').write_text(html,encoding='utf-8')
                # Copy only safe, referenced local assets from the same locale.
                origin_dir=original.parent
                for asset in origin_dir.iterdir():
                    if asset.is_file() and asset.suffix.lower() in ALLOWED_EXT and asset.name!='index.html':
                        shutil.copy2(asset,dest/asset.name)
        # The hub sitemap is a stable, single submitted index for both locales.
        # Include all already-listed hub URLs and the migrated tool URLs.
        sitemap=out/'sitemap.xml'
        if sitemap.is_file():
            xml=sitemap.read_text(encoding='utf-8')
            urls=['https://abreda.com/'+prefix+'/'+name+'/'
                  for name in migrated for prefix in ('tools','en/tools')]
            additions=''.join('  <url><loc>'+url+'</loc></url>\n' for url in urls)
            if '</urlset>' not in xml:
                raise SiteError('Invalid hub sitemap: missing urlset close tag')
            xml=xml.replace('</urlset>',additions+'</urlset>')
            sitemap.write_text(xml,encoding='utf-8')
    # AUTO_RELEASE_RSS: one stable, human-useful announcement feed for each language.
    # The owner can connect these opt-in feeds to Metricool RSS Autolists.
    # Creating a feed does not authorize or perform social posting.
    if slug == 'toolbox-hub':
        from marketing import build_packets
        from release_feed import generate_feed
        published=build_packets()
        (out / 'feed.xml').write_bytes(generate_feed(published,'ko'))
        (out / 'en' / 'feed.xml').write_bytes(generate_feed(published,'en'))
    # Contextual cross-tool navigation. Only published tools, language-matched, no self-links.
    related_groups = {
      'csv-column-extractor':['csv-empty-row-remover','csv-merge-studio','jsonl-validator'],
      'csv-empty-row-remover':['csv-column-extractor','csv-merge-studio','jsonl-validator'],
      'csv-merge-studio':['csv-column-extractor','csv-empty-row-remover','jsonl-validator'],
      'jsonl-validator':['csv-column-extractor','csv-empty-row-remover','csv-merge-studio'],
      'novel-planner':['manuscript-lens'],
      'manuscript-lens':['novel-planner'],
      'srt-sdh-cleaner':['vtt-cleaner','subtitle-sync-studio'],
      'vtt-cleaner':['srt-sdh-cleaner','subtitle-sync-studio'],
      'subtitle-sync-studio':['srt-sdh-cleaner','vtt-cleaner'],
    }
    related_titles = {
      'csv-column-extractor':('CSV 열 선택 추출기','CSV Column Extractor','필요한 열만 골라 저장','Extract only the columns you need','▦'),
      'csv-empty-row-remover':('CSV 빈 행 제거기','CSV Empty Row Remover','빈 행과 공백 행 정리','Clean blank rows','⌫'),
      'csv-merge-studio':('CSV 병합·중복 제거','CSV Merge & Deduplicate','여러 CSV를 하나로 병합','Combine multiple CSV files','⇄'),
      'jsonl-validator':('JSONL 오류 검사기','JSONL Validator','잘못된 JSON 행 찾기','Find invalid JSON lines','{}'),
      'novel-planner':('웹소설 연재 설계실','Web Serial Planner','회차·복선·등장인물 관리','Plan chapters and characters','✎'),
      'manuscript-lens':('웹소설 원고돋보기','Manuscript Lens','반복 표현과 긴 문장 검사','Find repetition in writing','◉'),
      'srt-sdh-cleaner':('SRT 자막 효과음 정리','SRT SDH Cleaner','효과음과 화자 표시 정리','Remove SDH cues','▤'),
      'vtt-cleaner':('VTT 자막 정리기','VTT Subtitle Cleaner','VTT 자막 텍스트 정리','Clean VTT subtitles','▶'),
      'subtitle-sync-studio':('자막 싱크 조정기','Subtitle Sync Studio','자막 시간 오차 수정','Adjust subtitle timing','◷'),
    }
    def related_panel(current: str, lang: str) -> str:
        cards=[]
        for candidate in related_groups.get(current,[]):
            try:
                other,_=read_site(candidate)
            except (OSError,SiteError,ValueError):
                continue
            if not other.get('approved') or lang not in other.get('locales',[]): continue
            ko,en,ko_desc,en_desc,icon=related_titles[candidate]
            url=(other.get('canonical_url') or 'https://'+other['project']+'.pages.dev').rstrip('/')+'/' + ('en/' if lang=='en' else '')
            title,desc=(en,en_desc) if lang=='en' else (ko,ko_desc)
            cards.append('<a class="tb-related-link" href="'+escape(url,quote=True)+'"><span class="tb-related-icon" aria-hidden="true">'+escape(icon)+'</span><span><strong>'+escape(title)+'</strong><small>'+escape(desc)+'</small></span><span aria-hidden="true">↗</span></a>')
        if not cards:return ''
        heading='Try related tools' if lang=='en' else '함께 쓰면 좋은 도구'
        sub='Useful tools for the next step' if lang=='en' else '지금 작업과 관련된 기능'
        css='<style>.tb-related{font:14px/1.5 system-ui,-apple-system,sans-serif;color:#1b2b45;background:#f7f9fd;border:1px solid #dce5f1;border-radius:12px;padding:18px;box-sizing:border-box}.tb-related h2{font-size:18px;margin:0 0 5px}.tb-related p{font-size:12px;color:#64748b;margin:0 0 15px}.tb-related-link{display:flex;align-items:center;gap:10px;padding:11px 9px;background:#fff;border:1px solid #e2e8f0;border-radius:9px;margin:8px 0;text-decoration:none;color:#24364f;min-width:0}.tb-related-link:hover{border-color:#4b75df;box-shadow:0 2px 8px #17346b12}.tb-related-link span:nth-child(2){flex:1;min-width:0}.tb-related-link strong{display:block;font-size:13px}.tb-related-link small{display:block;color:#64748b;font-size:11px;margin-top:2px}.tb-related-icon{display:grid;place-items:center;width:35px;height:35px;flex:none;border-radius:9px;background:#eaf0ff;color:#315cce;font-weight:700;font-size:18px}@media(min-width:1160px){body.tb-with-related{padding-right:285px!important}.tb-related{position:fixed;top:28px;right:20px;width:245px;max-height:calc(100vh - 56px);overflow:auto;z-index:10}}@media(max-width:1159px){.tb-related{max-width:880px;margin:24px auto}}</style>'
        return css+'<aside class="tb-related" aria-label="'+escape(heading,quote=True)+'"><h2>'+heading+'</h2><p>'+sub+'</p>'+''.join(cards)+'</aside>'
    tracking_ids = {
        'csv-merge-studio': 'toolbox-csv-merge-studio',
        'novel-planner': 'toolbox-novel-planner',
        'manuscript-lens': 'toolbox-manuscript-lens',
        'subtitle-sync-studio': 'toolbox-subtitle-sync-studio',
        'toolbox-hub': 'catalog-toolbox-hub',
    }
    if slug in tracking_ids:
        (out / 'toolbox-traffic.js').write_text(
            (Path(__file__).with_name('traffic_beacon.js')).read_text(encoding='utf-8'),
            encoding='utf-8')
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
        if slug == 'toolbox-hub' and rel in ('index.html','en/index.html'):
            feed_ref='/feed.xml' if rel == 'index.html' else '/en/feed.xml'
            if 'application/rss+xml' not in content:
                content=content.replace('</head>','<link rel="alternate" type="application/rss+xml" title="Small Toolbox releases" href="'+feed_ref+'">\n</head>',1)
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
        if 'href="/favicon.ico"' not in content:
            content = content.replace('</head>',
                '<link rel="icon" type="image/x-icon" href="/favicon.ico">\n</head>', 1)
        if slug in related_groups and rel in ('index.html','en/index.html') and '</body>' in content:
            lang='en' if rel=='en/index.html' else 'ko'
            sidebar=related_panel(slug,lang)
            if sidebar:
                content=content.replace('<body','<body class="tb-with-related"',1) if '<body>' in content else content
                content=content.replace('</body>',sidebar+'</body>',1)
        # A single authentic brand-navigation link. Do not link to private admin.
        if slug not in {'toolbox-hub','toolbox-admin','deployment-check'} \
                and rel in {'index.html','en/index.html'} \
                and 'https://abreda.com/' not in content:
            caption=('Browse other useful web tools' if rel=='en/index.html' else
                     '작은 도구함의 다른 무료 웹 도구 보기')
            footer=('<footer style="padding:18px 12px;text-align:center;font-size:.9rem">'+
                    '<a href="https://abreda.com/" rel="noopener noreferrer">'+
                    caption+'</a></footer>')
            content=content.replace('</body>',footer+'</body>',1)
        if slug in tracking_ids and '</body>' in content:
            content = content.replace('</body>',
                '<script defer src="/toolbox-traffic.js" data-toolbox-site="' +
                tracking_ids[slug] + '"></script></body>', 1)
        p.write_text(content, encoding='utf-8')
        is_noindex = any('noindex' in tag.lower() for tag in
                         re.findall(r'<meta[^>]+>', content, flags=re.I)
                         if 'name="robots"' in tag.lower() or "name='robots'" in tag.lower())
        if not disallow_all and not is_noindex and not any(x in {'admin', 'private'} for x in p.parts):
            indexed_pages.append(page_url)
    if not (out / 'favicon.svg').is_file():
        (out / 'favicon.svg').write_text(render_icon(data['title'], slug), encoding='utf-8')
    # AUTO_SEARCH_ICO: supported favicon format for Google Search results.
    if not (out / 'favicon.ico').is_file():
        (out / 'favicon.ico').write_bytes(render_ico(data['title'], slug))
    if not (out / 'sitemap.xml').exists():
        xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        xml += ''.join('  <url><loc>' + escape(url) + '</loc></url>\n' for url in indexed_pages)
        (out / 'sitemap.xml').write_text(xml + '</urlset>\n', encoding='utf-8')
    if not (out / 'robots.txt').exists():
        (out / 'robots.txt').write_text(
            'User-agent: *\nAllow: /\nSitemap: ' + canonical + '/sitemap.xml\n',encoding='utf-8')
    # AUTO_ADMIN_CATALOG: build a current, non-sensitive catalog for the manager.
    # New approved public sites appear automatically after the manager redeploys.
    if slug == 'toolbox-admin':
        catalog = []
        for other in site_list():
            if other in {'toolbox-admin', 'deployment-check'}:
                continue
            site_config, _ = read_site(other)
            if not site_config.get('approved'):
                continue
            catalog.append({
                'slug': other,
                'title': site_config['title'],
                'description': site_config['description'],
                'url': (site_config.get('canonical_url') or f"https://{site_config['project']}.pages.dev") + '/',
                'repo': 'https://github.com/ghfmf1-coder/my-daily-life',
                'category': '공개 도구',
                'locales': site_config.get('locales', ['ko'])
            })
        (out / 'sites-catalog.json').write_text(
            json.dumps({'version': 1, 'sites': catalog}, ensure_ascii=False, indent=2),
            encoding='utf-8')
    # AUTO_PROMOTION_PACKETS: human-reviewed, platform-compliant promotion library.
    if slug == 'toolbox-admin':
        from marketing import build_packets
        (out / 'promotion-packets.json').write_text(
            json.dumps(build_packets(),ensure_ascii=False,indent=2),encoding='utf-8')
    return data, canonical