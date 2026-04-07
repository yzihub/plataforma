---
phase: quick
plan: 260407-qwm
subsystem: api
tags: [n8n, contracts, api, envelope, standardization]
dependency_graph:
  requires: [260407-l5s]
  provides: [uniform-n8n-envelope-all-endpoints]
  affects: [n8n-workflows, POST /api/contracts]
tech_stack:
  added: []
  patterns: [N8nEnvelope wrapper on POST responses]
key_files:
  modified:
    - src/app/api/contracts/route.ts
decisions:
  - POST /api/contracts now returns N8nEnvelope<N8nContract> to match GET shape
metrics:
  duration: "< 5 minutes"
  completed_date: "2026-04-07"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick Plan 260407-qwm: Padronizar Payload para N8n Summary

**One-liner:** POST /api/contracts now wraps its response in N8nEnvelope<N8nContract> using buildN8nEnvelope + toN8nContract, closing the shape contract so n8n can parse both GET and POST responses with the same parser.

## What Was Built

Single targeted fix: the POST handler in `src/app/api/contracts/route.ts` previously returned the raw Supabase row (`NextResponse.json(contract, { status: 201 })`). It now wraps the created record in the same N8nEnvelope used by the GET handler:

```typescript
const payload = buildN8nEnvelope("contracts", tenantId, [toN8nContract(contract)]);
return NextResponse.json(payload, { status: 201 });
```

The envelope shape returned on POST is:
```json
{
  "entity": "contracts",
  "tenant_id": "<uuid>",
  "count": 1,
  "fetched_at": "<iso-timestamp>",
  "data": [{ ...N8nContract fields... }]
}
```

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Padronizar resposta POST /api/contracts com envelope N8n | 4f28619 | src/app/api/contracts/route.ts |

## Verification

- TypeScript: `npx tsc --noEmit` → exit code 0, no errors
- No changes to: auth logic, validation, insertPayload, GET handler
- Shape parity: POST response now identical structure to GET response

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- File modified: `src/app/api/contracts/route.ts` — confirmed
- Commit `4f28619` — confirmed via git log
