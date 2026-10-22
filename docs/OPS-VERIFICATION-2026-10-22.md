# 운영 검증 기록 — 2026-10-22

운영 관제센터: https://adminivo.com/next/
검증 실행: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39796562121
기준: 해당 실행의 실제 D1·Pages API·Google API 응답 로그. 과거 문서 수치를 재사용하지 않았습니다.
검증 로그의 Google 응답 시각: 2026-10-22T14:33:22.998Z.

## 확인된 결과

- D1 읽기 전용 토큰 활성, 조회 성공. Pages 배포용 토큰 권한은 변경하지 않았습니다.
- 운영 서비스 51개. 신규 사이트 30개 모두 원장 등록. 신규 누락 없음.
- service_id·canonical_url 중복 없음. 이번 검증에서 D1 데이터를 변경하지 않았습니다.
- 기존 서비스 21개의 URL이 실제 현재 원장에 존재합니다. 과거 방문·성과 기록의 전후 전체 체크섬 검증은 이번에 수행하지 않았습니다.
- 신규 사이트 원장 상태 deployed_not_listed는 공개 디렉터리 미등록을 뜻합니다.
- Pages production 목록과 원장을 자동 대조하도록 확장했습니다. 임시 시험 사이트를 새로 만들지 않았습니다.
- CATALOG·GSC 최근 수집 기록 정상, 지연 판정 없음.
- 기존 OAuth refresh 재사용으로 실시간 Google sites API와 검색 자료 조회 성공.
- 전체 원장 URL 51개 중 10개는 현재 Google 계정에서 포함하는 속성 접근 가능, 41개는 접근 가능한 속성 없음.
- 조회 가능한 URL의 Google 색인 버전 보고서: PASS 7개, NEUTRAL 3개. 나머지 41개는 미확인.
- 확정 검색 자료 기간 2026-09-25~2026-10-19에서 반환된 행: 2026-10-17 https://novel.abreda.com/en/ 노출 1·클릭 0. 자료가 없는 페이지를 0으로 채우지 않았습니다.
- Google OAuth 권한은 webmasters.readonly입니다. 사이트맵 신규 제출과 사이트 소유권 등록을 수행하지 않았습니다.
- 네이버 기존 계정의 현재 등록·인증·제출 상태는 아직 조회하지 못했습니다.

## 실제 URL Inspection 응답

홈페이지 또는 원장 canonical URL을 검사했습니다. 전체 사이트의 모든 URL을 검사한 결과가 아닙니다.
Google URL Inspection API는 Google에 저장된 색인 버전 상태이며 실시간 크롤링 검사가 아닙니다.

| URL | 판정 | Google 설명 | 같은 호스트 사이트맵 |
|---|---|---|---|
| https://abreda.com/tools/csv-column-extractor/ | PASS | 제출되고 색인이 생성되었습니다. | API에서 반환됨 |
| https://abreda.com/tools/csv-empty-row-remover/ | NEUTRAL | Google에는 아직 알려지지 않은 URL입니다. | API에서 반환됨 |
| https://csv.abreda.com/ | PASS | 제출되고 색인이 생성되었습니다. | API에서 반환됨 |
| https://abreda.com/tools/jsonl-validator/ | PASS | 제출되고 색인이 생성되었습니다. | API에서 반환됨 |
| https://manuscript.abreda.com/ | PASS | 제출되고 색인이 생성되었습니다. | API에서 반환됨 |
| https://novel.abreda.com/ | PASS | 제출되고 색인이 생성되었습니다. | API에서 반환됨 |
| https://abreda.com/tools/srt-sdh-cleaner/ | PASS | 제출되고 색인이 생성되었습니다. | API에서 반환됨 |
| https://stl-print-check.abreda.com/ | NEUTRAL | Google에는 아직 알려지지 않은 URL입니다. | 같은 호스트 항목 없음 |
| https://abreda.com/tools/vtt-cleaner/ | PASS | 제출되고 색인이 생성되었습니다. | API에서 반환됨 |
| https://watch-inspection-lab.abreda.com/ | NEUTRAL | Google에는 아직 알려지지 않은 URL입니다. | 같은 호스트 항목 없음 |

사이트맵이 반환된 항목은 isPending=false, errors=0, warnings=0으로 확인됐습니다.
같은 호스트 항목이 없다는 결과는 모든 다른 속성·교차 호스트 제출 가능성까지 부인하지 않습니다.

