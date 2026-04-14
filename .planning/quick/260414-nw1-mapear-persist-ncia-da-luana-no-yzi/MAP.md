# Mapeamento de Persistência — Luana (Jurema Brokers)

**Tenant:** Jurema Brokers (`tenant_id = aaaaaaaa-0002-0002-0002-000000000002`)
**Agente:** Luana — qualificação de leads imobiliários via WhatsApp Business (Evolution API).
**Objetivo:** Referência canônica de quais campos do webhook vão para colunas fixas vs `metadata` JSONB na tabela `leads` do Supabase. Serve para evitar regressões de persistência ao alterar workflows.

---

## Arquitetura (preservar — não mudar)

```
Webhook Evolution (mensagem WhatsApp)
  → Normaliza Webhook (phone E.164, tenant_id, nome, raw_message)
  → Search records1: GET /leads?phone=eq.{X}&tenant_id=eq.{Y}
  → If1 (array notEmpty?)
      → TRUE  → Get a record1 (passthrough $json[0])
      → FALSE → Create a record1 (UPSERT on_conflict=tenant_id,phone)
  → Dados do Lead (monta contexto: lead.name, lead.status, meta.*)
  → Atendente (agente LLM)
  → tool call: atualizar_qualificacao  (merge em metadata JSONB)
  → tool call: setar_lead_quente       (atualiza status + score, merge metadata)
```

Esta arquitetura NÃO está em discussão neste documento. O objetivo é alinhar persistência ao que já existe.

---

## Colunas fixas (tabela `leads`)

| Coluna | Origem (webhook / payload) | Observação |
|--------|---------------------------|------------|
| `id` | Gerado pelo Supabase (UUID) | Nunca enviar no payload de INSERT — Supabase auto-gera. |
| `tenant_id` | Hardcoded no workflow (`aaaaaaaa-0002-0002-0002-000000000002`) | Partição lógica multi-tenant. |
| `phone` | `Normaliza Webhook` → campo `telefoneCompleto` (E.164, só dígitos) | Junto com `tenant_id` forma a UNIQUE KEY. Ver migration `012_leads_tenant_phone_unique.sql` (task 260408-rqi). |
| `name` | `Normaliza Webhook` → nome do contato Evolution API | Pode ser vazio se Evolution não retornar pushName. |
| `status` | Definido por ferramenta / fluxo | Valor inicial na criação: `'start'`. Alterado para `'lead_quente'` por `setar_lead_quente`. Valores válidos em inglês (task 260409-7av). |
| `score` | Definido por `setar_lead_quente` | Numérico. `setar_lead_quente` define `score = 3` no handoff. |
| `source` | `meta.origem` no UPSERT de criação | Origem da entrada do lead (ex.: `'whatsapp'`). (a confirmar se armazenado como coluna ou somente em metadata) |
| `stage_id` | (a confirmar) | Referência ao pipeline kanban — não alterado pelos workflows de qualificação. |
| `created_at` | Gerado pelo Supabase | Auto-gerado via `DEFAULT now()`. |
| `updated_at` | Gerado pelo Supabase | Atualizado via trigger ou `DEFAULT now()` no PATCH. |

**Chave única:** `UNIQUE(tenant_id, phone)` — criada na migration `012_leads_tenant_phone_unique.sql`.
Todo UPSERT usa `on_conflict=tenant_id,phone` com `Prefer: resolution=merge-duplicates`.

---

## Campos em `metadata` (JSONB)

| Campo | Tipo | Origem | Quando é preenchido |
|-------|------|--------|---------------------|
| `bairro_interesse` | `string` | tool `atualizar_qualificacao` | Quando Luana extrai bairros de interesse do lead. |
| `faixa_valor` | `string` | tool `atualizar_qualificacao` | Quando o lead menciona budget (ex.: `"500k-1M"`). |
| `finalidade` | `string` | tool `atualizar_qualificacao` | Morar ou investir. |
| `tipo_imovel` | `string` | tool `atualizar_qualificacao` | Ex.: `"apartamento"`, `"casa"`. (a confirmar campo exato) |
| `quartos` | `number` | tool `atualizar_qualificacao` | Número de quartos desejados. (a confirmar campo exato) |
| `urgencia` | `string` | tool `atualizar_qualificacao` | Prazo / urgência do lead. (a confirmar campo exato) |
| `score` | `number` | tool `atualizar_qualificacao` | Score calculado pelo agente. |
| `objetivo` | `string` | tool `atualizar_qualificacao` | Objetivo geral (ex.: `"comprar"`). |
| `origem` | `string` | `Create a record1` (criação) | Canal de entrada do lead (ex.: `"whatsapp"`). |
| `localizacao_visita` | `string` | tool `setar_lead_quente` | Localização confirmada para visita — adicionada no handoff. |
| `last_message_at` | `string (ISO)` | (a confirmar) | Timestamp da última mensagem recebida. |
| `conversation_id` | `string` | (a confirmar) | ID da sessão Evolution API. |
| `raw_webhook` | `object` | (a confirmar) | Payload bruto opcional para debug. |

**Regra geral:** `metadata` é sempre MERGE — nunca substituição. Ver seção Regras abaixo e task 260408-rzc.

---

## Regras de persistência

### Regra 1 — Idempotência

