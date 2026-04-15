---
phase: quick-260415-1nb
plan: 01
subsystem: leads-ui
tags: [datatable, tailadmin, leads, ui, pagination, icon-actions]
dependency_graph:
  requires: [LeadDrawer, LeadsKanban, /api/actions/execute]
  provides: [LeadsDataTable-TailAdmin-pattern]
  affects: [LeadsClient, leads page]
tech_stack:
  added: []
  patterns: [TailAdmin Datatable 3, status tabs, client-side pagination, icon action buttons]
key_files:
  created: []
  modified:
    - src/components/yzihub/LeadsDataTable.tsx
    - src/components/yzihub/LeadsClient.tsx
decisions:
  - "Counts in status tabs computed from the `leads` prop (search-filtered but not status-filtered) — reflects how many match each status in the current search context"
  - "Row remains fully clickable (opens LeadDrawer) in addition to the edit icon button — UX preserved per plan"
  - "Novo Lead button moved into DataTable card headerActions slot for table view; kept externally in kanban view"
  - "Source filter removed from table view (follows TailAdmin pattern); retained in Kanban SearchBar"
  - "handleQualify uses console.error only — no new toast library added per plan instruction"
metrics:
  duration_minutes: 20
  completed_date: "2026-04-15"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 2
---

# Quick 260415-1nb: Espelhar Datatable TailAdmin na Lista de Leads — Summary

**One-liner:** Rewrote LeadsDataTable.tsx in TailAdmin Datatable 3 pattern — status tabs with counts, inline search + Novo Lead button, 2 icon action buttons (edit/qualify), 10-item pagination with Prev/Next, mock fields eliminated.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Reescrever LeadsDataTable.tsx no padrão TailAdmin Datatable 3 | 49388cd | src/components/yzihub/LeadsDataTable.tsx |
| 2 | Ajustar LeadsClient.tsx para integrar header da tabela TailAdmin | 49388cd | src/components/yzihub/LeadsClient.tsx |

## Task 3 — Checkpoint (Human Verify: APPROVED)

Visual verification approved by user. Table mirrors TailAdmin Datatable 3 pattern with real Supabase data.

## Deviations from Plan

None — plan executed exactly as written. Both tasks were committed atomically in a single commit since they form a coupled interface change (new props in DataTable required simultaneous update in LeadsClient).

## Mock Fields Removed

| Symbol | File | Reason |
|--------|------|--------|
| `BAIRROS` array | LeadsDataTable.tsx | Mock neighborhood data not from Supabase |
| `bairroFromId()` helper | LeadsDataTable.tsx | Derived mock from lead ID hash |
| Coluna "Bairro Interesse" | LeadsDataTable.tsx (header + cell) | Rendered mock data |

## Endpoint Consumed

- `POST /api/actions/execute` — called by the bolt/qualify icon button with body `{ action: "qualify", lead_id: lead.id }`
- n8n is NOT called directly (Action Flow rule enforced)

## Preserved Functionality

- `LeadsKanban.tsx` — untouched
- `LeadDrawer.tsx` — untouched (still opens via `onSelect` prop and row click)
- Toggle Kanban/Table — still works; Kanban view retains SearchBar with source filter
- `scoreBadge`, `formatCorretor`, `formatCurrency`, `formatPhone`, `getInitials`, `avatarColor`, `LeadAvatar`, `STATUS_BADGE` — all preserved

## Known Stubs

None. All data displayed comes from the `leads: Lead[]` prop (Supabase data passed via `initialLeads`). No hardcoded mock values remain.

## Self-Check: PASSED

- src/components/yzihub/LeadsDataTable.tsx — FOUND
- src/components/yzihub/LeadsClient.tsx — FOUND
- Commit 49388cd — FOUND
