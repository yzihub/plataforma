---
phase: quick
plan: 260402-mwy
subsystem: cockpit-ui
tags: [sidebar, kanban, financeiro, ux, navigation]
dependency_graph:
  requires: []
  provides: [sidebar-submenus, leads-kanban-view, financeiro-comissoes-tab]
  affects: [AppSidebar, LeadsClient, FinanceiroClient]
tech_stack:
  added: []
  patterns: [collapsible-nav, kanban-columns, svg-donut-chart, tab-navigation, useSearchParams]
key_files:
  created:
    - src/components/yzihub/LeadsKanban.tsx
  modified:
    - src/layout/AppSidebar.tsx
    - src/components/yzihub/LeadsClient.tsx
    - src/components/yzihub/FinanceiroClient.tsx
    - src/app/cockpit/leads/page.tsx
    - src/app/cockpit/financeiro/page.tsx
decisions:
  - "Used CSS max-height transition for submenu animation instead of framer-motion (simpler, no extra dependency)"
  - "Implemented quick-action Move dropdown instead of cross-column drag-and-drop (plan guidance: prioritize working UI)"
  - "SVG donut built with pure stroke-dasharray/dashoffset math — no chart library needed"
metrics:
  duration_minutes: 35
  completed_date: "2026-04-02"
  tasks_completed: 2
  files_changed: 6
---

# Quick 260402-mwy: Submenus, Leads Kanban, Financeiro Comissoes Summary

**One-liner:** Collapsible sidebar submenus with animated chevrons, Jurema Kanban board with Score/VGV/Corretor rich cards, and SVG donut chart for bairro market share in Financeiro.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Collapsible Sidebar Submenus + Leads Kanban View | 34aac6d | AppSidebar.tsx, LeadsKanban.tsx, LeadsClient.tsx, leads/page.tsx |
| 2 | Financeiro Comissoes Tab with Donut Chart | 4b1460d | FinanceiroClient.tsx, financeiro/page.tsx |

## What Was Built

### Task 1: Sidebar Submenus + Kanban View

**AppSidebar:**
- Extended `NavItem` type with `children?: NavChild[]` and `submenuKey?: string`
- New submenu groups: Leads (Lista/Kanban), Imoveis (Catalogo), Financeiro (Comissoes/Geral), under sections CRM and Gestao
- `openSubmenus` state with auto-open based on current pathname
- `ChevronDownIcon` rotates 180deg on expand (CSS `transition-transform duration-200`)
- Active parent icon uses `text-brand-500` color when any child is active
- CSS `max-height` transition (`0` to `N * 40px`) for smooth expand/collapse
- Submenus only expand when `showLabel` is true (sidebar visible)

**LeadsKanban (new component):**
- 4 Jurema pipeline stages: Novo, Qualificado, Visita, Contrato
- Rich cards with: lead name, source badge, Score Luana (colored dot indicator: green >=70, amber >=40, red <40), VGV in BRL, Corretor
- Move dropdown: quick-action button per card to move to another stage
- Local state for board (no server call on move — optimistic UI)
- Horizontally scrollable board with vertical scroll per column

**LeadsClient:**
- `view` state ("table" | "kanban") with `useSearchParams` for `?view=kanban`
- Toggle buttons (TableViewIcon / KanbanViewIcon) with active brand-500 highlight
- Wrapped in Suspense boundary in `leads/page.tsx` for Next.js `useSearchParams` requirement

### Task 2: Financeiro Comissoes Tab

**FinanceiroClient:**
- Tab bar: "Geral" / "Comissoes" with `border-b-2 border-brand-500` active indicator
- Geral tab: existing bar chart + search + table (unchanged behavior)
- Comissoes tab:
  - SVG donut chart (viewBox 200x200, radius 70, strokeWidth 30)
  - `stroke-dasharray` + `stroke-dashoffset` segments for 5 bairros
  - `rotate(-90deg)` transform so segments start at top
  - Mount animation: `useEffect` sets `animated=true` after 50ms, CSS `transition: stroke-dashoffset 0.5s ease`
  - Center label (counter-rotated 90deg) showing "100% / Total"
  - Horizontal flex-wrap legend with colored dots, bairro name, percentage
  - Summary cards: Total Comissoes (mock R$2.84M), Maior Bairro (Meireles 42%), Bairros Ativos (5)
  - Tenant name from `useTenant()` in header: "Market Share por Bairro — {tenant.name}"
- `useSearchParams` for `?tab=comissoes` URL param
- Wrapped in Suspense in `financeiro/page.tsx`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added Suspense wrappers for useSearchParams**
- **Found during:** Task 1
- **Issue:** Next.js 15/16 requires `useSearchParams` to be wrapped in Suspense boundary; without it the build logs a warning and SSR can fail
- **Fix:** Added `<Suspense fallback={null}>` in `leads/page.tsx` and `financeiro/page.tsx`
- **Files modified:** `src/app/cockpit/leads/page.tsx`, `src/app/cockpit/financeiro/page.tsx`
- **Commit:** 34aac6d, 4b1460d

**2. [Rule 1 - Decision] Move dropdown instead of cross-column drag-and-drop**
- **Per plan guidance:** "If cross-column DnD proves complex, implement a simpler approach... Prioritize working UI over perfect DnD"
- **Implementation:** Each card has a "Mover" button that opens a dropdown with available target stages
- This provides full cross-column move functionality without complex pointer-position detection

## Pre-existing Build Issue (Out of Scope)

`.next/dev/types/validator.ts` has a type error about `AppRouteHandlerRoutes` — confirmed pre-existing before any changes in this plan. The build compiles successfully; only the generated type validator fails. Deferred to `.planning/deferred-items.md` tracking.

## Known Stubs

- Donut chart uses mock `BAIRRO_DATA` (hardcoded percentages) — real bairro data requires a `bairro_stats` table or aggregated query from `leads`/`properties`. This is intentional for MVP visual.
- Kanban move actions are local-state only — no `POST /api/actions/execute` wired. Future plan should connect moves to job_queue.

## Self-Check: PASSED

- [x] `src/components/yzihub/LeadsKanban.tsx` — created
- [x] `src/layout/AppSidebar.tsx` — modified (submenu support)
- [x] `src/components/yzihub/LeadsClient.tsx` — modified (kanban toggle)
- [x] `src/components/yzihub/FinanceiroClient.tsx` — modified (tabs + donut)
- [x] Commit 34aac6d — feat(quick-260402-mwy-01)
- [x] Commit 4b1460d — feat(quick-260402-mwy-02)
- [x] Build: compiled successfully (pre-existing validator.ts error is unrelated to this plan)
