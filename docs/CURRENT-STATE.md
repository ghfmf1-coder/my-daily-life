# 현재 운영 상태 — 작은도구함

**최신 사용자 결정: 네이버 사이트별 수동 소유확인·보안문자 및 계정 사이트맵 수동 제출은 운영 범위에서 제외. 하단 최신 결정이 과거 대기 목록보다 우선합니다.**

최신 자동화 검증: 2026-10-23 01:22 UTC (10:22 KST). Google 색인·처리 건수 표는 00:57 감사 시점이며, 이후 인증·동기화 재검증과 네이버 결과는 하단 실행 증거를 따릅니다. 일반 ChatGPT Plus는 이 문서와 [CHATGPT-OPERATIONS.md](CHATGPT-OPERATIONS.md), [AGENTS.md](../AGENTS.md)를 먼저 읽고 최신 실행으로 갱신합니다. 과거 대화가 자동 공유된다고 가정하지 않습니다.

## 실제 운영 검증

| 항목 | 결과 |
|---|---|
| 운영 주소 | https://adminivo.com/next/ 유지 |
| 저장소 | ghfmf1-coder/my-daily-life 유지 |
| Cloudflare 인증 | 별도 D1 Read 토큰 활성·실제 SELECT 정상. 기존 Pages 토큰 권한 확대 없음 |
| 원장 | 운영 서비스 51개, 기존 21개 및 신규 30개 존재 |
| 누락·중복 | 신규 누락 없음, production 프로젝트 누락 없음, canonical URL·service ID 중복 각각 0 |
| 신규 30개 상태 | deployed_not_listed는 원장 등록됨·공개 디렉터리 미등재를 의미 |
| 자동 동기화 | CATALOG ok (00:54:55 UTC), GSC ok (00:00:58 UTC), 지연·오류 없음. ADSENSE no_rows는 자료 없음 |
| Google OAuth | 기존 연결 refresh·실제 sites API 정상. 관리·신규 소유권 capability 모두 true |
| Google 소유권 | 원장 URL 51개 모두 accessible. 서로 다른 사이트 루트 47개 모두 인증·속성 접근 확인 |
| Google 사이트맵 | 47개 모두 제출됨. 재실행 already_submitted 47·attention 0 |
| 사이트맵 처리 | 최종 조회에서 고유 47개, pending 41개·오류 0·경고 0. 제출과 처리 완료를 구분 |
| Google URL 검사 | 원장 URL 51개 중 PASS 36·NEUTRAL 15. 해당 URL의 색인 버전이며 전체 사이트 색인 보장 아님 |
| 검색 성과 | 조회 기간 2026-09-26~2026-10-20. API 반환 행: novel.abreda.com/en/, 2026-10-17, 노출 1·클릭 0. 다른 사이트의 자료 없음은 0 확정 아님 |
| 네이버 | 계정 목록 47개·7개 소유확인/사이트맵 제출 확인. 나머지 40개는 인증 태그 배포 완료·소유확인 보안문자 및 계정 사이트맵 제출 대기. 47개 모두 공식 IndexNow HTTP 200 수신 확인 |
| 보존 | 감사는 D1 읽기만 수행. 기존 원장·통계·성과·OAuth 삭제/초기화 없음. 전체 과거 기록 전후 체크섬 검사는 미실시 |

## 실제 실행 증거

- Google 전체 설정 재검증 **success**: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39880905498
- 최종 D1·Google 읽기 감사 **success**: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39880963207
- 누락 사이트맵 수정 배포·기존 회귀 검사 **success**: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39880807833
- 재개 첫 실행 39880623650은 소유권 잔여 3개 성공·사이트맵 1개 누락으로 failure였고, 위 후속 실행에서 해결됨.
- 실제 중고차 사이트맵 파일을 추가하고 배포. 인증용 재배포도 factory.prepare를 사용하도록 고쳐 생성된 검색 파일을 보존.
- OIDC 보안 검사 통과: 정상 서명 허용, 잘못된 repo/owner/ref/workflow/event/audience/issuer/시간/알고리즘/변조 거부, audit/setup 신원 교차 사용 거부.

