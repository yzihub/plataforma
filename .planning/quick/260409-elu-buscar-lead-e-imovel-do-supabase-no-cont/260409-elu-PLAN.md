---
phase: quick
plan: 260409-elu
type: execute
wave: 1
depends_on: [260409-e9u]
files_modified: []
autonomous: true
requirements: [MIGRATE-CONTRATO-SUPABASE]
n8n_workflow:
  id: bzK9KbNa5zEYcurj
  name: "Onboarding | 2.1 Gerando Contrato"
  url: https://app.yzihub.com/workflow/bzK9KbNa5zEYcurj

must_haves:
  truths:
    - "Workflow busca lead do Supabase por tenant_id + phone (sem Airtable)"
    - "Workflow busca imovel do Supabase por id (sem Airtable)"
    - "Campos nome, telefone, cpf, imovel titulo/preco/endereco chegam ao GPT/Google Docs inalterados"
  artifacts: []
  key_links:
    - from: "Webhook body (phone, tenant_id, imovel_id)"
      to: "HTTP Request GET /rest/v1/leads"
      via: "query params tenant_id=eq.X&phone=eq.Y"
    - from: "Webhook body (imovel_id)"
      to: "HTTP Request GET /rest/v1/properties"
      via: "query params id=eq.X"
    - from: "HTTP Request responses"
      to: "GPT/Google Docs nodes"
      via: "mesmos campos que Airtable fornecia (nome, telefone, cpf, titulo, preco, endereco)"
---

<objective>
Substituir os nodes de busca Airtable no workflow n8n "Onboarding | 2.1 Gerando Contrato" (bzK9KbNa5zEYcurj) por HTTP Requests ao Supabase REST API, buscando lead e imovel diretamente das tabelas `leads` e `properties`.

Purpose: Eliminar dependencia do Airtable neste workflow, usando Supabase como fonte unica de verdade (alinhado com migracao em curso).
Output: Workflow atualizado no n8n com dois HTTP Request nodes (GET lead, GET property) no lugar dos nodes Airtable.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260409-e9u-remover-record-id-e-padronizar-entrada-d/260409-e9u-SUMMARY.md

## Schema Supabase (campos relevantes)

### leads (migration 001)
```sql
leads(id UUID, tenant_id UUID, name TEXT, email TEXT, phone TEXT, company TEXT,
      source TEXT, status TEXT, score INT, value NUMERIC, notes TEXT,
      metadata JSONB, cpf -- NAO existe na tabela, vive em metadata)
```
NOTA: A coluna `cpf` NAO existe diretamente na tabela leads. Se existir, esta em `metadata->>'cpf'`.
Verificar antes de implementar se ha coluna `cpf` ou se precisa extrair de metadata.

### properties (migration 008)
```sql
properties(id UUID, tenant_id UUID, title TEXT, photo_url TEXT, price NUMERIC,
           location TEXT, area_sqm NUMERIC, status TEXT, link TEXT, notes TEXT)
```
NOTA: O campo solicitado `address` nao existe — o equivalente e `location`.

### contracts (migration 011)
```sql
contracts(id UUID, tenant_id UUID, lead_id UUID, lead_name TEXT,
          project_id UUID REFERENCES properties, project_name TEXT,
          corretor_id UUID, corretor_name TEXT, title TEXT, type TEXT,
          status TEXT, value NUMERIC, file_url TEXT, signed_at, expires_at)
```

## Padrao Supabase REST nos workflows migrados
- URL: `{SUPABASE_URL}/rest/v1/{table}?{filters}&select={fields}`
- Headers: `apikey: {SUPABASE_ANON_KEY}`, `Authorization: Bearer {SUPABASE_ANON_KEY}`
- Usar credenciais n8n existentes ou variaveis de ambiente ja configuradas
- Response e um array JSON — pegar `[0]` para single record

## Estado atual do workflow (pos tarefa e9u)
- Webhook recebe POST body: `{ phone, tenant_id, imovel_id }`
- Node "Get a record" (Airtable) — STUB, usa imovel_id como Airtable record ID (falhara)
- Node "buscar_dados_lead" (Airtable) — STUB, usa imovel_id como Airtable record ID (falhara)
- Nodes GPT/Google Docs esperam campos: nome, telefone, cpf, imovel titulo/preco/endereco
</context>

<tasks>

<task type="auto">
  <name>Task 1: Ler workflow atual e mapear nodes Airtable a substituir</name>
  <files></files>
  <action>
1. Usar `mcp__n8n__n8n_get_workflow` com workflowId `bzK9KbNa5zEYcurj` para ler o workflow completo.

2. Identificar e documentar:
   - Node "Get a record" (Airtable lookup de imovel) — anotar posicao, conexoes de entrada/saida, e quais nodes downstream consomem seus dados
   - Node "buscar_dados_lead" (Airtable lookup de lead) — mesma analise
   - Quais campos exatos os nodes downstream (GPT, Google Docs, Set "Dados Formatados") esperam receber desses dois nodes (nomes dos campos, expressoes de referencia tipo `$('Get a record').item.json.xxx`)

3. Verificar se existem credenciais/variaveis Supabase ja configuradas no n8n (procurar em outros nodes HTTP Request do mesmo workflow ou inferir do padrao dos workflows migrados).

4. Anotar a posicao X/Y dos nodes Airtable para posicionar os novos HTTP Request nodes no mesmo lugar.

