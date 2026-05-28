# Ju Cognitive Runtime + n8n Bridge — Architectural Review

**Data:** 2026-05-26
**Versão analisada:** `workflow-jurema-main.v3-cognitive-runtime-bridge.json` + `src/runtime/*` + `src/lib/ju-runtime/cognitive-kernel-contracts.ts`
**Endpoint:** `POST https://runtime.yzihub.com/cognitive/turn`
**Modo de invocação atual:** `dry_run=true` forçado pelo HTTP API
**Escopo:** validação enterprise de arquitetura — workflow, runtime, bridge, contrato, cards, tools, multimodal

---

## 0. Mapa real do que existe hoje

### 0.1 Topologia operativa real (do código, não do diagrama)

```
WhatsApp
  → Evolution API
  → n8n Webhook1 (path: /webhook/ju)
  → Normaliza Webhook1 → Switch1 (anti-loop fromMe)
  → Verificar Atendimento1 → IF IA Pausada Supabase → IA Pausada - Encerrar
  → dados do banco (env) → Code in JavaScript (lead lookup/criação)
  → Dados do Lead → Sync Operational Context → Build Context
  → REDIS buffer (Wait4 5s aggregator) + media handling (audio/img/vídeo)
  → memoria_redis → IF-COMPARA → Detecta Finalização
  → [BRIDGE] Preparar Runtime Payload
  → [BRIDGE] HTTP POST runtime.yzihub.com/cognitive/turn (x-webhook-secret)
  → [BRIDGE] Normaliza Runtime Output
  → Salvar Outbound Supabase
  → ArrayResposta1 (split por "\n\n") → Split Out1 → Loop Over Items
  → Wait7 → Evolution API → WhatsApp
  → Marcar Follow-up Resolvido (quando vier de followup_resume)

Trilho paralelo: Cron Follow-up Tasks (5min) → Buscar Follow-ups Vencidos
  → Delay Humano Follow-up → entra no mesmo Preparar Runtime Payload
```

### 0.2 Topologia do runtime (Fastify)

```
POST /cognitive/turn
  → Zod parse → validateWebhookSecret(headers)
  → extractWebhookFingerprint → reserveInboundMessage (Redis NX, TTL 7d)
  → executeCognitiveTurn:
      normalize → acquireConversationLock (Redis)
      → hydrateTurn (Postgres: lead, deal, conversation, recent_messages)
      → compactHydrationProjection (limits)
      → buildMemoryRuntime (compact_history, summary, runtime_memory)
      → syncOperationalContext (behavioral_engine + buildCanonicalKernelDecision)
      → renderOfficialContext (XML-like contract: 9 blocks)
      → canonicalKernelInputSchema.parse
      → llm.run (OpenAI tools filtered by allowed_tools, tool_choice forced when 1 required)
         → loop max_orchestration_passes (default 2)
            → tool_orchestrator.execute → POST n8n tool webhooks
            → boundToolOutput (truncamento)
      → assertCanonicalResponseDraft (governance violations)
      → shadow_compare + calibration (shadow mode)
      → persistRuntimeState (ju_runtime_states upsert)
      → persistOutbound (conversation_messages) ← BYPASSED quando dry_run=true
      → releaseConversationLock
  → cutover/pilot/cost wrappers
  → response: { ok, mode, trace_id, conversation_id, decision, context, llm,
                violations, stages, cutover, pilot, cost, webhook, response_to_send }
```

### 0.3 Detalhe crítico: dry_run forçado

`src/runtime/http_api.ts:218` força `dry_run: true` em **toda** chamada de `/cognitive/turn`:

```ts
const result = await executeCognitiveTurn({
  raw: { ...parsed.data, dry_run: true },
  pool, redis, llm, config,
});
```

Isso significa: **o runtime nunca escreve `conversation_messages` outbound em produção hoje**. Quem persiste é o n8n (`Salvar Outbound Supabase`). O runtime ainda escreve `ju_runtime_states` e shadow tables.

Esse é um contrato consciente de cutover. Mas precisa ser documentado — qualquer engenheiro novo vai assumir, pelo nome `/cognitive/turn`, que o runtime executa de fato.

---

## 1. O que está CERTO

