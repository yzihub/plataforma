---
phase: quick
plan: 260404-j5l
subsystem: imoveis
tags: [properties, wordpress-sync, kanban, supabase, tenant-context]
dependency_graph:
  requires: [supabase/migrations/008_properties_table.sql, supabase/migrations/009_properties_extend.sql]
  provides: [supabase/migrations/010_properties_wordpress_sync.sql, src/types/properties.ts, PropertyKanban]
  affects: [src/app/cockpit/imoveis/page.tsx, src/components/yzihub/ImoveisClient.tsx, src/components/yzihub/PropertyCard.tsx]
tech_stack:
  added: [upsert_property_from_external (SQL function)]
  patterns: [TenantContext client-side fetch, centralized types, kanban grouped by neighborhood]
key_files:
  created:
    - supabase/migrations/010_properties_wordpress_sync.sql
    - src/types/properties.ts
    - src/components/yzihub/PropertyKanban.tsx
  modified:
    - src/app/cockpit/imoveis/page.tsx
    - src/components/yzihub/ImoveisClient.tsx
    - src/components/yzihub/PropertyCard.tsx
    - src/components/yzihub/PropertyDrawer.tsx
decisions:
  - Property type centralized in src/types/properties.ts — PropertyCard.tsx re-exports for backward compat
  - ImoveisClient fetches its own data via TenantContext (client component) — page becomes thin wrapper
  - Kanban columns are always rendered (including empty ones) for all 5 stages to maintain predictable layout
  - PropertyKanban uses inline KanbanCard (not PropertyCard) for simpler kanban-optimized layout
metrics:
  duration: "~20 minutes"
  completed_date: "2026-04-04"
  tasks: 3
  files: 7
---

# Quick Task 260404-j5l: Sistema de Imóveis Integrado ao WordPress — Summary

**One-liner:** WordPress-ready properties table extension with SQL upsert function, centralized Property type, and Grid/Kanban toggle view grouped by neighborhood via TenantContext real data fetch.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Migration 010 + Property Types for WordPress Integration | 56c30c9 | Done |
| 2 | Refactor Imoveis Page + ImoveisClient (real data + TenantContext) | fd51263 | Done |
| 3 | Kanban View by Neighborhood + Grid/Kanban Toggle | fd51263 | Done |

## What Was Built

### Migration 010 (supabase/migrations/010_properties_wordpress_sync.sql)
- Added 8 new columns: `external_id`, `source`, `description`, `images` (JSONB), `features` (JSONB), `score`, `priority` (enum), `kanban_stage`
- Unique index `idx_properties_external_source` on `(external_id, source) WHERE external_id IS NOT NULL` — prevents duplicate ingestion
- `upsert_property_from_external()` function: idempotent INSERT ... ON CONFLICT DO UPDATE for WordPress/external data ingestion
- RLS unchanged (already enabled from migration 008)

### Centralized Property Types (src/types/properties.ts)
- `Property` interface extended with all new WordPress fields
- `KANBAN_NEIGHBORHOODS` constant: `['Cabo Branco', 'Manaira', 'Bessa', 'Altiplano']`
- `PropertyKanbanStage` type for type-safe column names
- `PropertyCard.tsx` updated to re-export `Property` for backward compat
- `PropertyDrawer.tsx` updated to import from centralized types

### Real Data Fetch (ImoveisClient.tsx)
- Zero mock data — fetches `supabase.from("properties").select("*").eq("tenant_id", tenant.id).order(...)` 
- Uses `useTenant()` from TenantContext for tenant_id filtering
- Loading skeleton while fetching, empty state when no results
- All existing filters (tipo, bairro, publicação) preserved

### PropertyKanban (src/components/yzihub/PropertyKanban.tsx)
- 5 columns: Cabo Branco, Manaira, Bessa, Altiplano + "Outros" (for unmatched/null neighborhoods)
- Each card: 80px thumbnail, truncated title, BRL-formatted price, type badge, status dot+label
- TailAdmin dark styling throughout
- Horizontal scroll on mobile with `min-w-[280px]` per column
- Read-only (no drag-and-drop per plan spec)

### Grid/Kanban Toggle (ImoveisClient.tsx)
- Toggle buttons in filter bar (right side)
- Active view gets `bg-brand-500 text-white`, inactive gets gray
- Both views receive the same filtered dataset

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Pre-existing Issue (Out of Scope)

**`src/scripts/validate-auth-system.ts` TypeScript errors** — these errors existed before this plan (created in quick task 260404-dyt). The `npm run build` fails on these pre-existing errors. The imoveis module itself compiles with zero errors. Filed in deferred items below.

## Known Stubs

None. The imoveis page fetches live data from Supabase — zero mock data, zero hardcoded placeholders.

## Deferred Items

| Item | File | Reason |
|------|------|--------|
| Pre-existing TS errors in validate-auth-system.ts | src/scripts/validate-auth-system.ts | Script from quick task 260404-dyt has type errors; not blocking imoveis module; out of scope for this plan |

## Self-Check