Resultado: Mapa completo de substituicao (quais nodes remover, quais criar, quais expressoes atualizar nos nodes downstream).
  </action>
  <verify>
    <automated>Workflow lido com sucesso via MCP tool — nodes Airtable identificados com suas conexoes</automated>
  </verify>
  <done>Mapa de substituicao documentado: nodes Airtable a remover, campos esperados downstream, posicoes, credenciais Supabase identificadas</done>
</task>

<task type="auto">
  <name>Task 2: Substituir nodes Airtable por HTTP Request Supabase e atualizar referencias downstream</name>
  <files></files>
  <action>
1. Construir o JSON atualizado do workflow substituindo os 2 nodes Airtable:

**Node "Buscar Lead Supabase" (substitui "buscar_dados_lead" ou "Get a record" — o que busca dados do lead):**
- Type: n8n-nodes-base.httpRequest
- Method: GET
- URL: `={{ $('Webhook').item.json.body.tenant_id }}` — NAO. Usar URL fixa com expressoes nos query params.
- URL base: Usar a variavel/credencial Supabase ja existente no n8n, ou hardcoded `https://{project}.supabase.co/rest/v1/leads`
- Query Parameters:
  - `tenant_id`: `eq.{{ $('Webhook').item.json.body.tenant_id }}`
  - `phone`: `eq.{{ $('Webhook').item.json.body.phone }}`
  - `select`: `id,name,phone,cpf,status` (NOTA: se cpf nao existir como coluna, usar `id,name,phone,status,metadata` e extrair cpf de metadata no Code JS)
- Headers: `apikey` + `Authorization: Bearer` com a chave Supabase
- Response: JSON array, pegar [0]

**Node "Buscar Imovel Supabase" (substitui o node Airtable que busca imovel):**
- Type: n8n-nodes-base.httpRequest
- Method: GET
- URL base: `https://{project}.supabase.co/rest/v1/properties`
- Query Parameters:
  - `id`: `eq.{{ $('Webhook').item.json.body.imovel_id }}`
  - `select`: `id,title,price,location,notes`
- Headers: mesmos do node anterior
- Response: JSON array, pegar [0]

2. Manter posicao X/Y dos nodes originais para nao quebrar o layout.

3. Atualizar conexoes (connections):
   - Entrada: mesmos nodes que alimentavam os Airtable nodes
   - Saida: mesmos nodes que os Airtable nodes alimentavam

4. Atualizar expressoes nos nodes downstream que referenciam dados dos nodes antigos:
   - Trocar `$('Get a record').item.json.XXX` para `$('Buscar Imovel Supabase').first().json[0].XXX` ou equivalente
   - Trocar `$('buscar_dados_lead').item.json.XXX` para `$('Buscar Lead Supabase').first().json[0].XXX` ou equivalente
   - Mapear campos Airtable -> Supabase:
     - nome do lead -> `name`
     - telefone -> `phone`
     - cpf -> `cpf` (ou `metadata.cpf`)
     - titulo imovel -> `title`
     - preco imovel -> `price`
     - endereco imovel -> `location` (NAO `address`)

5. Se houver um node "Code in JavaScript" ou "Dados do Formulario" intermediario que ja faz mapeamento, atualizar la ao inves de em cada node downstream.

6. NAO alterar: nodes GPT/AI Agent, Google Docs, Switch, Evolution API, Gmail. Apenas trocar a fonte dos dados.

7. Usar `mcp__n8n__n8n_update_full_workflow` para salvar. Manter `active: false`.

IMPORTANTE: Antes de montar o JSON final, verificar os nomes exatos dos campos que os nodes Airtable retornavam (podem ser "Nome", "Telefone", "CPF", "Titulo", "Preco", "Endereco" em portugues). Mapear cada campo Airtable para o equivalente Supabase.
  </action>
  <verify>
    <automated>
Apos update, ler workflow novamente com mcp__n8n__n8n_get_workflow e verificar:
1. Nenhum node com type "n8n-nodes-base.airtable" restante (exceto "Update record" no final que NAO faz parte do escopo)
2. Dois novos nodes HTTP Request existem com URLs contendo "/rest/v1/leads" e "/rest/v1/properties"
3. Conexoes dos novos nodes estao corretas (mesma entrada/saida dos antigos)
4. Expressoes downstream referenciam os novos nomes de node
5. Workflow permanece active: false
    </automated>
  </verify>
  <done>
- Nodes Airtable de busca (lead e imovel) substituidos por HTTP Request GET ao Supabase
- Campos chegam ao GPT/Google Docs: nome (lead.name), telefone (lead.phone), cpf (se disponivel), titulo (property.title), preco (property.price), endereco (property.location)
- Nenhum node GPT/AI Agent/Google Docs foi alterado
- Workflow salvo como inativo
  </done>
</task>

</tasks>

<verification>
1. Workflow lido via n8n MCP — nenhum node Airtable de busca restante (node "Update record" Airtable no final e fora do escopo, pode permanecer)
2. HTTP Request GET /rest/v1/leads com filtros tenant_id + phone presentes
3. HTTP Request GET /rest/v1/properties com filtro id presentes
4. Expressoes downstream apontam para os novos nodes Supabase
5. Campos esperados pelo GPT/Docs mapeados corretamente (nome, telefone, cpf, titulo, preco, endereco)
6. Workflow permanece inactive
</verification>

<success_criteria>
Workflow bzK9KbNa5zEYcurj busca lead e imovel exclusivamente do Supabase REST API. Nodes Airtable de busca removidos. Campos chegam ao GPT/Google Docs no mesmo formato esperado. Workflow salvo como inativo.
</success_criteria>

<output>
After completion, create `.planning/quick/260409-elu-buscar-lead-e-imovel-do-supabase-no-cont/260409-elu-SUMMARY.md`
</output>
