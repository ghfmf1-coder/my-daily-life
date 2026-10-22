# 작은도구함: 일반 ChatGPT 운영 안내

운영 주소는 https://adminivo.com/next/ 입니다. 저장소는 ghfmf1-coder/my-daily-life 입니다.
구형 관제센터로 되돌리거나 새 관제센터를 생성하지 않습니다.

## 일반 대화에서 시작할 요청

```text
ghfmf1-coder/my-daily-life 저장소의 docs/CHATGPT-OPERATIONS.md를 읽고,
work-registry-readonly-audit.yml의 최신 실행 결과를 확인해.
필요하면 최신 main 실행의 check 작업을 다시 실행하고 완료된 로그를 읽어.
운영 서비스 수, 신규 사이트 누락, 중복, 동기화 오류,
Google 소유권·검색 성과·사이트맵·홈페이지 색인 보고서를 구분해서 보고해.
자료가 없는 항목을 0이나 완료로 바꾸지 마.
```

## 조회 및 재실행

- 워크플로: .github/workflows/work-registry-readonly-audit.yml
- 이름: Read-only verify Work registry coverage
- Actions: https://github.com/ghfmf1-coder/my-daily-life/actions/workflows/work-registry-readonly-audit.yml
- GitHub 연결의 fetch로 저장소 Actions runs를 조회하고, 최신 main 커밋의 해당 실행을 선택합니다.
- fetch_workflow_run_jobs로 check 작업 ID를 구한 뒤 rerun_workflow_job으로 재실행합니다.
- fetch_workflow_job_logs로 완료 로그를 읽습니다. 일부 메타데이터가 갱신되지 않으면 완료된 로그와 GitHub 실행 화면을 함께 확인합니다.
- 연결에 실행 도구가 없으면 위 Actions 화면의 Run workflow 또는 Re-run jobs를 사용합니다. Work 브라우저는 필수 조건이 아닙니다.
- 오래된 커밋의 실행을 반복하지 않습니다. 과거 버전에는 현재 Google 조회 단계가 없을 수 있습니다.

## 서버가 실행하는 작업

- 기존 Cloudflare Worker의 분당 원장 동기화를 유지합니다.
- 기존 Worker의 Google 보고서 수집 Cron을 유지합니다.
- GitHub 원장 검증은 UTC 매 6시간 37분 및 지정 배포 워크플로 완료 후 실행합니다. GitHub 예약 실행은 지연될 수 있습니다.
- 성공한 production Pages 프로젝트를 API에서 페이지별로 수집하고 실제 D1 서비스 원장과 비교합니다. 관리용 프로젝트는 기존 제외 목록을 따릅니다.
- 고정 신규 사이트 목록 검사와 함께 향후 발견되는 production 프로젝트도 대조합니다.
- 검증 워크플로는 D1에 INSERT/UPDATE/DELETE를 수행하지 않습니다. 누락을 발견했다고 DB에 임의로 추가하지 않습니다. 기존 원장 동기화가 담당합니다.
- 카탈로그 연결 실패 시 기존 Worker가 원장을 보존하고 동기화 오류를 기록합니다. 오류를 숨기지 않습니다.

## 인증

- GitHub Secret CLOUDFLARE_D1_READ_TOKEN: 해당 Cloudflare 계정의 D1 Read 전용입니다.
- 기존 CLOUDFLARE_API_TOKEN: Pages 목록 조회에만 사용합니다. 권한을 확대하지 않습니다.
- CLOUDFLARE_ACCOUNT_ID: 기존 값을 유지합니다.
- Google OAuth refresh token과 client secret은 기존 Supabase 내부에 유지합니다.
- Google 조회는 GitHub OIDC로 인증합니다. issuer·audience·숫자 저장소 ID·소유자 ID·main ref·워크플로 경로·허용 이벤트·시간·RSA 서명을 검증합니다.
- 새 장기 Google 비밀키, 관리자 브라우저 쿠키, OAuth token을 GitHub에 복사하지 않습니다.
- GitHub 권한은 contents: read와 id-token: write입니다. 저장소 쓰기·이슈 쓰기 권한을 부여하지 않습니다.
- reporting-github-data 경로는 조회만 허용합니다. 원장 변경, OAuth 시작, SNS 발행 기능을 제공하지 않습니다.

## 로그 해석

