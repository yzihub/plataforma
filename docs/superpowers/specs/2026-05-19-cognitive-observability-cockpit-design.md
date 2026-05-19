# Cognitive Observability Cockpit — Design Spec

**Data:** 2026-05-19
**Fase:** YZI IMOB 17C
**Status:** Aprovado — pronto para implementação incremental

---

## 1. Princípio fundador

> Este cockpit não é um admin panel, devtools ou dashboard técnico.
> É uma **interface institucional de leitura da causalidade operacional cognitiva** da Ju.

Duas perguntas que o cockpit responde:

- **Primária (proativa):** "Como a Ju está operando agora?"
- **Secundária (forense):** "O que aconteceu exatamente nessa sessão?"

---

## 2. Modelo semântico — Ontologia operacional

### 2.1 Dicionário cognitivo institucional

| Campo técnico (DB) | Leitura cognitiva (UI) |
|---|---|
| `runtime_state` | Estado cognitivo |
| `objective_state` | Objetivo ativo |
| `next_action` | Direção operacional |
| `loop_detected = true` | Loop cognitivo detectado |
| `loop_risk = 'high'` | Risco de loop: crítico |
| `fallback_triggered = true` | Recuo de fallback |
| `valid_transition = false` | Transição irregular |
| `retrieval_allowed = true` | Recuperação de memória ativa |
| `retrieval_policy = 'disabled'` | Recuperação desativada |
| `handoff_state` | Continuidade de handoff |
| `latency_ms` | Latência cognitiva |
| `transition_reason` | Razão da transição |
| `missing_fields` | Campos não resolvidos |
| `resolved_fields` | Campos confirmados |
| `context_snapshot` | Contexto ativo no momento |
| `state_snapshot` | Estado no momento da execução |

### 2.2 Dois modos de leitura

**Modo torre** (`/cockpit/observabilidade`):
> "A Ju está operando. Saúde cognitiva normal. 3 sessões ativas. 1 recuo de fallback nas últimas 2h. Latência média: 312ms."

**Modo forense** (`/cockpit/observabilidade/sessoes/[id]/replay`):
> "Nessa sessão: objetivo `apresentar_imoveis` → transição irregular para `aguardando_resposta`. Razão: missing_field `budget_max`. Recuo não trigou. Loop não detectado."

### 2.3 Cognitive Severity

Severidade computada unificada — substitui badges isolados por uma leitura operacional coerente.

| Nível | Condição | Cor |
|---|---|---|
| `critical` | `loop_detected = true` OU (`loop_risk = 'high'` E `valid_transition = false`) | Vermelho |
| `warning` | `loop_risk = 'medium'` OU `fallback_triggered = true` OU `valid_transition = false` | Laranja |
| `nominal` | Operação normal, transição válida | Verde |
| `info` | Retrieval ativo, sem anomalia | Azul |

Prepara: filtros, priorização, ordenação, alert routing futuro.

---

## 3. Estrutura de rotas

### 3.1 Mapa completo

```
/cockpit/observabilidade                         ← Torre: Saúde Cognitiva (landing viva)
/cockpit/observabilidade/sessoes                 ← Catálogo de sessões
/cockpit/observabilidade/sessoes/[id]            ← Detalhe de sessão
/cockpit/observabilidade/sessoes/[id]/replay     ← Replay forense
/cockpit/observabilidade/transicoes              ← Timeline de transições
/cockpit/observabilidade/retrieval               ← Inspetor de recuperação
/cockpit/observabilidade/loops                   ← Alertas de loop
/cockpit/observabilidade/handoffs                ← Continuidade de handoff
```

### 3.2 Pergunta operacional por rota

| Rota | Pergunta que responde |
|---|---|
| `/observabilidade` | Como a Ju está operando agora? |
| `/sessoes` | Quais sessões aconteceram? |
| `/sessoes/[id]` | O que aconteceu nessa execução? |
| `/sessoes/[id]/replay` | Por que a Ju chegou nesse estado? |
| `/transicoes` | Quais estados mudaram e por quê? |
| `/retrieval` | Quando e por que a memória foi acionada? |
| `/loops` | Onde a Ju entrou em ciclo? |
| `/handoffs` | O handoff para corretor foi contínuo? |

