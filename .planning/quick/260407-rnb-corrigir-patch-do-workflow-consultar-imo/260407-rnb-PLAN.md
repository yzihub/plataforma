---
phase: quick
plan: 260407-rnb
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/workflow-patch-consultar-imoveis.json
autonomous: true
requirements: [QUICK-FIX]
must_haves:
  truths:
    - "Patch JSON referencia tabela 'imoveis' (nao 'properties')"
    - "Campos do NODE_SUPABASE e NODE_SET correspondem 1:1 aos campos reais da tabela imoveis"
    - "Filtro por tenant_id e status_publicacao = 'published' esta presente"
    - "Saida do NODE_SET usa nomes de campo esperados pelo agente WhatsApp"
  artifacts:
    - path: ".planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/workflow-patch-consultar-imoveis.json"
      provides: "Patch corrigido para workflow consultar_imoveis"
      contains: "imoveis"
  key_links: []
---

<objective>
Sobrescrever o patch JSON do workflow consultar_imoveis com a tabela correta (`imoveis`) e mapeamento 1:1 dos campos reais do Supabase.

Purpose: O patch anterior (260407-r8a) usava tabela `properties` com campos de migrations 008/009 que nao correspondem a tabela real. A tabela real no Supabase e `imoveis` com campos snake_case derivados do CSV de Jurema Brokers.
Output: Arquivo `workflow-patch-consultar-imoveis.json` corrigido, pronto para aplicacao manual no n8n.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/260407-r8a-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Reescrever patch JSON com tabela imoveis e campos corretos</name>
  <files>.planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/workflow-patch-consultar-imoveis.json</files>
  <action>
Sobrescrever o arquivo `workflow-patch-consultar-imoveis.json` com patch corrigido.

TABELA CORRETA: `imoveis` (NAO `properties`)

CAMPOS REAIS DA TABELA `imoveis` no Supabase (conforme confirmado pelo usuario):
- id_imovel (TEXT — identificador do imovel, ex: JP-3150)
- bairro (TEXT)
- tipo_de_imovel (TEXT — ex: Apartamento, Casa)
- valor (TEXT ou NUMERIC — preco do imovel)
- quartos (TEXT/INT)
- suites (TEXT/INT)
- vagas (TEXT/INT)
- metragem (TEXT/NUMERIC)
- link_redes_sociais (TEXT — link para redes sociais)
- foto_principal (TEXT — URL da foto)
- status_publicacao (TEXT — published/draft/archived)
- tenant_id (UUID)

NODE_SUPABASE:
- tableId: "imoveis"
- selectColumns: todos os campos acima MENOS tenant_id e status_publicacao (usados apenas como filtro)
- filters: tenant_id = contexto da conversa E status_publicacao = 'published'

NODE_SET (mapeamento 1:1 — campos ja tem os nomes corretos para WhatsApp):
- id_imovel → {{ $json.id_imovel }}
- bairro → {{ $json.bairro }}
- tipo_de_imovel → {{ $json.tipo_de_imovel }}
- valor → {{ $json.valor }}
- quartos → {{ $json.quartos }}
- suites → {{ $json.suites }}
- vagas → {{ $json.vagas }}
- metragem → {{ $json.metragem }}
- link_redes_sociais → {{ $json.link_redes_sociais }}
- foto_principal → {{ $json.foto_principal }}

NAO incluir campos que nao existem na tabela (title, photo_url, price, area_sqm, neighborhood, property_type, publication_status, tags, purpose, link, location, status — todos esses eram da tabela properties e estao ERRADOS).

SCHEMA_REFERENCE: atualizar para refletir tabela `imoveis` com os campos corretos.

Manter mesma estrutura JSON (_meta, NODE_SUPABASE, NODE_SET, SCHEMA_REFERENCE) e tenant_jurema UUID.
  </action>
  <verify>
    <automated>node -e "const p=require('./.planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/workflow-patch-consultar-imoveis.json'); const ok = p.NODE_SUPABASE.tableId === 'imoveis' && p.NODE_SET.fields.some(f => f.name === 'quartos' && f.value.includes('quartos')) && !JSON.stringify(p).includes('properties'); if(!ok) throw new Error('Patch incorreto'); console.log('PASS: tabela imoveis, campos corretos, sem referencia a properties')"</automated>
  </verify>
  <done>
- Arquivo JSON sobrescrito com tabela `imoveis`
- Todos os 10 campos mapeados 1:1 (sem renomeacao, sem campos vazios)
- Filtros tenant_id + status_publicacao = 'published' presentes
- Zero referencias a tabela `properties` ou campos de migrations 008/009
  </done>
</task>

</tasks>

<verification>
- JSON e valido (parseable)
- tableId = "imoveis" (nao "properties")
- Campos do NODE_SET correspondem exatamente aos campos da tabela imoveis
- Nenhum campo da tabela properties aparece no arquivo
- quartos, vagas, suites mapeados com valores reais (nao string vazia)
</verification>

<success_criteria>
Patch JSON corrigido e pronto para aplicacao no n8n, usando tabela `imoveis` com mapeamento 1:1 dos campos reais.
</success_criteria>

<output>
After completion, create `.planning/quick/260407-rnb-corrigir-patch-do-workflow-consultar-imo/260407-rnb-SUMMARY.md`
</output>
