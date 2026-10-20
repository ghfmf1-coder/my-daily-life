# Gateway (not deployed; fail-closed prototype)

Routes:
- GET /health: reports gateway availability, not upstream provider health.
- GET /admin/providers: requires bearer ADMIN_TOKEN, returns non-secret provider status.
- POST /v1/lookup: bearer per-site token, JSON { "provider":"usda-fooddata","query":"apple" }.

All external calls are disabled until (1) verified provider terms and live tests are recorded, (2) the owner approves credentials and billing, (3) Cloudflare Worker secrets and a USAGE KV binding are provisioned, (4) the provider is marked connected, and (5) ENABLE_PROVIDER_CALLS is explicitly enabled. No arbitrary outbound URLs.

IMPORTANT: Cloudflare KV counters are eventually consistent and non-atomic. They are **not** sufficient to guarantee hard spending caps. Before enabling paid APIs, replace KV budgeting with Durable Objects transactional quotas and provider-side billing caps; otherwise leave the gateway disabled.

ADMIN_TOKEN is server-side only. Never put admin/site bearer tokens into the public static admin website JavaScript. The dashboard's registry is read-only and carries no credentials. Any authenticated management controls must use a server-side session authorization layer, not a browser-shipped shared secret.

No API has been activated or verified. This is a safe deployable foundation, not a functioning paid integration.
