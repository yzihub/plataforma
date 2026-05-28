# Ju Cognitive Runtime - Operational Plan

Data: 2026-05-25

Este documento consolida:

- `docs/Infra  Topologia/vps-topology-plan.md`
- `docs/Infra  Topologia/docker-topology-plan.md`
- `docs/knowledge/runtime-deployment-plan.md`
- `docs/Operação  Rollout/infra-checklist.md`
- `docs/Operação  Rollout/rollout-checklist.md`
- `docs/Operação  Rollout/rollback-checklist.md`
- `docs/Operação  Rollout/security-checklist.md`

Objetivo: manter um unico plano operacional para discovery, deploy controlado, rollout e rollback do runtime cognitivo da Ju.

## 1. Status confirmado no repo

- O runtime cognitivo existe e responde via Fastify.
- O endpoint oficial e `POST /cognitive/turn`.
- Existem health e metrics em `GET /health` e `GET /metrics`.
- Existe configuracao operacional do runtime para deployment em Docker Swarm.
- Existe script de deploy operacional, mas a operacao real deve seguir Swarm + Traefik.
- Existe suporte a behavioral QA, shadow, pilot, guardian, divergence, calibration e rollback.

## 2. Discovery real ja obtido

- A VPS usa Docker Swarm.
- O edge oficial e Traefik `traefik:v3.5.3`.
- Traefik publica `80` e `443`.
- A rede overlay principal descoberta e `YziNet`.
- Services relevantes descobertos:
  - `traefik_traefik`
  - `evolution_evolution_api`
  - `n8n_n8n_editor`
  - `n8n_n8n_webhook`
  - `n8n_n8n_worker`
  - `evolution_evolution_redis`
  - `n8n_n8n_redis`
- `runtime.yzihub.com` continua sendo o endpoint oficial a servir por Traefik.
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

## 3. Bloqueios reais identificados

- `runtime.yzihub.com` ainda precisa ser validado no caminho Traefik real da VPS.
- O runtime local nao sobe com o `.env.local` atual porque faltam:
  - `DATABASE_URL` ou `SUPABASE_DB_URL`
  - `REDIS_URL`
- Nao foi possivel inspecionar `docker`, `nginx` ou `ss` da VPS a partir deste host.

## 4. Topologia alvo

```text
Cloudflare
  -> Traefik (Swarm)
      -> runtime-cognitive service
      -> Redis
      -> Supabase/Postgres
      -> n8n tools
      -> Evolution outbound
```

## 5. Topologia Docker desejada

Swarm services esperados:

- `traefik_traefik`
- `evolution_evolution_api`
- `n8n_n8n_editor`
- `n8n_n8n_webhook`
- `n8n_n8n_worker`
- `evolution_evolution_redis`
- `n8n_n8n_redis`
- `runtime-cognitive`

Estrutura esperada:

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

Regras:

- um service dedicado para o runtime
- rede overlay compartilhada com n8n, Evolution e Traefik
- Redis preferencialmente interno na mesma rede YziNet
- Supabase continua fora da VPS, acessado por URL
- logs do runtime devem ir para stdout/stderr do container/service

## 6. Traefik e Cloudflare

Plano:

- publicar `runtime.yzihub.com` com SSL valido
- habilitar `trustProxy`
- preservar `X-Request-ID`
- preservar `x-webhook-secret`
- bypass de cache em `/cognitive/turn`, `/health`, `/metrics`
- websocket support via Traefik
- forwarded headers
- real IP com `CF-Connecting-IP`
- timeout e body limits apropriados

## 7. Dependencias e envs

Obrigatorios:

- `DATABASE_URL` ou `SUPABASE_DB_URL`
- `REDIS_URL`
- `OPENAI_API_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_INSTANCE_NAME`
- `EVOLUTION_WEBHOOK_SECRET`

Regra:

- nao criar novos arquivos de env
- usar os segredos ja existentes na VPS e no `.env.local`
- nao expor valores em logs ou reports

## 8. Discovery que ainda depende de acesso a VPS

- containers/services swarm reais
- stack ou service deploy real
- redes overlay reais
- portas internas reais
- routers e middlewares reais do Traefik
- healthchecks reais dos containers
- Redis real e seu hostname interno
- Evolution real e seu webhook atual
- n8n real e seus endpoints internos
- logs e restart policies da VPS