| # | Item | Por quê |
|---|------|---------|
| 1 | Separação runtime decide / n8n executa | Runtime não toca Evolution, Calendar, n8n outbound |
| 2 | Idempotência inbound (`reserveInboundMessage` NX TTL 7d) | Drop seguro de retries Evolution |
| 3 | Lock por `conversation_id` (Redis) | Single-thread por conversa, previne race |
| 4 | Hydration projection com limits | Bounded recent messages, summary, retrieval |
| 5 | Contrato canônico kernel (zod-validado) | Decisão estruturada testável sem LLM |
| 6 | Validação dupla (`assertCanonicalKernelDecision` + `assertCanonicalResponseDraft`) | Detecta SDR, permission-to-search, too-many-questions, orphan tool |
| 7 | OPENAI_TOOLS filtrados por `allowed_tools` + `tool_choice` forçado | LLM não chama tool fora do funnel |
| 8 | Shadow mode + calibração paralela | Cutover seguro com gates de paridade |
| 9 | Bridge com retry+timeout+onError continueRegularOutput | Runtime down → fallback humano |
| 10 | Fallback determinístico no `Normaliza Runtime Output` | Sem silêncio quando runtime falha |
| 11 | Auto-flag de governance violations no output | `[governance_violation:...]` para auditoria |
| 12 | Áudio inbound persistido como mensagem normal | LLM "vê" áudios como texto |

---

## 2. O que está ERRADO

### 2.1 🔴 CRÍTICO — Regex quebrada em `Normaliza Runtime Output`

**Arquivo:** `n8n/production/workflow-jurema-main.v3-cognitive-runtime-bridge.json` (node `Normaliza Runtime Output`, função `validHttpUrl`)

```js
// BUG: regex sem escape das barras
function validHttpUrl(value) {
  const text = String(value ?? '').trim();
  if (!/^https?:///i.test(text)) return '';           // ← quebrado
  if (/s|localhost|127.0.0.1/i.test(text)) return ''; // ← quebrado
  return text;
}
```

**Análise:**
- `/^https?:///i` em JS é parseado como `/^https?:/` (válido) + `//i.test(text)) return '';` (comentário de linha). Resultado: a função NÃO valida prefixo http.
- `/s|localhost|127.0.0.1/i` bate qualquer string com letra `s` ou `localhost` ou `127`anyChar`0`anyChar`0`anyChar`1`. Como praticamente toda URL contém `s`, **toda URL é descartada**.

**Impacto produção:** fallback `cardUrls` está morto. Quando runtime devolve texto vazio mas tools produziram cards, bridge não consegue extrair URLs e cai no fallback "Tive uma oscilação...".

**Fix:**
```js
function validHttpUrl(value) {
  const text = String(value ?? '').trim();
  if (!/^https?:\/\//i.test(text)) return '';
  if (/localhost|127\.0\.0\.1/i.test(text)) return '';
  return text;
}
```

### 2.2 🔴 CRÍTICO — `collectCardUrls` lê o lugar errado

Mesmo node, mesma função:

```js
const cardUrls = collectCardUrls([
  runtime.cards,
  runtime.result?.cards,
  runtime.result?.tool_calls,   // ← requests, sem URL
  runtime.tool_calls,            // ← idem
  runtime.llm?.tool_calls,       // ← idem
]);
```

`src/runtime/types.ts:121-133`:
```ts
export type ToolCallRequest = { tool, input: Record<string, unknown>, tool_call_id? };
export type ToolCallResult  = { tool, ok, latency_ms, output: unknown, error? };
```

URLs vivem em `llm.tool_results[].output` (resposta do webhook `consultar_imoveis`, com `imoveis[].link_do_imovel` / `link_sanitizado`). Mesmo com a regex de 2.1 corrigida, não acharia URL.

**Fix:** trocar para `runtime.llm?.tool_results` e adicionar `link_do_imovel`, `link_sanitizado`, `link` em `candidates`; descer também em `output.imoveis`, `output.cards`.

### 2.3 🟠 ALTO — `conversation_id` aceita qualquer string

`src/runtime/cognitive_turn.ts:169` exige `conversation_id` mas não valida formato UUID.
`Preparar Runtime Payload` faz fallback `firstText(context.conversation_id, remoteJid)` — se Build Context não tiver, passa `558381681119@s.whatsapp.net` como conversation_id.

`persistRuntimeState` faz `upsert ju_runtime_states (conversation_id ...)` onde a coluna provavelmente é UUID. Erro capturado por `.catch()` que só loga warning.

