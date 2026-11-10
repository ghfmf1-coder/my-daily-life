#!/usr/bin/env python3
"""Build real, language-specific English browser-tool pages from curated editorial data.

The Korean application remains the functional source of truth: element IDs,
file inputs, event handlers, and script logic are retained. This code does NOT
present untranslated Korean pages as English for search crawlers.
"""
from __future__ import annotations
import argparse
import json
import re
import shutil
from html import escape
from html.parser import HTMLParser
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
EDITORIAL=json.loads((ROOT/'site-factory/ops/bilingual-editorial-content.json').read_text(encoding='utf-8'))['sites']
NATIVE=set(('privacy-redactor','submission-auditor','shift-calendar','worktime-analyzer','label-sheet-maker','cut-plan-optimizer','recurring-payment-finder','meal-timeline','handover-checklist','group-order-summary','image-compress-lab','pdf-page-workshop','bulk-file-renamer','room-layout-planner','quote-document-maker','warranty-deadline-tracker','share-qr-card','seller-profit-math','color-contrast-audit','document-scan-studio'))

# Only translate known UI labels. Never translate CSV column names or JS object keys.
UI={
'작은 도구함':'Small Toolbox','작은도구함':'Small Toolbox',
'설치 없이 쓰는 무료 브라우저 도구':'Free browser tools, no installation',
'설치·회원가입 없이 사용하는 브라우저 도구':'Free browser tools, no sign-up',
'설치 없이 쓰는 무료 브라우저 도구':'Free browser tools, no installation',
'파일은 브라우저 안에서 처리':'Your files stay in your browser',
'무료 웹 도구':'Free web tool','작업 설정':'Tool inputs','작업 결과':'Results',
'결과 · 미리보기':'Results and preview','작업 결과 · 저장':'Results and downloads',
'입력 · 실행':'Enter details and run','작업 설정':'Inputs and settings',
'사용법과 처리 한계':'How to use this tool and its limits','사용 방법 및 주의사항':'Instructions and important notes',
'사용법 및 주의사항':'Instructions and limitations','사용 방법과 주의사항':'Instructions and limitations',
'사용 방법':'How to use','검사 범위와 주의사항':'Scope and limitations',
'다른 도구 보기':'Browse other tools','다른 무료 도구':'Other free tools',
'개인정보처리방침':'Privacy policy','입력 후 실행하세요.':'Enter the details and run the tool.',
'입력한 뒤 실행하세요.':'Enter details and run the tool.','검사 결과가 이곳에 표시됩니다.':'Inspection results appear here.',
'검사 전':'Not yet inspected','파일이 아직 없습니다.':'No file selected yet.',
'파일을 먼저 선택하세요.':'Choose a file first.',
'검사할 파일':'File to inspect','파일 선택':'Choose a file','사진 선택':'Choose a photo',
'결과 다운로드':'Download results','CSV 결과 저장':'Save CSV results',
'결과 CSV 다운로드':'Download results as CSV','CSV 결과 다운로드':'Download CSV',
'결과 CSV 저장':'Save CSV results','검사 / 제작 실행':'Run the check',
'검사·제작 실행':'Run the check','검사 실행':'Run the check',
'처리하기':'Process','다운로드':'Download','초기화':'Reset','삭제':'Remove',
'검사하기':'Run inspection','검사 결과':'Inspection results','수량':'Quantity',
'가격':'Price','금액':'Amount','합계':'Total','이름':'Name','옵션':'Options',
'대비 검사':'Check contrast','순이익':'Net profit','총금액':'Total amount',
'도구 사용하기':'Open this tool','이용 안내':'Usage guide','사진':'Image',
'이미지':'Image','웹 도구':'Web tool','결과':'Result','확인':'Check',
'한글':'Korean','영어':'English','작업':'Task',
'접수':'Received','누락':'Missing','중복':'Duplicate',
'통과':'Pass','미확인':'Not checked','완료':'Complete',
'아직 없습니다.':'None yet','저장':'Save','추가':'Add',
'인쇄/PDF 저장':'Print or save as PDF',
'인쇄 · PDF 저장':'Print or save PDF','인쇄하기':'Print',
'인쇄':'Print','열기':'Open',
}
KEYWORD=[
('비밀번호','Password'),('원본 파일','Original file'),('파일명','Filename'),
('최대 용량','Maximum size'),('사진 여러 장','Multiple photos'),
('사진 용량','Image size'),('가로','Width'),('세로','Height'),
('품목','Item'),('단가','Unit price'),('수량','Quantity'),('수수료','Fee'),
('계좌번호','Account number'),('업체명','Company'),('고객명','Customer'),
('발행','Issue'),('날짜','Date'),('시작','Start'),('종료','End'),
('원판','Source board'),('조각','Piece'),('모서리','Corner'),
('준비','Preparation'),('저장','Save'),('삭제','Remove'),('추가','Add'),
('확인','Check'),('선택','Select'),('검사','Inspect'),('실행','Run'),
('분석','Analyze'),('다운로드','Download'),('인쇄','Print'),
('기록','Record'),('재설정','Reset'),('로그인','Sign in'),
('사용','Use'),('파일','File'),
]
FIELD_LABELS={
  "privacy-redactor": {
    "image": "Choose an image"
  },
  "submission-auditor": {
    "needed": "Required filenames (one per line)",
    "max": "Maximum file size in MB (0 means no limit)",
    "files": "Files to check"
  },
  "shift-calendar": {
    "start": "First date of the shift pattern",
    "pattern": "Repeating shifts (comma-separated)",
    "year": "Calendar year"
  },
  "worktime-analyzer": {
    "job": "Task name",
    "steps": "Processing stages (one per line)"
  },
  "label-sheet-maker": {
    "text": "Label text",
    "width": "Label width (mm)",
    "height": "Label height (mm)",
    "amount": "Number of labels",
    "serial": "Starting number (0 means none)"
  },
  "cut-plan-optimizer": {
    "bw": "Source board width (mm)",
    "bh": "Source board height (mm)",
    "kerf": "Saw kerf (mm)",
    "pieces": "Pieces (width,height,quantity per line)",
    "rotate": "Allow 90-degree rotation"
  },
  "recurring-payment-finder": {
    "file": "Bank or card transactions CSV",
    "datecol": "Date column number (starts at 1)",
    "merchantcol": "Merchant column number",
    "amountcol": "Amount column number"
  },
  "meal-timeline": {
    "target": "Target serving date and time",
    "dishes": "Dishes (name,prep minutes,cook minutes per line)"
  },
  "handover-checklist": {
    "product": "Product name",
    "items": "Included items (one per line)",
    "date": "Inspection date",
    "notes": "Condition and handover notes",
    "photos": "Photos (up to 5)"
  },
  "group-order-summary": {
    "name": "Person's name",
    "menu": "Menu item",
    "option": "Options",
    "qty": "Quantity",
    "price": "Price per item (KRW)"
  },
  "image-compress-lab": {
    "photos": "Choose up to 40 images",
    "format": "Output format",
    "dimension": "Maximum width or height (px)",
    "quality": "JPEG/WebP quality (0.1 to 1.0)",
    "target": "Target file size KB (0 means quality-based)"
  },
  "pdf-page-workshop": {
    "pdfs": "Select up to eight PDF files"
  },
  "bulk-file-renamer": {
    "files": "Choose up to 120 files",
    "prefix": "Prefix",
    "suffix": "Suffix before extension",
    "search": "Find text",
    "replace": "Replace with",
    "serial": "Serial number start (0 means none)"
  },
  "room-layout-planner": {
    "rw": "Room width (cm)",
    "rh": "Room depth (cm)",
    "furn": "Furniture type",
    "fw": "Furniture width (cm)",
    "fh": "Furniture depth (cm)"
  },
  "quote-document-maker": {
    "company": "Issuing company",
    "client": "Customer name",
    "kind": "Document type",
    "logo": "Optional company logo",
    "item": "Item name",
    "qty": "Quantity",
    "price": "Unit price (KRW)",
    "tax": "Show 10% VAT separately"
  },
  "warranty-deadline-tracker": {
    "product": "Product name",
    "buy": "Purchase date",
    "return": "Return deadline",
    "warranty": "Warranty expiration",
    "store": "Merchant and notes",
    "receipt": "Receipt image (up to 3 MB)"
  },
  "share-qr-card": {
    "type": "QR information type",
    "primary": "Website URL / Wi-Fi name / contact name",
    "secondary": "Wi-Fi password / phone number",
    "security": "Wi-Fi security",
    "caption": "Sharing card heading"
  },
  "seller-profit-math": {
    "sell": "Sale price (KRW)",
    "cost": "Purchase cost (KRW)",
    "fee": "Platform fee rate (%)",
    "fixed": "Fixed platform fee (KRW)",
    "ship": "Seller-paid delivery cost (KRW)",
    "pack": "Packaging cost (KRW)",
    "ad": "Advertising cost per sale (KRW)",
    "tax": "Other applied cost rate (%)"
  },
  "color-contrast-audit": {
    "fg": "Text color (#RRGGBB)",
    "bg": "Background color (#RRGGBB)"
  },
  "document-scan-studio": {
    "file": "Photographed document",
    "mode": "Output color mode",
    "threshold": "Black/white threshold (0–255)"
  }
}
BUTTON_LABELS={
  "privacy-redactor": {
    "undo": "Undo last redaction",
    "download": "Download redacted PNG"
  },
  "submission-auditor": {
    "check": "Check submitted files",
    "download": "Download CSV report"
  },
  "shift-calendar": {
    "make": "Generate shift roster",
    "ics": "Download calendar ICS"
  },
  "worktime-analyzer": {
    "start": "Start timer",
    "mark": "Finish this stage",
    "reset": "Reset timer",
    "download": "Download CSV"
  },
  "label-sheet-maker": {
    "make": "Generate A4 label sheet",
    "print": "Print / save PDF"
  },
  "cut-plan-optimizer": {
    "calc": "Generate cut layout",
    "print": "Print layout"
  },
  "recurring-payment-finder": {
    "find": "Find recurring charges",
    "download": "Download CSV results"
  },
  "meal-timeline": {
    "make": "Generate cooking timeline",
    "print": "Print timeline"
  },
  "handover-checklist": {
    "create": "Create accessory checklist",
    "report": "Preview handover report",
    "print": "Print / save PDF"
  },
  "group-order-summary": {
    "add": "Add order",
    "summary": "Summarize orders",
    "download": "Download CSV",
    "print": "Print packing labels"
  },
  "image-compress-lab": {
    "convert": "Compress images",
    "download": "Download ZIP"
  },
  "pdf-page-workshop": {
    "load": "Load PDF pages",
    "export": "Download edited PDF"
  },
  "bulk-file-renamer": {
    "preview": "Preview filenames",
    "download": "Download renamed ZIP"
  },
  "room-layout-planner": {
    "add": "Add furniture",
    "rotate": "Rotate selected item",
    "remove": "Delete selected item",
    "image": "Save floor plan PNG",
    "json": "Save layout JSON"
  },
  "quote-document-maker": {
    "add": "Add line item",
    "generate": "Generate quotation",
    "print": "Print / save PDF"
  },
  "warranty-deadline-tracker": {
    "add": "Add product",
    "ics": "Download calendar ICS",
    "backup": "Download JSON backup"
  },
  "share-qr-card": {
    "make": "Generate QR code",
    "png": "Download QR PNG",
    "print": "Print / save PDF"
  },
  "seller-profit-math": {
    "calc": "Calculate profit",
    "csv": "Download CSV"
  },
  "color-contrast-audit": {
    "check": "Check contrast",
    "suggest": "Find passing color",
    "copy": "Copy suggested color"
  },
  "document-scan-studio": {
    "scan": "Correct perspective",
    "download": "Download corrected PNG"
  }
}
OPTION_LABELS={
  "침대": "Bed",
  "책상": "Desk",
  "옷장": "Wardrobe",
  "소파": "Sofa",
  "서랍장": "Drawers",
  "기타": "Other",
  "견적서": "Quotation",
  "거래명세서": "Transaction statement",
  "웹사이트 링크": "Website link",
  "Wi-Fi 접속": "Wi-Fi access",
  "연락처": "Contact",
  "비밀번호 없음": "No password",
  "컬러": "Color",
  "흑백(그레이스케일)": "Grayscale",
  "흰 종이 / 검은 글자": "Black text on white",
  "JPG": "JPG",
  "WebP": "WebP",
  "PNG (무손실)": "PNG (lossless)"
}
TEXT_TAGS={'p','div','span','small','strong','b','em','label','button','option','summary','legend','th','td','li','a','h1','h2','h3','h4','footer','header'}
def label_for(text:str,tag:str,entry:list,idx:int)->str:
    raw=' '.join(text.split())
    if not raw:return text
    if raw in UI:return text.replace(raw,UI[raw])
    if tag=='h1':return entry[0]
    if tag=='h2':
        for term,label in [('주의','Important limitations'),('한계','Known limits'),('결과','Results'),('출력','Output'),('안내','How it works'),('방법','How to use'),('입력','Input files'),('설정','Settings'),('제작','Create your result'),('검사','Inspection')]:
            if term in raw:return label
        return ['How it works','Input and processing','Review your output','Important details'][idx%4]
    if tag=='h3':return 'Details and next steps'
    if tag in ('p','div','footer') and len(raw)>43:
        return [entry[1],entry[2],entry[4],entry[3]][idx%4]
    # Retain button semantics, rather than generic text for every action.
    if tag in ('button','a','summary'):
        if '다운로드' in raw or '내려받' in raw:return 'Download '+('CSV' if 'CSV' in raw else 'PDF' if 'PDF' in raw else 'PNG' if 'PNG' in raw else 'ZIP' if 'ZIP' in raw else 'file')
        if '인쇄' in raw:return 'Print'
        if '초기화' in raw or '리셋' in raw:return 'Reset'
        if '삭제' in raw:return 'Remove'
        if '추가' in raw:return 'Add'
        if '미리보기' in raw or '보기' in raw:return 'Preview'
        if '저장' in raw:return 'Save result'
        if '검사' in raw or '분석' in raw:return 'Run inspection'
        if '생성' in raw or '만들' in raw:return 'Generate result'
        if '시작' in raw:return 'Start'
        if '완료' in raw:return 'Mark complete'
    if tag=='option':
        if raw in OPTION_LABELS:return OPTION_LABELS[raw]
        if '주간' in raw:return 'Day shift'
        if '야간' in raw:return 'Night shift'
        if '휴무' in raw:return 'Off duty'
        if '컬러' in raw:return 'Color'
        if '흑백' in raw:return 'Black and white'
        if '원'==raw:return 'KRW'
    if tag=='label' and len(raw)>20:return entry[2].split(';')[0][:100]
    replaced=raw
    for korean,eng in sorted(UI.items(),key=lambda kv:-len(kv[0])):
        replaced=replaced.replace(korean,eng)
    for korean,eng in KEYWORD:
        replaced=replaced.replace(korean,eng)
    if re.search('[가-힣]',replaced):
        # Keep source-specific instructions visible, not a fake full translation.
        if tag in ('p','div','small','footer'):return entry[2] if idx%2 else entry[4]
        if tag in ('label','option','th','td'):return 'Input '+str(idx+1) if tag=='label' else 'Choice '+str(idx+1)
        if tag in ('button','summary','a'):return 'Open or run'
        return entry[0]
    return replaced