## 9. Comandos de descoberta sugeridos na VPS

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
docker service logs traefik_traefik --tail=200
docker service logs evolution_evolution_api --tail=200
docker service logs n8n_n8n_webhook --tail=200
docker service logs n8n_n8n_editor --tail=200
docker service logs n8n_n8n_worker --tail=200
systemctl status docker
pm2 list
journalctl -u docker -n 200 --no-pager
```

Se houver stack em swarm:

```bash
docker stack services <stack_name>
docker stack ps <stack_name>
docker stack config <stack_name>
```

## 10. Infra checklist

- [ ] Node 22+
- [ ] Docker ativo
- [ ] Docker Swarm ativo
- [ ] Traefik ativo
- [ ] Firewall ativo
- [ ] SSH restrito
- [ ] `runtime.yzihub.com` resolve corretamente
- [ ] Cloudflare proxy ON
- [ ] SSL Full Strict
- [ ] porta 443 acessivel
- [ ] porta interna do runtime isolada
- [ ] logs persistidos
- [ ] backup de banco confirmados
- [ ] nenhum estado critico apenas em memoria
- [ ] Redis acessivel
- [ ] Supabase acessivel
- [ ] OpenAI acessivel
- [ ] Evolution acessivel
- [ ] n8n tools acessiveis
- [ ] request_id em todos os logs
- [ ] metrics expostas
- [ ] health endpoint funcionando
- [ ] alerts de timeout e fallback
- [ ] restart policy definida
- [ ] graceful shutdown testado
- [ ] rollback command documentado
- [ ] emergency force-n8n testado

## 11. Rollout checklist

Antes de qualquer execucao:

- [ ] Estado real da VPS documentado
- [ ] Containers existentes mapeados
- [ ] Rede Docker mapeada
- [ ] Volumes mapeados
- [ ] SSL e Cloudflare conferidos
- [ ] `DATABASE_URL` ou `SUPABASE_DB_URL` disponivel
- [ ] `REDIS_URL` disponivel
- [ ] `OPENAI_API_KEY` disponivel
- [ ] `EVOLUTION_WEBHOOK_SECRET` disponivel

Runtime:

- [ ] `GET /health` ok
- [ ] `GET /metrics` ok
- [ ] guardian ativo
- [ ] fallback ativo
- [ ] rollback switch confirmado
- [ ] logs com `request_id`

Webhook:

- [ ] Evolution apontando para `/cognitive/turn`
- [ ] header `x-webhook-secret` validado
- [ ] dedupe por `message_id`
- [ ] lock por `conversation_id`

QA:

- [ ] behavioral QA resetado
- [ ] sandbox limpo
- [ ] traces persistidos
- [ ] replay disponivel
- [ ] report markdown gerado

Pilot:

- [ ] internal-only ligado
- [ ] whitelists carregadas
- [ ] fallback para n8n testado
- [ ] rollout por porcentagem habilitado

Go/No-Go:

- [ ] health ok
- [ ] metrics ok
- [ ] webhook ok
- [ ] Redis ok
- [ ] Supabase ok
- [ ] OpenAI ok
- [ ] guardian ok
- [ ] parity aceitavel
- [ ] divergencias criticas zero

## 12. Rollback checklist

Immediate rollback:

- [ ] ativar `JUREMA_CUTOVER_FORCE_N8N=true`
- [ ] ativar `JUREMA_CUTOVER_EMERGENCY_FALLBACK=true` se necessario
- [ ] congelar rollout
- [ ] mover conversa afetada para n8n

Verify after rollback:

- [ ] runtime parou de responder ao turno novo
- [ ] Evolution voltou ao fluxo anterior
- [ ] nenhum outbound duplica mensagem
- [ ] logs indicam motivo do fallback

Recovery:

- [ ] revisar `ju_runtime_edge_case_queue`
- [ ] revisar divergencias criticas
- [ ] revisar guardian rejections
- [ ] revisar latencia e timeouts
- [ ] revisar custo e contexto

Re-enable criteria:

- [ ] issue identificado
- [ ] issue corrigido
- [ ] health ok
- [ ] metrics ok
- [ ] parity recuperada
- [ ] pilot gate reaberto manualmente

## 13. Security checklist

Webhook security:

- [ ] `x-webhook-secret` exigido
- [ ] replay protection ativa
- [ ] duplicate protection ativa
- [ ] idempotency por `message_id`

Proxy / edge:

- [ ] Cloudflare Full Strict
- [ ] WAF sem challenge no webhook
- [ ] cache bypass em health, metrics e webhook
- [ ] real IP configurado com `CF-Connecting-IP`
- [ ] Traefik router oficial ativo
- [ ] Traefik TLS terminator oficial ativo
- [ ] Traefik labels do runtime validadas

App hardening:

- [ ] `trustProxy: true`
- [ ] body limits configurados
- [ ] timeouts configurados
- [ ] no secrets em log
- [ ] no secrets em markdown reports

Operational controls:

- [ ] emergency force n8n ativo
- [ ] fallback automatico ativo
- [ ] guardian ativo
- [ ] pilot overrides funcionais

Secrets management:

- [ ] usar os segredos ja existentes
- [ ] nao criar novos arquivos env
- [ ] nao expor valores em report ou trace
- [ ] rotacao de segredo planejada antes de rollout maior

## 14. Ordem segura de implantacao

1. Descobrir estado real da VPS.
2. Reservar portas e rede Docker do runtime.
3. Validar envs e segredos.
4. Subir runtime em interno-only.
5. Validar health e metrics localmente.
6. Colocar Traefik na frente.
7. Validar Cloudflare e SSL.
8. Conectar Evolution ao webhook oficial.
9. Rodar behavioral QA.
10. Fazer pilot interno.
11. Avancar para 1% rollout.

## 15. Criterios para avancar

- parity acima do threshold definido
- zero divergencias criticas
- zero regressao SDR critica
- guardian sem rejeicoes inesperadas
- fallback baixo e compreendido
- latencia dentro dos limites

## 16. Criterio minimo antes do primeiro deploy

- acesso SSH ou outro canal de admin para a VPS
- mapeamento real de services, portas e Traefik
- confirmacao de onde Redis e Supabase sao acessados
- validacao de que o runtime pode ler `DATABASE_URL`/`SUPABASE_DB_URL` e `REDIS_URL`

## 17. Regra operacional

Nao assumir producao antes de:

- health ok
- metrics ok
- webhook autentica
- Redis acessivel
- Supabase acessivel
- fallback e guardian ativos
- rollback confirmado

## 18. Primeiro deploy real controlado - Swarm + Traefik

Escopo desta fase:

- manter a cognicao congelada
- subir apenas o runtime cognitivo como service interno e seguro
- nao substituir n8n
- nao executar rollout cliente
- rodar inicialmente em `JU_RUNTIME_MODE=behavioral_qa`
- manter `JUREMA_CUTOVER_FORCE_N8N=true` como rollback imediato

Padroes oficiais:

- stack: `ju-runtime`
- service: `runtime-cognitive`
- porta interna: `3333`
- hostname Traefik: `runtime.yzihub.com`
- rede overlay externa: `YziNet`
- stack file: `infra/swarm/ju-runtime.stack.yml`
- imagem inicial: `yzihub/ju-runtime-cognitive:behavioral-qa`

Artefatos criados:

- `Dockerfile`
- `infra/swarm/ju-runtime.stack.yml`

Configuracao do service:

- conectado somente na overlay `YziNet`
- sem publish direto de portas
- publicado exclusivamente por Traefik
- logs em stdout/stderr do container
- healthcheck interno em `GET http://127.0.0.1:3333/health`
- graceful shutdown com `stop_grace_period: 30s`
- restart policy Swarm `on-failure`
- resource limits: `1.00 CPU`, `768M memory`
- reservations: `0.25 CPU`, `256M memory`

