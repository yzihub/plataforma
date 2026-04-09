---
phase: quick
plan: 260409-7av
subsystem: workflows/luana
tags: [n8n, supabase, lead-status, standardization]
dependency_graph:
  requires: []
  provides: [standardized-lead-status-values]
  affects: [luana-agent-workflow-fixed.json, fix-workflow.js]
tech_stack:
  added: []
  patterns: [supabase-enum-enforcement]
key_files:
  created: []
  modified:
    - .planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-fixed.json
    - .planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/fix-workflow.js
decisions:
  - "urgencyMap keys in fix-workflow.js corrected from hot_lead/visit_requested/start to qualified/proposal/new to match Supabase enum"
metrics:
  duration: 5min
  completed: 2026-04-09
  tasks: 1
  files_changed: 2
---

# Phase quick Plan 260409-7av: Padronizar Status dos Leads para Ingles Summary

**One-liner:** Removed all non-standard status slugs (start, qualifying, hot_lead, visit_requested) from Luana workflows, replacing with the Supabase enum values (new, contacted, qualified, proposal).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Corrigir status residuais e auditar todos os workflows da Luana | 4164ce4 | luana-agent-workflow-fixed.json, fix-workflow.js |

## Changes Made

### luana-agent-workflow-fixed.json
- Legacy Code node (line ~10092): `statusMap[statusRaw] || 'start'` -> `statusMap[statusRaw] || 'new'`

### fix-workflow.js
- Line 97: `status: 'start'` -> `status: 'new'` (upsert body)
- Line 135: `lead.status || 'start'` -> `lead.status || 'new'` (status fallback)
- Lines 174-178: urgencyMap keys corrected: `hot_lead` -> `qualified`, `visit_requested` -> `proposal`, `start` -> `new`

### setar_lead_quente.json
- Audited: `status: 'qualified'` already correct. No changes needed.

### atualizar_qualificacao.json
- Audited: does not write `status` field in any PATCH body. No changes needed.

## Deviations from Plan

**1. [Rule 2 - Missing Critical Fix] urgencyMap keys in fix-workflow.js**
- **Found during:** Task 1
- **Issue:** Plan mentioned verifying urgencyMap keys but the urgencyMap in fix-workflow.js used old non-standard keys (hot_lead, visit_requested, start) that would never match the standardized status values, making urgency alerts dead code
- **Fix:** Corrected all three keys to match the Supabase enum: qualified, proposal, new
- **Files modified:** fix-workflow.js
- **Commit:** 4164ce4

## Known Stubs

None.

## Verification Results

All checks passed:
- 3 JSON files parse without errors
- fix-workflow.js passes node --check (no syntax errors)
- Zero occurrences of old status slugs (start, qualifying, hot_lead, visit_requested, novo, contatado, qualificando, lead_quente) in any of the 4 workflow files

## Self-Check: PASSED
