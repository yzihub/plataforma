# Refactor Luana: Airtable → Supabase

**Data:** 2026-04-08  
**Escopo:** 4 workflows de ferramenta da Luana — substituição da camada de persistência

---

## Arquitetura Preservada

```
Webhook → Normalize → Get/Create Lead → Build Context → Agent (Luana) → Tool Updates
```

**Nenhuma lógica foi alterada.** Apenas os nodes de persistência foram substituídos.

---

## Mapeamento Airtable → Supabase

| Antes (Airtable)            | Depois (Supabase HTTP REST)              |
|-----------------------------|------------------------------------------|
| Airtable — Get Record       | HTTP GET /leads?tenant_id=eq.X&phone=eq.Y |
| Airtable — Create Record    | HTTP POST /leads (via UPSERT)            |
| Airtable — Update Record    | HTTP POST /leads?on_conflict (UPSERT) ou PATCH |
| Airtable — Search Records   | HTTP GET /imoveis (filtros via query params) |
| records[0].fields           | $json[0] (array direto do Supabase)      |

---

## Variáveis de Ambiente Necessárias (n8n Variables)

Configure em **Settings → Variables** no n8n:

| Variável             | Valor                                              |
|----------------------|----------------------------------------------------|
| `SUPABASE_URL`       | `https://dwmbklfkrtumfaxrbxio.supabase.co`        |
| `SUPABASE_ANON_KEY`  | `REDACTED_SUPABASE_SERVICE_KEY`                   |

---

## Workflows Gerados

### 1. `atualizar_qualificacao.json`

**Nodes:** Webhook → Normalize → Get Lead → Build Context → UPSERT Lead → Respond

**Estratégia de identidade:**
- `id = telefone_limpo` (telefone sem formatação)
- UPSERT com `on_conflict=tenant_id,id`
- Prefer: `resolution=merge-duplicates`

**Merge de metadata:**
```js
const antigo = existingLead?.metadata || {}
const novo = { objetivo, faixa_valor, bairro_interesse, ... }
metadata = { ...antigo, ...novo }  // nunca sobrescreve dados anteriores
```

---

### 2. `setar_lead_quente.json`

**Nodes:** Webhook → Normalize → Get Lead → Build Metadata → PATCH Lead → Respond

**Campos atualizados:**
- `status = "🔥 Lead Quente"`
- `score = "🔥 Quente"`
- `metadata.localizacao_visita` (merge com metadata existente)

**Filtro PATCH:** `?tenant_id=eq.X&phone=eq.Y`

---

### 3. `consultar_imoveis.json`

**Nodes:** Webhook → Buscar Imóveis → Respond

**Query fixa:**
- `tenant_id=eq.{tenant}`
- `status_publicacao=eq.Publicado`
- `select=` 14 campos (id_imovel, titulo_comercial, bairro, tipo_de_imovel, finalidade, valor, metragem, quartos, suites, vagas, link_redes_sociais, link_do_imovel, foto_principal, status_publicacao)

**Filtros dinâmicos opcionais:** adicionar query params condicionais para `bairro`, `tipo_de_imovel`, `finalidade` se Luana qualificou o lead.

---

### 4. `buscar_lancamentos.json`

**Nodes:** Webhook → Normalize Filters → Buscar Lançamentos → Filtrar por Tipologia → Respond

**Table:** `lancamentos`

**Query fixa:**
- `tenant_id=eq.{tenant}`
- `status_publicacao=eq.Publicado`

**Filtro tipologia:** Code node pós-query faz partial match case-insensitive em `tipologia`.

---

## Como Importar no n8n

1. Abrir n8n → **Workflows** → botão **⋯** → **Import from JSON**
2. Colar o conteúdo de cada `.json` (um por vez)
3. **CRÍTICO:** Remover o campo `_comment` antes de importar (n8n não aceita campos extras no root)
4. Salvar e ativar
5. Atualizar as URLs das ferramentas da Luana para apontar para os novos webhooks

---

## AVISO: Schema de `id` no leads

O campo `id` na tabela `leads` é `UUID` na migration 001. A estratégia do usuário de usar `id = telefone_limpo` requer **uma das opções abaixo**:

- **Opção A (recomendado):** Usar `phone` como chave de conflito: `on_conflict=tenant_id,phone` e garantir `UNIQUE(tenant_id, phone)` na tabela.
- **Opção B:** Criar uma coluna `id TEXT` ou mudar o tipo de `id` para `TEXT` na tabela `leads`.
- **Opção C:** Usar PATCH com `?phone=eq.X` (já implementado em `setar_lead_quente`).

Para `atualizar_qualificacao`, se `id` for UUID, substituir `on_conflict=tenant_id,id` por `on_conflict=tenant_id,phone` no URL do UPSERT Lead.

---

## Verificação Pós-Deploy

```sql
-- Checar leads criados/atualizados pela Luana
SELECT id, phone, name, status, score, metadata, updated_at
FROM leads
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
ORDER BY updated_at DESC
LIMIT 10;

-- Checar imóveis disponíveis
SELECT id_imovel, titulo_comercial, bairro, status_publicacao
FROM imoveis
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND status_publicacao = 'Publicado'
LIMIT 5;

-- Checar lançamentos disponíveis
SELECT nome_empreendimento, bairro, tipologia, status_publicacao
FROM lancamentos
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND status_publicacao = 'Publicado'
LIMIT 5;
```
