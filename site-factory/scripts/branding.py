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


def render_ico(title: str, slug: str) -> bytes:
    """Build a genuine 64px Windows ICO favicon with only the Python standard library.

    SVG remains available for modern browsers. ICO is also recognized by
    Google Search's documented favicon formats. No licensed external imagery.
    """
    import struct
    size=64
    pixels=bytearray(size*size*4)
    low=(title+' '+slug).lower()
    if any(x in low for x in ('csv','파일','엑셀','sheet','merge')):
        color=(6,122,87);theme='csv'
    elif any(x in low for x in ('원고','문장','manuscript','proofread')):
        color=(6,111,156);theme='lens'
    elif any(x in low for x in ('소설','novel','writing','story')):
        color=(78,62,180);theme='novel'
    elif any(x in low for x in ('달력','루틴','일정','habit','calendar','my-daily')):
        color=(22,95,221);theme='day'
    else:
        color=(24,72,153);theme='admin'
    def pixel(x,y,c):
        if 0<=x<size and 0<=y<size:
            i=(y*size+x)*4
            pixels[i:i+4]=bytes((c[2],c[1],c[0],255))
    def rect(x0,y0,x1,y1,c):
        for y in range(y0,y1):
            for x in range(x0,x1):pixel(x,y,c)
    def disc(cx,cy,r,c):
        for y in range(cy-r,cy+r+1):
            for x in range(cx-r,cx+r+1):
                if (x-cx)**2+(y-cy)**2<=r*r:pixel(x,y,c)
    def line(ax,ay,bx,by,c,width=3):
        steps=max(abs(bx-ax),abs(by-ay),1)
        for t in range(steps+1):
            x=round(ax+(bx-ax)*t/steps)
            y=round(ay+(by-ay)*t/steps)
            disc(x,y,max(1,width//2),c)
    rect(0,0,size,size,color)
    white=(255,255,255);shade=(182,218,244);accent=(30,112,232)
    if theme=='day':
        rect(12,16,52,52,white);rect(12,16,52,27,shade)
        line(22,11,22,21,white,4);line(42,11,42,21,white,4)
        rect(21,31,43,46,accent);line(26,38,31,42,white,4);line(31,42,39,33,white,4)
    elif theme=='novel':
        rect(10,18,30,50,white);rect(34,18,54,50,white)
        line(32,19,32,51,shade,3)
        for y in (26,34,42):
            line(15,y,26,y,shade,2);line(38,y,49,y,shade,2)
    elif theme=='csv':
        rect(12,12,52,53,white)
        for y in (23,33,43):line(17,y,47,y,shade,2)
        for x in (28,38):line(x,17,x,48,shade,2)
        line(37,48,42,52,(4,144,97),4);line(42,52,51,40,(4,144,97),4)
    elif theme=='lens':
        rect(12,11,40,52,white)
        for y in (21,29,37,45):line(17,y,34,y,shade,2)
        disc(41,37,13,white);disc(41,37,8,color);disc(41,37,6,shade)
        line(49,46,58,56,white,5)
    else:
        rect(9,23,55,54,white);rect(14,28,50,34,shade)
        line(19,15,45,15,white,4);line(19,15,19,23,white,4);line(45,15,45,23,white,4)
        for x,c in [(20,accent),(34,(33,177,145))]:rect(x,39,x+10,49,c)
    bgra=b''.join(bytes(pixels[(size-1-y)*size*4:(size-y)*size*4]) for y in range(size))
    mask=b'\x00'*(size*size//8)
    header=struct.pack('<IIIHHIIIIII',40,size,size*2,1,32,0,len(bgra)+len(mask),0,0,0,0)
    frame=header+bgra+mask
    return struct.pack('<HHH',0,1,1)+struct.pack('<BBBBHHII',size,size,0,0,1,32,len(frame),22)+frame
