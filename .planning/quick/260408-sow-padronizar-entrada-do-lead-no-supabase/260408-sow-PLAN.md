---
phase: quick
plan: 260408-sow
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-audit.md
  - .planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-fixed.json
autonomous: false
requirements: []
must_haves:
  truths:
    - "Workflow principal da Luana faz GET lead por phone+tenant_id antes de qualquer acao"
    - "Se lead nao existe, workflow cria via POST/UPSERT com on_conflict=tenant_id,phone"
    - "Se lead existe, workflow segue fluxo sem criar duplicado"
    - "Nenhum node usa record_id como identificador"
    - "Segunda mensagem do mesmo telefone nunca cria novo lead"
  artifacts:
    - path: ".planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-audit.md"
      provides: "Diagnostico completo dos nodes de persistencia do workflow principal"
    - path: ".planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-fixed.json"
      provides: "JSON corrigido pronto para reimport no n8n"
  key_links:
    - from: "Workflow principal Luana (n8n)"
      to: "supabase leads table"
      via: "GET /leads?tenant_id=eq.X&phone=eq.Y + UPSERT on_conflict=tenant_id,phone"
      pattern: "on_conflict=tenant_id,phone"
---

<objective>
Revisar e corrigir o workflow principal da agente Luana (Jurema Brokers) para garantir que a persistencia de leads no Supabase use phone+tenant_id como chave unica, eliminando duplicatas.

Purpose: O workflow principal (https://app.yzihub.com/workflow/JzEtJ1MpAXx6EMTp) e o ponto de entrada de todas as mensagens WhatsApp. Se ele nao fizer GET por phone+tenant_id antes de criar/atualizar o lead, a segunda mensagem do mesmo contato pode gerar um lead duplicado. Os workflows de ferramenta (atualizar_qualificacao, setar_lead_quente) ja foram corrigidos no quick-260408-rqi — agora falta o workflow pai.

Output: Documento de auditoria + JSON corrigido para reimport no n8n
</objective>

<execution_context>
@.claude/get-shit-done/workflows/execute-plan.md
@.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260408-rqi-padronizar-entrada-do-lead-no-supabase/260408-rqi-SUMMARY.md
@.planning/quick/260408-sub-refactor-luana-airtable-supabase/DEPLOY.md
@.planning/quick/260408-sub-refactor-luana-airtable-supabase/atualizar_qualificacao.json
@clientes/jurema-brokers/prompts.md

<interfaces>
<!-- Padrao ja estabelecido nos workflows de ferramenta (corrigidos em 260408-rqi) -->

GET lead pattern:
```
GET /rest/v1/leads?select=id,tenant_id,phone,name,status,score,metadata&tenant_id=eq.{tenant_id}&phone=eq.{telefone_limpo}
Headers: apikey, Authorization (Bearer), Content-Type: application/json
```

UPSERT lead pattern:
```
POST /rest/v1/leads?on_conflict=tenant_id,phone
Headers: apikey, Authorization (Bearer), Content-Type: application/json, Prefer: resolution=merge-duplicates,return=representation
Body: { tenant_id, phone, name, metadata } — SEM campo id (UUID auto-gerado)
```

Variables n8n: $vars.SUPABASE_URL, $vars.SUPABASE_ANON_KEY
Tenant Jurema: aaaaaaaa-0002-0002-0002-000000000002
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Exportar workflow principal da Luana do n8n</name>
  <what-built>N/A — precisa de acao humana para exportar o JSON do n8n</what-built>
  <how-to-verify>
    1. Acessar https://app.yzihub.com/workflow/JzEtJ1MpAXx6EMTp
    2. Clicar no menu (tres pontos) → "Export as JSON" (ou Download)
    3. Salvar o arquivo como: .planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-original.json
    4. Confirmar que o arquivo foi salvo com "done" ou colar o conteudo JSON aqui
  </how-to-verify>
  <resume-signal>Confirme "done" apos salvar o JSON, ou cole o conteudo do workflow</resume-signal>
</task>

<task type="auto">
  <name>Task 2: Auditar e corrigir nodes de persistencia do workflow</name>
  <files>
    .planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-audit.md
    .planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-fixed.json
  </files>
  <action>
Ler o JSON exportado (luana-agent-workflow-original.json) e analisar TODOS os nodes. Produzir:

**1. Documento de auditoria (audit.md):** Para cada node que interage com a tabela leads no Supabase, documentar:
- Nome do node e tipo
- Metodo HTTP (GET/POST/PATCH)
- URL usada (especialmente query params como on_conflict)
- Se usa record_id ou id como identificador (problema)
- Se usa phone+tenant_id como identificador (correto)
- Veredicto: OK ou CORRIGIR

**2. JSON corrigido (fixed.json):** Copiar o workflow original e aplicar APENAS estas correcoes:
- Todo GET de lead deve filtrar por `tenant_id=eq.X` e `phone=eq.Y` (NAO por id ou record_id)
- Todo POST/UPSERT de lead deve usar `on_conflict=tenant_id,phone` na URL
- Todo POST/UPSERT de lead NAO deve incluir `id` no payload (UUID auto-gerado)
- Se existir logica de "criar lead se nao existe" sem fazer GET primeiro, adicionar GET antes do Create com branch condicional (IF lead existe → seguir, ELSE → UPSERT)
- Remover qualquer referencia a record_id em Code nodes

REGRAS ESTRITASS:
- NAO alterar ordem dos nodes (manter positions iguais)
- NAO alterar logica do agente (system prompt, tools, etc)
- NAO alterar nodes de webhook, normalize, ou respond que nao tocam em leads
- APENAS corrigir nodes de persistencia de leads
- Manter connections identicas (a menos que um novo node de branch seja necessario)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const wf=JSON.parse(fs.readFileSync('.planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-fixed.json','utf8')); const nodes=wf.nodes||[]; const problems=[]; nodes.forEach(n=>{const s=JSON.stringify(n.parameters||{}); if(s.includes('record_id'))problems.push(n.name+': uses record_id'); if(s.includes('on_conflict=tenant_id,id'))problems.push(n.name+': wrong on_conflict'); if(s.includes('on_conflict')&&!s.includes('on_conflict=tenant_id,phone'))problems.push(n.name+': unexpected on_conflict');}); if(problems.length)console.log('PROBLEMS:',problems); else console.log('OK: no record_id, no wrong on_conflict'); console.log('audit exists:', fs.existsSync('.planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-audit.md'));"</automated>
  </verify>
  <done>
- Auditoria documenta cada node de persistencia com veredicto OK/CORRIGIR
- JSON corrigido: zero referencias a record_id, todo on_conflict usa tenant_id,phone, nenhum id no payload de UPSERT
- Nenhuma alteracao em nodes que nao tocam em leads
  </done>
</task>

</tasks>

<verification>
1. Arquivo de auditoria existe com analise de cada node de persistencia
2. JSON corrigido existe e passa validacao automatizada (zero record_id, on_conflict correto)
3. Ordem dos nodes preservada (positions identicas ao original)
4. Logica do agente intacta (system prompt, tools config nao alterados)
5. GET de lead filtra por phone+tenant_id
6. UPSERT usa on_conflict=tenant_id,phone sem id no payload
</verification>

<success_criteria>
- Workflow corrigido pronto para reimport no n8n
- Segunda mensagem do mesmo telefone garantidamente NAO cria lead duplicado
- Auditoria documenta exatamente o que foi alterado e por que
- Nenhuma mudanca em logica de agente, apenas persistencia
</success_criteria>

<output>
After completion, create `.planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/260408-sow-SUMMARY.md`
</output>
