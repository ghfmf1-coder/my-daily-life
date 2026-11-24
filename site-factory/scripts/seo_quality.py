"""Add crawlable, capability-specific guides and navigation without changing app JS."""
import re
from html import escape, unescape
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET

UPDATED = ["word-character-counter","text-diff-checker","json-pretty-validator","url-component-codec","text-case-converter","markdown-preview-lite","line-sort-deduplicate","base64-text-codec","secure-password-maker","unix-time-converter"]
HOST = "https://abreda.com"

def insert(html, section):
    marker = '</main>' if '</main>' in html else '</body>'
    if marker not in html:
        raise ValueError('Missing closing element')
    return html.replace(marker, section + marker, 1)

def improve_hub(out):
    from blog_articles import load
    sitemap = out / 'sitemap.xml'
    xml = sitemap.read_text(encoding='utf-8')
    urls = [n.text for n in ET.fromstring(xml).findall('.//{*}loc')]
    if len(urls) != len(set(urls)):
        raise ValueError('Duplicate sitemap URLs')
    edited = set()
    for post in load():
        if post.get('type') != 'tool':
            continue
        for lang in ('ko', 'en'):
            tool_url = post['toolURLs'].get(lang)
            path = urlsplit(tool_url or '')
            if path.netloc != 'abreda.com' or not re.fullmatch(r'/(?:en/)?tools/[a-z0-9-]+/', path.path):
                continue
            file = out / path.path.strip('/') / 'index.html'
            if not file.is_file():
                raise ValueError('Blog links to missing hub app: ' + tool_url)
            html = file.read_text(encoding='utf-8')
            d = post[lang]
            en = lang == 'en'
            blog_url = HOST + ('/en/blog/' if en else '/blog/') + post['slug'] + '/'
            if post['tool'] in UPDATED:
                # Remove boilerplate English instructions from the previous batch.
                html = re.sub(r'<section aria-label="How to use this tool">.*?</section>', '', html, count=1, flags=re.S)
                headings = ('When to use it', 'Try this example', 'Important limitations') if en else ('어떤 작업에 사용하나요?', '입력과 결과 예시', '주의사항')
                parts = ''.join('<h2>'+h+'</h2><p>'+escape(t)+'</p>' for h,t in zip(headings,(d['problem'],d['steps'][1][1],d['limits'])))
                html = re.sub(r'(<meta\s+name=["\x27]description["\x27]\s+content=["\x27])[^"\x27]*(["\x27])', lambda m:m.group(1)+escape(d['description'],quote=True)+m.group(2), html, count=1, flags=re.I)
                edited.update((tool_url, blog_url))
            else:
                parts = '<h2>'+('Related practical guide' if en else '관련 사용 가이드')+'</h2><p>'+escape(d['description'])+'</p>'
            # Preserve existing tool controls, style, language and analytics.
            link = '<p><a href="'+escape(blog_url,quote=True)+'">'+escape(d['title'])+'</a></p>'
            section = '<section class="tb-specific-guide" style="margin:24px auto;padding:16px;max-width:960px;line-height:1.7;overflow-wrap:anywhere">'+parts+link+'</section>'
            if 'class="tb-specific-guide"' not in html:
                file.write_text(insert(html,section),encoding='utf-8')
    # Complete the existing bilingual directory from actual sitemap routes.
    for lang in ('ko','en'):
        prefix = '/en/' if lang=='en' else '/'
        directory_url = HOST + prefix + 'new-tools/'
        directory = out / (prefix.strip('/') + '/' if lang=='en' else '') / 'new-tools/index.html'
        if not directory.is_file():
            raise ValueError('Missing tool directory '+lang)
        html = directory.read_text(encoding='utf-8')
        links = []
        expected = [u for u in urls if re.fullmatch(re.escape(HOST+prefix+'tools/')+r'[a-z0-9-]+/',u)]
        for u in expected:
            target = out / urlsplit(u).path.strip('/') / 'index.html'
            if not target.is_file():
                raise ValueError('Sitemap tool missing: '+u)
            if u in html or urlsplit(u).path in html:
                continue
            title = re.search(r'<title>(.*?)</title>',target.read_text(encoding='utf-8'),re.I|re.S)
            if not title:
                raise ValueError('Tool title missing: '+u)
            links.append('<li><a href="'+escape(u,quote=True)+'">'+escape(unescape(title.group(1)).split(' | ')[0])+'</a></li>')
        if links:
            heading = 'More free web tools' if lang=='en' else '다른 무료 웹 도구'
            html = insert(html,'<section class="tb-complete-directory"><h2>'+heading+'</h2><ul>'+''.join(links)+'</ul></section>')
            directory.write_text(html,encoding='utf-8')
            edited.add(directory_url)
        home = out / ('en/index.html' if lang=='en' else 'index.html')
        html = home.read_text(encoding='utf-8')
        if directory_url not in html and prefix+'new-tools/' not in html:
            caption = 'Browse all web tools' if lang=='en' else '전체 웹 도구 보기'
            home.write_text(insert(html,'<p><a href="'+directory_url+'">'+caption+'</a></p>'),encoding='utf-8')
            edited.add(HOST+prefix)
    # lastmod only for known substantive revisions, not every generated page.
    for u in edited:
        xml = xml.replace('<loc>'+u+'</loc></url>','<loc>'+u+'</loc><lastmod>2026-11-25</lastmod></url>')
    ET.fromstring(xml)
    sitemap.write_text(xml,encoding='utf-8')