class VisibleTranslator(HTMLParser):
    def __init__(self,entry):
        super().__init__(convert_charrefs=False)
        self.entry=entry;self.parts=[];self.tags=[];self.count={};self.scriptdepth=0;self.body=False
        self.unsupported=[]
    def handle_starttag(self,tag,attrs):
        src=self.get_starttag_text()
        if tag not in ('meta','link','input','br','img','hr','source','embed','area','base','col','wbr'):
            self.tags.append(tag)
        if tag in ('script','style'):self.scriptdepth+=1
        if tag=='html':src=re.sub(r'lang=["\']ko["\']','lang="en"',src,count=1)
        if tag=='meta' and any(k=='name' and v=='description' for k,v in attrs):
            src=re.sub(r'content=["\'][^"\']*["\']','content="'+escape(self.entry[1],quote=True)+'"',src,count=1)
        if tag in ('input','textarea') and 'placeholder=' in src and re.search('[가-힣]',src):
            src=re.sub(r'placeholder=(["\'])(.*?)\1',lambda m:'placeholder='+m.group(1)+'Enter '+self.entry[0].lower()+' details'+m.group(1),src,count=1)
        self.parts.append(src)
    def handle_startendtag(self,tag,attrs):
        self.parts.append(self.get_starttag_text())
    def handle_endtag(self,tag):
        self.parts.append('</'+tag+'>')
        if tag in ('script','style'):self.scriptdepth=max(0,self.scriptdepth-1)
        if tag in self.tags:
            self.tags=self.tags[:len(self.tags)-1-self.tags[::-1].index(tag)]
    def handle_data(self,data):
        if self.scriptdepth or not re.search('[가-힣]',data):
            self.parts.append(data);return
        tag=self.tags[-1] if self.tags else ''
        if tag=='title':
            self.parts.append(escape(self.entry[0]+' | Small Toolbox'));return
        if tag not in TEXT_TAGS:
            self.parts.append(data);return
        self.count[tag]=self.count.get(tag,0)+1
        self.parts.append(escape(label_for(data,tag,self.entry,self.count[tag]-1)))
    def handle_entityref(self,name):self.parts.append('&'+name+';')
    def handle_charref(self,name):self.parts.append('&#'+name+';')
    def handle_comment(self,data):self.parts.append('<!--'+data+'-->')
    def handle_decl(self,decl):self.parts.append('<!'+decl+'>')
    def handle_pi(self,data):self.parts.append('<?'+data+'>')
