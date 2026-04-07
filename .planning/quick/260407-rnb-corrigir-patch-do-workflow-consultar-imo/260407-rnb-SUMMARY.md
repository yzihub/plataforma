---
phase: quick
plan: 260407-rnb
subsystem: n8n-workflow
tags: [n8n, supabase, imoveis, jurema-brokers, patch, workflow]
dependency_graph:
  requires: [260407-r8a]
  provides: [workflow-patch-imoveis-correto]
  affects: [consultar_imoveis-workflow]
tech_stack:
  added: []
  patterns: [json-patch-manual, n8n-supabase-node]
key_files:
  modified:
    - .planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/workflow-patch-consultar-imoveis.json
decisions:
  - "Tabela real e 'imoveis' — tabela 'properties' nunca foi populada, era artefato de migrations 008/009"
  - "Mapeamento NODE_SET e 1:1 pois campos da tabela ja tem nomes corretos para o agente WhatsApp"
  - "Filtro usa 'status_publicacao' (snake_case real da tabela), nao 'publication_status'"
metrics:
  duration: 5min
  completed: "2026-04-07"
  tasks_completed: 1
  files_modified: 1
---

# Phase Quick Plan 260407-rnb: Corrigir Patch Workflow consultar_imoveis Summary

**One-liner:** Patch JSON do workflow n8n corrigido para usar tabela `imoveis` com mapeamento 1:1 dos 10 campos reais (quartos, suites, vagas, etc.) e filtros tenant_id + status_publicacao corretos.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Reescrever patch JSON com tabela imoveis e campos corretos | bbcf1e9 | workflow-patch-consultar-imoveis.json |

## What Was Built

O arquivo `.planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/workflow-patch-consultar-imoveis.json` foi sobrescrito com o patch correto para o workflow `consultar_imoveis` no n8n.

**Problema do patch anterior (260407-r8a):**
- Usava tabela `properties` (artefato de migrations 008/009, nunca populada)
- Campos como `title`, `photo_url`, `price`, `area_sqm`, `neighborhood`, `property_type`, `publication_status`, `tags`, `purpose` nao existem na tabela real
- Campos `quartos`, `suites`, `vagas` eram mapeados como string vazia

**Patch corrigido (260407-rnb):**
- `tableId: "imoveis"` — tabela real no Supabase com dados de Jurema Brokers
- `selectColumns`: id_imovel, bairro, tipo_de_imovel, valor, quartos, suites, vagas, metragem, link_redes_sociais, foto_principal (10 campos reais)
- Filtros: `tenant_id = {{ $json.tenant_id }}` + `status_publicacao = 'published'`
- NODE_SET: mapeamento 1:1, sem renomeacao, todos os 10 campos com valores corretos

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — este e um arquivo de patch JSON para aplicacao manual no n8n, sem dados stub.

## Self-Check: PASSED

- [x] Arquivo JSON modificado existe: `.planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/workflow-patch-consultar-imoveis.json`
- [x] Commit bbcf1e9 existe
- [x] Verificacao automatica passou: `PASS: tabela imoveis, campos corretos, sem referencia a properties`
- [x] tableId = "imoveis"
- [x] quartos mapeado com valor real `{{ $json.quartos }}`
- [x] Zero referencias a campos da tabela errada