- ACTIVE_LEDGER_SERVICE_COUNT: archived 시험 항목을 제외한 원장 서비스 수
- PUBLIC_SERVICE: 공개 URL·Cloudflare 프로젝트·원장 상태
- deployed_not_listed: 원장 등록됨, 공개 도구 디렉터리에는 미등록. 원장 누락이나 Google 미색인을 뜻하지 않음
- MISSING_PROJECT_NAMES: 성공한 production 프로젝트 중 원장에 연결되지 않은 목록
- DUPLICATE_CANONICAL_URLS / DUPLICATE_SERVICE_IDS: 중복 검사
- SYNC_SOURCE_STATUS / SYNC_STALE_OR_ERROR_SOURCES: 원장·Google 수집 상태와 지연
- GSC_STORED_PAGE_METRICS: D1에 이미 보관된 자료
- GOOGLE_LIVE_OAUTH_AND_SITES_API: 이번 실행의 Google 인증과 속성 API 실제 조회
- GOOGLE_SITE_AUDIT: URL별 접근 가능한 속성·사이트맵 처리·URL Inspection 응답
- GOOGLE_LIVE_PAGE_METRICS: 이번 실행에서 조회한 확정 검색 자료. 출력된 기간을 반드시 함께 확인
- not_in_accessible_properties: 현재 Google 계정에서 해당 URL을 포함하는 인증된 속성을 조회할 수 없음. 사이트 미색인 확정이 아님
- sitemaps query_failed: 조회 실패. entries가 비었다고 미제출 확정하지 않음
- sitemaps status=ok, entries=[]: 해당 속성에서 API가 반환한 같은 호스트의 사이트맵 없음. 다른 속성·교차 호스트 제출 여부까지 부인하지 않음
- index status=ok: supplied URL의 Google 색인 버전 보고서. 홈페이지 결과를 전체 사이트 색인으로 확대하지 않음
- sitemapSubmission=read_only_scope_no_submission_attempted: 읽기 인증으로 제출하지 않았음
- naver=not_connected_to_this_bridge: 이 경로는 네이버 계정 상태를 조회하지 못함
- 검색 자료 없음은 클릭·노출 0 확정 또는 미색인 확정이 아님

## 오류별 대응

- AUTH_BLOCKED: Secret 누락 또는 읽기 토큰 비활성. 비밀값을 채팅에 요구하지 않고 사용자에게 GitHub Secret 교체만 요청
- D1 HTTP 401/403: 계정 범위·D1 Read 권한·토큰 만료 확인. Pages 토큰 권한 확대 금지
- PAGES_INVENTORY_HTTP: Pages 목록 조회 권한과 기존 배포 토큰 상태 확인
- REGISTRY_SYNC_NOT_COMPLETE: 원장 동기화 상태와 기존 Worker 소스를 확인. 정상 동기화 후 같은 검증을 재실행
- github_identity_rejected: 워크플로 경로·main ref·OIDC 권한·audience 확인. 인증 검사를 끄지 않음
- GOOGLE_BRIDGE_HTTP_503: 기존 Google refresh 실패 여부 확인. 기존 연결 삭제 없이 필요한 경우만 재인증
- GOOGLE_PROPERTY_ACCESS_MISSING: 기존 Google 계정에서 해당 사이트 속성과 소유권 인증을 확인. 새로운 OAuth 연결을 먼저 만들지 않음
- 사이트맵 제출: 현재 Google OAuth는 webmasters.readonly입니다. 제출에는 webmasters 권한과 해당 속성 접근 권한이 필요합니다. 안전한 재동의 또는 Search Console 공식 UI 제출이 필요하며 실제 응답 확인 전 제출 완료로 표시하지 않습니다.
- 네이버: 기존 서치어드바이저 계정의 등록·소유확인·제출 상태를 공식 화면에서 확인해야 합니다. API 조회 근거 없이 연결·색인을 완료로 표시하지 않습니다.

## 보존 및 운영 범위

D1 원장·성과 기록·방문 통계·기존 OAuth 연결을 삭제하거나 초기화하지 않습니다.
추가 유료 서비스를 도입하지 않았습니다.
자동화는 GitHub Actions와 기존 Cloudflare/Supabase 서비스에서 실행되며 ChatGPT 대화가 계속 열려 있을 필요가 없습니다.
일반 ChatGPT의 도구 제공 범위와 호출 권한은 실제 그 대화에서 확인합니다. 이 문서는 모든 채팅에 동일 도구가 있다고 보장하지 않습니다.
