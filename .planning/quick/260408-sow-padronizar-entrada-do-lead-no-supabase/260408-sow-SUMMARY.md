---
phase: quick
plan: 260408-sow
subsystem: n8n-workflows / supabase-leads
tags: [leads, upsert, supabase, n8n, luana, jurema-brokers, airtable-migration]
dependency_graph:
  requires: [260408-rqi]
  provides: [idempotent-lead-lookup-main-workflow]
  affects: [luana-main-workflow, leads-table]
tech_stack:
  removed: [airtable-lead-lookup, airtable-lead-create, leads_qualificados-mirror]
  patterns: [phone+tenant_id-lookup, on_conflict=tenant_id,phone]
key_files:
  created:
    - .planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-fixed.json
    - .planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-audit.md
decisions:
  - Replace Airtable lead lookup with Supabase GET /leads by phone+tenant_id
  - Replace Get a record1 (Airtable) with Code passthrough — data already fetched by Search
  - Replace Create a record1 (Airtable) with Supabase UPSERT on_conflict=tenant_id,phone
  - Replace Create a row (leads_qualificados mirror) with Code passthrough first UPSERT item
  - Update Dados do Lead to use Supabase field names (lead.name, lead.status, meta.*)
  - Add telefone+tenant_id inputs to tool nodes (atualizar_qualificacao, setar_lead_quente)
  - Remove airtable_record_id from tool node inputs
  - Add backward-compat aliases in Dados do Lead output (Telefone, Status Lead) for Atendente template
metrics:
  duration: ~15 min
  completed: "2026-04-08"
  tasks_completed: 2
  nodes_changed: 8
  positions_preserved: 117
  connections_preserved: true
---

# Quick Task 260408-sow: Padronizar Entrada do Lead no Supabase — Summary

**One-liner:** Fixed main Luana workflow to look up and create leads via Supabase `leads` table using phone+tenant_id as unique key, replacing legacy Airtable nodes and eliminating duplicate lead creation on second message.

## Root Cause

Quick task 260408-rqi fixed the **tool workflows** (`atualizar_qualificacao`, `setar_lead_quente`) to use phone+tenant_id, but the **main agent workflow** (parent flow) still used Airtable for lead lookup and creation. This meant:

1. Airtable `Search records1` → finds or creates lead in Airtable
2. `Create a row` → mirrors to `leads_qualificados` table in Supabase (legacy mirror)
3. Tool workflows → query `leads` table by phone+tenant_id (different table, no data yet!)

Result: tool workflows were calling `atualizar_qualificacao` with empty phone because the tool node didn't pass `telefone`/`tenant_id` inputs.

## What Was Built

8 nodes changed in `luana-agent-workflow-fixed.json` — all positions and connections preserved:

| Node | Before | After |
|------|--------|-------|
| `Search records1` | Airtable search by phone | httpRequest GET Supabase leads by phone+tenant_id |
| `If1` | Check `$json.id` (Airtable record) | Check array notEmpty (Supabase response) |
| `Get a record1` | Airtable GET by record ID (2nd API call) | Code passthrough `$json[0]` from Search |
| `Create a record1` | Airtable INSERT (no idempotency) | httpRequest UPSERT `on_conflict=tenant_id,phone` |
| `Create a row` | Supabase INSERT `leads_qualificados` (legacy mirror) | Code passthrough `$json[0]` from UPSERT |
| `Dados do Lead` | Airtable field names (`lead['Status Lead']`) | Supabase fields (`lead.status`, `meta.bairro_interesse`) |
| `atualizar_qualificacao` | Sent `airtable_record_id`, no phone/tenant | Sends `telefone` + `tenant_id`, removed `airtable_record_id` |
| `setar_lead_quente` | Sent `airtable_record_id`, no phone/tenant | Sends `telefone` + `tenant_id`, removed `airtable_record_id` |

## Deploy Steps

1. Export current Luana workflow as backup (optional)
2. Import `luana-agent-workflow-fixed.json` into n8n (Workflows → Import → overwrite)
3. Activate workflow

## Validation After Deploy

```sql
-- Enviar 2+ mensagens do mesmo número → deve ter exatamente 1 lead
SELECT COUNT(*) FROM leads
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND phone = '5583981681119';
-- Expected: 1
```

## Deviations from Plan

Plan expected Task 1 (human checkpoint) to export JSON manually. Bypassed via n8n MCP tool which fetched the workflow directly — no manual action required.

## Self-Check

- luana-agent-workflow-original.json: FOUND (117 nodes)
- luana-agent-workflow-fixed.json: FOUND
- luana-agent-workflow-audit.md: FOUND
- All positions preserved: PASS
- All connections preserved: PASS
- No record_id in lead persistence nodes: PASS
- on_conflict=tenant_id,phone: PASS
- telefone+tenant_id in tool inputs: PASS
