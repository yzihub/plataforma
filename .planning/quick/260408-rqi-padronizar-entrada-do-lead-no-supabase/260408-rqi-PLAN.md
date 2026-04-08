---
phase: quick
plan: 260408-rqi
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/012_leads_tenant_phone_unique.sql
  - .planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json
  - clientes/jurema-brokers/prompts.md
autonomous: true
requirements: []
must_haves:
  truths:
    - "UPSERT de lead usa on_conflict=tenant_id,phone em vez de tenant_id,id"
    - "Payload do UPSERT nao inclui campo id (UUID gerado automaticamente)"
    - "Constraint UNIQUE(tenant_id, phone) existe na tabela leads"
    - "Prompt da Luana nao referencia record_id do Airtable"
  artifacts:
    - path: "supabase/migrations/012_leads_tenant_phone_unique.sql"
      provides: "UNIQUE constraint para lead upsert por phone"
    - path: ".planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json"
      provides: "Workflow corrigido com on_conflict=tenant_id,phone"
    - path: "clientes/jurema-brokers/prompts.md"
      provides: "Prompt sem referencia a record_id"
  key_links:
    - from: "atualizar_qualificacao.json (UPSERT node)"
      to: "supabase leads table"
      via: "on_conflict=tenant_id,phone"
      pattern: "on_conflict=tenant_id,phone"
---

<objective>
Padronizar a entrada do lead no Supabase para que a segunda mensagem do mesmo telefone NUNCA crie um lead duplicado.

Purpose: O workflow atualizar_qualificacao usa on_conflict=tenant_id,id com id=telefone (string), mas a tabela leads tem id UUID. Isso causa falha silenciosa no upsert e cria leads duplicados. A correção envolve: (1) adicionar UNIQUE(tenant_id, phone), (2) trocar on_conflict para tenant_id,phone, (3) remover id do payload, (4) limpar referencia residual a record_id no prompt.

Output: Migration SQL + workflow JSON corrigido + prompt atualizado
</objective>

<execution_context>
@.claude/get-shit-done/workflows/execute-plan.md
@.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260408-rqi-padronizar-entrada-do-lead-no-supabase/260408-rqi-RESEARCH.md
@.planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json
@clientes/jurema-brokers/prompts.md
@supabase/migrations/001_initial_schema.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar migration UNIQUE(tenant_id, phone) na tabela leads</name>
  <files>supabase/migrations/012_leads_tenant_phone_unique.sql</files>
  <action>
Criar migration SQL com:

```sql
-- 012: Add unique constraint for lead upsert by phone
-- Enables on_conflict=tenant_id,phone in n8n workflows

-- Dedup: keep most recent lead per (tenant_id, phone) before adding constraint
DELETE FROM leads a
USING leads b
WHERE a.tenant_id = b.tenant_id
  AND a.phone = b.phone
  AND a.id < b.id;

ALTER TABLE leads
  ADD CONSTRAINT leads_tenant_phone_unique UNIQUE (tenant_id, phone);
```

A deduplicacao usa `a.id < b.id` para manter o registro mais recente (UUID v4 nao garante ordem, mas para poucos duplicados e preciso suficiente; alternativa seria usar created_at se existir).

NAO alterar nenhuma outra migration existente.
  </action>
  <verify>
    <automated>cat supabase/migrations/012_leads_tenant_phone_unique.sql | head -20</automated>
  </verify>
  <done>Migration existe com DELETE de duplicados + ALTER TABLE ADD CONSTRAINT UNIQUE(tenant_id, phone)</done>
</task>

<task type="auto">
  <name>Task 2: Corrigir workflow atualizar_qualificacao — on_conflict e payload</name>
  <files>.planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json</files>
  <action>
Abrir atualizar_qualificacao.json e fazer DUAS correções:

1. **Node UPSERT Lead (aq-5-upsert-lead):** Trocar a URL de:
   `POST /rest/v1/leads?on_conflict=tenant_id,id`
   para:
   `POST /rest/v1/leads?on_conflict=tenant_id,phone`

2. **Node Build Context (aq-4-build-context):** No codigo JavaScript do node, REMOVER a linha que seta `id: telefone` (ou `id: telefone_limpo` ou similar). O campo `id` deve ser omitido do payload para que o Supabase gere UUID automaticamente no primeiro INSERT.

   O payload final deve conter: tenant_id, phone, name, metadata (e outros campos que ja existam) — mas NAO `id`.

NAO alterar:
- Ordem dos nodes
- Logica de normalizacao do telefone
- Logica de GET lead existente
- Logica do agente
- Nenhum outro node alem de aq-4-build-context e aq-5-upsert-lead
  </action>
  <verify>
    <automated>node -e "const wf=require('./.planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json'); const nodes=wf.nodes||[]; const upsert=nodes.find(n=>n.name&&n.name.includes('UPSERT')||n.parameters&&JSON.stringify(n.parameters).includes('on_conflict')); console.log('URL:', JSON.stringify(upsert?.parameters?.url||upsert?.parameters)); const build=nodes.find(n=>n.name&&n.name.includes('Build Context')); const code=JSON.stringify(build?.parameters); console.log('has id in payload:', /['\"]id['\"]/.test(code));"</automated>
  </verify>
  <done>URL do UPSERT usa on_conflict=tenant_id,phone. Payload do Build Context nao inclui campo id.</done>
</task>

<task type="auto">
  <name>Task 3: Remover referencia a record_id no prompt da Luana</name>
  <files>clientes/jurema-brokers/prompts.md</files>
  <action>
Abrir clientes/jurema-brokers/prompts.md e localizar a linha:
```
REGRA DE MERGE: Sempre envie o record_id + campos que já estavam no CRM + a nova informação.
```

Substituir por:
```
REGRA DE MERGE: Sempre envie o telefone + tenant_id + campos que já estavam no CRM + a nova informação. Nunca envie payloads incompletos que possam apagar dados existentes.
```

Buscar qualquer outra referencia a `record_id` no arquivo e remover/substituir por `phone + tenant_id`. NAO alterar a logica do agente, tom de voz, ou qualquer outra secao do prompt.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const p=fs.readFileSync('clientes/jurema-brokers/prompts.md','utf8'); console.log('record_id refs:', (p.match(/record_id/g)||[]).length); console.log('has phone+tenant_id merge rule:', p.includes('telefone + tenant_id'));"</automated>
  </verify>
  <done>Zero referencias a record_id no prompts.md. Regra de merge menciona telefone + tenant_id.</done>
</task>

</tasks>

<verification>
1. Migration 012 existe com UNIQUE(tenant_id, phone) e dedup safety
2. atualizar_qualificacao.json usa on_conflict=tenant_id,phone (nao tenant_id,id)
3. atualizar_qualificacao.json Build Context nao inclui `id` no payload
4. prompts.md nao contem `record_id`
5. setar_lead_quente.json NAO foi alterado (ja usa PATCH por phone — correto)
6. consultar_imoveis.json e buscar_lancamentos.json NAO foram alterados (somente leitura)
</verification>

<success_criteria>
- UNIQUE constraint pronta para deploy
- Workflow de escrita corrigido para upsert idemponent por phone+tenant_id
- Prompt da Luana limpo de residuos Airtable
- Segunda mensagem do mesmo telefone NUNCA cria lead duplicado (apos deploy da migration + reimport do workflow)
</success_criteria>

<output>
After completion, create `.planning/quick/260408-rqi-padronizar-entrada-do-lead-no-supabase/260408-rqi-SUMMARY.md`
</output>
