# Gateway (not deployed; fail-closed prototype)

Routes:
- GET /health: reports gateway availability, not upstream provider health.
- GET /admin/providers: requires bearer ADMIN_TOKEN, returns non-secret provider status.
- GET /admin/usage?day=YYYY-MM-DD: requires bearer ADMIN_TOKEN; daily per-site/provider request counters (max 500 rows; may be incomplete).
- POST /v1/lookup: bearer per-site token, JSON { "provider":"usda-fooddata","query":"apple" }.

All external calls are disabled until (1) verified provider terms and live tests are recorded, (2) the owner approves credentials and billing, (3) Cloudflare Worker secrets and a USAGE KV binding are provisioned, (4) the provider is marked connected, and (5) ENABLE_PROVIDER_CALLS is explicitly enabled. No arbitrary outbound URLs.

IMPORTANT: Cloudflare KV counters are eventually consistent and non-atomic. They are **not** sufficient to guarantee hard spending caps. Before enabling paid APIs, replace KV budgeting with Durable Objects transactional quotas and provider-side billing caps; otherwise leave the gateway disabled.

ADMIN_TOKEN is server-side only. Never put admin/site bearer tokens into the public static admin website JavaScript. The dashboard's registry is read-only and carries no credentials. Any authenticated management controls must use a server-side session authorization layer, not a browser-shipped shared secret.

No API has been activated or verified. This is a safe deployable foundation, not a functioning paid integration.

## Deployment checklist (owner-approved only)
1. Verify provider commercial-use permissions and current pricing in the official documentation. Update providers.json and its evidence before activation.
2. Create a dedicated Cloudflare KV namespace, bind it as USAGE in wrangler.toml; configure ADMIN_ORIGIN to the real admin domain.
3. Provision ADMIN_TOKEN, SITE_TOKENS_JSON, and any provider-specific API keys via Cloudflare secrets. Do not enter these into browser forms, GitHub files, or static Pages assets.
4. Set a trusted UPGRADE_URL only after a working payment checkout and verified entitlement service exists. The current upgrade response is informational only and does not process payments.
5. Keep ENABLE_PROVIDER_CALLS=false until strict atomic quotas, entitlement verification, provider-side spending limits, and live smoke tests are implemented.
6. Deploy the Worker only after owner approval. Test unauthorized access, quota exhaustion, CORS, provider timeouts, and no-secret logging.

**Limitations:** KV usage counters are non-atomic, so this gateway is not production-ready for paid provider calls. API requests are not yet tied to a verified user account or purchase. The browser admin cannot safely carry ADMIN_TOKEN. No payment processor has been integrated or approved.

## Free usage policy (implemented, not deployed)
- Each visitor gets 5 API lookups per site/provider per calendar day in Asia/Seoul; resets at 00:00 KST. DAILY_VISITOR_LIMIT can change the allowance.
- Site-level emergency budget defaults to 100 requests/day/provider; this is a safety threshold, not a guaranteed hard cap.
- Visitors are distinguished by a daily-rotating HMAC of Cloudflare's connecting IP using server-side VISITOR_HASH_SECRET. Raw IPs are not stored in KV. Shared IPs (offices, carriers, NAT) can share a quota; this is not an authenticated per-person quota.
- 429 responses include remaining reset timestamp and an explanation; no payment prompts or checkout.
- KV counters are eventually consistent and non-atomic; simultaneous calls can exceed a limit. Do not activate paid APIs without atomic quotas and billing controls.
- Client browsers must never receive SITE_TOKENS_JSON or ADMIN_TOKEN. An authenticated server-side mediator is required for public sites.
