# VPS Topology Plan - Ju Cognitive Runtime

Data: 2026-05-25

## Status do que ja esta confirmado no repo

- O runtime cognitivo existe e responde via Fastify.
- O endpoint oficial e `POST /cognitive/turn`.
- Existem health e metrics em `GET /health` e `GET /metrics`.
- A VPS usa Docker Swarm.
- O edge oficial e Traefik `traefik:v3.5.3`.
- Traefik publica `80` e `443`.
- A rede overlay principal e `YziNet`.
- Services relevantes incluem `traefik_traefik`, `evolution_evolution_api`, `n8n_n8n_editor`, `n8n_n8n_webhook`, `n8n_n8n_worker`, `evolution_evolution_redis` e `n8n_n8n_redis`.
- Existe script de deploy operacional, mas a operacao real deve seguir Swarm + Traefik.
- Existe suporte a behavioral QA, shadow, pilot, guardian e rollback.

## Bloqueios reais identificados

- `runtime.yzihub.com` precisa ser validado no caminho Traefik real da VPS.
- O runtime local nao sobe com o `.env.local` atual porque faltam:
  - `DATABASE_URL` ou `SUPABASE_DB_URL`
  - `REDIS_URL`

## Discovery real obtido ate agora

- DNS de `runtime.yzihub.com` resolve para `CNAME yzihub.com`.
- `.env.local` contem:
  - `OPENAI_API_KEY`
  - `EVOLUTION_API_URL`
  - `EVOLUTION_API_KEY`
  - `EVOLUTION_INSTANCE`
  - `EVOLUTION_WEBHOOK_SECRET`
- `.env.local` nao contem:
  - `DATABASE_URL`
  - `SUPABASE_DB_URL`
  - `REDIS_URL`
- Nao ha acesso local a:
  - daemon Docker
  - comando `nginx`
  - comando `ss`
  - config SSH da VPS

## Gaps que ainda dependem de acesso a VPS

- services swarm reais
- stack ou service deploy real
- redes overlay reais
- portas internas reais
- routers e middlewares reais do Traefik
- healthchecks reais dos containers
- Redis real e seu hostname interno
- Evolution real e seu webhook atual
- n8n real e seus endpoints internos
- logs e restart policies da VPS

## O que ainda precisa ser descoberto na VPS

A VPS atual ja roda Docker Swarm com Evolution e n8n. Antes de qualquer deploy, mapear:

- services swarm ativos
- stacks atuais
- redes overlay
- volumes persistentes
- portas expostas
- Traefik atual
- SSL atual
- topology de Cloudflare
- restart policies
- logs e rotacao
- backups

## Comandos de descoberta sugeridos na VPS

```bash
docker ps
docker compose ls
docker network ls
docker volume ls
docker service ls
docker stack ls
docker service inspect traefik_traefik
docker service inspect evolution_evolution_api
docker service inspect n8n_n8n_webhook
docker service inspect n8n_n8n_editor
docker service inspect n8n_n8n_worker
systemctl status docker
journalctl -u docker -n 200 --no-pager
```

Se houver stack em swarm:

```bash
docker stack services <stack_name>
docker stack ps <stack_name>
docker stack config <stack_name>
```

## Topologia alvo

```text
Cloudflare
  -> Traefik (Swarm)
      -> runtime-cognitive service
      -> Redis
      -> Supabase/Postgres
      -> n8n tools
      -> Evolution outbound
```

## Conectividade esperada

- Runtime recebe inbound do Cloudflare via Traefik.
- Runtime fala com Redis pela rede overlay YziNet.
- Runtime fala com Supabase via URL externa.
- Runtime chama tools no n8n por webhook interno ou rede privada.
- Runtime chama Evolution apenas para outbound autorizado.

## Ordem segura de implantacao

1. Descobrir estado real da VPS.
2. Reservar portas e rede overlay do runtime.
3. Validar envs e segredos.
4. Subir runtime como service swarm em interno-only.
5. Validar health e metrics localmente.
6. Colocar Traefik na frente.
7. Validar Cloudflare e SSL.
8. Conectar Evolution ao webhook oficial.
9. Rodar behavioral QA.
10. Fazer pilot interno.

## Regra operacional

Nao assumir producao antes de:

- health ok
- metrics ok
- webhook autentica
- Redis acessivel
- Supabase acessivel
- fallback e guardian ativos
- rollback confirmado
