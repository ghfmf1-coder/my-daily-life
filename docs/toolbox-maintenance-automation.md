# 작은 도구함 — 유지보수 자동화

## 주기
- GitHub Actions **Toolbox daily maintenance**: 매일 **09:20 KST** (UTC 00:20) 예약. GitHub 스케줄이 지연될 수 있음.
- Cloudflare Pages `Toolbox approved-site auto-deploy` 종료 후에도 자동 실행.
- Actions의 **Run workflow**로 수동 실행 가능.
- ChatGPT 자동화가 매일 새 장애를 감시하고 매주 월요일 점검 결과를 요약함.

## 자동 검사 대상
- 하루한칸(`my-daily-life.pages.dev`).
- `site-factory/sites/*/site.json`에서 `approved: true`인 모든 공개 웹 도구. 새로 승인된 사이트는 별도 목록 수작업 없이 자동 포함.
- 통합 관리자와 배포 기술 테스트는 검색 비색인·로그인 게이트 등을 점검.
- 관리자 화면에서만 개인적으로 수동 등록한 외부 사이트는 목록 공개/도메인 권한 검증 전까지 모니터링에 넣지 않음.

## 실제로 확인하는 것
- HTTPS 응답 상태·접속 시간, 자산(JS) 로드, favicon SVG/ICO.
- 공개 한국어·영어 페이지 title, description, canonical, hreflang, robots, sitemap.
- 비공개 관리자 로그인 게이트, 앱 페이지 noindex 설정.
- Chromium 데스크톱 및 모바일에서 웹소설 회차/인물/복선 관리, 원고 반복 분석, CSV 병합 및 중복 제거, 하루한칸 비로그인 화면, 관리자 잠금 확인.
- Python 공장 테스트 및 Node CSV 회귀 테스트.

## 보고 및 장애 통지
- 운영 콘솔 로그인 후 **자동 유지보수** 메뉴에 사이트별·브라우저별 상태 표시.
- 매 실행마다 공개할 수 있는 점검 내용만 저장해 Cloudflare Pages 관리자로 배포; 이용자 파일·메모·계정 토큰을 보고서에 넣지 않음.
- 자세한 로그는 GitHub Actions 아티팩트에 **30일** 보관.
- 실제 장애 발생 시 GitHub Issue 하나를 생성/갱신하고 회복되면 자동 종결.
- ChatGPT가 매일 새로운 장애가 있는지 확인해 통지하고 매주 요약.

## 한계와 운영 원칙
- 이 자동화는 **탐지·회귀 테스트·보고** 목적이다. 모든 장애를 자동 수정하거나 검색 색인을 보장하지 않는다.
- Google Search Console에 등록되었다는 사실과 구글 색인 여부, 웹 서버 접속 가능 여부는 별도 상태다.
- 점검 대상 사이트가 크게 증가하면 호출 수와 GitHub Actions 사용량을 제한할 수 있다.
- 이미 배포된 사이트의 문제를 해결하는 변경은 우선 테스트하고 배포 로그를 확인한다.
- 새 사이트는 관리자 개인 데이터에만 등록하는 것이 아니라 제작 공장에 등록해야 자동 검사에 들어간다.
