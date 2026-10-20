# Small Toolbox API Registry — Phase 1

Purpose: keep a reusable, evidence-based catalog of third-party APIs and datasets before any site integrates them.

## Security boundaries
- **Never commit API keys, access tokens, credentials, or user data.** Secrets belong in Cloudflare Workers Secrets or an equivalent managed secret store.
- Registry entries contain metadata only, never credentials.
- Do not call paid providers or enable billing without explicit owner approval.
- No unrestricted public proxy to third-party APIs. Require per-site authorization, quotas, abuse protection, and request validation.
- Respect provider caching, redistribution, licensing, rate limits, and commercial-use terms.
- Mark untested integrations as **candidate**, not connected or verified.

## Entry workflow
1. Discover a provider and its official documentation.
2. Check self-service registration, commercial usage, storage/re-distribution rights, pricing, quotas, and any special approvals.
3. Record dated evidence links and mark status as `researching`, `eligible`, `blocked`, or `connected`.
4. After owner approves credentials/billing, provision secrets outside the repository.
5. Perform a minimal live request; log timestamp, result, quota, and cost.
6. Expose only a narrow, authenticated service adapter, not a raw provider proxy.
7. Recheck pricing and terms regularly; disable adapters when permissions or quotas change.

## Next implementation
- JSON-schema validation and automated checks for registry entries.
- Admin dashboard read-only API inventory and provider health.
- Adapter interface for reusable service calls and per-site rate limits.
- Daily cost estimates, hard application-side quotas, and provider budget alerts.
- Separate dataset inventory with license, provenance, TTL, and permitted redistribution.

Initial status: **design started; no API keys issued, providers connected, or billable services enabled.**