## Work 없이 운영

기존 Worker의 분당 원장 동기화와 Google 수집 Cron 유지. GitHub 읽기 감사와 Google setup은 각각 UTC 매 6시간 37분·47분 및 지정 배포 완료 후 실행합니다. GitHub 예약 실행은 지연될 수 있습니다.

Google setup은 현재 활성입니다. search-setup-request.json은 paused:false이며 워크플로 reconcile 활성·cancel-in-progress:false입니다. Plus의 GitHub 파일 쓰기로 requestId만 새 값으로 바꾸면 재실행됩니다. 실행 도구가 있는 채팅은 최신 main 작업 재실행도 가능합니다. 없는 경우 Actions UI를 사용하며 Work가 필수 조건은 아닙니다.

서버 v17은 paused가 정확히 false인 경우만 setup 쓰기를 허용하고, 제어 파일 조회 실패는 차단합니다. 중단 요청 시 paused:true로 바꿉니다. 이미 처리된 항목은 재사용하고 소유권·서비스를 삭제하지 않습니다.

## 남은 확인

1. 네이버 계정 항목 47개 추가 확인. 소유확인·사이트맵 제출 7개 완료. 나머지 40개는 보안문자 검증 대기. 47개 사이트의 로그인 없는 공식 IndexNow 수집 요청은 성공. 아래 최신 절의 자동 결과와 계정 수동 검증 시점을 구분하며 쿠키·비밀번호를 저장하지 않음.
2. Google pending 사이트맵과 NEUTRAL URL은 후속 읽기 감사에서 확인. 색인을 강제로 완료 처리하지 않음.
3. 새 임시 사이트 생성 실험은 미실시. 기존 30개 실제 배포와 D1 일치 및 성공 production 프로젝트 동적 대조·배포 후 감사 경로를 확인했음.

## 유지할 소스와 인증

- Cloudflare Worker: site-factory/admin-worker/worker.mjs. Google edge 소스로 덮어쓰지 않음.
- Google: 기존 Supabase 프로젝트 ytifxhpizractdeytrok, 함수 toolbox-google-ads-oauth v17. 소스 site-factory/admin-worker/google-oauth-edge/.
- 읽기 감사: .github/workflows/work-registry-readonly-audit.yml
- 등록/제출: .github/workflows/toolbox-google-setup.yml
- 드라이버: site-factory/ops/google_search_setup.py
- 제어: site-factory/ops/search-setup-request.json
- GitHub Secret 이름만: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_READ_TOKEN, CLOUDFLARE_API_TOKEN. 실제 값은 기록하지 않음.
- Google refresh token·client secret은 기존 Supabase 비밀/암호화 저장에 유지. GitHub는 별도 audit/setup OIDC 사용.

Google 재동의와 기존 프로젝트 Site Verification API 활성화는 완료됐습니다. 실제 새로운 오류 근거 없이 반복 요청하지 않습니다. Cloudflare 원격 로그인 과거 실패를 계정 부재로 해석하지 않습니다.

변경 이력: [OPERATIONS-CHANGELOG.md](OPERATIONS-CHANGELOG.md). 최초 과거 검증: [OPS-VERIFICATION-2026-10-22.md](OPS-VERIFICATION-2026-10-22.md). 최신 실제 로그가 과거 기록보다 우선합니다.

## 네이버 공식 화면 후속 확인 — 2026-10-23

사용자가 추가 보안 확인을 완료한 뒤 공식 서치어드바이저 계정 목록·사이트별 요약을 확인했습니다. 계정 이름·비밀번호·쿠키는 기록하지 않습니다.

