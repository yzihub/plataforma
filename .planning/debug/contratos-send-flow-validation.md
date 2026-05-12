---
status: awaiting_human_verify
trigger: "Validar fluxo de envio de contratos ponta a ponta — email, whatsapp e ambos. Confirmar atualização de status."
created: 2026-04-19T00:00:00Z
updated: 2026-04-19T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — 4 bugs found and fixed. Awaiting migration 018 to be applied to Supabase and human end-to-end verification.
test: tsc --noEmit passed with 0 errors after all fixes
expecting: After migration 018 is applied, the full send flow works
next_action: Apply migration 018 to Supabase, test send flow end-to-end

## Symptoms

expected: |
  - Envio via email dispara e contrato chega no destinatário
  - Envio via whatsapp dispara e contrato chega no destinatário
  - Envio com ambos canais dispara ambos
  - Após envio bem-sucedido, contracts.status atualiza para 'sent'
actual: |
  - Fluxo implementado mas não validado. Comportamento real desconhecido.
errors: |
  - Nenhum erro reportado ainda — investigar se erros ocorrem durante os fluxos
reproduction: |
  - Acessar /cockpit/contratos/novo
  - Preencher contrato
  - Testar "Enviar via Email"
  - Testar "Enviar via WhatsApp"
  - Testar "Enviar via Email + WhatsApp"
  - Verificar se contracts.status = 'sent' no Supabase
timeline: |
  - Implementado recentemente. Nunca validado ponta a ponta.

## Eliminated

- hypothesis: Fluxo de frontend (validação de canais) está quebrado
  evidence: ContratoEditor.tsx valida corretamente — se !canalEmail && !canalWhatsapp, bloqueia com erro. Canais são passados via { whatsapp: bool, email: bool } no payload.
  timestamp: 2026-04-19

- hypothesis: API route /api/contracts/generate não chega a inserir em job_queue
  evidence: Código insere em contracts ENTÃO insere em job_queue. O problema é que ambas as inserções falham por constraint violations.
  timestamp: 2026-04-19

## Evidence

- timestamp: 2026-04-19
  checked: supabase/migrations/001_initial_schema.sql + generate/route.ts
  found: job_queue.action CHECK constraint = ('qualify','send_proposal','schedule','close','ai_takeover','factory_activate'). API inserts action='gerar_contrato'. Nenhuma migration expande esse constraint.
  implication: TODA tentativa de enfileirar contrato via job_queue falha com PostgreSQL CHECK violation.

- timestamp: 2026-04-19
  checked: supabase/migrations/011_contracts_table.sql vs generate/route.ts e draft/route.ts
  found: contracts table tem coluna 'corretor_id'. API routes inserem 'broker_id' (campo inexistente). Supabase retorna erro de coluna desconhecida.
  implication: Insert em contracts falha antes mesmo de chegar no job_queue.

- timestamp: 2026-04-19
  checked: supabase/migrations/20260409184441_update_contracts_status_constraint.sql vs generate/route.ts
  found: Status constraint migrado para ('draft','sent','signed','cancelled'). API routes inserem status='rascunho' (Portuguese — inválido). Draft route também usa 'rascunho'.
  implication: Insert em contracts falha com CHECK violation no campo status.

- timestamp: 2026-04-19
  checked: generate/route.ts linha 88 (status insert) e linha 136 (return)
  found: Após enfileirar em job_queue, API retorna sucesso sem atualizar contracts.status para 'sent'. Status permanece 'draft' mesmo após envio.
  implication: Mesmo se enviado com sucesso, contracts.status nunca chega em 'sent' automaticamente.

## Resolution

root_cause: |
  4 bugs que impedem o fluxo completamente:
  1. contracts insert usa 'broker_id' — coluna inexistente (é 'corretor_id')
  2. contracts insert usa status='rascunho' — constraint exige English: 'draft'
  3. job_queue insert usa action='gerar_contrato' — CHECK constraint não permite esse valor
  4. Após enfileirar, contracts.status não é atualizado para 'sent'

fix: |
  Bug 1 (corretor_id): Corrigido em generate/route.ts, draft/route.ts, route.ts — substituído 'broker_id' por 'corretor_id' em todos os inserts.
  Bug 2 (status PT→EN): Corrigido em generate/route.ts (status: 'sent'), draft/route.ts (status: 'draft'), route.ts (default: 'draft'), [id]/route.ts (signed check).
  Bug 3 (job_queue constraint): Migration 018 criada adicionando 'gerar_contrato' ao CHECK constraint.
  Bug 4 (status sent): Corrigido — generate/route.ts agora insere status='sent' diretamente ao criar o contrato.
  Cascata: ContractStatus type, CONTRACT_STATUS_CONFIG, todos os componentes UI e mock-data atualizados.
  TypeScript: 0 errors após todas as correções.

verification: TypeScript passa sem erros. Aguarda migração 018 aplicada no Supabase + teste end-to-end.
files_changed:
  - src/app/api/contracts/generate/route.ts
  - src/app/api/contracts/draft/route.ts
  - src/app/api/contracts/route.ts
  - src/app/api/contracts/[id]/route.ts
  - src/types/contracts.ts
  - src/lib/contracts/mock-data.ts
  - src/components/yzihub/Contratos/ContractsClient.tsx
  - src/components/yzihub/Contratos/ContractDrawer.tsx
  - src/components/yzihub/Contratos/ContractsTable.tsx
  - src/components/yzihub/Contratos/NewContractModal.tsx
  - supabase/migrations/018_job_queue_add_contract_actions.sql
