---
phase: quick
plan: 260407-wba
subsystem: n8n-workflow
tags: [n8n, supabase, imoveis, jurema-brokers, patch, workflow, upsert, jetengine]
dependency_graph:
  requires: [260407-rnb]
  provides: [workflow-patch-ler-imoveis-jetengine]
  affects: [ler-imoveis-jetengine-workflow, tabela-imoveis-supabase]
tech_stack:
  added: []
  patterns: [json-patch-manual, n8n-supabase-node, upsert-conflict-columns]
key_files:
  created:
    - .planning/quick/260407-wba-migrar-workflow-ler-im-veis-jetengine-pa/workflow-patch-ler-imoveis-jetengine.json
decisions:
  - "Upsert usa chave composta tenant_id + id_imovel — garante idempotencia ao re-executar o workflow"
  - "tenant_id hardcoded no node Supabase como string literal — nao vem do JetEngine"
  - "Tabela alvo e 'imoveis' (nao 'properties') — confirmado pelos patches anteriores 260407-r8a e 260407-rnb"
  - "Nodes de leitura WordPress JetEngine e Set permanecem inalterados — patch afeta apenas o destino"
metrics:
  duration: 10min
  completed: "2026-04-08"
  tasks_completed: 2
  files_modified: 1
---

# Phase Quick Plan 260407-wba: Migrar Workflow Ler Imoveis JetEngine Summary

**One-liner:** Patch JSON completo para substituir node Airtable por Supabase upsert no workflow "Ler Imoveis JetEngine", gravando todos 18 campos na tabela `imoveis` com chave composta tenant_id + id_imovel para Jurema Brokers.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Inspecionar workflow e confirmar schema | — (sem commit — MCP n8n indisponivel, schema confirmado via patches anteriores) | — |
| 2 | Gerar patch JSON substituindo Airtable por Supabase com upsert | 30116a9 | workflow-patch-ler-imoveis-jetengine.json |

## What Was Built

Arquivo `.planning/quick/260407-wba-migrar-workflow-ler-im-veis-jetengine-pa/workflow-patch-ler-imoveis-jetengine.json` com patch completo e aplicavel no n8n.

**Conteudo do patch:**

- `NODE_SUPABASE_UPSERT`: configuracao completa do node Supabase
  - `operation: upsert`
  - `tableId: "imoveis"`
  - `conflictColumns: ["tenant_id", "id_imovel"]`
  - 18 campos mapeados com expressoes n8n
  - tenant_id hardcoded: `aaaaaaaa-0002-0002-0002-000000000002`

- `NODE_SET_MAPPING`: referencia do mapeamento esperado no Set node existente (17 campos do JetEngine)

- `WIRING`: instrucoes passo-a-passo para reconexao no n8n (remover Airtable, adicionar Supabase, conectar Set -> Supabase)

- `SCHEMA_REFERENCE`: lista dos 18 campos reais da tabela `imoveis` e aviso explcito sobre campos que NAO existem (title, photo_url, properties, etc.)

- `VERIFICATION`: queries SQL para confirmar que o workflow gravou corretamente

**Os 18 campos mapeados:**
tenant_id, id_imovel, titulo_comercial, titulo_seo, descricao_imovel, bairro, tipo_de_imovel, finalidade, valor, condominio, metragem, quartos, suites, vagas, foto_principal, link_do_imovel, link_redes_sociais, status_publicacao

## Deviations from Plan

### Auto-adjusted — MCP n8n indisponivel (esperado pelo plano)

O plano previa que MCP n8n poderia nao estar disponivel e incluia instrucoes alternativas.
Patch gerado com base no padrao conhecido dos workflows Jurema e nos schemas confirmados pelos patches 260407-r8a e 260407-rnb.
Nenhuma alteracao de escopo necessaria.

## Known Stubs

None — este e um arquivo de patch JSON para aplicacao manual no n8n, sem dados stub.

## Self-Check: PASSED

- [x] Arquivo JSON criado: `.planning/quick/260407-wba-migrar-workflow-ler-im-veis-jetengine-pa/workflow-patch-ler-imoveis-jetengine.json`
- [x] Commit 30116a9 existe
- [x] Verificacao automatica passou: `PASS` (upsert: true, table_imoveis: true, tenant: true, conflict_key: true)
- [x] operation = "upsert"
- [x] tableId = "imoveis"
- [x] conflictColumns = ["tenant_id", "id_imovel"]
- [x] tenant_id Jurema hardcoded: aaaaaaaa-0002-0002-0002-000000000002
- [x] 18 campos mapeados em NODE_SUPABASE_UPSERT.columns
- [x] Sem referencia a Airtable no destino
- [x] Instrucoes de leitura WP JetEngine marcadas como inalteradas