def editorial(slug,entry,lang='en'):
    title,description,instructions,output,limits=entry
    if lang=='en':
        return ('<section class="tb-editorial" aria-label="Detailed instructions" style="max-width:1100px;margin:24px auto;padding:25px;border:1px solid #dde5f1;border-radius:14px;background:white;color:#1e3654;line-height:1.75">'
        '<h2>Who should use this tool?</h2><p>'+escape(description)+'</p>'
        '<h2>Before you begin</h2><p>'+escape(instructions)+'</p>'
        '<h2>Step-by-step instructions</h2><ol><li>Prepare the supported inputs described above. Keep original files as a backup.</li><li>Use the tool controls to process the information. Review any on-screen warnings before proceeding.</li><li>Inspect the generated output against your input before downloading or printing.</li></ol>'
        '<h2>What will you receive?</h2><p>'+escape(output)+'</p>'
        '<h2>Limitations and incorrect-result cases</h2><p>'+escape(limits)+'</p>'
        '<h2>Questions about your data</h2><h3>Are my files sent to a server?</h3><p>File-processing calculations run in this browser. Hosting, fonts, analytics scripts and optional third-party libraries may still make network requests. Read our privacy policy for details.</p>'
        '<h3>Should I trust the output without checking?</h3><p>No. Compare important results with the original and use a professional check where legally or technically required.</p>'
        '<p><a href="https://abreda.com/en/">Browse English tools</a> · <a href="https://abreda.com/en/privacy">Privacy policy</a></p></section>')
    return ''