## 현재 Google 속성 접근이 없는 URL

아래 목록은 원장 누락 목록이 아닙니다. 현재 OAuth 계정의 접근 가능한 Search Console 속성으로 포함하지 못한 URL입니다.
미등록인지 다른 Google 계정에만 등록됐는지 이 응답만으로 구분할 수 없습니다.

- https://my-daily-life.pages.dev/
- https://tb-aquarium-water-lab.pages.dev/
- https://tb-camera-lens-check.pages.dev/
- https://tb-card-grading-lab.pages.dev/
- https://tb-comic-condition-lab.pages.dev/
- https://tb-gem-photo-inspection.pages.dev/
- https://tb-keyboard-switch-diagnostics.pages.dev/
- https://tb-sneaker-condition-lab.pages.dev/
- https://tb-subtitle-sync-studio.pages.dev/
- https://tb-used-car-inspection.pages.dev/
- https://tb-vinyl-condition-lab.pages.dev/
- https://tb-shipping-audit.pages.dev/
- https://tb-pdf-preflight.pages.dev/
- https://tb-certificate-batch.pages.dev/
- https://tb-inventory-diff.pages.dev/
- https://tb-class-schedule-check.pages.dev/
- https://tb-invoice-reconcile.pages.dev/
- https://tb-purchase-three-way.pages.dev/
- https://tb-svg-laser-check.pages.dev/
- https://tb-video-delivery-check.pages.dev/
- https://tb-static-site-check.pages.dev/
- https://tb-exam-variants.pages.dev/
- https://tb-epub-preflight.pages.dev/
- https://tb-move-evidence.pages.dev/
- https://tb-webtoon-preflight.pages.dev/
- https://tb-option-combinations.pages.dev/
- https://tb-lease-registry-diff.pages.dev/
- https://tb-event-seating.pages.dev/
- https://tb-photo-duplicates.pages.dev/
- https://tb-question-similarity.pages.dev/
- https://tb-silence-finder.pages.dev/
- https://tb-survey-review.pages.dev/
- https://tb-photo-contact-sheet.pages.dev/
- https://tb-tournament-maker.pages.dev/
- https://tb-trip-supplies.pages.dev/
- https://tb-moving-boxes.pages.dev/
- https://tb-audio-quality.pages.dev/
- https://tb-detail-image-review.pages.dev/
- https://tb-dst-embroidery.pages.dev/
- https://tb-show-cues.pages.dev/
- https://tb-shotlist-maker.pages.dev/

## 배포와 검사

- 기존 toolbox-google-ads-oauth Edge Function v10 배포. 기존 OAuth 암호화 저장·Cloudflare Access·보고서 키 경로를 유지했습니다.
- 신규 GitHub OIDC 경로는 지정 저장소 ID·소유자 ID·main·정해진 워크플로와 RSA 서명을 검사합니다.
- 서명 검증 테스트: 정상 증명 허용, 잘못된 audience·저장소·소유자·브랜치·워크플로·이벤트·시간·발급자·알고리즘·변조·키 누락 거부.
- 인증 없는 운영 endpoint 요청은 HTTP 401 github_identity_rejected.
- 운영 Actions에서 D1·Pages·실시간 Google 조회가 완료되는 로그를 확보했습니다.
- GitHub 실행 메타데이터가 queued 상태를 반환해 최종 메타데이터와 완료 로그가 일치하는지 추가 확인이 필요합니다. green check를 근거 없이 완료로 보고하지 않습니다.

## 일반 ChatGPT 운영

[CHATGPT-OPERATIONS.md](CHATGPT-OPERATIONS.md)를 기준으로 GitHub 연결에서 최신 검증 결과를 조회·재실행합니다.
호스팅과 예약 작업에 Work 브라우저 로그인은 필요하지 않습니다.
연결 도구에 실행 권한이 없으면 GitHub Actions 화면의 실행 버튼을 사용합니다. Work 재방문을 기본 해결책으로 삼지 않습니다.

남은 외부 권한: Google 사이트 관리·필요한 소유권 확인 권한 재동의, 네이버 기존 계정 로그인/등록 상태 확인.
새 유료 서비스·새 관제센터를 도입하지 않았습니다.
