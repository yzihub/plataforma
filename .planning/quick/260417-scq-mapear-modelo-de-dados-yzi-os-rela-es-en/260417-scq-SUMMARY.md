---
phase: quick-260417-scq
plan: 01
subsystem: database
tags: [migration, schema, relations, multi-tenant, rls, supabase]
dependency_graph:
  requires: [014_brokers_table, 011_contracts_table, 008_properties_table, 001_initial_schema]
  provides: [visitas, comissoes, financeiro, leads.broker_id, leads.imovel_id, contracts.corretor_id->brokers]
  affects: [leads, contracts, brokers, properties]
tech_stack:
  added: [visitas table, comissoes table, financeiro table]
  patterns: [composite-index-tenant-first, rls-select-all-split, on-delete-restrict-for-history]
key_files:
  created:
    - supabase/migrations/016_data_model_relations.sql
    - .planning/quick/260417-scq-mapear-modelo-de-dados-yzi-os-rela-es-en/DATA_MODEL.md
  modified: []
decisions:
  - "assigned_to mantido como legado em leads (PipelineDashboardClient.tsx usa); broker_id e o campo canonico"
  - "contracts.corretor_id migrado de profiles para brokers — corretores nao precisam de conta de login"
  - "comissoes.broker_id ON DELETE RESTRICT — preservar historico financeiro mesmo se corretor for removido"
  - "financeiro generico com tipo+categoria — permite entradas e saidas sem contraparte especifica"
  - "indices compostos sempre iniciam com tenant_id — alinhado ao predicado de RLS"
metrics:
  duration: 7 minutes
  completed_date: "2026-04-17"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Quick 260417-scq: Modelo de Dados YZI OS — Relacoes Completas

**One-liner:** Migration idempotente 016 que conecta 7 entidades do dominio imobiliario com Foreign Keys, 14 indices compostos iniciando com tenant_id e RLS multi-tenant em visitas, comissoes e financeiro.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar migration 016_data_model_relations.sql | 18cc981 | supabase/migrations/016_data_model_relations.sql |
| 2 | Documentar modelo em DATA_MODEL.md | 9774dc0 | .planning/quick/.../DATA_MODEL.md |

---

## What Was Built

### Migration 016 (idempotente)

**PARTE 1 — leads estendido:**
- `broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL` — corretor responsavel pelo lead
- `imovel_id UUID REFERENCES properties(id) ON DELETE SET NULL` — imovel de interesse principal
- Indices: `idx_leads_broker_id (tenant_id, broker_id)`, `idx_leads_imovel_id (tenant_id, imovel_id)`
- `assigned_to` mantido como legado (sem alteracao)

**PARTE 2 — contracts.corretor_id corrigido:**
- DO block remove FK existente (para profiles) de forma dinamica
- UPDATE seta NULL em corretor_ids orfaos que nao existem em brokers
- Recria FK `contracts_corretor_id_fkey` apontando para `brokers(id)`

**PARTE 3 — tabela `visitas`:**
- 3 FKs obrigatorias: lead_id, imovel_id (CASCADE), broker_id (SET NULL)
- status CHECK: scheduled, completed, cancelled, no_show
- 5 indices compostos com tenant_id

**PARTE 4 — tabela `comissoes`:**
- contract_id (CASCADE) + broker_id (RESTRICT) — historico preservado
- percentual NUMERIC(5,2) + valor NUMERIC(14,2) com CHECK >= 0
- status CHECK: pending, approved, paid, cancelled
- 4 indices compostos

**PARTE 5 — tabela `financeiro`:**
- comissao_id e contract_id opcionais (SET NULL)
- tipo CHECK: entrada/saida + categoria TEXT livre
- data_evento DATE + status CHECK: previsto/confirmado/cancelado
- 3 indices compostos

**PARTE 6-7 — Triggers + RLS:**
- `CREATE OR REPLACE TRIGGER` updated_at nas 3 tabelas
- RLS ativado com policies select + all em visitas, comissoes, financeiro
- Padrao: `is_global_admin() OR tenant_id = auth_tenant_id()`

### DATA_MODEL.md (189 linhas)
- ERD mermaid com 7 entidades + tenants e todas relacoes
- Detalhamento de FKs, indices e delete behavior por tabela
- 11 query patterns com indice responsavel mapeado
- 7 decisoes de modelagem justificadas
- Backlog de proximos passos
- Instrucoes de aplicacao

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None — este plano nao envolve componentes de UI. Migration e documentacao sem stubs.

---

## Self-Check: PASSED

- [x] `supabase/migrations/016_data_model_relations.sql` existe
- [x] `DATA_MODEL.md` existe com 189 linhas (min 80)
- [x] Commit 18cc981 existe (migration)
- [x] Commit 9774dc0 existe (DATA_MODEL)
- [x] 14 indices criados (verificado via node)
- [x] All required keywords present in migration
- [x] All required sections present in DATA_MODEL
