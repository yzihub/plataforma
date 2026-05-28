# VPS Runtime Checklist

## Base Host

- `node` version is 22 or newer
- `npm` is available
- `pm2` is installed
- `nginx` is installed and running

## Firewall

- `ufw` allows `22`, `80`, and `443`
- `ufw` denies everything else by default
- SSH access is restricted to the expected admin IPs

## Intrusion Protection

- `fail2ban` is installed and active
- SSH jail is enabled
- Nginx jail is enabled if logs are available

## Process Manager

- `pm2 startup` was executed on the host
- `pm2 save` was run after the runtime started
- `ecosystem.config.js` points to the runtime entrypoint

## Nginx

- `nginx -t` passes before reload
- `runtime.yzihub.com.conf` is enabled
- `systemctl reload nginx` succeeds

## SSL

- Certificate renewal is automated
- `certbot renew --dry-run` passes
- The origin certificate matches `runtime.yzihub.com`

## Logs

- PM2 logs are persisted
- Nginx access and error logs are rotated
- Runtime logs include `request_id`

## Recovery

- `pm2 restart jurema-cognitive-runtime` works
- `curl http://127.0.0.1:3333/health` returns healthy checks
- `curl http://127.0.0.1:3333/metrics` returns Prometheus text
- `JUREMA_CUTOVER_FORCE_N8N=true` remains the emergency rollback switch