**Impacto:** leads novos (primeiro turn antes do `conversations.id` ser criado) terão `ju_runtime_states` silenciosamente não-persistido.

**Fix:** falhar (não fallback) quando `conversation_id` não for UUID. Confirmar que `Verificar Atendimento1`/`Code in JavaScript` sempre devolve UUID.

### 2.4 🟠 ALTO — Contrato sem `actions[]` nem multimodal estruturado

Response atual:
```ts
{ ok, mode, trace_id, conversation_id,
  decision, context,
  llm: { output: string, tool_calls, tool_results, ... },
  violations, stages, shadow? }
```

Bridge espera só `runtime.llm.output` (texto). Sem canal para: enviar mídia gerada pelo runtime, property cards estruturados, agendar followup com timing específico, escalar para corretor com payload contextual, pause/resume AI, button/list replies.

Tudo é forçado em `output: string` + split por `\n\n`. **Este é o teto da arquitetura atual.**

### 2.5 🟠 ALTO — Webhook secret cai para fail-open se env vazia

`src/runtime/webhook_security.ts:82-83`:
```ts
const expected = clean(process.env.EVOLUTION_WEBHOOK_SECRET);
if (!expected) return { ok: true };  // ← sem secret = autorizado
```

Em container sem env, `/cognitive/turn` público aceita qualquer requisição. Inaceitável em produção.

**Fix:** em `NODE_ENV=production` ou runtime mode `active`, falhar 401 se secret ausente.

### 2.6 🟡 MÉDIO — Hidratação duplicada n8n + runtime

`Build Context` agrega `lead`, `deal`, `conversation`, `recent_messages`, `operational_context`, `runtime_memory`. Bridge envia tudo. `hydrateTurn` no runtime **re-busca tudo do Postgres**.

Custo: bandwidth, latência (~100ms duplicados), risco de divergência por cache stale.

OK no curto prazo. Médio prazo: `Build Context` minimal (só identificadores), runtime hidrata sozinho.

### 2.7 🟡 MÉDIO — `tool_orchestrator` chama webhook n8n via HTTP

`src/runtime/tool_orchestrator.ts:98` faz `fetch(toolWebhookUrls[tool])`. Loop n8n → runtime → n8n. Correto, mas:
- +200-400ms por tool (tolerável)
- runtime depende de URLs concretas (env)
- precisa de circuit-breaker por tool no médio prazo

### 2.8 🟡 MÉDIO — `ArrayResposta1` split por "\n\n" frágil

LLM precisa lembrar sempre de separar por dupla quebra. Sem teste, sem assert.

### 2.9 🟢 BAIXO — Wait nodes literais em paralelo com Redis poll

`Wait5`/`Wait6` 2s entre uploads paralelos. Funciona, mas é heurística temporal.

### 2.10 🟢 BAIXO — `Salvar Outbound Supabase` persiste fallback como resposta normal

Quando runtime devolve `ok=false` com fallback genérico, n8n grava como se fosse resposta da Ju. Histórico poluído.

**Fix:** marcar `metadata.source='runtime_fallback'` quando `runtime_fallback=true`.

### 2.11 🟢 BAIXO — Cron Follow-up roda a cada 5min sempre

Custo desprezível, mas em escala fica visível. Trocar por LISTEN/NOTIFY ou Supabase Realtime.

---

## 3. Anti-patterns

| Anti-pattern | Onde | Por que importa |
|---|---|---|
| Stringly-typed output | Runtime devolve `llm.output: string`, n8n split por `\n\n` | Impossível evoluir multimodal/cards/buttons |
| Dual write silencioso | `persistOutbound` runtime + `Salvar Outbound Supabase` n8n; só não duplica por `dry_run=true` | Quando alguém remover dry_run sem remover n8n, duplica |
| Fail-open security | Webhook secret opcional | Inaceitável em produção |
| Heurística de timing | Wait5/6/7 fixos | Não escala, não observável |
| Regex em string JSON | Bugs 2.1, 2.2 | JSON-as-code sem lint nem teste — toda regex em Code node n8n precisa de teste isolado |
| Catch silencioso de persistência | `.catch(warn)` em vários lugares | Você nunca descobre que metade dos estados não persistiu |
| Identidade misturada | `conversation_id` UUID ou JID | Quebra constraint Postgres silenciosamente |
| Hidratação dupla | n8n hidrata + runtime hidrata | Custo e divergência |
| Tool URL hardcoded por env | `toolWebhookUrls` no runtime config | Mudança obriga redeploy |
| Sem dead-letter queue | Inbound idempotency só Redis NX | Runtime cai mid-turn → mensagem reservada 7d sem retry |

