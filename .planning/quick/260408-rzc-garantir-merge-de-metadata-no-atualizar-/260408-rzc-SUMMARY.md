---
phase: quick
plan: 260408-rzc
subsystem: n8n-workflows / luana-jurema-brokers
tags: [n8n, metadata-merge, atualizar_qualificacao, jurema-brokers, luana]
dependency_graph:
  requires: [260408-rqi]
  provides: [metadata-merge-verified-atualizar_qualificacao]
  affects: [atualizar_qualificacao workflow, leads table metadata field]
tech_stack:
  added: []
  patterns: [spread merge { ...antigo, ...novo }, Supabase GET before UPSERT, on_conflict=tenant_id,phone]
key_files:
  created: []
  modified:
    - .planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json
decisions:
  - "Local JSON is source of truth — n8n REST API inaccessible externally (confirmed by 260407-r8a and direct test)"
  - "Verification performed via JSON analysis against plan's 3 critical criteria — all PASS"
  - "Deploy artifact is the local JSON itself — apply via n8n UI import"
metrics:
  duration: ~8 min
  completed_date: "2026-04-08"
  tasks_completed: 1
  files_changed: 0
---

# Quick 260408-rzc: Garantir Merge de Metadata no atualizar_qualificacao — Summary

**One-liner:** Verified that `atualizar_qualificacao.json` already contains complete metadata merge logic (Get Lead → Build Context with `{ ...antigo, ...novo }` → UPSERT with `on_conflict=tenant_id,phone`) from prior task 260408-rqi; n8n sync requires manual import via UI (REST API inaccessible externally).

## Objective

Confirmar que o workflow `atualizar_qualificacao` no n8n faz merge correto de metadata — preservando campos antigos quando o payload novo não os inclui.

## Verification Results

The local JSON at `.planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json` was analyzed against the 3 critical criteria from the plan:

### Critical Element 1: Get Lead node (aq-3)

**Status: PASS**

- Node exists with id `aq-3-get-lead`, name `Get Lead`
- SELECT query includes: `id,tenant_id,phone,name,status,score,metadata,stage_id,created_at`
- Query filters: `tenant_id=eq.{value}` + `phone=eq.{value}` (using `telefone_limpo`)
- Runs BEFORE Build Context in connection chain

### Critical Element 2: Build Context node (aq-4)

**Status: PASS**

Code contains all required logic:
```js
const antigo = existingLead ? (existingLead.metadata || {}) : {}
const novo = { objetivo, faixa_valor, bairro_interesse, ... }
// Strip undefined/null/empty
Object.keys(novo).forEach(k => {
  if (novo[k] === undefined || novo[k] === null || novo[k] === '') delete novo[k]
})
return [{ json: { ..., metadata: { ...antigo, ...novo } } }]
```

- `existingLead.metadata` access: VERIFIED
- `{ ...antigo, ...novo }` spread: VERIFIED
- Strip empty/null/undefined before merge: VERIFIED

### Critical Element 3: UPSERT Lead node (aq-5)

**Status: PASS**

- URL: `$vars.SUPABASE_URL + '/rest/v1/leads?on_conflict=tenant_id,phone'`
- Header: `Prefer: resolution=merge-duplicates,return=representation`
- Method: POST

### Connection Order

**Status: PASS**

`Webhook → Normalize → Get Lead → Build Context → UPSERT Lead → Respond`

## n8n Live Access Status

The n8n REST API is NOT accessible externally:
- `https://api.yzihub.com/api/v1/workflows` → 404 (not exposed)
- `https://n8n.yzihub.com/api/v1/workflows` → connection timeout (HTTP 000)

This was also confirmed by prior task 260407-r8a. The local JSON file is the source of truth. Sync to live n8n requires manual import or server-side access.

## Deploy Checklist (Pending Human Verification)

The following steps are required to sync the local JSON to the live n8n instance:

1. Open n8n UI at the internal URL (e.g., from server or VPN)
2. Navigate to Workflows → `atualizar_qualificacao`
3. Import from file: `.planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json`
   - OR manually verify/patch the 3 critical nodes above
4. Confirm workflow is Active after import
5. Test with partial payload (see checkpoint verification steps)

## Checkpoint: Human Verification Required

The plan has a `checkpoint:human-verify` gate requiring:

1. Open n8n and locate `atualizar_qualificacao`
2. Visually verify nodes: Webhook → Normalize → Get Lead → Build Context → UPSERT Lead → Respond
3. Open "Build Context" and confirm code has: `metadata: { ...antigo, ...novo }`
4. Test with partial qualification payload:
   - Lead with existing metadata `{ objetivo: "comprar" }`
   - Send payload with only `faixa_valor: "500k-1M"` (no objetivo)
   - Expected result: lead has BOTH `objetivo: "comprar"` AND `faixa_valor: "500k-1M"`
   - Old fields must NOT be erased

## Deviations from Plan

### Blocker (Rule 3 auto-resolved): n8n REST API Inaccessible

**Found during:** Task 1 — first attempt to fetch live workflow

**Issue:** The plan instructs use of "n8n MCP tools" to fetch and compare the live workflow. However:
- n8n REST API at `api.yzihub.com/api/v1/workflows` returns 404
- n8n subdomain `n8n.yzihub.com/api/v1/workflows` times out (HTTP 000)
- No n8n MCP server is configured in `.claude/settings.local.json` or `claude_desktop_config.json`
- This was previously documented in task 260407-r8a SUMMARY

**Resolution:** Verification performed via static analysis of the local JSON file against the plan's 3 critical criteria. All criteria PASS. The local JSON (already corrected in 260408-rqi) is the authoritative artifact. Manual import into n8n is required to sync live workflow.

**Classification:** Rule 3 (blocking issue auto-resolved via alternative verification approach)

## Known Stubs

None — this plan performs verification only, no new code written.

## Self-Check: PASSED

- [ ] All 3 critical elements verified in local JSON: PASS
- [ ] Get Lead node has metadata in SELECT: PASS  
- [ ] Build Context has `{ ...antigo, ...novo }` spread: PASS
- [ ] UPSERT uses `on_conflict=tenant_id,phone`: PASS
- [ ] Connection order Webhook→Normalize→GetLead→BuildContext→UPSERT→Respond: PASS
- [ ] n8n API access attempted and documented as inaccessible: PASS
- [ ] Deploy checklist provided for human verification: PASS
