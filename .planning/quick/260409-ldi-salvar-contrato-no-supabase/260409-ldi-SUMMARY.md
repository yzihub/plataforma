---
phase: quick
plan: 260409-ldi
subsystem: n8n-workflows
tags: [contrato, n8n, supabase, persist, contracts-table, jurema-brokers]
dependency_graph:
  requires: [MIGRATE-CONTRATO-SUPABASE, contracts-table-supabase]
  provides: [PERSIST-CONTRACT-SUPABASE]
  affects: [geracao-contrato-workflow, contracts-table]
tech_stack:
  added: []
  patterns: [supabase-rest-http-post, n8n-httpRequest-v4, vars-supabase-url-anon-key]
key_files:
  created:
    - .planning/quick/260409-ldi-salvar-contrato-no-supabase/260409-ldi-SUMMARY.md
  modified: []
  n8n_workflows_modified:
    - id: bzK9KbNa5zEYcurj
      name: "Onboarding | 2.1 Gerando Contrato"
      url: https://app.yzihub.com/workflow/bzK9KbNa5zEYcurj
      nodes_added:
        - "Salvar Contrato Supabase (HTTP POST /rest/v1/contracts)"
      connections_changed:
        - "Mover Arquivo Para Pasta -> Salvar Contrato Supabase -> Buscar Imovel Supabase"
decisions:
  - "Node inserido em serie (nao paralelo) entre Mover Arquivo Para Pasta e Buscar Imovel Supabase para garantir sequenciamento determinista"
  - "file_url referencia Copiar Documento Modelo.webViewLink (Google Doc view link) — disponivel antes do move"
  - "lead_id extraido de Buscar Lead Supabase.first().json[0].id (array REST Supabase)"
  - "type mapeado inline no jsonBody: intermediacao_venda->venda, intermediacao_locacao->locacao, outros->servico"
  - "status sempre 'pendente' — compativel com CHECK constraint da tabela contracts"
metrics:
  duration: 8 minutes
  completed: 2026-04-09
  tasks_completed: 1
---

# Quick Task 260409-ldi: Salvar Contrato no Supabase — Summary

**One-liner:** Node HTTP POST "Salvar Contrato Supabase" adicionado ao workflow bzK9KbNa5zEYcurj — insere registro na tabela `contracts` (tenant_id, lead_id, imovel_id, lead_name, status=pendente, file_url, type, title, notes) entre os nodes de Google Drive e o inicio do envio por WhatsApp/Email.

---

## Tasks Completed

| # | Task | Resultado |
|---|------|-----------|
| 1 | Adicionar node "Salvar Contrato Supabase" ao workflow via n8n API | Node criado, conectado, workflow atualizado (HTTP 200), 8/8 verificacoes passaram |

---

## Novo Node: Salvar Contrato Supabase

**Tipo:** HTTP Request (POST)  
**ID do node:** acf43659-2a70-49ce-92b1-9f6cb7a01c04  
**Posicao no canvas:** [1400, 224]

### Configuracao

```json
{
  "method": "POST",
  "url": "={{ $vars.SUPABASE_URL + '/rest/v1/contracts' }}",
  "headers": {
    "apikey": "={{ $vars.SUPABASE_ANON_KEY }}",
    "Authorization": "={{ 'Bearer ' + $vars.SUPABASE_ANON_KEY }}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  "body": {
    "tenant_id": "$('Code in JavaScript').item.json.tenant_id",
    "lead_id": "$('Buscar Lead Supabase').first().json[0].id",
    "imovel_id": "$('Code in JavaScript').item.json.imovel_id || null",
    "lead_name": "$('Code in JavaScript').item.json.nome",
    "status": "pendente",
    "file_url": "$('Copiar Documento Modelo').item.json.webViewLink || alternateLink || null",
    "type": "intermediacao_venda->venda | intermediacao_locacao->locacao | outros->servico",
    "title": "Compra e Venda / Locacao / Servico — {nome_lead}",
    "notes": "$('Code in JavaScript').item.json.notas_gestor || null"
  }
}
```

### Fluxo Atualizado

```
[ANTES]
Mover Arquivo Para Pasta (Google Drive)
  |
  v
Buscar Imovel Supabase (HTTP GET)
  |
  v
Dados Formatados -> ... -> WhatsApp + Email

[DEPOIS]
Mover Arquivo Para Pasta (Google Drive)
  |
  v
Salvar Contrato Supabase (HTTP POST /rest/v1/contracts)  <-- NOVO
  |
  v
Buscar Imovel Supabase (HTTP GET)
  |
  v
Dados Formatados -> ... -> WhatsApp + Email
```

---

## Verificacao Pos-Update

```
1. Node "Salvar Contrato Supabase" existe: OK
2. Method POST: OK
3. URL contém /rest/v1/contracts: OK
4. Body contém tenant_id: OK
   Body contém lead_id: OK
   Body contém imovel_id: OK
   Body contém lead_name: OK
   Body contém "pendente": OK
   Body contém file_url: OK
5. WhatsApp node presente: OK (Formata Texto para Whatsapp)
6. Gmail node presente: OK
7. Mover Arquivo -> Salvar Contrato Supabase: OK
8. Salvar Contrato Supabase -> Buscar Imovel Supabase: OK

Resultado: 8/8 verificacoes passaram
```

---

## Nodes NÃO Alterados

- Webhook
- Buscar Lead Supabase
- Code in JavaScript
- Switch
- Dados do Formulario
- Gerador de Contrato (AI Agent GPT-4o)
- Copiar Documento Modelo (Google Drive)
- Atualizar Permissao (Google Drive)
- Mover Arquivo Para Pasta (Google Drive)
- Buscar Imovel Supabase
- Dados Formatados
- Atualizar Documento (Google Docs)
- Download file / Extract from File
- Formata Texto para Whatsapp
- Formata Texto para o Email
- Converte em Pdf
- Gmail
- Enviar documento (Evolution API)
- Update record (Airtable — legado)

---

## Known Stubs

- **file_url fallback**: Se `Copiar Documento Modelo` nao retornar `webViewLink` nem `alternateLink`, o campo `file_url` sera `null`. O Google Drive node geralmente retorna `webViewLink` — risco baixo.
- **Update record (Airtable)**: O node final que atualiza o Airtable permanece como legado. Sera substituido em tarefa futura que remova completamente o Airtable do workflow.

---

## Deviations from Plan

None — plano executado exatamente como escrito.

## Self-Check: PASSED

- Workflow `bzK9KbNa5zEYcurj` atualizado via REST API (HTTP 200)
- Node "Salvar Contrato Supabase" existe no workflow verificado
- POST /rest/v1/contracts com todos os campos obrigatorios (tenant_id, lead_id, imovel_id, lead_name, status=pendente, file_url)
- Conexoes validas: Mover Arquivo Para Pasta -> Salvar Contrato Supabase -> Buscar Imovel Supabase
- Nodes de envio (WhatsApp, Email, Gmail, Enviar documento) nao foram alterados
- 8/8 verificacoes automatizadas passaram