---

## 4. O que precisa MUDAR AGORA (P0)

| # | Mudança | Onde | Risco se não fizer |
|---|---|---|---|
| P0-1 | Corrigir regex `validHttpUrl` | `Normaliza Runtime Output` | Fallback cards morto |
| P0-2 | Corrigir `collectCardUrls` para varrer `tool_results[].output` | mesmo node | Idem |
| P0-3 | Hardening webhook secret (fail-closed em production) | `src/runtime/webhook_security.ts:82` | `/cognitive/turn` público sem auth |
| P0-4 | Validar `conversation_id` UUID em `Preparar Runtime Payload` | bridge prepare node | Persistência silenciosa morre |
| P0-5 | Marcar `metadata.source='runtime_fallback'` quando fallback | `Salvar Outbound Supabase` | Histórico contaminado |
| P0-6 | Alerta+métrica nos `.catch(warn)` de persistência | `cognitive_turn.ts:125` | Drift silencioso de estado |
| P0-7 | Testes `assertCanonicalResponseDraft` em CI com 10 fixtures | `tests/runtime/governance.spec.ts` | Governance regride sem ninguém notar |
| P0-8 | Documentar `dry_run=true` forçado | `docs/ju-cognitive-runtime-operations.md` | Próximo dev assume contrato errado |

P0-1, P0-2, P0-3, P0-5 = PRs de 20-50 linhas, zero risco, aplicar imediatamente.

---

## 5. O que pode esperar (P1/P2)

| Prioridade | Item | Trigger |
|---|---|---|
| P1 | Build Context → payload minimal | Latência total > 4s |
| P1 | Cron Follow-up → LISTEN/NOTIFY ou Realtime | Volume > 500/dia |
| P1 | Circuit breaker por tool | Primeira tool instável |
| P1 | Polling adaptativo para mídia | Mídia >5MB chegando |
| P2 | DLQ para inbound | Mensagem perdida em produção |
| P2 | Streaming SSE para UX "digitando…" | Latência > 6s consistente |
| P2 | Schema output evoluído (`messages[]`+`actions[]`) | Primeira feature multimodal real |
| P2 | Versioning explícito do contrato | Antes do segundo cliente runtime |

---

## 6. Evolução futura — Roadmap em fases

- **Fase A** — Contrato aditivo (P0 + `messages[]` opcional além de `output`)
- **Fase B** — `actions[]` emitido em paralelo, n8n loga sem executar
- **Fase C** — n8n executa `actions[]` (sub-workflows por tipo)
- **Fase D** — Multimodal real (audio/image/video/button/list)
- **Fase E** — Outbound orchestration (escalation/pause/schedule por action)
- **Fase F** — Kill dry_run, runtime persiste outbound, n8n vira dispatcher

---

## 7. Arquitetura ideal final

```
WhatsApp → Evolution API
  → n8n INBOUND PIPELINE
     webhook → normalize → anti-loop → handoff check → media handling
     → resolve lead/deal/convo
     → minimal payload {message_id, conversation_id, tenant_id, phone, message, event_type?}
  → HTTP POST runtime.yzihub.com/cognitive/turn (x-webhook-secret, x-request-id)

Runtime Cognitivo (Fastify) — DECIDE
  validate auth → idempotency reserve → lock
  → hydrate (DB) → memory → behavioral decision (kernel)
  → context render → LLM (with tools) → guardian
  → shadow compare + calibration
  → emit { messages[], actions[], decision, observability }
        │
        │ tool execution (loop)
        ▼
  n8n TOOL SUBWORKFLOWS (operational layer)
    /tool/consultar_imoveis, /tool/atualizar_qualificacao, ...

  → response { messages[], actions[], ... }

n8n OUTBOUND DISPATCHER
  for message in messages[]: switch type → Evolution sendText/sendMedia/sendButton
  for action in actions[]: route to dedicated sub-workflow
  → persist outbound atomicamente
  → Evolution API → WhatsApp
```

