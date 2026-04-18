---
phase: quick-260418-go0
plan: "01"
subsystem: yzihub-crm-leaddrawer
tags: [combobox, imoveis, leaddrawer, crm, uuid, n8n]
dependency_graph:
  requires: [/api/imoveis, N8nImovel type]
  provides: [ImovelSearchSelect component, imovel_ref UUID persistence in leads]
  affects: [LeadDrawer, POST/PATCH /api/leads payload, GerarContratoDrawer]
tech_stack:
  added: []
  patterns: [custom combobox sem libs externas, fetch on mount, client-side filter]
key_files:
  created:
    - src/components/yzihub/ImovelSearchSelect.tsx
  modified:
    - src/components/yzihub/LeadDrawer.tsx
decisions:
  - "Client-side filter (nao server-side): lista de imoveis por tenant e pequena (<200), fetch unico no mount e suficiente, sem latencia por keystroke"
  - "Implementacao custom sem libs externas (@headlessui, downshift, etc.) para manter consistencia visual com TailAdmin dark ja usado"
  - "Estado selectedImovel dentro de TabDados (nao elevado para LeadDrawer): evita prop drilling desnecessario, componente ja gerencia form interno"
  - "Fallback 'Ref: {uuid.slice(0,8)}...' para ids orfaos: preserva UX sem quebrar leads antigos com imovel_ref texto livre"
metrics:
  duration: "~25min"
  completed_date: "2026-04-18"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase quick-260418-go0 Plan 01: Campo Referencia do Imovel com Combobox Pesquisavel no LeadDrawer

**One-liner:** Substituiu input texto livre por combobox pesquisavel com fetch real de /api/imoveis, persistindo id_imovel (UUID) em lead.imovel_ref para habilitar integracoes n8n (consultar_imoveis, gerar_contrato).

## Arquivos Criados/Modificados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/yzihub/ImovelSearchSelect.tsx` | Criado | Combobox pesquisavel reutilizavel — fetch /api/imoveis, filtro client-side, dark mode |
| `src/components/yzihub/LeadDrawer.tsx` | Modificado | Import + estado selectedImovel + ImovelSearchSelect em 2 secoes + display legivel em Imovel Associado |

## Commits

| Task | Commit | Descricao |
|------|--------|-----------|
| Task 1 | `3fc9fa2` | feat(quick-260418-go0): criar ImovelSearchSelect |
| Task 2 | `9a84350` | feat(quick-260418-go0): integrar ImovelSearchSelect no LeadDrawer |

## Decisions Made

1. **Client-side filter vs server-side:** A lista de imoveis de um tenant e pequena (<200 registros tipicamente). Fetch unico no mount + filtro em memoria elimina latencia por keystroke e reduz load no banco. Se a lista crescer alem de 200, adicionar ?q= param na API e debounce.

2. **Custom combobox sem libs externas:** `@headlessui/react` nao esta no projeto e adicionar dependencia apenas para um combobox e overengineering. A implementacao custom com `input + ul` e consistente com o padrao TailAdmin dark ja em uso no projeto.

3. **Estado selectedImovel em TabDados:** O estado e necessario apenas para exibir o titulo legivel na secao "Imovel Associado". Elevar para LeadDrawer causaria prop drilling. TabDados ja gerencia todo o form state internamente.

4. **Fallback UUID truncado:** Leads existentes podem ter imovel_ref como texto livre (ex: "Apto Manaira") ou UUID de imovel deletado. O fallback `Ref: {uuid.slice(0,8)}...` preserva visibilidade sem quebrar a UI.

## Como Testar Manualmente

1. Abrir `/cockpit/leads`
2. Clicar "Novo Lead" → secao "Perfil Imobiliario" mostra combobox "Buscar imovel por titulo ou bairro..."
3. Clicar no campo → dropdown com imoveis reais do Jurema aparece
4. Digitar "mana" (ou outro bairro) → lista filtra em tempo real
5. Selecionar um imovel → label visivel e "Titulo · Bairro", nao UUID
6. Salvar → lead criado com sucesso
7. Reabrir o lead criado → aba Dados → secao "Interesse Imobiliario" mostra ImovelSearchSelect com imovel selecionado
8. Secao "Imovel Associado" mostra titulo legivel
9. Verificar no Supabase: `select imovel_ref from leads where id = '<novo-id>';` retorna UUID (36 chars)

## Verificacao Tecnica

- `rtk tsc --noEmit`: 1 erro pre-existente (L828, ACTIVITY_ICON rendering — fora do escopo desta task)
- `rtk next build`: Errors: 0 | Warnings: 0

## Deviations from Plan

None — plano executado exatamente como especificado.

Nota: O erro TypeScript em LeadDrawer.tsx L828 (`ACTIVITY_ICON[a.tipo]` renderizando tipo de componente diretamente como ReactNode) e pre-existente e fora do escopo desta task. Registrado como deferred item.

## Follow-ups Opcionais

1. **Cache global de imoveis via Context:** Se `ImovelSearchSelect` for usado em multiplos lugares simultaneamente (ex: varias drawers abertas), um `ImovelContext` evitaria fetches duplicados.
2. **Server-side filter se lista >200 imoveis:** Adicionar `?q=<query>` no GET /api/imoveis com debounce de 300ms.
3. **Corrigir ACTIVITY_ICON rendering:** Substituir `{ACTIVITY_ICON[a.tipo]}` por `<ACTIVITY_ICON_MAP[a.tipo] />` (instantiate como componente).
4. **Titulo do imovel em GerarContratoDrawer:** `propertyTitle` recebe `lead.imovel_ref` (UUID). Idealmente passaria o titulo real. Resolver via Context global de imoveis ou prop adicional.

## Self-Check: PASSED

- FOUND: src/components/yzihub/ImovelSearchSelect.tsx
- FOUND: src/components/yzihub/LeadDrawer.tsx
- FOUND: commit 3fc9fa2 (Task 1)
- FOUND: commit 9a84350 (Task 2)
