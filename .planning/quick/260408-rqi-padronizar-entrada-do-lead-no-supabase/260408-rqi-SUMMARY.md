---
phase: quick
plan: 260408-rqi
subsystem: n8n-workflows / supabase-schema / agent-prompts
tags: [leads, upsert, supabase, n8n, luana, jurema-brokers]
dependency_graph:
  requires: [260408-sub-refactor-luana-airtable-supabase]
  provides: [idempotent-lead-upsert-by-phone]
  affects: [atualizar_qualificacao, leads-table]
tech_stack:
  added: []
  patterns: [on_conflict=tenant_id,phone, UUID auto-generate on INSERT]
key_files:
  created:
    - supabase/migrations/012_leads_tenant_phone_unique.sql
  modified:
    - .planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json
    - clientes/jurema-brokers/prompts.md
decisions:
  - Use phone+tenant_id as the conflict target (not id) — phone is the natural business key for leads arriving via WhatsApp
  - Dedup DELETE before adding UNIQUE constraint to handle any existing duplicates safely
  - Remove id from UPSERT payload entirely — let Supabase generate UUID on first INSERT
metrics:
  duration: ~10 min
  completed: "2026-04-08"
  tasks_completed: 3
  files_modified: 3
---

# Quick Task 260408-rqi: Padronizar Entrada do Lead no Supabase — Summary

**One-liner:** Fixed idempotent lead upsert by switching on_conflict from tenant_id,id (broken) to tenant_id,phone with UNIQUE constraint migration and cleaned Airtable record_id residual from Luana's prompt.

## What Was Built

The `atualizar_qualificacao` workflow was sending `id = telefone_limpo` (a numeric string) as the conflict key, but `leads.id` is a UUID — so Supabase always created a new row instead of merging. Three changes fix this permanently:

1. **Migration 012** — adds `UNIQUE(tenant_id, phone)` with a safe dedup DELETE before the ALTER TABLE.
2. **Workflow fix** — UPSERT URL changed to `on_conflict=tenant_id,phone`; `id: telefone` removed from Build Context payload so Supabase generates UUID automatically on INSERT.
3. **Prompt cleanup** — `record_id` (Airtable residual) replaced with `telefone + tenant_id` in Luana's merge rule.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar migration UNIQUE(tenant_id, phone) | 4f567e0 | supabase/migrations/012_leads_tenant_phone_unique.sql |
| 2 | Corrigir workflow atualizar_qualificacao | 8d68da8 | .planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json |
| 3 | Remover record_id do prompt da Luana | e17f1d9 | clientes/jurema-brokers/prompts.md |

## Verification Results

- Migration 012 exists with DELETE dedup + ALTER TABLE ADD CONSTRAINT UNIQUE(tenant_id, phone): PASS
- atualizar_qualificacao.json uses on_conflict=tenant_id,phone: PASS
- Build Context payload does not include `id` field: PASS
- prompts.md has zero record_id references: PASS
- setar_lead_quente.json NOT modified (uses PATCH by phone — already correct): PASS
- consultar_imoveis.json and buscar_lancamentos.json NOT modified (read-only): PASS

## Deviations from Plan

None — plan executed exactly as written.

## Deploy Checklist

Before the fix takes effect in production:

1. Run migration 012 on Supabase: `supabase db push` or apply via Supabase Studio SQL editor
2. Re-import `atualizar_qualificacao.json` in n8n (Workflows → Import from file → overwrite existing)
3. Re-activate workflow in n8n if it was paused

After deploy, validate with:
```sql
-- Send 2+ messages from same phone to Luana
-- Must see exactly 1 lead
SELECT COUNT(*) FROM leads
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND phone = '5583981681119';
-- Expected: 1
```

## Known Stubs

None.

## Self-Check: PASSED

- supabase/migrations/012_leads_tenant_phone_unique.sql: FOUND
- Commit 4f567e0: FOUND
- Commit 8d68da8: FOUND
- Commit e17f1d9: FOUND
- on_conflict=tenant_id,phone in workflow: VERIFIED
- record_id refs in prompts.md: 0 (VERIFIED)
