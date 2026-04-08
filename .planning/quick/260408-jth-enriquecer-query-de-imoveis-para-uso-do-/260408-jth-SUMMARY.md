---
phase: quick
plan: 260408-jth
subsystem: api/imoveis + types
tags: [n8n, imoveis, luana, jurema-brokers, api, types]
dependency_graph:
  requires: []
  provides: [N8nImovel interface, toN8nImovel mapper, GET /api/imoveis enriched]
  affects: [n8n workflow consultar_imoveis, agente Luana]
tech_stack:
  added: []
  patterns: [N8nEnvelope pattern, per-entity mapper with fallbacks]
key_files:
  created: []
  modified:
    - src/types/n8n-payloads.ts
    - src/app/api/imoveis/route.ts
decisions:
  - Kept N8nProperty and toN8nProperty intact for backward compatibility — other routes may depend on them
  - Fallback 0 (not null) for numeric fields quartos/suites/vagas — safe for n8n arithmetic comparisons
  - Filter status_publicacao = 'Publicado' applied in SQL, not in mapper — reduces payload size
metrics:
  duration: "~5 min"
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_modified: 2
---

# Quick 260408-jth: Enriquecer Query de Imóveis para Uso do Agente Luana — Summary

**One-liner:** API `GET /api/imoveis` migrada de tabela `properties` (genérica) para `imoveis` com 17 campos estruturados (titulo_comercial, bairro, quartos, suites, vagas, metragem, foto_principal) via `N8nImovel` interface + mapper `toN8nImovel` com fallback 0 para campos numéricos.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Criar interface N8nImovel e mapper toN8nImovel com fallbacks | c4f1ac9 | src/types/n8n-payloads.ts |
| 2 | Atualizar API route para buscar da tabela imoveis com campos estruturados | 287b200 | src/app/api/imoveis/route.ts |

## What Was Built

### Task 1 — N8nImovel interface + toN8nImovel mapper (`src/types/n8n-payloads.ts`)

New `N8nImovel` interface with 17 fields matching the `imoveis` table schema for Jurema Brokers. New `toN8nImovel` mapper with safe fallbacks:

- `suites: row.suites ?? 0`
- `vagas: row.vagas ?? 0`
- `quartos: row.quartos ?? 0`
- `valor: row.valor ?? 0`
- All optional text fields fallback to `null`

`N8nProperty` and `toN8nProperty` were NOT modified — backward compatibility preserved.

### Task 2 — API route enrichment (`src/app/api/imoveis/route.ts`)

- Table changed: `properties` → `imoveis`
- SELECT expanded to 17 structured fields
- Added filter: `.eq("status_publicacao", "Publicado")` — only published listings sent to Luana
- Mapper changed: `toN8nProperty` → `toN8nImovel`
- Auth/tenant_id/error handling unchanged

## Verification

- [x] `npx tsc --noEmit` exits 0 (no errors)
- [x] `N8nImovel` interface exported with all 17 fields
- [x] `toN8nImovel` mapper exported with fallbacks for suites/vagas/quartos = 0
- [x] Route queries `imoveis` table (not `properties`)
- [x] Route filters by `tenant_id` (multi-tenant preserved)
- [x] Route filters by `status_publicacao = 'Publicado'`
- [x] `N8nProperty` and `toN8nProperty` still exist (backward compat)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/types/n8n-payloads.ts` — modified, contains N8nImovel and toN8nImovel
- `src/app/api/imoveis/route.ts` — modified, queries `imoveis` table
- Commit c4f1ac9 — exists (Task 1)
- Commit 287b200 — exists (Task 2)
