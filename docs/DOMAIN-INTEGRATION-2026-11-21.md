# 아브레다 도메인 통합·애드센스 준비 검수 — 2026-11-21

**판정: 접근 가능한 공개 도구 통합·운영 검증 완료. 계정 승인·하루한칸 이전·관제센터 Worker까지 포함한 전체 목표는 부분 완료.**

일반 ChatGPT Plus는 이 문서와 `docs/CURRENT-STATE.md`를 먼저 읽고 아래 JSON/CSV 및 Actions를 조회하면 된다. 로컬 Work 세션 없이 GitHub에서 근거를 확인할 수 있다. 과거 보고서를 현재 결과로 대체하지 않는다.

## A. 전체 현황

| 구분 | 확인 결과 |
|---|---|
| Supabase `toolbox_public_site_sources` | 67개 등록. 웹앱 전체 개수와 다름 |
| 기존 공개 웹앱 | 71개, 한·영 주소 모두 HTTP 200 |
| 아브레다 대표 주소 사용 | 70개: 기존 31개 + 이번 통합 39개 |
| pages.dev가 대표 주소인 기존 앱 | 하루한칸 1개 |
| 블로그 | 한국어 34글, 영어 34글, 목록 2개 |
| D1 기존 원장 | 감사 시작 시 73행. 과거 별칭 포함, 앱 수 아님 |
| Cloudflare Pages 프로젝트 | API 목록 66개. 허브·관리·별칭·시험 프로젝트 포함, 앱 수 아님 |
| 추가 미등록 배포 발견 | `proto-lab`: https://proto-lab-2nw.pages.dev/ HTTP 200, 제목 `PROTO LAB / 경기 데이터 분석 도구`. 이 저장소 소스 및 등록 테이블에서 대응 확인 못함. 기존 71개와 별도 |

- 전체 기존 앱의 ID·한영 이름·이전 등록 주소·새 주소·배포 프로젝트·SEO·GA4 설치: [inventory.csv](../site-factory/ops/domain-audit-20261121/inventory.csv), [inventory.json](../site-factory/ops/domain-audit-20261121/inventory.json).
- 공용 등록 테이블에 없는 기존 앱: CSV 병합, 원고 분석, 소설 플래너, 하루한칸. 별도 legacy 수집기를 사용하며 누락 앱으로 삭제하지 않았다.
- 전체 관련 브랜치 11개의 SHA와 main 대비 소스 디렉터리 차이: `inputs.json`. 옛 브랜치의 후퇴된 구현을 재배포하지 않았다.
- `/quest/`, `/app/ai-log.html`은 하루한칸의 개인 기록 기능이다. 별도 공개 광고 도구로 합산하거나 사용자 기록을 옮기지 않았다.

## B. 실제 변경

1. `domain-routes.json`에 기존 도구 39개의 한·영 주소를 명시하고 기존 `tb-toolbox-hub`에 `/tools/<slug>/`, `/en/tools/<slug>/`로 통합했다. 디자인·처리 코드·다운로드 자산을 보존했다.
2. 허브·블로그·카탈로그 내부 링크, canonical, hreflang, sitemap을 함께 정리했다. Supabase 등록 URL 39행은 이전 값이 일치할 때만 변경했다. 서비스 ID·방문 이벤트·일별 집계는 삭제하지 않았다.
3. 기존 프로젝트 39개는 계속 작동한다. 한·영 옛 주소 78개가 HTTP 200이고 새 주소를 canonical로 가리킨다. 임의 301은 넣지 않았다. canonical은 Google의 선택을 보장하지 않는다.
4. 실제 한·영 About 페이지, 정책 페이지 canonical/언어 링크, 정확한 방문 이벤트 수집 설명, 문의용 공개 GitHub 경로를 반영했다. 영어 자막 도구 정책 링크도 운영 재검증했다. 문의 폼 메시지를 보내지는 않았다.
5. 수집기 v4의 외부 manifest 의존 때문에 새 origin 요청이 `invalid_event`로 거절되는 것을 재현했다. 등록된 67개 기본 주소를 내장 허용 목록에 포함하고 과거 origin을 보존한 v5를 Supabase에 배포했다. 외부 목록의 오래된 응답/조회 실패 시에도 현재 기본 주소를 허용한다. 저장 필드·개인정보 범위는 확대하지 않았다.
6. 광고 공통 설정 `ads-config.json`은 비활성 상태다. 소스에는 기존 `accounts/pub-1802341703309961`이 있지만 계정 승인 확인 없이 광고 로더/단위/ads.txt로 연결하지 않았다. 새 ID 생성·광고 신청·광고 클릭은 하지 않았다.

