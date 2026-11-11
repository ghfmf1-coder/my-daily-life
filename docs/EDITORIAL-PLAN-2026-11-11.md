# ABREDA 2026-11-11 콘텐츠·신규 도구 후보 검토 기록

## 기준
- 본 문서는 **신규 도구 10건의 아이디어**를 정리한 것이며, 구현·공개한 도구가 아니다.
- 2026-11-11 `site-factory/sites/*/site.json` 및 `work-sites/*/public/index.html` 경로에 있는 기존 도구 목록과 기능 주제를 대조했다. 단, 배포·검색 수요/매출·색인 여부 검증은 별개다.
- 공개 조건: 사용자가 입력→실제 결과→다운로드 또는 활용 가능, 중복·개인정보·기능 한계 검증, 한/영 동등 UI 및 사용 가이드.
- 20개 신규 블로그 원고는 `site-factory/content/blog/*.json`에 한국어·영어 각 1종으로 작성. 신규 도구를 만든 것으로 소개하는 문구 없음.
- 기존 블로그 기사와 도구를 중복 연결하지 않도록 `blog_articles.load()`의 도구당 한 편 규칙 유지.
- 사진은 이미 사용 허가 정보가 기록된 기존 큐레이션 이미지 재사용. 새 사진으로 오인하거나 작업 화면인 척 표시하지 않음.
- Google Search Central 'Spam Policies' 및 'People-First Content' 원칙 적용: 검색용 대량 문구 변형, 허위 수치, 자동 재배포 목적의 저품질 기사 금지.

## 신규 도구 아이디어 10개 (기존에 없는 기능 중심)

| # | 아이디어 / 예상 slug | 실제 사용자 문제 | 첫 버전 핵심 기능 | 제한·차별점 |
|---|---|---|---|---|
| 1 | JPEG 메타데이터 제거 확인기 / `jpeg-exif-scrubber` | 사진을 공유할 때 GPS·촬영기종이 포함될까 걱정 | JPEG 파일을 로컬에서 읽고 EXIF 필드 표시 → 픽셀 재인코딩으로 사본 저장 → 결과 재검증 | 기존 개인정보 지우개는 화면의 텍스트를 가리는 도구. PNG·HEIC·GPS 제거 검증 전에는 지원 주장 금지. 재인코딩은 화질·색 관리 영향을 줄 수 있음. |
| 2 | 보이지 않는 문자 찾기 / `invisible-text-inspector` | 복붙한 텍스트에 제로폭 문자·제어문자가 있어 검색·입력 실패 | 보이지 않는 문자 위치/유니코드 이름 시각화, 선택 항목만 제거, 정리 전후 복사 | 기존 원고돋보기는 문장 반복 분석. 정규화로 외국어·이모지 결합을 손상시킬 위험을 설명. |
| 3 | 파일 SHA-256 검증표 / `file-hash-manifest` | 전달받은 파일이 원본과 동일한지 확인하기 어려움 | 브라우저 WebCrypto로 해시 계산, SHA-256 비교, 파일명/해시 목록 내보내기 | 기존 파일 백업·압축 도구와 달리 무결성 비교. 일치해도 악성코드 안전성 보장 불가. |
| 4 | CSV 수식 주입 점검기 / `csv-formula-risk-check` | 외부 CSV를 엑셀로 열 때 `=`, `+`, `-`, `@` 시작 셀 위험 | 위험 후보 셀 표시, 출처별 점검 요약, 검토용 보고서 출력 | CSV 병합·빈 행 제거와 별개인 보안 사전검사. 탐지는 위험 후보일 뿐 공격 여부를 확정하지 않음. |
| 5 | 텍스트 개인정보 검토기 / `text-pii-review` | 안내문·후기·상담 기록을 공개하기 전 연락처가 남아 있는지 점검 | 이메일/전화번호 등 지정 패턴 강조, 수동 확인 후 사본 익명화 | 기존 개인정보 지우개는 이미지 전용. 실제 주민번호 등 수집 없이 로컬 처리, 오탐과 미탐을 고지. |
| 6 | 해외 회의 시간대 조율표 / `timezone-meeting-planner` | 한국과 해외 참가자의 현지 시간을 잘못 약속함 | `Intl` 시간대 변환, 날짜 변경 표시, 각 참가자 현지시각, ICS 내보내기 | 기존 교대근무 달력은 반복 근무표. 기기 tzdata의 최신 DST 반영 여부를 검증. |
| 7 | HTML 제목 구조 점검기 / `heading-outline-audit` | 웹페이지의 H1–H6가 건너뛰거나 문서 구조가 엉킴 | 사용자가 붙여 넣은 HTML에서 H1–H6 계층 출력, 누락/반복 경고 | 기존 색상 대비 검수관과 다른 접근성 분야. 제목 순서만으로 WCAG 전체 적합성을 인증하지 않음. |
| 8 | CSV 날짜 혼합형식 검토기 / `csv-date-ambiguity` | `03/04/2026`이 3월4일인지 4월3일인지 불명확 | 열별 날짜 패턴 표시, 서로 다른 해석 가능성 경고, 자동 변환 없는 검수 보고서 | 기존 CSV 정리기와 달리 원본 날짜 모호성에 집중. 사용자가 기준 로캘을 선택하기 전 자동 수정 금지. |
| 9 | 실질 단가 비교표 / `unit-price-comparator` | 묶음 용량·할인·배송비가 달라 최저가 판단이 어려움 | 수량/중량·실결제 금액·배송비 직접 입력, 동일 단위 환산 후 표 정렬 | 기존 판매 순이익 계산기는 판매자 관점. 품질이나 상품 동일성은 자동 평가하지 않음. |
| 10 | 문서 두 버전 변경점 비교기 / `plain-text-diff-review` | 계약 초안·공고·원고 수정본 중 바뀐 문장을 놓침 | 원문/수정문 붙여넣기, 행별 추가/삭제/변경 강조, 변경 요약 복사 | 기존 재고·송장 비교기는 구조화된 표 대상. 의미적 동등성·법률 해석은 판단하지 않음. |

