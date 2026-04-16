---
phase: quick-260416-dj5
plan: 01
subsystem: corretores
tags: [kpi-strip, is_active, toggle, ranking, supabase-migration, tailadmin]
dependency_graph:
  requires: [014_brokers_table.sql]
  provides: [CorretoresKpiStrip, is_active field, broker ranking]
  affects: [CorretoresClient, CorretorDrawer, brokers table schema]
tech_stack:
  added: []
  patterns: [TailAdmin dark card pattern, inline toggle switch, parallel Supabase fetch]
key_files:
  created:
    - supabase/migrations/015_brokers_add_is_active.sql
    - src/components/yzihub/CorretoresKpiStrip.tsx
  modified:
    - src/types/brokers.ts
    - src/components/yzihub/CorretoresClient.tsx
    - src/components/yzihub/CorretorDrawer.tsx
decisions:
  - KPI strip sem estado de clique — apenas metricas, nao filtro (diferente do LeadsKpiStrip)
  - Top Corretor exibe apenas o primeiro nome para caber no card
  - Ranking mostra top 5 mesmo quando leadCounts e zero — exibe contagem 0 ao inves de omitir
  - Toggle switch CSS inline sem lib externa (pattern do plano mantido)
metrics:
  duration: 15min
  completed_date: "2026-04-16"
  tasks_completed: 3
  files_changed: 5
---

# Phase quick-260416-dj5 Plan 01: Incrementar Pagina Corretores — KPI Strip + is_active + Ranking Summary

**One-liner:** KPI strip TailAdmin (4 cards: Total/Ativos/Inativos/Top Corretor), migration is_active, badge de status na tabela, toggle ativo/inativo no drawer, e ranking top 5 por leads.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration is_active + tipo Broker atualizado | 90e1f08 | supabase/migrations/015_brokers_add_is_active.sql, src/types/brokers.ts |
| 2 | CorretoresKpiStrip + ranking + integrar no CorretoresClient | 176ea32 | src/components/yzihub/CorretoresKpiStrip.tsx, src/components/yzihub/CorretoresClient.tsx |
| 3 | Toggle ativo/inativo no CorretorDrawer | a194a22 | src/components/yzihub/CorretorDrawer.tsx |

## What Was Built

- **Migration SQL** (`015_brokers_add_is_active.sql`): Adiciona coluna `is_active BOOLEAN NOT NULL DEFAULT true` na tabela `brokers` via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- **Tipo Broker atualizado** (`src/types/brokers.ts`): Campo `is_active: boolean` adicionado ao interface Broker e ao BrokerInput.
- **CorretoresKpiStrip** (`src/components/yzihub/CorretoresKpiStrip.tsx`): Componente novo com 4 cards em grid-cols-2 sm:grid-cols-4. Usa GroupIcon, CheckCircleIcon, CloseLineIcon, ShootingStarIcon de @/icons. Visual identico ao LeadsKpiStrip (rounded-2xl border p-4, icon w-10 h-10 rounded-xl). Sem estado de clique.
- **CorretoresClient atualizado**: Fetch paralelo de leads via Promise.all, calculo de leadCounts via useMemo, KPI strip acima do header, colunas Status (badge) e Leads na tabela (7 colunas total), secao Ranking top 5 abaixo da tabela.
- **CorretorDrawer atualizado**: Toggle switch inline sem lib externa acima do campo Funcao. Default is_active=true para novos corretores. Sync com broker.is_active no useEffect. Persistencia via onSave.

## Deviations from Plan

None — plano executado exatamente como escrito.

## Verification

- `rtk tsc --noEmit`: 3 erros remanescentes em LeadsView.tsx e LeadDrawer.tsx — pre-existentes, fora do escopo desta task. Zero erros novos introduzidos.
- `rtk next build`: Errors: 0 | Warnings: 0
- Pagina /cockpit/corretores: KPI strip (4 cards) + tabela com Status/Leads + ranking + drawer com toggle pronto para verificacao em runtime.

## Known Stubs

None — todos os dados fluem do Supabase em runtime. KPI strip e ranking dependem de dados reais (brokers + leads) sem mock.

## Self-Check: PASSED

- supabase/migrations/015_brokers_add_is_active.sql: FOUND
- src/components/yzihub/CorretoresKpiStrip.tsx: FOUND
- src/types/brokers.ts: FOUND (is_active presente)
- src/components/yzihub/CorretoresClient.tsx: FOUND
- src/components/yzihub/CorretorDrawer.tsx: FOUND
- Commits: 90e1f08, 176ea32, a194a22: FOUND
