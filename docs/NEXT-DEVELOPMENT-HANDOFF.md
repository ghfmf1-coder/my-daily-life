# Abreda 개발·배포 인수인계

기준: 2026-11-21 KST. 저장소 `ghfmf1-coder/my-daily-life`, 배포 브랜치 `main`.
이번 작업은 배포 연결 수정만 수행. 신규 도구·블로그 제작, 하루한칸 삭제는 별도 작업.

## 1. 신규 한국어·영어 도구

추가 파일:
- `site-factory/sites/<slug>/site.json`
- `site-factory/sites/<slug>/public/index.html` (한국어 실제 기능)
- `site-factory/sites/<slug>/public/en/index.html` (영어 실제 기능)
- `site-factory/sites/<slug>/public/app.js`, `style.css`, `assets/*`
- `site-factory/sites/<slug>/blog.json` (검수한 도구 소개 글)

`<slug>`는 영문 소문자·숫자·하이픈, 기존 slug와 중복 금지. site.json 템플릿:
```json
{
  "slug": "<slug>", "project": "tb-<slug>",
  "title": "한국어 도구 이름", "description": "실제 기능을 설명하는 고유 문장",
  "approved": true, "deploy_mode": "hub_only",
  "locales": ["ko", "en"], "generated_en": false,
  "canonical_url": null, "blog_required": true,
  "ga4_measurement_id": "G-YHSK49NC2E", "ga4_collection_enabled": true
}
```
`approved=true`는 실제 기능·번역·사용법·오류 처리 검수 후 설정. 프로젝트명은 논리 ID이며 새 Pages 프로젝트/DNS를 만들지 않는다. `generated_en=true`는 기존 선별 도구 전용이므로 새 도구에 사용하지 않는다.

KO 기본 골격 (`public/index.html`):
```html
<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>고유 도구 이름 | 아브레다</title>
<meta name="description" content="실제 기능과 이용 대상을 설명">
<link rel="stylesheet" href="style.css"></head><body>
<nav><a href="https://abreda.com/">아브레다</a><a href="/en/">English</a></nav>
<h1>한국어 도구 이름</h1><!-- 실제 기능과 충분한 사용법을 작성 -->
<script defer src="app.js"></script></body></html>
```
EN 골격은 `lang="en"`, 영어 title/description/H1·UI·사용법, `<a href="/">한국어</a>`, 자산 경로 `../style.css`, `../app.js`. 한국어 복제 금지. 기존 배포 검증은 영어 실제 UI·설명 65단어 이상과 H1을 요구하며 이는 Google 승인 기준이 아닌 내부 검증 기준이다.

`site-factory/marketing/briefs.json`의 `briefs["<slug>"]`에 다음을 함께 추가해야 두 언어 홈 카드에 나타난다:
```json
{"ko":{"title":"한국어 이름","copy":"한국어 기능 설명"},"en":{"title":"English name","copy":"English description"},"channels":[]}
```
외부 홍보 자동 전송은 없다. 빌드는 `/tools/<slug>/`, `/en/tools/<slug>/`에 실제 파일을 복사하고 canonical/hreflang, 사이트맵, 홈·관리 카탈로그 링크를 연결한다. 수동 번역 hub_only 도구는 `hub_domains.py`가 자동 발견한다. `ops/domain-routes.json`은 기존 이전 경로 기록이므로 새 도구 때문에 수정하지 않는다.
자산은 상대 경로 사용. JS 내부에 `/app.js` 같은 루트 고정 URL을 넣지 않는다. 서버 API, 사용자 인증, 서비스워커가 필요한 도구는 이 정적 배포 계약의 검증 대상이 아니다.

## 2. 블로그·사진

원고: 위 도구별 `blog.json` 또는 `site-factory/content/blog/<article-slug>.json`.
실제 스키마 예제: 해당 폴더의 기존 검수 완료 JSON. 필수 필드:
- `slug`, `status:"reviewed"`, `published:"YYYY-MM-DD"` (실제 발행일)
- `type:"tool"`, `tool:"<slug>"`; 독립 정보 글은 `type:"information"`과 `sources:[{"name":"공식 출처","url":"https://..."}]`
- `ko`, `en` 각각 `title`, `description`, `problem`, `steps`, `alternative`, `toolIntro`, `limits`, `faq`. 상세 배열 구조·길이 검증: `site-factory/scripts/blog_articles.py:check_language`.
- 같은 도구 소개 글을 중복 등록하면 빌드 실패. KO/EN 필드는 실제 번역 대응 글만 묶는다.

