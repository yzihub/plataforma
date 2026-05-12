---
phase: quick
plan: 260408-rzc
type: execute
wave: 1
depends_on: [260408-rqi]
files_modified:
  - .planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json
autonomous: true
requirements: [QUAL-MERGE]
must_haves:
  truths:
    - "Metadata merge preserves all old fields when new payload omits them"
    - "UPSERT uses on_conflict=tenant_id,phone"
    - "Get Lead fetches existing metadata before Build Context runs"
    - "Empty/null/undefined new fields are stripped before merge (no overwrite with blanks)"
  artifacts:
    - path: ".planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json"
      provides: "Complete workflow JSON with metadata merge logic"
      contains: "...antigo, ...novo"
  key_links:
    - from: "Get Lead node (aq-3)"
      to: "Build Context node (aq-4)"
      via: "Supabase REST GET passes existing lead with metadata to Code node"
      pattern: "existingLead.metadata"
    - from: "Build Context node (aq-4)"
      to: "UPSERT Lead node (aq-5)"
      via: "Merged metadata object passed as JSON body"
      pattern: "antigo.*novo"
---

<objective>
Garantir que o workflow `atualizar_qualificacao` no n8n faz merge correto de metadata, preservando campos antigos quando o payload novo nao os inclui.

Purpose: O workflow local (atualizar_qualificacao.json) ja foi corrigido no task 260408-rqi com a logica de merge `{ ...antigo, ...novo }`. Este plan garante que o workflow no n8n live esta sincronizado com o JSON local e valida o comportamento de merge via n8n MCP tools.

Output: Workflow atualizado no n8n com merge de metadata confirmado.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json
@.planning/quick/260408-rqi-padronizar-entrada-do-lead-no-supabase/260408-rqi-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Validar e sincronizar workflow atualizar_qualificacao no n8n</name>
  <files>.planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json</files>
  <action>
1. Use n8n MCP tools to fetch the current live `atualizar_qualificacao` workflow and compare with the local JSON file at `.planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json`.

2. Verify the live workflow has ALL THREE critical elements:
   a) **Get Lead node** (aq-3): GET request to `/rest/v1/leads` with `select=id,tenant_id,phone,name,status,score,metadata,stage_id,created_at` and filters `tenant_id=eq.{value}` + `phone=eq.{value}`. This MUST run BEFORE Build Context.
   b) **Build Context node** (aq-4): Code node that does:
      - `const antigo = existingLead ? (existingLead.metadata || {}) : {}`
      - `const novo = { objetivo, faixa_valor, bairro_interesse, ... }`
      - Strips undefined/null/empty keys from `novo`
      - Returns `metadata: { ...antigo, ...novo }` (spread old first, then new)
   c) **UPSERT Lead node** (aq-5): POST to `/rest/v1/leads?on_conflict=tenant_id,phone` with `Prefer: resolution=merge-duplicates,return=representation`

3. If the live workflow does NOT match (missing Get Lead, missing merge logic, wrong on_conflict):
   - Use n8n MCP tools to update the workflow with the corrected nodes from the local JSON
   - Do NOT change node order or connections
   - Do NOT change agent logic
   - Only fix the data merge path

4. If the live workflow already matches the local JSON, document that it is already in sync.

5. Ensure the workflow is active in n8n after sync.
  </action>
  <verify>
    <automated>Use n8n MCP tool to read the workflow and confirm: (1) Get Lead node exists with metadata in select, (2) Build Context code contains "...antigo, ...novo", (3) UPSERT URL contains "on_conflict=tenant_id,phone"</automated>
  </verify>
  <done>
- Live n8n workflow has Get Lead -> Build Context -> UPSERT pipeline
- Build Context does `{ ...antigo, ...novo }` merge
- Empty/null/undefined fields stripped before merge
- on_conflict=tenant_id,phone confirmed
- Workflow is active
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Workflow atualizar_qualificacao sincronizado no n8n com merge de metadata correto: Get Lead busca metadata existente, Build Context faz spread merge { ...antigo, ...novo }, UPSERT usa on_conflict=tenant_id,phone.</what-built>
  <how-to-verify>
1. Abra o n8n e localize o workflow `atualizar_qualificacao`
2. Verifique visualmente os nodes: Webhook -> Normalize -> Get Lead -> Build Context -> UPSERT Lead -> Respond
3. Abra o node "Build Context" e confirme que o codigo faz: `metadata: { ...antigo, ...novo }`
4. Teste enviando uma qualificacao para um lead que ja tem metadata (ex: lead com objetivo="comprar"):
   - Envie payload com apenas `faixa_valor="500k-1M"` (sem objetivo)
   - Verifique que o lead resultante tem AMBOS: objetivo="comprar" E faixa_valor="500k-1M"
   - Campos antigos NAO foram apagados
  </how-to-verify>
  <resume-signal>Type "approved" se o merge preserva campos antigos, ou descreva o problema encontrado</resume-signal>
</task>

</tasks>

<verification>
- Workflow live no n8n tem Get Lead antes do Build Context
- Build Context faz merge com spread: `{ ...antigo, ...novo }`
- Campos null/undefined/empty removidos do `novo` antes do merge
- UPSERT usa on_conflict=tenant_id,phone
- Nenhum campo antigo e deletado se nao vem no payload
</verification>

<success_criteria>
O workflow atualizar_qualificacao no n8n preserva todos os campos de metadata existentes ao receber uma atualizacao parcial. Um lead com metadata { objetivo: "comprar", bairro: "Centro" } que recebe { faixa_valor: "500k" } deve resultar em { objetivo: "comprar", bairro: "Centro", faixa_valor: "500k" }.
</success_criteria>

<output>
After completion, create `.planning/quick/260408-rzc-garantir-merge-de-metadata-no-atualizar-/260408-rzc-SUMMARY.md`
</output>
