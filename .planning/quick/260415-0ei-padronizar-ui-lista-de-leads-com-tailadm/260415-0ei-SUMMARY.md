---
phase: quick-260415-0ei
plan: 01
subsystem: frontend/crm
tags: [ui, leads, table, toolbar, tailadmin, layout]
dependency_graph:
  requires: [260414-wph]
  provides: [leads-table-clean-layout]
  affects: [LeadsClient, LeadsDataTable]
tech_stack:
  added: []
  patterns: [colgroup-widths, per-row-border-b, flex-wrap-toolbar]
key_files:
  modified:
    - src/components/yzihub/LeadsClient.tsx
    - src/components/yzihub/LeadsDataTable.tsx
decisions:
  - "Colgroup com 9 cols percentuais (100%) para controlar overflow sem min-w-full"
  - "border-b por linha (not divide-y) para compatibilidade com hover/ativo"
  - "TableHeader sem className — separacao visual via bg do TableRow interno"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-15"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 2
---

# Quick Task 260415-0ei: Padronizar UI Lista de Leads (Segunda Passagem) — Summary

**One-liner:** Eliminacao estrutural de bordas duplicadas, scrollbar horizontal e toolbar fragmentada na lista de leads via colgroup percentual, border-b por linha e flex-wrap no SearchBar.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Unificar toolbar LeadsClient | 3b84083 | src/components/yzihub/LeadsClient.tsx |
| 2 | Limpar bordas/bordas e fixar larguras LeadsDataTable | a691a83 | src/components/yzihub/LeadsDataTable.tsx |
| 3 | Validacao visual (checkpoint) | — | aguardando aprovacao |

## What Was Built

### Task 1 — LeadsClient.tsx: Toolbar unificada

- SearchBar wrapper: `flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center` (adicionado `flex-wrap` para quebra elegante em tablet)
- Input de busca: adicionado `min-w-[240px]` para nao comprimir em breakpoints medios
- Grupo direito (toggle + CTA): `gap-3` → `gap-2` (mais compacto, alinhado com CorretoresClient)
- Botao "Novo Lead": adicionado `type="button"` para nao virar submit acidental

### Task 2 — LeadsDataTable.tsx: Layout estrutural limpo

- `<Table className="w-full">` — forcado `w-full` para anular o `min-w-full` default (elimina scrollbar horizontal)
- `<colgroup>` com 9 colunas percentuais totalizando 100%: Nome 18%, WhatsApp 12%, Status 11%, Score 9%, Bairro 10%, Corretor 10%, Origem 9%, Valor 11%, Acoes 10%
- `<TableHeader>` sem className — removido `border-b border-gray-100 dark:border-gray-800` (causa da barra duplicada)
- Array de headers: ultimo item `""` → `"Ações"` (elimina header vazio e warning de key duplicada)
- `<TableBody>` sem className — removido `divide-y divide-gray-50 dark:divide-gray-800`
- Cada `<tr>` de dados: adicionado `border-b border-gray-50 dark:border-gray-800/60 last:border-0` (divisor por linha, sem colisao com hover)
- Empty-state `<tr>`: adicionado `className="border-b-0"`, icone `size-14`, padding `py-16`
- Celula Corretor: adicionado `truncate`
- Celula Origem: adicionado `truncate`

## Deviations from Plan

None — plano executado exatamente como escrito.

## Known Stubs

None — sem dados mockados ou placeholders nos arquivos modificados. Os dados vem de `initialLeads` (prop real do Supabase via page.tsx).

## Self-Check

- [x] `src/components/yzihub/LeadsClient.tsx` modificado e commitado (3b84083)
- [x] `src/components/yzihub/LeadsDataTable.tsx` modificado e commitado (a691a83)
- [x] `rtk tsc --noEmit` passou sem erros novos
- [x] Nenhuma mudanca de logica, types, filtros ou props
- [x] Colgroup com 9 cols presente
- [x] Header "Acoes" (nao vazio)
- [x] `border-b` por linha substituiu `divide-y`
- [x] `TableHeader` sem `border-b` class

## Self-Check: PASSED
