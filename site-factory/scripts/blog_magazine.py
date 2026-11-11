"""WordPress-style bilingual editorial magazine on the existing ABREDA static hub.

No WordPress, external CMS credentials, fabricated authors, AI-generated traffic
claims or automatic publishing of unreviewed source copy. Published photos are
curated per article with verified Unsplash licensing and explicit photo credits.
"""
from __future__ import annotations
import json
from html import escape
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
BASE='https://abreda.com'
CATEGORIES={
  'photo':('사진·이미지','Photos & Images'),
  'document':('문서·파일','Documents & Files'),
  'daily':('일상·생활','Daily Life'),
  'money':('돈·정산','Money & Records'),
  'privacy':('개인정보','Privacy'),
  'knowledge':('알아두면 좋은 정보','Practical Knowledge'),
}
CSS=r"""
:root{color-scheme:light;--bg:#f6f8fc;--paper:#fff;--ink:#132b40;--muted:#627487;--line:#e3eaf2;--blue:#245ed6;--mint:#0d9488;--shadow:0 18px 60px rgba(36,63,93,.055)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.8 system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;overflow-wrap:break-word}
a{color:#2058c1;text-underline-offset:3px}a:hover{color:#123b8d}img{max-width:100%;height:auto}button,input{font:inherit}button{cursor:pointer}
.wrap{width:min(1200px,calc(100% - 40px));margin:auto}.mast{background:#fff;border-bottom:1px solid var(--line)}.mast-in{display:flex;align-items:center;justify-content:space-between;gap:22px;min-height:82px}
.brand{color:#0d2e47!important;text-decoration:none;font-weight:900;font-size:26px;letter-spacing:-.055em;white-space:nowrap}.brand small{display:block;font-weight:550;font-size:10px;letter-spacing:.12em;color:var(--muted);margin-top:-12px}
.nav{display:flex;align-items:center;gap:26px;flex-wrap:wrap}.nav a{font-size:14px;text-decoration:none;color:#3b4b60;font-weight:700}.nav a[aria-current="page"]{color:var(--blue)}.switch{border:1px solid #bcd0ea;border-radius:8px;padding:6px 10px}
.kicker{display:inline-block;color:var(--mint);font-size:12px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.intro{padding:42px 0 24px}.intro h1{max-width:900px;font-size:clamp(31px,4vw,47px);letter-spacing:-.065em;line-height:1.28;margin:8px 0 12px}.intro p{max-width:780px;color:var(--muted);font-size:16px;margin:0}
.featured{display:grid;grid-template-columns:1.05fr .95fr;min-height:355px;border-radius:20px;overflow:hidden;background:#122b44;color:#fff;box-shadow:var(--shadow)}.featured a{color:#fff;text-decoration:none}.featured-photo{position:relative;background:#b9c8d4}.featured-photo img{width:100%;height:100%;min-height:320px;max-height:465px;object-fit:cover;display:block}.featured-body{padding:clamp(28px,4vw,58px);align-self:center}.featured h2{font-size:clamp(25px,3vw,39px);line-height:1.32;letter-spacing:-.04em;margin:14px 0}.featured p{color:#cfdae5;line-height:1.7}.featured .action{display:inline-block;margin-top:19px;background:white;color:#183859!important;padding:9px 17px;border-radius:9px;font-size:14px;font-weight:800}
.featured .cat{background:#ffffff22;color:#f0fbff}.filter-panel{display:flex;justify-content:space-between;gap:16px;align-items:center;margin:42px 0 18px;flex-wrap:wrap}.section-title{font-size:24px;letter-spacing:-.04em;margin:0}.filters{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0 20px}.filters button{padding:7px 14px;background:#fff;border:1px solid var(--line);border-radius:999px;color:#465d74;font-size:13px;font-weight:750}.filters button[aria-pressed=true]{background:#1b467e;border-color:#1b467e;color:white}.search{display:block;width:min(330px,100%);border:1px solid #cdd9e6;border-radius:10px;padding:10px 13px;background:#fff;color:var(--ink);font-size:14px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.tile{border:1px solid var(--line);border-radius:17px;background:#fff;overflow:hidden;box-shadow:0 9px 24px #1e405009;display:flex;flex-direction:column;min-width:0}.tile[hidden]{display:none!important}
.tile-image{display:block;overflow:hidden;aspect-ratio:16/9;background:#dbe6f1}.tile-image img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .25s}.tile-image:hover img{transform:scale(1.025)}.tile-body{padding:19px;flex:1;display:flex;flex-direction:column;gap:9px}.cat{font-size:11px;background:#e7f6f3;color:#14756e;border-radius:999px;padding:5px 10px;display:inline-block;line-height:1.4;font-weight:800;width:fit-content}.date{color:#788b9d;font-size:12px}.tile h2{font-size:18px;letter-spacing:-.035em;line-height:1.4;margin:0}.tile h2 a{text-decoration:none;color:#17334f}.tile p{color:#63768b;font-size:13px;line-height:1.7;margin:0;flex:1}.read-more{font-size:12px;font-weight:850;text-decoration:none;margin-top:4px}
.empty{padding:35px;text-align:center;color:var(--muted);border:1px dashed #cbd7e5;border-radius:12px}
.breadcrumb{font-size:12px;color:#657a91;padding:23px 0 17px}.breadcrumb a{color:#5e7796;text-decoration:none}.article-layout{display:grid;grid-template-columns:minmax(0,820px) minmax(220px,300px);gap:24px;align-items:start}
.article{background:#fff;border:1px solid var(--line);border-radius:18px;padding:clamp(20px,3.5vw,42px);box-shadow:var(--shadow)}
.article .meta{display:flex;flex-wrap:wrap;gap:12px;align-items:center;color:#688096;font-size:13px}.article h1{font-size:clamp(27px,3.6vw,42px);line-height:1.35;letter-spacing:-.055em;margin:18px 0 14px}
.article .lead{font-size:17px;font-weight:500;color:#50677c;line-height:1.8}.hero{margin:26px 0 31px}.hero img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:13px;background:#e7ecf1}.hero figcaption{font-size:12px;color:#6a7f95;margin-top:9px}.hero figcaption a{color:inherit}
.article h2{font-size:24px;letter-spacing:-.04em;margin:36px 0 13px;scroll-margin-top:30px;line-height:1.45}.article h3{font-size:18px;letter-spacing:-.025em;line-height:1.5;margin:0 0 7px}
.article p{line-height:1.9;margin:10px 0;color:#30485f}
.article .toc{background:#f5f8fc;border:1px solid #e5edf5;border-radius:13px;padding:20px 23px;margin:24px 0}.toc strong{display:block;font-size:15px;margin-bottom:8px}.toc ul{margin:0;padding-left:20px}.toc a{font-size:13px;color:#345875;text-decoration:none}
.article .steps{padding-left:0;list-style:none;counter-reset:step}.article .steps li{position:relative;padding:17px 17px 18px 54px;border-bottom:1px solid #edf1f6;counter-increment:step}.article .steps li:before{content:counter(step);position:absolute;left:5px;top:18px;color:white;background:#2c68d2;border-radius:50%;height:31px;width:31px;display:grid;place-items:center;font-size:13px;font-weight:900}
.box{border:1px solid #dce9f8;border-radius:14px;padding:21px 22px;background:#f2f7fe}.box.warning{background:#fff9f0;border-color:#f1dbc3}.box p{margin:0}.cta{border-radius:14px;border:1px solid #a2c7dc;background:linear-gradient(115deg,#edf8fb,#e9f0ff);padding:22px}.cta h2{margin:0 0 8px!important;font-size:21px}.cta .btn{display:inline-block;margin-top:12px;border-radius:8px;padding:11px 17px;color:white;background:#235cc5;font-weight:850;text-decoration:none}
.faq{border-top:1px solid var(--line);padding:15px 0}.faq strong{display:block;margin-bottom:6px}.faq p{margin:4px 0}.sources{padding-left:18px;font-size:13px}.sources li{margin:6px 0}.sources a{overflow-wrap:anywhere}
.sidebar{position:sticky;top:14px}.side-panel{border-radius:15px;background:white;border:1px solid var(--line);padding:20px;margin-bottom:15px}.side-panel h2{font-size:17px;line-height:1.4;margin:0 0 12px}.side-panel a{font-size:13px;line-height:1.6;text-decoration:none;font-weight:700;color:#28506f}.side-panel .mini{display:grid;gap:12px}.side-panel .mini a{display:grid;grid-template-columns:70px 1fr;gap:10px;align-items:center}.side-panel .mini img{width:70px;height:51px;object-fit:cover;border-radius:6px}
.footer{border-top:1px solid var(--line);padding:28px 0;margin-top:60px;font-size:13px;color:#6c8296}.footer a{color:inherit}.related-section{margin-top:44px}.related-section .grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.article-bottom{margin-top:32px;padding-top:17px;border-top:1px solid var(--line);display:flex;justify-content:space-between;flex-wrap:wrap;gap:15px}
a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #79a6ee;outline-offset:3px}
@media(max-width:980px){.article-layout{grid-template-columns:minmax(0,1fr)}.sidebar{position:static;display:grid;grid-template-columns:1fr 1fr;gap:12px}.side-panel{margin:0}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){.wrap{width:calc(100% - 28px)}.mast-in{min-height:70px;align-items:center}.brand{font-size:21px}.brand small{font-size:8px;margin-top:-9px}.nav{justify-content:flex-end;gap:8px}.nav a{font-size:12px}.nav a:nth-of-type(3){display:none}.switch{padding:4px 7px}.intro{padding:30px 0 20px}.featured{grid-template-columns:1fr}.featured-photo img{height:205px;min-height:0}.featured-body{padding:20px}.featured h2{font-size:25px}.filter-panel{margin:31px 0 14px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.tile-body{padding:12px;gap:6px}.tile h2{font-size:15px}.tile p{font-size:12px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.tile .date{font-size:11px}.cat{font-size:10px;padding:4px 8px}.article{padding:20px 17px}.article h2{font-size:21px}.article .steps li{padding-left:43px}.sidebar{grid-template-columns:1fr}.related-section .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
"""
def E(s):return escape(str(s),quote=True)
def href(lang,slug=''):
    return ('/blog/' if lang=='ko' else '/en/blog/')+(slug+'/' if slug else '')
