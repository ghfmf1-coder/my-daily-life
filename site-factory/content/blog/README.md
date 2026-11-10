# ABREDA 블로그 발행 및 품질 규칙

목적: 검색 이용자에게 먼저 검증된 문제 해결 방법을 제공한다. 아브레다 도구는 해결 방법 중 선택할 수 있는 하나의 수단일 뿐이다.

## 이미 발행한 기사
- 저장 경로: site-factory/content/blog/*.json
- 한국어: https://abreda.com/blog/
- 영어: https://abreda.com/en/blog/
- 같은 도구를 주제로 유사한 검색어만 바꿔 글을 중복 발행하지 않는다.

## 앞으로 신규 웹앱을 만들 때 자동으로 글 발행
1. 웹앱을 실제 작동하게 구현·테스트하고 기존 도구와 중복되지 않는지 확인한다.
2. 새 site-factory 사이트는 new_site.py로 생성하면 site.json의 blog_required=true와 미완성 blog.json이 생성된다.
3. blog.json 안의 status=draft는 절대 공개되지 않는다.
4. 원천 자료와 실제 UI 기능을 확인한 뒤 한국어(ko)와 영어(en)의 글을 작성한다.
5. 작성 규칙: title, description, problem, steps, alternative, toolIntro, limits, faq를 양쪽 언어에 모두 포함한다.
6. steps는 [ [제목, 직접 실행 가능한 설명], ... ] 구조로 세 단계 이상, faq는 [ [질문, 답변], ... ] 구조로 작성한다.
7. 실제 출처로 확인하지 않은 검색량, 방문자 수, 속도, 금액, 성능 비교, 임의 사례는 금지한다.
8. 내용·도구 링크·지원 범위가 사실일 때 실제 발행일(published)을 기록하고 status=reviewed로 변경한다.
9. reviewed 상태의 사이트가 승인되면 기존 GitHub Actions의 허브 빌드에서 해당 글을 자동 포함한다. canonical, hreflang, BlogPosting, sitemap도 자동 생성된다.
10. blog_required=true인 신규 사이트는 검토된 글이 없으면 배포 자체가 실패한다. 기존 승인 사이트는 영향받지 않는다.

## Work 독립 도구와 유지보수
- Work 사이트는 work-sites/<slug>/blog.json에 같은 JSON 형식으로 추가할 수 있다.
- 실제 독립 Pages 프로젝트 주소로 연결하고, 허브 블로그만 자동 재배포한다.
- 글 내용만 바뀌는 작업에서는 기존 웹앱 전체를 재배포하지 않는다.
- 실패 조건이나 제품 기능이 바뀌면 해당 부분을 업데이트한다. 근거 없는 단정과 중복 복제 글은 공개하지 않는다.
- 아브레다는 워드프레스 설치가 필요하지 않은 정적 블로그다. 무료 호스팅 구조를 재사용한다.
