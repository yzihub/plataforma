---
phase: quick-260418-ag6
plan: 01
subsystem: crm-contracts
tags: [contracts, drawer, lead, job_queue, n8n, webhook]
dependency_graph:
  requires: [LeadDrawer, job_queue table, /api/contracts pattern]
  provides: [GerarContratoDrawer, POST /api/contracts/generate]
  affects: [LeadDrawer, job_queue]
tech_stack:
  added: []
  patterns: [job_queue action flow, TailAdmin dark drawer pattern, pre-fill from Lead props]
key_files:
  created:
    - src/components/yzihub/Contratos/GerarContratoDrawer.tsx
    - src/app/api/contracts/generate/route.ts
  modified:
    - src/components/yzihub/LeadDrawer.tsx
decisions:
  - Botao Novo Contrato inserido no header do LeadDrawer (junto ao Excluir) para maxima visibilidade sem alterar layout de tabs
  - GerarContratoDrawer recebe brokerName e propertyTitle via props do LeadDrawer (nao fetch interno) para manter consistencia com dados ja carregados
  - API route valida apenas modelo (campo obrigatorio); demais campos sao opcionais para flexibilidade
metrics:
  duration: ~11min
  completed: "2026-04-18T14:07:51Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase quick-260418-ag6 Plan 01: Tela de Geracao de Contrato no LeadDrawer — Summary

**One-liner:** Drawer TailAdmin dark de geracao de contrato com 6 modelos, pre-fill do lead, checkboxes de canal e POST /api/contracts/generate via job_queue para n8n.

## What Was Built

Adicionada acao "Novo Contrato" ao LeadDrawer que abre um drawer lateral pre-preenchido com dados do lead. O usuario pode selecionar 1 dos 6 modelos de contrato, revisar/editar todos os campos, escolher canais de envio (WhatsApp, Email) e disparar a geracao via webhook n8n — sem sair da tela de leads.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar GerarContratoDrawer com 6 modelos, pre-fill e canais de envio | c1e6818 | src/components/yzihub/Contratos/GerarContratoDrawer.tsx |
| 2 | API route /api/contracts/generate + wiring no LeadDrawer | f5014c5 | src/app/api/contracts/generate/route.ts, src/components/yzihub/LeadDrawer.tsx |

## Architecture

**Flow:**
1. Usuario abre LeadDrawer → clica "Novo Contrato" no header
2. GerarContratoDrawer abre com dados pre-preenchidos (lead.name, lead.notes, lead.value, imovel_ref, brokerName)
3. Usuario seleciona modelo, revisa campos, marca canais
4. "Gerar e Enviar" → POST /api/contracts/generate
5. API autentica, busca tenant_id, insere em job_queue com action="gerar_contrato"
6. n8n consome job_queue e executa workflow de geracao

**GerarContratoDrawer Props:**
- `isOpen`, `onClose`: controle de visibilidade
- `lead: Lead | null`: pre-fill base
- `brokerName?: string | null`: pre-fill corretor (ja resolvido pelo LeadDrawer)
- `propertyTitle?: string | null`: pre-fill imovel (lead.imovel_ref)

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `rtk tsc --noEmit`: 1 erro pre-existente em LeadDrawer.tsx L798 (ACTIVITY_ICON rendering) — zero erros novos introduzidos
- GerarContratoDrawer.tsx existe em src/components/yzihub/Contratos/
- src/app/api/contracts/generate/route.ts existe
- LeadDrawer importa GerarContratoDrawer (linha 20) e monta o componente (linha 1134)
- Botao "Novo Contrato" adicionado no header do drawer (junto aos controles de excluir/fechar)

## Known Stubs

None. O formulario envia dados reais ao job_queue. Pre-fill usa dados reais do lead.

## Self-Check: PASSED

- FOUND: src/components/yzihub/Contratos/GerarContratoDrawer.tsx
- FOUND: src/app/api/contracts/generate/route.ts
- FOUND commit c1e6818 (Task 1)
- FOUND commit f5014c5 (Task 2)
