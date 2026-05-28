# Ju Cognitive Runtime Operations

## Arquitetura Final

O runtime cognitivo executa apenas o kernel da Ju: normalizacao, hidratacao, memoria limitada, governanca, contexto oficial, LLM com OpenAI SDK direto, tools via n8n, guardian, shadow comparison, pilot rollout e auditoria operacional.

O n8n continua como camada operacional para consultar imoveis, outbound, midia, PDFs, Gmail e automacoes. A arquitetura fica congelada: sem multi-agent, sem LangGraph, sem troca de modelo e sem novas heuristicas no hot path.

## Fluxo Oficial

1. `POST /cognitive/turn` recebe inbound normalizado ou payload de simulador.
2. O runtime executa em `dry_run` para preservar shadow/pilot safety.
3. O traffic router decide `n8n` ou `kernel`.
4. O pilot rollout aplica filtros, guardian, latency guards e overrides humanos.
5. O sistema persiste cutover audit, cost audit, pilot sample e edge-case queue.
6. A resposta real do kernel aparece apenas em `response_to_send` quando autorizada.

## Rollback

Use qualquer uma das travas abaixo:

- `JUREMA_CUTOVER_FORCE_N8N=true`
- `JUREMA_CUTOVER_EMERGENCY_FALLBACK=true`
- `JUREMA_CUTOVER_SHADOW_ONLY=true`
- `POST /pilot/override` com `freeze_rollout`, `pause_tenant`, `block_lead` ou `move_to_n8n`

O n8n nunca deve ser removido do fallback durante pilot.

## Pilot Rollout

Estagios:

- `0`: shadow only
- `1`: internal only
- `2`: 1% simple inbound
- `3`: 5% controlled traffic
- `4`: 10% selected tenants

O pilot aceita apenas texto simples, inbound normal, sem midia, sem follow-up complexo, sem multiplos objetivos e sem edge cases conhecidos.

## Simulator

`POST /runtime/simulate` executa o runtime sem WhatsApp, sem Evolution e sem outbound real. Use esse endpoint para QA de frontend, replay e validacao operacional.

## Guardian

O response guardian bloqueia resposta real quando detecta SDR behavior, pedido de autorizacao para buscar, overqualification, multiplas perguntas, loop de inventario ou violacao de governanca.

## Fallback

O fallback retorna para n8n em timeout, baixa confianca, divergencia critica, falha de tool, violacao do guardian, edge case desconhecido, duplicidade inbound ou override humano.

## Observabilidade

Endpoints:

- `GET /health`
- `GET /metrics`
- `GET /shadow/metrics`
- `GET /shadow/calibration`
- `GET /pilot/dashboard`
- `GET /runtime/costs`
- `GET /runtime/readiness`
- `GET /runtime/qa/conversation/:conversationId`
- `GET /runtime/qa/trace/:traceId`

## Custos

`src/runtime/cost_audit.ts` estima tokens inbound, outbound, retrieval, tool, total por turno, custo por lead, conversa e funil. Valores de preco ficam em env vars para auditoria futura sem trocar modelo.

## Recovery

1. Acione `JUREMA_CUTOVER_FORCE_N8N=true`.
2. Confirme `GET /runtime/readiness`.
3. Revise `ju_runtime_edge_case_queue`.
4. Verifique `GET /runtime/costs` para spikes de token/contexto.
5. Reative somente em stage anterior e com `JUREMA_PILOT_ROLLOUT_FROZEN=false`.
