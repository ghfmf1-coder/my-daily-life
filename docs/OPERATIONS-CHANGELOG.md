# 운영 변경 이력

이 문서는 작업 흔적입니다. 현재 상태는 [CURRENT-STATE.md](CURRENT-STATE.md)를 먼저 확인합니다.
비밀값·쿠키·인증코드·refresh token·개인 이메일 주소는 기록하지 않습니다.

## 2026-10-22

| 커밋 | 변경 |
|---|---|
| 85d68b69f84ee52884a3ffd9cf6fb84b4d171f45 | D1 읽기 전용 Secret 분리, 예약·배포 완료 후 감사 추가 |
| f39dd5ff3daf2b51529a247ee2810f6b7e5bae9a | 공개 서비스 목록·저장 검색 지표·동기화 지연 점검 |
| f4102d963733d2605ab35f9fa73004db49c3fe42 | 실제 production Pages 목록과 원장 자동 대조, 향후 신규 프로젝트 포함 |
| 0ed174a7da4f0cf2d073c1d2f5c0d7d724ee2176 | GitHub OIDC와 기존 Google OAuth 연결, 실시간 속성·사이트맵·URL Inspection 조회 |
| 4657d8c6447c5c94433bb073513032d9c3753c9b | 일반 ChatGPT 운영 안내 |
| c26b6d44c6b4b2b5046e66544f1229243be9f2ef | 실제 운영 검증 기록과 접근 불가 URL 목록 |
| 82264563bc3e1168a1b029ad33043fa842dceee2 | README에 운영 안내 링크 |
| 232298bf84a157008cf630fe839db995a859d6c6 | Google 재동의 화면에 Search Console 관리·신규 소유권 확인 권한 요청 추가 |
| 66ccdc7acce2fd6265e2b3e06a668d717f662aab | refresh 응답의 scope를 서버 내부에서 판정하여 비밀값 없이 capability 반환 |
| b29e94a07f0f91b0346e72fd6636102b16a6d1e9 | GitHub 감사에서 부여된 capability 확인 |

### 인증 진단 흔적

- 기존 Pages 토큰은 배포 가능했으나 D1 목록 조회 HTTP 401이 발생했습니다.
- 별도 D1 Read 토큰을 사용한 실제 조회에서 운영 서비스 51개·신규 30개·누락 없음·중복 없음이 확인됐습니다.
- 원격 브라우저의 Cloudflare 소셜 로그인은 일반 실패 메시지를 반환했습니다. 사용자의 로컬 브라우저에서는 로그인됐습니다. 정확한 원격 거절 원인은 확인하지 못했으며 계정 부재라고 결론 내리지 않았습니다.
- 원격 브라우저 로그인을 더 이상 운영 필수 조건으로 쓰지 않습니다.
- 기존 Google refresh 연결을 재사용한 GitHub OIDC 운영 조회가 성공했습니다. 장기 Google 토큰을 GitHub에 복사하지 않았습니다.
- 사용자가 Google 재동의 후 연결 updated_at이 2026-10-22T14:40:08.995Z로 갱신됐습니다. 실제 scope 검사는 별도 실행으로 확인합니다.
- GitHub 실행 메타데이터와 완료 로그가 불일치한 사례가 있습니다. 실행 중 재시도는 403 already running을 반환했으며 이를 저장소 권한 부족으로 해석하지 않았습니다.

### 보존 범위와 검증 한계

이번 감사 작업은 D1 원장·방문·성과 기록을 삭제하거나 수정하지 않았습니다.
기존 서비스 URL 보존은 현재 원장으로 확인했습니다. 과거 방문·성과 기록 전체의 전후 체크섬 검사는 수행하지 않았습니다.
임시 검증용 새 사이트를 생성하지 않았습니다.
새 사이트 배포→원장 반영의 새 실험은 수행하지 않았고, 기존 30개 실제 배포와 현재 원장 일치·최근 동기화 정상 기록을 확인했습니다.
추가 유료 서비스·새 관제센터를 도입하지 않았습니다.

## Google 재승인 이후 확인 및 자동화

