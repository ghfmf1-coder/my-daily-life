# 작은도구함 전체 웹앱 검수 — 2026-11-10

일반 ChatGPT Plus 인수인계용. 실제 최신 Actions/원천 응답을 우선한다. 이 문서의 검증 범위를 넘어 전체 기능·실제 사람 방문·전체 색인을 보장하지 않는다.

## 범위와 집계

- 공개 웹앱 71개(도구 70개 + 하루한칸), 허브 1개 별도. 관리자와 기술 배포검사 페이지는 앱 수에서 제외.
- 공개 웹앱 HTTP 200 71개, 허브 포함 72개. 필수 JS/CSS·canonical·사이트맵 오류 0개. 홈 직접 링크 및 `/new-tools/` 경유 연결 확인.
- 실제 D1 원장 72행: 앱 71개 + 카드 도구의 기존 별칭 1행. exact canonical/service_id 중복은 0이나 논리적 별칭 두 행은 별도로 공개한다.
- 문제 유형 10건: 실제 수정·배포 완료 8건, 미해결 2건. 아래 F01~F10 기준이며 영향받은 페이지 수와 혼동하지 않는다.
- 정상은 해당 검사 범위 내 정상이다. 변경 없는 기존 기능은 기존 성공 결과를 재사용했고 모든 기능·파일 형식·브라우저 조합을 다시 검사하지 않았다.

## 변경·배포 근거

- 배포 및 canonical/모니터/Pages 생성 방지: https://github.com/ghfmf1-coder/my-daily-life/commit/d35bdf8f2253070bc13c25dea44505be24de629e
- 결과물·오류 입력·모바일 QA: https://github.com/ghfmf1-coder/my-daily-life/commit/8c1e92d3ed42ce89e8e622788b154508935d6559
- 독립 도구 기능/CSV 검사: https://github.com/ghfmf1-coder/my-daily-life/commit/bf6820b220672318dbd665356ee162033e87cd9c
- 네이버 대표 URL/별칭 분리: https://github.com/ghfmf1-coder/my-daily-life/commit/e68b8765c6b588b76bf3152d29331a7747a7fb44
- 기존 공장 전체 선택 배포: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/42792279034 (success). 신규 10개 프로젝트는 배포 행렬에서 제외, 기존 hub/admin부터 게시.
- 최종 유지보수: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/42793246913 (success), 실제 44개 검사·브라우저 12개 검사 통과.
- 신규 10개 운영 QA: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/42793246943 (success). 정상/오류 입력, ZIP CRC/파일 내용, PDF 로드·페이지 수, PNG 디코딩, JSON 내용, 로컬 저장 재표시·모바일 overflow 검사.
- 이전 10개 기능 QA 재사용: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/42778412179 (success), 이후 app.js 변경 없음.
- 독립 도구 29개 운영 핵심 처리·잘못된/누락 입력·CSV 다운로드: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/42794267343 (success). 배송 대조 도구는 기존 node tests 10개 통과.
- 원장·원천 대조: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/42793247308 및 /42793306217 (success).
- 네이버 수정 후 운영: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/42795084232 (success). canonical_alias는 접수나 색인이 아님.

## 문제별 결과

