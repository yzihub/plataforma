---
phase: quick
plan: 260409-elu
subsystem: n8n-workflows
tags: [contrato, n8n, supabase, migration, airtable-removal, jurema-brokers]
dependency_graph:
  requires: [PADRONIZAR-ENTRADA-CONTRATO]
  provides: [MIGRATE-CONTRATO-SUPABASE]
  affects: [geracao-contrato-workflow, leads-table, properties-table]
tech_stack:
  added: []
  patterns: [supabase-rest-http-get, n8n-httpRequest-v4, vars-supabase-url-anon-key]
key_files:
  created:
    - .planning/quick/260409-elu-buscar-lead-e-imovel-do-supabase-no-cont/260409-elu-SUMMARY.md
  modified: []
  n8n_workflows_modified:
    - id: bzK9KbNa5zEYcurj
      name: "Onboarding | 2.1 Gerando Contrato"
      url: https://app.yzihub.com/workflow/bzK9KbNa5zEYcurj
      nodes_changed:
        - "Get a record (Airtable) -> Buscar Lead Supabase (HTTP GET leads)"
        - "buscar_dados_lead (Airtable) -> Buscar Imovel Supabase (HTTP GET properties)"
        - "Code in JavaScript (updated to read Supabase array response)"
        - "Dados Formatados (updated field references to Supabase data)"
        - "Dados do Formulario (added nome + cpf fields)"
decisions:
  - "Buscar Lead Supabase filtra por tenant_id + phone (padrao dos workflows migrados)"
  - "Buscar Imovel Supabase filtra por id=eq.imovel_id (tabela properties)"
  - "Code in JavaScript atualizado para ler lead[0] do array Supabase REST (nao mais campos Airtable)"
  - "Dados Formatados referencia Code in JavaScript para nome/cpf e Buscar Imovel para location/title/price"
  - "tipo_contrato vem do webhook body.tipo_contrato (fallback: intermediacao_venda)"
  - "cpf extraido de metadata.cpf ou metadata.CPF do lead"
  - "Update record (Airtable) mantido — fora do escopo desta tarefa"
metrics:
  duration: 10 minutes
  completed: 2026-04-09
  tasks_completed: 2
---

# Quick Task 260409-elu: Buscar Lead e Imovel do Supabase no Contrato — Summary

**One-liner:** Workflow "Onboarding | 2.1 Gerando Contrato" (bzK9KbNa5zEYcurj) migrado de Airtable para Supabase — dois nodes Airtable de busca substituidos por HTTP Request GET ao REST API (`/rest/v1/leads` e `/rest/v1/properties`).

---

## Tasks Completed

| # | Task | Resultado |
|---|------|-----------|
| 1 | Ler workflow e mapear nodes Airtable | Workflow lido via API, 2 nodes Airtable de busca identificados (Get a record, buscar_dados_lead), padrão Supabase confirmado via workflow setar_lead_quente |
| 2 | Substituir nodes Airtable por HTTP Request Supabase | 5 nodes modificados, workflow atualizado (HTTP 200), 12/12 verificações passaram |

---

## Nova Arquitetura do Workflow

```
Webhook (POST body: phone, tenant_id, imovel_id, tipo_contrato)
  |
  v
Buscar Lead Supabase (HTTP GET /rest/v1/leads?tenant_id=eq.X&phone=eq.Y)
  |
  v
Code in JavaScript (lê lead[0] do array Supabase — nome, telefone, cpf, notas)
  |
  v
Switch (tipo_contrato: intermediacao_venda | locacao | outros)
  |
  v
Dados do Formulario (Set) -> Gerador de Contrato (AI Agent GPT-4o)
  |
  v
Copiar Documento -> Atualizar Permissão -> Mover Arquivo Para Pasta
  |
  v
Buscar Imovel Supabase (HTTP GET /rest/v1/properties?id=eq.imovel_id)
  |
  v
Dados Formatados (Set — placeholders Google Docs: nome, cpf, endereço, titulo, preco)
  |
  v
Atualizar Documento (Google Docs) -> Download -> Extract -> Email + WhatsApp
```

---

## Nodes Modificados

| Node | Mudança |
|------|---------|
| **Get a record** (Airtable) | Substituido por **Buscar Lead Supabase** (HTTP GET /rest/v1/leads) |
| **buscar_dados_lead** (Airtable) | Substituido por **Buscar Imovel Supabase** (HTTP GET /rest/v1/properties) |
| **Code in JavaScript** | Atualizado para ler `lead[0]` do array Supabase REST — extrai nome, telefone, cpf (de metadata), notas |
| **Dados Formatados** | Campos atualizados: nomedocliente/cpfcnpj vem de Code JS, Endereço/titulo/preco vem de Buscar Imovel |
| **Dados do Formulario** | Adicionados campos nome e cpf propagados do Code JS |

---

## Nodes NÃO Alterados

