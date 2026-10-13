# 작은도구함: 신규 정적 웹앱 자동 배포 공장

기존 **하루한칸 Cloudflare Pages 배포와 별개**인 신규 정적 웹앱 전용 자동화입니다.

## 목표

개발 아이템은 사용자 승인 후에만 공개합니다. 승인한 웹앱의 HTML/CSS/JS 파일을 GitHub에 추가하면 GitHub Actions가 **검증 → Cloudflare Pages 프로젝트 자동 생성 → 배포 → 결과 URL 표시**를 처리합니다. 신규 서비스마다 Cloudflare 대시보드에서 일일이 `프로젝트 생성`을 클릭하지 않습니다.

현재 `my-daily-life` GitHub 저장소를 **공개 정적 사이트 제작용 통합 저장소**로 재사용합니다. 별도의 서버, 로그인이 필요한 관리 도구, 개인 정보, 비밀키는 절대로 이 공개 저장소에 넣지 마세요.

## 딱 한 번 하는 사용자 설정 (필수)

1. Cloudflare 대시보드 > **내 프로필 → API 토큰** (`https://dash.cloudflare.com/profile/api-tokens`) > `토큰 생성` > `사용자 지정 토큰`.
   - 권한: **계정(Account) → Cloudflare Pages → 편집(Edit)** (공식 API 문서의 `Pages Write`).
   - 리소스: **내 Cloudflare 계정 하나만** 선택. 다른 권한은 넣지 않음.
   - 생성된 토큰은 **채팅, 스크린샷, 소스코드에 붙여넣지 말 것**.
2. Cloudflare `Workers 및 Pages` 개요 화면 오른쪽의 **Account ID**를 복사.
3. GitHub `ghfmf1-coder/my-daily-life` 저장소 → **Settings → Secrets and variables → Actions → New repository secret**:
   - `CLOUDFLARE_API_TOKEN` = 방금 생성한 토큰
   - `CLOUDFLARE_ACCOUNT_ID` = Cloudflare Account ID
   - **Secrets에만 입력**. Variables, README, `config.js`, 커밋에 넣으면 안 됨.
4. GitHub 저장소의 Actions가 켜져 있는지 확인. 첫 사용 시 `Toolbox approved-site auto-deploy` 워크플로를 선택해서 실행 가능합니다.

도메인 구매 **필요 없음**. 처음에는 신규 프로젝트마다 `https://tb-사이트이름.pages.dev` 주소 사용.

## 내가(개발 담당)가 신규 사이트 추가하는 법

1. 사용자와 아이템을 검토하고 **명시적인 개발 승인을 받은 후**:
   ```bash
   python3 site-factory/scripts/new_site.py writer-helper '원고 반복 검사기' '원고의 반복 표현을 표시하는 도구'
   ```
2. `site-factory/sites/writer-helper/public/index.html`의 빈 템플릿을 **실제 유용한 기능**으로 교체하고 필요한 CSS, JS, 이미지 파일을 `public/`에 저장.
3. 테스트 및 사용자 승인이 확인되면 `site-factory/sites/writer-helper/site.json`의 `approved`를 `true`로 변경. `project`는 `tb-writer-helper`로 유지.
4. 배포 전 로컬 검사:
   ```bash
   python3 -m unittest discover -s site-factory/tests -v
   python3 site-factory/scripts/deploy_site.py --site writer-helper --dry-run
   ```
5. GitHub `main`에 사이트 변경 파일을 반영하면 승인된 변경 사이트만 GitHub Actions가 배포. 이후 **코드 수정만 해도 재배포**.

승인되지 않은 사이트(`approved: false`)는 자동 배포하지 않습니다. 빈 템플릿도 배포하지 않습니다. 실패한 빌드는 그대로 실패로 기록됩니다.

## 도메인 구매 후 (선택 사항)

1. 구매 도메인의 네임서버를 Cloudflare에 설정해 DNS 관리가 가능한지 확인.
2. 각 사이트 `site.json`에 `domain: "writer.usefulmate.com"`처럼 구매한 도메인 하위 주소를 입력. (실제 구매·연결된 도메인만 입력.)
3. GitHub Actions → `Toolbox approved-site auto-deploy` → **Run workflow**에서 `site=writer-helper`, `attach_domain=true`를 선택하면 해당 Pages 프로젝트에 도메인 연결 API 요청을 보냅니다.
4. **성공 응답 ≠ 인증서/도메인 활성화**. Cloudflare Custom Domains에서 `Active`와 HTTPS 접속을 확인한 다음 `canonical_url: "https://writer.usefulmate.com"`으로 변경·재배포. Google/Naver 신규 도메인 소유 인증 및 색인 등록은 별도.

주의: Cloudflare DNS 존의 도메인/하위도메인은 연결 과정에서 레코드가 자동 생성될 수 있지만, 외부 DNS 관리 중이거나 검증이 지연되면 수작업이 필요합니다. **도메인 구매, 결제, 소유권 인증은 자동화하지 않았습니다.**

## 자동화 제약

- Cloudflare Pages는 **계정당 최대 100개 프로젝트** 제한이 있습니다. 그 이상 사이트를 출시하려면 하위 경로 통합 또는 다른 Cloudflare 배포 아키텍처를 사용해야 합니다. 초기 신규 Cloudflare 계정에서는 첫 48시간 내 신규 프로젝트 수 제한이 발생할 수 있습니다.
- Cloudflare Pages API 토큰에 **Pages Write** 권한이 있어야 합니다. 권한이 없으면 `403`으로 종료합니다. 권한 값은 코드에 저장하지 않습니다.
- 기존 `my-daily-life.pages.dev`는 기존 Git 연동 프로젝트입니다. 이 자동화는 **새로운 `tb-*`** 프로젝트만 생성합니다.
- 위 코드가 GitHub에 등록돼도 Secret 설정 전에는 실제 Cloudflare 배포를 할 수 없습니다.
- 본 자동화는 **코드가 GitHub에 올라온 이후 배포**까지만 수행합니다. 키워드 조사, 아이템 선정, 코드 작성, 테스트, 색인 신청, 광고 등록, 수익 분석까지 무인 자동화하지는 않습니다.
- 공개 사이트용입니다. 관리자 시스템은 인증·접근 제어 및 비공개 저장소 마련 후 별도 배포해야 합니다.
- SEO 파일 `robots.txt`, `sitemap.xml`, `canonical`은 기본 생성되지만 정책 준수, 검색 노출 및 색인 성공을 보장하지 않습니다. 원래 있던 파일은 덮어쓰지 않습니다.
- 도메인 연결은 **수동 workflow_dispatch로 승인한 경우에만** API 요청합니다. 소유권을 확인할 수 없는 도메인은 연결하지 마세요.

공식 근거:
- Cloudflare Direct Upload: https://developers.cloudflare.com/pages/get-started/direct-upload/
- Pages Project API: https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/create/
- Pages Custom Domain API: https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/domains/methods/create/
- Cloudflare Pages Limits: https://developers.cloudflare.com/pages/platform/limits/