---
phase: quick
plan: 260407-ktd
subsystem: navigation
tags: [sidebar, cleanup, navigation, ux]
dependency_graph:
  requires: []
  provides: [clean-sidebar-navigation]
  affects: [src/layout/AppSidebar.tsx]
tech_stack:
  added: []
  patterns: [TailAdmin dark, tenant-aware navigation, plan-gated modules]
key_files:
  created: []
  modified:
    - src/layout/AppSidebar.tsx
decisions:
  - Section "YZI CONTROL" renamed to "Painel" for tenant-appropriate labeling
  - "Sistema" section removed entirely as TailAdmin template residue (no real routes)
  - Calendar, Tasks, Chat removed — placeholder pages not ready for tenants
metrics:
  duration: "~5 min"
  completed: 2026-04-07
  tasks_completed: 1
  files_modified: 1
---

# Quick 260407-ktd: Ajustar Sidebar Jurema — Summary

**One-liner:** Removed broken/placeholder routes from AppSidebar (Sistema section, Calendar, Tasks, Chat) and renamed "YZI CONTROL" to "Painel", leaving only functional module links.

## What Was Done

Cleaned `src/layout/AppSidebar.tsx` to remove all non-functional navigation items that would cause 404 errors or lead users to placeholder pages.

### Changes Applied

**Section "YZI CONTROL" → "Painel":**
- Renamed section label to "Painel" (more appropriate for tenant cockpit)
- Removed Calendar (`/calendar` — route does not exist)
- Removed Tasks (`/cockpit/tasks` — placeholder page, non-functional)
- Removed Chat (`/cockpit/chat` — placeholder page, non-functional)
- Kept only: Dashboard (`/cockpit`)

**Section "Sistema" — removed entirely:**
- Forms (`/form-elements`) — TailAdmin template, no route
- Tables (`/basic-tables`) — TailAdmin template, no route
- Perfil (`/profile`) — no route
- Configuracoes (`/settings`) — no route

**Imports cleaned:**
- Removed: `CalenderIcon`, `TaskIcon`, `ChatIcon`, `ListIcon`, `TableIcon`, `UserCircleIcon`
- Removed: inline `SettingsIcon` component (no longer needed)

**Sections preserved intact:**
- CRM: Leads (Lista/Kanban), CRM/Pipeline, Imoveis (Catalogo)
- Gestao: Financeiro (Comissoes/Contratos/Geral)
- Modulos: all PRO/Growth items with plan-gating and upgrade modal
- Admin: YZI CONTROL, YZI FACTORY, Action Logs (adminOnly)

## Verification

- Build passed: `next build` completed without errors
- No 404-prone links remain in sidebar
- Modulos PRO/Growth section untouched (Lei do Upsell compliant)
- Admin section untouched (adminOnly flag logic intact)

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Remove broken routes and template sections from sidebar | 125525b |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this was a cleanup task removing items; no new data flows introduced.

## Self-Check: PASSED

- `src/layout/AppSidebar.tsx` exists and was modified
- Commit `125525b` exists in git log
- Build output confirmed successful (no errors, route list generated)
