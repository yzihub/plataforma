---
phase: quick-260414-oyb
plan: 01
subsystem: frontend-crm
tags: [brokers, crud, supabase, tenant-isolation, drawer]
dependency_graph:
  requires: [quick-260414-olz]
  provides: [brokers-crud-complete]
  affects: [cockpit-corretores]
tech_stack:
  added: []
  patterns: [supabase-client-rls, optimistic-ui-update, dismissible-error-banner]
key_files:
  created: []
  modified:
    - src/components/yzihub/CorretoresClient.tsx
    - src/components/yzihub/CorretorDrawer.tsx
decisions:
  - "Mantida abordagem supabase client direto (sem /api/brokers) — RLS é a defesa primária, eq(tenant_id) é defesa em profundidade"
  - "Botao Excluir usa window.confirm nativo — sem modal customizado para manter escopo minimal"
  - "handleSave re-throws apos setError para que o drawer tambem exiba seu saveError local"
metrics:
  duration: "~10 min"
  completed_date: "2026-04-14"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 2
---

# Quick 260414-oyb: Validar CRUD de Corretores no Frontend — Summary

**One-liner:** DELETE de corretores com eq(tenant_id) + banner de erro dismissivel + botao Excluir no drawer em modo edicao.

## What Was Built

Completado o CRUD de corretores na tela `/cockpit/corretores`. O scaffold anterior (GET + CREATE + UPDATE + loading/empty state) foi estendido com:

1. **handleDelete** em `CorretoresClient` — chama `supabase.from('brokers').delete().eq('id', id).eq('tenant_id', tenant.id)`, remove do state local em caso de sucesso, seta `error` em caso de falha.

2. **Banner de erro dismissivel** acima do header — aparece quando `error !== null`, tem botao X para fechar. Resetado ao abrir drawer (openNewDrawer / openEditDrawer).

3. **handleSave envolto em try/catch** — seta `error` no catch (antes lancava throw sem UI).

4. **Prop `onDelete?`** no `CorretorDrawer` — estado `deleting` local, botao "Excluir" visivel apenas em modo edicao (broker !== null), `window.confirm('Excluir corretor?')` antes de chamar `onDelete(broker.id)`.

5. **Botoes desabilitados** durante `deleting` (ambos Excluir e Salvar).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Adicionar handleDelete + estado de erro no CorretoresClient | 6129e67 | CorretoresClient.tsx |
| 2 | Adicionar acao Excluir no CorretorDrawer (modo edicao) | 6129e67 | CorretorDrawer.tsx |
| 3 | Validacao manual end-to-end | CHECKPOINT — aguardando aprovacao | — |

## Decisions Made

- Mantida arquitetura existente (supabase client direto, sem rota /api/brokers) — conforme instrucao do plano.
- `handleSave` re-throws a excecao apos `setError` para que o drawer tambem exiba `saveError` localmente — double feedback intencional.
- Botao Excluir alinhado a esquerda, Salvar ocupa o flex-1 restante — sem alterar layout geral do drawer.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — todos os handlers estao conectados a Supabase com dados reais.

## Self-Check: PASSED

- src/components/yzihub/CorretoresClient.tsx: FOUND (committed 6129e67)
- src/components/yzihub/CorretorDrawer.tsx: FOUND (committed 6129e67)
- TypeScript: compila sem erros (rtk tsc --noEmit passed)
- Task 3 (checkpoint:human-verify): aguardando validacao manual do usuario
