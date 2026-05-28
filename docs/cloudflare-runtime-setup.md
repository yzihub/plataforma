# Cloudflare Runtime Setup

## DNS

- Record: `runtime.yzihub.com`
- Type: `A` or `CNAME` to the origin host
- Proxy mode: `ON` (orange cloud)

## SSL

- Cloudflare SSL mode: `Full (strict)`
- Origin certificate: install on Nginx or use a valid Lets Encrypt certificate
- Redirect all HTTP traffic to HTTPS at the edge or in Nginx

## Webhook Path

- Official webhook: `POST https://runtime.yzihub.com/cognitive/turn`
- Preserve `x-webhook-secret` and `x-request-id`
- Keep `/cognitive/turn` out of cache

## Recommended Rules

- Cache bypass for `/cognitive/turn`
- Cache bypass for `/metrics`
- Cache bypass for `/health`
- Disable Rocket Loader for the runtime host
- Keep WAF rules on, but do not challenge the webhook path

## Security

- Forward `CF-Connecting-IP` to Nginx
- Trust real IP only after Cloudflare IP ranges are configured on the origin
- Keep `Strict-Transport-Security` enabled at the origin or edge
- Use `Full (strict)` so the origin certificate is validated

## Operational Notes

- `trustProxy: true` must stay enabled in Fastify
- Nginx should forward `X-Request-ID` for log correlation
- Rotate the Cloudflare origin/IP allowlist if Cloudflare changes its published ranges
