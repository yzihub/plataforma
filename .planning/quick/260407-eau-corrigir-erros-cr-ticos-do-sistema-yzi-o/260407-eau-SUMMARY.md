---
phase: quick
plan: 260407-eau
subsystem: cockpit
tags: [bugfix, kanban, routing, supabase-client]
one-liner: "Corrigidos 3 erros críticos: createClient no render de ImoveisClient, STAGES incompleto no LeadsKanban (4→8), e rotas 404 em /cockpit/tasks e /cockpit/chat"
completed: 2026-04-07
duration: ~15min
tasks-completed: 3
tasks-total: 3
files-modified: 2
files-created: 2
key-decisions:
  - "createClient() deve ser sempre instanciado dentro de funções async, nunca no corpo do componente React"
  - "STAGES do Kanban de Leads deve cobrir todos os 8 valores de LeadStatus para não perder dados"
---

# Phase quick Plan 260407-eau: Corrigir Erros Criticos do Sistema YZI-OS

## Summary

Corrigidos 3 erros críticos que bloqueavam a navegação e exibição de dados no YZI Cockpit: (1) runtime error em ImoveisClient causado por `createClient()` no corpo do componente, (2) leads desaparecendo do Kanban porque STAGES cobria apenas 4 dos 8 LeadStatus, e (3) rotas /cockpit/tasks e /cockpit/chat retornando 404 por ausência de page.tsx.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Corrigir ImoveisClient — mover createClient para dentro do useEffect | f623c67 | src/components/yzihub/ImoveisClient.tsx |
| 2 | Corrigir LeadsKanban — cobrir todos os 8 LeadStatus | 0dc1240 | src/components/yzihub/LeadsKanban.tsx |
| 3 | Criar páginas /cockpit/tasks e /cockpit/chat | ac72822 | src/app/cockpit/tasks/page.tsx, src/app/cockpit/chat/page.tsx |

## Files Modified

### src/components/yzihub/ImoveisClient.tsx (modified)

**Causa raiz:** `const supabase = createClient()` estava na linha 38, no corpo do componente — executado a cada render. Isso cria uma nova instância do cliente Supabase em cada re-render, causando instabilidade e potencial runtime error antes do contexto estar pronto.

**Correção:** Removida a linha do corpo do componente. Adicionada `const supabase = createClient()` como primeira linha dentro de `fetchProperties()` — chamada apenas dentro do `useEffect`, após verificar que `tenant?.id` está disponível.

### src/components/yzihub/LeadsKanban.tsx (modified)

**Causa raiz:** Array `STAGES` cobria apenas 4 status: `new`, `qualified`, `meeting`, `negotiation`. Os status `contacted`, `proposal`, `won`, `lost` existiam nos dados mas não tinham coluna correspondente — leads com esses status desapareciam completamente da view Kanban.

**Correção:** STAGES expandido para 8 entradas cobrindo todos os valores do type `LeadStatus`: new, contacted, qualified, meeting, proposal, negotiation, won, lost. Cores distintas para cada coluna.

### src/app/cockpit/tasks/page.tsx (criado)

**Causa raiz:** Arquivo não existia — rota /cockpit/tasks retornava 404.

**Implementação:** Server Component com header (título + subtítulo + botão "Nova Tarefa"), empty state com ícone de clipboard SVG e textos orientativos. Padrão visual TailAdmin dark.

### src/app/cockpit/chat/page.tsx (criado)

**Causa raiz:** Arquivo não existia — rota /cockpit/chat retornava 404.

**Implementação:** Server Component com header, área de mensagens vazia com ícone SVG e texto orientativo, barra de input na parte inferior com campo de texto e botão "Enviar" desabilitados. Layout flex coluna ocupando altura disponível.

## Verification Results

- TSC: zero erros nos 4 arquivos modificados/criados
- `createClient` em ImoveisClient: aparece apenas na linha de import e dentro de `fetchProperties()` (linha 60)
- LeadsKanban STAGES: 8 entradas com todos os LeadStatus mapeados
- Ambas as novas páginas existem e passam no TypeScript checker

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `src/app/cockpit/tasks/page.tsx`: botão "Nova Tarefa" sem handler (intencional — funcionalidade de criação de tarefas será implementada em plano futuro)
- `src/app/cockpit/chat/page.tsx`: input e botão "Enviar" desabilitados (intencional — integração com chat real será implementada em plano futuro)

## Self-Check: PASSED

- [x] src/components/yzihub/ImoveisClient.tsx exists and modified
- [x] src/components/yzihub/LeadsKanban.tsx exists and modified
- [x] src/app/cockpit/tasks/page.tsx created
- [x] src/app/cockpit/chat/page.tsx created
- [x] Commit f623c67 exists
- [x] Commit 0dc1240 exists
- [x] Commit ac72822 exists
