---
phase: quick
plan: 260402-fab
subsystem: sidebar / upsell
tags: [upsell, sidebar, pro-badge, upgrade-modal, monetization]
dependency_graph:
  requires: []
  provides: [UPSELL-CARD, FEATURE-LOCK, UPGRADE-MODAL]
  affects: [src/layout/AppSidebar.tsx]
tech_stack:
  added: []
  patterns: [TailAdmin dark, conditional rendering by tenant plan, state-driven modal]
key_files:
  created:
    - src/components/yzihub/UpgradeCard.tsx
    - src/components/yzihub/UpgradeModal.tsx
  modified:
    - src/layout/AppSidebar.tsx
decisions:
  - proOnly flag added to NavItem type to decouple lock logic from module visibility
  - isVisible now always shows proOnly items (never filters them out)
  - Locked items render as <button> (not <Link>) to prevent navigation
metrics:
  duration: ~10 min
  completed: 2026-04-02
  tasks_completed: 2
  files_changed: 3
---

# Quick Task 260402-fab: Sidebar Upsell Card e Logica PRO

**One-liner:** Badge PRO em modulos bloqueados + UpgradeCard no sidebar + UpgradeModal com CTA WhatsApp para tenants no plano starter.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Criar UpgradeCard e UpgradeModal | 83827a0 | src/components/yzihub/UpgradeCard.tsx, src/components/yzihub/UpgradeModal.tsx |
| 2 | Atualizar AppSidebar com badges PRO, bloqueio e UpgradeCard | 664c555 | src/layout/AppSidebar.tsx |

## What Was Built

### UpgradeCard.tsx
Card visual no rodape do sidebar visivel apenas para tenants `starter` quando o sidebar esta expandido. Gradiente sutil com cor brand, titulo "Evolua seu Growth" e botao "Upgrade Plan" que abre o UpgradeModal.

### UpgradeModal.tsx
Modal overlay (z-[9999]) com lista de 4 beneficios do Plano Pro com checkmarks verdes. Botao CTA "Falar com Consultor" abre WhatsApp via `window.open`. Botao secundario "Agora nao" fecha o modal. Click no overlay tambem fecha.

### AppSidebar.tsx (modificado)
- Novo campo `proOnly?: true` no tipo NavItem
- Items Radar, Trafego Pago e novo item "Conteudo IA" marcados com `proOnly: true`
- `isVisible` atualizado: items `proOnly` sao sempre mostrados (nunca filtrados)
- Items locked renderizam como `<button>` com badge PRO (badge visivel apenas quando sidebar expandido)
- UpgradeCard renderizado acima do tenant badge apenas quando `plan === "starter"` e sidebar expandido
- UpgradeModal integrado via state `upgradeModalOpen`
- Tenants `growth` e `enterprise` nao veem badges nem UpgradeCard

## Behavior by Plan

| Feature | starter | growth | enterprise |
|---------|---------|--------|------------|
| Badge PRO em Radar/Trafego Pago/Conteudo IA | Sim | Nao | Nao |
| Click em item bloqueado → modal | Sim | Nao | Nao |
| UpgradeCard no sidebar | Sim | Nao | Nao |
| Navegacao normal para items PRO | Nao | Sim | Sim |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- WhatsApp number em UpgradeModal hardcoded como `5511999999999` — deve ser substituido pelo numero real do consultor quando disponivel.

## Self-Check: PASSED

- FOUND: src/components/yzihub/UpgradeCard.tsx
- FOUND: src/components/yzihub/UpgradeModal.tsx
- FOUND: src/layout/AppSidebar.tsx
- FOUND commit 83827a0: feat(quick-260402-fab-01): criar UpgradeCard e UpgradeModal
- FOUND commit 664c555: feat(quick-260402-fab-02): atualizar AppSidebar com badges PRO, bloqueio e UpgradeCard
- TypeScript: no errors (npx tsc --noEmit passed)
