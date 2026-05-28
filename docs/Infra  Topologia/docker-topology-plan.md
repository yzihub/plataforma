# Docker Topology Plan - Ju Cognitive Runtime

## Objetivo

Inserir o runtime cognitivo na stack Docker Swarm existente sem quebrar Evolution, n8n ou o proxy atual.

## Containers esperados

- `traefik_traefik`
- `evolution_evolution_api`
- `n8n_n8n_editor`
- `n8n_n8n_webhook`
- `n8n_n8n_worker`
- `evolution_evolution_redis`
- `n8n_n8n_redis`
- `runtime-cognitive`

## Discovery real confirmado ate agora

- A VPS usa Docker Swarm.
- O edge oficial e Traefik `traefik:v3.5.3`.
- A rede overlay principal e `YziNet`.
- Services swarm relevantes foram descobertos no host real.
- O desenho abaixo continua sendo a topologia alvo, mas agora esta alinhado ao Swarm real.

## Topologia recomendada

```text
external traffic
  -> Cloudflare
  -> Traefik (Swarm)
  -> runtime-cognitive service:3333

runtime-cognitive service
  -> Supabase/Postgres
  -> Redis via YziNet
  -> n8n webhook/tools
  -> Evolution API
```

## Docker strategy

- Um service dedicado para o runtime.
- Rede overlay compartilhada com n8n, Evolution e Traefik.
- Redis preferencialmente interno na mesma rede YziNet.
- Supabase continua fora da VPS, acessado por URL.
- Logs do runtime devem ir para stdout/stderr e ser capturados pelo orquestrador.

## Healthchecks

- `GET /health`
- `GET /metrics`
- timeout curto
- restart policy `unless-stopped` ou equivalente

## Secrets

Nao criar novos arquivos de env.
Usar os segredos ja existentes no `.env.local` e, na VPS, no mecanismo atual de injecao.

Obrigatorios:

- `DATABASE_URL` ou `SUPABASE_DB_URL`
- `REDIS_URL`
- `OPENAI_API_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_INSTANCE_NAME`
- `EVOLUTION_WEBHOOK_SECRET`

## Persistencia

- logs persistentes
- backups do banco permanecem fora do runtime
- nenhum dado operacional importante deve morar apenas em memoria

## Nao fazer agora

- nao criar microservices
- nao adicionar orquestracao nova
- nao mover Supabase para Docker
- nao dividir o runtime em mais containers sem necessidade

## Deploy strategy ajustada

- build image
- tag image
- deploy stack ou service swarm
- attach overlay network `YziNet`
- validate Traefik routing
- validate TLS
- validate webhook

## Gaps operacionais pendentes

- identificar nomes reais dos services do compose
- identificar redes e aliases reais
- identificar portas publicas e internas reais
- identificar onde Redis realmente roda
- identificar como Evolution e n8n estao conectados hoje
