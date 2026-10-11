#!/usr/bin/env python3
"""Create a new reusable mini-app skeleton; the hub and sitemap auto-discover it."""
import json
import re
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
if len(sys.argv)<4:
    raise SystemExit('사용법: python3 scripts/new_app.py 영문-slug "앱 이름" "설명"')
slug,title,desc=sys.argv[1:4]
if not re.fullmatch(r'[a-z][a-z0-9]*(?:-[a-z0-9]+)*',slug):
    raise SystemExit('앱 주소에는 소문자 영어, 숫자, 하이픈만 사용할 수 있습니다.')
p=ROOT/'apps'/slug
if p.exists():raise SystemExit('같은 이름의 앱이 이미 있습니다.')
p.mkdir(parents=True)
data={'title':title,'description':desc,'category':'편의 도구','icon':'🧰','keywords':[title],
    'intro':desc,'how_to':['아래 입력칸에 값을 입력하세요.','계산 결과를 확인하세요.'],
    'faq':[{'q':f'{title}는 무료인가요?','a':'네. 누구나 회원가입 없이 사용할 수 있습니다.'}]}
(p/'app.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(p/'widget.html').write_text('''<section class="widget panel" aria-label="도구 화면"><label class="label" for="tool-input">내용 입력</label><input id="tool-input" placeholder="값을 입력해 주세요"><p class="result" id="tool-result" aria-live="polite"></p></section>\n''',encoding='utf-8')
(p/'widget.js').write_text("(()=>{'use strict';const el=document.querySelector('#tool-input');if(!el)return;const output=document.querySelector('#tool-result');el.addEventListener('input',()=>{output.textContent=el.value});})();\n",encoding='utf-8')
print(f'완료: {p.relative_to(ROOT)}')
print('app.json 설명과 widget.html/widget.js 기능을 구현한 뒤 python3 build.py를 실행하세요.')
