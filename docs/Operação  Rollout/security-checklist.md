# Security Checklist - Ju Cognitive Runtime

## Webhook security

- [ ] `x-webhook-secret` exigido
- [ ] replay protection ativa
- [ ] duplicate protection ativa
- [ ] idempotency por `message_id`

## Proxy / edge

- [ ] Cloudflare Full Strict
- [ ] WAF sem challenge no webhook
- [ ] cache bypass em health, metrics e webhook
- [ ] real IP configurado com `CF-Connecting-IP`
- [ ] Traefik router oficial ativo
- [ ] Traefik TLS terminator oficial ativo
- [ ] Traefik labels do runtime validadas

## App hardening

- [ ] `trustProxy: true`
- [ ] body limits configurados
- [ ] timeouts configurados
- [ ] no secrets em log
- [ ] no secrets em markdown reports

## Operational controls

- [ ] emergency force n8n ativo
- [ ] fallback automatico ativo
- [ ] guardian ativo
- [ ] pilot overrides funcionais

## Secrets management

- [ ] usar os segredos ja existentes
- [ ] nao criar novos arquivos env
- [ ] nao expor valores em report ou trace
- [ ] rotacao de segredo planejada antes de rollout maior
