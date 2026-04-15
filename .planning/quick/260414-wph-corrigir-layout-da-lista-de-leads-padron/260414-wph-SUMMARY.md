---
phase: quick-260414-wph
plan: 01
subsystem: frontend/leads-ui
tags: [ui, layout, tailadmin, leads, dark-mode]
dependency_graph:
  requires: []
  provides: [LeadsClient-toolbar-standard, LeadsDataTable-cells-standard]
  affects: [src/components/yzihub/LeadsClient.tsx, src/components/yzihub/LeadsDataTable.tsx]
tech_stack:
  added: []
  patterns: [TailAdmin dark tokens, rounded-xl inputs, brand-500 CTA, py-3.5 px-5 cells]
key_files:
  modified:
    - src/components/yzihub/LeadsClient.tsx
    - src/components/yzihub/LeadsDataTable.tsx
decisions:
  - "Selects recebem min-w-[160px] para evitar esmagamento quando flex-1 do input expande"
  - "View toggle usa p-2 (era p-1.5) para area clicavel maior — consistente com UX"
  - "align-middle na tr de dados em vez de nas td individuais — mais conciso"
metrics:
  duration: ~10min
  completed_date: "2026-04-14"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 2
---

# Quick 260414-wph: Corrigir Layout da Lista de Leads — Padronizar TailAdmin

**One-liner:** Toolbar e tabela de leads alinhadas ao padrao TailAdmin dark (rounded-xl, py-2.5, brand-500, divide-gray-800) para consistencia visual com Corretores e Imoveis.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Padronizar toolbar e header em LeadsClient.tsx | b9dd984 | src/components/yzihub/LeadsClient.tsx |
| 2 | Padronizar celulas, header e empty-state em LeadsDataTable.tsx | e4cfddf | src/components/yzihub/LeadsDataTable.tsx |
| 3 | Validacao visual em /cockpit/leads | CHECKPOINT — awaiting human verify | — |

## Changes Applied

### Task 1 — LeadsClient.tsx

- `gap-2` → `gap-3` no grupo direito do header row (botao + toggle)
- `dark:border-gray-700` → `dark:border-gray-800` no wrapper do view toggle (alinhamento com tokens globais)
- `p-1.5` → `p-2` nos botoes internos do view toggle (area clicavel maior)
- Adicionado `shrink-0` ao botao "Novo Lead" (evita compressao em telas estreitas)
- Adicionado `min-w-[160px]` nos dois selects da SearchBar (evita esmagamento ao lado do flex-1)

### Task 2 — LeadsDataTable.tsx

- Adicionado `w-[120px]` na celula header da coluna de acao (evita colapso da coluna "Ver detalhes")
- Adicionado `align-middle` na `<tr>` de dados (alinhamento vertical uniforme entre celulas de alturas diferentes)
- `py-16` → `py-20` no empty-state (mais respiro vertical)
- `size-10` → `size-12` no icone UserCircleIcon do empty-state (presenca visual maior)

## Checkpoint Pending

**Task 3** e um `checkpoint:human-verify`. O executor parou aqui aguardando aprovacao visual.

**Como verificar:**
1. `pnpm dev` (servidor de dev)
2. Abrir http://localhost:3000/cockpit/leads em dark mode
3. Conferir titulo + view toggle + botao "Novo Lead" alinhados
4. Conferir selects com largura adequada ao lado do campo de busca
5. Conferir tabela com header caps, linhas com hover suave, celulas alinhadas
6. Comparar com /cockpit/corretores — padrao deve ser identico
7. Clicar em linha — LeadDrawer deve abrir normalmente
8. Alternar table/kanban — toggle deve funcionar

**Sinal de retomada:** "approved" ou descricao de ajustes pendentes.

## Deviations from Plan

None — plan executado exatamente como escrito.

## Known Stubs

None — sem dados mockados ou placeholders introduzidos.

## Self-Check

- [x] src/components/yzihub/LeadsClient.tsx modificado e commitado (b9dd984)
- [x] src/components/yzihub/LeadsDataTable.tsx modificado e commitado (e4cfddf)
- [x] rtk tsc --noEmit passou sem erros novos em ambas as tarefas
- [x] Nenhuma logica, tipo, prop ou handler foi alterado — apenas classes CSS
- [ ] Task 3 (validacao visual) — pendente checkpoint humano

## Self-Check: PASSED (tasks 1-2)