Labels oficiais Traefik:

```yaml
traefik.enable: "true"
traefik.docker.network: YziNet
traefik.http.routers.runtime.rule: Host(`runtime.yzihub.com`)
traefik.http.routers.runtime.entrypoints: websecure
traefik.http.routers.runtime.tls: "true"
traefik.http.routers.runtime.service: runtime
traefik.http.services.runtime.loadbalancer.server.port: "3333"
traefik.http.services.runtime.loadbalancer.passhostheader: "true"
```

Proxy / edge:

- o runtime ja sobe com `trustProxy: true`
- Traefik encaminha websocket upgrade por padrao quando o backend suporta
- headers `X-Forwarded-Proto`, `X-Forwarded-Port` e `X-Forwarded-Host` sao preservados por middleware
- Cloudflare deve manter cache bypass para `/cognitive/turn`, `/health` e `/metrics`

Env obrigatorias validadas localmente em 2026-05-25, sem expor valores:

- `DATABASE_URL` ou `SUPABASE_DB_URL`: faltando no `.env.local` local
- `REDIS_URL`: faltando no `.env.local` local
- `OPENAI_API_KEY`: presente
- `EVOLUTION_API_URL`: presente
- `EVOLUTION_API_KEY`: presente
- `EVOLUTION_INSTANCE`: presente
- `EVOLUTION_INSTANCE_NAME`: presente
- `EVOLUTION_WEBHOOK_SECRET`: presente

