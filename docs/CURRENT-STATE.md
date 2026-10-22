# 현재 운영 상태 — 작은도구함

이 파일을 일반 ChatGPT Plus의 첫 진입점으로 사용합니다.
이전 대화가 자동 공유된다고 가정하지 않습니다. 아래 파일과 실제 최신 실행 로그를 읽고 시작합니다.

## 고정 기준

- 저장소: ghfmf1-coder/my-daily-life
- 관제센터: https://adminivo.com/next/
- 기본 운영: 일반 Plus의 GitHub 연결 → GitHub Actions → 기존 Cloudflare/Supabase
- Work 브라우저·로컬 임시 파일·대화 세션을 필수 의존성으로 사용하지 않습니다.
- 구형 관제센터 복귀, 새 관제센터, 추가 유료 서비스 도입 금지.
- 운영 규칙: [AGENTS.md](../AGENTS.md)
- 실행 설명: [CHATGPT-OPERATIONS.md](CHATGPT-OPERATIONS.md)
- 변경 이력: [OPERATIONS-CHANGELOG.md](OPERATIONS-CHANGELOG.md)
- 최초 읽기 검증 기록: [OPS-VERIFICATION-2026-10-22.md](OPS-VERIFICATION-2026-10-22.md). 이 문서는 이후 재승인 이전의 역사적 기록입니다.

## 마지막으로 실제 확인한 상태

확인 기준일: 2026-10-22. 아래 수치는 실행 시점의 자료이며 매 요청에서 최신 로그를 확인합니다.

| 항목 | 실제 상태 | 증거 |
|---|---|---|
| D1 Read | 정상 | 감사 실행의 D1_READ_TOKEN_ACTIVE |
| 원장 | 운영 서비스 51개·신규 30개 모두 등록·누락 없음·중복 없음 | 감사 로그 |
| 기존 서비스 | 기존 21개 URL 존재. 과거 방문·성과 전체 전후 체크섬 검사는 미실시 | D1 읽기 감사 |
| 신규 사이트 상태 | deployed_not_listed: 원장 등록됨, 공개 도구 디렉터리 미등재 | PUBLIC_SERVICE |
| 원장 동기화 | 기존 Worker의 분당 동기화 유지·최근 CATALOG ok | SYNC_SOURCE_STATUS |
| Google OAuth | 기존 연결 재사용·refresh 정상 | 실시간 sites API 성공 |
| Google 추가 권한 | Search Console 관리 승인됨·신규 사이트 소유권 확인 승인됨 | GOOGLE_GRANTED_CAPABILITIES 모두 true |
| Google 재승인 저장 시각 | 2026-10-22T14:40:08.995Z | 비밀값 제외 connected_at/updated_at 조회 |
| Google 읽기 감사 | 실제 완료, 워크플로 success 확인 | https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39798149557 |
| 최초 URL 검사 | 원장 URL 51개 중 10개 속성 접근 가능, PASS 7·NEUTRAL 3, 나머지 41개 속성 접근 불가 | 과거 검증 기록. 최신 응답으로 갱신 필요 |
| Google 신규 소유권 자동 설정 | 미완료. Google Site Verification API 비활성: HTTP 403 / PERMISSION_DENIED / serviceDisabled=true | https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39799288557 |
| 신규 사이트 인증 태그 배포 | 위 API 비활성으로 태그 발급 단계가 막혀 이번 실행에서 진행되지 않음 | setup TOKEN 오류 |
| 기존 누락 사이트맵 | stl-print-check.abreda.com, watch-inspection-lab.abreda.com의 sitemap.xml 실제 제출 후 Google 재조회에서 isPending=false·errors=0·warnings=0 확인 | setup SITEMAP status=submitted |
| 사이트맵 제출 후 색인 | 미보장·실제 Google URL Inspection으로 별도 확인 | 자동 제출과 색인 완료 구분 |
| 네이버 | 기존 계정 현재 등록·인증·제출 상태 미확인 | 아직 외부 계정 인증 단계 필요 |

## 현재 차단 원인과 다음 행동

