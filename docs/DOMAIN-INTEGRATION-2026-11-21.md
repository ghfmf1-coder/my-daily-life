# Abreda domain integration and AdSense readiness — 2026-11-21

Status: implementation prepared; production deployment and browser verification pending. Do not read this as completed migration.

## Scope and evidence

- Existing repo, Cloudflare Pages projects and Supabase data preserved. No new app, server, DNS, paid service, publisher ID or ad unit.
- Explicit migration mapping: `site-factory/ops/domain-routes.json`. Adds the existing stateless tools to `/tools/<slug>/` and `/en/tools/<slug>/` in `tb-toolbox-hub`.
- Existing projects retain functional pages; canonical and language alternates point to the verified hub destinations. No untested redirects.
- Audit inputs and actual HTTP metadata: `site-factory/ops/domain-audit-20261121/`.
- Latest registry read at start: https://github.com/ghfmf1-coder/my-daily-life/actions/runs/44881209944 . Public source registration and D1 ledger rows are different populations.
- Existing test fixtures are synthetic QA inputs, not fabricated production traffic. QA uses `tb_test=1` and automation exclusion.
- Local browser execution was blocked by the environment's socket restriction. Real browser gates run on the existing GitHub Actions infrastructure.

## Changes

- Explicit hub route manifest, safe per-tool assets, canonical/hreflang, catalog/blog links, expanded hub sitemap.
- Existing language generator supports isolated output, avoiding mutations to Korean source during hub build.
- Collector origin manifest keeps historical origins and adds the verified primary origin. Database URL updates only after live verification.
- Added real Korean/English About pages; corrected policy language about stored event fields; added a GitHub public issue fallback on contact pages. Contact form delivery is not claimed verified.
- Shared AdSense configuration is disabled, contains no publisher ID and installs no ad loader. Review request and advertising activation are not performed.

## Known limits

- GA4 account 563183346 is connected in Windsor. 2026-11-14–20 event query returned no rows. Empty response is not proof of zero visitors.
- Self-hosted collector does not require GA4 consent; GA4 does. Unknown-category events are not verified people. Raw event IDs deduplicate retries, not devices or unique users. Blog paths are not stored separately in the legacy database collector.
- Current public event and daily aggregation queries returned no mismatches. No prior events were deleted or relabelled.
- AdSense revenue sync `no_rows` does not establish account approval status. Account/site readiness must be verified in AdSense before requesting review or activating ads.
- The authenticated admin UI and Worker deployment are separate from Pages. Earlier Worker token authentication failed; no unchanged retry, token creation or permission expansion.
- User's additional instruction: dispose of apps proven impossible to integrate, except where sustained meaningful traffic warrants retention. Missing/ambiguous traffic evidence is not treated as no visitors. No app has yet been proven technically impossible to integrate; no destructive action is justified by this audit so far.

## Official sources

Checked 2026-11-21. Publication year is unspecified unless the page supplies it.

- Google AdSense: site readiness and original useful content: https://support.google.com/adsense/answer/7299563
- Google AdSense: site statuses and Ready: https://support.google.com/adsense/answer/12170222
- Google AdSense: adding a site and verification: https://support.google.com/adsense/answer/12169212
- Google AdSense: advertising privacy disclosures: https://support.google.com/adsense/answer/1348695
- Google Search Central: canonical signals, not guaranteed selection: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Cloudflare Pages: redirects (updated 2026-08-25); static redirects do not apply to Pages Functions: https://developers.cloudflare.com/pages/configuration/redirects/

Official requirements are policy compliance, ownership verification, applicable privacy/consent disclosures and AdSense readiness. About/contact/terms navigation is an operational preparation measure, not a guarantee of approval or a separately stated universal minimum-page requirement. Domain consolidation does not automatically approve ads, fix low-value content or guarantee indexing.