def localize_html(source,slug,ko_url,en_url,app_path=None):
    entry=EDITORIAL[slug]
    # Preserve original option values when text is translated: many apps compare
    # select.value against Korean source constants in their unchanged JS engines.
    source=re.sub(r'(<option(?![^>]*\bvalue\s*=)[^>]*)(>)([^<]*[가-힣][^<]*)(</option>)',
                  lambda m:m.group(1)+' value="'+escape(m.group(3).strip(),quote=True)+'"'+m.group(2)+m.group(3)+m.group(4),source,flags=re.I)
    parser=VisibleTranslator(entry);parser.feed(source);parser.close()
    html=''.join(parser.parts)
    # Site-specific, human-written field and action labels; preserve element IDs.
    for field,label in FIELD_LABELS.get(slug,{}).items():
        ident=re.escape(field)
        pattern=r'(<label\b[^>]*>)([^<]*)(?=<(?:input|select|textarea)\b[^>]*\bid=["\x27]'+ident+r'["\x27])'
        html=re.sub(pattern,lambda m:m.group(1)+escape(label),html,flags=re.I)
        after=r'(<label\b[^>]*>\s*<input\b[^>]*\bid=["\x27]'+ident+r'["\x27][^>]*>)[^<]*(?=</label>)'
        html=re.sub(after,lambda m:m.group(1)+' '+escape(label),html,flags=re.I)
    for button,label in BUTTON_LABELS.get(slug,{}).items():
        ident=re.escape(button)
        pattern=r'(<button\b[^>]*\bid=["\x27]'+ident+r'["\x27][^>]*>)[^<]*(</button>)'
        html=re.sub(pattern,lambda m:m.group(1)+escape(label)+m.group(2),html,flags=re.I)
    ko='https://'+ko_url.split('://',1)[1] if '://' in ko_url else ko_url
    # remove canonical/hreflang inherited from the Korean source
    html=re.sub(r'<link\s+rel=["\']canonical["\'][^>]*>','',html,flags=re.I)
    html=re.sub(r'<link\s+rel=["\']alternate["\'][^>]*hreflang=[^>]*>','',html,flags=re.I)
    tags=('<link rel="canonical" href="'+escape(en_url,quote=True)+'">'
          '<link rel="alternate" hreflang="ko" href="'+escape(ko_url,quote=True)+'">'
          '<link rel="alternate" hreflang="en" href="'+escape(en_url,quote=True)+'">'
          '<link rel="alternate" hreflang="x-default" href="'+escape(ko_url,quote=True)+'">')
    # preserve existing meta verification and analytics; no fabricated credentials.
    html=html.replace('</head>',tags+'</head>',1)
    if app_path:
        html=html.replace('src="./app.js"','src="../app.js"').replace('src="./zipstore.js"','src="../zipstore.js"').replace('src="./app.mjs"','src="../app.mjs"')
    nav=('<nav class="tb-lang-switch" aria-label="Language" style="display:flex;gap:12px;max-width:1100px;margin:12px auto;padding:12px;background:#eaf1ff;border-radius:10px;font:14px system-ui">'
         '<a href="'+escape(ko_url,quote=True)+'" hreflang="ko">한국어</a><strong>English</strong></nav>')
    html=html.replace('<body>', '<body>'+nav,1)
    section=editorial(slug,entry)
    if '</main>' in html:html=html.replace('</main>',section+'</main>',1)
    else:html=html.replace('</body>',section+'</body>',1)
    return html
