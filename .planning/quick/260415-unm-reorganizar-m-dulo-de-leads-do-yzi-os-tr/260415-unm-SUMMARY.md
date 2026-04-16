---
phase: quick-260415-unm
plan: 01
subsystem: leads-module
tags: [leads, crm, ux, table-view, kpi-strip, inline-edit, drawer]
dependency_graph:
  requires: []
  provides: [LeadsKpiStrip, LeadsClient-table-first, LeadsDataTable-inline-edit, LeadDrawer-enriched]
  affects: [cockpit/leads]
tech_stack:
  added: []
  patterns: [optimistic-update, inline-select, kpi-strip, quick-actions-bar]
key_files:
  created:
    - src/components/yzihub/LeadsKpiStrip.tsx
  modified:
    - src/components/yzihub/LeadsClient.tsx
    - src/components/yzihub/LeadsDataTable.tsx
    - src/components/yzihub/LeadDrawer.tsx
decisions:
  - "InlineStatusSelect usa select estilizado com BADGE_COLOR_CLASSES ao invés de overlay Badge (Badge não aceita className prop)"
  - "Corretor card no drawer só renderiza quando corretores.length > 0 (degrada graciosamente)"
  - "LeadsClient inicializa corretores como array vazio com TODO para /api/corretores"
metrics:
  duration: 9min
  completed_date: "2026-04-16"
  tasks_completed: 3
  tasks_total: 4
  files_changed: 4
---

# Phase quick-260415-unm Plan 01: Reorganizar Módulo de Leads — Tabela-First com KPIs

**One-liner:** Tabela como tela principal com faixa de 9 KPI cards clicáveis, edição inline de status/corretor, filtro de origem e drawer enriquecido com QuickActions + CorretorCard + seção Imóvel Associado.

## What Was Built

### Task 1: LeadsKpiStrip + LeadsClient tabela-first
- **LeadsKpiStrip.tsx** (novo): grid responsivo de 9 cards (Total + 8 LeadStatus), clicáveis para filtrar, visual TailAdmin dark com `border-brand-500` no ativo
- **LeadsClient.tsx**: default view sempre `table`, KPI strip renderizada acima da tabela, toggle table/kanban removido do header, Kanban preservado via `?view=kanban`, `handleInlineEdit` com TODO para persist
- Commit: `eaff1a1`

### Task 2: LeadsDataTable — edição inline + filtro de origem
- **InlineStatusSelect**: select estilizado com badge colors por status, atualização otimista
- **InlineCorretorSelect**: select de corretores, degrada para read-only quando `corretores=[]`
- Filtro de origem (`<select>`) ao lado da busca quando `sources` prop fornecida
- Props adicionadas: `sources`, `activeSource`, `onSourceChange`, `corretores`, `onInlineEdit`
- Commit: `6adc046`

### Task 3: LeadDrawer — QuickActions + CorretorCard + Imóvel
- **QuickActionsBar**: faixa com 4 botões (WhatsApp `wa.me/`, Ligar `tel:`, Email `mailto:`, Mover status dropdown), botões desabilitados visualmente quando phone/email ausentes
- **CorretorCard**: card compacto acima das tabs com nome/telefone/email do corretor + inline select para atribuição/troca
- **Seção Imóvel Associado**: card com ref+link `/cockpit/imoveis?ref=...` ou placeholder com CTA "Associar imóvel" (TODO: modal)
- **Seção Interesse Imobiliário**: consolidada em grid 2x2 (tipo, finalidade, região, faixa_valor)
- Prop `corretores?: Corretor[]` adicionada ao interface
- Commit: `e125ff0`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Badge não aceita prop className**
- **Found during:** Task 2 — tentativa de criar overlay visual com `<Badge className="absolute inset-0 pointer-events-none">`
- **Issue:** `BadgeProps` não inclui `className`, TypeScript erro TS2322
- **Fix:** Criado `BADGE_COLOR_CLASSES` mapeando `BadgeColor` → classes Tailwind, aplicado diretamente no `<select>` do InlineStatusSelect
- **Files modified:** `src/components/yzihub/LeadsDataTable.tsx`
- **Commit:** `6adc046` (incluído na mesma task)

## Known Stubs

- `LeadsClient.tsx` L52: `const corretores: Corretor[] = []` — array vazio; integração real pendente via `// TODO: fetch from /api/corretores`
- `LeadDrawer.tsx` — botão "Associar imóvel" sem ação: `// TODO: modal de seleção de imóvel`
- Estes stubs são intencionais: a UI está pronta para receber dados, a integração com `/api/corretores` foi separada para plan futuro

## Checkpoint Pending

Task 4 (checkpoint:human-verify) aguarda verificação manual:
- Abrir http://localhost:3000/cockpit/leads
- Confirmar tabela como view default
- Verificar 9 KPI cards clicáveis com contagens
- Testar edição inline de status
- Testar drawer com QuickActions e seção Imóvel
- Verificar `?view=kanban` ainda funciona

## Self-Check: PASSED

- LeadsKpiStrip.tsx: FOUND `D:/dev/plataforma/src/components/yzihub/LeadsKpiStrip.tsx`
- LeadsClient.tsx: MODIFIED
- LeadsDataTable.tsx: MODIFIED
- LeadDrawer.tsx: MODIFIED
- Commit eaff1a1: FOUND
- Commit 6adc046: FOUND
- Commit e125ff0: FOUND
- `rtk tsc --noEmit`: PASSED (0 errors)