---

## 4. Lineage de dados

### 4.1 Tabelas por view

| Tabela | Views que usam |
|---|---|
| `ju_runtime_traces` | Torre + Sessões + Loops + Retrieval + Replay |
| `ju_runtime_transition_logs` | Transições + Replay |
| `ju_runtime_states` | Torre (estado atual por conversa) |
| `ju_runtime_gateway_logs` | Sessões (latência HTTP, origem) |
| `agent_metrics_events` | Torre (compatibilidade com AgentMetricsClient) |
| `jurema_deals` | Handoffs (deal_stage, broker_status) |

### 4.2 Fluxo de causalidade (por execução)

```
1. Request chega       → ju_runtime_gateway_logs   (HTTP trace)
         ↓
2. Runtime executa     → ju_runtime_traces          (cognitive trace completo)
         ↓
3. Estado persiste     → ju_runtime_states          (current state por conversa)
         ↓
4. Transição registra  → ju_runtime_transition_logs (prev → current + razão)
         ↓
5. Evento emitido      → agent_metrics_events       (handoff, stage_changed, etc.)
```

---

## 5. Princípio de coesão causal

> Toda perspectiva carrega `conversation_id` como âncora universal.
> Qualquer sinal navega para a cadeia causal completa.
> Nenhuma view é um silo isolado.

### 5.1 Âncoras de navegação

| Âncora | Une |
|---|---|
| `conversation_id` | Todas as perspectivas de uma sessão |
| `runtime_trace_id` | Ponto no tempo específico |
| `correlation_id` | Gateway log ↔ runtime trace |
| `deal_id` | Trace ↔ handoff ↔ jurema_deals |

### 5.2 Paleta de navegação contextual

| Tipo de link | Cor |
|---|---|
| Loop → replay | Vermelho |
| Fallback → detalhe | Laranja |
| Retrieval → contexto | Violeta |
| Replay contextual | Azul |

### 5.3 Drill-down flows

```
Landing feed row
  → click → /sessoes/[id]
    → click "Ver replay" → /sessoes/[id]/replay
      → frame com loop    → /loops?conversation_id=X
      → frame retrieval   → /retrieval?conversation_id=X
    → click deal_id       → /handoffs?deal_id=X

/loops row
  → click → /sessoes/[id]/replay     (direto ao replay)

/retrieval row
  → click → /sessoes/[id]            (detalhe no momento da recuperação)

/handoffs row
  → click → /sessoes?deal_id=X       (sessões filtradas)
    → click → /sessoes/[id]/replay

/transicoes row
  → click → /sessoes/[id]/replay     (replay no frame daquela transição)
```

---

## 6. Queries

### 6.1 Landing — sinais de saúde (últimas 24h)

```sql
SELECT
  COUNT(*)                                          AS total_traces,
  COUNT(*) FILTER (WHERE loop_detected = true)      AS loops_detectados,
  COUNT(*) FILTER (WHERE fallback_triggered = true) AS fallbacks,
  COUNT(*) FILTER (WHERE status = 'error')          AS erros,
  COUNT(*) FILTER (WHERE valid_transition = false)  AS transicoes_irregulares,
  ROUND(AVG(latency_ms))                            AS latencia_media_ms,
  MAX(latency_ms)                                   AS latencia_maxima_ms,
  COUNT(*) FILTER (WHERE retrieval_allowed = true)  AS recuperacoes_ativas,
  COUNT(DISTINCT conversation_id)                   AS conversas_ativas
FROM ju_runtime_traces
WHERE tenant_id = $tenant_id
  AND created_at >= NOW() - INTERVAL '24 hours'
```

### 6.2 Landing — feed recente (20 últimas execuções)

```sql
SELECT
  runtime_trace_id, correlation_id, conversation_id,
  lead_id, deal_id,
  runtime_state, previous_runtime_state,
  objective_state, next_action,
  loop_risk, loop_detected, fallback_triggered,
  retrieval_policy, latency_ms, status, created_at
FROM ju_runtime_traces
WHERE tenant_id = $tenant_id
ORDER BY created_at DESC
LIMIT 20
```