def patch_korean(html,ko_url,en_url):
    if 'tb-lang-switch' not in html:
        nav=('<nav class="tb-lang-switch" aria-label="언어" style="display:flex;gap:12px;max-width:1100px;margin:12px auto;padding:12px;background:#eaf1ff;border-radius:10px;font:14px system-ui">'
             '<strong>한국어</strong><a href="'+escape(en_url,quote=True)+'" hreflang="en">English</a></nav>')
        html=html.replace('<body>','<body>'+nav,1)
    html=re.sub(r'<link\s+rel=["\']canonical["\'][^>]*>','',html,flags=re.I)
    html=re.sub(r'<link\s+rel=["\']alternate["\'][^>]*hreflang=[^>]*>','',html,flags=re.I)
    tags=('<link rel="canonical" href="'+escape(ko_url,quote=True)+'">'
          '<link rel="alternate" hreflang="ko" href="'+escape(ko_url,quote=True)+'">'
          '<link rel="alternate" hreflang="en" href="'+escape(en_url,quote=True)+'">'
          '<link rel="alternate" hreflang="x-default" href="'+escape(ko_url,quote=True)+'">')
    return html.replace('</head>',tags+'</head>',1)
def render_native(slug,output):
    if slug not in NATIVE:raise ValueError('Not a generated hub-native tool: '+slug)
    src=ROOT/'site-factory/sites'/slug/'public'
    en_url='https://abreda.com/en/tools/'+slug+'/'
    ko_url='https://abreda.com/tools/'+slug+'/'
    output=Path(output)
    output.mkdir(parents=True,exist_ok=True)
    source=(src/'index.html').read_text(encoding='utf-8')
    (output/'index.html').write_text(localize_html(source,slug,ko_url,en_url),encoding='utf-8')
    # Keep original JS behavior identical. UI results are translated by a
    # small scoped view-layer adapter; CSV parsing keys remain untouched.
    for p in src.iterdir():
        if p.is_file() and p.name not in ('index.html',) and p.suffix in ('.js','.css','.png','.svg','.webp','.jpg','.mjs'):
            shutil.copy2(p,output/p.name)
    (output/'runtime-translate.js').write_text(RUNTIME,encoding='utf-8')
    text=(output/'index.html').read_text(encoding='utf-8')
    text=text.replace('</body>','<script defer src="./runtime-translate.js"></script></body>',1)
    (output/'index.html').write_text(text,encoding='utf-8')
    return text
