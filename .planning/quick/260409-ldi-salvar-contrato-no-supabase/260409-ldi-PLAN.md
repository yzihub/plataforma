---
phase: quick
plan: 260409-ldi
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [PERSIST-CONTRACT-SUPABASE]
n8n_workflows_modified:
  - id: bzK9KbNa5zEYcurj
    name: "Onboarding | 2.1 Gerando Contrato"

must_haves:
  truths:
    - "Ao gerar contrato no n8n, registro e salvo na tabela contracts do Supabase"
    - "O envio por WhatsApp e Email continua funcionando normalmente"
    - "O status do contrato salvo reflete 'pendente' (valor valido no CHECK constraint)"
  artifacts:
    - path: "n8n workflow bzK9KbNa5zEYcurj"
      provides: "Node HTTP Request POST para inserir contrato no Supabase"
  key_links:
    - from: "workflow bzK9KbNa5zEYcurj (Salvar Contrato Supabase)"
      to: "Supabase REST API /rest/v1/contracts"
      via: "HTTP Request POST com apikey + Authorization headers"
      pattern: "POST /rest/v1/contracts"
---

<objective>
Adicionar persistencia no Supabase ao workflow de geracao de contrato (bzK9KbNa5zEYcurj).

Apos gerar o PDF e obter o Google Drive link (file_url), inserir um registro na tabela `contracts` do Supabase com tenant_id, lead_id, imovel_id, status e file_url.

Purpose: O contrato gerado pela IA precisa ser persistido no Supabase para aparecer no Cockpit do cliente e manter rastreabilidade.
Output: Workflow n8n atualizado com node de INSERT no Supabase.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

Workflow ja migrado de Airtable para Supabase (busca de lead e imovel).
Ref: .planning/quick/260409-elu-buscar-lead-e-imovel-do-supabase-no-cont/260409-elu-SUMMARY.md
Ref: .planning/quick/260409-ds4-mapear-workflow-de-gera-o-de-contrato-ex/260409-ds4-SUMMARY.md (mapeamento completo)
Ref: .planning/quick/260409-e0v-criar-tabela-contracts-no-supabase/ (tabela ja existe)

<interfaces>
-- Tabela contracts (migration 011 + 013):
-- Colunas relevantes para INSERT:
--   tenant_id    UUID NOT NULL (FK tenants)
--   lead_id      UUID (FK leads)
--   imovel_id    UUID (FK properties) -- adicionado em migration 013
--   lead_name    TEXT NOT NULL
--   project_name TEXT
--   title        TEXT
--   type         TEXT CHECK (IN 'venda','locacao','servico','parceria')
--   status       TEXT CHECK (IN 'rascunho','pendente','assinado','cancelado','expirado')
--   file_url     TEXT
--   notes        TEXT
--   value        NUMERIC(14,2) DEFAULT 0
--   created_at   TIMESTAMPTZ DEFAULT NOW()
--
-- IMPORTANTE: O CHECK constraint NAO aceita 'sent'. Usar 'pendente' como equivalente.
-- IMPORTANTE: tenant_id e UUID (nao TEXT). O webhook body.tenant_id ja vem como UUID.
-- IMPORTANTE: lead_name e NOT NULL — precisa ser preenchido.