- 기존 연결의 refresh 응답에서 searchConsoleManagement=true, newSiteVerification=true를 확인했습니다.
- 감사 실행 https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39798149557 은 최종 success입니다. 이전 queued 불일치는 이 실행에서 해소됐습니다.
- 서버 v12에서 실제 부여 권한 판정을 추가했습니다.
- cdf2ac93f606903a17db02d0d555fa6d0601a7f3: 별도 Google setup OIDC identity, 소유권 확인·원본 인증 태그 보존·기존 Pages 배포·검증된 사이트맵 제출 자동화 추가.
- 6b84439916e2959a3b1233b1301c97417722cc38: setup 완료 후 읽기 감사 연결.
- e7b43f9f8bc92a71338e1d32f69cfad5cc646b29: 실제 운영 태그가 있으면 재배포를 생략하도록 보완.
- 1f78e731b07c1277bf50995d45e31f3eb2826fba: 공식 Google API 활성화 링크만 검증해 전달하도록 보완. 서버 v15.
- 실제 setup 실행 https://github.com/ghfmf1-coder/my-daily-life/actions/runs/39799288557 에서 Site Verification API 비활성 HTTP 403 / PERMISSION_DENIED / serviceDisabled=true 확인. 권한 재승인 실패와 구분합니다.
- 같은 실행에서 stl-print-check.abreda.com/sitemap.xml 및 watch-inspection-lab.abreda.com/sitemap.xml 제출 성공 응답 확인.
- 신규 인증은 API 활성화 전까지 미완료입니다. 인증 태그 발급이 막혔으므로 해당 실행에서 신규 사이트 원본을 변경하거나 배포하지 않았습니다.
- 03684db19cecfcaab6e72bbf47c626d9b43f3702: 정확한 API 활성화 요구를 수집하기 위한 idempotent 재실행 요청.
- 9bef9734f468c21130c92f7174d3f92e7b816d03: audit/setup 신원 교차 사용 거부 검사 추가·통과.
- 사용자 지침에 따라 루트 AGENTS.md, CURRENT-STATE.md, 실행 안내, 변경 이력을 함께 저장했습니다.

- 활성화 진단 실행 39799853704에서 Google이 기존 프로젝트 376649321415의 Site Verification API 활성화 주소를 반환했습니다. 현재 상태 문서에 정확한 주소를 보존했습니다.
- 후속 감사 39799411215의 Google 응답에서 STL·시계 사이트맵이 실제 다운로드됐고 isPending=false, errors=0, warnings=0인 것을 확인했습니다. 홈페이지 색인은 여전히 NEUTRAL로 보존했습니다.

## 2026-10-23 재개 및 운영 검증

- 사용자 명시 재개 요청으로 f8eb9d7: paused:false, 0e61fc4: reconcile·예약 자동화 복구.
- 중단 실행 39801465011은 cancelled. 이미 성공한 소유권을 보존하고 잔여만 처리.
- 2433974: 중고차 점검 sitemap.xml 원본 추가. 163e6ab: 소유권 재배포가 factory.prepare를 사용해 생성된 검색 파일 보존.
- 배포 39880807833의 factory·CSV·자막 회귀 검사 및 Pages 배포 success.
- Google setup 39880905498 success: 47개 루트 already_accessible·사이트맵 already_submitted, attention 0.
- 감사 39880963207 success: 원장 51·신규 30·누락 없음·중복 0·동기화 정상·Google 접근 불가 없음. URL 검사 PASS 36/NEUTRAL 15. 사이트맵 47, pending 41, 오류/경고 0.
- Google 보고 기간 2026-09-26~2026-10-20. 반환된 novel 영문 페이지 성과는 노출 1·클릭 0이며 자료 없는 사이트를 0으로 추정하지 않음.
- 네이버 보안 로그인 제출 뒤 추가 보안 확인 표시. 등록·성과 확인은 사용자 보안 확인 대기. 개인정보·비밀번호·쿠키를 저장하지 않음.
- OIDC 기존 검증 및 수정 Python 구문 검사 통과. 기존 D1 데이터·OAuth 삭제/초기화 없음. 추가 유료 서비스 없음.
