---
phase: quick
plan: 260402-foe
subsystem: sidebar-plan-gating
tags: [upsell, plan-gating, sidebar, upgrade-modal]
dependency_graph:
  requires: [260402-fab]
  provides: [two-level-plan-gating, tier-aware-upgrade-flow]
  affects: [src/layout/AppSidebar.tsx, src/components/yzihub/UpgradeCard.tsx, src/components/yzihub/UpgradeModal.tsx]
tech_stack:
  added: []
  patterns: [PLAN_RANK hierarchy constant, TIER_CONFIG lookup object]
key_files:
  modified:
    - src/layout/AppSidebar.tsx
    - src/components/yzihub/UpgradeCard.tsx
    - src/components/yzihub/UpgradeModal.tsx
decisions:
  - "Badge text 'PRO' for growth-gated items, 'GROWTH' for enterprise-gated items — matches PRD display names"
  - "PLAN_RANK constant (starter=0, growth=1, enterprise=2) enables future tier comparisons without string comparison"
  - "UpgradeCard shown for both starter AND growth tenants, not just starter"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-02"
  tasks: 2
  files: 3
---

# Quick Task 260402-foe: Implement Two-Level Plan Gating in Sidebar

**One-liner:** Replaced single `proOnly` boolean with `requiredPlan: 'growth' | 'enterprise'` two-level gating — PRO badge on Radar/Trafego (growth gate), GROWTH badge on Conteudo IA (enterprise gate), with contextual UpgradeCard and UpgradeModal per tier.

## What Was Built

Corrected the plan-gating system introduced in 260402-fab from a single flat "starter is blocked" model to a proper two-level PRD-compliant structure:

### AppSidebar (`src/layout/AppSidebar.tsx`)
- Replaced `proOnly?: true` with `requiredPlan?: 'growth' | 'enterprise'` in NavItem type
- Added `PLAN_RANK` constant mapping TenantPlan to numeric rank for comparison
- `isLockedForPlan()` replaces `isLockedForStarter()` — uses rank comparison so logic is future-proof
- Radar and Trafego Pago: `requiredPlan: 'growth'` — shows PRO badge, locked only for starter
- Conteudo IA: `requiredPlan: 'enterprise'` — shows GROWTH badge, locked for starter AND growth
- `upgradeTarget` state tracks which tier was clicked and passes it to UpgradeModal
- UpgradeCard now visible for both starter and growth tenants (enterprise sees none)
- Tenant badge padding logic updated to use `tenant.plan !== 'enterprise'`

### UpgradeCard (`src/components/yzihub/UpgradeCard.tsx`)
- Added `tenantPlan: 'starter' | 'growth'` prop
- Starter: "Evolua seu Growth" / "Desbloqueie o Radar e Trafego Pago no Plano Pro" / "Ver Plano Pro"
- Growth: "Escale com Automacao" / "Desbloqueie Conteudo IA e Social Media no Plano Growth" / "Ver Plano Growth"

### UpgradeModal (`src/components/yzihub/UpgradeModal.tsx`)
- Added `requiredPlan: 'growth' | 'enterprise'` prop
- Replaced static BENEFITS array with `TIER_CONFIG` lookup object keyed by requiredPlan
- Growth config: Pro tier benefits (Radar, Trafego Pago, Relatorios, Suporte Prioritario)
- Enterprise config: Growth tier benefits (Conteudo IA, Social Media Manager, all Pro features, Suporte Dedicado)
- CTA text and WhatsApp link dynamically set from config

## Verification

- TypeScript: `npx tsc --noEmit` — zero errors
- Gating logic: PLAN_RANK comparison ensures starter (0) < growth (1) < enterprise (2)
- Starter tenant: Radar=PRO locked, Trafego=PRO locked, Conteudo IA=GROWTH locked
- Growth tenant: Radar=navigable, Trafego=navigable, Conteudo IA=GROWTH locked
- Enterprise tenant: no badges, no locked items, no UpgradeCard

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 | 53d82b0 | feat(quick-260402-foe-01): refactor AppSidebar gating from proOnly to requiredPlan |
| Task 2 | 7dd3067 | feat(quick-260402-foe-02): update UpgradeCard and UpgradeModal for tier-aware messaging |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all plan goals achieved. WhatsApp number (`5511999999999`) is a placeholder from 260402-fab; will be replaced when real contact is configured.

## Self-Check: PASSED

- `src/layout/AppSidebar.tsx` — exists, contains `requiredPlan`, `PLAN_RANK`, `upgradeTarget`
- `src/components/yzihub/UpgradeCard.tsx` — exists, contains `tenantPlan`
- `src/components/yzihub/UpgradeModal.tsx` — exists, contains `requiredPlan`, `TIER_CONFIG`
- Commits 53d82b0 and 7dd3067 present in git log
