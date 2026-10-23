# 관제센터 통계 복구 — 2026-10-23

## 변경 및 검증 범위

기존 adminivo.com/next/와 D1/Supabase/Google OAuth를 유지. worker.mjs의 환경변수 기반 연결 판정을 report_sync 실제 API 수집 상태로 변경. pages.dev를 포함하고 영어/하위 페이지 검색 지표는 가장 구체적인 서비스에 귀속한다. 날짜별 자료 없음은 null이며 0으로 만들지 않는다. AdSense no_rows는 보고 자료 없음, error는 오류, unconnected는 미연결, 검증 기록 부재는 미확인이다.

legacy-bridge.mjs는 기존 집계·수동 이력과 신규 public daily, 기존 분류 이벤트를 읽는다. 같은 서비스/날짜에 신규 공개 분류 집계가 있으면 그것을 우선하고 기존 분류는 중복 합산하지 않는다. 원래 일별 전체 합계와 수동 이력은 별도 표시·보존한다. 과거 automated에는 봇도 포함되므로 소급 분리하지 않는다. 사람 추정 세션은 고유 이용자나 고객으로 확정하지 않는다.

toolbox-public-visit v2에서 신규 봇/자동화/사람 추정/판별 불가 분리. dryRun 진단 요청은 방문 이벤트를 쓰지 않는다. 정확한 허용 도메인과 고정 저장소의 visit-sites.json에서 승인한 원천만 수집한다. 새 승인 사이트는 기존 배포 후 재조정에서 추적 태그 및 원천을 보완한다. RLS와 기존 함수의 service_role 전용 실행 권한 유지. 봇 카테고리 제약 허용만 확장했고 기존 행 삭제/초기화 없음.

## 실제 배포

- Supabase: toolbox-admin-legacy-read v2, toolbox-public-visit v2, toolbox-google-ads-oauth v18. 기존 암호화 OAuth 레코드는 변경하지 않음. 수집기 첫 배포는 import_map 경로 오류로 거부됐으나 명시적 deno.json으로 재배포 성공.
- 코드 커밋 c09852dab71c08aacb87936b8b29fda859735f3c.
- Worker 배포 https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39912159130 는 테스트 통과 후 Workers API HTTP 403으로 실패. 기존 Pages 토큰 권한을 변경하지 않음. CLOUDFLARE_WORKER_DEPLOY_TOKEN에 기존 계정 Workers Scripts Edit 전용 권한이 필요함. 새 Worker나 D1 권한은 필요하지 않음. 코드만으로 배포 완료라 표시하지 않음.
- 공개 사이트 배포 및 전체 원천 대조는 후속 실행 로그로 검증한다. 관제센터 실화면은 기존 Cloudflare Access 로그인 필요. 로그인·권한 요청은 실제 배포 준비 이후 이 차단 단계에 한정한다.

## 보존 기준

작업 전 기존 daily 16행, 110세션/122PV, 행 체크섬 008b6a10c17444255a25759a9d85a4aa. workspace version 140, metrics 18건. 작업 중 원천은 정상 수집과 별도 관리 작업으로 갱신될 수 있어 전체 체크섬 변경을 삭제 증거로 해석하지 않는다. 2026-10-23 카메라 렌즈 likely_human 2세션/2PV는 원천과 대조. 테스트는 dryRun만 사용하며 고객 실적으로 보고하지 않는다.

## 자동 검증

기존 공장 Python 회귀 52개, Worker 인증/통합 12개, Google 보고서·OIDC 검증 및 신규 통계 모델 테스트 통과. visit_coverage_audit.py는 원천별 운영 HTML·스크립트·기존 영어 경로 및 수집기 진단을 확인하고 이벤트를 생성하지 않는다. verify-source-snapshot.mjs는 실제 D1 목록과 Supabase 분류 원천을 동일 모델에 넣어 서비스 ID·사이트별 숫자 일치를 확인한다. 운영 UI/모바일의 최종 확인을 대체하지 않는다.

## 후속 실제 검증

- 원장·Google·Supabase 원천 대조 성공: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39912767608 . 51개 서비스·ID/URL 중복 없음·동기화 정상·51개 Google 속성 접근/사이트맵 조회 정상. AdSense API 실제 응답 no_rows 확인. 카메라 렌즈 원천 likely_human 2세션/2PV가 동일 모델 결과와 일치.
- 신규 공개 원천 47개 운영 HTML·비콘 스크립트·계정 로그인 없는 진단 통과. 기존 영어 페이지는 hreflang URL로 확인. 첫 검사 실패는 내부 도구의 영어 URL을 잘못 구성한 검사 코드 오류였고 실제 hreflang을 읽도록 수정 후 통과. 영어판이 없는 Work 사이트를 영어판 완료로 주장하지 않음.
- 신규 30개 배포: 배송 https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39912159069 , 9개 https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39912159068 , 20개 https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39912159073 모두 success. 기존 재조정 https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39912486016 success.
- toolbox-visit-collector 기존 수집기도 v7으로 갱신해 이후 이벤트의 봇·자동화를 분리하고 dryRun을 추가. 과거 분류는 변경하지 않음. Google 브리지 v19는 감사에 AdSense 상태도 반환. 기존 2026-10-19~22 일별 13행의 방문·PV 값을 재대조해 작업 전과 동일함. 당일 행은 실제 수집 중이므로 동결된 합계로 주장하지 않음.
- 사이트별 원천 검증 결과: site-factory/ops/statistics-repair-result.json. 이는 실제 원천을 수정 모델로 대조한 결과이며, 아직 배포되지 않은 관제센터 UI 화면의 검증 완료를 뜻하지 않음.
- 기존 Pages 토큰으로 Workers API를 다시 시도하지 않도록 배포 경로에서 제외. 별도 CLOUDFLARE_WORKER_DEPLOY_TOKEN만 사용. 이 권한을 확보하기 전 Worker/UI/모바일 검증은 미완료.
