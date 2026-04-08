---
phase: quick
plan: 260407-wba
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260407-wba-migrar-workflow-ler-im-veis-jetengine-pa/workflow-patch-ler-imoveis-jetengine.json
autonomous: true
requirements: [QUICK-wba]

must_haves:
  truths:
    - "Workflow Ler Imoveis JetEngine grava na tabela imoveis do Supabase em vez do Airtable"
    - "Upsert usa chave composta tenant_id + id_imovel para evitar duplicatas"
    - "Todos os 18 campos listados sao mapeados corretamente no node Supabase"
    - "Leitura do WordPress JetEngine permanece inalterada"
  artifacts:
    - path: ".planning/quick/260407-wba-migrar-workflow-ler-im-veis-jetengine-pa/workflow-patch-ler-imoveis-jetengine.json"
      provides: "Patch JSON completo para migrar destino de Airtable para Supabase"
  key_links:
    - from: "n8n workflow Ler Imoveis JetEngine"
      to: "Supabase tabela imoveis"
      via: "Supabase node com upsert por tenant_id + id_imovel"
---

<objective>
Migrar o destino do workflow "Ler Imoveis JetEngine" no n8n: substituir o node Airtable pelo node Supabase, gravando na tabela `imoveis` com upsert por `tenant_id + id_imovel`. Manter a leitura do WordPress JetEngine e a transformacao de campos existente intactas.

Purpose: Centralizar dados de imoveis no Supabase (fonte unica de verdade) em vez do Airtable, permitindo que o cockpit e o agente WhatsApp consumam dados da mesma tabela.
Output: Patch JSON com instrucoes exatas para aplicar no n8n.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

Contexto critico — workflow anterior ja foi patcheado:
@.planning/quick/260407-r8a-ajustar-workflow-consultar-imoveis-no-n8/workflow-patch-consultar-imoveis.json
@.planning/quick/260407-rnb-corrigir-patch-do-workflow-consultar-imo/260407-rnb-SUMMARY.md

Tabela `imoveis` no Supabase — campos reais confirmados pelo patch 260407-rnb:
- id_imovel, titulo_comercial, titulo_seo, descricao_imovel, bairro, tipo_de_imovel, finalidade, valor, condominio, metragem, quartos, suites, vagas, foto_principal, link_do_imovel, link_redes_sociais, status_publicacao, tenant_id

Tenant Jurema Brokers: `aaaaaaaa-0002-0002-0002-000000000002`
</context>

<tasks>

<task type="auto">
  <name>Task 1: Inspecionar workflow Ler Imoveis JetEngine e estrutura da tabela imoveis</name>
  <files></files>
  <action>
1. Usar MCP n8n para listar workflows e localizar o workflow "Ler Imoveis JetEngine" (ou nome similar com "JetEngine" e "Imoveis"). Anotar o workflow ID.
2. Usar MCP n8n para obter o workflow completo (GET workflow by ID). Identificar:
   - O node HTTP/WordPress que le do JetEngine (NAO ALTERAR)
   - O node Set que transforma campos (anotar mapeamento atual)
   - O node Airtable que sera substituido (anotar posicao, conexoes)
3. Usar MCP Supabase para confirmar a estrutura real da tabela `imoveis`:
   - Listar colunas: tenant_id, id_imovel, titulo_comercial, titulo_seo, descricao_imovel, bairro, tipo_de_imovel, finalidade, valor, condominio, metragem, quartos, suites, vagas, foto_principal, link_do_imovel, link_redes_sociais, status_publicacao
   - Confirmar que existe constraint ou indice para upsert por tenant_id + id_imovel
4. Verificar o tenant_id da Jurema Brokers no Supabase (esperado: `aaaaaaaa-0002-0002-0002-000000000002`).

Se MCP n8n NAO disponivel: registrar que patch sera gerado com base no padrao conhecido de workflows n8n Jurema (leitura WP -> Set -> destino). Prosseguir com Task 2 usando o padrao.
  </action>
  <verify>
    <automated>echo "Inspecao concluida — workflow ID anotado, schema imoveis confirmado"</automated>
  </verify>
  <done>Workflow localizado, nodes identificados (leitura WP, Set, Airtable), schema da tabela imoveis confirmado com todos os 18 campos, tenant_id Jurema verificado.</done>
</task>

<task type="auto">
  <name>Task 2: Gerar patch JSON substituindo Airtable por Supabase com upsert</name>
  <files>.planning/quick/260407-wba-migrar-workflow-ler-im-veis-jetengine-pa/workflow-patch-ler-imoveis-jetengine.json</files>
  <action>
Se MCP n8n disponivel: modificar o workflow diretamente no n8n:
1. Remover o node Airtable
2. Adicionar node Supabase com operacao "Upsert"
3. Configurar conforme especificacao abaixo
4. Reconectar ao node Set existente
5. Salvar workflow

Se MCP n8n NAO disponivel: gerar arquivo JSON de patch com instrucoes exatas.

