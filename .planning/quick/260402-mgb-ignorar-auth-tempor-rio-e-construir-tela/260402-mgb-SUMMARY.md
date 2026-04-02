---
phase: quick
plan: 260402-mgb
subsystem: cockpit-ui
tags: [dev-bypass, auth, leads, financeiro, mock-data, bar-chart]
dependency_graph:
  requires: []
  provides: [dev-auth-bypass, leads-mock-data, financeiro-bar-chart]
  affects: [TenantContext, LeadsPage, FinanceiroPage, FinanceiroClient]
tech_stack:
  added: []
  patterns: [DEV_BYPASS pattern in TenantContext, CSS bar chart with Tailwind]
key_files:
  created: []
  modified:
    - src/context/TenantContext.tsx
    - src/lib/crm/mock-data.ts
    - src/app/cockpit/leads/page.tsx
    - src/app/cockpit/financeiro/page.tsx
    - src/components/yzihub/FinanceiroClient.tsx
decisions:
  - Dev bypass returns Jurema Brokers mock tenant (matches active client context)
  - Combined cafePamData + juremaLeads for leads page fallback (17 total leads)
  - Pure CSS/Tailwind bar chart — no chart library added to keep bundle lean
metrics:
  duration: ~20min
  completed: 2026-04-02
  tasks_completed: 2
  files_modified: 5
---

# Quick 260402-mgb: Dev Auth Bypass + High-Density Cockpit Screens Summary

**One-liner:** Dev bypass in TenantContext returns Jurema Brokers mock tenant so all cockpit screens render on localhost without a Supabase session; Leads shows 17 entries and Financeiro shows commission bar chart with pulsating ATRASADO alerts.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Dev auth bypass in TenantContext + enrich Leads page | 415bfe3 | TenantContext.tsx, mock-data.ts, leads/page.tsx |
| 2 | Financeiro bar chart + pulsating ATRASADO alerts | a00d6e2 | financeiro/page.tsx, FinanceiroClient.tsx |

## What Was Built

### Task 1 — Dev Auth Bypass + Leads Mock Data

- Added `DEV_BYPASS` block in `TenantContext.fetchTenant`: when `!user && NODE_ENV === 'development'`, sets Jurema Brokers mock tenant `{ id: "dev-tenant", name: "Jurema Brokers (DEV)", plan: "growth", activeModules: ["crm","sdr","ia_onboarding"], settings: { agent_name: "Luana", primary_color: "#465FFF" } }` and returns early, skipping all Supabase profile/tenant/projects queries.
- Added 5 Jurema Brokers imobiliario leads (`juremaLeads`) to `mock-data.ts` with: diverse scores (35, 62, 78, 85, 92), VGV values R$320k–R$2.5M, statuses new/contacted/qualified/proposal/won, sources Zap Imóveis/Google Ads/Indicação/LinkedIn/WhatsApp.
- Leads page fallback now returns `[...cafePamData.leads, ...juremaLeads]` = 17 leads across all no-user/no-tenant paths.

### Task 2 — Financeiro Bar Chart + Pulsating ATRASADO

- Expanded `MOCK_FINANCE` from 4 to 10 real estate commission records with realistic descriptions ("Comissao Apt 302 Meireles", "Comissao Casa Eusebio Lote 14", etc.), values R$3,500–R$125,000, mix: 3 atrasado, 3 concluido, 2 em_andamento, 2 pendente.
- Added summary strip at top: "Total Comissoes", "A Receber" (pendente+em_andamento sum), "Atrasados" count with pulsating red dot.
- Added horizontal CSS bar chart section "Comissoes por Status": each record gets a `<div>` bar with width proportional to `final_amount / maxAmount * 100%`. Colors: green=concluido, yellow=em_andamento, blue=pendente, red+animate-pulse=atrasado.
- Table status column: records with `status === "atrasado"` now render pulsating red badge `ATRASADO` instead of plain text.
- Table now shows `description` column instead of truncated ID for readability.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript null type error in statusConfig call**
- **Found during:** Task 2 TypeScript check
- **Issue:** `record.status` is typed `string | null | undefined` but `statusConfig` expected `string | undefined`
- **Fix:** Used `record.status ?? undefined` to coerce null to undefined
- **Files modified:** `src/components/yzihub/FinanceiroClient.tsx`
- **Commit:** a00d6e2

## Verification

- TypeScript: `npx tsc --noEmit --skipLibCheck` passes with 0 errors
- Auth gate bypass: When running `npm run dev`, cockpit layout's `TenantProvider` immediately resolves mock tenant in development mode — no "Configuracao Pendente" wall
- Leads page: 17 leads rendered with Score/VGV/Status/Bairro Interesse columns
- Financeiro page: summary strip + bar chart above table, ATRASADO rows pulse red in both chart and table
- AI Agent page: already uses `useTenant()` which now returns mock tenant with `activeModules: ["crm","sdr","ia_onboarding"]` — module gate passes, Luana greeting renders

## Known Stubs

- `DEV_BYPASS` in `TenantContext.tsx` line ~62: intentional stub to be removed when auth polish phase begins. Grep: `// DEV_BYPASS: remove when auth is re-enabled`
- `tenantLeadCount = 42` in `ai-agent/page.tsx`: pre-existing hardcoded mock count (not introduced in this task)

## Self-Check: PASSED

- 415bfe3 verified in git log
- a00d6e2 verified in git log
- src/context/TenantContext.tsx modified with DEV_BYPASS block
- src/lib/crm/mock-data.ts has juremaLeads export
- src/app/cockpit/financeiro/page.tsx has 10 MOCK_FINANCE records
- src/components/yzihub/FinanceiroClient.tsx has bar chart + summary strip + pulsating badges
