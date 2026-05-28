# Runtime Deployment Plan - Ju Cognitive Runtime

## Fase 1 - Infra prep

- Mapear services swarm e redes overlay existentes.
- Confirmar quais portas estao livres nas camadas Swarm/Traefik.
- Confirmar SSL e Cloudflare no dominio `runtime.yzihub.com`.
- Confirmar onde os segredos ficam na VPS.
- Confirmar que Redis e Supabase estao acessiveis.

## Estado confirmado ate agora

- A VPS usa Docker Swarm.
- O edge oficial e Traefik `traefik:v3.5.3`.
- Traefik publica `80` e `443`.
- A rede overlay principal e `YziNet`.
- Services relevantes incluem `traefik_traefik`, `evolution_evolution_api`, `n8n_n8n_editor`, `n8n_n8n_webhook`, `n8n_n8n_worker`, `evolution_evolution_redis` e `n8n_n8n_redis`.
- `DATABASE_URL`/`SUPABASE_DB_URL` e `REDIS_URL` ainda nao estao presentes no `.env.local` deste workspace.
- Nao foi possivel inspecionar o Swarm real da VPS a partir deste host.

## Fase 2 - Docker integration

- Adicionar o runtime cognitivo como service do Swarm.
- Expor apenas a porta interna do service.
- Entrar na overlay `YziNet`.
- Usar labels do Traefik para routing.
- Garantir logs observaveis em stdout/stderr.

## Fase 3 - Traefik + Cloudflare

- Publicar `runtime.yzihub.com` via Traefik.
- Habilitar `trustProxy`.
- Preservar `x-request-id`.
- Preservar `x-webhook-secret`.
- Bypassar cache em `/cognitive/turn`, `/health`, `/metrics`.

## Fase 4 - Runtime online

- Validar `GET /health`.
- Validar `GET /metrics`.
- Validar conectividade com Redis.
- Validar conectividade com Supabase.
- Validar conectividade com OpenAI.

## Fase 5 - Evolution webhook

- Apontar Evolution para `POST https://runtime.yzihub.com/cognitive/turn`.
- Exigir `x-webhook-secret`.
- Manter idempotencia e replay protection.
- Confirmar dedupe por message id e conversation lock.

## Fase 6 - Behavioral QA

- Executar QA sandbox com `JU_BEHAVIORAL_QA_PHONE`.
- Confirmar que nao ha reuse de historico antigo.
- Confirmar traces completos.
- Confirmar guardian e divergence.

## Fase 7 - Pilot interno

- Habilitar apenas numeros, tenants e leads whitelisted.
- Restringir a texto simples e inbound normal.
- Manter fallback automatico para n8n.

## Fase 8 - 1% rollout

- Usar hashing deterministico por tenant/lead.
- Aumentar somente se parity, governance e timing estiverem estaveis.

## Criterios para avancar

- parity acima do threshold definido
- zero divergencias criticas
- zero regressao SDR critica
- guardian sem rejeicoes inesperadas
- fallback baixo e compreendido
- latencia dentro dos limites

## Criterio minimo antes do primeiro deploy

- acesso SSH ou outro canal de admin para a VPS
- mapeamento real de services, portas e Traefik
- confirmacao de onde Redis e Supabase sao acessados
- validacao de que o runtime pode ler `DATABASE_URL`/`SUPABASE_DB_URL` e `REDIS_URL`

## Criterios para rollback

- runtime crash
- timeout OpenAI
- falha Redis
- falha de tool
- violacao de governanca
- divergencia critica
- problema de webhook
