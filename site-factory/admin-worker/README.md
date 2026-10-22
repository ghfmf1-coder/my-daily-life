# 작은도구함 통합 관제센터 — 2026-10-22

운영 주소: https://adminivo.com/next/

배포된 Cloudflare Worker: `tb-toolbox-admin-rebuild`, 활성 코드 버전 `5575de32`.

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

GSC, AdSense, Buffer 공급자 자격 증명은 현재 Worker에 미설정되어 있으므로 정상 수치로 표시하지 않는다. 이 작업은 그 외부 계정의 신규 OAuth 승인을 수행하지 않았다.

검증용 임시 사이트는 재생성하거나 일반 서비스로 복구하지 않는다. 실제 신규 사이트는 승인된 tb-* Pages production 배포가 성공하면 다음 분당 동기화에서 반영되며, 공식 디렉터리에 없는 항목은 “배포 성공·목록 미등록”으로 표시한다.
