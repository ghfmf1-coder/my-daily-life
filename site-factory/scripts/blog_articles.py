#!/usr/bin/env python3
"""Build practical, source-backed ABREDA guides at /blog/ and /en/blog/.

New approved tools can ship an article alongside their real UI by including a
reviewed blog.json at site-factory/sites/<slug>/blog.json. No article is published
from bare marketing metadata or AI-generated placeholder prose.
"""
from __future__ import annotations
import datetime as dt
import json
import re
from html import escape
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SITES=ROOT/'sites'
CONTENT=ROOT/'content'/'blog'
REQUIRED=('title','description','problem','steps','alternative','toolIntro','limits','faq')
URL=re.compile(r'^[a-z][a-z0-9-]{2,70}$')
MIGRATED={'csv-column-extractor','csv-empty-row-remover','jsonl-validator','srt-sdh-cleaner','vtt-cleaner',
          'privacy-redactor','submission-auditor','shift-calendar','worktime-analyzer','label-sheet-maker',
          'cut-plan-optimizer','recurring-payment-finder','meal-timeline','handover-checklist',
          'group-order-summary','image-compress-lab','pdf-page-workshop','bulk-file-renamer',
          'room-layout-planner','quote-document-maker','warranty-deadline-tracker','share-qr-card',
          'seller-profit-math','color-contrast-audit','document-scan-studio'}
CSS=""":root{--ink:#192c45;--muted:#536781;--edge:#dbe5f1;--blue:#285ec5;--bg:#f6f8fc}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.77 system-ui,-apple-system,"Malgun Gothic",sans-serif}a{color:#2459bd}a:hover{text-decoration-thickness:2px}.shell{max-width:1060px;margin:0 auto;padding:18px 20px 68px}.mast{display:flex;align-items:center;justify-content:space-between;gap:15px;border-bottom:1px solid var(--edge);padding-bottom:18px;margin-bottom:25px}.brand{font-weight:850;font-size:22px;letter-spacing:-.05em;text-decoration:none}.links{display:flex;gap:15px;flex-wrap:wrap;font-size:14px}.eyebrow{color:var(--blue);font-weight:800;font-size:13px;letter-spacing:.07em}h1{font-size:clamp(27px,4vw,41px);letter-spacing:-.055em;line-height:1.3;margin:7px 0 15px}h2{font-size:21px;letter-spacing:-.04em;margin:25px 0 10px;line-height:1.36}h3{font-size:17px;margin:0 0 5px}p{margin:9px 0}header p,.lead{color:var(--muted);max-width:800px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:12px;margin:20px 0 34px}.tile{background:#fff;padding:17px;border:1px solid var(--edge);border-radius:12px}.tile h2{font-size:16px;line-height:1.4;margin:6px 0}.tile p{color:var(--muted);font-size:13px;margin:5px 0}.tile .date{font-size:12px;color:#687d95}.tile a{text-decoration:none;font-weight:750}.article{max-width:830px;background:white;border:1px solid var(--edge);border-radius:17px;padding:clamp(20px,4vw,40px)}.article p{line-height:1.85}.article ol{padding-left:24px}.article li{padding:9px 0}.article li p{margin:4px 0}.method{background:#f0f5fd;border-left:4px solid #5591d5;padding:14px 18px;border-radius:9px}.cta{margin:25px 0;padding:22px;border:1px solid #aebfe5;background:#f3f7ff;border-radius:12px}.cta a{display:inline-block;background:var(--blue);color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:800;margin-top:8px}.note{font-size:14px;color:#475e77}.footer{border-top:1px solid var(--edge);padding:21px 0;margin-top:28px;font-size:13px;color:var(--muted)}a:focus-visible{outline:3px solid #9ab9f5;outline-offset:3px}@media(max-width:600px){.shell{padding:12px 14px 55px}.mast{align-items:flex-start}.links{gap:8px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.tile{padding:12px}.article{padding:18px}.cta{padding:17px}}"""
def tool_info(slug):
    """Validate an existing published tool; no invented URLs."""
    from factory import read_site
    if (SITES/slug/'site.json').is_file():
        cfg,_=read_site(slug)
        if not cfg['approved']:raise ValueError('Article references an unapproved tool: '+slug)
        if slug in MIGRATED:
            return ('https://abreda.com/tools/'+slug+'/', 'https://abreda.com/en/tools/'+slug+'/')
        home=(cfg.get('canonical_url') or 'https://'+cfg['project']+'.pages.dev').rstrip('/')
        if cfg.get('locales')==['ko','en']:return (home+'/',home+'/en/')
        return (home+'/',None)
    # Independently shipped Work apps must exist and have bilingual UI tooling.
    work=ROOT.parent/'work-sites'/slug/'public'/'index.html'
    if work.is_file():
        url='https://tb-'+slug+'.pages.dev/'
        return (url,url+'en/')
    raise ValueError('Unknown tool slug: '+slug)
