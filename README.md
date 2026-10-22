# 하루한칸 — 루틴·일정·가계부 관리 앱

사용자가 자신만의 체크리스트를 만들고, 교대근무 일정 및 가계부를 관리하는 반응형 웹앱.

## 폴더 구조

- `index.html`: SEO 공개 홈페이지(검색 가능한 공개 콘텐츠)
- `app/index.html`: 실제 로그인/계정별 관리 화면(검색 로봇 제외)
- `app.js`, `styles.css`, `config.js`: 앱 코드 및 공개 API 설정
- `landing.css`, `privacy.html`, `terms.html`: 홍보·개인정보·이용 안내
- `robots.txt`: 검색 로봇 정책
- `prepare_seo.py`: **실제 배포 URL 확정 후** `sitemap.xml`, canonical, OG URL을 생성하는 스크립트
- `.github/workflows/pages.yml`: 선택적 GitHub Pages 배포 설정

## 배포

### Vercel

1. [Vercel](https://vercel.com/new)에서 GitHub 저장소를 Import. Framework Preset: `Other`; Build Command, Install Command 없음; Output Directory: `.`(프로젝트 루트).
2. 배포 후 **실제 URL을 먼저 확인**. `python prepare_seo.py https://배포-주소` 실행하여 바뀐 `index.html`, `robots.txt`, `sitemap.xml` 등을 커밋하고 다시 배포.
3. Supabase `my-daily-life` 프로젝트의 **Authentication → URL Configuration**에서 Site URL `https://배포-주소/app/`, Redirect URLs `https://배포-주소/app/` 설정.
4. 테스트 계정 회원가입·이메일 확인·로그인·PC/아이폰 동기화 테스트 필수.

### GitHub Pages(대안)

Settings → Pages → Build and deployment → `GitHub Actions` 선택. 참고: GitHub Pages의 기본 URL은 `https://<계정>.github.io/<저장소>/`이며, `prepare_seo.py`에는 그 전체 기본 URL을 전달해야 합니다.

## SEO 검색 등록(배포 주소 확정 후)

- Google: https://search.google.com/search-console (속성 확인 → `sitemap.xml` 제출)
- Naver: https://searchadvisor.naver.com (사이트 소유확인 → 사이트맵 제출)
- Bing: https://www.bing.com/webmasters (Google Search Console에서 가져오거나 별도 확인)
- Daum: https://register.search.daum.net (사이트 검색등록 심사 신청)

등록은 **검색 결과 노출을 보장하지 않으며**, 사전 사이트 소유권 인증이 필요할 수 있습니다. 인덱싱할 페이지는 공개 메인/안내뿐이며 로그인 및 사용자 기록은 검색 대상에서 제외합니다.

## 주의사항

- `config.js`에는 공개용 Supabase publishable key만 있습니다. `service_role` 등의 비밀 키는 절대 추가하지 마세요.
- Supabase RLS를 활성화한 상태에서만 운영하세요.
- `privacy.html`은 정식 공개 전에 운영자 연락처, 파기·위탁·이전 고지를 완성해야 하는 **초안**입니다. 사용자 가입 홍보 전에 개인정보 안내와 실제 사용 흐름을 검증하세요.
- 검색 엔진은 메타 keywords보다 페이지 제목과 설명, 실제 본문 콘텐츠 및 링크를 중요하게 평가합니다.

## GitHub Pages 사용시
Repository Settings → Pages → Source: GitHub Actions를 활성화하면, `main` push시 이 저장소 경로에 맞는 robots/sitemap/canonical을 생성해 배포합니다.
배포 페이지 `https://ghfmf1-coder.github.io/my-daily-life/`가 실제 열리는지 확인 전에는 사이트 공개 상태가 아닙니다.
사이트 소유권 확인 전 검색엔진에 등록되었다고 주장하지 않습니다.

## 작은도구함 통합 관제센터 운영

현재 운영 주소는 https://adminivo.com/next/ 입니다. **먼저 [현재 상태](docs/CURRENT-STATE.md)를 읽으세요.** 일반 ChatGPT에서 GitHub 연결로 점검할 때는 [운영 안내](docs/CHATGPT-OPERATIONS.md)를 먼저 읽으세요. [실제 운영 검증 기록](docs/OPS-VERIFICATION-2026-10-22.md)은 확인된 결과와 미확인 항목을 구분합니다.
