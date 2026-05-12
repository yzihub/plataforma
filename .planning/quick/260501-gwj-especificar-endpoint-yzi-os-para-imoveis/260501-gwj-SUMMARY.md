---
phase: quick-260501-gwj
plan: "01"
subsystem: documentation
tags: [spec, backend, imoveis, webhook, yzi-os]
dependency_graph:
  requires: []
  provides: [SPEC-IMOVEIS-01]
  affects: [yzi-os-backend, n8n-workflow-imoveis]
tech_stack:
  added: []
  patterns: [webhook-endpoint, bearer-auth, upsert-merge-parcial, jsonb-merge, idempotent-delete]
key_files:
  created:
    - .planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md
  modified: []
decisions:
  - "v1 usa bearer token estático em env var WEBHOOK_IMOVEIS_SECRET — JWT/HMAC ficam para v2"
  - "delete é hard delete (remoção física) na v1 — soft delete fica para v2"
  - "upsert aplica merge parcial: chave ausente preserva valor anterior, null explícito limpa coluna"
  - "metadata (jsonb) usa merge via || (concatenação), não substituição total"
  - "data._extras e envelope _extras são IGNORADOS na v1 sem retornar erro"
  - "endpoint deve ser idempotente — reenvio não duplica nem retorna 4xx"
metrics:
  duration: "15 min"
  completed_date: "2026-05-01"
  tasks_completed: 1
  files_created: 1
---

# Quick 260501-gwj: Especificar Endpoint POST /webhook/imoveis — Summary

## One-liner

Spec completa do endpoint `POST /webhook/imoveis` no YZI OS — contrato HTTP v1 cobrindo bearer auth, 3 ações (upsert/delete/unpublish), mapeamento de 18 colunas da tabela `imoveis`, merge parcial, respostas HTTP e checklist de implementação para dev backend.

## Arquivo entregue

`.planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md`

- 632 linhas
- 13 seções na ordem especificada pelo plano
- Exemplos completos de request + response para todas as ações e casos de erro

## Decisões v1 tomadas

| Decisão | Justificativa |
|---------|---------------|
| Auth: bearer token estático em `WEBHOOK_IMOVEIS_SECRET` | Simples, suficiente para volume atual interno; JWT/HMAC ficam v2 |
| Hard delete (remoção física) | Sem necessidade de soft delete no MVP; facilita queries de listagem |
| Merge parcial no upsert | Chave ausente = preserva valor; null explícito = limpa coluna. Evita apagar campos não enviados pelo n8n |
| jsonb merge via `\|\|` para `metadata` | Alinhado com padrão quick-260408-rzc; não substitui objeto inteiro |
| `_extras` ignorado sem erro | Fonte externa pode enviar campos extras livremente; backend descarta antes de persistir |
| Idempotência total | Delete/unpublish de imóvel inexistente retorna 200 + `found: false`, nunca 404 |

## Itens explicitamente fora de escopo na v1 (seção 11 da spec)

- `data._extras` persistido
- HMAC / JWT / rotação automática de secret
- Soft delete
- Callback webhook ao chamador
- Versionamento via header
- Rate limiting
- Batch upsert (1 evento = 1 imóvel)
- Dead-letter queue / reprocessamento
- Validação de URL nos campos de link

## Próxima ação recomendada

Handoff da spec para o dev backend YZI OS implementar `POST /webhook/imoveis`. O arquivo `SPEC-ENDPOINT.md` contém tudo que o desenvolvedor precisa para implementar sem perguntas adicionais.

Após implementação, atualizar os workflows n8n que hoje gravam diretamente no Supabase para usar o novo endpoint.

## Deviations from Plan

Nenhum — plano executado exatamente como especificado.

## Self-Check: PASSED

- [x] SPEC-ENDPOINT.md existe em `.planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/`
- [x] 632 linhas (>= 200 exigido)
- [x] Commit `3034b7f` existe no histórico
- [x] As 3 ações cobertas (imovel.upsert, imovel.delete, imovel.unpublish)
- [x] Ambos os tenant_ids na whitelist (Café com Pam + Jurema Brokers)
- [x] `_extras` mencionado explicitamente como IGNORADO (10 ocorrências)
- [x] Todas as respostas têm `ok: true | false`
- [x] Nenhum arquivo .py, .ts ou .sql criado ou modificado