## C. 애드센스·SEO 준비 상태

| 항목 | 상태 | 근거와 한계 |
|---|---|---|
| 대표 사이트·공개 도구 접속 | 통과 | 현재 주소 222개 HTTP 200. 광고 승인과 별개 |
| 이전 도구 기능·한영·다운로드·오류 입력 | 통과 | 실제 운영 Chromium 검사, 아래 실행 근거 |
| 탐색·소개·정책 링크 | 수정 완료 | About 실페이지, 내부 주소·영어 정책 링크 수정 |
| Title·Description·H1·canonical·hreflang | 수정 완료 | 조사 페이지의 title 중복/description·canonical·H1 누락/noindex 없음. 새 도구 쌍과 블로그 모바일 메타 검사 |
| sitemap·robots | 통과 | 실제 파일 접속과 생성 검사. Google 실제 색인 완료 의미 아님 |
| 블로그 이미지·모바일 | 통과 | 모든 글 이미지 ALT, 70개 모바일 페이지 검사. 고유 이미지 URL 26개 HTTP 200 |
| 글의 충분한 독창성·정책 적합성 전체 심사 | 미완료 | 기술 검사로 전체 글의 편집 품질·광고 정책 심사 통과를 단정하지 않음. 새 글 대량 생성 안 함 |
| 실제 문의 폼 전달 | 확인 불가 | 전송 테스트 안 함. 공개 GitHub 문의 링크 추가 |
| 광고 계정·사이트 Ready 상태 | 확인 불가 | 브라우저 Google 로그인 필요. 기존 수익 동기화 no_rows도 승인 증거 아님 |
| 실제 광고 설정·유효한 ads.txt·지역별 광고 동의 | 미완료 | ads.txt 요청은 홈 HTML 반환. 계정 확인 후 실제 ID로 설정 필요. 현재 광고 미송출 |
| Search Console 전체 URL 색인·Core Web Vitals | 확인 불가 | 색인/실사용자 성능 전체 원천 없음. HTTP 응답 시간은 CWV가 아님 |

Google 공식 요구와 운영 권장사항을 구분한다. 정책 준수·사이트 검토·실제 유용한 원본 콘텐츠 및 적용되는 개인정보/동의 요건이 중요하다. About/문의/약관 정리는 운영상 준비이며, 특정 페이지 수나 글 수만으로 승인을 보장하는 공식 기준은 확인하지 못했다. 한영 블로그는 기존 대응을 유지했으며 새 번역 관계를 임의 생성하지 않았다. 모든 글의 의미상 번역 대응 검토까지 통과로 판정하지 않는다.

## D. 검증 근거

