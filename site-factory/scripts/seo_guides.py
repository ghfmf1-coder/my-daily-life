"""Distinct, people-first guidance for existing Korean and English public tools.
No doorway pages, invented endorsements, misleading schema or keyword stuffing.
Generated visible content is paired by actual product capability and limitations.
"""
import re
from html import escape, unescape

GUIDES = {
  "aquarium-water-lab": {
    "en": [
      "Track aquarium pH, temperature and nitrogen readings across maintenance days.",
      "Enter measured values and review caution flags against species-specific advice.",
      "Caution flags cannot diagnose fish health or confirm the water is safe."
    ],
    "ko": [
      "어항의 수질 측정값을 환수 전후로 비교할 때.",
      "실측 pH·온도·암모니아 값을 입력하고 주의 표시를 확인하세요.",
      "어종별 안전 수치나 생물 건강을 확정하지 않습니다."
    ]
  },
  "camera-lens-check": {
    "en": [
      "Document scratches, haze, autofocus behavior and aperture movement before buying a used lens.",
      "Record your observations and attach photos locally when useful.",
      "A checklist cannot prove there are no hidden optical or mechanical faults."
    ],
    "ko": [
      "중고 렌즈 거래 전 스크래치·자동초점·조리개를 확인할 때.",
      "실제 관찰한 사항과 사진을 기록하고 판매자와 확인하세요.",
      "내부 결함이나 광학 성능을 보증하지 않습니다."
    ]
  },
  "card-grading-lab": {
    "en": [
      "Review centering and visible defects before submitting trading cards for grading.",
      "Check front and back card photos and record any surface or corner concerns.",
      "Photo measurements do not guarantee a PSA grade or authenticity."
    ],
    "ko": [
      "트레이딩 카드를 전문 등급 심사에 보내기 전 상태를 기록할 때.",
      "카드 앞뒷면의 센터링과 표면·모서리 상태를 확인하세요.",
      "PSA 등급이나 진품 여부를 확정하지 않습니다."
    ]
  },
  "comic-condition-lab": {
    "en": [
      "Keep a consistent record of spine, cover and page condition for used comics.",
      "Record observed wear or missing pages and save a condition report.",
      "This is not an official grading certificate or authenticity assessment."
    ],
    "ko": [
      "중고 만화책의 표지·책등·페이지 상태를 기록할 때.",
      "낙장과 손상을 직접 확인해 상태 보고서를 작성하세요.",
      "공식 감정서나 판본·진위 판별은 아닙니다."
    ]
  },
  "csv-column-extractor": {
    "en": [
      "Select only the necessary columns from a large exported CSV file.",
      "Paste or upload CSV data, choose fields and download the reduced result.",
      "Extracting columns does not validate source data values."
    ],
    "ko": [
      "불필요한 열이 많은 CSV에서 필요한 열만 남길 때.",
      "파일을 올리거나 내용을 붙여 넣고 추출할 열을 선택하세요.",
      "원본 데이터 값이 올바른지는 검증하지 않습니다."
    ]
  },
  "csv-empty-row-remover": {
    "en": [
      "Clean rows containing no data from an exported CSV file.",
      "Paste or import CSV content and inspect the cleaned output before download.",
      "An empty cell inside a populated row is not an entirely blank row."
    ],
    "ko": [
      "CSV 병합 전에 공란이나 공백으로만 된 행을 제거할 때.",
      "데이터를 입력하고 처리한 결과를 확인해 저장하세요.",
      "일부 빈 셀이 있는 행은 전체 빈 행과 다릅니다."
    ]
  },
  "csv-merge-studio": {
    "en": [
      "Merge files with mismatched CSV header names into a single table.",
      "Review field mappings, choose duplicate handling and download the merged CSV.",
      "Matching similar headers does not guarantee identical units or meanings."
    ],
    "ko": [
      "서로 다른 열 이름을 가진 CSV를 합칠 때.",
      "파일 여러 개를 선택한 뒤 열 매핑과 중복행 제거 여부를 확인하세요.",
      "열 이름이 비슷해도 값의 단위나 의미는 다를 수 있습니다."
    ]
  },
  "gem-photo-inspection": {
    "en": [
      "Document measurements and visible marks in gemstone photos.",
      "Record dimensions and lighting conditions before sharing an observation report.",
      "Photos cannot establish gemstone identity, treatments, origin or value."
    ],
    "ko": [
      "보석 사진의 치수·외관을 정리해 기록할 때.",
      "실측 값과 촬영 조건 및 특징을 보고서로 남기세요.",
      "진품·가치·원산지는 사진만으로 판단할 수 없습니다."
    ]
  },
  "jsonl-validator": {
    "en": [
      "Find invalid JSON lines before importing a JSONL dataset.",
      "Upload or paste JSONL and inspect the reported error line numbers.",
      "Valid JSON syntax is not proof that the records fit your data schema."
    ],
    "ko": [
      "JSONL 파일을 가져오기 전 문법 오류 행을 찾을 때.",
      "파일이나 텍스트를 입력하고 오류 줄 번호를 확인하세요.",
      "JSON 문법 외의 데이터 스키마는 검증하지 않습니다."
    ]
  },
  "keyboard-switch-diagnostics": {
    "en": [
      "Inspect browser key events when a keyboard key repeats or fails.",
      "Focus the test area and press keys while observing the event log.",
      "Browser and operating-system shortcuts can affect the test."
    ],
    "ko": [
      "키가 씹히거나 반복 입력되는 현상을 확인할 때.",
      "키보드 테스트 영역을 선택하고 실제 키 입력을 확인하세요.",
      "운영체제 단축키와 브라우저 제약이 결과에 영향을 줍니다."
    ]
  },
  "manuscript-lens": {
    "en": [
      "Find repeated wording and unusually long lines while revising a manuscript.",
      "Paste draft text, inspect highlighted patterns and edit in the original document.",
      "It does not judge literary quality, grammar or intended stylistic repetition."
    ],
    "ko": [
      "소설 원고의 반복 표현과 긴 문장을 점검할 때.",
      "원고를 입력하고 반복·장문 결과를 원본에 반영하세요.",
      "작품의 품질이나 의도된 표현까지 판별하지 않습니다."
    ]
  },
  "novel-planner": {
    "en": [
      "Organize planned chapters, characters and unresolved plot threads in a web novel.",
      "Enter chapter outlines and clues, then export backups for later sessions.",
      "This planner does not write chapters or predict reader retention."
    ],
    "ko": [
      "웹소설 회차와 복선·등장인물 관계를 정리할 때.",
      "회차 개요와 복선 정보를 입력하고 백업 파일을 내려받으세요.",
      "자동 집필이나 연독률 예측을 제공하지 않습니다."
    ]
  },
  "sneaker-condition-lab": {
    "en": [
      "Record visible outsole wear, creases and stains before a sneaker resale.",
      "Write observation notes and attach local photos to the report.",
      "Surface observations cannot prove authenticity or hidden material condition."
    ],
    "ko": [
      "중고 운동화의 밑창 마모·주름·오염을 기록할 때.",
      "실제 외관 상태를 확인해 사진과 함께 보고서를 작성하세요.",
      "진품 여부나 내부 소재 상태를 확정하지 않습니다."
    ]
  },
  "srt-sdh-cleaner": {
    "en": [
      "Clean hearing-impaired sound cues and speaker labels from SRT captions.",
      "Load SRT, inspect the cleaned output and save the subtitle file.",
      "Removing SDH cues can discard accessibility information; keep the original."
    ],
    "ko": [
      "SRT 자막에서 효과음·화자 표시를 정리할 때.",
      "자막 파일을 불러와 정리 결과를 확인하고 저장하세요.",
      "접근성을 위한 정보가 제거될 수 있으니 원본을 보존하세요."
    ]
  },
  "stl-print-check": {
    "en": [
      "Review STL triangle counts, dimensions and edge topology before 3D printing.",
      "Select an ASCII or binary STL and review the geometry report.",
      "Geometry checks do not guarantee printability, strength or watertight meshes in every slicer."
    ],
    "ko": [
      "3D 프린팅 전에 STL 삼각형 수와 크기를 확인할 때.",
      "STL 파일을 선택해 기초 지오메트리 결과를 검토하세요.",
      "출력 성공률이나 물성·기계별 설정을 보증하지 않습니다."
    ]
  },
  "subtitle-sync-studio": {
    "en": [
      "Fix subtitle timing offsets or convert between SRT and VTT.",
      "Upload subtitles, adjust time offset or frame-rate compensation, and review cue overlaps.",
      "Always preview synchronization in your video player before publishing."
    ],
    "ko": [
      "SRT·VTT 자막의 시간 오차를 일괄 수정할 때.",
      "자막을 올리고 시간 이동·형식 변환을 한 뒤 겹침을 확인하세요.",
      "최종 영상 재생으로 싱크를 직접 검증해야 합니다."
    ]
  },
  "toolbox-hub": {
    "en": [
      "Find browser-based tools for CSV cleanup, writing drafts and daily routines.",
      "Browse by task or search for a specific problem, then open the corresponding tool.",
      "The catalog lists independent tools; check each tool's supported inputs."
    ],
    "ko": [
      "CSV 정리·원고 퇴고·루틴 관리 도구를 찾을 때.",
      "문제나 작업 유형으로 탐색한 뒤 해당 도구를 열어 사용하세요.",
      "도구별 지원 파일과 처리 한계는 각 서비스에서 확인하세요."
    ]
  },
  "used-car-inspection": {
    "en": [
      "Organize visible used-car condition notes and paint-thickness readings.",
      "Record measured panel readings and items that require follow-up inspection.",
      "Readings cannot certify crash history, ownership or mechanical safety."
    ],
    "ko": [
      "중고차 현장 점검에서 도장 두께와 외관을 기록할 때.",
      "부위별 실측값과 확인이 필요한 사항을 메모하세요.",
      "사고 이력이나 기계적 안전을 확정하지 않습니다."
    ]
  },
  "vinyl-condition-lab": {
    "en": [
      "Describe vinyl surface condition separately from playback observations.",
      "Record visible scratches and listening notes for your collection or resale listing.",
      "A browser checklist cannot verify audio defects without listening."
    ],
    "ko": [
      "LP 레코드의 표면 손상과 실제 재생 상태를 기록할 때.",
      "스크래치와 청음 결과를 구분해 보고서에 작성하세요.",
      "실제로 재생하지 않고 음질 결함을 판단할 수 없습니다."
    ]
  },
  "vtt-cleaner": {
    "en": [
      "Remove timestamps or speaker markers when converting VTT captions to plain text.",
      "Paste or load a WebVTT file and verify the extracted text before saving.",
      "Timestamps are needed for playback; retain a copy of the original VTT."
    ],
    "ko": [
      "VTT 자막에서 시간표시·화자 태그를 정리할 때.",
      "WebVTT 파일을 입력하고 정리한 텍스트를 확인하세요.",
      "영상 자막 재생에 필요한 시간 정보가 제거될 수 있습니다."
    ]
  },
  "watch-inspection-lab": {
    "en": [
      "Record case, crystal, dial and clasp condition before a watch resale.",
      "Enter observations and capture a local condition report.",
      "This is not an authentication service or a mechanical accuracy test."
    ],
    "ko": [
      "중고 시계의 케이스·유리·다이얼·버클 상태를 기록할 때.",
      "실제 외관과 작동을 확인하고 점검 사항을 입력하세요.",
      "정품 감정이나 기계식 정확도 검사는 제공하지 않습니다."
    ]
  }
} 

