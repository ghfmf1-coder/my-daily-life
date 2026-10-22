# 작은도구함 통합 관제센터 — 2026-10-22

운영 주소: https://adminivo.com/next/

배포된 Cloudflare Worker: `tb-toolbox-admin-rebuild`, Google 연동 코드 버전 `a2471a88`.

## 변경

- 상태 API는 실제 연결 상태를 반환한다. 조회 오류, 미연결, 자료 없음, 부분 연결을 구분한다.
- 기존 Supabase의 관리자 성과 이력과 일별 비콘 집계를 읽기 전용으로 통합한다. 일별 집계를 우선 표시하며 원본 이력을 중복 합산하지 않는다. 기록이 없는 경우 0으로 채우지 않는다.
- 브리지 `toolbox-admin-legacy-read`는 기존 Cloudflare Access JWT의 RS256 서명, 발급자, 대상 앱, 유효기간, 관리자 이메일을 검증한다. 데이터베이스 변경 API, CORS 및 외부 SQL 입력을 제공하지 않는다.
- Pages API를 페이지당 10개로 조회해 전체 페이지를 수집한다. 성공한 production 배포만 기존 서비스 원장에 upsert한다. 분당 Cron과 화면의 원장 revision 확인을 유지한다.
- `verification_archived` 원장은 삭제하지 않고 운영 목록에서 제외한다.

## 실서버 검증

- 기존 서비스 21개의 service_id가 모두 보존됨. Pages 25개 프로젝트 대조 완료.
- 기존 Supabase 작업공간 version 111, 성과 15건, 일별 집계 13건, 82세션/93페이지뷰가 작업 전후 동일함.
- 2026-10-19 성과 16세션 / 기존 이력 5건, 2026-10-21 성과 40세션 / 기존 이력 4건을 운영 API와 화면에서 확인함.
- 검색 차단된 신규 Pages `tb-registry-probe-20261022`를 실제 배포함. 수동 원장 등록 없이 서비스 21→22, 반복 동기화 후 test row 1건/고유 URL 22개 확인.
- 사용자 승인으로 임시 Pages만 삭제하고 D1 test row는 `verification_archived`로 보관. 운영 서비스 수 21개 복귀.
- 기존 Python 회귀 49개, 추가 인증/통합 검사 12개 통과. Worker 및 내장 브라우저 JS 문법 확인.

## 운영

`worker.mjs`는 현재 배포된 단일 Worker 번들이다. 기존 REPORT_DB/SNS_DB 바인딩, Access 변수, Cron을 유지하여 배포해야 한다. 이 파일을 기존 Pages 관리자 v1.2에 덮어쓰지 않는다.

`legacy-bridge.mjs`는 Supabase Edge Function `toolbox-admin-legacy-read`의 코드다. Supabase JWT 게이트 대신 함수 본문에서 Cloudflare Access 인증을 검증한다. service role 키는 Supabase 함수 내부 기본 환경에서만 사용하고 응답이나 브라우저에 보내지 않는다.

조회용 Cloudflare API 토큰은 해당 계정의 **Pages 읽기**만 허용하며 Worker의 `CF_PAGES_READ_TOKEN` 암호화 시크릿에 저장되어 있다. 저장소에 키를 넣지 않는다.

Google OAuth 연결을 완료했다. Supabase `toolbox-google-ads-oauth` v9가 기존 암호화 refresh token 저장 방식과 Google Ads 경로를 유지하면서 `reporting-start` 및 `reporting-data`를 제공한다. Search Console 및 AdSense 읽기 권한만 추가했다. Google client secret과 refresh token은 Supabase 내부에 유지한다.

전용 보고서 키는 Worker의 암호화 시크릿 `REPORTING_BRIDGE_KEY`에 저장하고 Supabase 비공개 RLS 테이블에는 SHA-256 해시만 저장한다. 키는 기존 작은도구함 호스트의 검색·수익 보고서를 읽는 용도다. 6시간 Cron과 수동 수집 모두 같은 키 인증 경로를 사용한다.

실서버에서 Google 최종 검색 자료 1건 수집 및 AdSense 계정·보고서 조회 성공을 확인했다. 조회 기간의 작은도구함 페이지별 수익 행은 없으며 0원으로 치환하지 않는다. 기존 데이터는 삭제하지 않는다. 신규 인증, OAuth PKCE, 날짜 범위, 키 인증, 빈 응답 보존, upsert 및 호스트 검증 테스트를 통과했다.

Buffer 이메일 인증과 API 연동을 완료했다. 키 권한은 `account:read`, `posts:read`, `insights:read` 3개이며 게시·계정 변경 권한은 없다. 사용자 승인으로 Worker의 `BUFFER_API_KEY` 암호화 시크릿에 저장했다. 키 만료는 2026-11-21이다. 운영 SNS 화면에서 Buffer API 정상, 연결 채널 0, 예약/발행 게시물 0을 실제 API 응답으로 확인했다.

SNS 채널 자체는 아직 연결하지 않았다. Buffer 무료 요금제는 3개 채널까지 허용하므로 기존 9개 중 우선 연결할 구성을 사용자에게 요청했다. 요금제 변경·결제·SNS 게시를 수행하지 않았다. Make 이벤트도 미연결이다. 이 부분이 완료되기 전에는 전체 운영 자동화 완료로 표현하지 않는다.

검증용 임시 사이트는 재생성하거나 일반 서비스로 복구하지 않는다. 실제 신규 사이트는 승인된 tb-* Pages production 배포가 성공하면 다음 분당 동기화에서 반영되며, 공식 디렉터리에 없는 항목은 “배포 성공·목록 미등록”으로 표시한다.
