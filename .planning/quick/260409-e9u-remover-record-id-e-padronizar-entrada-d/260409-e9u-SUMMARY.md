---
phase: quick
plan: 260409-e9u
subsystem: n8n-workflows
tags: [contrato, n8n, padronizacao, entrada, webhook, jurema-brokers]
dependency_graph:
  requires: [MAP-CONTRATO]
  provides: [PADRONIZAR-ENTRADA-CONTRATO]
  affects: [geracao-contrato-workflow]
tech_stack:
  added: []
  patterns: [webhook-post-body, phone-tenant-imovel-entry]
key_files:
  created:
    - .planning/quick/260409-e9u-remover-record-id-e-padronizar-entrada-d/260409-e9u-SUMMARY.md
  modified: []
  n8n_workflows_modified:
    - id: bzK9KbNa5zEYcurj
      name: "Onboarding | 2.1 Gerando Contrato"
      url: https://app.yzihub.com/workflow/bzK9KbNa5zEYcurj
      nodes_changed: [Webhook, "Get a record", "Code in JavaScript", "Dados do Formulario", buscar_dados_lead]
decisions:
  - "OPCAO B aplicada: mantido o node 'Get a record' (Airtable) mas com id trocado de query.record_id para body.imovel_id — migração completa para Supabase é tarefa futura separada"
  - "record_id removido de todos os 4 nodes de entrada: Webhook, Get a record, Dados do Formulario, buscar_dados_lead"
  - "Code JS atualizado para extrair phone/tenant_id/imovel_id do body e propagá-los para nodes downstream"
metrics:
  duration: 7 minutes
  completed: 2026-04-09
---

# Quick Task 260409-e9u: Remover record_id e Padronizar Entrada do Workflow de Contrato

**One-liner:** Webhook do workflow "Onboarding | 2.1 Gerando Contrato" (bzK9KbNa5zEYcurj) atualizado de query.record_id para body JSON com phone + tenant_id + imovel_id, alinhando ao padrão dos workflows migrados.

---

## Resultado

Workflow `bzK9KbNa5zEYcurj` atualizado com sucesso. Permanece inativo (active: false).

### Novo formato de entrada

**Antes:**
```
POST /webhook/enviar-contrato?record_id=recXXXXXX
```

**Depois:**
```json
POST /webhook/enviar-contrato
Content-Type: application/json

{
  "phone": "5511999999999",
  "tenant_id": "jurema-brokers",
  "imovel_id": "uuid-do-imovel"
}
```

---

## Nodes Modificados

| Node | Mudança |
|------|---------|
| **Webhook** | Adicionado `httpMethod: "POST"` para garantir leitura do body JSON |
| **Get a record** | `id` trocado de `$json.query.record_id` para `$('Webhook').item.json.body.imovel_id` |
| **Code in JavaScript** | Adicionada seção "ENTRADA PADRONIZADA" que lê `phone`, `tenant_id`, `imovel_id` do body; novos campos adicionados ao objeto de retorno |
| **Dados do Formulario** | Campo `record_id` removido; campos `phone`, `tenant_id`, `imovel_id` adicionados mapeando do body do webhook |
| **buscar_dados_lead** | `id` trocado de `$('Get a record').item.json.id` para `$('Webhook').item.json.body.imovel_id` |

---

## Nodes NÃO Alterados (lógica interna preservada)

- Switch (roteamento por tipo_contrato)
- Gerador de Contrato (AI Agent GPT-4o)
- Structured Output Parser
- Copiar Documento Modelo (Google Drive)
- Atualizar Permissão (Google Drive)
- Mover Arquivo Para Pasta (Google Drive)
- Dados Formatados (Set — placeholders do Google Docs)
- Atualizar Documento (Google Docs)
- Download file (Google Drive)
- Extract from File
- Formata Texto para Whatsapp (Agent)
- Formata Texto para o Email (Agent)
- Enviar documento (Evolution API)
- Converte em Pdf (HTTP)
- Gmail
- Update record (Airtable)

---

## Verificação Pós-Update

```
record_id em nodes de entrada:
  Dados do Formulario: False  (OK)
  Webhook: False              (OK)
  Get a record: False         (OK)
  buscar_dados_lead: False    (OK)

Webhook httpMethod: POST      (OK)
Workflow active: False        (OK - inativo)
```

---

## Nota sobre o Node "Get a record" (Airtable)

O node "Get a record" foi mantido (OPCAO B) mas agora usa `imovel_id` como chave de busca. Isso é um **stub temporário** — o `imovel_id` é um UUID Supabase e não um Airtable record ID, portanto este lookup Airtable falhará em produção. A migração completa deste node para Supabase (usando a tabela `properties`) é escopo de tarefa futura.

**Stubs existentes:**
- `Get a record` id usa `imovel_id` (UUID Supabase) como chave Airtable — lookup falhará; resolver na migração Airtable→Supabase
- `buscar_dados_lead` mesma situação — usa `imovel_id` como chave Airtable

---

## Deviations from Plan

None — plan executed exactly as written. OPCAO B selecionada para o node "Get a record" (manter o node mas trocar a chave de busca) conforme previsto no plano.

## Self-Check: PASSED

- Workflow `bzK9KbNa5zEYcurj` lido via n8n REST API com sucesso
- 5 nodes modificados: Webhook, Get a record, Code in JavaScript, Dados do Formulario, buscar_dados_lead
- Verificação pós-update confirmou ausência de `record_id` em todos os nodes de entrada
- Workflow permanece inativo (active: false)
- Nenhum arquivo do repositório foi modificado (workflow vive exclusivamente no n8n)