**Princípios invariantes:**
1. Runtime stateless por turn (lock garante ordering, hydrate puxa DB)
2. Runtime nunca chama Evolution
3. Runtime emite intents tipados, n8n traduz em chamadas
4. n8n dumb dispatcher: zero regra de negócio depois do runtime
5. Toda action deve ter sub-workflow correspondente
6. Toda message deve ter dispatcher Evolution correspondente
7. Idempotência inbound (Redis) + outbound (Postgres unique)
8. trace_id propagado end-to-end

---

## 8. Contrato ideal `actions[]` + `messages[]`

### 8.1 Schema de resposta runtime (v2)

```ts
// Backwards-compatible: clients antigos lendo `output` continuam funcionando
type RuntimeTurnResponse = {
  ok: boolean;
  trace_id: string;
  conversation_id: string;
  mode: "active" | "shadow" | "behavioral_qa";

  output: string;              // legacy: LLM raw output
  messages: OutboundMessage[]; // novo: stream tipado
  actions: OutboundAction[];   // novo: side-effects para n8n

  decision: CanonicalKernelDecision;
  llm: { tool_calls, tool_results, token_usage, passes };
  violations: RuntimeViolation[];
  stages: RuntimeStageTrace[];
  context: RenderedContext;
  cutover?: ...; pilot?: ...; cost?: ...; webhook?: ...;
  shadow?: ...;
};
```

### 8.2 `OutboundMessage` (o que o cliente VAI ver)

```ts
type OutboundMessage =
  | { id: string; type: "text"; body: string; preview_url?: boolean }
  | { id: string; type: "property_card"; property_id: string; source: "imoveis"; url: string; thumbnail_url?: string; caption: string; meta: { titulo, bairro, valor, quartos, metragem, tipo, ... } }
  | { id: string; type: "image"; media_url: string; caption?: string }
  | { id: string; type: "audio"; media_url: string; duration_s?: number }
  | { id: string; type: "video"; media_url: string; caption?: string }
  | { id: string; type: "document"; media_url: string; filename: string; mime: string }
  | { id: string; type: "location"; lat: number; lng: number; name?: string; address?: string }
  | { id: string; type: "buttons"; body: string; buttons: Array<{ id: string; label: string; payload?: string }> }
  | { id: string; type: "list"; body: string; sections: Array<{ title: string; rows: Array<{ id, title, description? }> }> };
```

### 8.3 `OutboundAction` (o que o n8n VAI EXECUTAR sem o cliente saber)

```ts
type OutboundAction =
  | { type: "persist_state"; table: "jurema_deals" | "leads" | "conversations"; id: string; patch: Record<string, unknown> }
  | { type: "schedule_followup"; deal_id: string; due_at_iso?: string; due_in_minutes?: number; strategy: { goal: string; tone: string; reason: string }; metadata?: Record<string, unknown> }
  | { type: "cancel_followups"; deal_id: string; reason: string }
  | { type: "escalate_human"; deal_id: string; broker_id?: string; urgency: "low"|"medium"|"high"; reason: string; payload: { summary, hot_signals, requested_action } }
  | { type: "pause_ai"; conversation_id: string; until?: string; reason: string }
  | { type: "resume_ai"; conversation_id: string }
  | { type: "save_property_match"; deal_id: string; property_id: string; match_score: number; reason: string; status: "sugerido"|"enviado" }
  | { type: "create_appointment"; deal_id: string; property_id?: string; appointment_type: string; scheduled_at_iso: string; broker_id?: string }
  | { type: "log_metric"; event_type: string; payload: Record<string, unknown> }
  | { type: "request_payment_link"; project_id?: string; amount: number; currency: "BRL"; method: string };
```

### 8.4 Regras de execução

1. Order matters em `messages[]` (n8n dispatcha sequencial com Wait7)
2. `actions[]` pode rodar paralelo, exceto `pause_ai` que deve rodar **antes** das messages
3. Action falha → retry com backoff. Permanentemente falhada → `agent_metrics_events`
4. Runtime nunca emite action+message redundantes
5. Versionamento: header `X-Ju-Runtime-Contract: 2`

---

## 9. Compatibilidade com cards

### 9.1 Hoje
Runtime → texto multi-linha com URLs → split `\n\n` → Evolution `sendText` → WhatsApp renderiza preview nativo do link.

### 9.2 Após refactor (continua funcionando)

1. Bridge `Normaliza Runtime Output` emite compatibilidade dupla:
   - v1 (legacy): `output` string com URLs → split `\n\n`
   - v2: `messages[]` com `property_card` → cada card vira UMA mensagem `sendText` com `url`