## 블로그 20편 검토 파일
도구 연계(10): `merge-csv-with-different-columns`, `webnovel-episode-foreshadowing-tracker`, `find-repeated-phrases-in-manuscript`, `fix-delayed-subtitle-timing`, `check-text-background-contrast`, `print-a4-labels-to-correct-size`, `measure-repeating-task-time`, `track-return-and-warranty-deadlines`, `secondhand-handover-items-checklist`, `collect-group-food-orders`.

독립 정보성(10): `excel-csv-utf8-korean-garbled`, `excel-highlight-duplicates-before-removing`, `fill-pdf-form-without-editing-original`, `google-drive-restricted-sharing-guide`, `browser-localstorage-data-preservation`, `write-alt-text-for-website-images`, `scan-qr-code-links-safely`, `google-passkey-shared-device-warning`, `gmail-large-attachment-drive-link`, `pdf-black-box-not-redaction`.

## 스팸 및 발행 전 검수
1. 공식 출처는 정보성 글 JSON의 `sources`에 기관명+원문 링크를 명시했다. 발표·수정 연도가 문서에 기재되지 않은 자료는 연도를 임의로 쓰지 않는다.
2. 모든 글은 해결 순서→대안→실패 조건을 본문에 포함하며 도구는 선택지로만 소개한다.
3. 사진은 기존에 허가 근거가 정리된 큐레이션 파일에서 참조했다. 기사별 신규 사진은 확보하지 않았으므로 사진 중복으로 매거진 품질이 떨어지는지 별도 편집 검토 필요.
4. AI로 작성된 원고이며 실제 사용 후기·전문 자격·독립적인 사용자 실험으로 포장하지 않는다.
5. CI의 `site-factory/tests/test_blog_articles.py` 및 빌드 검증, 한국어/영어 목차·canonical·hreflang·sitemap, 실제 URL을 확인한 뒤 병합한다.
6. 배포 후 성공한 HTTP 200은 Google 색인·상위 노출·방문 성과를 의미하지 않는다.
