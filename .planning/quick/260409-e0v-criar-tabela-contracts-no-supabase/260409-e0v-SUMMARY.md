---
phase: quick
plan: 260409-e0v
subsystem: database
tags: [supabase, migration, contracts, sql]
dependency_graph:
  requires: [011_contracts_table.sql, 008_properties_table.sql]
  provides: [contracts.imovel_id, contracts.conteudo, idx_contracts_tenant_lead]
  affects: [contracts table]
tech_stack:
  added: []
  patterns: [ALTER TABLE ADD COLUMN IF NOT EXISTS, FK ON DELETE SET NULL, composite index]
key_files:
  created:
    - supabase/migrations/013_contracts_add_imovel_conteudo.sql
  modified: []
decisions:
  - "Used IF NOT EXISTS guards on ALTER and CREATE INDEX for safe re-runs"
  - "ON DELETE SET NULL for imovel_id preserves contract record when property is deleted"
metrics:
  duration: "5 minutes"
  completed: "2026-04-09"
  tasks_completed: 1
  files_changed: 1
---

# Phase quick Plan 260409-e0v: Estender contracts com imovel_id e conteudo Summary

**One-liner:** ALTER TABLE migration adding imovel_id (FK properties), conteudo (text), and composite index (tenant_id, lead_id) to existing contracts table.

## What Was Built

Migration `013_contracts_add_imovel_conteudo.sql` extends the existing `contracts` table (created in migration 011) with:

1. `imovel_id UUID` — foreign key to `properties(id)` with `ON DELETE SET NULL`, allowing explicit property reference separate from `project_id`
2. `conteudo TEXT` — free-text field for contract body/template content
3. `CREATE INDEX idx_contracts_tenant_lead ON contracts(tenant_id, lead_id)` — composite index for the most common query pattern

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Criar migration 013 para estender contracts | 74f8b6e | supabase/migrations/013_contracts_add_imovel_conteudo.sql |

## Verification Results

- `imovel_id UUID REFERENCES properties(id) ON DELETE SET NULL` — PASS
- `conteudo TEXT` column — PASS
- `idx_contracts_tenant_lead ON contracts(tenant_id, lead_id)` — PASS
- No CREATE TABLE present — PASS
- No other tables altered — PASS
- 3 DDL statements total (2 ALTER TABLE + 1 CREATE INDEX) — PASS

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
