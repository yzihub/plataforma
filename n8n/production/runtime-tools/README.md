# Runtime Tool Wrappers (n8n)

Wrappers que expoem os tools internos da Ju como webhooks HTTPS para o Runtime Cognitivo TS.

Toda chamada do runtime para n8n entra por aqui. Os workflows operacionais antigos (`consultar_imoveis`, `atualizar_qualificacao`, `setar_lead_quente`) permanecem inalterados — esses wrappers apenas autenticam, normalizam contrato e despacham via `executeWorkflow`.

```
Runtime TS (loop cognitivo)
   |
   | POST https://app.yzihub.com/webhook/tool-<name>
   |   X-N8N-API-KEY: <JUREMA_TOOL_WEBHOOK_SECRET>
   |   Content-Type: application/json
   v
[Wrapper webhook]
   |  - valida secret (fail-closed)
   |  - valida payload (fail-closed)
   |  - despacha
   v
[Workflow interno existente]  ou  [HTTP embed + Supabase RPC]
   |
   v
[Format Response]  -> {ok, tool, latency_ms, output}
   v
[Respond to Webhook] HTTP 200 application/json
```

## Arquivos

```
n8n/production/runtime-tools/
  README.md                                                  (este arquivo)
  wrapper-tool-consultar-imoveis.v1.json
  wrapper-tool-atualizar-qualificacao.v1.json
  wrapper-tool-setar-lead-quente.v1.json
  wrapper-tool-conhecimento-estrategico.v1.json
```

## Mapa de paths webhook

| Tool runtime                       | Path do wrapper                       | Despacha para (workflow id)         |
|------------------------------------|---------------------------------------|-------------------------------------|
| `consultar_imoveis`                | `/webhook/tool-consultar-imoveis`     | `0udn6N4YelE6F2Ws` consultar_imoveis|
| `atualizar_qualificacao`           | `/webhook/tool-atualizar-qualificacao`| `QKFhZQJRz8rczaYE` atualizar_qualificacao |
| `setar_lead_quente`                | `/webhook/tool-setar-lead-quente`     | `QZ3VcIrxE6BRtCpj` setar_lead_quente|
| `conhecimento_estrategico_luana1`  | `/webhook/tool-conhecimento-estrategico` | HTTP OpenAI embed + Supabase `match_documents` RPC |

## Env vars exigidas no n8n cloud

| Variavel                             | Onde usado          | Valor                                                         |
|--------------------------------------|---------------------|---------------------------------------------------------------|
| `JUREMA_TOOL_WEBHOOK_SECRET`         | nos 4 wrappers      | Secret institucional oficial para runtime/wrappers/tools      |
| `SUPABASE_URL` (opcional)            | wrapper conhecimento| `https://dwmbklfkrtumfaxrbxio.supabase.co` (fallback embutido)|

Fallbacks retrocompativeis aceitos nos wrappers: `RUNTIME_COGNITIVE_WEBHOOK_SECRET` e `EVOLUTION_WEBHOOK_SECRET`. O nome canonico novo deve ser sempre `JUREMA_TOOL_WEBHOOK_SECRET`.

## Env vars exigidas no Runtime TS

```bash
# Headers de autenticacao outbound do runtime para os wrappers
JUREMA_TOOL_WEBHOOK_SECRET=<mesmo valor configurado no n8n>

# Tool URLs
JUREMA_TOOL_CONSULTAR_IMOVEIS_URL=https://app.yzihub.com/webhook/tool-consultar-imoveis
JUREMA_TOOL_ATUALIZAR_QUALIFICACAO_URL=https://app.yzihub.com/webhook/tool-atualizar-qualificacao
JUREMA_TOOL_SETAR_LEAD_QUENTE_URL=https://app.yzihub.com/webhook/tool-setar-lead-quente
JUREMA_TOOL_CONHECIMENTO_ESTRATEGICO_LUANA1_URL=https://app.yzihub.com/webhook/tool-conhecimento-estrategico
```

A funcao `toolUrl()` em `src/runtime/config.ts` constroi a chave como `JUREMA_TOOL_<NAME_UPPER>_URL` — esses nomes ja batem.

## Contrato request/response

### Request (igual para os 4)

```http
POST /webhook/tool-<name>
Host: app.yzihub.com
Content-Type: application/json
X-N8N-API-KEY: <secret>

{ ... payload especifico ... }
```

### Response sucesso

```json
{
  "ok": true,
  "tool": "<nome>",
  "latency_ms": 412,
  "output": { ... payload tool-especifico ... }
}
```

O runtime faz `JSON.parse(text)` da resposta INTEIRA e aplica `boundToolOutput` sobre ela. Chaves `cards`, `chunks`, `doctrine` ja recebem truncamento por config. Veja `src/runtime/tool_orchestrator.ts:106-110`.

### Response erro

Wrapper falha hard com `throw` quando:
- `JUREMA_TOOL_WEBHOOK_SECRET` nao configurado no n8n -> HTTP 500
- header `X-N8N-API-KEY` ausente ou divergente -> HTTP 500 (`unauthorized: ...`)
- campos obrigatorios ausentes -> HTTP 500 (`payload invalido: ...`)
- workflow interno falha -> HTTP 500 (mensagem do n8n)

