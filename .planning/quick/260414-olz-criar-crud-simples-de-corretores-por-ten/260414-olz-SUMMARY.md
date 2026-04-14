---
phase: quick-260414-olz
plan: 01
subsystem: brokers
tags: [supabase, rls, api-route, crud, brokers, multi-tenant]
dependency_graph:
  requires: [supabase/migrations/014_brokers_table.sql]
  provides: [GET /api/brokers, RLS policies on brokers table]
  affects: [src/components/yzihub/CorretoresClient.tsx, src/app/cockpit/corretores/page.tsx]
tech_stack:
  added: []
  patterns: [server-side supabase client, tenant isolation via RLS, Next.js route handler]
key_files:
  created:
    - src/app/api/brokers/route.ts
  modified:
    - supabase/migrations/014_brokers_table.sql
decisions:
  - brokers API returns plain JSON array (not N8nEnvelope) — internal module, not n8n integration
metrics:
  duration: "~8 minutes"
  completed: "2026-04-14"
  tasks: 2
  files: 2
---

# Phase quick-260414-olz Plan 01: Brokers CRUD — Migration RLS + API Route Summary

**One-liner:** RLS policies added to brokers migration (3 tenant-isolated policies) and GET /api/brokers created returning plain JSON array filtered by authenticated user's tenant_id.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Aplicar migration brokers + adicionar RLS | 9eed31d | supabase/migrations/014_brokers_table.sql |
| 2 | Criar GET /api/brokers | 99391b9 | src/app/api/brokers/route.ts |

## What Was Built

### Task 1 — Migration RLS (supabase/migrations/014_brokers_table.sql)

The existing migration file already had the `CREATE TABLE brokers` and `CREATE INDEX` statements. The following was appended:

- `ALTER TABLE brokers ENABLE ROW LEVEL SECURITY`
- Policy `tenant_brokers_select` — SELECT allowed only when `tenant_id` matches authenticated user's profile
- Policy `tenant_brokers_insert` — INSERT allowed only when `tenant_id` matches authenticated user's profile
- Policy `tenant_brokers_update` — UPDATE allowed only when `tenant_id` matches authenticated user's profile

**Important:** Supabase CLI (`supabase db push`) is not installed locally. The SQL must be applied manually in Supabase Studio > SQL Editor. The full SQL file at `supabase/migrations/014_brokers_table.sql` is ready to be pasted and executed.

### Task 2 — GET /api/brokers (src/app/api/brokers/route.ts)

Follows the same pattern as `GET /api/imoveis/route.ts` but:
- Returns a plain JSON array (no N8nEnvelope wrapper) — brokers is an internal module
- Fields: `id, tenant_id, full_name, phone, email, role, created_at, updated_at`
- Ordered by `created_at DESC`
- 401 on unauthenticated or missing profile, 500 on query failure

## Verification

- `rtk tsc --noEmit` — zero errors
- Migration SQL is ready for Supabase Studio manual execution
- After applying migration: `SELECT COUNT(*) FROM brokers;` should return 0 without error
- After applying migration: `SELECT policyname FROM pg_policies WHERE tablename = 'brokers';` should return 3 policies

## Deviations from Plan

### Manual DB Step Required

**Found during:** Task 1
**Issue:** Supabase CLI (`supabase db push`) not installed locally — `supabase: command not found`
**Action taken:** SQL with RLS policies added to migration file as instructed. Must be run manually in Supabase Studio.
**Files modified:** supabase/migrations/014_brokers_table.sql
**Commit:** 9eed31d

No other deviations — plan executed as written.

## Known Stubs

None — `GET /api/brokers` is fully wired to Supabase. The frontend (`CorretoresClient.tsx`) reads directly via Supabase client SDK and is pre-existing.

## Manual Step Required

To complete activation of the brokers table:

1. Go to https://app.supabase.com — project YZIHUB
2. Open SQL Editor
3. Paste and run the full contents of `supabase/migrations/014_brokers_table.sql`
4. Verify: `SELECT COUNT(*) FROM brokers;` returns 0
5. Verify: `SELECT policyname FROM pg_policies WHERE tablename = 'brokers';` returns 3 rows

## Self-Check: PASSED

- `D:/dev/plataforma/src/app/api/brokers/route.ts` — created and committed (99391b9)
- `D:/dev/plataforma/supabase/migrations/014_brokers_table.sql` — modified and committed (9eed31d)
- TypeScript: zero errors
