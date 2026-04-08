# Auditoria: Workflow Principal Luana — Nodes de Persistência

**Data:** 2026-04-08
**Workflow:** Luana (JzEtJ1MpAXx6EMTp)
**Objetivo:** Garantir GET lead por phone+tenant_id antes de qualquer ação, eliminar duplicatas, remover airtable_record_id

---

## Diagnóstico do Fluxo Original

**Fluxo principal de entrada de mensagens:**
```
Webhook → Normaliza Webhook → Switch → Switch Block (IA Ativa)
  → Search records1 (Airtable)
  → If1
    → TRUE (lead encontrado): Get a record1 (Airtable) → Dados do Lead
    → FALSE (lead não existe): Create a record1 (Airtable) → Create a row (Supabase leads_qualificados) → Dados do Lead
  → Dados do Lead → Switch6 → ... → Atendente
```

**Problema central:** O workflow usava **Airtable** como banco de leads e tinha uma tabela `leads_qualificados` no Supabase como espelho. As ferramentas (`atualizar_qualificacao`, `setar_lead_quente`) foram migradas para `leads` em Supabase (quick-260408-rqi), mas o fluxo pai ainda usava Airtable. Resultado: segunda mensagem poderia criar duplicata se Airtable e Supabase ficassem dessincronizados.

---

## Nodes Auditados

### 1. `Search records1` — CORRIGIDO
| Campo | Antes | Depois |
|-------|-------|--------|
| Type | `airtable` | `httpRequest` |
| Tabela | Airtable `GESTÃO DE LEAD` | Supabase `leads` |
| Filtro | `{Telefone}=telefoneCompleto` (Airtable formula) | `phone=eq.{telefoneCompleto}&tenant_id=eq.{TENANT}` |
| Identificador | Airtable record ID | phone + tenant_id |

**Veredicto original:** CORRIGIR — usava Airtable para lookup de leads

---

### 2. `If1` — CORRIGIDO
| Campo | Antes | Depois |
|-------|-------|--------|
| Condição | `$json.id exists` (string) | `Array.isArray($json) && $json.length > 0` (array notEmpty) |
| True (output 0) | Lead encontrado → Get a record1 | Lead encontrado → Get a record1 (mantido) |
| False (output 1) | Lead não existe → Create a record1 | Lead não existe → Create a record1 (mantido) |

**Veredicto original:** CORRIGIR — condição incompatível com resposta array do httpRequest Supabase

---

### 3. `Get a record1` — CORRIGIDO
| Campo | Antes | Depois |
|-------|-------|--------|
| Type | `airtable` | `code` |
| Operação | GET by Airtable `id` (2a requisição) | Passthrough: extrai `$('Search records1').item.json[0]` |
| Uso de record_id | `$json.id` = Airtable record ID | Removido — não necessário |

**Veredicto original:** CORRIGIR — fazia 2ª chamada à API usando record_id do Airtable; lead já disponível via Search

---

### 4. `Create a record1` — CORRIGIDO
| Campo | Antes | Depois |
|-------|-------|--------|
| Type | `airtable` | `httpRequest` |
| Operação | Airtable INSERT `GESTÃO DE LEAD` | Supabase UPSERT `/leads?on_conflict=tenant_id,phone` |
| Payload | Nome, Telefone, Score, Status (Airtable fields) | `{tenant_id, phone, name, status: 'start', metadata: {origem}}` |
| Idempotência | Nenhuma (criava duplicata se rodado 2x) | on_conflict=tenant_id,phone + merge-duplicates |

**Veredicto original:** CORRIGIR — criava lead novo no Airtable sem verificar duplicata; segunda mensagem poderia criar 2 leads

---

### 5. `Create a row` — CORRIGIDO
| Campo | Antes | Depois |
|-------|-------|--------|
| Type | `supabase` | `code` |
| Operação | INSERT `leads_qualificados` com `airtable_record_id` | Passthrough: extrai `$json[0]` do UPSERT response |
| Propósito | Mirror Airtable→Supabase (legacy) | Normaliza resposta para Dados do Lead |

