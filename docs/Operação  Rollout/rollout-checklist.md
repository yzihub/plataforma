# Rollout Checklist - Ju Cognitive Runtime

## Antes de qualquer execucao

- [ ] Estado real da VPS documentado
- [ ] Services swarm existentes mapeados
- [ ] Rede overlay mapeada
- [ ] Volumes mapeados
- [ ] SSL e Cloudflare conferidos
- [ ] `DATABASE_URL` ou `SUPABASE_DB_URL` disponivel
- [ ] `REDIS_URL` disponivel
- [ ] `OPENAI_API_KEY` disponivel
- [ ] `EVOLUTION_WEBHOOK_SECRET` disponivel

## Runtime

- [ ] `GET /health` ok
- [ ] `GET /metrics` ok
- [ ] guardian ativo
- [ ] fallback ativo
- [ ] rollback switch confirmado
- [ ] logs com `request_id`

## Webhook

- [ ] Evolution apontando para `/cognitive/turn`
- [ ] header `x-webhook-secret` validado
- [ ] dedupe por `message_id`
- [ ] lock por `conversation_id`

## QA

- [ ] behavioral QA resetado
- [ ] sandbox limpo
- [ ] traces persistidos
- [ ] replay disponivel
- [ ] report markdown gerado

## Pilot

- [ ] internal-only ligado
- [ ] whitelists carregadas
- [ ] fallback para n8n testado
- [ ] rollout por porcentagem habilitado

## Go/No-Go

- [ ] health ok
- [ ] metrics ok
- [ ] webhook ok
- [ ] Redis ok
- [ ] Supabase ok
- [ ] OpenAI ok
- [ ] guardian ok
- [ ] parity aceitavel
- [ ] divergencias criticas zero