- 구현: [3f229f4](https://github.com/ghfmf1-coder/my-daily-life/commit/3f229f418d15c33a6d00827e20b9a0cf0aeeebd5).
- 운영 검증 개선: [1e8d447](https://github.com/ghfmf1-coder/my-daily-life/commit/1e8d447ff0c4b505407358c34965fe268061f995).
- 영어 정책 링크: [f39595a](https://github.com/ghfmf1-coder/my-daily-life/commit/f39595af1b632b54d192f26841881ae016fe67ea).
- [전체 통합 실행 44882826087](https://github.com/ghfmf1-coder/my-daily-life/actions/runs/44882826087): **completed/success**. 소스 검사 78개, 기존 GA4/방문 세션·배송 회귀 검사, 허브 및 기존 프로젝트 배포. 운영 모바일 한영 78개, Work 도구 기능·오류 입력·CSV 다운로드 한국어 29개와 영어 29개, 기존 앱/GA4 smoke 12개 통과. factory 도구와 배송 도구의 다운로드도 78개 검사 안에서 확인했다.
- [최종 정책·블로그 실행 44883268672](https://github.com/ghfmf1-coder/my-daily-life/actions/runs/44883268672): **completed/success**. 정책 회귀 2개, 실제 블로그 모바일 70페이지 통과. 최종 허브 배포 `https://b93bb8c7.tb-toolbox-hub.pages.dev`.
- 기존 도구 중 변경하지 않은 기능은 이전 검증 이력을 재사용했다. 모든 앱의 모든 기능을 이번에 전수 재실행했다고 보고하지 않는다. 로그인 후 하루한칸 데이터 수정도 시험하지 않았다.
- `production-function-tests.json`: GA4 `page_view`, `tool_complete` 실제 응답 **204**, 측정 ID `G-YHSK49NC2E`, debug 표시, page_view 중복 없음, URL 검색어/토큰/해시 전송 없음.
- `collector-origin-dryrun.json`: 새 origin 39개 모두 저장하지 않는 진단 통과.
- `production-results.json`: 실제 DB 조회로 한국어·영어 자동화 테스트 이벤트 확인. `is_visit=false`, `category=automated`. 별도 재전송은 duplicate=true. 사람 수에 포함 금지.
- `live-before.json`, `live-after.json`, `aliases-final.json`, `image-and-technical-http.json`, `registry-url-update.json`, `traffic-detail.json`: HTTP/메타/등록 변경/통계 원천. 숫자는 Python으로 집계했다.
- 주요 변경 파일: `.github/workflows/abreda-domain-*.yml`, `scripts/hub_domains.py`, `factory.py`, `bilingual_en.py`, `blog_articles.py`, `ops/domain-routes.json`, `visit-sites.json`, `ads-config.json`, `admin-worker/public-visit-edge/index.ts`, 관련 테스트와 허브 정책 페이지.
- 첫 실행 44882334550은 허브 업로드 후 urllib HTTP 403으로 중단됐다. 검증 실패를 무시하지 않고 curl 기반 실제 목적지 검사 후 후속 실행 성공을 확인했다. GitHub Pages 별도 루트 배포 실패는 Cloudflare Pages 성공으로 숨기지 않는다. 운영 대상은 Cloudflare Pages이며 해당 GitHub Pages 실패 원인은 이번 범위에서 확인하지 않았다.

### 방문 통계 해석

- GA4 속성 563183346 연결에서 11/14–20 보고서가 빈 응답이었다. 기간을 11/01–20으로 확장하면 11/08·10·11 이벤트 행이 반환된다. 연결 전체가 고장 났다고 단정할 수 없다.
- 운영 코드의 Google 수신은 현재 통과하지만, 최근 보고서가 비는 정확한 원인은 미확정이다. GA4는 동의 후 수집하며 자체 DB와 수집 조건·지표가 다르다. 동의만이 원인이라고 단정하지 않는다.
- Search Console 연결 자료는 11/14–19에 노출 71·클릭 1을 반환했다. 검색 클릭은 전체 방문자 수가 아니다.
- Supabase 이벤트와 일별 집계 대조는 불일치 없음. `unknown`, `likely_human`은 검증된 실제 사람 수가 아니다. 이벤트 ID는 재전송 중복을 제거하고 탭/일 방문 플래그는 기기 간 고유 사용자를 식별하지 않는다.
- 언어별 이벤트와 도구별 ID는 구분한다. 기존 legacy 수집기의 블로그별 URL 구분은 없다. 과거 운영자 방문도 완전히 분리할 수 없다. QA 제외 표시는 유지했다.
- Cloudflare Analytics는 검증된 조회 권한이 없어 조회 완료로 표시하지 않는다. Google/Search Console 별도 도구의 payment_required는 결제하지 않았다.

## E. 남은 작업과 폐기 판단

**사용자 계정/권한이 필요한 부분**

- 하루한칸: DNS 전용 secret이 없음을 Actions에서 확인했다. 기존 프로젝트의 별도 `haru.abreda.com` 등 연결은 DNS 충돌 확인, Supabase 가입/비밀번호 복구 redirect 허용, origin별 localStorage/세션 보호 검증 후 진행해야 한다. 인증정보 신규 발급·권한 확대·DNS 변경은 하지 않았다.
- AdSense 계정 로그인 후 abreda.com의 실제 사이트 상태와 게시자 계정을 확인해야 한다. 승인 신청은 별도 명시적 요청 전까지 하지 않는다. 광고 활성화 전 실제 ads.txt 및 해당 지역 동의 체계를 설정해야 한다.
- 관제센터 Pages 카탈로그는 배포했지만 `/next/`의 Worker 최신 UI·D1 대표 URL/별칭 표시 전체 반영은 미완료다. 기존 Worker 인증 실패 이력과 갱신 근거 부재 때문에 같은 토큰으로 재시도하지 않았다. D1 기록을 삭제하거나 Pages 토큰 권한을 확장하지 않았다.

**원천/시스템상 미확인 부분**

- 최근 GA4 빈 보고서의 정확한 원인, 모든 실제 고유 사용자 수, 블로그별 자체 DB 방문자, 모든 URL의 실제 색인, CWV, 전체 글 편집 품질.
- 추가 `proto-lab`은 소스/등록/방문 근거가 없으므로 별도 보류 목록에 남겼다. 도박 관련 내용 여부까지 검토 없이 아브레다 광고 도메인에 연결하지 않았다.

**폐기: 이번 작업에서 없음.** 현재 연결이 보류된 것과 기술적으로 통합 불가능한 것은 다르다. 하루한칸에는 10/24–11/20 범위 중 likely_human 분류 이벤트와 최근 unknown 이벤트가 있으나 실제 지속 방문자 수로 확정할 수 없다. proto-lab은 원천 데이터 부재로 방문자 확인 불가. 통합 불가능·방문자 없음이라는 근거가 없으므로 일괄 폐기 조건이 성립하지 않는다. 사용자 데이터를 삭제하지 않았다.

## 공식 정책 출처와 실패 조건

2026-11-21 확인. 게시 연도가 없는 문서는 임의 연도를 붙이지 않는다.

- Google AdSense 원본 콘텐츠/준비: https://support.google.com/adsense/answer/7299563
- Google AdSense 사이트 상태/Ready: https://support.google.com/adsense/answer/12170222
- Google AdSense 사이트 추가/검증: https://support.google.com/adsense/answer/12169212
- Google AdSense 개인정보 고지: https://support.google.com/adsense/answer/1348695
- Google의 2023-02-20 사이트 관리 변경: https://support.google.com/adsense/answer/12170421 — 기존 사이트의 하위 도메인은 별도 Sites 항목으로 관리하지 않음. 별도 pages.dev 사이트가 abreda.com 승인에 자동 포함된다는 뜻은 아니다.
- Google 지역별 CMP 요구(EEA/영국 2024-01-16, 스위스 2024-07-31): https://support.google.com/adsense/answer/13554116 — 해당 지역 개인 맞춤 광고는 인증 CMP 조건을 확인해야 한다. 기존 GA4 동의 배너만으로 충족했다고 볼 수 없다.
- Google Search Central canonical: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls — canonical은 신호이며 다른 URL이 선택될 수 있다.
- Cloudflare Pages redirects(2026-08-25 갱신): https://developers.cloudflare.com/pages/configuration/redirects/ — Functions 경로 등 적용 조건이 있으므로 검증 없이 리디렉션을 넣지 않았다.

도메인 통합은 승인·광고 게재·검색 색인을 보장하지 않는다.