O runtime trata HTTP nao-200 como `{ok: false, error: ...}` e segue o fallback do `ToolOrchestrator.execute()`. Aceitavel para MVP. Se preferir 401/400 explicitos, adicione branch IF + Respond to Webhook 4xx — nao bloqueia rollout.

### Payloads por tool

#### `consultar_imoveis`

```json
{
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "phone": "5583981681119",
  "bairro": "Cabo Branco",
  "tipo_imovel": "apartamento",
  "quartos": "3",
  "valor_max": "850000",
  "codigo_ref": ""
}
```

Output:

```json
{
  "ok": true, "tool": "consultar_imoveis", "latency_ms": 612,
  "output": {
    "success": true, "total": 3,
    "cards": [ { "id": "...", "title": "...", "url": "...", "image": "...", "preview": {...} } ],
    "filters_used": {...}, "ranking_profile": {...},
    "warning": null, "fallback_message": null
  }
}
```

#### `atualizar_qualificacao`

```json
{
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "phone": "5583999990001",
  "lead_id": "uuid",
  "deal_id": "uuid",
  "objetivo": "comprar",
  "faixa_valor": "700000",
  "Bairro / Região de Interesse": "Bessa",
  "Status Lead": "quente",
  "Score do Lead": "85",
  "tipo_imovel": "apartamento",
  "quartos": "3",
  "prazo": "60 dias",
  "forma_pagamento": "financiamento"
}
```

Output: `{ok, tool, latency_ms, output: {success, lead_id, deal_id, qualification_status, lead_score, deal_stage, missing_fields, details}}`

#### `setar_lead_quente`

```json
{
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "phone": "5583999990001",
  "lead_id": "uuid",
  "deal_id": "uuid",
  "motivo": "visit_acceptance",
  "localizacao_visita": "Bessa",
  "observacao": "..."
}
```

`lead_id` OU `deal_id` obrigatorio. Output: `{ok, tool, latency_ms, output: {success, lead_id, deal_id, ai_temperature: 'quente', deal_stage: 'corretor', broker_status: 'aguardando_corretor', handoff_dispatched, details}}`.

#### `conhecimento_estrategico_luana1`

```json
{
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "query": "como a Jurema cobra comissao em locacoes corporativas",
  "match_count": 4
}
```

`query` max 1600 chars. `match_count` cap em 8. Output: `{ok, tool, latency_ms, output: {success, total, chunks: [{rank, similarity, content, source, doc_id, metadata}], doctrine, output: combined, warning}}`.

## Exemplo de chamada fetch() do runtime TS

Ja existe em `src/runtime/tool_orchestrator.ts:98-105`. Para referencia:

```ts
const url = process.env.JUREMA_TOOL_CONSULTAR_IMOVEIS_URL;
const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-N8N-API-KEY": process.env.N8N_API_KEY,
  },
  body: JSON.stringify({
    tenant_id: "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
    phone: "5583981681119",
    bairro: "Cabo Branco",
    tipo_imovel: "apartamento",
    quartos: "3",
    valor_max: "850000",
  }),
});
const data = await response.json();
// data = { ok, tool, latency_ms, output: { cards: [...] } }
```

Smoke curl direto:

```bash
curl -sS -X POST https://app.yzihub.com/webhook/tool-consultar-imoveis \
  -H 'Content-Type: application/json' \
  -H "X-N8N-API-KEY: $JUREMA_TOOL_WEBHOOK_SECRET" \
  -d '{
    "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
    "phone": "5583981681119",
    "bairro": "Cabo Branco",
    "tipo_imovel": "apartamento"
  }'
```

## Estrategia de timeout

| Camada                | Limite        | Origem                                                            |
|-----------------------|---------------|-------------------------------------------------------------------|
| Runtime → wrapper     | `JUREMA_PILOT_MAX_TOOL_MS` (default 2500ms) | `src/runtime/config.ts:75`                            |
| Wrapper → workflow interno | proprio do `executeWorkflow` n8n     | sem timeout explicito; herda `executions_timeout` do n8n cloud |
| Wrapper → OpenAI embed| 15000 ms      | `wrapper-tool-conhecimento-estrategico.v1.json`                  |
| Wrapper → Supabase RPC| 15000 ms      | idem                                                              |

Se o pipe interno demorar mais que `JUREMA_PILOT_MAX_TOOL_MS`, o runtime aborta a chamada do tool e segue com `ok: false`. O wrapper continua executando — convem manter `match_documents` indexado e `consultar_imoveis` sem N+1.

Recomendado em producao: `JUREMA_PILOT_MAX_TOOL_MS=4000` para acomodar latencia real do consultar_imoveis (Supabase getAll + ranking JS).

## Estrategia de retry

| Camada               | Politica                                                                 |
|----------------------|--------------------------------------------------------------------------|
| Runtime → wrapper    | Hoje sem retry no `ToolOrchestrator.execute`. Falha 1x = tool flag `ok:false`. |
| Wrapper interno      | Sem retry — cada falha do workflow interno propaga.                       |
| Wrapper → OpenAI/Supabase | Sem retry no n8n; rely no LLM do runtime para decidir reprompt. |