Pre-condicao antes do `docker stack deploy`:

- confirmar que o env file existente na VPS contem `DATABASE_URL` ou `SUPABASE_DB_URL`
- confirmar que o env file existente na VPS contem `REDIS_URL`
- confirmar que o deploy sera executado com acesso ao arquivo `../../.env.local` relativo a `infra/swarm/ju-runtime.stack.yml`, ou ajustar o caminho para o env file existente na VPS antes do deploy
- confirmar que a rede overlay externa `YziNet` existe
- confirmar que o Traefik esta conectado a `YziNet`
- nao publicar output de `docker stack config` em logs compartilhados, porque o comando expande `env_file` e pode imprimir segredos

Build controlado:

```bash
docker build -t yzihub/ju-runtime-cognitive:behavioral-qa .
```

Deploy controlado:

```bash
docker stack deploy -c infra/swarm/ju-runtime.stack.yml ju-runtime
```

Validacao Swarm:

```bash
docker service ls
docker stack services ju-runtime
docker service ps ju-runtime_runtime-cognitive --no-trunc
docker service logs ju-runtime_runtime-cognitive --tail=200
docker service inspect ju-runtime_runtime-cognitive
```

Validacao de rede e health interno:

```bash
docker network inspect YziNet
docker service logs traefik_traefik --tail=200
curl -fsS http://127.0.0.1:3333/health
curl -fsS http://127.0.0.1:3333/metrics
```

Validacao Traefik / TLS:

```bash
curl -fsS https://runtime.yzihub.com/health
curl -fsS https://runtime.yzihub.com/metrics
curl -Iv https://runtime.yzihub.com/health
```

Validacao webhook interno, sem trafego cliente:

```bash
curl -fsS https://runtime.yzihub.com/cognitive/turn \
  -H 'content-type: application/json' \
  -H "x-webhook-secret: $EVOLUTION_WEBHOOK_SECRET" \
  -H "x-request-id: qa-$(date +%s)" \
  --data @tests/ju-behavioral-e2e/payloads/cold_lead/turn_01.json
```

Validacao behavioral QA:

```bash
curl -fsS -X POST https://runtime.yzihub.com/behavioral-qa/reset \
  -H 'content-type: application/json' \
  --data '{}'

curl -fsS -X POST https://runtime.yzihub.com/behavioral-qa/run \
  -H 'content-type: application/json' \
  --data '{"reset":true,"write_report":true}'

curl -fsS https://runtime.yzihub.com/behavioral-qa/report
```

Auditoria operacional apos deploy:

- `GET /health` com postgres e redis ok
- `GET /metrics` retorna Prometheus text
- logs incluem `request_id`
- guardian ativo em `/runtime/readiness`
- fallback ativo e `force_n8n=true`
- Redis acessivel via `REDIS_URL`
- Supabase/Postgres acessivel via `DATABASE_URL` ou `SUPABASE_DB_URL`
- OpenAI configurado
- Evolution webhook secret validando
- replay/idempotency ativo por `message_id`
- nenhum envio para cliente real durante `behavioral_qa`

Rollback imediato:

```bash
docker service update \
  --env-add JUREMA_CUTOVER_FORCE_N8N=true \
  --env-add JUREMA_CUTOVER_EMERGENCY_FALLBACK=true \
  ju-runtime_runtime-cognitive
```

Remocao controlada do deploy, se necessario:

```bash
docker stack rm ju-runtime
```
