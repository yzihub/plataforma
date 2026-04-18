# Quick Task 260418-8gp — Summary

**Date:** 2026-04-18
**Status:** Completed

## What Was Done

### src/types/brokers.ts
- Expandida interface `Broker` com 13 campos novos: `tipo`, `cpf`, `address`, `city`, `state`, `zip_code`, `bank`, `bank_agency`, `bank_account`, `bank_account_type`, `pix_key`, `pix_key_type`, `pix_beneficiary`, `notes`
- `BrokerInput` convertida de `Pick<Broker, ...>` para interface explícita com os mesmos campos
- `BrokerCreatePayload` atualizado com todos os campos novos

### src/components/yzihub/CorretorDrawer.tsx
- Formulário reescrito com 4 seções: **Dados Pessoais** / **Endereço** / **Financeiro & PIX** / **Observações**
- 20 campos no total, incluindo selects para tipo de conta bancária e tipo de chave PIX
- Padrão visual TailAdmin dark mantido (mesmos `fieldCls`/`labelCls` do PropertyDrawer)
- Corrigido bug: `full_name` → `name` em todos os usos

### src/components/yzihub/CorretoresClient.tsx
- Select Supabase expandido para buscar todos os 24 campos novos
- Payload do POST /api/corretores/create atualizado para enviar todos os campos
- Corrigido full_name → name no refetch

### src/components/yzihub/CorretoresKpiStrip.tsx
- Adicionada prop `wonCounts?` opcional (correção de tipo)
- Corrigido `full_name` → `name`

### src/app/api/corretores/create/route.ts
- Normalização e envio de todos os campos novos no `webhookPayload`

### src/components/yzihub/LeadsDataTable.tsx
- Corrigido `full_name` → `name` (bug pré-existente, descoberto pelo tsc)

## Result

TypeScript: 0 erros novos introduzidos. 1 erro pré-existente no LeadDrawer.tsx (não relacionado a esta task).