2. Dispatcher Evolution para `property_card`:
   ```
   sendText(
     body: `${meta.titulo}\n${meta.bairro} — R$ ${meta.valor} — ${meta.quartos} q — ${meta.metragem} m²\n${url}`,
     preview_url: true
   )
   ```
3. **Regra invariante:** URL vem do tool `consultar_imoveis`, jamais reconstruída no n8n.

### 9.3 Risco
Zero quando feito assim. Os 2 schemas convivem por feature flag por tenant.

---

## 10. Compatibilidade com tools

### 10.1 Tools atuais
`consultar_imoveis`, `atualizar_qualificacao`, `setar_lead_quente`, `conhecimento_estrategico_luana1`

Whitelist em `cognitive-kernel-contracts.ts`. Expostas em `llm_runtime.ts:12`. Executadas via `tool_orchestrator` HTTP. Filtradas por `decision.allowed_tools`. Forçadas via `tool_choice` quando 1 required.

### 10.2 Padrão para tool nova

```ts
// 1. canonicalTools = [..., "agendar_visita"]
// 2. OPENAI_TOOLS += { name, parameters }
// 3. allowedToolsFor(action) += allowed contexts
// 4. toolWebhookUrls[name] = env.URL
// 5. tool_orchestrator.toolPayload mapping
// 6. Sub-workflow n8n que expõe a URL
```

**Falta:** registry declarativo (YAML/JSON `tools.config.json`). P2.

### 10.3 Tools vs Actions — bifurcação importante

- **Tool** = chamada durante o pensamento para tomar decisão (**read-mostly**)
- **Action** = side-effect emitido depois da decisão para n8n executar (**mutating-mostly**)

`atualizar_qualificacao`/`setar_lead_quente` hoje são tools mutating — vão evoluir para actions na Fase B. LLM pode decidir "marcar quente" e emitir `actions: [{type:"persist_state", table:"leads", patch:{ai_temperature:"quente"}}]`.

### 10.4 Idempotência de tools mutating

Hoje runtime envia `request.tool_call_id` mas n8n não usa. P1: persistir `tool_call_id` no log para deduplicar.

---

## 11. Compatibilidade com multimodal

### 11.1 Inbound — já funciona
- Áudio: Whisper → texto → contexto normal
- Imagem/Vídeo: upload + URL no Redis

Mas **runtime não recebe contexto da mídia**. LLM não vê "cliente mandou foto". Só texto transcrito. **P1**: passar `messageType + media_url` para o LLM.

### 11.2 Outbound — não funciona ainda

Quando precisar enviar áudio TTS, imagem (planta), vídeo (tour 360), documento (PDF proposta): `messages[]` com types correspondentes. n8n dispatcher mapeia type → endpoint Evolution:
- `text` → `/message/sendText`
- `image/audio/video/document` → `/message/sendMedia`
- `audio` com `ptt=true` para PTT
- `location` → `/message/sendLocation`
- `buttons`/`list` → endpoints respectivos (com fallback texto)

### 11.3 Limites Evolution v2
Áudio prefere OGG/Opus. Buttons max 3 (20 chars). List max 10/seção. Janela 24h: fora dela só templates aprovados. Runtime **não precisa saber** — n8n dispatcher valida e rejeita (gera `action_failed`).

---

## 12. Exemplos reais

### 12.1 Payload n8n → runtime (proposta minimal)

```json
{
  "message_id": "3EB016F0DA2589C9E2BEA1",
  "conversation_id": "f3d2e9c8-7a4b-4f1a-9c8e-1b3a5d7f9e0c",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "phone": "558381681119",
  "message": "Quero comprar um apartamento no Bessa com 3 quartos até 700 mil",
  "messageType": "text",
  "event_type": null,
  "instance": "Jurema Brokers",
  "source": "n8n:cognitive-runtime-bridge",
  "n8n": { "execution_id": "...", "workflow_name": "...", "node": "Preparar Runtime Payload" }
}
```

Runtime hidrata lead/deal/conversation por conta própria. Payload reduzido de ~8KB para ~400 bytes.

### 12.2 Response v2 — Caso `apresentar_opcoes_aderentes`

