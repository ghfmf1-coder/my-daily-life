# 작은도구함 SEO 공개·배치 정책 (2026-10-23)

목표: 이용자가 실제 작업을 완료할 수 있는 고유 도구를 정확히 설명하고 Google이 올바른 페이지를 발견·이해하도록 돕는다. 색인·검색 상단 노출·광고 승인은 보장하지 않는다.

## 확인한 Google 공식 1차 출처

- Google Search Central, Search Essentials (2025-12-10 갱신): https://developers.google.com/search/docs/essentials
- Google Search Central, Creating Helpful, Reliable, People-First Content (2026-10 확인): https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search Central, Spam Policies (2026-10 확인): https://developers.google.com/search/docs/essentials/spam-policies
- Google Search Central, Managing Multi-Regional and Multilingual Sites (2026-10 확인): https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Google Search Central, Build and Submit a Sitemap (2026-10 확인): https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

## 모든 공개 웹 도구의 필수 편집 규칙

1. **검색 의도에 맞는 유일한 title·H1·meta description.** 검색자가 실제로 검색할 파일 형식·문제·동작을 사용한다. 실제로 수행하지 않는 정밀 진단·인증·계약·수익 약속을 제목에 쓰지 않는다.
2. **첫 화면은 사용 가능한 도구.** 실제 입력, 처리, 결과 및 다운로드 동작을 가장 눈에 띄는 본문에 배치한다. 설명만 있고 작동하지 않는 도구는 배포하지 않는다.
3. **설명은 도구마다 독립 작성.** 용도·지원 입력 형식/필수 컬럼·출력물·한계를 실제 JS 코드로 확인하고 작성한다. 업로드가 필요 없는 앱에 CSV 안내를 복붙하지 않는다.
4. **실제 예외와 오류 사례.** 미지원 파일·초과 용량·브라우저 지원 범위·원본 보존·결과의 미검증 사항을 구체적으로 고지한다. 금융·법률·안전 판단으로 오인되지 않게 한다.
5. **인덱싱 가능성과 URL 일관성.** robots 허용, 고유 canonical, 실제로 존재하는 사이트맵, 작동하는 내부 링크, 올바른 HTTP 응답을 검사한다. 개발·관리용 페이지는 색인 대상에서 제외한다.
6. **한국어/영어는 실제 번역 UI가 있을 때만 분리.** 각 언어별 URL과 자기 자신 canonical, 상호 연결 가능한 hreflang을 사용한다. 번역하지 않은 기능 페이지를 영어 검색용 도어웨이로 생성하지 않는다. 사용자의 국적/IP를 근거로 강제 리디렉션하지 않는다. 사용자에게 명시적 언어 선택 링크를 제공한다.
7. **대량 생성보다 고유 효용.** 빈 템플릿, 차이 없는 설명문, 키워드 채움, 근거 없는 후기·자격·서식 마크업을 금지한다. E-E-A-T 자체는 별도의 점수나 순위 스위치가 아니다.
8. **관제와 검증을 분리.** 51개 원장 수, 실제 배포, 사이트맵 제출, Google 색인, 검색 노출·클릭을 각각 독립 기록한다. 색인 요청이나 HTTP 200을 노출 실적으로 기록하지 않는다.

## 배포 전/후 검수

- 변경된 HTML에서 title/H1/description, 모바일 viewport, 실제 입력/결과 동작, 브라우저 JS 구문, 저장 버튼, 오류 안내, 접근성을 검사한다.
- 기존 국내·해외 도구의 회귀 테스트와 SEO 콘텐츠 품질 테스트에 모두 합격해야 배포한다.
- Cloudflare Pages 배포 후 각 프로젝트의 실주소로 스모크 테스트하고 실패 건을 따로 기록한다.
- 관제센터 https://adminivo.com/next/ 의 기존 D1 원장과 OAuth 연결, 통계는 삭제·초기화하지 않는다.
- Search Console 공식 URL Inspection 및 성과 보고의 API 결과만 색인/노출 근거로 인정하며, 데이터가 없으면 확인 불가로 둔다.
- 등록·제출 후 검색 상단에 올랐다는 완료 보고는 하지 않는다. 검색 수요·경쟁·실제 방문자가 없을 때는 SEO 개선만으로 트래픽이 증가하지 않을 수 있다.

## 기존 프로젝트 적용

- `site-factory/scripts/seo_guides.py`: 21개 사용자 공개 도구의 한국어/영어 기능별 안내를 생성해 실제 본문 안에 포함.
- `work-sites/*/public/index.html`: 신규 30개 독립 도구의 실제 입력/출력/지원 한계를 개별 작성. 기능 미검증을 감정·정품 인증으로 과장하지 않는다.
- `site-factory/tests/test_seo_content_quality.py`: 기존 한국어/영어 페이지와 신규 30개 제목·설명·가이드 및 중복을 검사.
- 영어 기능이 없는 신규 단일 언어 도구는 추후 UI/동작/도움말까지 검증한 뒤 영어 URL을 공개한다.
