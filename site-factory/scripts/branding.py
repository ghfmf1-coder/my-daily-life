"""Generate stable, copyright-original square favicons for all newly created tools."""
from __future__ import annotations
import hashlib
from html import escape

def render_icon(title: str, slug: str) -> str:
    digest=hashlib.sha256((slug+':'+title).encode('utf-8')).digest()
    palette=('#185ce5','#008775','#643cc8','#ae513b','#0a779e','#34557d')
    bg=palette[digest[0] % len(palette)]
    low=title.lower()+' '+slug.lower()
    if any(x in low for x in ('소설','원고','글쓰기','writing','novel')):
        symbol='<path d="M11 17c10-4 17-2 21 3 4-5 12-7 21-3v30c-9-3-17-1-21 4-4-5-11-7-21-4z" fill="white"/><path d="M32 20v31M17 28h10M17 36h9M38 28h10M38 36h9" stroke="#c5d9fc" stroke-width="2.3" stroke-linecap="round"/>'
    elif any(x in low for x in ('csv','파일','문서','엑셀','표','sheet','merge')):
        symbol='<rect x="13" y="9" width="38" height="46" rx="6" fill="white"/><path d="M19 22h26M19 32h26M19 42h26M31 17v30" stroke="#b0c7da" stroke-width="3"/><path d="m37 47 4 4 9-10" fill="none" stroke="#14a071" stroke-width="4" stroke-linecap="round"/>'
    elif any(x in low for x in ('달력','루틴','일정','체크','schedule','calendar','habit')):
        symbol='<rect x="11" y="17" width="42" height="36" rx="8" fill="white"/><path d="M11 26h42" stroke="#a3c6fa" stroke-width="4"/><path d="M22 12v10M42 12v10" stroke="white" stroke-width="5" stroke-linecap="round"/><path d="m23 39 6 6 13-15" stroke="#1b67dc" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    else:
        symbol='<rect x="12" y="13" width="40" height="39" rx="8" fill="white"/><rect x="19" y="20" width="11" height="11" rx="3" fill="#7b9ee4"/><rect x="34" y="20" width="11" height="11" rx="3" fill="#3ecba8"/><rect x="19" y="35" width="11" height="11" rx="3" fill="#f6b45d"/><rect x="34" y="35" width="11" height="11" rx="3" fill="#a89bf0"/>'
    return '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img"><title>'+escape(title)+'</title><rect width="64" height="64" rx="15" fill="'+bg+'"/>'+symbol+'</svg>\\n'