Quando o runtime receber `ok:false`, ele aplica a politica do tool_router/kernel — geralmente prossegue com a melhor resposta possivel ou aciona handoff. Nao adicionar retry no wrapper.

Se necessario hardening posterior: ativar `retryOnFail: true, maxTries: 2, waitBetweenTries: 1500` no `executeWorkflow` (igual feito no bridge `Runtime Cognitivo`). Nao implementado por padrao para preservar latencia.

## Estrategia de rollback

Cada wrapper e ortogonal. Rollback ocorre em 3 niveis:

1. **Desabilitar wrapper individual**: toggle off no n8n → runtime recebe HTTP 404/inactive → tool flag `ok:false` → kernel decide fallback. Outros tools continuam.
2. **Desabilitar todos os 4 wrappers**: runtime para de chamar tools (mas main bridge `/cognitive/turn` continua se a v3 bridge estiver ativa). Resposta do runtime degrada para conversational-only.
3. **Voltar para v2 do main**: re-importar `workflow-jurema-main.v2-runtime-hardened.json`, ativar; desativar v3 bridge. Os wrappers nao precisam ser deletados — ficam orfaos inofensivos.

Nenhum desses passos altera os workflows operacionais antigos. Cada arquivo wrapper e auto-contido.

## Como importar no n8n sem quebrar producao

1. Garantir que `app.yzihub.com` esta no Cloud Account com permissao para criar workflows e ja tem os workflows internos `0udn6N4YelE6F2Ws`, `QKFhZQJRz8rczaYE`, `QZ3VcIrxE6BRtCpj` ativos.

2. Settings → Environment Variables (n8n cloud):
   ```
   JUREMA_TOOL_WEBHOOK_SECRET=<secret institucional do runtime/wrappers>
   ```
   (`RUNTIME_COGNITIVE_WEBHOOK_SECRET` e `EVOLUTION_WEBHOOK_SECRET` continuam aceitos como fallback legado.)

3. Workflows → Import from File. Importar um por vez (preserva ordem):
   - `wrapper-tool-consultar-imoveis.v1.json`
   - `wrapper-tool-atualizar-qualificacao.v1.json`
   - `wrapper-tool-setar-lead-quente.v1.json`
   - `wrapper-tool-conhecimento-estrategico.v1.json`

4. Apos cada import, abrir o workflow e verificar:
   - Credentials do `executeWorkflow` (ou OpenAI/Supabase HTTP) estao linkadas — n8n pode pedir reconciliacao.
   - Webhook path mostra `https://app.yzihub.com/webhook/tool-<name>` (NAO `/webhook-test/`).
   - Todos os workflows permanecem com `active: false` na primeira importacao.

5. Smoke por wrapper, com workflow ainda inativo, usando o botao **Execute Workflow** (test webhook). Verifique JSON de resposta no painel da UI.

6. Ativar **1 wrapper de cada vez**, comecando pelo de menor blast-radius (`conhecimento_estrategico`):
   - Toggle Active → ON
   - Smoke curl real contra `/webhook/tool-conhecimento-estrategico` com `X-N8N-API-KEY` correto.
   - Confirmar 200 + payload em `output.chunks`.

7. Apos os 4 wrappers ativos e validados isoladamente:
   - Atualizar env vars no Runtime TS (`JUREMA_TOOL_*_URL` + `JUREMA_TOOL_WEBHOOK_SECRET`).
   - Restart do runtime.
   - Smoke conversational E2E via `POST /cognitive/turn` que dispare cada tool.

8. Monitorar `n8n_executions` por 24h. Se um wrapper falhar consistentemente, toggle Active → OFF no wrapper individual; o runtime degrada graciosamente.

## Riscos remanescentes

- **HTTP 500 em vez de 401**: por simplicidade os wrappers usam `throw` que vira 500. O runtime trata como falha mas a metrica de auth e operational ficam misturadas. Mitigacao futura: branch IF + Respond 401.
- **`match_documents` schema drift**: se o RPC Supabase mudar assinatura, o wrapper conhecimento quebra silenciosamente. Mitigacao: o `Format Response` aceita varios shapes (rows, .data, .result, .body).
- **executeWorkflow internal n8n cache**: workflows internos sao consultados por id estatico. Se alguem deletar/recriar `0udn6N4YelE6F2Ws`, o wrapper consultar quebra. Mitigacao: nao deletar workflows internos — preservar mesmo apos cutover total para o runtime.
- **Sem retry**: latencia high tail derruba o tool. Aceitavel inicialmente; ligar `retryOnFail` se a janela de erro passar de 1%.

## Quando promover a v2 do wrapper

Sinais de necessidade de v2:
- 401 explicito em vez de 500 (governanca operacional).
- Output streaming para `consultar_imoveis` (paginated cards).
- Rate-limit por tenant_id dentro do wrapper.
- Idempotencia por `X-Request-Id` (evita execucao dupla em retry do runtime).
- Telemetria estruturada para `agent_metrics_events` direto do wrapper.

Nenhum bloqueia QA imediata.