def check_language(lang,data):
    if not isinstance(data,dict):raise ValueError('Missing '+lang+' article')
    for key in REQUIRED:
        if key not in data:raise ValueError('Missing article key '+lang+'.'+key)
    for k in ('title','description','problem','alternative','toolIntro','limits'):
        val=data[k]
        if not isinstance(val,str) or len(val.strip())<(12 if k=='title' else 30):
            raise ValueError('Thin or empty '+lang+' '+k)
        if '<' in val or '>' in val:raise ValueError('HTML markup not allowed in editorial fields')
    if not isinstance(data['steps'],list) or len(data['steps'])<3:
        raise ValueError('At least three source-backed steps required')
    for step in data['steps']:
        if not isinstance(step,list) or len(step)!=2 or len(step[0])<9 or len(step[1])<55:
            raise ValueError('Each step needs a real heading and explanation')
    if not isinstance(data['faq'],list) or not data['faq']:
        raise ValueError('At least one meaningful question required')
    for question in data['faq']:
        if not isinstance(question,list) or len(question)!=2 or len(question[0])<12 or len(question[1])<45:
            raise ValueError('Question and answer must be substantial')
    if lang=='en' and re.search('[가-힣]',data['title']):raise ValueError('English title not translated')
    if lang=='ko' and not re.search('[가-힣]',data['title']):raise ValueError('Korean title missing')
def load():
    files=sorted(CONTENT.glob('*.json'))+sorted(SITES.glob('*/blog.json'))+sorted((ROOT.parent/'work-sites').glob('*/blog.json'))
    posts=[];seen=set();tools=set()
    for file in files:
        p=json.loads(file.read_text(encoding='utf-8'))
        if p.get('status')!='reviewed':
            # Drafts are not indexable or published.
            continue
        name=p.get('slug')
        if not isinstance(name,str) or not URL.fullmatch(name):raise ValueError('Invalid blog URL')
        if name in seen:raise ValueError('Duplicate blog slug '+name)
        tool=p.get('tool')
        if not isinstance(tool,str) or not URL.fullmatch(tool):raise ValueError('Invalid tool id')
        ko,en=tool_info(tool)
        if not en:raise ValueError('English article has no matching English tool: '+tool)
        if tool in tools:raise ValueError('Repeated SEO article for same tool '+tool)
        published=p.get('published')
        if not isinstance(published,str):raise ValueError('Publication date is required')
        dt.date.fromisoformat(published)
        check_language('ko',p.get('ko'));check_language('en',p.get('en'))
        seen.add(name);tools.add(tool)
        posts.append({**p,'toolURLs':{'ko':ko,'en':en}})
    return sorted(posts,key=lambda p:(p['published'],p['slug']),reverse=True)
def tags(locale,page_url,title,desc,ko_url,en_url,og_type='article'):
    pairs=[('ko',ko_url),('en',en_url),('x-default',ko_url)]
    return ('<meta name="robots" content="index,follow,max-image-preview:large">'
            '<meta name="description" content="'+escape(desc,quote=True)+'">'
            '<link rel="canonical" href="'+escape(page_url,quote=True)+'">'
            +''.join('<link rel="alternate" hreflang="'+lang+'" href="'+escape(link,quote=True)+'">' for lang,link in pairs)
            +'<meta property="og:type" content="'+og_type+'">'
            '<meta property="og:title" content="'+escape(title,quote=True)+'">'
            '<meta property="og:description" content="'+escape(desc,quote=True)+'">'
            '<meta property="og:url" content="'+escape(page_url,quote=True)+'">'
            '<meta property="og:site_name" content="ABREDA">')
