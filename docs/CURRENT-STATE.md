# 현재 운영 상태 — 작은도구함

확인: 2026-10-23 00:57 UTC (09:57 KST). 일반 ChatGPT Plus는 이 문서와 [CHATGPT-OPERATIONS.md](CHATGPT-OPERATIONS.md), [AGENTS.md](../AGENTS.md)를 먼저 읽고 최신 실행으로 갱신합니다. 과거 대화가 자동 공유된다고 가정하지 않습니다.

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
| 네이버 | 보안 확인 후 로그인 정상. 기존 4개 사이트 관리 접근·사이트맵 등록 확인. 노출/클릭·진단 정보 없음. 나머지 43개 루트는 계정 목록에 없음 |
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

1. 네이버 로그인 및 기존 4개 사이트 확인 완료. 나머지 43개 루트는 계정 목록에 없어 별도 등록·소유확인 필요. 현재 Google/GitHub 브리지는 네이버 계정을 실시간 조회하지 못함. GitHub의 네이버 결과는 아래 시점의 검증 기록이며 자동 갱신 결과가 아님. 비밀번호·보안 답·쿠키를 저장하지 않음.
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

다음 43개 루트는 위 계정 목록에 없습니다. 원장 미등록이 아니라 네이버 계정 미등록이며 Google 등록 완료와 구분합니다. 별도 소유확인 없이 사이트맵 제출 권한이 있다고 가정하지 않습니다.

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