| 사이트 | 계정 등록 | 사이트맵 | 노출/클릭·진단 |
|---|---|---|---|
| https://abreda.com | 확인 | 등록됨 | 정보 없음 |
| https://csv.abreda.com | 확인 | 등록됨. 제출 목록 sitemap.xml, 26.10.18 21:08:10 | 정보 없음 |
| https://manuscript.abreda.com | 확인 | 등록됨 | 정보 없음 |
| https://novel.abreda.com | 확인 | 등록됨 | 정보 없음 |

각 요약에서 HTTPS 리다이렉션 정상, 보안 인증서는 '확인중 입니다.'로 표시됐습니다. 사이트맵 등록은 네이버 전체 색인 완료의 증거가 아닙니다. 제공되지 않은 노출·클릭을 0으로 표시하지 않습니다. 기존 4곳의 사이트맵은 중복 제출하지 않았습니다.

목록 근거: https://searchadvisor.naver.com/console/board

다음 43개 루트는 이 절의 최초 확인 시 계정 미등록이었으며, 이후 계정 항목 추가와 태그 배포를 완료했습니다. 현재는 소유확인 CAPTCHA 및 계정 사이트맵 제출 대기 목록입니다. Google 등록·IndexNow 수신과 구분합니다.

- https://my-daily-life.pages.dev/
- https://stl-print-check.abreda.com/
- https://tb-aquarium-water-lab.pages.dev/
- https://tb-audio-quality.pages.dev/
- https://tb-camera-lens-check.pages.dev/
- https://tb-card-grading-lab.pages.dev/
- https://tb-certificate-batch.pages.dev/
- https://tb-class-schedule-check.pages.dev/
- https://tb-comic-condition-lab.pages.dev/
- https://tb-detail-image-review.pages.dev/
- https://tb-dst-embroidery.pages.dev/
- https://tb-epub-preflight.pages.dev/
- https://tb-event-seating.pages.dev/
- https://tb-exam-variants.pages.dev/
- https://tb-gem-photo-inspection.pages.dev/
- https://tb-inventory-diff.pages.dev/
- https://tb-invoice-reconcile.pages.dev/
- https://tb-keyboard-switch-diagnostics.pages.dev/
- https://tb-lease-registry-diff.pages.dev/
- https://tb-move-evidence.pages.dev/
- https://tb-moving-boxes.pages.dev/
- https://tb-option-combinations.pages.dev/
- https://tb-pdf-preflight.pages.dev/
- https://tb-photo-contact-sheet.pages.dev/
- https://tb-photo-duplicates.pages.dev/
- https://tb-purchase-three-way.pages.dev/
- https://tb-question-similarity.pages.dev/
- https://tb-shipping-audit.pages.dev/
- https://tb-shotlist-maker.pages.dev/
- https://tb-show-cues.pages.dev/
- https://tb-silence-finder.pages.dev/
- https://tb-sneaker-condition-lab.pages.dev/
- https://tb-static-site-check.pages.dev/
- https://tb-subtitle-sync-studio.pages.dev/
- https://tb-survey-review.pages.dev/
- https://tb-svg-laser-check.pages.dev/
- https://tb-tournament-maker.pages.dev/
- https://tb-trip-supplies.pages.dev/
- https://tb-used-car-inspection.pages.dev/
- https://tb-video-delivery-check.pages.dev/
- https://tb-vinyl-condition-lab.pages.dev/
- https://tb-webtoon-preflight.pages.dev/
- https://watch-inspection-lab.abreda.com/

## 네이버 자동화 운영 검증 — 2026-10-23 01:22 UTC