### 6.3 Replay forense — cadeia causal completa

```sql
SELECT
  runtime_trace_id,
  runtime_state, previous_runtime_state,
  objective_state, previous_objective_state,
  next_action, transition_reason,
  valid_transition, valid_objective_transition,
  loop_risk, loop_detected,
  fallback_triggered, fallback_reason,
  retrieval_policy, retrieval_allowed,
  retrieval_snapshot, tool_snapshot, state_snapshot,
  latency_ms, started_at, created_at
FROM ju_runtime_traces
WHERE conversation_id = $conversation_id
  AND tenant_id = $tenant_id
ORDER BY created_at ASC
```

### 6.4 Loop alerts

```sql
SELECT
  runtime_trace_id, conversation_id, lead_id, deal_id,
  loop_risk, loop_detected,
  runtime_state, objective_state, transition_reason,
  created_at
FROM ju_runtime_traces
WHERE tenant_id = $tenant_id
  AND (loop_detected = true OR loop_risk = 'high')
ORDER BY created_at DESC
LIMIT 50
```

### 6.5 Retrieval inspector

```sql
SELECT
  runtime_trace_id, conversation_id,
  retrieval_policy, retrieval_allowed, retrieval_snapshot,
  objective_state, runtime_state, latency_ms, created_at
FROM ju_runtime_traces
WHERE tenant_id = $tenant_id
  AND retrieval_allowed = true
ORDER BY created_at DESC
LIMIT 50
```

### 6.6 Handoff continuity

```sql
SELECT
  d.id, d.deal_stage, d.broker_status,
  d.client_name, d.client_phone,
  d.lead_id, d.updated_at,
  t.runtime_state, t.objective_state, t.created_at AS ultimo_trace_em
FROM jurema_deals d
LEFT JOIN LATERAL (
  SELECT runtime_state, objective_state, created_at
  FROM ju_runtime_traces
  WHERE deal_id = d.id AND tenant_id = d.tenant_id
  ORDER BY created_at DESC LIMIT 1
) t ON true
WHERE d.tenant_id = $tenant_id
  AND d.broker_status IN ('aguardando_corretor','atribuido','em_atendimento')
ORDER BY d.updated_at DESC
```

---

## 7. APIs

Padrão: `/api/observabilidade/` (extensão do existente `/api/observabilidade/agent-metrics`).

```
GET /api/observabilidade/health
GET /api/observabilidade/sessoes
GET /api/observabilidade/sessoes/[id]
GET /api/observabilidade/replay?conversation_id=
GET /api/observabilidade/transicoes
GET /api/observabilidade/retrieval
GET /api/observabilidade/loops
GET /api/observabilidade/handoffs
```

---

## 8. Composição TailAdmin

### 8.1 Hierarquia de disclosure progressivo

```
Nível 1 — Landing:        sinais de saúde agregados + feed recente
Nível 2 — Sessions list:  linhas paginadas com sinais-chave
Nível 3 — Session detail: snapshot completo de uma execução
Nível 4 — Replay:         reconstrução causal frame-a-frame
```

JSONs pesados (`state_snapshot`, `context_snapshot`) — colapsados por padrão, expandem sob clique.

### 8.2 Layout da landing