이미지 메타데이터: 원고의 `media` 또는 `site-factory/content/blog-media.json`의 `entries[article-slug]`.
```json
{"category":"document","image":{"url":"https://images.unsplash.com/photo-실제ID","source":"https://unsplash.com/photos/실제원본","alt":{"ko":"사진에 실제로 나온 장면을 구체적으로 설명","en":"Describe the actual relevant scene in this photo"}}}
```
현재 허용 출처는 검수한 Unsplash 원본이며 각 언어 ALT 15자 이상. 분류: photo/document/daily/money/privacy/knowledge. 임의 로컬 이미지 경로는 현 렌더러에서 허용되지 않는다. 새 사진 업로더를 만들 필요 없이 허용 사진 원본·사용 권리를 확인하여 연결한다.
발행 결과: `/blog/<article-slug>/`, `/en/blog/<article-slug>/`. reviewed 원고만 게시되며 sitemap·목록·도구 링크는 빌드에서 생성된다.

## 3. 통계·등록

`site-factory/ops/visit-sites.json`의 `sites` 배열에 함께 추가:
```json
{"siteId":"tb-<slug>","url":"https://abreda.com/tools/<slug>/","origins":[]}
```
기존 siteId를 변경하거나 방문 이력을 삭제하지 않는다. 기존 별칭이 있으면 origins에 실제 원본 호스트를 유지한다.
GA4 측정 ID: `G-YHSK49NC2E`, 속성 `563183346`. 빌드가 `toolbox-ga4.js`와 `toolbox-public-traffic.js`를 삽입하므로 수동 중복 삽입 금지. Supabase 프로젝트 `ytifxhpizractdeytrok`, 함수 `toolbox-public-visit` v5. manifest 캐시 갱신 후 허용 사이트 첫 유효 이벤트에서 등록된다. 등록 목록: `public.toolbox_public_site_sources`.
QA 브라우저 URL에는 `?tb_test=1` 사용. 이벤트 수를 고유 방문자로 보고하지 않는다. GA4는 기존 동의·테스트 제외 규칙 유지. 이전 CI에서 디버그 page_view/tool_complete 요청 HTTP 204 확인; 이것은 실사용자 통계나 과거 GA4 데이터 정상화를 증명하지 않는다.

## 4. 커밋·배포 명령

저장소 루트에서:
```bash
python3 site-factory/scripts/deploy_site.py --site toolbox-hub --dry-run
python3 -m unittest discover -s site-factory/tests -p test_domain_integration.py -v
node --check site-factory/sites/<slug>/public/app.js
git add site-factory/sites/<slug> site-factory/marketing/briefs.json site-factory/ops/visit-sites.json
git commit -m "Publish reviewed bilingual <slug> tool and guide"
git push origin main
```
GitHub 연결 도구만 있는 ChatGPT는 같은 파일들을 **최신 main 부모를 유지한 단일 커밋**으로 올린다. 다른 작업자의 변경을 덮어쓰지 않는다. 배포 커밋에는 `[skip ci]`를 넣지 않는다.
`.github/workflows/toolbox-pages.yml`이 main 변경을 감지한다. 신규 hub_only 도구는 기존 `tb-toolbox-hub`와 카탈로그 대상만 배포한다. 블로그/사진 메타데이터만 바꾸어도 허브가 배포된다.
이미 인증된 gh CLI에서 필요할 때만 수동 실행:
```bash
gh workflow run toolbox-pages.yml --repo ghfmf1-coder/my-daily-life --ref main -f site=toolbox-hub -f attach_domain=false
gh run list --repo ghfmf1-coder/my-daily-life --workflow toolbox-pages.yml --limit 5
gh run watch RUN_ID --repo ghfmf1-coder/my-daily-life --exit-status
```
필요한 기존 Actions secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (Pages). 신규 토큰 발급·유료 서비스·Cloudflare 브라우저 로그인 불필요.

## 5. 배포 검증