ESPECIFICACAO DO NODE SUPABASE (destino):
- type: n8n-nodes-base.supabase
- operation: upsert
- tableId: "imoveis"
- conflictColumns: ["tenant_id", "id_imovel"] (chave composta para upsert — evita duplicatas)

MAPEAMENTO DE CAMPOS (Set node -> Supabase):
Todos os 18 campos devem ser mapeados. O tenant_id e fixo para Jurema:

| Campo Supabase       | Valor no Set node                          |
|----------------------|--------------------------------------------|
| tenant_id            | "aaaaaaaa-0002-0002-0002-000000000002"     |
| id_imovel            | {{ $json.id_imovel }}                      |
| titulo_comercial     | {{ $json.titulo_comercial }}               |
| titulo_seo           | {{ $json.titulo_seo }}                     |
| descricao_imovel     | {{ $json.descricao_imovel }}               |
| bairro               | {{ $json.bairro }}                         |
| tipo_de_imovel       | {{ $json.tipo_de_imovel }}                 |
| finalidade           | {{ $json.finalidade }}                     |
| valor                | {{ $json.valor }}                          |
| condominio           | {{ $json.condominio }}                     |
| metragem             | {{ $json.metragem }}                       |
| quartos              | {{ $json.quartos }}                        |
| suites               | {{ $json.suites }}                         |
| vagas                | {{ $json.vagas }}                          |
| foto_principal       | {{ $json.foto_principal }}                 |
| link_do_imovel       | {{ $json.link_do_imovel }}                 |
| link_redes_sociais   | {{ $json.link_redes_sociais }}             |
| status_publicacao    | {{ $json.status_publicacao }}              |

REGRAS:
- NAO alterar nenhum node antes do Airtable (leitura WP e Set permanecem identicos)
- tenant_id e valor FIXO (hardcoded) — nao vem do JetEngine
- Upsert garante: se id_imovel ja existe para este tenant, atualiza. Se nao, insere.
- NAO mexer na Luana (agente WhatsApp) — este workflow so popula a tabela

O arquivo JSON deve conter:
1. _meta com instrucoes de aplicacao
2. NODE_SUPABASE_UPSERT com configuracao completa do node
3. NODE_SET_MAPPING com o mapeamento dos 18 campos (incluindo tenant_id fixo)
4. WIRING com instrucoes de como reconectar (remover Airtable, conectar Set -> Supabase)
  </action>
  <verify>
    <automated>node -e "const p=require('./.planning/quick/260407-wba-migrar-workflow-ler-im-veis-jetengine-pa/workflow-patch-ler-imoveis-jetengine.json'); const fields=p.NODE_SET_MAPPING?.fields||p.NODE_SUPABASE_UPSERT?.columns||[]; const hasUpsert=JSON.stringify(p).includes('upsert'); const hasImoveis=JSON.stringify(p).includes('imoveis'); const hasTenant=JSON.stringify(p).includes('aaaaaaaa-0002-0002-0002-000000000002'); const hasConflict=JSON.stringify(p).includes('id_imovel')&&JSON.stringify(p).includes('tenant_id'); console.log('upsert:',hasUpsert,'table_imoveis:',hasImoveis,'tenant:',hasTenant,'conflict_key:',hasConflict); if(!hasUpsert||!hasImoveis||!hasTenant||!hasConflict) process.exit(1); console.log('PASS')"</automated>
  </verify>
  <done>
Arquivo JSON de patch gerado com:
- Node Supabase com operacao upsert na tabela imoveis
- Chave de conflito tenant_id + id_imovel
- Todos os 18 campos mapeados corretamente
- tenant_id fixo da Jurema Brokers
- Instrucoes claras de como aplicar no n8n
- Leitura do WordPress JetEngine inalterada
  </done>
</task>

</tasks>

<verification>
1. Arquivo JSON existe e e valido (parseable)
2. Operacao e upsert (nao insert ou getAll)
3. Tabela e "imoveis" (nao "properties")
4. Conflict columns incluem tenant_id e id_imovel
5. tenant_id Jurema esta hardcoded: aaaaaaaa-0002-0002-0002-000000000002
6. Todos os 18 campos estao mapeados
7. Nenhuma referencia a Airtable no patch de destino
8. Nenhuma alteracao na logica de leitura do WordPress
</verification>

<success_criteria>
- Patch JSON completo e aplicavel no n8n
- Upsert por tenant_id + id_imovel configurado
- 18 campos mapeados: tenant_id, id_imovel, titulo_comercial, titulo_seo, descricao_imovel, bairro, tipo_de_imovel, finalidade, valor, condominio, metragem, quartos, suites, vagas, foto_principal, link_do_imovel, link_redes_sociais, status_publicacao
- Leitura WP JetEngine intacta
- Sem alteracao na agente Luana
</success_criteria>

<output>
After completion, create `.planning/quick/260407-wba-migrar-workflow-ler-im-veis-jetengine-pa/260407-wba-SUMMARY.md`
</output>