```
┌─────────────────────────────────────────────────────────────┐
│  [DriftAlert — condicional, só se anomalia presente]         │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────┤
│ Sessões  │  Loops   │ Fallback │  Erros   │ Latência │ Rec. │  ← CognitiveHealthStrip
│ (24h)    │          │          │          │  média   │ ativa│
├─────────────────────────────────────────────────────────────┤
│  Feed recente — 20 linhas, skeleton ao carregar              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Severidade │ Estado cognitivo  │ Objetivo │ Latência │    │  ← CognitiveFeedTable
│  │ (badge)    │ prev → atual      │ ativo    │ loop?    │    │
│  └─────────────────────────────────────────────────────┘    │
│  [Carregar mais]                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Mapa de componentes

**Landing:**

| Componente | Responsabilidade |
|---|---|
| `CognitiveHealthStrip` | KPI row — 6 sinais de saúde (padrão `LeadsKpiStrip`) |
| `CognitiveFeedTable` | Feed recente com âncoras de navegação e `CognitiveSeverityBadge` |
| `DriftAlert` | Banner condicional — renderiza só se há anomalia |

**Sub-rotas:**

| Componente | Rota |
|---|---|
| `SessionsTable` | `/sessoes` |
| `SessionDetailView` | `/sessoes/[id]` |
| `ReplayTimeline` | `/sessoes/[id]/replay` |
| `ReplayFrame` | Dentro do replay — um trace completo |
| `TransitionsLog` | `/transicoes` |
| `RetrievalInspector` | `/retrieval` |
| `LoopAlertsTable` | `/loops` |
| `HandoffBoard` | `/handoffs` |

**Componentes atômicos compartilhados:**

| Componente | O que exibe |
|---|---|
| `CognitiveSeverityBadge` | Severidade computada: critical / warning / nominal / info |
| `ConversationAnchor` | Link `conversation_id` → replay (cor azul) |
| `StateTransitionBadge` | `prev_state → current_state` com seta |
| `ObjectiveStateBadge` | Pill com objetivo ativo |
| `LatencyBadge` | Verde < 400ms / amarelo < 800ms / vermelho > 800ms |
| `RetrievalPolicyBadge` | disabled = cinza / lazy = azul / required = violeta |

**Skeletons:**

| Componente | Usado em |
|---|---|
| `SkeletonHealthStrip` | Landing ao montar |
| `SkeletonFeedRows` | Feed recente ao carregar |
| `SkeletonTableRows` | Sub-rotas ao navegar |
| `SkeletonReplayFrames` | Replay ao abrir |

Padrão visual: `animate-pulse bg-gray-100 dark:bg-gray-800 rounded` — consistente com cockpit atual.

### 8.4 Estrutura do ReplayFrame

```
Frame N — [CognitiveSeverityBadge]
┌─────────────────────────────────────────────────────┐
│ Estado cognitivo:  lead_novo → qualificacao          │
│ Objetivo ativo:    qualificar_intencao               │
│ Direção operacional: qualificar_objetivo             │
│ Transição válida:  ✓ sim                            │
│ Razão:             "intenção ausente"                │
├─────────────────────────────────────────────────────┤
│ Recuperação de memória: desativada                   │
│ Loop detectado: não                                  │
│ Fallback: não                                        │
│ Latência cognitiva: 287ms                            │
├─────────────────────────────────────────────────────┤
│ [▸ Ver contexto completo]   [▸ Ver estado completo]  │  ← colapsáveis
└─────────────────────────────────────────────────────┘
```

---

## 9. Estratégia de leitura e caching

| View | Estratégia |
|---|---|
| Landing health | `force-dynamic`, sem cache — query leve, dados frescos |
| Sessions feed | On-demand, refresh manual |
| Session detail | Imutável após escrita → cacheable |
| **Replay chain** | **Altamente cacheable** — traces são append-only |
| Transitions | On-demand, paginado |
| Loops / Retrieval | On-demand, filtros, sem polling |
| Handoffs | On-demand, join com `jurema_deals` |

Nenhuma view usa polling. Nenhuma view usa Supabase Realtime.

---

## 10. Rollout incremental

```
Etapa 1  Landing health + CognitiveHealthStrip + DriftAlert
Etapa 2  CognitiveFeedTable (feed recente com navegação)
Etapa 3  /sessoes (catálogo paginado)
Etapa 4  /sessoes/[id] (detalhe + colapsáveis)
Etapa 5  /sessoes/[id]/replay (ReplayTimeline + ReplayFrame)
Etapa 6  /loops (LoopAlertsTable com link para replay)
Etapa 7  /retrieval (RetrievalInspector)
Etapa 8  /transicoes (TransitionsLog)
Etapa 9  /handoffs (HandoffBoard + join jurema_deals)
```

Cada etapa é deployável de forma independente. Etapas 1–5 entregam 80% do valor operacional.

---

## 11. O que este cockpit NÃO é

- Não é centro de incidentes
- Não é tela de logs brutos
- Não é devtools operacional
- Não é monitoramento de infraestrutura

**É:** torre operacional cognitiva institucional — perspectivas diferentes da mesma causalidade operacional da Ju.
