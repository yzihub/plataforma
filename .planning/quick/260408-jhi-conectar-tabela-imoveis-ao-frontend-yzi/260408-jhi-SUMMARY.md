---
phase: quick
plan: 260408-jhi
subsystem: frontend/imoveis
tags: [imoveis, supabase, data-mapping, jurema-brokers]
dependency_graph:
  requires: [260408-2i3]
  provides: [IMOV-01]
  affects: [src/components/yzihub/ImoveisClient.tsx]
tech_stack:
  added: []
  patterns: [supabase-client-query, field-mapping-transformer]
key_files:
  modified:
    - src/components/yzihub/ImoveisClient.tsx
decisions:
  - Hardcoded tenant_id for Jurema Brokers (82cc7aa9-fc6e-4f37-8d8e-8a71c1691361) per user instruction
  - foto_principal parsed as JSON object or direct string URL for robustness
  - quartos/suites/vagas encoded as Property.tags array (e.g. ["3Q", "2S", "2V"])
metrics:
  duration: ~5min
  completed_date: 2026-04-08
  tasks_completed: 1
  tasks_total: 2
  files_modified: 1
---

# Quick 260408-jhi: Conectar Tabela Imoveis ao Frontend YZI — Summary

**One-liner:** Replaced empty `properties` fetch with `imoveis` table query filtered by tenant and publication status, with full field transformer mapping 7 imoveis columns to the Property type.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Reescrever fetch do ImoveisClient para tabela imoveis com transformacao | 1e5361e | Done |
| 2 | checkpoint:human-verify | — | Awaiting verification |

## What Was Built

Updated `src/components/yzihub/ImoveisClient.tsx`:

1. **New `ImoveisRow` interface** — typed representation of the `imoveis` table row with all 16 selected columns.

2. **`mapImoveisToProperty()` function** — transforms a raw Supabase `imoveis` row into the `Property` type:
   - `titulo_comercial` → `title` (fallback: "Sem titulo")
   - `bairro` → `neighborhood` and `location` (fallback: "Localizacao nao informada")
   - `valor` → `price` (fallback: 0)
   - `foto_principal` → `photo_url` (handles JSON object `{ url }` or direct string URL)
   - `quartos`, `suites`, `vagas` → `tags` array (e.g. `["3Q", "2S", "2V"]`)
   - `metragem` → `area_sqm`
   - `tipo_de_imovel` → `property_type`
   - `finalidade` → `purpose`
   - `descricao_imovel` → `description` and `notes`
   - All unmapped Property fields default to `null`

3. **Updated `useEffect` fetch:**
   - `.from("imoveis")` (was `"properties"`)
   - `.select(...)` — only the 16 needed columns
   - `.eq("tenant_id", "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361")` — Jurema Brokers
   - `.eq("status_publicacao", "Publicado")` — published only
   - `.order("created_at", { ascending: false })`
   - Result mapped through `mapImoveisToProperty()`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/components/yzihub/ImoveisClient.tsx` modified with correct fetch
- [x] TypeScript compiles without errors (tsc --noEmit exit 0)
- [x] Commit 1e5361e exists

## Self-Check: PASSED