Toda entrada de mensagem executa UPSERT com `on_conflict=tenant_id,phone` e `Prefer: resolution=merge-duplicates`. Se o lead já existe, o row existente é retornado; nenhum dado é sobrescrito sem intenção explícita.

### Regra 2 — 2ª mensagem em diante: GET ANTES do build_context

> **ATENÇÃO — Regra crítica anti-regressão**
>
> A partir da 2ª mensagem do mesmo número, o fluxo DEVE executar `Search records1` (GET do lead por `tenant_id + phone`) ANTES de montar o contexto para o agente (`Dados do Lead`). Isso garante que `metadata` acumulado nas qualificações anteriores esteja disponível ao agente.
>
> Se essa etapa for removida ou reordenada, o agente perde o histórico de qualificação e pode re-perguntar informações já coletadas.

Fluxo garantido atualmente pelo `If1`: se o lead já existe (`array notEmpty`), o path TRUE usa `Get a record1` (passthrough do Search) — nenhum novo lead é criado.

### Regra 3 — `atualizar_qualificacao` é a ÚNICA tool de escrita em `metadata`

A tool `atualizar_qualificacao` é a única responsável por escrever em `metadata`. Ela segue o padrão:

```
Get Lead (GET /leads?phone=eq.X&tenant_id=eq.Y)
  → Build Context: metadata = { ...antigo, ...novo }   ← MERGE, não overwrite
  → UPSERT Lead (POST /leads?on_conflict=tenant_id,phone)
```

Código do node `Build Context` (task 260408-rzc, verificado):
```js
const antigo = existingLead ? (existingLead.metadata || {}) : {}
const novo = { objetivo, faixa_valor, bairro_interesse, ... }
// Remove campos undefined/null/vazios antes do merge
Object.keys(novo).forEach(k => {
  if (novo[k] === undefined || novo[k] === null || novo[k] === '') delete novo[k]
})
return [{ json: { ..., metadata: { ...antigo, ...novo } } }]
```

Isso preserva campos de qualificações anteriores quando um novo payload não os inclui.

### Regra 4 — `setar_lead_quente` atualiza colunas fixas + faz merge em `metadata`

`setar_lead_quente` **não é tool de qualificação** — é tool de handoff. Ela:
- Altera coluna fixa `status = 'lead_quente'`
- Altera coluna fixa `score = 3`
- Adiciona `localizacao_visita` em `metadata` via merge (`{ ...antigo, localizacao_visita }`)
- **Não apaga** campos de qualificação já existentes em `metadata`
- Usa PATCH filtrado por `tenant_id + phone` (nunca cria novo lead)

---

## O que NÃO fazer

- **Criar lead novo a cada mensagem** — viola idempotência; o `If1` + `on_conflict` previnem isso, não remover.
- **Sobrescrever `metadata` com objeto parcial** — sempre fazer spread `{ ...antigo, ...novo }` antes do UPSERT.
- **Chamar n8n diretamente do frontend** — toda ação parte de `POST /api/actions/execute → job_queue → webhook n8n`.
- **Usar Airtable** — migração concluída em 260408-sow; tabela `leads_qualificados` (mirror) está obsoleta.
- **Enviar `id` no payload de INSERT** — `leads.id` é UUID gerado pelo Supabase; enviar um valor externo causou duplicatas no bug original (260408-rqi).
- **Usar `record_id` (Airtable)** como chave de merge — a chave de negócio é `(tenant_id, phone)`.
- **Remover `Search records1`** (GET inicial) sem substituir por outro mecanismo de lookup — perderia contexto de qualificação acumulado.

---

## Referências

| Artifact | Descrição |
|----------|-----------|
| [260408-rqi SUMMARY](../260408-rqi-padronizar-entrada-do-lead-no-supabase/260408-rqi-SUMMARY.md) | Migration UNIQUE(tenant_id,phone), fix on_conflict, remove id do payload |
| [260408-sow SUMMARY](../260408-sow-padronizar-entrada-do-lead-no-supabase/260408-sow-SUMMARY.md) | Migração completa do workflow principal Luana de Airtable para Supabase |
| [260408-sow audit](../260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-audit.md) | Auditoria node-a-node do workflow principal (antes × depois) |
| [260408-rzc SUMMARY](../260408-rzc-garantir-merge-de-metadata-no-atualizar-/260408-rzc-SUMMARY.md) | Verificação do merge `{ ...antigo, ...novo }` no `atualizar_qualificacao` |
| [260409-5w2 SUMMARY](../260409-5w2-padronizar-setar-lead-quente-com-merge-e/260409-5w2-SUMMARY.md) | `setar_lead_quente` migrado para Supabase com GET + PATCH + merge metadata |
| [atualizar_qualificacao.json](../../260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json) | Workflow tool de qualificação (fonte de verdade para import no n8n) |
| [setar_lead_quente.json](../../260408-sub-refactor-luana-airtable-supabase/setar_lead_quente.json) | Workflow tool de handoff (fonte de verdade para import no n8n) |
| [supabase/migrations/012_leads_tenant_phone_unique.sql](../../../../supabase/migrations/012_leads_tenant_phone_unique.sql) | Migration que adiciona UNIQUE(tenant_id, phone) com dedup seguro |
