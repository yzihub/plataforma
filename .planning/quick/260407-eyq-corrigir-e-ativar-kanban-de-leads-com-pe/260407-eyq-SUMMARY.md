---
phase: quick
plan: 260407-eyq
subsystem: crm-kanban
tags: [kanban, drag-and-drop, supabase, leads, pipeline]
dependency_graph:
  requires: []
  provides: [leads-kanban-dnd, api-patch-leads]
  affects: [cockpit/leads, LeadsClient, LeadsKanban]
tech_stack:
  added: []
  patterns: [html5-dnd, optimistic-update, tenant-scoped-api]
key_files:
  created:
    - src/app/api/leads/[id]/route.ts
  modified:
    - src/components/yzihub/LeadsKanban.tsx
    - src/components/yzihub/LeadsClient.tsx
    - src/app/cockpit/leads/page.tsx
decisions:
  - Used HTML5 native DnD (no framer-motion) for drag-and-drop — lighter and sufficient
  - getCockpitData() reused from queries.ts instead of duplicating Supabase logic in page
  - Optimistic update applied before PATCH call; error logged to console (no revert on error)
  - validate-auth-system.ts pre-existing TS errors fixed as blocking side effect (Rule 3)
metrics:
  duration: "~20 minutes"
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_modified: 5
---

# Quick 260407-eyq: Corrigir e Ativar Kanban de Leads com Persistencia Supabase

**One-liner:** HTML5 DnD Kanban for leads with real pipeline_stages columns and tenant-scoped PATCH /api/leads/[id] for stage persistence.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create PATCH /api/leads/[id] and update leads page to fetch stages | fad4204 | route.ts, leads/page.tsx |
| 2 | Implement real DnD Kanban with Supabase persistence | a8b2688 | LeadsKanban.tsx, LeadsClient.tsx, validate-auth-system.ts |

## What Was Built

### PATCH /api/leads/[id]
- Authenticates user via `supabase.auth.getUser()`
- Fetches `tenant_id` from `profiles` table
- Validates lead belongs to tenant (403 if not)
- Updates `stage_id` and `last_action_at` with current timestamp
- Returns updated lead or appropriate error codes (401/403/400/500)

### LeadsKanban.tsx (full rewrite)
- Receives `leads`, `stages` (PipelineStage[]), `onMoveLead` callback as props
- Columns sorted by `position` from real `pipeline_stages` data
- Leads grouped by `stage_id` (not by `status`)
- HTML5 DnD: `dragLeadId` ref + `dragOverStageId` state
- `onDrop`: calls `onMoveLead` for optimistic update, then `fetch PATCH /api/leads/:id`
- Visual: `border-brand-400 bg-brand-500/5` highlight on drag-over (same pattern as PipelineClient)
- Empty drop target shows "Arraste um card aqui" / "Soltar aqui" on hover
- MoveMenu button kept for accessibility — uses real stage names/ids

### LeadsClient.tsx
- Added `stages: PipelineStage[]` prop
- Changed `initialLeads` to `leads` state via `useState` for optimistic updates
- `handleMoveLead` callback updates `stage_id` and `last_action_at` locally
- Passes `stages` and `onMoveLead` to `LeadsKanban`
- Toggle Table/Kanban preserved

### leads/page.tsx
- Replaced direct Supabase fetch with `getCockpitData()` from `@/lib/crm/queries`
- Passes both `leads` and `stages` to `LeadsClient`
- Fallback to mock data + `MOCK_STAGES` when not authenticated or Supabase not configured

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing TypeScript errors in validate-auth-system.ts**
- **Found during:** npm run build (Task 2 verification)
- **Issue:** Script used `.tenants` property on a type inferred as `never`, and passed incompatible SupabaseClient type to typed functions
- **Fix:** Cast `profileRaw as any` and `supabaseResult as any` at call sites — minimal surgical fix
- **Files modified:** `src/scripts/validate-auth-system.ts`
- **Commit:** a8b2688

## Known Stubs

None — Kanban fully wired to real data via getCockpitData() and PATCH API.

## Self-Check: PASSED
