---
phase: quick
plan: 260404-d6a
subsystem: contracts-crm
tags: [contracts, crm, ui, supabase-ready, tenant-context]
dependency_graph:
  requires: [TenantContext, ui/table, ui/badge, ui/modal, icons, crm/mock-data]
  provides: [contracts-route, contracts-types, contracts-mock-data, contracts-ui]
  affects: [AppSidebar, cockpit-navigation]
tech_stack:
  added: [src/types/contracts.ts, src/lib/contracts/mock-data.ts]
  patterns: [useContracts hook (Supabase-ready), ContractsClient orchestrator, ContractsTable data table, slide-over drawer, modal form with searchable select]
key_files:
  created:
    - src/types/contracts.ts
    - src/lib/contracts/mock-data.ts
    - src/components/yzihub/Contratos/ContractsTable.tsx
    - src/components/yzihub/Contratos/NewContractModal.tsx
    - src/components/yzihub/Contratos/ContractsClient.tsx
    - src/app/cockpit/contratos/page.tsx
  modified:
    - src/layout/AppSidebar.tsx
decisions:
  - Contracts folder at src/components/yzihub/Contratos/ following user_spec structure (not flat ContractsClient.tsx as original plan)
  - useContracts hook returns mock data filtered by tenant_id, structured for direct Supabase swap
  - ContractDrawer built inline in ContractsClient (not separate file) since user_spec places all logic in ContractsClient
  - TableCell onClick not supported by table component — wrapped ActionMenu in div with stopPropagation instead
metrics:
  duration: 6 minutes
  completed: "2026-04-04"
  tasks_completed: 2
  files_created: 6
  files_modified: 1
---

# Quick Task 260404-d6a: Contratos System Summary

**One-liner:** Full contracts module with tenant-filtered DataTable, slide-over drawer, New Contract modal, and Supabase-ready useContracts hook integrated with TenantContext.

## What Was Built

### Task 1: Types, Mock Data, Sidebar Entry (08aa4a1)

- **`src/types/contracts.ts`** — `Contract` interface, `ContractStatus` (pendente/assinado/cancelado/rascunho/expirado), `ContractType` (venda/locacao/servico/parceria), `CONTRACT_STATUS_CONFIG` mapped to BadgeVariant colors, `CONTRACT_TYPE_LABELS`
- **`src/lib/contracts/mock-data.ts`** — 10 realistic mock contracts: 6 for Jurema Brokers (dev-tenant), 4 for Cafe com Pam (tenant-cafepam-0001). Covers all 5 statuses, all 4 types, values from R$3.800 to R$1.250.000
- **`src/layout/AppSidebar.tsx`** — Added "Contratos" child under Gestao > Financeiro submenu with path `/cockpit/contratos`

### Task 2: UI Components + Route (557f59f)

- **`src/components/yzihub/Contratos/ContractsTable.tsx`** — DataTable with: avatar initials (deterministic color), BRL currency formatting, status Badge, type label, updated_at date. Includes skeleton loader and empty state. ActionMenu dropdown with "Ver detalhes | Editar | Cancelar contrato"
- **`src/components/yzihub/Contratos/NewContractModal.tsx`** — Modal form with searchable lead dropdown, property select, corretor select, value input, type/status select, notes textarea. Backdrop close, Escape key, form reset on close
- **`src/components/yzihub/Contratos/ContractsClient.tsx`** — Orchestrator with:
  - `useContracts(tenantId)` hook — filters MOCK_CONTRACTS by tenant, structured for Supabase swap
  - Stats row: VGV Total, Assinados count, Pendentes count
  - `PendingAlert` — shows contracts with status "pendente" for more than 7 days
  - Search by lead_name or project_name (case-insensitive)
  - Status filter dropdown (all statuses + "Todos")
  - `ContractDrawer` — slide-over (right panel, same pattern as LeadDrawer) with Informacoes/Datas/Acoes sections
- **`src/app/cockpit/contratos/page.tsx`** — Route page rendering ContractsClient

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TableCell does not accept onClick prop**
- **Found during:** Task 2 TypeScript check
- **Issue:** `TableCellProps` has no `onClick` field; passing it caused TS2322 type error
- **Fix:** Wrapped `ActionMenu` in a `<div onClick={(e) => e.stopPropagation()}>` inside the TableCell
- **Files modified:** `src/components/yzihub/Contratos/ContractsTable.tsx`
- **Commit:** 557f59f

### Structural Deviations (user_spec override)

**2. Folder structure per user_spec**
- Original plan had flat files (`ContractsClient.tsx`, `ContractDrawer.tsx`). User_spec required `src/components/yzihub/Contratos/` folder with `ContractsTable.tsx`, `NewContractModal.tsx`, `ContractsClient.tsx`.
- Implemented: `ContractDrawer` built inline inside `ContractsClient.tsx` (avoids a 4th file for a simple component that shares state directly).

**3. ContractType field mapping**
- Plan used `'draft'|'sent'|'signed'|'cancelled'|'expired'` with English keys
- User_spec defined `'pendente'|'assinado'|'cancelado'|'rascunho'|'expirado'` in Portuguese — implemented user_spec version

## Known Stubs

| File | Item | Reason |
|------|------|--------|
| `src/components/yzihub/Contratos/ContractsClient.tsx` | `useContracts` returns MOCK_CONTRACTS | Prepared for Supabase swap — `contracts` table does not exist in DB yet. Future plan: add migration + real query |
| `src/components/yzihub/Contratos/NewContractModal.tsx` | `MOCK_LEADS/PROPERTIES/CORRETORES` | Select options use static arrays — future plan: query from Supabase leads/projects/profiles |
| `ContractDrawer` action buttons | "Enviar Contrato" / "Marcar como Assinado" | UI only — no API call. Future: POST /api/actions/execute -> job_queue -> n8n webhook |

## Self-Check

Files created:
- [x] src/types/contracts.ts — FOUND
- [x] src/lib/contracts/mock-data.ts — FOUND
- [x] src/components/yzihub/Contratos/ContractsTable.tsx — FOUND
- [x] src/components/yzihub/Contratos/NewContractModal.tsx — FOUND
- [x] src/components/yzihub/Contratos/ContractsClient.tsx — FOUND
- [x] src/app/cockpit/contratos/page.tsx — FOUND

Commits:
- [x] 08aa4a1 — feat(quick-260404-d6a-01): types, mock data, sidebar
- [x] 557f59f — feat(quick-260404-d6a-02): contracts system

## Self-Check: PASSED