Google OAuth 재동의는 완료됐습니다. 동일한 OAuth 재동의를 먼저 반복하지 마세요.
현재 차단은 OAuth scope 부족이 아니라 기존 Google Cloud 프로젝트의 **Site Verification API 비활성**입니다.
사용자가 기존 OAuth 앱이 속한 프로젝트에서 이 API를 사용 설정해야 합니다.

Google API가 실제 반환한 활성화 주소:
https://console.developers.google.com/apis/api/siteverification.googleapis.com/overview?project=376649321415

기존 프로젝트 번호는 376649321415입니다. 새 프로젝트를 만들지 않습니다.
활성화 요구 확인 실행: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39799853704
setup TOKEN 오류의 검증된 activationUrl이 있으면 그 링크를 사용하고, 다른 프로젝트나 새 프로젝트를 만들지 않습니다.

사용 설정 이후:
1. Google setup 워크플로를 재실행합니다.
2. TOKEN → SOURCE/DEPLOY → VERIFY → SITEMAP 순서의 실제 응답을 확인합니다.
3. 완료된 setup 후 읽기 감사가 자동 실행됩니다.
4. 등록·소유권·제출·색인 결과를 각각 보고하고 이 파일을 갱신합니다.

네이버는 Google 작업과 별개입니다. 현재 미확인을 유지하고 기존 서치어드바이저 계정 인증 후 공식 화면에서 확인합니다.

## 일반 Plus에서 실행할 요청

```text
ghfmf1-coder/my-daily-life의 AGENTS.md와 docs/CURRENT-STATE.md,
docs/CHATGPT-OPERATIONS.md를 먼저 읽어.
기존 관제센터 https://adminivo.com/next/를 유지해.
최신 Google setup과 읽기 감사의 실제 로그를 확인하고,
필요한 작업을 GitHub 연결로 실행해.
현재 차단은 Google Site Verification API 비활성인지 먼저 확인하고,
이미 완료된 OAuth 재동의를 반복하거나 미확인을 완료로 표시하지 마.
완료한 변경과 남은 문제를 CURRENT-STATE.md에 갱신해.
```

## 소스와 배포 위치

- Cloudflare 원장/관제센터: site-factory/admin-worker/worker.mjs. 이번 Google 변경을 이 Worker에 임의로 덮어쓰지 않음.
- Google 서버 코드: site-factory/admin-worker/google-oauth-edge/
- 기존 Supabase 프로젝트: ytifxhpizractdeytrok, 기존 함수 toolbox-google-ads-oauth
- 마지막 서버 배포: v15. 서버 코드의 비밀값은 Supabase 내부 환경/기존 암호화 저장에 유지.
- 원장/Google 읽기 감사: .github/workflows/work-registry-readonly-audit.yml
- Google 등록/사이트맵 자동화: .github/workflows/toolbox-google-setup.yml
- 실행 드라이버: site-factory/ops/google_search_setup.py
- Plus가 재실행 요청을 저장할 파일: site-factory/ops/search-setup-request.json
- 테스트: site-factory/admin-worker/google-oauth-edge/test-github-oidc.mjs

## 인증 보관

GitHub Secret 이름: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_READ_TOKEN, CLOUDFLARE_API_TOKEN.
여기에 실제 값을 쓰지 않습니다. 사용자에게 채팅으로 값을 보내라고 요구하지 않습니다.
Google refresh token·client secret은 GitHub에 복사하지 않습니다.
GitHub OIDC는 감사/설정 각각 별도 audience·정확한 워크플로 경로로 구분됩니다.

## 후속 실제 재조회

https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39799411215 의 실제 Google 조회 로그에서 다음을 확인했습니다.

- Google OAuth와 두 관리 capability 정상 유지.
- STL 사이트맵 제출 시각 2026-10-22T14:51:07.292Z, Google 다운로드 시각 2026-10-22T14:51:09.575Z.
- 시계 사이트맵 제출 시각 2026-10-22T14:51:07.371Z, Google 다운로드 시각 2026-10-22T14:51:15.338Z.
- 두 사이트맵 모두 isPending=false, errors=0, warnings=0.
- 해당 홈페이지의 Google 색인 보고서는 여전히 NEUTRAL·발견됨-현재 색인 생성되지 않음. 제출 성공을 색인 완료로 바꾸지 않음.
- 새 소유권 확인은 여전히 Site Verification API 활성화 대기.
