---
phase: quick
plan: 260416-t9f
subsystem: crm-leads
tags: [leadcard, leaddrawer, imovel, corretor, handoff]
dependency_graph:
  requires: []
  provides: [lead-card-imovel-corretor, drawer-imovel-rico]
  affects: [LeadCard, LeadDrawer]
tech_stack:
  added: []
  patterns: [inline-svg-icons, prop-drilling-corretores]
key_files:
  created: []
  modified:
    - src/components/yzihub/LeadCard.tsx
    - src/components/yzihub/LeadDrawer.tsx
decisions:
  - Row 3b condicional: só aparece quando há imóvel ou corretor atribuído (evita ruído visual nos cards sem dados)
  - Botão "Enviar para Corretor" sempre visível, fora da condicional de STATUS_ACTIONS
  - Drawer card de imóvel expandido para mostrar até 4 campos: ref, tipo, faixa_valor, região
metrics:
  duration: "8min"
  completed: "2026-04-16"
  tasks_completed: 2
  files_modified: 2
---

# Quick 260416-t9f: Exibir Imóvel e Corretor no Card e Drawer — Summary

LeadCard exibe linha de imóvel (ref ou interesse+região) e corretor por nome com botão "Enviar para Corretor"; LeadDrawer mostra card rico de imóvel com até 4 campos ou fallback elegante.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Adicionar imóvel e corretor ao LeadCard + botão handoff | d71749b | LeadCard.tsx |
| 2 | Enriquecer seção Imóvel Associado no LeadDrawer (TabDados) | d71749b | LeadDrawer.tsx |

## What Was Built

**LeadCard.tsx:**
- Prop `corretores?: Corretor[]` adicionada à interface
- Helper `findCorretorName(assignedTo, corretores)` resolve UUID → nome ou "Sem corretor"
- Helper `getImovelLabel(lead)` retorna: imovel_ref > interesse+região > interesse > ""
- Ícones inline `HouseIcon` e `PersonIcon` (12×12, stroke currentColor)
- Row 3b: mostra imóvel e corretor quando qualquer um estiver disponível
- Botão "Enviar para Corretor" sempre visível em todos os cards, dispara POST /api/actions/execute

**LeadDrawer.tsx (TabDados):**
- Seção "Imóvel Associado" expandida: exibe card rico quando qualquer campo disponível (imovel_ref, interesse_principal, faixa_valor, regiao_interesse)
- Card rico com 4 subseções: Referência (com link "Ver imóvel →"), Tipo, Faixa de valor, Região
- Fallback inalterado: emoji + "Nenhum imóvel associado" + botão "Associar imóvel"
- CorretorCard não alterado (já funcional)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- Botão "Associar imóvel" no fallback do drawer tem `onClick={() => { /* TODO */ }}` — é placeholder intencional do plano, nenhuma modal de seleção foi planejada nesta tarefa.

## Pre-existing TypeScript Errors (not introduced)

- `src/components/yzihub/LeadsView.tsx` L165: `UserCircleIcon` not found — pré-existente
- `src/components/yzihub/LeadDrawer.tsx` L797: `ActivityIconComponent` not assignable to ReactNode — pré-existente (MOCK_ATIVIDADES com componente usado como ReactNode)

## Self-Check: PASSED

- `src/components/yzihub/LeadCard.tsx` — FOUND
- `src/components/yzihub/LeadDrawer.tsx` — FOUND
- Commit d71749b — FOUND
