---
phase: quick
plan: 260407-ejm
subsystem: imoveis-module
tags: [property-table, datatable, imoveis, tailadmin, filter]
tech-stack:
  added: []
  patterns:
    - TailAdmin Table components for property DataTable
    - Inline SVG icons for view toggle (TableIcon pattern)
    - useMemo price filter with numeric comparison
key-files:
  created:
    - src/components/yzihub/PropertyTable.tsx
  modified:
    - src/components/yzihub/ImoveisClient.tsx
decisions:
  - Tabela set as default view (was grid) to match Lei da Variedade Visual canonical pattern for listings
  - Price filter uses string select with numeric conversion (Number(filterMaxPrice)) to avoid float state issues
  - PropertyTable is purely presentational — no local state, no fetch, receives filtered data from ImoveisClient
metrics:
  duration: ~12min
  completed: 2026-04-07
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase quick Plan 260407-ejm: Imoveis Module Table View Summary

**One-liner:** DataTable view for Imoveis module using TailAdmin Table components with status badges (Disponivel/Reservado/Vendido) and price filter — Tabela set as default view.

## What Was Built

Added the missing DataTable view to the existing Imoveis module (which already had Grid and Kanban views with live Supabase data).

### Task 1 — PropertyTable.tsx (created)

New purely presentational component following `LeadsDataTable.tsx` patterns:

- 5 columns: Imovel (48x48 thumbnail or house icon fallback + title + location), Bairro (neighborhood ?? location fallback), Tipo (property_type ?? "—"), Preco (pt-BR currency, no decimals), Status (Badge)
- Status badge mapping: available→success "Disponivel", reserved→warning "Reservado", sold→dark "Vendido"
- Empty state with centered SVG house icon + "Nenhum imovel encontrado"
- Clickable rows call `onSelect?.(property)` prop
- Zero mock data — purely driven by `properties` prop

### Task 2 — ImoveisClient.tsx (updated)

- Imported `PropertyTable` and added `TableIcon` SVG inline
- Changed default view state from `"grid"` to `"table"`
- Added `filterMaxPrice` state with select: Qualquer Preco / Ate R$ 500 mil / Ate R$ 1 milhao / Ate R$ 2 milhoes
- Updated `filtered` useMemo to include price ceiling: `p.price > Number(filterMaxPrice)` guard
- Added "Tabela" toggle button as first button in the view toggle group (before Grade)
- Added `{view === "table" && <PropertyTable ... />}` render block
- All existing Grid, Kanban, PropertyDrawer, fetch logic, and filters preserved unchanged

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 6fc0c9b | feat(quick-260407-ejm): create PropertyTable DataTable component with status badges |
| Task 2 | c1481ef | feat(quick-260407-ejm): update ImoveisClient with table view, price filter, 3-view toggle |

## Verification

- `npx tsc --noEmit` — zero errors in PropertyTable.tsx and ImoveisClient.tsx
- Pre-existing TypeScript error in `src/scripts/validate-auth-system.ts` (unrelated, existed before this task)
- Build fails on same pre-existing error in validate-auth-system.ts — not caused by this plan

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows from real Supabase fetch in ImoveisClient (filtered by tenant_id). PropertyTable is purely presentational and receives live data.

## Self-Check: PASSED

- src/components/yzihub/PropertyTable.tsx: FOUND
- src/components/yzihub/ImoveisClient.tsx: FOUND (modified)
- Commit 6fc0c9b: FOUND
- Commit c1481ef: FOUND