-- Padrao de acesso Supabase REST no n8n (estabelecido nos workflows migrados):
-- URL: {{ $vars.SUPABASE_URL }}/rest/v1/{table}
-- Headers:
--   apikey: {{ $vars.SUPABASE_ANON_KEY }}
--   Authorization: Bearer {{ $vars.SUPABASE_ANON_KEY }}
--   Content-Type: application/json
--   Prefer: return=representation
-- Method: POST
-- Body: JSON com campos da tabela
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Adicionar node "Salvar Contrato Supabase" ao workflow via n8n API</name>
  <files>n8n workflow bzK9KbNa5zEYcurj</files>
  <action>
    1. Ler o workflow atual via GET /api/v1/workflows/bzK9KbNa5zEYcurj
    2. Identificar o ponto de insercao: APOS os nodes de Google Drive (onde o file_url/google doc link ja existe) e ANTES dos nodes de envio (WhatsApp e Email). O ponto ideal e apos o node "Mover Arquivo Para Pasta" (Google Drive move) — pois nesse ponto temos:
       - tenant_id e lead_id do webhook body
       - imovel_id do webhook body
       - nome do lead do node "Code in JavaScript" (que le lead[0] do Supabase)
       - Google Doc URL do node "Copiar Documento Modelo" (output.webViewLink ou alternateLink)

    3. Criar um node HTTP Request chamado "Salvar Contrato Supabase" com:
       - Method: POST
       - URL: {{ $vars.SUPABASE_URL }}/rest/v1/contracts
       - Headers:
         - apikey: {{ $vars.SUPABASE_ANON_KEY }}
         - Authorization: Bearer {{ $vars.SUPABASE_ANON_KEY }}
         - Content-Type: application/json
         - Prefer: return=representation
       - Body (JSON):
         {
           "tenant_id": referencia ao webhook body.tenant_id,
           "lead_id": referencia ao webhook body.lead_id,
           "imovel_id": referencia ao webhook body.imovel_id,
           "lead_name": referencia ao nome do lead extraido pelo Code in JavaScript,
           "status": "pendente",
           "file_url": referencia ao webViewLink ou alternateLink do Google Doc copiado,
           "type": mapear tipo_contrato — "intermediacao_venda" -> "venda", "intermediacao_locacao" -> "locacao",
           "title": concatenar tipo + nome do lead (ex: "Compra e Venda — Nome do Lead"),
           "notes": referencia as notas do gestor (do webhook body ou do lead metadata)
         }

    4. Posicionar o node no fluxo SEM interromper a cadeia existente:
       - O node deve ser inserido em PARALELO ao fluxo de envio (nao bloqueante), OU
       - Em serie apos "Mover Arquivo Para Pasta" e antes de "Buscar Imovel Supabase" / "buscar_dados_lead"
       - A chave e: NAO remover nem alterar os nodes de envio WhatsApp/Email existentes

    5. Conectar o node na cadeia de connections do workflow JSON

    6. Fazer PUT /api/v1/workflows/bzK9KbNa5zEYcurj com o workflow atualizado

    ATENCAO:
    - O campo status DEVE ser "pendente" (nao "sent" — CHECK constraint da tabela)
    - O campo lead_name e NOT NULL — deve ser preenchido
    - Manter TODOS os nodes existentes de envio (WhatsApp, Email, Update record Airtable) intactos
    - Usar {{ $vars.SUPABASE_URL }} e {{ $vars.SUPABASE_ANON_KEY }} (ja configurados como variaveis n8n)
  </action>
  <verify>
    <automated>
      Apos o PUT, fazer GET /api/v1/workflows/bzK9KbNa5zEYcurj e verificar:
      1. Node "Salvar Contrato Supabase" existe no array nodes
      2. Node tem method POST e URL contendo /rest/v1/contracts
      3. Body contem tenant_id, lead_id, imovel_id, lead_name, status
      4. Nodes de envio WhatsApp e Email continuam presentes e conectados
      5. HTTP Response 200 no PUT
    </automated>
  </verify>
  <done>
    - Workflow bzK9KbNa5zEYcurj contem node "Salvar Contrato Supabase"
    - Node faz POST /rest/v1/contracts com tenant_id, lead_id, imovel_id, lead_name, status=pendente, file_url
    - Fluxo de envio WhatsApp e Email nao foi alterado
    - Workflow salvo com sucesso (HTTP 200)
  </done>
</task>

</tasks>

<verification>
- GET /api/v1/workflows/bzK9KbNa5zEYcurj retorna workflow com node "Salvar Contrato Supabase"
- Node usa padrao Supabase REST (vars, headers, POST)
- Nodes de envio (WhatsApp, Email) permanecem intactos
- Conexoes do workflow formam cadeia valida (sem nodes orfaos)
</verification>

<success_criteria>
- Workflow de contrato persiste registro na tabela contracts do Supabase
- Status salvo como "pendente" (compativel com CHECK constraint)
- file_url salvo com Google Drive link
- tenant_id, lead_id e imovel_id corretamente referenciados
- Envio por WhatsApp e Email NAO foi removido nem alterado
</success_criteria>

<output>
After completion, create `.planning/quick/260409-ldi-salvar-contrato-no-supabase/260409-ldi-SUMMARY.md`
</output>