- 계정 목록 실제 DOM: 47개 항목, 43개 소유확인 진행 표시. 로그인 재요청 없이 기존 세션으로 등록 항목을 추가.
- 공개 인증 태그 43개 운영 페이지 확인. 전체 47개 IndexNow 공개 파일·유효한 사이트맵·robots 사이트맵 안내 확인.
- 직접 네이버 IndexNow HTTP 200: 47개(이번 응답 또는 앞선 실제 수신 기록). 계정 소유확인·사이트맵 제출·실제 색인과 별개.
- 검증 실행 success: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39883449374
- 승인 사이트 기존 회귀 검사 및 배포 success: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39882895140
- 배포 후 Google setup success: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39883412886
- 후속 D1/Google 감사 success: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39883239570 (원장 51·누락/중복 없음·동기화 정상·Google 접근 불가 없음).
- 초기 Naver 실행 39882737690은 단일 URL POST 422 및 잘못된 원장 대표 프로젝트 선택으로 실패. 공식 단일 URL GET 사용과 실제 Pages domain→project 매핑으로 수정 후 위 성공 확인. abreda.com은 원장 첫 대표값 tb-pages-csv-column-extractor와 실제 serving project tb-toolbox-hub가 달랐음. 원장 ID/데이터를 변경하지 않고 배포 대상만 API로 판별.
- 자동등록 방지 화면 실제 문구: '프로그램을 이용한 자동등록을 방지하기 위해 보안절차를 거치고 있습니다.' 현재 소유확인 CAPTCHA를 우회·해제하지 않았고, 소유확인 성공으로 보고하지 않음.

### Plus가 읽고 실행할 파일

- 최신 자동 결과: site-factory/ops/naver-search-result.json
- 공개 인증 태그 및 소유확인/계정 사이트맵 마지막 확인 상태: site-factory/ops/naver-public-sites.json
- Plus 재실행 요청: site-factory/ops/naver-search-request.json의 requestId를 새 값으로 저장.
- 워크플로: .github/workflows/toolbox-naver-search.yml. UTC 매 6시간 17분, Google setup 완료 후, 요청 파일 갱신 시 실행.
- 기존 Google setup은 UTC 매 6시간 47분 및 지정 배포 완료 후 D1의 새 사이트를 처리. 네이버 자동화도 실제 D1을 매번 읽어 새 사이트를 발견하고 공개 증명 파일/사이트맵 안내를 배포한 뒤 수집 요청.
- 승인 사이트의 일반 배포도 공식 네이버 IndexNow에 직접 통지. 변경 없는 결과는 재사용하고 새 URL/공개 콘텐츠 변경을 통지하도록 보완.
- 미래 사이트의 네이버 계정 소유확인 태그는 공식 화면에서 발급받기 전까지 생성했다고 가정하지 않음. 미등록/소유확인 대기는 명시적으로 보고. 현재 지원 경로에서 계정 CAPTCHA 단계를 GitHub-only 무인 처리했다고 주장하지 않음.
- 계정 등록 결과는 consoleStatus, 계정 사이트맵 제출은 sitemapSubmission, 공개 사이트맵 유효성은 sitemapFile, IndexNow 수신은 indexNow.http로 분리. publication=live가 계정 소유확인을 뜻하지 않음.

공식 근거: https://searchadvisor.naver.com/guide/indexnow-request , https://searchadvisor.naver.com/guide/indexnow-faq . IndexNow는 서치어드바이저 사이트맵 제출과 같지 않으며 수신 성공이 색인을 보장하지 않습니다.

이번 자동화에 네이버 비밀번호·쿠키·OAuth를 저장하지 않았으며 추가 유료 서비스를 도입하지 않았습니다. Work/브라우저가 종료돼도 공개 수집 요청 자동화와 결과 조회는 GitHub에서 유지됩니다. 네이버 계정의 무인 소유확인까지 완료됐다는 뜻은 아닙니다.

## 최신 계정 확인 및 한글 알림 — 2026-10-23 01:34 UTC