```json
{
  "ok": true,
  "trace_id": "turn_1716724800123_a8f3k2m1",
  "conversation_id": "f3d2e9c8-7a4b-4f1a-9c8e-1b3a5d7f9e0c",
  "mode": "active",
  "output": "Separei algumas opções...\n\n1. APARTAMENTO PARA VENDA NO BESSA\n...\nhttps://juremabksimoveis.com.br/imoveis/...\n\nAlguma chamou sua atenção?",
  "messages": [
    { "id": "msg_01", "type": "text", "body": "Separei algumas opções que podem fazer sentido com o seu perfil:" },
    {
      "id": "msg_02", "type": "property_card",
      "property_id": "JP009", "source": "imoveis",
      "url": "https://juremabksimoveis.com.br/imoveis/apartamento-para-venda-no-bessa/",
      "thumbnail_url": "https://...supabase.../jp009.jpg",
      "caption": "APARTAMENTO PARA VENDA NO BESSA\nApartamento — Bessa — R$ 525.000,00 — 2 quarto(s) — 59 m²",
      "meta": { "titulo": "APARTAMENTO PARA VENDA NO BESSA", "tipo": "Apartamento", "bairro": "Bessa", "valor": 525000, "quartos": 2, "metragem": 59 }
    },
    { "id": "msg_03", "type": "text", "body": "Alguma delas chamou sua atenção ou você quer que eu ajuste a busca?" }
  ],
  "actions": [
    { "type": "save_property_match", "deal_id": "<deal_id>", "property_id": "JP009", "match_score": 95, "reason": "match_perfil_bessa_orcamento_700k", "status": "enviado" },
    { "type": "log_metric", "event_type": "property_options_sent", "payload": { "count": 1, "property_ids": ["JP009"] } }
  ],
  "decision": { "...": "preservado" },
  "llm": { "...": "tool_calls/results/token_usage" },
  "violations": [],
  "stages": ["..."],
  "webhook": { "request_id": "...", "message_id": "...", "duplicate": false }
}
```

### 12.3 Response v2 — Caso `facilitar_agendamento` + escalation

```json
{
  "ok": true,
  "messages": [
    { "id": "msg_01", "type": "text", "body": "Perfeito! Posso te conectar com um corretor da Jurema pra essa visita no Bessa amanhã às 15h." }
  ],
  "actions": [
    { "type": "persist_state", "table": "leads", "id": "<lead_id>", "patch": { "ai_temperature": "quente", "ai_hot_at": "2026-05-26T18:30:00Z" } },
    { "type": "escalate_human", "deal_id": "<deal_id>", "urgency": "high", "reason": "lead_aceitou_visita",
      "payload": { "summary": "Lead quente. Quer visitar imóvel JP009 (Bessa, 525k) amanhã 15h.", "hot_signals": ["visit_acceptance", "financing_signal"], "requested_action": "confirmar_visita" } },
    { "type": "create_appointment", "deal_id": "<deal_id>", "property_id": "JP009", "appointment_type": "visita", "scheduled_at_iso": "2026-05-27T18:00:00Z" },
    { "type": "cancel_followups", "deal_id": "<deal_id>", "reason": "lead_em_visita_marcada" }
  ]
}
```

### 12.4 Sub-workflows n8n necessários (Fase C)

| Workflow | Trigger | Função |
|---|---|---|
| `dispatch-messages` | Subworkflow | for-each messages[] → switch type → Evolution API |
| `action-persist-state` | Subworkflow | PATCH Supabase REST |
| `action-schedule-followup` | Subworkflow | INSERT `follow_up_tasks` |
| `action-escalate-human` | Subworkflow | UPDATE `jurema_deals.broker_status` + notify + INSERT `agent_metrics_events` |
| `action-pause-resume-ai` | Subworkflow | PATCH `conversations.ai_paused` |
| `action-save-property-match` | Subworkflow | UPSERT `jurema_property_matches` |
| `action-create-appointment` | Subworkflow | INSERT `jurema_appointments` + Google Calendar |
| `action-cancel-followups` | Subworkflow | UPDATE `follow_up_tasks` status='cancelado' |
| `action-log-metric` | Subworkflow | INSERT `agent_metrics_events` |
| `action-request-payment-link` | Subworkflow | POST Asaas + INSERT `cafe_pam_payments` |
| `tool-consultar-imoveis` | Webhook | já existe |
| `tool-atualizar-qualificacao` | Webhook | já existe |
| `tool-setar-lead-quente` | Webhook | já existe (até virar action) |
| `tool-conhecimento-estrategico-luana1` | Webhook | já existe |