def enrich_public_guide(slug, rel, html):
    if rel not in ('index.html', 'en/index.html') or slug not in GUIDES or 'tb-practical-guide' in html:
        return html
    lang = 'en' if rel == 'en/index.html' else 'ko'
    when, how, limitation = GUIDES[slug][lang]
    if lang == 'en':
        headings = ('When this tool helps', 'How to use it', 'Important limitations')
        directory_url, directory_label = 'https://abreda.com/en/', 'Explore other English-language tools'
    else:
        headings = ('언제 유용할까요?', '사용 방법', '검사 결과와 한계')
        directory_url, directory_label = 'https://abreda.com/', '다른 한국어 도구 살펴보기'
    section = ('<section class="tb-practical-guide" aria-label="Tool guidance" '
       'style="max-width:1100px;margin:26px auto;padding:23px;border:1px solid #d7e2ef;'
       'border-radius:16px;background:#fff;color:#223452;line-height:1.75">'
       '<h2>'+escape(headings[0])+'</h2><p>'+escape(when)+'</p>'
       '<h2>'+escape(headings[1])+'</h2><p>'+escape(how)+'</p>'
       '<h2>'+escape(headings[2])+'</h2><p>'+escape(limitation)+'</p>'
       '<p><a href="'+escape(directory_url, quote=True)+'">'+escape(directory_label)+'</a></p></section>')
    if '</body>' not in html:
        raise ValueError('Public document has no closing body tag: '+slug+'/'+rel)
    if '</main>' in html:
        html = html.replace('</main>', section + '</main>', 1)
    else:
        html = html.replace('</main>', section + '</main>', 1) if '</main>' in html else html.replace('</body>', section + '</body>', 1)
    # Short or generic descriptions should tell readers which action is possible.
    match = re.search(r'<meta\s+name=["\x27]description["\x27]\s+content=["\x27]([^"\x27]*)["\x27]', html, re.I)
    if match and len(unescape(match.group(1))) < 85:
        summary = (when + ' ' + how).strip()
        if len(summary) > 165:
            summary = when
        html = html[:match.start(1)] + escape(summary, quote=True) + html[match.end(1):]
    if lang == 'en':
        html = html.replace(' | 작은도구함</title>', ' | Small Toolbox</title>', 1)
    return html