- 사용자가 이번 네이버 소유확인 보안문자 처리를 승인했습니다.
- my-daily-life.pages.dev는 계정 목록에서 소유확인 완료를 확인하고 sitemap.xml 제출 목록을 확인.
- stl-print-check.abreda.com 및 tb-aquarium-water-lab.pages.dev는 실제 '사이트 소유 확인이 완료되었습니다' 응답과 제출된 sitemap.xml 행을 확인.
- 기존 4개를 포함해 계정 소유확인·사이트맵 제출 7개 완료, 40개 대기.
- tb-audio-quality.pages.dev에서 승인된 보안문자 1회 제출 후 '자동등록을 방지하기 위한 보안절차 검증에 실패하였습니다' 응답. 이 브라우저에서 반복 시도를 중단했습니다. 계정 부재나 로그인 실패로 해석하지 않습니다.
- 실패한 보안문자 내용·답·계정 개인정보·쿠키는 저장하지 않습니다. 성공한 상태만 naver-public-sites.json에 반영.
- 사용자가 알림을 한글로 요청했습니다. 워크플로 12개 제목과 실행 제목, 단계명, 구글/네이버 요약, 유지보수 오류/복구 알림 본문을 한글로 변경. 기계용 상태 키·진단 코드·파일명과 보안 검증은 유지.
- 워크플로 이름을 참조하는 workflow_run 연결을 같은 커밋에서 함께 변경. OIDC의 워크플로 파일 경로·audience·권한은 유지.
- 일반 Plus의 GitHub 연결은 최신 결과 JSON을 읽고 재실행 요청 파일의 requestId를 변경하는 기존 경로를 사용. 브라우저 보안문자 처리와 서버 자동 수집은 구분합니다.

## 사용자 정정 반영 — ChatGPT 알림창 언어

사용자가 한글로 바꾸라고 요청한 대상은 ChatGPT 자체의 알림창이었습니다. GitHub 알림으로 잘못 해석해 바꾼 워크플로 제목·단계·요약과 본문은 원래대로 복구했습니다. 네이버 7개 실제 소유확인/사이트맵 제출 상태와 Plus용 실행·조회 기능은 유지합니다. 직접 작성하는 ChatGPT 작업 안내·질문은 한국어를 사용합니다. ChatGPT 앱의 고정 시스템 알림창을 이 저장소에서 바꿨다고 보고하지 않습니다.

오디오 도구는 승인된 보안문자 재확인에서도 검증 실패를 반환했습니다. 추가 반복 시도를 중단했으며 신규 소유확인 성공으로 표시하지 않습니다.

## 네이버 수동 소유확인 제외 — 2026-10-23 사용자 결정

사용자 지시로 사이트마다 네이버 계정 소유확인·보안문자를 처리하는 작업과 그에 종속된 계정 사이트맵 수동 제출을 기본 운영 범위에서 제외합니다. 이를 미해결 장애나 필수 후속 작업으로 취급하거나 자동으로 재개하지 않습니다. 사용자가 별도로 요청할 때만 진행합니다.

기존 등록·소유확인·제출 기록과 공개 인증 태그는 보존합니다. consoleStatus/sitemapStatus의 미완료 상태를 완료로 바꾸지 않습니다. 기존 Google 자동 소유확인·사이트맵 제출, D1 동기화, 네이버 공개 사이트맵·robots 안내·공식 IndexNow 수집 알림은 유지합니다. 네이버 계정 보고서가 없는 사이트의 노출·클릭은 확인 불가이며 0으로 표시하지 않습니다.

소유확인은 검색 노출의 필수 조건이 아닙니다. 검색과 무관하다는 뜻은 아니며, 등록/소유확인은 관리 보고서와 수집 관리에 쓰입니다. IndexNow 수신도 실제 색인·노출을 보장하지 않습니다. 공식 근거: 네이버 서치어드바이저 「사이트 등록 및 소유확인」 https://searchadvisor.naver.com/guide/faq-start-register (문서 발표 연도 미표기, 2026-10-23 확인).

최신 실제 추가 검증: tb-audio-quality.pages.dev 및 tb-camera-lens-check.pages.dev 소유확인과 sitemap.xml 제출을 확인해 커밋 96227359ff5b89417c2081217f07c052a05d137c에 저장했습니다. 이전 절의 대기/실패 기록은 당시 이력이며 최신 사이트별 상태는 naver-public-sites.json을 따릅니다. 다음 tb-card-grading-lab.pages.dev 보안문자 단계에서 수동 등록 작업을 중단했습니다.