| ID | 등급 | 문제 | 상태 | 근거·한계 |
|---|---|---|---|---|
| F01 | P2 | 허브 canonical 덮어쓰기 | 수정 완료 | factory.py의 내부 도구 루프가 허브 canonical 변수를 덮어씀. 변수 범위 분리. 운영 canonical·유지보수 통과. |
| F02 | P2 | 인수인계 도구 설명 검사 실패 | 수정 완료 | 실제 구성품·사진·누락 확인 기능에 맞게 description 보완. |
| F03 | P2 | 작업시간 도구 설명 검사 실패 | 수정 완료 | 실제 공정 측정·기록 비교·CSV 기능에 맞게 description 보완. |
| F04 | P2 | 도메인 통합 도구 검사 경로 오류 | 수정 완료 | native 도구는 abreda.com/tools 경로, robots/sitemap은 허브 공유 경로로 검사. SEO 검사를 끄지 않음. |
| F05 | P1 | 최신 10개 브랜치 미병합·미배포 | 수정 완료 | 검증된 브랜치를 main에 포함. 기존 허브에 실제 배포. deploy_mode=hub_only 및 직접 배포 가드로 신규 Pages 생성 방지. |
| F06 | P1 | 최신 10개 Supabase 수집 대상 미등록 | 수정 완료 | 운영 HTTP 확인 후 toolbox_public_site_sources에 누락된 설정 행만 INSERT ON CONFLICT DO NOTHING. 통계 행 생성 안 함. |
| F07 | P1 | 카드 도구 통계 원천 URL 이전 미반영 | 수정 완료 | 동일 site_id의 설정 URL을 검증된 card-grading-lab.abreda.com으로 조건부 변경. 이벤트·일별 통계·분류 변경 없음. 운영 dryRun HTTP 202. |
| F08 | P2 | 네이버 예전 별칭 사이트맵 검사 실패 | 수정 완료 | 같은 cf_project와 원장에 존재하는 설정 대표 도메인만 병합 제출. 별칭·과거 접수는 별도 canonical_alias로 보존. 관련 테스트와 운영 Actions 성공. |
| F09 | P1 | 관제센터 Worker 최신 버전 미배포 | 미해결 | 마지막 배포 settings_read HTTP 401/CF10000, user/account verify 401/CF1000. 토큰 갱신 근거 없어 동일 실패 재시도 안 함. 최신 UI·오늘/7일/30일 화면 검증 불가. |
| F10 | P2 | 카드 도구 원장에 예전 별칭과 대표 도메인 두 행 | 미해결 | 동일 cf_project의 기존 두 service_id를 보존. 논리적 별칭 1행을 실제 별도 앱으로 세지 않음. 최신 Worker의 별칭 표시/정리는 인증 복구 전 운영 검증 불가. 삭제·수치 재작성 안 함. |

## 실제 연동·보존 확인

- 신규 10개는 D1 원장에 listed, cf_project=null로 확인. 기존 허브 하위 경로이며 새 독립 Pages/DNS를 만들지 않았다. 관리자 Pages sites-catalog에도 동일 URL 1개씩 확인.
- Supabase 기존 수집 대상 테이블에 신규 10개 등록 및 카드 원천 URL 설정 1개 수정. raw event/daily의 INSERT/UPDATE/DELETE·스키마 변경은 하지 않았다.
- 신규 10개 collector dryRun은 모두 HTTP 202 / accepted:false / diagnostic:true / unknown. QA 이벤트 ID 두 개의 원천 DB 행 0 확인. 검사 페이지는 tb_test=1 및 webdriver 제외.
- CATALOG 마지막 성공 2026-11-10 18:43:54 KST, GSC 마지막 수집 15:00:50 KST, 읽기 감사에서 오류/지연 없음.
- Windsor GA4 속성 563183346 및 Search Console sc-domain:abreda.com 연결 정상. GA4 11월 8~10일 보고서에 11월 8일 abreda.com page_view=3/tool_complete=3 확인. 11월 10일 행 없음은 방문 0 확정이 아니다.
- GA4 과거 테스트와 실제 이용을 완전히 구분할 debug 원천 항목은 커넥터 행에 없어 구분 검증 불가. Supabase와 합산하지 않는다.
- 네이버 sitemap 검사와 수신/previous_receipt, 계정 소유확인, 실제 색인을 분리. 색인은 unknown 유지.

## 웹앱별 결과