**Veredicto original:** CORRIGIR — tabela `leads_qualificados` era um espelho do Airtable; agora obsoleta com migração para `leads`

---

### 6. `Dados do Lead` — CORRIGIDO
| Campo | Antes | Depois |
|-------|-------|--------|
| `lead['Status Lead']` | Airtable emoji field name | `lead.status` (Supabase slug direto) |
| `lead['Nome do Cliente']` | Airtable field name | `lead.name` |
| `lead.airtable_record_id` | Airtable record ID fallback | Removido |
| `statusMap` | Mapeamento emoji → slug | Removido (Supabase já armazena slug) |
| `lead['Bairro / Região de Interesse']` | Airtable field name | `meta.bairro_interesse` |
| `lead['Faixa de Valor']` | Airtable field name | `meta.faixa_valor` |
| `lead['Finalidade']` | Airtable field name | `meta.finalidade` |
| `lead['Como chegou até a Jurema']` | Airtable field name | `meta.origem` |
| Output aliases | — | `Telefone`, `Status Lead`, `Score do Lead` (backward-compat para Atendente) |

**Veredicto original:** CORRIGIR — campos Airtable em português com emojis incompatíveis com schema Supabase

---

### 7. `atualizar_qualificacao` (toolWorkflow) — CORRIGIDO
| Campo | Antes | Depois |
|-------|-------|--------|
| `airtable_record_id` input | `$('Dados do Lead').item.json.id` | **Removido** |
| `telefone` input | Ausente | `$('Dados do Lead').item.json.phone` |
| `tenant_id` input | Ausente | `'aaaaaaaa-0002-0002-0002-000000000002'` (Jurema hardcoded) |

**Veredicto original:** CORRIGIR — tool workflow foi corrigido em 260408-rqi para usar phone+tenant_id, mas o nó chamador ainda passava `airtable_record_id` e não passava phone/tenant_id → tool recebia telefone vazio e criava leads inválidos

---

### 8. `setar_lead_quente` (toolWorkflow) — CORRIGIDO
Mesma correção do `atualizar_qualificacao`: removido `airtable_record_id`, adicionados `telefone` e `tenant_id`.

**Veredicto original:** CORRIGIR — mesmo problema de inputs ausentes

---

### Nodes NÃO alterados (fora do escopo)
| Node | Motivo |
|------|--------|
| `Busca Telefone` | Tabela `chats` (sessão, não leads) — correto |
| `Adiciona CHAT supabase` | Tabela `chats` — correto |
| `Atualiza CHAT Supabase` | Tabela `chats` — correto |
| `Cria Histórico Supabase` | Tabela `chat_messages` — correto |
| `Update record` | Airtable update de foto — fora de escopo de leads |
| `Salvar Midias - imagens/video` | Airtable de mídias — fora de escopo |
| `Atendente` | Lógica do agente — não alterada |
| `Normaliza Webhook` | Normalização de entrada — correto |

---

## Fluxo Corrigido

```
Webhook → Normaliza Webhook → Switch Block
  → Search records1 (Supabase GET /leads?phone=eq.X&tenant_id=eq.Y)
  → If1 (array notEmpty?)
    → TRUE (lead encontrado): Get a record1 (passthrough $json[0]) → Dados do Lead
    → FALSE (lead não existe): Create a record1 (Supabase UPSERT on_conflict=tenant_id,phone)
                               → Create a row (passthrough $json[0]) → Dados do Lead
  → Dados do Lead (campos Supabase: lead.name, lead.status, meta.*)
```

**Garantia de idempotência:** Segunda mensagem do mesmo número:
1. `Search records1` → retorna `[{id, phone, name, status, ...}]` (array com 1 item)
2. `If1` → TRUE (array não vazio)
3. `Get a record1` → retorna lead existente
4. **Nenhum lead novo criado** ✓

---

## Arquivos Gerados

- `luana-agent-workflow-audit.md` — este documento
- `luana-agent-workflow-fixed.json` — workflow corrigido para reimport no n8n