def canonical(lang,slug=''):
    return BASE+href(lang,slug)
def label(lang,ko,en):return ko if lang=='ko' else en
def cat_name(post,lang):
    data=CATEGORIES.get(post['media']['category'],CATEGORIES['knowledge'])
    return data[0 if lang=='ko' else 1]
def sized_url(original,width):
    return original.split('?')[0]+'?auto=format&fit=crop&w='+str(width)+'&q=76'
def image_tag(post,lang,cls='',is_hero=False):
    m=post['media']['image'];url=m['url'];alt=m['alt'][lang]
    return ('<img'+(' class="'+cls+'"' if cls else '')+' src="'+E(sized_url(url,1200 if is_hero else 640))+'" '
            'srcset="'+E(sized_url(url,400))+' 400w, '+E(sized_url(url,800))+' 800w, '+E(sized_url(url,1200))+' 1200w" '
            'sizes="'+(' (max-width:700px) 100vw, 800px' if is_hero else '(max-width:650px) 50vw, 360px')+'" '
            'alt="'+E(alt)+'" width="1200" height="675" decoding="async"'
            +(' fetchpriority="high"' if is_hero else ' loading="lazy"')+'>')
def head(lang,post=None):
    info=post is None
    title=(label(lang,'아브레다 매거진 | 생활에 필요한 해결 방법과 디지털 팁','ABREDA Magazine | Practical Guides and Digital Know-How') if info else post[lang]['title'])
    desc=(label(lang,'생활 정보, 사진·파일 정리, 디지털 업무 팁을 한국어와 영어로 소개합니다. 문제를 먼저 해결하고 필요한 도구는 선택해서 사용하세요.','Explore helpful digital guides, practical workflows and step-by-step how-tos. Learn first and choose free tools only when needed.') if info else post[lang]['description'])
    slug='' if info else post['slug'];url=canonical(lang,slug);ko=canonical('ko',slug);en=canonical('en',slug)
    meta='<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    meta+='<meta name="robots" content="index,follow,max-image-preview:large"><title>'+E(title+' | ABREDA')+'</title>'
    meta+='<meta name="description" content="'+E(desc)+'"><meta name="theme-color" content="#0d2e47">'
    meta+='<link rel="canonical" href="'+E(url)+'"><link rel="alternate" hreflang="ko" href="'+E(ko)+'">'
    meta+='<link rel="alternate" hreflang="en" href="'+E(en)+'"><link rel="alternate" hreflang="x-default" href="'+E(ko)+'">'
    meta+='<meta property="og:site_name" content="ABREDA"><meta property="og:type" content="'+('website' if info else 'article')+'">'
    meta+='<meta property="og:title" content="'+E(title)+'"><meta property="og:description" content="'+E(desc)+'">'
    meta+='<meta property="og:url" content="'+E(url)+'"><meta name="twitter:card" content="summary_large_image">'
    if post:
        meta+='<meta property="article:published_time" content="'+E(post['published'])+'">'
        meta+='<meta property="article:section" content="'+E(cat_name(post,lang))+'">'
        meta+='<meta property="og:image" content="'+E(sized_url(post['media']['image']['url'],1200))+'">'
        meta+='<meta property="og:image:alt" content="'+E(post['media']['image']['alt'][lang])+'">'
        meta+='<meta name="twitter:image" content="'+E(sized_url(post['media']['image']['url'],1200))+'">'
        org={'@type':'Organization','name':'ABREDA','url':'https://abreda.com/'}
        schema={'@context':'https://schema.org','@type':'BlogPosting','headline':title,'description':desc,'inLanguage':lang,
                'url':url,'mainEntityOfPage':{'@type':'WebPage','@id':url},'datePublished':post['published'],
                'image':[sized_url(post['media']['image']['url'],1200)],
                'author':org,'publisher':org}
        breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[
            {'@type':'ListItem','position':1,'name':label(lang,'블로그','Blog'),'item':canonical(lang)},
            {'@type':'ListItem','position':2,'name':title,'item':url}]}
        for obj in [schema,breadcrumb]:
            meta+='<script type="application/ld+json">'+json.dumps(obj,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+'</script>'
    return meta+'<style>'+CSS+'</style></head>'
def mast(lang):
    ko=lang=='ko'
    return '<header class="mast"><div class="wrap mast-in"><a class="brand" href="'+('/' if ko else '/en/')+'">'+label(lang,'아브레다','ABREDA')+'<small>THE PRACTICAL WEB</small></a><nav class="nav" aria-label="'+label(lang,'사이트 메뉴','Site menu')+'"><a href="'+href(lang)+'" aria-current="page">'+label(lang,'매거진','Magazine')+'</a><a href="'+('/' if ko else '/en/')+'">'+label(lang,'무료 도구','Free tools')+'</a><a class="switch" href="'+href('en' if ko else 'ko')+'" hreflang="'+('en' if ko else 'ko')+'">'+label(lang,'English','한국어')+'</a></nav></div></header>'
def foot(lang):
    root='/en/' if lang=='en' else '/'
    return '<footer class="wrap footer">© ABREDA · <a href="'+root+'privacy">'+label(lang,'개인정보처리방침','Privacy policy')+'</a> · <a href="'+root+'contact">'+label(lang,'문의','Contact')+'</a> · <a href="'+href(lang)+'">'+label(lang,'전체 글','All articles')+'</a></footer>'
def tile(p,lang):
    d=p[lang];link=href(lang,p['slug'])
    return ('<article class="tile" data-category="'+E(p['media']['category'])+'" data-search="'+E(d['title']+' '+d['description'])+'">'
            '<a class="tile-image" href="'+E(link)+'" aria-label="'+E(d['title'])+'">'+image_tag(p,lang)+'</a>'
            '<div class="tile-body"><span class="cat">'+E(cat_name(p,lang))+'</span>'
            '<span class="date"><time datetime="'+E(p['published'])+'">'+E(p['published'])+'</time> · '
            +label(lang,'아브레다 편집','ABREDA Editorial')+'</span>'
            '<h2><a href="'+E(link)+'">'+E(d['title'])+'</a></h2><p>'+E(d['description'])+'</p>'
            '<a class="read-more" href="'+E(link)+'">'+label(lang,'자세히 읽기 →','Read the guide →')+'</a></div></article>')
def listing(posts,lang):
    main=next((p for p in posts if p['slug']=='jpg-png-webp-which-format'),posts[0])
    other=[p for p in posts if p is not main]
    ko=lang=='ko'
    h=head(lang)+'<body>'+mast(lang)+'<main class="wrap">'
    h+='<section class="intro"><span class="kicker">ABREDA EDITORIAL</span><h1>'+label(lang,'알아두면 쓸모 있는<br>디지털 생활 가이드','Practical answers for<br>your digital life')+'</h1>'
    h+='<p>'+label(lang,'사진, 문서, 업무, 개인정보까지. 가짜 수치 없이 해결 방법을 먼저 설명하고, 필요한 도구만 소개합니다.','Clear solutions for photos, documents, everyday tasks and privacy—with real steps before any product links.')+'</p></section>'
    h+='<section class="featured" aria-label="'+label(lang,'추천 글','Featured article')+'"><a class="featured-photo" href="'+E(href(lang,main['slug']))+'">'+image_tag(main,lang,is_hero=True)+'</a>'
    h+='<div class="featured-body"><span class="cat">'+E(cat_name(main,lang))+'</span><h2><a href="'+E(href(lang,main['slug']))+'">'+E(main[lang]['title'])+'</a></h2>'
    h+='<p>'+E(main[lang]['description'])+'</p><a class="action" href="'+E(href(lang,main['slug']))+'">'+label(lang,'이 글 읽기 →','Read this feature →')+'</a></div></section>'
    h+='<section aria-label="'+label(lang,'모든 글','Article archive')+'"><div class="filter-panel"><h2 class="section-title">'+label(lang,'최신 글과 실용 정보','Browse practical articles')+'</h2>'
    h+='<input class="search" id="articleSearch" type="search" autocomplete="off" placeholder="'+label(lang,'제목이나 주제로 검색','Search titles and topics')+'" aria-label="'+label(lang,'글 검색','Search articles')+'"></div>'
    h+='<div class="filters" role="group" aria-label="'+label(lang,'분야별 필터','Filter by topic')+'">'
    h+='<button type="button" aria-pressed="true" data-filter="all">'+label(lang,'전체','All')+'</button>'
    for key,labels in CATEGORIES.items():
        if any(p['media']['category']==key for p in other):
            h+='<button type="button" aria-pressed="false" data-filter="'+key+'">'+E(labels[0 if ko else 1])+'</button>'
    h+='</div><div class="grid" id="articleGrid">'+''.join(tile(p,lang) for p in other)+'</div>'
    h+='<p class="empty" id="noResults" hidden>'+label(lang,'해당 주제의 글이 없습니다. 검색어를 바꿔보세요.','No matching article. Try a different search.')+'</p></section>'
    h+='</main>'+foot(lang)
    h+='''<script>(function(){'use strict';const box=document.getElementById('articleSearch'),items=Array.from(document.querySelectorAll('#articleGrid .tile')),buttons=Array.from(document.querySelectorAll('.filters button')),none=document.getElementById('noResults');let chosen='all';function refresh(){const search=box.value.toLocaleLowerCase().trim();let visible=0;for(const card of items){const matchCategory=chosen==='all'||card.dataset.category===chosen;const matchText=!search||card.dataset.search.toLocaleLowerCase().includes(search);card.hidden=!(matchCategory&&matchText);if(!card.hidden)visible++}none.hidden=visible!==0;}for(const b of buttons){b.addEventListener('click',()=>{chosen=b.dataset.filter;for(const el of buttons)el.setAttribute('aria-pressed',String(el===b));refresh()})}box.addEventListener('input',refresh);})();</script>'''
    return h+'</body></html>'
def related(posts,current):
    same=[p for p in posts if p['slug']!=current['slug'] and p['media']['category']==current['media']['category']]
    rest=[p for p in posts if p['slug']!=current['slug'] and p not in same]
    return (same+rest)[:3]
def article(post,lang,posts):
    d=post[lang];ko=lang=='ko';found=related(posts,post)
    h=head(lang,post)+'<body>'+mast(lang)+'<main class="wrap">'
    h+='<div class="breadcrumb"><a href="'+('/' if ko else '/en/')+'">'+label(lang,'홈','Home')+'</a> / <a href="'+href(lang)+'">'+label(lang,'매거진','Magazine')+'</a> / '+E(cat_name(post,lang))+'</div>'
    h+='<div class="article-layout"><article class="article"><header><div class="meta"><span class="cat">'+E(cat_name(post,lang))+'</span><time datetime="'+E(post['published'])+'">'+E(post['published'])+'</time><span>'+label(lang,'아브레다 콘텐츠','ABREDA Editorial')+'</span></div>'
    h+='<h1>'+E(d['title'])+'</h1><p class="lead">'+E(d['description'])+'</p></header>'
    image=post['media']['image']
    h+='<figure class="hero">'+image_tag(post,lang,is_hero=True)+'<figcaption>'+E(image.get('caption',{}).get(lang,''))+' · '
    h+='<a href="'+E(image['source'])+'" rel="noopener noreferrer" target="_blank">'+label(lang,'사진 출처: Unsplash 원본','Photo source: Unsplash')+'</a></figcaption></figure>'
    toc=[('problem',label(lang,'무엇이 문제인가요?','What is the problem?')),('steps',label(lang,'순서대로 해결하기','Step-by-step solution')),('alternative',label(lang,'다른 해결 방법','Alternative method')),('limits',label(lang,'해결되지 않는 경우','Known limitations')),('faq',label(lang,'자주 묻는 질문','Frequently asked questions'))]
    if post.get('sources'):toc.append(('sources',label(lang,'공식 참고자료','Primary sources')))
    h+='<nav class="toc" aria-label="'+label(lang,'목차','Table of contents')+'"><strong>'+label(lang,'이 글의 내용','On this page')+'</strong><ul>'
    for anchor,title in toc:h+='<li><a href="#'+anchor+'">'+E(title)+'</a></li>'
    h+='</ul></nav>'
    h+='<section aria-labelledby="problem"><h2 id="problem">'+E(toc[0][1])+'</h2><p>'+E(d['problem'])+'</p></section>'
    h+='<section aria-labelledby="steps"><h2 id="steps">'+E(toc[1][1])+'</h2><ol class="steps">'
    for heading,body in d['steps']:
        h+='<li><h3>'+E(heading)+'</h3><p>'+E(body)+'</p></li>'
    h+='</ol></section><section><h2 id="alternative">'+E(toc[2][1])+'</h2><div class="box"><p>'+E(d['alternative'])+'</p></div></section>'
    if post['toolURLs'][lang]:
        h+='<aside class="cta"><h2>'+label(lang,'작업이 많다면 무료 도구도 활용해 보세요','An optional free browser tool')+'</h2>'
        h+='<p>'+E(d['toolIntro'])+'</p><a class="btn" href="'+E(post['toolURLs'][lang])+'" rel="noopener">'+label(lang,'관련 웹앱 바로 사용하기 →','Open the matching tool →')+'</a></aside>'
    h+='<section><h2 id="limits">'+E(toc[3][1])+'</h2><div class="box warning"><p>'+E(d['limits'])+'</p></div></section>'
    h+='<section><h2 id="faq">'+E(toc[4][1])+'</h2>'
    for q,a in d['faq']:h+='<div class="faq"><strong>'+E(q)+'</strong><p>'+E(a)+'</p></div>'
    h+='</section>'
    if post.get('sources'):
        h+='<section><h2 id="sources">'+label(lang,'참고한 공식 원천 자료','Official primary sources')+'</h2>'
        h+='<p>'+label(lang,'다음 기관의 안내 내용을 확인해 작성했습니다. 상세 규정은 원문을 확인하세요.','This article uses the official references below; consult them for the full guidance.')+'</p><ul class="sources">'
        for ref in post['sources']:h+='<li><a href="'+E(ref['url'])+'" target="_blank" rel="noopener noreferrer">'+E(ref['name'])+'</a></li>'
        h+='</ul></section>'
    h+='<div class="article-bottom"><a href="'+href(lang)+'">← '+label(lang,'블로그 전체 글','All magazine articles')+'</a>'
    h+='<a href="'+href('en' if ko else 'ko',post['slug'])+'" hreflang="'+('en' if ko else 'ko')+'">'+label(lang,'English version','한국어 버전')+' →</a></div>'
    h+='</article><aside class="sidebar" aria-label="'+label(lang,'관련 콘텐츠','Related content')+'"><div class="side-panel"><h2>'+label(lang,'이 글과 관련된 이야기','Related reading')+'</h2><div class="mini">'
    for p in found:
        h+='<a href="'+href(lang,p['slug'])+'">'+image_tag(p,lang)+'<span>'+E(p[lang]['title'])+'</span></a>'
    h+='</div></div><div class="side-panel"><h2>'+label(lang,'아브레다 소개','About ABREDA')+'</h2><p style="font-size:13px;color:#657b8c">'+label(lang,'문제를 먼저 해결하고 도구는 필요한 순간 선택합니다. 검토된 실용 정보를 한국어와 영어로 제공합니다.','Independent guidance first, tools only when they help. Read reviewed articles in Korean or English.')+'</p><a href="'+href(lang)+'">'+label(lang,'전체 글 보기 →','Browse all articles →')+'</a></div></aside></div>'
    h+='<section class="related-section"><h2 class="section-title">'+label(lang,'이어서 읽으면 좋은 글','You may also find helpful')+'</h2><div class="grid">'+''.join(tile(p,lang) for p in found)+'</div></section>'
    return h+'</main>'+foot(lang)+'</body></html>'
def build(out,posts):
    if not posts:raise ValueError('No reviewed editorial articles available')
    out=Path(out)
    urls=[]
    for lang,rel in [('ko','blog'),('en','en/blog')]:
        target=out/rel;target.mkdir(parents=True,exist_ok=True)
        (target/'index.html').write_text(listing(posts,lang),encoding='utf-8')
        urls.append(canonical(lang))
        for p in posts:
            dest=target/p['slug'];dest.mkdir(parents=True,exist_ok=True)
            (dest/'index.html').write_text(article(p,lang,posts),encoding='utf-8')
            urls.append(canonical(lang,p['slug']))
    return urls
