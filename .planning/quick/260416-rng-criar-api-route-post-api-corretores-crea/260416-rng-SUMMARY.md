---
phase: quick-260416-rng
plan: 01
subsystem: corretores-api
tags: [api-route, webhook, n8n, brokers, create, yzihub-golden-rule]
dependency_graph:
  requires: [quick-260416-ln6]
  provides: [POST /api/corretores/create, BrokerCreatePayload]
  affects: [CorretoresClient.handleSave, src/types/brokers.ts]
tech_stack:
  added: []
  patterns: [server-side webhook proxy, cross-tenant guard, phone normalization]
key_files:
  created:
    - src/app/api/corretores/create/route.ts
  modified:
    - src/types/brokers.ts
    - src/components/yzihub/CorretoresClient.tsx
decisions:
  - Cross-check tenant_id do payload contra profile.tenant_id server-side (anti cross-tenant write)
  - refetchBrokers() separado do useEffect para re-sincronizar lista pós-webhook sem reload
  - Ramo edit/delete mantém Supabase direto (fora do escopo do plano)
metrics:
  duration: ~8min
  completed: "2026-04-16T23:01:58Z"
  tasks: 2
  files: 3
---

# Phase quick-260416-rng Plan 01: API Route POST /api/corretores/create + Webhook n8n Summary

**One-liner:** API route server-side com validação + cross-tenant guard que delega criação de corretores ao webhook n8n https://api.yzihub.com/webhook/corretores, alinhando o módulo à Regra de Ouro YZIHUB.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Criar POST /api/corretores/create + tipagem BrokerCreatePayload | 94486bd | src/types/brokers.ts, src/app/api/corretores/create/route.ts |
| 2 | Ajustar CorretoresClient.handleSave — ramo create usa /api/corretores/create | 28a8b92 | src/components/yzihub/CorretoresClient.tsx |

## What Was Built

### src/app/api/corretores/create/route.ts (NEW)

- `export async function POST(request: Request)` seguindo padrão de `src/app/api/brokers/route.ts`
- Auth via Supabase server (`createClient`, `auth.getUser`, profile lookup) → 401 se falhar
- Parse JSON com try/catch → 400 se inválido
- Validação `name.trim().length >= 2` → 400 com mensagem amigável
- Cross-check `tenant_id` do payload contra `profile.tenant_id` → 403 se divergir
- Normalização `phone.replace(/\D/g, "")` → string de dígitos pura ou null
- Monta `BrokerCreatePayload` sem campo `id`
- `fetch(WEBHOOK_URL, POST)` com try/catch → 502 em falha de conectividade ou status não-ok
- Tolera corpo vazio ou não-JSON na resposta do webhook
- Retorna 201 `{ ok: true, data: webhookResponseOrNull }`

### src/types/brokers.ts (MODIFIED)

Adicionado tipo `BrokerCreatePayload` (append sem remover nada):
- Campos: `tenant_id, name, email, phone, is_active, role, notes?`
- Sem campo `id` — n8n gera/resolve

### src/components/yzihub/CorretoresClient.tsx (MODIFIED)

- Extraída `refetchBrokers()`: query Supabase para re-sincronizar lista pós-criação (n8n persiste, Supabase é a source-of-truth de leitura)
- Ramo `else` (create) substituído: `fetch POST /api/corretores/create` com payload `{ tenant_id, name, email, phone, is_active, role, notes }`
- Em sucesso: `await refetchBrokers()` + fechar drawer
- Em erro: parse da mensagem da API + `throw` propaga para banner existente (`setError`) e `saveError` do drawer
- Ramo `if (id)` (edit via Supabase) intocado
- `handleDelete` intocado

## Decisions Made

1. **Cross-tenant guard server-side:** mesmo que o frontend envie o tenant_id correto, a route valida contra `profile.tenant_id` antes de chamar o webhook. Isso evita escrita cross-tenant por manipulação de payload.

2. **refetchBrokers separado do useEffect:** o `useEffect` carrega brokers + leads juntos no mount/re-render; `refetchBrokers` só recarrega brokers de forma pontual após CREATE, sem interferir no ciclo de vida do componente.

3. **Corpo vazio no webhook tolerado:** `webhookResponse.text()` seguido de `JSON.parse` — se o webhook retornar 200 com corpo vazio (possível em n8n dependendo da configuração), a route retorna `{ ok: true, data: null }` em vez de explodir.

4. **Ramo edit/delete fora do escopo:** unificar edit/delete via n8n é candidato natural para próximo plano, mas foi mantido em Supabase direto para minimizar diff e risco neste plano.

## Deviations from Plan

None — plan executed exactly as written. O tipo da resposta vazia foi tratado com cast `(body as { error?: string })` para satisfazer TypeScript sem criar interface extra.

## Known Stubs

None. O campo `notes: null` no payload do frontend é intencional (reservado para uso futuro, documentado em comentário inline).

## Follow-ups / Pending

- **Update e Delete via webhook:** atualmente em Supabase direto — candidato para próximo plano se unificação via n8n for desejada.
- **Verificação manual:** após merge, testar fluxo completo: abrir `/cockpit/crm/corretores` → "Novo Corretor" → preencher nome + telefone → salvar → verificar que drawer fecha, lista atualiza e webhook n8n processa.
- **Timeout do webhook:** sem timeout configurado no fetch; se o n8n demorar >30s, o usuário verá erro. Considerar timeout explícito em plano futuro.

## Self-Check: PASSED

- src/app/api/corretores/create/route.ts: FOUND
- src/types/brokers.ts exporta BrokerCreatePayload: FOUND
- CorretoresClient.tsx chama /api/corretores/create: FOUND (L183)
- Commit 94486bd: FOUND
- Commit 28a8b92: FOUND
- tsc --noEmit: 3 erros pré-existentes (LeadsView.tsx, LeadDrawer.tsx) — nenhum novo erro introduzido