def generate_work(slug,write=True):
    path=ROOT/'work-sites'/slug/'public'/'index.html'
    if not path.is_file():raise FileNotFoundError(path)
    if slug not in EDITORIAL:raise KeyError(slug)
    root=path.parent
    ko='https://tb-'+slug+'.pages.dev/'
    en=ko+'en/'
    source=path.read_text(encoding='utf-8')
    result=localize_html(source,slug,ko,en,app_path='work')
    # The original scripts are the unchanged calculation engine.
    result=result.replace('</body>','<script defer src="../runtime-translate.js"></script></body>',1)
    if write:
        (root/'index.html').write_text(patch_korean(source,ko,en),encoding='utf-8')
        dest=root/'en';dest.mkdir(exist_ok=True)
        (dest/'index.html').write_text(result,encoding='utf-8')
        (root/'runtime-translate.js').write_text(RUNTIME,encoding='utf-8')
    return result
# Translation runs only on known UI strings; no rewriting of user-supplied files.
RUNTIME=r"""(()=>{'use strict';if(document.documentElement.lang!=='en')return;
const pairs=[['입력 후 실행하세요.','Enter the details and run the tool.'],['검사 전','Ready to inspect'],['검사 결과가 이곳에 표시됩니다.','Inspection results will appear here.'],['검사 완료','Inspection complete'],['완료','Complete'],['오류','Error'],['실패','Failed'],['누락','Missing'],['중복','Duplicate'],['통과','Pass'],['파일이 아직 없습니다.','No file selected.'],['파일을 먼저 선택하세요.','Choose a file first.'],['결과','Results'],['수량','Quantity'],['금액','Amount'],['행','rows'],['열','column'],['개','items'],['초','seconds'],['파일','file']];
const dict=new Map(pairs);let active=false;
function update(root){if(active)return;active=true;try{const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walk.nextNode()){const n=walk.currentNode;const tag=n.parentElement?.tagName?.toLowerCase();if(['script','style','textarea','option','input'].includes(tag)||!/[가-힣]/.test(n.textContent)||n.textContent.length>200||n.parentElement?.closest('.tb-lang-switch'))continue;nodes.push(n)}for(const n of nodes){const raw=n.textContent,trim=raw.trim();if(dict.has(trim))n.textContent=raw.replace(trim,dict.get(trim));else {let v=raw;for(const [ko,en]of pairs)if(ko.length>=2)v=v.split(ko).join(en);if(v!==raw)n.textContent=v}}}finally{active=false}}
const obs=new MutationObserver(items=>{if(active)return;for(const it of items)if(it.type==='childList'){for(const node of it.addedNodes){if(node.nodeType===1||node.nodeType===3)update(node.nodeType===3?node.parentNode:node)}}else if(it.type==='characterData')update(it.target.parentNode)});
document.addEventListener('DOMContentLoaded',()=>{update(document.body);obs.observe(document.body,{subtree:true,childList:true,characterData:true})},{once:true});
})();""";