| 웹앱 | 운영 URL | 상태 | 이번 검사 / 재사용 근거 | 관제센터·통계 |
|---|---|---|---|---|
| 수족관 수질 분석실 | [aquarium-water-lab](https://tb-aquarium-water-lab.pages.dev/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 오디오 클리핑 의심·피크 분석 · 채널별 검사 · 작은 도구함 | [audio-quality](https://tb-audio-quality.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 파일명 일괄 정리왕 | [bulk-file-renamer](https://abreda.com/tools/bulk-file-renamer/) | 수정 완료 | 운영 브라우저 정상·오류 입력 / 결과물·모바일 검사 | 원장 등록 / 방문 스크립트 연결 |
| 중고 카메라 렌즈 검수 | [camera-lens-check](https://tb-camera-lens-check.pages.dev/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 트레이딩 카드 PSA 사전 감정 분석 · 포켓몬·원피스·스포츠 카드 | [card-grading-lab](https://card-grading-lab.abreda.com/) | 수정 완료 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 / 원천 URL 수정, 기존 원장 별칭 행 보존 |
| 수료증 일괄 제작 · 명단 CSV에서 PDF 인쇄 · 작은 도구함 | [certificate-batch](https://tb-certificate-batch.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 학원 시간표 겹침 검사 · 강사·교실·학생 중복 · 작은 도구함 | [class-schedule-check](https://tb-class-schedule-check.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 색상 대비 검수관 | [color-contrast-audit](https://abreda.com/tools/color-contrast-audit/) | 수정 완료 | 운영 브라우저 정상·오류 입력 / 결과물·모바일 검사 | 원장 등록 / 방문 스크립트 연결 |
| 코믹북·만화책 상태 검수 | [comic-condition-lab](https://tb-comic-condition-lab.pages.dev/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| csv column extractor · Small Toolbox | [csv-column-extractor](https://abreda.com/tools/csv-column-extractor/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| csv empty row remover · Small Toolbox | [csv-empty-row-remover](https://abreda.com/tools/csv-empty-row-remover/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| CSV 맞춤 병합기 · 열 이름 통일·중복 제거·파일 합치기 | [csv-merge-studio](https://csv.abreda.com/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 자재 재단 설계실 | [cut-plan-optimizer](https://abreda.com/tools/cut-plan-optimizer/) | 정상 | 기존 운영 브라우저 QA 재사용 / 설명 수정은 HTTP 재확인 | 원장 등록 / 방문 스크립트 연결 |
| 상품 상세이미지 규격 검사 · 크기·용량·비율 · 작은 도구함 | [detail-image-review](https://tb-detail-image-review.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 문서 스캔 보정소 | [document-scan-studio](https://abreda.com/tools/document-scan-studio/) | 수정 완료 | 운영 브라우저 정상·오류 입력 / 결과물·모바일 검사 | 원장 등록 / 방문 스크립트 연결 |
| DST 자수 파일 기초 분석 · 스티치·점프 명령 · 작은 도구함 | [dst-embroidery](https://tb-dst-embroidery.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| EPUB 기본 구조 검사 · 전자책 ZIP 필수 항목 · 작은 도구함 | [epub-preflight](https://tb-epub-preflight.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 행사 테이블 배치 · 참가자 그룹별 자동 분배 · 작은 도구함 | [event-seating](https://tb-event-seating.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 시험지 A·B·C형 생성 · 문항 순서와 정답표 · 작은 도구함 | [exam-variants](https://tb-exam-variants.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 보석·원석 외관 검수 | [gem-photo-inspection](https://tb-gem-photo-inspection.pages.dev/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 단체주문 정리왕 | [group-order-summary](https://abreda.com/tools/group-order-summary/) | 정상 | 기존 운영 브라우저 QA 재사용 / 설명 수정은 HTTP 재확인 | 원장 등록 / 방문 스크립트 연결 |
| 구성품 확인증 제작소 | [handover-checklist](https://abreda.com/tools/handover-checklist/) | 수정 완료 | 기존 운영 브라우저 QA 재사용 / 설명 수정은 HTTP 재확인 | 원장 등록 / 방문 스크립트 연결 |
| 사진 용량 다이어트 | [image-compress-lab](https://abreda.com/tools/image-compress-lab/) | 수정 완료 | 운영 브라우저 정상·오류 입력 / 결과물·모바일 검사 | 원장 등록 / 방문 스크립트 연결 |
| 재고 실사 차이 분석 · 장부·실사 수량 대조 · 작은 도구함 | [inventory-diff](https://tb-inventory-diff.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 입금 내역·청구서 대조 · 미입금·금액 차이 검사 · 작은 도구함 | [invoice-reconcile](https://tb-invoice-reconcile.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| jsonl validator · Small Toolbox | [jsonl-validator](https://abreda.com/tools/jsonl-validator/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 키보드 키 입력 진단실 | [keyboard-switch-diagnostics](https://tb-keyboard-switch-diagnostics.pages.dev/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 실측 라벨 제작소 | [label-sheet-maker](https://abreda.com/tools/label-sheet-maker/) | 정상 | 기존 운영 브라우저 QA 재사용 / 설명 수정은 HTTP 재확인 | 원장 등록 / 방문 스크립트 연결 |
| 등기 기재 변경 문구 비교 · 계약 전후 TXT 파일 · 작은 도구함 | [lease-registry-diff](https://tb-lease-registry-diff.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 웹소설 원고돋보기 · 반복 표현·대사·문장 분석 | [manuscript-lens](https://manuscript.abreda.com/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 동시요리 타임라인 | [meal-timeline](https://abreda.com/tools/meal-timeline/) | 정상 | 기존 운영 브라우저 QA 재사용 / 설명 수정은 HTTP 재확인 | 원장 등록 / 방문 스크립트 연결 |
| 입주·퇴거 사진 정리 · 하자 기록용 PDF 출력 · 작은 도구함 | [move-evidence](https://tb-move-evidence.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 이사 박스 내용물 목록 · 박스번호별 물품 정리 · 작은 도구함 | [moving-boxes](https://tb-moving-boxes.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 하루한칸 | [my-daily-life](https://my-daily-life.pages.dev/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 웹소설 연재 설계실 · 회차·복선·인물 관리 | [novel-planner](https://novel.abreda.com/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 상품 옵션 중복 검사 · 쇼핑몰 색상·사이즈 CSV · 작은 도구함 | [option-combinations](https://tb-option-combinations.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| PDF 페이지 수리점 | [pdf-page-workshop](https://abreda.com/tools/pdf-page-workshop/) | 수정 완료 | 운영 브라우저 정상·오류 입력 / 결과물·모바일 검사 | 원장 등록 / 방문 스크립트 연결 |
| 인쇄 PDF 크기·도련 검사 · MediaBox·TrimBox 확인 · 작은 도구함 | [pdf-preflight](https://tb-pdf-preflight.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 사진 연락시트 만들기 · 여러 사진 미리보기·인쇄 · 작은 도구함 | [photo-contact-sheet](https://tb-photo-contact-sheet.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 동일 사진 파일 중복 찾기 · SHA-256 비교 · 작은 도구함 | [photo-duplicates](https://tb-photo-duplicates.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 개인정보 지우개 | [privacy-redactor](https://abreda.com/tools/privacy-redactor/) | 정상 | 기존 운영 브라우저 QA 재사용 / 설명 수정은 HTTP 재확인 | 원장 등록 / 방문 스크립트 연결 |
| 발주서·납품서·청구서 3중 대조 · 품목코드 검사 · 작은 도구함 | [purchase-three-way](https://tb-purchase-three-way.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 문제은행 중복 문항 찾기 · 객관식 CSV 비교 · 작은 도구함 | [question-similarity](https://tb-question-similarity.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 무료 견적서 제작소 | [quote-document-maker](https://abreda.com/tools/quote-document-maker/) | 수정 완료 | 운영 브라우저 정상·오류 입력 / 결과물·모바일 검사 | 원장 등록 / 방문 스크립트 연결 |
| 숨은 정기결제 탐지기 | [recurring-payment-finder](https://abreda.com/tools/recurring-payment-finder/) | 정상 | 기존 운영 브라우저 QA 재사용 / 설명 수정은 HTTP 재확인 | 원장 등록 / 방문 스크립트 연결 |
| 우리집 가구 배치 연구소 | [room-layout-planner](https://abreda.com/tools/room-layout-planner/) | 수정 완료 | 운영 브라우저 정상·오류 입력 / 결과물·모바일 검사 | 원장 등록 / 방문 스크립트 연결 |
| 온라인 판매 순이익 분석기 | [seller-profit-math](https://abreda.com/tools/seller-profit-math/) | 수정 완료 | 운영 브라우저 정상·오류 입력 / 결과물·모바일 검사 | 원장 등록 / 방문 스크립트 연결 |
| QR 공유카드 제작소 | [share-qr-card](https://abreda.com/tools/share-qr-card/) | 수정 완료 | 운영 브라우저 정상·오류 입력 / 결과물·모바일 검사 | 원장 등록 / 방문 스크립트 연결 |
| 교대근무 달력 제작소 | [shift-calendar](https://abreda.com/tools/shift-calendar/) | 정상 | 기존 운영 브라우저 QA 재사용 / 설명 수정은 HTTP 재확인 | 원장 등록 / 방문 스크립트 연결 |
| 송장 누락·중복 검사 · 쇼핑몰 주문 발송 대조 · 작은 도구함 | [shipping-audit](https://tb-shipping-audit.pages.dev/) | 정상 | 기존 실제 코어 회귀 10개 / HTTP·자산 | 원장 등록 / 방문 스크립트 연결 |
| 촬영 샷리스트 정리 · 장면·장소·출연자 목록 · 작은 도구함 | [shotlist-maker](https://tb-shotlist-maker.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 공연 큐시트 오류 확인 · 시간 중복·순서 역전 · 작은 도구함 | [show-cues](https://tb-show-cues.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 오디오 무음 구간 탐지 · 침묵 위치 시간 표시 · 작은 도구함 | [silence-finder](https://tb-silence-finder.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 스니커즈 중고 상태 검수 | [sneaker-condition-lab](https://tb-sneaker-condition-lab.pages.dev/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| srt sdh cleaner · Small Toolbox | [srt-sdh-cleaner](https://abreda.com/tools/srt-sdh-cleaner/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| HTML·CSS·JS 파일 참조 누락 검사 · 정적 사이트 · 작은 도구함 | [static-site-check](https://tb-static-site-check.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 3D 프린팅 출력 사전 점검 | [stl-print-check](https://stl-print-check.abreda.com/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 제출파일 검수관 | [submission-auditor](https://abreda.com/tools/submission-auditor/) | 정상 | 기존 운영 브라우저 QA 재사용 / 설명 수정은 HTTP 재확인 | 원장 등록 / 방문 스크립트 연결 |
| 자막 싱크 조정기 · SRT VTT 변환·자막 시간 오류 검사 | [subtitle-sync-studio](https://tb-subtitle-sync-studio.pages.dev/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 설문 문항 중복·척도 누락 검사 · CSV 점검 · 작은 도구함 | [survey-review](https://tb-survey-review.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| SVG 레이저 도면 구조 검사 · 열린 경로·중복 도형 · 작은 도구함 | [svg-laser-check](https://tb-svg-laser-check.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 토너먼트 대진표 만들기 · 첫 라운드 부전승 · 작은 도구함 | [tournament-maker](https://tb-tournament-maker.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 체험학습 준비물 조별 분배 · 수량 균등 나누기 · 작은 도구함 | [trip-supplies](https://tb-trip-supplies.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 중고차 구매 전 검수실 | [used-car-inspection](https://tb-used-car-inspection.pages.dev/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 영상 납품 누락 확인 · 예정 파일명·실제 파일 대조 · 작은 도구함 | [video-delivery-check](https://tb-video-delivery-check.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| LP 레코드 상태 검수 | [vinyl-condition-lab](https://tb-vinyl-condition-lab.pages.dev/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| vtt cleaner · Small Toolbox | [vtt-cleaner](https://abreda.com/tools/vtt-cleaner/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 보증기간·반품기한 관리소 | [warranty-deadline-tracker](https://abreda.com/tools/warranty-deadline-tracker/) | 수정 완료 | 운영 브라우저 정상·오류 입력 / 결과물·모바일 검사 | 원장 등록 / 방문 스크립트 연결 |
| 명품시계 외관 검수 | [watch-inspection-lab](https://watch-inspection-lab.abreda.com/) | 정상 | 기존 회귀 결과 재사용 / HTTP·JS/CSS·canonical·사이트맵 | 원장 등록 / 방문 스크립트 연결 |
| 웹툰 회차 이미지 규격 검사 · 픽셀·파일 용량 · 작은 도구함 | [webtoon-preflight](https://tb-webtoon-preflight.pages.dev/) | 정상 | 운영 브라우저 핵심 결과·누락 입력 / CSV 파일 확인 | 원장 등록 / 방문 스크립트 연결 |
| 작업시간 분석실 | [worktime-analyzer](https://abreda.com/tools/worktime-analyzer/) | 수정 완료 | 기존 운영 브라우저 QA 재사용 / 설명 수정은 HTTP 재확인 | 원장 등록 / 방문 스크립트 연결 |
| 작은 도구함 · 무료 업무·창작·일상 웹 도구 모음 | [toolbox-hub](https://abreda.com/) | 수정 완료 | 홈 검색·링크 / canonical·사이트맵 복구 | 허브: 별도 운영 페이지 |
| 관제센터 | [adminivo.com/next](https://adminivo.com/next/) | 검증 불가 | Access 인증 경계 정상, 최신 Worker UI 검증 불가 | 원장 등록·원천 감사 성공과 UI 배포 성공은 별개 |

## 남은 사용자 조치

- Worker 마지막 시도: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/42451104534 . settings_read HTTP 401/CF10000, user/account token verify 401/CF1000. 만료/잘못된 값/권한/IP 중 원인은 당시 응답으로 분해 불가. 이번에도 토큰 갱신 근거 없이 같은 인증 실패를 재시도하지 않았다.
- https://dash.cloudflare.com/profile/api-tokens → 기존 Worker 전용 토큰 활성·만료·IP 조건·대상 계정·Account > Workers Scripts > Edit 확인. 기존 Pages/D1 토큰 권한 확대 금지.
- https://github.com/ghfmf1-coder/my-daily-life/settings/secrets/actions → CLOUDFLARE_WORKER_DEPLOY_TOKEN 원문 값 갱신, CLOUDFLARE_ACCOUNT_ID 대조. 토큰을 채팅에 출력하지 말 것.
- https://github.com/ghfmf1-coder/my-daily-life/actions/workflows/toolbox-admin-worker.yml → Run workflow/main. 성공 후 실제 관제센터 1/7/30일·별칭 표시를 원천과 대조해야 완료.

## 일반 Plus에서 이어받는 방법

1. AGENTS.md → docs/CURRENT-STATE.md → 이 문서를 읽는다. 이전 대화·Work 세션·로컬 파일에 의존하지 않는다.
2. 위 commit/Actions를 GitHub 연결로 확인하고 성공 결과는 재사용한다. 실패 원인이 바뀌지 않은 작업은 재시도하지 않는다.
3. 신규 10개는 기존 abreda.com/tools 경로이며 deploy_mode=hub_only. 별도 Pages/DNS를 만들지 않는다.
4. D1 카드 별칭 행은 역사적 ID다. 방문/성과 삭제나 임의 수치 합산으로 중복을 감추지 않는다.
5. 이후 추가 변경은 CURRENT-STATE에 확인 시각·원천·커밋·실제 배포 여부·미완료를 다시 남긴다.
