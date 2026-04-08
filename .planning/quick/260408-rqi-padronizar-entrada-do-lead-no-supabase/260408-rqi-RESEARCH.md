# Quick Task 260408-rqi: Padronizar Entrada do Lead no Supabase — Research

**Researched:** 2026-04-08
**Domain:** n8n workflows / Supabase lead persistence / Luana agent (Jurema Brokers)
**Confidence:** HIGH

---

## Summary

Os 4 workflows de ferramenta da Luana (`atualizar_qualificacao`, `setar_lead_quente`, `consultar_imoveis`, `buscar_lancamentos`) foram migrados de Airtable para Supabase na quick task `260408-sub`. Os workflows de leitura (`consultar_imoveis`, `buscar_lancamentos`) estão corretos. Os dois workflows de escrita (`atualizar_qualificacao`, `setar_lead_quente`) têm problemas de persistência que causam criação de lead duplicado na segunda mensagem.

**Problema raiz:** O campo `id` na tabela `leads` é `UUID` (migration 001), mas `atualizar_qualificacao` usa `id = telefone_limpo` (string numérica). O conflito `on_conflict=tenant_id,id` falha silenciosamente — Supabase não encontra o registro e cria um novo em vez de atualizar o existente. O `setar_lead_quente` usa PATCH por `phone`, que é o padrão correto, mas também não tem garantia de criar o lead se ele não existir.

**Solução:** Adicionar `UNIQUE(tenant_id, phone)` na tabela `leads` e trocar o conflito do UPSERT para `on_conflict=tenant_id,phone`.

---

## Estado Atual dos Workflows

### Workflows inspecionados

| Arquivo | Localização |
|---------|-------------|
| `atualizar_qualificacao.json` | `.planning/quick/260408-sub-refactor-luana-airtable-supabase/` |
| `setar_lead_quente.json` | `.planning/quick/260408-sub-refactor-luana-airtable-supabase/` |
| `consultar_imoveis.json` | `.planning/quick/260408-sub-refactor-luana-airtable-supabase/` |
| `buscar_lancamentos.json` | `.planning/quick/260408-sub-refactor-luana-airtable-supabase/` |

### Fluxo correto implementado em ambos os workflows de escrita

```
Webhook → Normalize → Get Lead (GET /leads?tenant_id=eq.X&phone=eq.Y) → Build Context → UPSERT/PATCH → Respond
```

O GET por `phone + tenant_id` JA existe nos dois workflows. A etapa "se existir / se não existir" já está no `Build Context` — ele usa `existingLead ? existingLead.name : (input.nome || telefone)`. Isso é correto.

---

## Problemas Identificados

### Problema 1 — `atualizar_qualificacao`: on_conflict errado (CRITICO)

**Node:** `UPSERT Lead` (aq-5-upsert-lead)

**URL atual:**
```
POST /rest/v1/leads?on_conflict=tenant_id,id
```

**Por que falha:** O schema define `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`. O `Build Context` seta `id = telefone_limpo` (ex: `"5583981681119"`), que não é um UUID válido. Supabase rejeita silenciosamente a operação ou cria um erro de cast — causando CREATE em vez de UPDATE na segunda mensagem.

**Correção:**
1. Adicionar constraint `UNIQUE(tenant_id, phone)` na tabela `leads`
2. Trocar o URL para `on_conflict=tenant_id,phone`
3. Remover `id: telefone` do payload (deixar UUID gerado automaticamente no primeiro insert)

**Body correto do UPSERT:**
```json
{
  "tenant_id": "...",
  "phone": "5583981681119",
  "name": "...",
  "metadata": { ... }
}
```
Sem `id` no payload — Supabase gera UUID no INSERT e usa `phone+tenant_id` para detectar conflito no UPDATE.

---

### Problema 2 — `setar_lead_quente`: PATCH pode criar registros fantasma (MEDIO)

**Node:** `PATCH Lead` (slq-5-patch-lead)

**URL atual:**
```
PATCH /rest/v1/leads?tenant_id=eq.X&phone=eq.Y
```

O PATCH filtra por `phone + tenant_id` — correto. Mas se o lead não existir (ex: agente chama `setar_lead_quente` antes de `atualizar_qualificacao`), o PATCH retorna 200 com array vazio sem criar o lead.

**Correção:** Sem necessidade de alterar o node PATCH. A garantia é que `atualizar_qualificacao` sempre rode primeiro (é chamado pelo agente nas fases 1-3, antes de `setar_lead_quente` na fase 4). A correção do Problema 1 resolve isso indiretamente.

---

### Problema 3 — `record_id` no system prompt da Luana (RESIDUAL)

