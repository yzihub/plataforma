---
phase: quick-260419-bq3
plan: 01
subsystem: contratos
tags: [api, contrato-editor, imoveis, fetch, vars]
dependency_graph:
  requires: [quick-260418-vrr]
  provides: [GET /api/imoveis/[id], ContratoEditor vars corretos]
  affects: [ContratoEditor, contratos/novo]
tech_stack:
  added: []
  patterns: [Next.js 15 dynamic route with async params, DEV_BYPASS with createAdminClient, maybeSingle query]
key_files:
  created:
    - src/app/api/imoveis/[id]/route.ts
  modified:
    - src/components/yzihub/Contratos/ContratoEditor.tsx
decisions:
  - Retornar objeto plano (sem N8nEnvelope) em /api/imoveis/[id] — consistente com /api/leads/[id] e /api/brokers/[id]
  - Sem filtro status_publicacao no endpoint [id] — contratos devem funcionar para imóveis em qualquer estado
  - valor = property?.valor ?? lead?.value ?? 0 — imóvel tem prioridade sobre deal-value do CRM
metrics:
  duration: "~10 minutes"
  completed: "2026-04-19T11:37:10Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase quick-260419-bq3 Plan 01: Conectar Editor de Contrato com Dados Reais — Summary

**One-liner:** GET /api/imoveis/[id] para fetch pontual por UUID + ContratoEditor usa property.valor, fetch direto e chip id_imovel.

## What Was Built

### Task 1 — GET /api/imoveis/[id] (commit: 53c95dc)

Nova route handler `src/app/api/imoveis/[id]/route.ts`:
- Mesmo padrão de tenant resolution de `/api/imoveis/route.ts` (DEV_BYPASS + createAdminClient)
- Next.js 15: `params` como `Promise<{ id: string }>` com `await params`
- Validação de ID vazio → 400
- Query com `.maybeSingle()` filtrando `tenant_id` + `id`, sem filtro `status_publicacao`
- Retorna objeto plano (não N8nEnvelope) — consistente com `/api/leads/[id]` e `/api/brokers/[id]`
- 404 se não encontrado, 500 em erro de query

### Task 2 — ContratoEditor cirúrgico (commit: b79d5a1)

Três mudanças em `src/components/yzihub/Contratos/ContratoEditor.tsx`:

**Change A — Fetch pontual:**
- Antes: `fetch("/api/imoveis")` → parse envelope → `.find(p => p.id === propertyId)` (N rows, filtra publicados)
- Depois: `fetch(`/api/imoveis/${propertyId}`)` → 1 row, funciona para qualquer status

**Change B — Fonte de valor:**
- Antes: `const valor = lead?.value ?? 0` (nos 3 lugares)
- Depois: `const valor = property?.valor ?? lead?.value ?? 0` (nos 3 lugares: useMemo vars, handleSaveDraft, handleGenerateAndSend)
- Mensagem de erro atualizada: "O imóvel ou lead precisa ter um valor definido."

**Change C — Variável id_imovel:**
- AVAILABLE_VARS ganhou `{ key: "id_imovel", hint: "UUID do imóvel" }`
- vars useMemo ganhou `id_imovel: property?.id ?? "{{id_imovel}}"`

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 53c95dc | feat(quick-260419-bq3): add GET /api/imoveis/[id] |
| 2 | b79d5a1 | feat(quick-260419-bq3): ContratoEditor — fetch pontual imóvel, valor de property, chip id_imovel |

## Known Stubs

None. Todos os campos são buscados de dados reais do banco.

## Self-Check: PASSED

- `src/app/api/imoveis/[id]/route.ts` exists: FOUND
- `src/components/yzihub/Contratos/ContratoEditor.tsx` modified: FOUND
- Commit 53c95dc: FOUND
- Commit b79d5a1: FOUND
- `rtk tsc --noEmit`: PASSED
