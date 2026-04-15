---
phase: quick-260415-fcb
plan: 01
subsystem: frontend/crm
tags: [pipeline, dashboard, tailadmin, crm, jurema, corretores]
dependency_graph:
  requires: [src/lib/crm/types.ts, src/lib/crm/mock-data.ts, supabase/corretores]
  provides: [/cockpit/pipeline dashboard operacional]
  affects: [src/app/cockpit/pipeline/page.tsx]
tech_stack:
  added: [src/components/yzihub/pipeline/]
  patterns: [TailAdmin dark cards, CSS-only charts (divs+Tailwind), inline memory filtering]
key_files:
  created:
    - src/components/yzihub/pipeline/PipelineHeader.tsx
    - src/components/yzihub/pipeline/PipelineAlerts.tsx
    - src/components/yzihub/pipeline/PipelineKPIs.tsx
    - src/components/yzihub/pipeline/PipelineCharts.tsx
    - src/components/yzihub/pipeline/PipelineLeadsList.tsx
    - src/components/yzihub/pipeline/AssignBrokerModal.tsx
    - src/components/yzihub/PipelineDashboardClient.tsx
  modified:
    - src/app/cockpit/pipeline/page.tsx
decisions:
  - Pipeline = dashboard operacional (Header+Alerts+KPIs+Charts+Lista), kanban apenas em /leads
  - CSS-only charts via divs + Tailwind (sem libs externas, consistência TailAdmin)
  - Fetch de corretores com fallback [] se tabela não existir (não bloqueia render)
  - onConfirm do modal é console.log — POST /api/actions/execute é task futura
metrics:
  duration: "~25 minutes"
  completed: "2026-04-15"
  tasks_completed: 2
  files_created: 7
  files_modified: 1
---

# Quick 260415-fcb: Pipeline Dashboard Operacional — Summary

**One-liner:** Dashboard operacional /cockpit/pipeline com 5 blocos TailAdmin dark (Header/Alerts/KPIs/Charts/Lista) substituindo kanban, com modal de atribuição de corretor e filtros em memória.

## What Was Built

Reestruturação completa da rota `/cockpit/pipeline` como dashboard operacional de tomada de decisão. A página agora segue a Lei da Variedade Visual do CLAUDE.md: kanban fica em `/cockpit/leads`, pipeline é o dashboard do gestor.

### Bloco 1: PipelineHeader
- Breadcrumb "Cockpit / Pipeline"
- 3 dropdowns estilizados TailAdmin (`<select>`): Corretor, Período (7d/30d/90d), Origem
- Botões de ação: "Exportar" (secondary) e "Novo Lead" (primary brand)

### Bloco 2: PipelineAlerts
- 3 cards de alertas operacionais computados em tempo real:
  - Leads sem corretor (`assigned_to === null`)
  - Leads parados há mais de 3 dias (`last_action_at`)
  - Leads quentes sem follow-up (`score >= 80` + status new/contacted/qualified)
- Cada card com ícone colorido, contador grande e botão "Ver"

### Bloco 3: PipelineKPIs
- Grid 2→6 colunas, 1 card por stage do pipeline
- Badge de variação % (pseudo-random estável por stage.id, sem hydration mismatch)
- Progress bar mostrando % do total de leads

### Bloco 4: PipelineCharts
- 3 colunas com visualizações CSS-only (sem libs de gráfico externas):
  - Funil de leads por stage (barras horizontais com cor do stage)
  - Origem dos leads (barras de progresso + contadores)
  - Performance por corretor (avatar com initials + bar de conversão)
- Handles both named brokers (from DB) and legacy assignments (luana/nina from mock)

### Bloco 5: PipelineLeadsList
- Lista vertical com tabs: Todos / Sem corretor / Parados / Quentes
- Cada row: avatar do corretor (ou placeholder "?"), nome/phone/source, badge de status colorido
- "Parado há X dias" em vermelho quando aplicável
- Button group: "Enviar p/ corretor" (primary) OU "Alterar corretor" (secondary) + "Ver detalhes"

### AssignBrokerModal
- Modal TailAdmin dark com backdrop blur
- Título dinâmico por mode (assign/reassign)
- Select de brokers + Cancelar/Confirmar
- Confirmar chama prop (console.log por ora — POST /api/actions/execute é task futura)

### PipelineDashboardClient (orquestrador)
- Filtros em memória (brokerId, period, source)
- Estado do modal centralizado
- Orquestra os 5 blocos como composição vertical

### pipeline/page.tsx (server component)
- Mantém fetchPipelineData() existente
- Adiciona fetch paralelo de `corretores` com fallback `[]`
- Usa PipelineDashboardClient (não mais PipelineClient)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | c9143a4 | 6 componentes modulares em src/components/yzihub/pipeline/ |
| Task 2 | 1e75046 | PipelineDashboardClient + pipeline/page.tsx atualizada |

## Deviations from Plan

None — plan executed exactly as written.

PipelineCharts.tsx recebeu `stages` como prop adicional (não estava no plano) para renderizar as barras do funil com as cores corretas do stage (`stage.color`). Isso é uma melhoria de correção, não um desvio arquitetural.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `console.log("assign", leadId, brokerId)` | PipelineDashboardClient.tsx | POST /api/actions/execute é task futura conforme plano |
| Badge variação % KPI | PipelineKPIs.tsx | Cálculo real requer dados históricos — mock estável por stage.id |

## Self-Check: PASSED

- src/components/yzihub/pipeline/PipelineHeader.tsx: FOUND
- src/components/yzihub/pipeline/PipelineAlerts.tsx: FOUND
- src/components/yzihub/pipeline/PipelineKPIs.tsx: FOUND
- src/components/yzihub/pipeline/PipelineCharts.tsx: FOUND
- src/components/yzihub/pipeline/PipelineLeadsList.tsx: FOUND
- src/components/yzihub/pipeline/AssignBrokerModal.tsx: FOUND
- src/components/yzihub/PipelineDashboardClient.tsx: FOUND
- src/app/cockpit/pipeline/page.tsx: modified (uses PipelineDashboardClient)
- Build: PASSED (exit 0, /cockpit/pipeline compiled as dynamic route)
- Type-check: PASSED (tsc --noEmit clean)
