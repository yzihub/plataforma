---
phase: quick-260416-lac
plan: "01"
subsystem: brokers-api
tags: [brokers, supabase, api, is_active, drift-fix]
dependency_graph:
  requires: [quick-260416-dj5]
  provides: [BROK-01, BROK-05]
  affects: [GET /api/brokers]
tech_stack:
  added: []
  patterns: [supabase-chained-order]
key_files:
  created: []
  modified:
    - src/app/api/brokers/route.ts
decisions:
  - "Dois .order() encadeados: is_active desc primeiro, created_at desc depois — compativel com Supabase JS v2"
metrics:
  duration: "~5 min"
  completed: "2026-04-16"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase quick-260416-lac Plan 01: Conectar Módulo de Corretores ao Supabase — Summary

**One-liner:** Adicionado `is_active` no SELECT e duplo `.order()` no `GET /api/brokers` para alinhar shape da API com o tipo `Broker` e priorizar corretores ativos.

---

## Descoberta: Módulo já estava conectado ao Supabase

A quick task anterior (`260416-dj5`, commit `a194a22`) já entregou integração completa:

- `CorretoresClient.tsx` usa `supabase.from("brokers").select(...).eq("tenant_id", tenant.id)` para todas as operações (listar, insert, update, delete)
- `CorretorDrawer.tsx` possui toggle `is_active` que chama `onSave` com o campo incluído
- `src/types/brokers.ts` já define `is_active: boolean` no tipo `Broker`
- Migration `is_active` já aplicada na tabela `brokers`

Esta task foi primariamente de auditoria + fechamento de drift residual.

---

## Único Drift Corrigido

**Arquivo:** `src/app/api/brokers/route.ts`

**Problema:** O `.select(...)` do `GET /api/brokers` não incluía `is_active`, causando drift silencioso entre a API e o shape `Broker` esperado pelos consumidores.

**Fix aplicado (commit `ca782bb`):**

```diff
- .select("id, tenant_id, full_name, phone, email, role, created_at, updated_at")
+ .select("id, tenant_id, full_name, phone, email, role, is_active, created_at, updated_at")
  .eq("tenant_id", profile.tenant_id)
+ .order("is_active", { ascending: false })
  .order("created_at", { ascending: false })
```

Corretores ativos (`is_active = true`) aparecem primeiro na resposta; dentro de cada grupo, ordenados por `created_at desc`.

---

## Resultado do tsc

`rtk tsc --noEmit` — 3 erros em 2 arquivos **não relacionados** ao fix:

| Arquivo | Erro | Causa |
|---|---|---|
| `LeadsView.tsx:165` | TS2304 Cannot find name 'UserCircleIcon' | Ícone heroicons ausente — pré-existente |
| `LeadsView.tsx:234` | TS2367 Comparison types no overlap | View type vs 'gallery' — pré-existente |
| `LeadDrawer.tsx:764` | TS2322 ActivityIconComponent not ReactNode | Tipo legado — pré-existente |

Zero erros novos introduzidos pelo fix em `route.ts`.

---

## Instruções para Validação Manual (Task 2 do Plano)

Rodar `pnpm dev` e abrir o Cockpit como tenant Jurema (ou qualquer tenant com `profiles.tenant_id` válido).

Caminho: `/cockpit/corretores`

**Bloco 1 — Listagem (BROK-01, BROK-04, BROK-06):**
- [ ] Página exibe skeleton de loading por alguns ms (não quebra em branco)
- [ ] Lista final mostra apenas corretores do tenant atual
- [ ] Conferir no Supabase Studio > tabela `brokers` que os nomes batem com `tenant_id` correto
- [ ] Nenhum corretor fake ou hardcoded na lista

**Bloco 2 — Criação (BROK-02):**
- [ ] "Novo Corretor" abre drawer vazio
- [ ] Preencher dados e clicar "Criar Corretor" — corretor aparece no topo
- [ ] Supabase Studio: registro com `tenant_id` correto e `is_active = true`

**Bloco 3 — Edição (BROK-02):**
- [ ] "Editar" abre drawer populado
- [ ] Alterar `full_name` e salvar — nome atualizado na lista
- [ ] Supabase Studio: `full_name` atualizado, `updated_at` recente

**Bloco 4 — Toggle ativo/inativo (BROK-03):**
- [ ] Abrir drawer de corretor ATIVO, mudar para Inativo, salvar
- [ ] Badge muda para "Inativo" (cinza) na lista
- [ ] Supabase Studio: `is_active = false`
- [ ] F5 — status permanece Inativo (persistência confirmada)
- [ ] Repetir voltando para Ativo

**Bloco 5 — Tipagem e erros (BROK-05, BROK-06):**
- [ ] DevTools Console sem erros runtime
- [ ] Banner de erro PT-BR ao falhar save (ex: desligar internet)

**Bloco 6 — API drift fix (Task 1):**
- [ ] Abrir `/api/brokers` no browser (logado) — JSON contém `is_active` em cada broker
- [ ] Ativos aparecem antes dos inativos na resposta

**Bloco 7 — Isolamento multi-tenant:**
- [ ] Logar com outro tenant — lista de corretores diferente (sem vazamento)

---

## Deviations from Plan

None — plano executado exatamente como escrito. O módulo já estava conectado ao Supabase; único drift foi `is_active` ausente no GET.

---

## Self-Check: PASSED

- `src/app/api/brokers/route.ts` modificado com `is_active` no SELECT e dois `.order()` encadeados
- Commit `ca782bb` existe em `git log`
- Zero arquivos não relacionados modificados
