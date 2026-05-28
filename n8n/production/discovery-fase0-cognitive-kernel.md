# Discovery — Fase 0 — Extração do Kernel Cognitivo da Ju

**Data:** 2026-05-25
**Autor:** Claude Code (sessão de port arquitetural)
**Escopo:** Inventário completo do que precisa ser portado do workflow `workflow-jurema-main.v2-runtime-hardened.json` (88 nodes, hot-path WhatsApp) para um service Node.js+TypeScript externo, preservando paridade 1:1.

> Princípio operacional: **port literal, não modernização**. Mesma linguagem (JS→TS), mesmas dependências (LangChain), mesma semântica de null/undefined/regex, mesmas tabelas, mesmas chaves de Redis, mesma persistência. Refatorações ficam fora desta migração e viram backlog separado.

---

## 1. Inventário dos nós a portar (cognitive kernel)

| # | Nó n8n | Tipo | LOC JS | Função no service TS | Observação |
|---|---|---|---|---|---|
| 1 | `Code in JavaScript` | `n8n-nodes-base.code` v2 | ~200 | `services/state-compactor.ts` | State compactor / strict projection; remove `raw_payload` antes de propagar |
| 2 | `Dados do Lead` | `n8n-nodes-base.code` v2 | ~75 | `services/lead-hydration.ts` | Strict projection do lead a partir do `dados do banco` |
| 3 | `Sync Operational Context` | `n8n-nodes-base.code` v2 | ~450 | `services/behavioral-engine.ts` | 11 signals + funnel engine + qualification scoring + visit interest + next best action |
| 4 | `Build Context` | `n8n-nodes-base.code` v2 | ~400 | `services/context-renderer.ts` | Renderiza `_context` string com blocos `<yzi_operational_runtime>`, `<estado_operacional>`, `<funnel_runtime>`, `<preferencias_cliente>`, `<governanca_comportamental>`, `<historico_curto>`, `<tool_revalidation>` |
| 5 | `Atendente` | `@n8n/n8n-nodes-langchain.agent` v1.6 | — | `agent/runtime.ts` | LangChain `createToolCallingAgent` + `AgentExecutor` |
| 6 | `OpenAI Chat Model3` | `@n8n/n8n-nodes-langchain.lmChatOpenAi` v1.3 | — | `agent/llm.ts` | `model: gpt-4.1`, `timeout: 90000`, `maxTokens: 1400`, `temperature: 0.6` — **valores fixos** |
| 7 | `postgres1` | `@n8n/n8n-nodes-langchain.memoryPostgresChat` v1.3 | — | `agent/memory.ts` | `PostgresChatMessageHistory` apontando para `n8n_chat_histories_jurema`; `sessionKey` = `sessionId || telefoneCompleto || remoteJid`; `contextWindowLength: 20` |
| 8 | `consultar_imoveis` (subworkflow) | `@n8n/n8n-nodes-langchain.toolWorkflow` v2.2 → workflowId `0udn6N4YelE6F2Ws` | ~400 (sub) | `tools/consultar-imoveis.ts` | Port literal do ranking BEACH_BAIRROS + leadProfile + rankProperty + premium card composition |
| 9 | `atualizar_qualificacao` (subworkflow) | `toolWorkflow` v2.2 → workflowId `QKFhZQJRz8rczaYE` | ~180 (sub) | `tools/atualizar-qualificacao.ts` | **Escreve em Airtable `tblk6omODE3se3HwE` + Supabase `leads_qualificados` (schema LEGADO)**. Paridade exige preservar ambos. |
| 10 | `setar_lead_quente` (subworkflow) | `toolWorkflow` v2.2 → workflowId `QZ3VcIrxE6BRtCpj` | ~120 (sub) | `tools/setar-lead-quente.ts` | **Também Airtable + Supabase legado.** |
| 11 | `conhecimento_estrategico_luana1` | `@n8n/n8n-nodes-langchain.toolVectorStore` v1 | — | `tools/conhecimento-estrategico.ts` | name: `user_documents`. RAG sobre tabela `documents` (queryName `match_documents`). Precisa de embeddings + retrieval chain. |
| 12 | `Supabase Vector Store1` | `@n8n/n8n-nodes-langchain.vectorStoreSupabase` v1 | — | (faz parte de #11) | tableName: `documents`, queryName: `match_documents` |
| 13 | `Think1` | `@n8n/n8n-nodes-langchain.toolThink` v1.1 | — | `tools/think.ts` | Tool nativa LangChain "think" (reflection sink). `parameters: {}` — sem config. |
| 14 | `Salvar Outbound Supabase` | `n8n-nodes-base.code` v2 | ~120 | `services/persistence.ts` | `POST conversation_messages` + `PATCH conversations` via PostgREST. Vai persistir antes do return do endpoint. |
| 15 | `Buscar Follow-ups Vencidos` | `n8n-nodes-base.code` v2 | ~180 | `services/followup-fetcher.ts` (consumido por endpoint `event_type=followup_resume`) | Hidrata lead + deal + conversation + recent_messages e sintetiza `mensagemCliente` interna |
| 16 | `Marcar Follow-up Resolvido` | `n8n-nodes-base.code` v2 | ~70 | `services/followup-marker.ts` | PATCH `follow_up_tasks` status=`automatizado` |
| 17 | `Cron Follow-up Tasks` | `n8n-nodes-base.scheduleTrigger` | — | n8n permanece como trigger (5 min) OU BullMQ interno — decisão posterior |

**Total LOC JS a portar:** ~2.190 linhas.

---

## 2. Boundary clara — fica no n8n vs vai pro service

### Permanece no n8n (integração operacional, não cognitiva)

| Componente | Tipo n8n | Razão |
|---|---|---|
| `Webhook1` (Evolution receiver) | webhook | Endpoint público + paridade infra |
| `Normaliza Webhook1` | code | Parseia payload Evolution (telefone, jid, messageType) |
| `Verificar Atendimento` | code | Checa `_skip_ai` / IA pausada |
| `Switch1` + `IF` | switch/if | Roteamento media vs text |
| `REDIS` debounce buffer (REDIS, REDIS3, IF-COMPARA, UNIFICA REDIS) | redis + set | Buffer de 5s para agrupar mensagens fragmentadas (mesma chave Redis) |
| `Normalize Audio Payload` | code | Decrypt Evolution + audio converter → OGG |
| `OpenAI1` (Whisper) | langchain | Transcrição STT |
| `Montar Dados da Imagem1` / `Montar Dados do video1` | set | Upload Supabase Storage |
| `Upload Imagem no imgbb1` | http | imgbb fallback |
| `dados do banco` | set | Hidratação inicial (lead + deal + conversation + messages do Supabase) |
| `Loop Over Items` + `Wait7` (3s) | wait | Cadência humana entre mensagens splittadas |
| `Evolution sendText` (HTTP request) | http | Envio final WhatsApp |
| `Redis7/8/9` (limpeza chaves midia) | redis | Cleanup |
| `Cron Follow-up Tasks` | trigger | Pode permanecer (HTTP request para `POST /cognitive/turn`) |

### Vai pro service (kernel cognitivo)

Itens 1 a 16 da seção 1. O n8n após cutover passa a chamar:
```
POST https://jurema-cognitive-kernel.internal/jurema/cognitive/turn
```
e recebe `messages: string[]` para alimentar `Loop Over Items + Wait7 + Evolution sendText`.

---

## 3. Schema Postgres — Chat Memory

**Tabela:** `n8n_chat_histories_jurema`
**Driver:** `@n8n/n8n-nodes-langchain.memoryPostgresChat` v1.3 → equivalente TS: `@langchain/community/stores/message/postgres` (`PostgresChatMessageHistory`).
**Conexão:** credencial n8n `Postgres Jurema` (id `P75dmqutow4ArTja`). Service TS usará as mesmas creds via env vars: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_SSL`.

**Config exata:**
- `sessionIdType: customKey`
- `sessionKey: sessionId || telefoneCompleto || remoteJid`
- `tableName: n8n_chat_histories_jurema`
- `contextWindowLength: 20` (últimas 20 mensagens hidratadas pelo agent)

**Validação pendente (Fase 1):** confirmar schema exato da tabela (LangChain padrão é `id serial`, `session_id text`, `message jsonb`). Usar `\d n8n_chat_histories_jurema` antes do scaffold.

---

## 4. Vector Store (RAG)

**Tool:** `conhecimento_estrategico_luana1`
**Name:** `user_documents`
**Description:** "Contains all the information about prices and andress that you can check to answer user questions."
**Tabela Supabase:** `documents`
**Query function (Supabase RPC):** `match_documents`
**Tipo n8n:** `vectorStoreSupabase` v1
**Embeddings:** OpenAI (credencial `OpenAi JUREMA` id `W7viCvKb9IkuKdvf`) — modelo a confirmar via Supabase

**Equivalente TS:** `SupabaseVectorStore.fromExistingIndex(embeddings, { client, tableName: 'documents', queryName: 'match_documents' })` + `createRetrieverTool(retriever, { name: 'user_documents', description: ... })`.

**Validação pendente (Fase 1):** confirmar via `SELECT * FROM pg_proc WHERE proname='match_documents'` qual dimensão de embedding e qual modelo OpenAI foi usado para indexar.

---

## 5. Tabelas Supabase consumidas pelo kernel

**Projeto principal:** `dwmbklfkrtumfaxrbxio.supabase.co` (hardcoded em vários nós como fallback)
**Projeto storage:** `picoieyewgquuwylffxe.supabase.co` (apenas storage buckets `image-bucket`, `video-bucket`)

### Tabelas (READ + WRITE pelo kernel)

| Tabela | Operações | Origem |
|---|---|---|
| `leads` | SELECT id=X | `Buscar Follow-ups Vencidos`, `dados do banco` |
| `jurema_deals` | SELECT lead_id=X order desc | `Buscar Follow-ups Vencidos`, `Sync Op Context` |
| `conversations` | SELECT lead_id=X, PATCH last_*, ai_paused check | `Buscar Follow-ups`, `Salvar Outbound` |
| `conversation_messages` | INSERT outbound, SELECT recent 12 | `Salvar Outbound`, `Buscar Follow-ups` |
| `follow_up_tasks` | SELECT due_at<=now status=pendente, PATCH status=automatizado | `Buscar/Marcar Follow-ups` |
| `documents` | SELECT via RPC match_documents | RAG |
| `imoveis` | SELECT tenant_id+status filters | `consultar_imoveis` tool |
| `n8n_chat_histories_jurema` | INSERT/SELECT via LangChain | Chat Memory |
| `agent_metrics_events` | INSERT eventos (message_received, stage_changed, property_options_requested, property_search_failed, handoff_requested) | múltiplos pontos (a validar) |
| `agent_feature_flags` | SELECT tenant=X agent=jurema | (a confirmar se é consumido pelo hot-path) |

### Tabelas LEGADAS escritas via tools (Airtable + Supabase legado)

| Componente | Destino | Schema |
|---|---|---|
| `atualizar_qualificacao` | Airtable base `appUUDVUQx5JSXXvy` table `tblk6omODE3se3HwE` (GESTÃO DE LEADS) | colunas: Objetivo, Faixa de Valor, Perfil Resumido, Score do Lead, Bairro/Região de Interesse, Interesse Principal, Finalidade, Como chegou |
| `atualizar_qualificacao` | Supabase `leads_qualificados` (filter airtable_record_id) | objetivo, faixa_valor, score_lead, perfil_resumido, bairro_interesse, nome |
| `setar_lead_quente` | Mesma base/table Airtable + sets Score/Status=`🔥 Lead Quente` + Janela de Visita | — |

> **DRIFT CRÍTICO IDENTIFICADO:** O sistema novo usa `jurema_deals` (CLAUDE.md, fonte de verdade enterprise), mas as 2 tools de qualificação ainda gravam em **Airtable + `leads_qualificados`** (schema legado). Para preservar paridade, o port literal deve manter ambos os destinos. Migrar para `jurema_deals` é tarefa separada, fora do escopo da port.

---

## 6. Variáveis de ambiente requeridas pelo service TS

### Derivadas do workflow n8n (`$env.*`)

| Env var | Uso |
|---|---|
| `SUPABASE_URL` | Base PostgREST (fallback hardcoded `dwmbklfkrtumfaxrbxio`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave principal para `Salvar Outbound`, `follow_up_tasks`, leituras tenant-scoped |
| `JUREMA_SUPABASE_SERVICE_ROLE_KEY` | Fallback (mesma chave) |
| `SUPABASE_ANON_KEY` | Fallback alternativo |
| `SUPABASE_STORAGE_SERVICE_ROLE_KEY` | Upload buckets imagem/vídeo (fallback: `SUPABASE_SERVICE_ROLE_KEY`) |
| `SUPABASE_STORAGE_URL` | Endpoint storage (fallback `picoieyewgquuwylffxe`) |
| `IMGBB_API_KEY` | Upload imagem fallback |
| `EVOLUTION_API_URL` | Decrypt media (`https://evo.yzihub.com`) |
| `EVOLUTION_API_KEY` | Token Evolution |
| `EVOLUTION_AUDIO_CONVERTER_URL` | Áudio OGG converter |
| `EVOLUTION_AUDIO_CONVERTER_API_KEY` | Token converter |
| `OPENAI_API_KEY` | LLM gpt-4.1 (credencial n8n `OpenAi JUREMA`) |

### Adicionais para o service TS

| Env var | Uso |
|---|---|
| `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_SSL` | Chat Memory direta (mesma instância do `Postgres Jurema` no n8n) |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Concurrency lock per conversation_id |
| `AIRTABLE_API_KEY` | Para tools `atualizar_qualificacao` + `setar_lead_quente` (credencial n8n `Airtable Jurema` id `9CfsKgAgZ6WHr6hm`) |
| `AIRTABLE_BASE_ID` | `appUUDVUQx5JSXXvy` |
| `AIRTABLE_TABLE_ID` | `tblk6omODE3se3HwE` |
| `JUREMA_TENANT_ID` | `82cc7aa9-fc6e-4f37-8d8e-8a71c1691361` (hardcoded em vários pontos do workflow) |
| `PORT` / `HOST` / `LOG_LEVEL` | Fastify config |
| `KERNEL_VERSION` | Versão semântica do service (vai em logs/metrics) |

> O **frontend continua não tendo nenhuma dessas envs**. Service TS é backend-only.

---

## 7. Contrato de entrada e saída do endpoint

**Endpoint:** `POST /jurema/cognitive/turn`

### Request (paridade com o `Build Context` atual)

```jsonc
{
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "conversation_id": "uuid",
  "lead_id": "uuid",
  "deal_id": "uuid|null",
  "phone": "5583981681119",
  "telefoneCompleto": "5583981681119",
  "remoteJid": "558381681119@s.whatsapp.net",
  "sessionId": "5583981681119",
  "instance": "Jurema Brokers",
  "mensagemCliente": "texto da mensagem do cliente OU evento_interno_followup",
  "messageType": "text|audio|image|document|internal_followup",
  "external_message_id": "3EB016F0DA2589C9E2BEA1",
  "source": "whatsapp|site|...",
  "origemLead": "WhatsApp Site|Google Ads|...",
  "dataMensagem": "2026-05-25T...",

  // opcionais (followup path)
  "event_type": "followup_resume|null",
  "internal_behavioral_event": { ... },
  "followup_task_id": "uuid|null",
  "followup_task": { ... },
  "operational_context": { ... },
  "runtime_memory": { ... }
}
```

### Response (paridade com `Salvar Outbound`)

```jsonc
{
  "messages": ["primeira frase", "segunda frase"],   // já split por \n\n
  "saved_outbound": true,
  "operational_context": { ... },                     // estado final pós-turn
  "runtime_memory": { ... },
  "next_best_action": "apresentar_opcoes_aderentes|retomar_contexto_consultivo|...",
  "tool_calls_made": [
    { "name": "consultar_imoveis", "args": {...}, "ok": true }
  ],
  "duration_ms": 8421,
  "agent_iterations": 2,
  "tokens_used": { "prompt": 1180, "completion": 412 }
}
```

---

## 8. Identificadores de paridade (preservar literais)

São **valores fixos** que **não podem mudar** durante o port:

| Identificador | Valor | Onde |
|---|---|---|
| LLM model | `gpt-4.1` | `OpenAI Chat Model3` |
| Timeout LLM | `90000` ms | `OpenAI Chat Model3.options.timeout` |
| Max tokens | `1400` | `OpenAI Chat Model3.options.maxTokens` |
| Temperature | `0.6` | `OpenAI Chat Model3.options.temperature` |
| Max iterations agent | `5` | `Atendente.options.maxIterations` |
| Context window memória | `20` | `postgres1.contextWindowLength` |
| Session key | `sessionId || telefoneCompleto || remoteJid` | `postgres1.sessionKey` |
| Tabela chat history | `n8n_chat_histories_jurema` | `postgres1.tableName` |
| Tabela vector store | `documents` | `Supabase Vector Store1` |
| RPC vector match | `match_documents` | idem |
| Vector tool name | `user_documents` | `conhecimento_estrategico_luana1.name` |
| Vector tool description | "Contains all the information about prices and andress that you can check to answer user questions." | idem |
| Tenant ID Jurema | `82cc7aa9-fc6e-4f37-8d8e-8a71c1691361` | múltiplos pontos |
| Airtable base | `appUUDVUQx5JSXXvy` | tools qualif |
| Airtable table | `tblk6omODE3se3HwE` | idem |
| Workflow ID atualizar_qualificacao | `QKFhZQJRz8rczaYE` | toolWorkflow |
| Workflow ID setar_lead_quente | `QZ3VcIrxE6BRtCpj` | toolWorkflow |
| Workflow ID consultar_imoveis | `0udn6N4YelE6F2Ws` | toolWorkflow |
| Instance Evolution default | `Jurema Brokers` | múltiplos |

---

## 9. Estratégia de paridade para os 2 sub-workflows com Airtable

A tool `atualizar_qualificacao` no n8n executa, em sequência:

1. `executeWorkflowTrigger` → recebe 17 campos
2. `Prepara Dados Airtable` (Code) → normaliza origem, interesse, bairro, finalidade, faixa, score, status
3. `Update record` (Airtable) → grava em `tblk6omODE3se3HwE`
4. `Update a row` (Supabase) → grava em `leads_qualificados` (filter `airtable_record_id`)
5. `Code in JavaScript` → re-formata contexto para a Luana

A `setar_lead_quente` é similar, mas apenas grava no Airtable + força `Score do Lead = 🔥 Lead Quente`.

**Port:** cada tool vira uma função TS que recebe os mesmos 17 campos, executa a mesma normalização e faz duas chamadas HTTP em sequência:
- `PATCH https://api.airtable.com/v0/appUUDVUQx5JSXXvy/tblk6omODE3se3HwE/{record_id}` com headers `Authorization: Bearer AIRTABLE_API_KEY`
- `PATCH https://dwmbklfkrtumfaxrbxio.supabase.co/rest/v1/leads_qualificados?airtable_record_id=eq.{id}` com `apikey + Authorization Bearer SERVICE_ROLE`

Retorno: `{ ok: true, airtable_id, supabase_id }` — string que o agent vê como tool output.

**Paridade test:** fixture com input do `executeWorkflowTrigger` real, output esperado = payload PATCH Airtable + payload PATCH Supabase, comparado byte-a-byte.

---

## 10. Pendências antes de iniciar Fase 1 (scaffold)

| # | Pendência | Como resolver | Bloqueante? |
|---|---|---|---|
| P1 | Schema exato `n8n_chat_histories_jurema` (colunas + tipos) | `\d` via psql ou Supabase MCP `execute_sql` | **Sim** — Chat Memory adapter precisa bater |
| P2 | Modelo OpenAI usado para embeddings em `documents` (ada-002 vs text-embedding-3-small/large) e dimensão | `SELECT * FROM pg_proc WHERE proname='match_documents'` + amostragem da coluna `embedding` | Sim — para registrar mesmos embeddings |
| P3 | Confirmar tabela `agent_metrics_events` existe e schema | Supabase `list_tables` MCP | Não — pode ser portado posteriormente |
| P4 | Confirmar tabela `agent_feature_flags` é consumida pelo hot-path ou só pelo backend Agno | Grep `agent_feature_flags` no workflow v2 | Não |
| P5 | Validar se o `system_prompt` do Atendente está na propriedade `text` do nó ou em `messages.values[0].message` (precisa ler completo) | Read offset 2492 do workflow | **Sim** — port precisa do prompt literal |
| P6 | Confirmar credenciais Postgres do n8n para o service usar a mesma instância | Acesso ao n8n credentials store (admin) ou env var direta | **Sim** — não pode escrever em DB diferente |
| P7 | Confirmar se o vector store tem o mesmo `tenant_id` ou é global | Query `SELECT DISTINCT metadata->>'tenant_id' FROM documents` | Não — pode ser tratado na Fase 4 |
| P8 | Decisão produto: porta `agent_metrics_events` para o service ou mantém no n8n? | Discussão com user | Não |

---

## 11. Próximos passos (Fase 1 — Scaffold)

Após resolver pendências P1, P2, P5, P6:

1. Criar diretório `apps/jurema-cognitive-kernel/` (workspace separado dentro do repo, ou repo próprio)
2. `package.json` com:
   - `fastify@^4`, `@fastify/cors`, `@fastify/sensible`
   - `langchain@^0.3`, `@langchain/openai`, `@langchain/community`, `@langchain/core`
   - `pg@^8`, `ioredis@^5`, `pino@^9`
   - `typescript@^5`, `tsx@^4`, `@types/node`
   - `vitest@^2` para testes de paridade
3. `tsconfig.json` strict
4. `src/server.ts` com Fastify boot + `GET /healthz` + `POST /jurema/cognitive/turn` retornando placeholder
5. `Dockerfile` multi-stage
6. Endpoint deployado em subdomain interno isolado
7. Smoke test: `curl POST /jurema/cognitive/turn` → 200 com placeholder

A Fase 2 (port literal dos blocos) só começa após Fase 1 estar viva.

---

## 12. O que esta Fase 0 NÃO fez

- ❌ Não escreveu uma linha do service
- ❌ Não tocou em nenhum workflow n8n
- ❌ Não criou tabelas Supabase
- ❌ Não decidiu nada sobre `jurema_deals` vs `leads_qualificados` (drift fica como backlog)
- ❌ Não validou tabelas via MCP (P1-P8 são pendências da Fase 1)
- ❌ Não modificou `package.json`, `.env.example` ou docs do frontend

---

## 13. Decisões registradas

| # | Decisão | Justificativa |
|---|---|---|
| D1 | Runtime: Node.js + TypeScript | Port literal de JS para TS preserva semântica de regex/null/undefined; LangChain.js bate 1:1 com `@n8n/n8n-nodes-langchain` |
| D2 | HTTP framework: Fastify | Low overhead, schema validation, hot-path friendly |
| D3 | Postgres driver: `pg` + fetch direto PostgREST | Paridade com `n8n-nodes-base.httpRequest`; evita Supabase JS client (camada extra de ORM) |
| D4 | Service separado do Agno | YZI OS backend não precisa absorver runtime cognitivo de WhatsApp; ficam isolados |
| D5 | n8n permanece como webhook + media + persistência (após cutover) | Reduz risco; mantém infra Evolution funcionando; rollback trivial via env var |
| D6 | Sub-workflows Airtable mantêm Airtable + Supabase legado | Paridade exige preservar drift; refatoração para `jurema_deals` é backlog separado |
| D7 | Postgres Chat Memory aponta para MESMA tabela `n8n_chat_histories_jurema` | Continuidade conversacional zero-downtime no cutover |
| D8 | Tools internas (Think, conhecimento_estrategico) ficam dentro do service | São tools LangChain nativas, port direto |
| D9 | Cron follow-up: n8n permanece como trigger (5 min) → HTTP POST | Mantém simplicidade do scheduler n8n existente |