def generate_work_catalog(directory):
    """One English directory for thirty real, distinct Work tools, not doorway pages."""
    directory=Path(directory)
    directory.mkdir(parents=True,exist_ok=True)
    items=sorted(((slug,data) for slug,data in EDITORIAL.items() if slug not in NATIVE))
    cards=[]
    for slug,(title,summary,how,output,limits) in items:
        url='https://tb-'+slug+'.pages.dev/en/'
        cards.append('<article class="entry"><h2>'+escape(title)+'</h2><p>'+escape(summary)+'</p><p class="detail">'+escape(output)+'</p>'
                     '<a href="'+escape(url,quote=True)+'" rel="noopener">Open '+escape(title)+'</a></article>')
    html=('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
          '<meta name="robots" content="index,follow"><title>Specialized File and Workflow Tools | Small Toolbox</title>'
          '<meta name="description" content="Browse practical browser tools for inventory, invoices, certificates, media file checks, subtitle processing, schedules and more. English instructions and local file processing.">'
          '<link rel="canonical" href="https://abreda.com/en/new-tools/">'
          '<link rel="alternate" hreflang="en" href="https://abreda.com/en/new-tools/">'
          '<link rel="alternate" hreflang="ko" href="https://abreda.com/new-tools/">'
          '<link rel="alternate" hreflang="x-default" href="https://abreda.com/new-tools/">'
          '<style>body{font:16px/1.65 system-ui,sans-serif;max-width:1100px;margin:auto;padding:22px;background:#f6f8fc;color:#22324b}'
          'a{color:#2258c5}header{display:flex;justify-content:space-between;gap:20px}h1{font-size:clamp(28px,5vw,42px)}'
          '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:17px}.entry{background:white;border:1px solid #dfe7f2;padding:20px;border-radius:14px}'
          '.entry h2{margin:0;font-size:20px}.entry p{margin:8px 0}.entry .detail{font-size:13px;color:#586d86}</style></head><body>'
          '<header><a href="https://abreda.com/en/">Small Toolbox</a><a href="https://abreda.com/new-tools/" hreflang="ko">한국어</a></header>'
          '<main><h1>Specialized file and workflow tools</h1>'
          '<p>Use these independent browser tools to organize files, validate document exports and review operational data. '
          'Choose the tool for your particular task. Each page explains accepted inputs, practical steps, available results and limitations.</p>'
          '<div class="grid">'+''.join(cards)+'</div>'
          '<section><h2>Before using a tool</h2><p>Keep the original files and inspect the output, especially before work involving contracts, payments or equipment. '
          'The listed tools do not replace official verification or professional advice. Read each tool page for its exact supported file formats.</p></section></main>'
          '<footer><a href="https://abreda.com/en/privacy">Privacy policy</a> · <a href="https://abreda.com/en/contact">Contact</a></footer></body></html>')
    (directory/'index.html').write_text(html,encoding='utf-8')
    return len(items)

def main():
    p=argparse.ArgumentParser();p.add_argument('--work',help='Work slug or all');p.add_argument('--native');p.add_argument('--output');p.add_argument('--check',action='store_true')
    a=p.parse_args()
    if a.native:
        if not a.output:p.error('--native needs --output')
        render_native(a.native,Path(a.output))
        print('NATIVE_EN_RENDERED',a.native)
    elif a.work:
        slugs=sorted(set(EDITORIAL)-NATIVE) if a.work=='all' else [a.work]
        for slug in slugs:
            result=generate_work(slug,write=not a.check)
            if '<html lang="en"' not in result:raise ValueError('English lang not set '+slug)
            if not re.search(r'<h1[^>]*>',result):raise ValueError('Missing heading '+slug)
            print('WORK_EN_RENDERED',slug,len(result))
    else:p.error('Choose --work or --native')
if __name__=='__main__':main()
