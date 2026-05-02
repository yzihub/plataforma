---
phase: quick-260501-ufh
plan: "01"
subsystem: wordpress-integration
tags: [php, wordpress, webhook, jetengine, imoveis]
dependency_graph:
  requires: [quick-260501-n24, quick-260501-rg3]
  provides: [WP-WEBHOOK-SNIPPET, WP-INSTALL-DOCS]
  affects: [imoveis-sync, supabase-imoveis]
tech_stack:
  added: []
  patterns:
    - wp_remote_post para webhooks WordPress → plataforma YZI Hub
    - Loop guard via static variable para prevenir recursao em hooks WordPress
    - Normalizacao de formato numerico BR (525.000,00) para float antes do POST
key_files:
  created:
    - .planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php
    - .planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md
  modified: []
decisions:
  - Tenant Jurema Brokers hardcoded no snippet (nao via constante) para MVP — refatorar quando multi-tenant necessario
  - Request bloqueante (blocking true, timeout 10s) para garantir rastreabilidade de falhas no error_log
  - id_imovel com fallback em 3 niveis: meta 'id_imovel' → slug → 'post-{ID}', truncado em 100 chars
  - quartos/suites/vagas enviados como string (compativel com schema text do Supabase atual)
  - metragem/valor convertidos para float com suporte a formato BR (525.000,00) para evitar HTTP 422
  - Hook save_post cobre apenas status publish; transition_post_status cobre apenas unpublish para evitar duplicidade
metrics:
  duration: "8 min"
  completed_date: "2026-05-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase quick-260501-ufh Plan 01: Criar Snippet PHP WordPress Webhook Imoveis Summary

**One-liner:** Snippet PHP standalone com 3 hooks WordPress (save/transition/delete) e normalizacao completa de tipos que dispara webhooks JetEngine para o endpoint POST /api/webhook/imoveis via wp_remote_post com Bearer auth.

## Arquivos Criados

| Arquivo | Descricao | Linhas |
|---|---|---|
| `yziws-webhook-imoveis.php` | Snippet PHP instalavel via Code Snippets com hooks completos | 360 |
| `INSTALACAO.md` | Guia completo de instalacao, validacao e troubleshooting | 190 |

## Decisoes Tomadas

**Tenant hardcoded**: O `tenant_id` da Jurema Brokers (`82cc7aa9-fc6e-4f37-8d8e-8a71c1691361`) esta hardcoded como constante PHP interna. Decisao de MVP — simplifica instalacao sem necessidade de constante extra no wp-config.php. Para suporte multi-tenant, refatorar para ler `YZIWS_TENANT_ID` de wp-config.php.

**Request bloqueante com timeout 10s**: `blocking: true` garante que falhas (HTTP 4xx, WP_Error) sejam capturadas e logadas via `error_log`. A alternativa fire-and-forget (`blocking: false`) nao permite rastreabilidade de falhas. Documentado como limitacao no INSTALACAO.md.

**Fallback de id_imovel em 3 niveis**: meta `id_imovel` → slug do post → `post-{ID}`. Garante que posts sem slug (rascunhos novos) sempre tenham identificador valido. Truncado em 100 chars conforme contrato do endpoint.

**Divisao de responsabilidade entre hooks**: `save_post` cobre `publish` → evita codigo duplicado. `transition_post_status` cobre apenas `publish → outro` (unpublish). `before_delete_post` cobre delete permanente. Essa divisao previne envio duplo de `imovel.upsert` ao publicar.

**Normalizacao de tipos**: `metragem` e `valor` convertidos para `float` com suporte a formato BR (`525.000,00`). `quartos`, `suites`, `vagas` enviados como `string` (schema text do Supabase nao aceita int diretamente sem migration). Alinhado com quick-260501-n24 que retorna 422 se metragem/valor forem string.

## Como Testar End-to-End

Ver secao 5 do `INSTALACAO.md` para o guia completo. Resumo:

1. Instalar snippet via Code Snippets no wp-admin.
2. Editar qualquer imovel publicado e clicar em Atualizar.
3. Verificar no Supabase (tabela `imoveis`) que `updated_at` foi atualizado.
4. Alternativa: usar o curl da secao 5.2 do INSTALACAO.md para validar o endpoint diretamente.

## Proxima Quick Task Sugerida

Apos instalar e ativar o snippet na producao:
- Monitorar logs da Vercel por 24h (`Deployments > Functions > api/webhook/imoveis`).
- Validar visualmente a pagina `/imoveis` da plataforma para confirmar sincronizacao.
- Avaliar desativar ou substituir o workflow n8n "Ler Imoveis JetEngine" por este endpoint.

## Deviations from Plan

None — plano executado exatamente como escrito.

## Self-Check: PASSED

- [x] `yziws-webhook-imoveis.php` existe: CONFIRMED (11357 bytes, 360 linhas)
- [x] `INSTALACAO.md` existe: CONFIRMED (190 linhas > 60 minimo)
- [x] Commit 176f9a4 (Task 1 - PHP snippet): CONFIRMED
- [x] Commit 31107c6 (Task 2 - INSTALACAO.md): CONFIRMED
- [x] 3 hooks registrados (save_post, transition_post_status, before_delete_post): CONFIRMED
- [x] Loop guard static $in_progress: CONFIRMED
- [x] Tenant hardcoded 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361: CONFIRMED
- [x] Headers Authorization Bearer + X-Source: wordpress: CONFIRMED
- [x] metragem/valor como float, quartos/suites/vagas como string: CONFIRMED
