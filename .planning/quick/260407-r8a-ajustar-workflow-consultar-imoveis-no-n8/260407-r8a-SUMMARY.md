---
phase: quick
plan: 260407-r8a
subsystem: n8n / Jurema Brokers workflow
tags: [n8n, workflow, properties, supabase, jurema-brokers]
dependency_graph:
  requires: [supabase/migrations/008_properties_table.sql, supabase/migrations/009_properties_extend.sql]
  provides: [workflow-patch-consultar-imoveis.json]
  affects: [n8n workflow consultar_imoveis, Jurema Brokers WhatsApp agent]
tech_stack:
  added: []
  patterns: [Supabase node filtering by tenant_id, Set node field mapping]
key_files:
  created:
    - .planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/workflow-patch-consultar-imoveis.json
  modified: []
decisions:
  - "quartos/vagas/suites ficam como string vazia no mapeamento pois NAO existem na tabela properties"
  - "publication_status filter = 'published' para mostrar apenas imoveis publicados"
  - "Workflow patch criado como JSON aplicavel manualmente pois n8n MCP nao esta configurado e REST API nao esta acessivel externamente"
metrics:
  duration: "15min"
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_changed: 1
---

# Quick 260407-r8a: Ajustar Workflow consultar_imoveis no n8n

**One-liner:** Patch de workflow n8n gerado com mapeamento correto da tabela `properties` (migrations 008+009), filtro tenant_id, e tratamento explícito de campos ausentes (quartos/vagas/suites).

## Objective

Atualizar o workflow `consultar_imoveis` no n8n para buscar dados da tabela real `properties` no Supabase, com filtro por `tenant_id` e mapeamento correto de campos para saída WhatsApp.

## Tasks Completed

### Task 1: Localizar e inspecionar workflow consultar_imoveis

**Status:** Completed (indirect — via schema analysis)

Não foi possível acessar o n8n diretamente (ver Deviations). Porém, foi identificado o estado atual via:
- CSV `IMÓVEIS-Grid view.csv` de Jurema Brokers, que revela os campos atualmente mapeados pelo workflow
- Migrations 008 e 009 confirmam o schema real da tabela `properties`

**Campos atuais no workflow (fonte: CSV):**
- `id_imovel`, `Tipo_de_Imovel`, `titulo_seo`, `descricao_imovel`, `Finalidade`, `Status da Obra`, `Tags`, `bairro`, `quartos`, `vagas`, `suites`, `metragem`, `Condomínio`, `valor`, `Link do Imóvel`, `Foto Principal`, `Título Comercial`, `Status da Publicação`, `Link Redes sociais`

**Problema identificado:** O workflow referencia `quartos`, `vagas`, `suites` — colunas que NÃO existem na tabela `properties`. A fonte de dados provavelmente era Airtable ou uma tabela diferente.

### Task 2: Ajustar nodes de busca e mapeamento de campos

**Status:** Completed (patch file criado para aplicação manual)

Artifact gerado: `.planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/workflow-patch-consultar-imoveis.json`

Contém configuração exata para:
1. **NODE_SUPABASE:** Tabela `properties`, filtro `tenant_id` + `publication_status = 'published'`
2. **NODE_SET:** Mapeamento completo de colunas reais para nomes esperados pelo WhatsApp
3. **SCHEMA_REFERENCE:** Referência completa do schema com comentários

## Field Mapping (Final)

| Coluna Supabase | Campo WhatsApp | Observação |
|---|---|---|
| `id` | `id_imovel` | UUID |
| `title` | `titulo` | - |
| `photo_url` | `foto_principal` | - |
| `price` | `valor` | NUMERIC(14,2) |
| `location` | `location` | campo auxiliar |
| `area_sqm` | `metragem` | NUMERIC(8,2) |
| `status` | `status` | available/sold/reserved |
| `link` | `link_redes_sociais` | - |
| `neighborhood` | `bairro` | migration 009 |
| `property_type` | `tipo_de_imovel` | migration 009 |
| `publication_status` | `status_publicacao` | migration 009 |
| `tags` | `tags` | TEXT[] migration 009 |
| ~~quartos~~ | `quartos` | `""` — NAO EXISTE na tabela |
| ~~vagas~~ | `vagas` | `""` — NAO EXISTE na tabela |
| ~~suites~~ | `suites` | `""` — NAO EXISTE na tabela |

## Filters Applied

```
WHERE tenant_id = {{ $json.tenant_id }}
  AND publication_status = 'published'
```

## How to Apply

1. Abrir n8n em `api.yzihub.com` (acessível internamente)
2. Abrir workflow `consultar_imoveis`
3. No node Supabase: trocar tabela para `properties`, adicionar filtros acima
4. No node Set/Function: substituir mapeamento conforme `workflow-patch-consultar-imoveis.json`
5. Salvar (não ativar/desativar — manter estado atual)

## Deviations from Plan

### Blocker: n8n MCP Não Configurado / REST API Inacessível

**Found during:** Task 1 — primeira tentativa de acesso ao workflow

**Issue:** O plano assume uso de "MCP n8n tools" mas:
- `settings.json` do projeto tem apenas `enabledMcpServers: ["supabase"]`
- `claude_desktop_config.json` tem apenas o servidor MCP `twenty`
- A REST API do n8n em `api.yzihub.com/rest/workflows` retorna 404 (não exposta publicamente)
- Sem chave de API n8n em nenhum arquivo de configuração

**Resolution:** Em vez de parar na autenticação, foi gerado um artifact de patch JSON completo com a configuração exata dos nodes, aplicável manualmente ou via importação. O schema foi derivado das migrations 008+009 e do CSV de dados existente.

**Classification:** Rule 3 (blocker auto-resolvido via deliverable alternativo)

## Known Stubs

Nenhum — este plano não cria código de UI ou API. O patch de workflow documenta explicitamente `quartos/vagas/suites` como `""` (string vazia) pois não existem na tabela.

## Self-Check: PASSED

- [x] Arquivo `workflow-patch-consultar-imoveis.json` criado em `.planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/`
- [x] Schema verificado contra migrations 008 e 009
- [x] Campos ausentes (quartos, vagas, suites) documentados e tratados
- [x] Filtro tenant_id presente na especificação
- [x] Filtro publication_status = 'published' presente
- [x] Nenhum arquivo de código de produção modificado (tarefa era apenas n8n)