```bash
curl -fsS 'https://abreda.com/tools/<slug>/?tb_test=1'
curl -fsS 'https://abreda.com/en/tools/<slug>/?tb_test=1'
curl -fsS 'https://abreda.com/blog/<article-slug>/?tb_test=1'
curl -fsS 'https://abreda.com/en/blog/<article-slug>/?tb_test=1'
curl -fsS https://abreda.com/sitemap.xml
```
HTTP 200뿐 아니라 해당 title/H1·canonical·hreflang·자산 경로를 확인한다. SPA fallback 홈페이지를 새 도구 성공으로 판정하지 않는다. 새 도구의 핵심 기능·모바일·언어 전환·다운로드·오류 처리만 실제 브라우저에서 실행한다. 성공 Actions 로그의 배포 URL과 main SHA를 기록한다.

## 6. 현재 권한·남은 장애

- **관제센터 Worker/D1 미완료**: 기존 Worker 배포 토큰 인증 실패(401/Cloudflare 인증 오류). 반복 시도 금지. 최신 Supabase URL과 보존 D1 별칭을 현 보고 모델이 URL 완전 일치로 결합하여 `unmapped public visit source`가 발생. 방문 수집은 동작하지만 adminivo.com/next/ 통계 연결 완료로 보고하지 않는다. Worker/D1에 유효한 기존 계정 권한이 필요하며 새 앱의 D1 반영도 별도 확인 필요.
- **AdSense**: 기존 OAuth `adsense.readonly`로 2026-11-21 조회 성공. account `pub-1802341703309961`의 조회 결과 중 아브레다 관련 사이트 항목은 `[]`; 승인 확인 불가/등록 항목 없음. 신청·심사 요청·실제 광고 송출 없음. 공통 광고 설정 disabled, publisher/slot 미설정 유지. `/ads.txt`는 유효한 광고 선언 파일이 아닌 HTML 응답이므로 완료로 표시하지 않는다. 계정 UI에서 사이트 등록 상태 확인 후 사용자의 명시적 승인 하에 신청하는 일은 별도.
- **GA4**: 브라우저 전송 확인과 실제 Data API 사용자 데이터는 구분. 과거 DB 이벤트 대비 GA4 미반환 원인 최종 확정은 미완료. 동의/QA 제외 조건, 속성·측정 ID 매핑을 유지한다.
- Google OAuth Edge v21은 기존 OIDC 검증 그대로 유지하며 `readinessOnly`는 승인 상태 읽기만 수행. Actions `work-registry-readonly-audit.yml`의 `[adsense-readiness]` 커밋 표식으로 해당 읽기 전용 job 실행 가능.

근거: `docs/DOMAIN-INTEGRATION-2026-11-21.md`, `site-factory/ops/domain-audit-20261121/`.
AdSense 실제 조회 로그: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/44884642494
방문 커버리지 통과 후 D1 결합 실패 로그: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/44882959215
공식 API(2025-02-28 문서): https://developers.google.com/adsense/management/reference/rest/v2/accounts.sites/list

## 최종 실행 기록

- 자동화·인수인계 커밋: `f61e70f2324fb0b5381f7a24db0c374ed357a585`.
- 최초 배포 `6913123090e2771914f96f60dea5b622be63381c`는 별도 작업에서 이미 종료한 하루한칸에 옛 공개 상태를 요구하는 공유 테스트 때문에 중단. 서비스 파일은 변경하지 않고 종료 페이지의 noindex·빈 sitemap을 검증하도록 조건을 갱신했다.
- 수정 배포 커밋: `9f3e1b237bb079cd6fe0613b6f13625b2fd398da`.

- 최종 배포 성공: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/44886045314 (checks, toolbox-hub, toolbox-admin 모두 success).
- 허브 배포: https://c045c2a7.tb-toolbox-hub.pages.dev / 관리 카탈로그 배포: https://b90bb474.tb-toolbox-admin.pages.dev
- 운영 확인: https://abreda.com/deployment-check.json 에서 codeCommit f61e70f2324fb0b5381f7a24db0c374ed357a585 및 retirement-aware 목적 문자열 일치.
- toolbox-admin Pages 성공은 adminivo.com/next/ Worker/D1 수정 성공을 의미하지 않는다. 별도 하루한칸 .github/workflows/pages.yml은 run 44886044332에서 실패했고 이번 제외 범위로 유지했다.
- 기계 판독 근거: site-factory/ops/domain-audit-20261121/final-deployment.json.