def document_head(lang,title,desc,page_url,ko_url,en_url,kind='article',schema=None):
    output='<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    output+='<title>'+escape(title+' | ABREDA')+'</title>'+tags(lang,page_url,title,desc,ko_url,en_url,kind)
    if schema:
        jsonld=json.dumps(schema,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
        output+='<script type="application/ld+json">'+jsonld+'</script>'
    return output+'<style>'+CSS+'</style></head>'
def mast(lang):
    ko=lang=='ko'
    return ('<div class="mast"><a class="brand" href="'+('/' if ko else '/en/')+'">'+('아브레다' if ko else 'ABREDA')+'</a>'
            '<nav class="links" aria-label="Site navigation"><a href="'+('/blog/' if ko else '/en/blog/')+'">'+('문제 해결 글' if ko else 'Guides')+'</a>'
            '<a href="'+('/' if ko else '/en/')+'">'+('웹 도구' if ko else 'Tools')+'</a>'
            '<a href="'+('/en/blog/' if ko else '/blog/')+'" hreflang="'+('en' if ko else 'ko')+'">'+('English' if ko else '한국어')+'</a></nav></div>')
def foot(lang):
    base='/en/' if lang=='en' else '/'
    return '<footer class="footer">© ABREDA · <a href="'+base+'privacy">'+('개인정보처리방침' if lang=='ko' else 'Privacy policy')+'</a> · <a href="'+base+'contact">'+('문의' if lang=='ko' else 'Contact')+'</a></footer>'
def article(post,lang):
    data=post[lang];is_ko=lang=='ko';name=post['slug']
    prefix='/blog/' if is_ko else '/en/blog/'
    url='https://abreda.com'+prefix+name+'/'
    ko='https://abreda.com/blog/'+name+'/'
    en='https://abreda.com/en/blog/'+name+'/'
    publisher={'@type':'Organization','name':'ABREDA','url':'https://abreda.com/'}
    schema={'@context':'https://schema.org','@type':'BlogPosting','headline':data['title'],'description':data['description'],'url':url,
            'inLanguage':lang,'datePublished':post['published'],'author':publisher,'publisher':publisher,
            'mainEntityOfPage':{'@type':'WebPage','@id':url}}
    x=document_head(lang,data['title'],data['description'],url,ko,en,schema=schema)
    x+='<body><div class="shell">'+mast(lang)+'<main><article class="article">'
    x+='<p class="eyebrow">'+('문제 해결 가이드' if is_ko else 'PROBLEM-SOLVING GUIDE')+' · <time datetime="'+post['published']+'">'+post['published']+'</time></p>'
    x+='<h1>'+escape(data['title'])+'</h1><p class="lead">'+escape(data['description'])+'</p>'
    x+='<h2>'+('먼저 확인할 문제' if is_ko else 'Understand the problem')+'</h2><p>'+escape(data['problem'])+'</p>'
    x+='<h2>'+('해결 방법: 순서대로 따라하기' if is_ko else 'How to solve it')+'</h2><ol>'
    for heading,body in data['steps']:
        x+='<li><h3>'+escape(heading)+'</h3><p>'+escape(body)+'</p></li>'
    x+='</ol><h2>'+('다른 방법도 있습니다' if is_ko else 'Another way to do this')+'</h2><div class="method">'+escape(data['alternative'])+'</div>'
    x+='<aside class="cta"><h2>'+('여러 번 작업해야 한다면?' if is_ko else 'Prefer a browser tool?')+'</h2><p>'+escape(data['toolIntro'])+'</p>'
    x+='<a href="'+escape(post['toolURLs'][lang],quote=True)+'" rel="noopener">'+('관련 무료 웹앱 사용하기' if is_ko else 'Try the related free tool')+'</a></aside>'
    x+='<h2>'+('안 되는 경우와 주의사항' if is_ko else 'When the method may not work')+'</h2><p class="note">'+escape(data['limits'])+'</p>'
    x+='<h2>'+('자주 묻는 질문' if is_ko else 'Frequently asked questions')+'</h2>'
    for q,a in data['faq']:x+='<h3>'+escape(q)+'</h3><p>'+escape(a)+'</p>'
    x+='<p><a href="'+prefix+'">'+('다른 문제 해결 글 보기' if is_ko else 'Read more practical guides')+'</a></p>'
    return x+'</article></main>'+foot(lang)+'</div></body></html>'
def listing(posts,lang):
    is_ko=lang=='ko'
    prefix='/blog/' if is_ko else '/en/blog/'
    url='https://abreda.com'+prefix
    title='아브레다 문제 해결 가이드' if is_ko else 'ABREDA How-to Guides'
    desc=('실제 문제부터 해결 방법, 실패 조건과 대안까지 설명합니다. 필요한 경우 아브레다 무료 웹 도구로 이어집니다.' if is_ko else
          'Practical instructions, alternatives and limitations first; then an optional matching ABREDA browser tool.')
    head=document_head(lang,title,desc,url,'https://abreda.com/blog/','https://abreda.com/en/blog/','website')
    html=head+'<body><div class="shell">'+mast(lang)+'<main><header><p class="eyebrow">ABREDA BLOG</p><h1>'+escape(title)+'</h1><p class="lead">'+escape(desc)+'</p></header>'
    html+='<section class="grid" aria-label="'+('글 목록' if is_ko else 'Articles')+'">'
    for post in posts:
        data=post[lang];href=prefix+post['slug']+'/'
        html+='<article class="tile"><span class="date"><time datetime="'+post['published']+'">'+post['published']+'</time></span><h2><a href="'+href+'">'+escape(data['title'])+'</a></h2><p>'+escape(data['description'])+'</p></article>'
    html+='</section><p>'+('문제에 맞는 방법을 직접 설명한 글만 게시합니다. 웹앱 이용은 선택 사항입니다.' if is_ko else 'We publish reviewed solutions first. Using a linked tool is optional.')+'</p>'
    return html+'</main>'+foot(lang)+'</div></body></html>'
def generate_blog(out):
    out=Path(out);posts=load()
    for lang,sub in [('ko','blog'),('en','en/blog')]:
        base=out/sub;base.mkdir(parents=True,exist_ok=True)
        (base/'index.html').write_text(listing(posts,lang),encoding='utf-8')
        for post in posts:
            dest=base/post['slug'];dest.mkdir(exist_ok=True)
            (dest/'index.html').write_text(article(post,lang),encoding='utf-8')
    return ['https://abreda.com'+prefix+(p['slug']+'/' if p else '')
            for prefix in ('/blog/','/en/blog/') for p in ([None]+posts)]
if __name__=='__main__':
    from tempfile import TemporaryDirectory
    with TemporaryDirectory() as tmp:
        print('Generated',len(generate_blog(tmp)),'bilingual blog URLs')
