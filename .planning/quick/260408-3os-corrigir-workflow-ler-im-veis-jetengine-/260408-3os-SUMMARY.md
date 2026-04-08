---
phase: quick
plan: 260408-3os
subsystem: n8n-workflow
tags: [n8n, supabase, imoveis, jurema-brokers, patch, http-request, upsert]
dependency_graph:
  requires: [260408-2i3]
  provides: [workflow-patch-ler-imoveis-http-request-260408]
  affects: [ler-imoveis-jetengine-workflow, tabela-imoveis-supabase]
tech_stack:
  added: []
  patterns: [http-request-supabase-rest-api, postgrest-upsert-on-conflict, no-native-credentials]
key_files:
  created:
    - .planning/quick/260408-3os-corrigir-workflow-ler-im-veis-jetengine-/workflow-patch-ler-imoveis-http.json
decisions:
  - "Usando HTTP Request em vez de node nativo Supabase — elimina dependencia de credencial 'Supabase JUREMA' errada"
  - "Service Role Key do Supabase YZI hardcoded nos headers — banco correto (dwmbklfkrtumfaxrbxio.supabase.co)"
  - "Upsert via POST /rest/v1/imoveis?on_conflict=tenant_id,id_imovel + Prefer: resolution=merge-duplicates"
  - "tenant_id fixo aaaaaaaa-0002-0002-0002-000000000002 (Jurema Brokers) no body do HTTP Request"
  - "18 campos identicos ao patch anterior — apenas o mecanismo de escrita mudou"
metrics:
  duration: 5min
  completed: "2026-04-08"
  tasks_completed: 1
  files_modified: 1
---

# Quick Plan 260408-3os: Corrigir workflow Ler Imóveis JetEngine Summary

**One-liner:** Patch corrigido usando HTTP Request + Supabase REST API para upsert na tabela `imoveis`, sem credencial nativa n8n, apontando para o banco YZI correto.

## Tasks Completed

| Task | Name | Files |
|------|------|-------|
| 1 | Gerar patch HTTP Request para workflow Ler Imoveis JetEngine | workflow-patch-ler-imoveis-http.json |

## What Was Built

Arquivo `workflow-patch-ler-imoveis-http.json` com configuração completa do node HTTP Request para substituir o node Supabase nativo no workflow "Ler Imoveis JetEngine".

### Correções aplicadas em relação ao patch 260408-2i3

| Problema | Antes (260408-2i3) | Depois (260408-3os) |
|----------|-------------------|---------------------|
| Node tipo | `n8n-nodes-base.supabase` | `n8n-nodes-base.httpRequest` |
| Credencial | Credencial "Supabase JUREMA" (banco errado) | Nenhuma credencial — service role key nos headers |
| Banco | Credencial apontava para projeto errado | `dwmbklfkrtumfaxrbxio.supabase.co` (YZI) direto na URL |
| Upsert | `conflictColumns` do node Supabase | `?on_conflict=tenant_id,id_imovel` na URL + `Prefer: resolution=merge-duplicates` |

### Configuração do HTTP Request

- **URL:** `https://dwmbklfkrtumfaxrbxio.supabase.co/rest/v1/imoveis?on_conflict=tenant_id,id_imovel`
- **Method:** POST
- **Headers:**
  - `apikey`: service role key YZI
  - `Authorization`: Bearer service role key YZI
  - `Content-Type`: application/json
  - `Prefer`: resolution=merge-duplicates
- **Body:** JSON com os 18 campos, tenant_id fixo Jurema

### O que NÃO mudou

- Lógica de leitura WordPress/JetEngine (intacta)
- Node Set de transformação de campos (intacto)
- Os 18 campos mapeados (idênticos)
- tenant_id fixo da Jurema: `aaaaaaaa-0002-0002-0002-000000000002`

## Self-Check: PASSED

- [x] Arquivo JSON criado: `workflow-patch-ler-imoveis-http.json`
- [x] type = "n8n-nodes-base.httpRequest"
- [x] method = "POST"
- [x] URL contém `?on_conflict=tenant_id,id_imovel`
- [x] Header `Prefer: resolution=merge-duplicates` presente
- [x] Header `apikey` com service role key YZI
- [x] Header `Authorization: Bearer` com service role key YZI
- [x] tenant_id fixo Jurema hardcoded no body
- [x] 18 campos mapeados no body
- [x] Sem referencia a credencial nativa n8n
- [x] Sem referencia a node Supabase nativo
- [x] Instrucoes passo-a-passo para aplicar no n8n incluidas
