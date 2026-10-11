# 하루한칸 — 검색엔진 등록 및 공개 운영 체크리스트

## 실제 서비스 URL
- 공개 홈페이지: https://ghfmf1-coder.github.io/my-daily-life/
- 회원 전용 앱: https://ghfmf1-coder.github.io/my-daily-life/app/
- 사이트맵: https://ghfmf1-coder.github.io/my-daily-life/sitemap.xml
- robots: https://ghfmf1-coder.github.io/my-daily-life/robots.txt

## 자동 배포 및 IndexNow
- main 브랜치에 푸시하면 GitHub Actions가 정적 사이트를 배포합니다.
- 배포 뒤 공개 홈페이지, sitemap.xml, 키 파일의 접근성을 검사합니다.
- 검사 성공 시 IndexNow 글로벌 엔드포인트로 공개 홈페이지 URL을 보냅니다.
- HTTP 200/202는 URL 접수만 의미합니다. 검색 반영이나 노출을 보장하지 않습니다.

## 구글
1. https://search.google.com/search-console 에 로그인합니다.
2. URL 접두어(URL-prefix)를 선택하고 정확히 https://ghfmf1-coder.github.io/my-daily-life/ 를 추가합니다.
3. **HTML 태그** 방식의 소유 확인 값을 발급받아 GitHub의 index.html head에 넣습니다.
4. 소유권 확인 성공 후 사이트맵 메뉴에 https://ghfmf1-coder.github.io/my-daily-life/sitemap.xml 를 제출합니다.

## 네이버
1. https://searchadvisor.naver.com 에 로그인합니다.
2. 사이트를 추가하고 제공된 'naver-site-verification' 메타태그를 index.html head에 넣습니다.
3. 소유권 확인 성공 후 sitemap.xml 제출 및 RSS/검색 현황 확인.
4. IndexNow도 배포 자동화가 사용하지만, 이는 서치어드바이저 소유 확인의 대체제가 아닙니다.

## 빙
1. https://www.bing.com/webmasters 에 로그인합니다.
2. Google Search Console에서 사이트 가져오기 또는 별도 검증으로 사이트 등록.
3. 사이트맵 URL 제출. IndexNow 통지는 이미 배포 자동화에 포함되어 있습니다.

## 다음
1. https://register.search.daum.net/searchForm.daum?act=insert 에서 '사이트검색' 선택.
2. 공개 홈페이지 URL 입력 후 신청자 연락처/개인정보 이용 동의, 사이트 설명 제출.
3. 다음 심사 결과 대기. **신청만으로 노출을 보장하지 않음.**

## 검색을 위한 콘텐츠
- 핵심: 루틴 관리 앱, 습관 관리 앱, 체크리스트, 투두리스트, 생활 관리 앱
- 특화: 교대근무 일정 관리, 교대근무표, 개인 가계부, 목표 달성률, 운동 기록
- 검색 엔진은 meta keywords 반복보다 실제 본문, 제목, 링크, 콘텐츠 품질을 더 중요하게 평가합니다.

## 정식 공개 전에 꼭 할 일
- Supabase 프로젝트 `my-daily-life` → Authentication → URL Configuration:
  - Site URL: https://ghfmf1-coder.github.io/my-daily-life/app/
  - Redirect URLs: https://ghfmf1-coder.github.io/my-daily-life/app/
- 실제 새 사용자 가입, 이메일 확인, 로그인, 암호 재설정, PC/휴대폰 동기화 테스트
- 개인정보 안내의 실제 운영자/문의 정보, 보존·삭제/처리 위탁 내용을 확정
- 데이터 삭제와 계정 탈퇴 절차 검토

개인 기록은 robots 규칙에만 의존해서 보호하지 않습니다. 앱 페이지에는 noindex를 지정하고, Supabase RLS로 계정별 접근을 제한합니다.