---

## 13. Estratégia de migração gradual (sem quebrar produção)

### 13.1 Princípio
**Schema aditivo + feature flag por tenant + shadow longa.**

### 13.2 Sequência

- **Semana 0** — P0 fixes (contrato inalterado). Mede: zero regressão, fallback de cards funciona.
- **Semana 1** — Contrato v2 emite `messages[]`+`actions[]` em paralelo. n8n ignora. Persiste em `ju_runtime_emit_log` para auditoria.
- **Semana 2** — Bridge entende `messages[]` com 1 tenant piloto via `ju.dispatcher_v2 = true`. Smoke test full QA.
- **Semana 3** — `actions[]` read-only/aditivas executadas (log_metric, save_property_match). Mutating ainda via tool.
- **Semana 4** — Mutating actions com shadow. Compara DB pós-turn. Paridade ≥99% por 7d → desligar tool.
- **Semana 5+** — Multimodal (audio/image/video/buttons/list outbound).
- **Semana N** — Kill `dry_run`. Runtime persiste outbound. n8n vira dispatcher.

### 13.3 Hard rules para NÃO quebrar produção

1. Mudança de contrato é **aditiva**. Nunca remover campo. Deprecação só após 30d com 0 uso registrado.
2. Feature flags por tenant (`agent_feature_flags`). 1 cliente por vez.
3. Shadow gates ativos (`parity_threshold_met=true`) antes de promover.
4. Rollback < 1min: reimportar v2 workflow + desativar v3.
5. Smoke test sintético antes de cada deploy: `behavioral-qa` com 10+ cenários.
6. Métricas obrigatórias pós-deploy: `runtime_request_completed`, `runtime_webhook_rejected`, `tool_latency`, `turn_duration_ms`, `governance_violations_per_turn`. Alertar >2σ.
7. Idempotência preservada: `message_id` único, `conversation_id` UUID, `action.id` opcional para retry.
8. Audit log permanente: `ju_runtime_turn_audit` 90d (request+response+decision+messages+actions).

---

## 14. Score final da arquitetura

| Dimensão | Score | Justificativa |
|---|-------|---------------|
| Separação de responsabilidades | 9/10 | Limpíssimo. -1 por dual-write latente (dry_run) |
| Idempotência | 8/10 | Redis dedupe + lock. -2 por falta de DLQ e action.id |
| Resiliência | 7/10 | Fallback, retry, timeout. -3 por catch silencioso + fail-open |
| Observabilidade | 8/10 | trace_id, métricas, stages, audit. -2 por falta de alerta em catch silencioso |
| Testabilidade | 7/10 | Contrato zod, shadow, behavioral_qa. -3 por bugs de regex sem teste |
| Evolutibilidade | 5/10 | Stringly-typed output. Multimodal/buttons não cabem |
| Segurança | 6/10 | Webhook secret existe. -4 por fail-open + URLs hardcoded |
| Compatibilidade multimodal/tools/cards | 6/10 | Cards por sorte (link preview). Tools extensíveis com fricção |
| Cutover/shadow | 9/10 | Pilot rollout, traffic router, calibration. -1 por dry_run não doc |
| Operação (runbook/rollback) | 7/10 | Documentado. -3 por falta de checklist + wait fixos |

### Score agregado: **7.2 / 10**

**Interpretação:** arquitetura sólida, decisões fundamentais corretas, 2 bugs críticos (regex morta, fail-open security) e teto baixo para multimodal/actions[]. P0 → **8.0**. Refactor `messages[]+actions[]` (Fase B+C) → **9.0+**.

---

## 15. Como usar este documento

1. **Hoje/amanhã**: aplica P0-1, P0-2, P0-3, P0-5. 4 PRs de 20-50 linhas. Zero risco.
2. **Esta semana**: P0-6, P0-7, P0-8.
3. **Próximas 2 semanas**: Fase A (output v2 aditivo).
4. **Não comece** Fase D (multimodal real) sem antes ter Fase C estável.
5. **Nunca remova `dry_run=true` forçado** sem antes desativar `persistOutbound` no n8n.

---

**Histórico**
- 2026-05-26 — Versão inicial. Análise feita em cima de `v3-cognitive-runtime-bridge.json` + `src/runtime/*` + `src/lib/ju-runtime/cognitive-kernel-contracts.ts`.
