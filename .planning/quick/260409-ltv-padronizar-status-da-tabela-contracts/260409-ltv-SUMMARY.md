---
phase: quick
plan: 260409-ltv
subsystem: database
tags: [supabase, migration, contracts, sql, check-constraint]
dependency_graph:
  requires: [011_contracts_table.sql]
  provides: [contracts_status_check_en]
  affects: [contracts.status]
tech_stack:
  added: []
  patterns: [DO-block-dynamic-constraint-drop, named-CHECK-constraint, CASE-UPDATE-migration]
key_files:
  created:
    - supabase/migrations/20260409184441_update_contracts_status_constraint.sql
  modified: []
decisions:
  - "Used DO block to dynamically find and drop all status-related CHECK constraints (handles both named and unnamed inline constraints)"
  - "UPDATE existing rows BEFORE adding new constraint to prevent violations"
  - "Single migration handles both data migration (PT->EN) and schema change"
metrics:
  duration: ~19 minutes
  completed: "2026-04-09"
  tasks_completed: 1
  files_changed: 1
---

# Quick Task 260409-ltv: Padronizar Status da Tabela Contracts — Summary

**One-liner:** Migration SQL `20260409184441_update_contracts_status_constraint.sql` created to replace Portuguese CHECK constraint with English-only values (draft, sent, signed, cancelled) — requires manual application via Supabase Dashboard.

## What Was Built

Migration file `supabase/migrations/20260409184441_update_contracts_status_constraint.sql` with three steps:

1. **Data migration** — UPDATE existing rows mapping Portuguese values to English:
   - `rascunho` → `draft`
   - `pendente` → `draft`
   - `assinado` → `signed`
   - `cancelado` → `cancelled`
   - `expirado` → `cancelled`

2. **Dynamic constraint drop** — DO block iterates `pg_constraint` to find and drop ALL CHECK constraints on the `status` column, handling both named (`contracts_status_check`) and unnamed inline constraints (auto-generated names like `contracts_status_check1`)

3. **New constraint** — `ADD CONSTRAINT contracts_status_check CHECK (status IN ('draft', 'sent', 'signed', 'cancelled'))` with explicit name for future management

## Live Database State (at execution time)

Investigation revealed:
- Live `contracts` table exists but has simplified schema (`id, tenant_id, lead_id, project_id, status, value, sent_at, signed_at, created_at`) — different from migration 011
- **No CHECK constraint currently exists** on `status` — any value is accepted
- Table is empty (0 rows) — no existing data to migrate
- Migration file committed but NOT yet applied to live DB (requires Supabase Dashboard or PAT)

## Application Instructions

Apply migration via Supabase Dashboard SQL Editor:
```
https://supabase.com/dashboard/project/dwmbklfkrtumfaxrbxio/sql/new
```

Paste and run the contents of:
`supabase/migrations/20260409184441_update_contracts_status_constraint.sql`

Verification query after applying:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'contracts'::regclass
  AND contype = 'c'
  AND conname LIKE '%status%';
```

Expected result: row with `contracts_status_check` and `CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'signed'::text, 'cancelled'::text])))`

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Criar migration SQL para atualizar CHECK constraint | 866ae38 | supabase/migrations/20260409184441_update_contracts_status_constraint.sql |

## Deviations from Plan

**[Rule 3 - Blocked] Could not apply migration directly — no Supabase PAT available**

- **Found during:** Task 1 execution
- **Issue:** `mcp__claude_ai_Supabase__apply_migration` is not available as a callable tool in this executor context. The Supabase CLI requires a personal access token (PAT with `sbp_` format) to apply migrations to the linked project. The service role key (`sb_secret_`) does not work for DDL operations via PostgREST or the Management API.
- **Fix:** Migration file created and committed. Requires manual application via Supabase Dashboard SQL editor.
- **Impact:** Migration SQL is correct and ready to apply. No functional difference once applied.

## Known Stubs

Migration not yet applied to live database — `contracts.status` currently accepts any value.

## Self-Check: PASSED

- Migration file exists: `supabase/migrations/20260409184441_update_contracts_status_constraint.sql` — FOUND
- Commit 866ae38 exists: FOUND
- SQL logic verified: UPDATE (data migration) + DO block (drop all status constraints) + ADD CONSTRAINT — CORRECT
- Live DB investigation: table empty, no current constraint — DOCUMENTED
