# 작은도구함 · 주말 미니웹앱 공통 템플릿

**한 사이트에서 매주 도구 한 개씩 추가**, 개별 앱은 독립적으로 실행. Python 3.10+만 있으면 전체 목록/도구 페이지/SEO/사이트맵이 자동 생성됩니다. JS 빌드 도구, 회원가입, DB 없음.

## 구조

```text
site.json                     사이트 이름, 실제 도메인, 광고 설정 한 번만 입력
apps/word-count/             독립적인 글자 수 계산기
apps/percentage/             독립적인 퍼센트 계산기
apps/<새-app>/app.json       앱 설명/검색 키워드/FAQ
apps/<새-app>/widget.html    앱 인터페이스
apps/<새-app>/widget.js      앱 기능 (사용자 브라우저 실행)
assets/site.css              모든 앱에서 쓰는 공통 디자인
assets/search.js             홈페이지 검색
build.py                     홈/도구/소개/약관/사이트맵 자동 생성
scripts/new_app.py          신규 앱 틀 생성기
tests/                       자동 검증
.github/workflows/test.yml   푸시마다 빌드/검증
```

## 첫 설정 (한 번만)

1. `site.json`에서 이름, `site_url`(예: `https://tools.example.com`)을 설정합니다. HTTPS 도메인 **루트 주소**여야 하며 뒷부분에 `/tools` 같은 경로를 넣지 않습니다. 아직 도메인이 없다면 비워 둡니다.
2. `contact_email`에 운영자 연락처를 설정하고, 자동 생성된 개인정보 안내/이용 안내를 실제 운영 내용에 맞게 검토합니다.
3. GitHub에 이 폴더의 **내용물만** 별도 새 저장소로 업로드합니다. 현재 하루한칸 저장소는 수정할 필요 없습니다.
4. [Cloudflare Pages](https://dash.cloudflare.com/) → Workers & Pages → Create application → Pages → Connect to Git → 새 GitHub 저장소 선택.
   - Framework preset: None
   - Build command: `python3 build.py`
   - Build output directory: `dist`
   - Root directory: `/` (프로젝트 폴더가 루트인 경우)
   - 이후 Cloudflare Pages에 소유한 도메인을 연결합니다.
5. 배포 URL이 정해지면 `site.json`의 `site_url`로 고정하고 재배포. `/sitemap.xml`, `/robots.txt` 정상 확인 후 Search Console 및 네이버에 등록합니다. 임시 `pages.dev` URL은 최종 도메인으로 바뀌면 혼동되지 않도록 관리해야 합니다.

**왜 GitHub Pages가 아닌가요?** GitHub Pages의 사용 제한에는 상업용 SaaS/거래 중심 비즈니스 사이트 이용 제한이 있습니다. 광고 수익화 사이트는 약관에 맞는 별도 호스팅을 권장합니다. Cloudflare Pages 무료 플랜에는 월 500빌드 등 한도가 있습니다.

## 매주 새 앱 추가 (반복)

```bash
python3 scripts/new_app.py loan-interest "이자 계산기" "대출 원금과 이자율을 입력해 월 이자를 계산합니다."
```

`apps/loan-interest/`의 `app.json` (제목·설명·실제 이용 가이드), `widget.html` (입력 UI), `widget.js` (계산 기능)를 작성합니다. 기존 홈, 헤더, CSS, robots, sitemap, 광고 스크립트, 링크 코드를 수정할 필요 없습니다.

```bash
python3 build.py
python3 -m unittest discover -s tests -v
```

`main` 브랜치에 푸시하면 Cloudflare Pages가 자동 재배포합니다. **앱을 추가하면 홈 화면/검색 필터/사이트맵/개별 canonical URL이 자동 생성**됩니다.

## 애드센스 설정 (승인 후 한 번만)

Google AdSense에서 **대표 도메인**이 승인된 뒤에만 `site.json`을 수정합니다.

```json
"adsense_publisher_id": "ca-pub-0123456789012345",
"ads_enabled": true
```

숫자는 **반드시 실제 본인 광고 계정의 16자리 퍼블리셔 ID**로 교체하세요. 이후 모든 페이지에 Auto Ads 스크립트와 `/ads.txt`가 자동 생성됩니다. 광고가 실제로 보이는지, 앱 도구를 가리지 않는지 검증하고 동의/개인정보 처리를 점검해야 합니다. 메타태그나 광고 코드만 붙였다고 승인되지는 않습니다.

광고 신청 전부터 의미 없는 앱을 대량 생산하거나 설명이 없는 기능만 나열하는 방식은 승인/검색에 불리할 수 있습니다. 모든 앱은 실제 기능과 고유한 설명을 제공해야 합니다.

## 검색엔진 등록 / 추적

- 정식 도메인을 정하면 한 번만 Google Search Console·네이버·Bing에 도메인을 등록하고 사이트맵을 제출합니다.
- 새 앱은 사이트맵에 자동 추가됩니다. 검색엔진이 이를 수집·색인하는 시점은 보장되지 않습니다.
- Google/네이버 소유 확인 문자열이 있으면 `site.json`의 `google_verification`, `naver_verification`에 입력합니다. 각각 지정된 확인 메타태그가 **모든 페이지**에 자동 생성됩니다.

## 지금 상태

이 템플릿은 독립적으로 실행되는 완성된 출발점입니다. 실제 대표 도메인, Cloudflare 계정 연결, 애드센스 승인/ID, 운영자 문의처는 아직 미설정입니다. 하루한칸 로그인 서비스는 기존 저장소에서 계속 운영되며 자동 이주하지 않습니다.
