---
phase: quick-260415-1zp
plan: 01
subsystem: frontend/crm
tags: [kanban, tailadmin, leads, ui, refactor]
dependency_graph:
  requires: []
  provides: [KanbanBoard visual TailAdmin]
  affects: [src/components/yzihub/KanbanBoard.tsx]
tech_stack:
  added: []
  patterns: [TailAdmin dark/light Kanban column/card pattern]
key_files:
  modified:
    - src/components/yzihub/KanbanBoard.tsx
decisions:
  - KanbanBoard agora usa as mesmas classes TailAdmin do PipelineClient para consistencia visual
  - STAGES fixos para o funil de qualificacao inicial (diferente do pipeline de fechamento)
  - Sem drag-and-drop no Kanban de leads — somente onSelectLead para abrir drawer
metrics:
  duration: "~5 min"
  completed_date: "2026-04-15"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-260415-1zp Plan 01: Copiar Kanban TailAdmin para Leads — Colunas Corretas

**One-liner:** KanbanBoard refatorado com classes TailAdmin (border-gray-200, bg-gray-50, rounded-xl) substituindo old-theme (bg-boxdark, bg-meta-4, strokedark), com 5 colunas de qualificacao e cards mostrando nome, telefone, interesse e faixa_valor.

## What Was Built

Reescrita completa do `KanbanBoard.tsx` para espelhar o padrao visual do `PipelineClient.tsx`:

- **5 colunas fixas:** Novo Lead, Lead Quente, Em Qualificacao, Qualificando, Agendamento
- **Coluna:** `rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50`
- **Card:** `rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800 hover:border-brand-300 hover:shadow-md transition-all`
- **Header coluna:** titulo + badge pill com contagem (`bg-gray-100 dark:bg-gray-800 rounded-full`)
- **Card campos:** nome (text-sm font-medium), telefone (text-xs text-gray-400), interesse (tag pill rounded-full), faixa_valor (text-xs font-semibold)
- **Estado vazio:** border-dashed com mensagem "Sem leads nesta etapa"
- **Lead type expandido:** adicionados `telefone?`, `interesse?`, `faixa_valor?` — `valor_imovel?` mantido para retrocompatibilidade

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Reescrever KanbanBoard.tsx com visual TailAdmin | caca81c | src/components/yzihub/KanbanBoard.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. `rtk tsc --noEmit` — passou sem erros
2. Nenhuma classe old-theme encontrada (bg-boxdark, bg-meta-4, strokedark, shadow-default)
3. STAGES contem exatamente as 5 colunas especificadas
4. Nenhum emoji no arquivo (unico char nao-ASCII: U+2014 em dash em comentario)
5. Export `KanbanBoard` e props (leads, onMoveLead, onSelectLead) preservados

## Self-Check: PASSED

- FOUND: src/components/yzihub/KanbanBoard.tsx
- FOUND: commit caca81c