**Arquivo:** `clientes/jurema-brokers/prompts.md` linha 20:
```
REGRA DE MERGE: Sempre envie o record_id + campos que já estavam no CRM + a nova informação.
```

Isso é um **resquício do Airtable** — no Airtable o `record_id` era o identificador (ex: `recZmMwTw46HY6Kwb`). Os workflows já não usam `record_id` em nenhum node. Mas se o agente tentar enviar `record_id` no payload, o node `Build Context` ignora esse campo (não está mapeado). Risco baixo, mas o prompt deve ser atualizado para remover referência a `record_id`.

**CSV de leads ainda tem `record_id` nas URLs de webhook** (`/lead-quente?record_id=recZmMwTw46HY6Kwb`) — esses são dados históricos do Airtable, não afetam os novos workflows.

---

## Schema da Tabela `leads` (migration 001)

```sql
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  stage_id        UUID REFERENCES pipeline_stages(id),
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,           -- sem UNIQUE constraint atualmente
  ...
  metadata        JSONB NOT NULL DEFAULT '{}',
  ...
);

-- Indexes existentes:
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_stage_id ON leads(stage_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);

-- AUSENTE: UNIQUE(tenant_id, phone)
```

**A constraint `UNIQUE(tenant_id, phone)` não existe** em nenhuma migration (001-011). Ela precisa ser criada antes que o UPSERT por `on_conflict=tenant_id,phone` funcione.

---

## O Que Precisa Mudar

### 1. Nova migration SQL

```sql
-- Migration 012: unique constraint para lead upsert por phone
ALTER TABLE leads ADD CONSTRAINT leads_tenant_phone_unique UNIQUE (tenant_id, phone);
```

**Obs:** Antes de rodar, verificar se existem leads duplicados com mesmo `(tenant_id, phone)` no banco de produção — se sim, deduplicar primeiro.

### 2. Atualizar `atualizar_qualificacao.json` — node `UPSERT Lead`

Trocar a URL:
```
// ANTES
POST /rest/v1/leads?on_conflict=tenant_id,id

// DEPOIS
POST /rest/v1/leads?on_conflict=tenant_id,phone
```

Trocar o `Build Context` para não incluir `id` no payload:
```js
// ANTES (Build Context)
return [{ json: {
  id: telefone,          // REMOVER ESTA LINHA
  tenant_id: ...,
  phone: telefone,
  name: ...,
  metadata: ...
} }]

// DEPOIS
return [{ json: {
  tenant_id: ...,
  phone: telefone,
  name: ...,
  metadata: ...
} }]
```

### 3. Atualizar `prompts.md` da Luana

Substituir a linha:
```
// ANTES
REGRA DE MERGE: Sempre envie o record_id + campos que já estavam no CRM + a nova informação.

// DEPOIS
REGRA DE MERGE: Sempre envie o telefone + tenant_id + campos que já estavam no CRM + a nova informação. Nunca envie payloads incompletos que possam apagar dados existentes.
```

---

## Workflows NÃO Alterados

`consultar_imoveis.json` e `buscar_lancamentos.json` são somente-leitura e não têm nenhum problema de persistência. Não alterar.

---

## Verificação Esperada

Após as correções, o teste deve ser:

```sql
-- Enviar 3 mensagens do mesmo telefone para a Luana
-- Deve existir EXATAMENTE 1 lead

SELECT COUNT(*) FROM leads
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND phone = '5583981681119';
-- Esperado: 1 (não 2 ou 3)

-- Metadata deve acumular dados das 3 mensagens
SELECT metadata FROM leads
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND phone = '5583981681119';
```

---

## Sources

- `atualizar_qualificacao.json` — inspecionado (node aq-4-build-context, aq-5-upsert-lead)
- `setar_lead_quente.json` — inspecionado (node slq-4-build-metadata, slq-5-patch-lead)
- `supabase/migrations/001_initial_schema.sql` — schema da tabela `leads`, ausência de UNIQUE(tenant_id, phone)
- `clientes/jurema-brokers/prompts.md` — referência residual a `record_id`
- `clientes/jurema-brokers/data/GESTÃO DE LEADS-Grid view.csv` — `record_id` Airtable em URLs históricas
- `.planning/quick/260408-sub-refactor-luana-airtable-supabase/DEPLOY.md` — documentação da aviso sobre schema de `id` (Opção A já identificada)

**Nota:** O DEPLOY.md da task anterior já identificou o problema (seção "AVISO: Schema de `id` no leads") e recomendou "Opção A: usar `phone` como chave de conflito". Esta research confirma e detalha o caminho.