- Switch (tipo_contrato routing — inalterado)
- Gerador de Contrato (AI Agent GPT-4o)
- Copiar Documento Modelo (Google Drive)
- Atualizar Permissão (Google Drive)
- Mover Arquivo Para Pasta (Google Drive)
- Atualizar Documento (Google Docs)
- Download file / Extract from File
- Formata Texto para Whatsapp (Agent)
- Formata Texto para o Email (Agent)
- Enviar documento (Evolution API)
- Converte em Pdf (HTTP)
- Gmail
- **Update record** (Airtable — fora do escopo)

---

## Padrão Supabase HTTP Usado

```json
{
  "method": "GET",
  "url": "={{ $vars.SUPABASE_URL + '/rest/v1/leads' }}",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      { "name": "apikey", "value": "={{ $vars.SUPABASE_ANON_KEY }}" },
      { "name": "Authorization", "value": "={{ 'Bearer ' + $vars.SUPABASE_ANON_KEY }}" },
      { "name": "Content-Type", "value": "application/json" }
    ]
  },
  "sendQuery": true,
  "queryParameters": {
    "parameters": [
      { "name": "select", "value": "id,name,phone,status,notes,metadata" },
      { "name": "tenant_id", "value": "={{ 'eq.' + $('Webhook').item.json.body.tenant_id }}" },
      { "name": "phone", "value": "={{ 'eq.' + $('Webhook').item.json.body.phone }}" }
    ]
  }
}
```

---

## Campos Mapeados (Airtable -> Supabase)

| Campo downstream | Airtable (antes) | Supabase (depois) |
|---|---|---|
| nomedocliente | `Nome do Cliente (from GESTÃO DE LEADS)` | `lead.name` via Code JS |
| cpfcnpj | `CPF / CNPJ` | `lead.metadata.cpf` via Code JS |
| Endereço | `Endereço` (Airtable) | `property.location` via Buscar Imovel |
| titulo_imovel | (inexistente) | `property.title` |
| preco_imovel | (inexistente) | `property.price` |
| tipo_contrato | `Tipo de Contrato` (Airtable) | `webhook.body.tipo_contrato` |
| notas_gestor | `NOTAS DO GESTOR` (Airtable) | `lead.notes` |

---

## Verificação Pós-Update

```
Airtable lookup nodes: 0 (OK - Update record mantido)
Buscar Lead Supabase: /rest/v1/leads, tenant_id + phone (OK)
Buscar Imovel Supabase: /rest/v1/properties, id=eq.imovel_id (OK)
Conexoes: Webhook -> Buscar Lead -> Code JS -> Switch (OK)
           Mover Arquivo -> Buscar Imovel -> Dados Formatados (OK)
Workflow active: false (OK)
Dados Formatados: referencia Code JS para nome/cpf (OK)
Dados Formatados: referencia Buscar Imovel para location/title/price (OK)
Resultado: 12/12 verificações passaram
```

---

## Known Stubs

- **tipo_contrato**: vem de `webhook.body.tipo_contrato` — o chamador do webhook precisa fornecer este campo. Fallback: `"intermediacao_venda"`. O Switch roteia com base neste campo — se omitido, todos os contratos serão roteados como venda.
- **Update record (Airtable)**: o node final que atualiza o Airtable permanece — é um stub/legado a ser substituido em tarefa futura quando a tabela contracts do Supabase estiver completamente integrada.

---

## Deviations from Plan

**1. [Rule 2 - Missing functionality] Campos `tipo_contrato`, `nome`, `cpf` propagados no Dados do Formulario**
- **Found during:** Task 2
- **Issue:** O Dados do Formulario (Set node que alimenta o GPT) não tinha campos nome/cpf explícitos; o GPT usa `notas_gestor` que agora vem do lead.notes
- **Fix:** Adicionados campos `nome` e `cpf` ao Dados do Formulario para disponibilizar ao prompt do GPT
- **Files modified:** n8n workflow bzK9KbNa5zEYcurj (Dados do Formulario node)

**2. [Rule 1 - Bug] `tipo_contrato` migrado do body do webhook (não mais do Airtable)**
- **Found during:** Task 2 — análise do Code in JavaScript
- **Issue:** O Code JS lia `entrada["Tipo de Contrato"]` do Airtable. Após migração, esse campo não existe mais. O Switch depende de `tipo_contrato`.
- **Fix:** `tipo_contrato` agora lido de `body.tipo_contrato` com fallback `"intermediacao_venda"`. O chamador do webhook precisa passar este campo.

## Self-Check: PASSED

- Workflow `bzK9KbNa5zEYcurj` atualizado via REST API (HTTP 200)
- 0 nodes Airtable de lookup restantes (Update record mantido conforme escopo)
- 2 novos HTTP Request nodes: Buscar Lead Supabase + Buscar Imovel Supabase
- Conexões corretas: Webhook -> Buscar Lead -> Code JS -> Switch; Mover Arquivo -> Buscar Imovel -> Dados Formatados
- Code in JavaScript atualizado para ler array Supabase
- Dados Formatados referencia dados Supabase (Code JS para lead, input.first para property)
- Workflow permanece inativo (active: false)
- 12/12 verificações automatizadas passaram
