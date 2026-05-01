---
phase: quick-260501-rg3
plan: "01"
subsystem: webhook-imoveis
tags: [webhook, producao, vercel, wordpress, documentation]
dependency_graph:
  requires: [quick-260501-n24]
  provides: [PRODUCAO.md, guia-configuracao-webhook-producao]
  affects: [wordpress-snippet-task]
tech_stack:
  added: []
  patterns: [server-only-env-var, bearer-auth, wp-config-constants]
key_files:
  created:
    - .planning/quick/260501-rg3-preparar-producao-webhook-imoveis/PRODUCAO.md
  modified: []
decisions:
  - "URL publica confirmada pelo usuario: https://plataforma.yzihub.com"
  - "Campo do body e 'evento' (nao 'event') — alinhado com a implementacao real do route.ts"
  - "Documento auto-suficiente: quem le nao precisa abrir o codigo do endpoint"
metrics:
  duration: "2 minutes"
  completed: "2026-05-01T22:55:00Z"
  tasks_completed: 1
  tasks_total: 2
  files_created: 1
  files_modified: 0
---

# Phase quick-260501-rg3 Plan 01: Preparar Producao Webhook Imoveis — Summary

**One-liner:** Guia operacional completo para configurar `POST /api/webhook/imoveis` em producao na Vercel, com geracao de secret, configuracao de env var, constantes WordPress e checklist de 8 itens.

---

## What Was Done

**Task 1 (decision):** Ja resolvida antes da execucao. URL confirmada pelo usuario: `https://plataforma.yzihub.com`. URL final do webhook: `https://plataforma.yzihub.com/api/webhook/imoveis`.

**Task 2 (auto):** Criado `PRODUCAO.md` com todas as secoes obrigatorias:

1. URL publica final (base + endpoint completo, metodo, header obrigatorio)
2. Geracao de secret — comando `openssl rand -hex 32` (macOS/Linux) + dois equivalentes PowerShell (Windows)
3. Configuracao `WEBHOOK_IMOVEIS_SECRET` na Vercel — Opcao A (Dashboard UI) e Opcao B (CLI)
4. Constantes WordPress para `wp-config.php` — `YZIWS_WEBHOOK_SECRET` e `YZIWS_WEBHOOK_URL`
5. Checklist de 8 itens pre-ativacao com comandos `curl` exatos para validar 401 (sem auth) e 200 (com auth)
6. Referencia rapida de campos do body (evento, tenant_id, id_imovel, data)
7. Proximo passo: instalar snippet WordPress como nova quick task

---

## URL Publica Confirmada

```
https://plataforma.yzihub.com/api/webhook/imoveis
```

---

## Artifacts

| Arquivo | Caminho | Finalidade |
|---------|---------|------------|
| PRODUCAO.md | `.planning/quick/260501-rg3-preparar-producao-webhook-imoveis/PRODUCAO.md` | Guia operacional de configuracao de producao |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Campo 'evento' documentado corretamente (nao 'event')**
- **Found during:** Task 2
- **Issue:** O plano de contexto listava `event` como campo do body, mas a implementacao real em `src/app/api/webhook/imoveis/route.ts` usa `evento` (em portugues).
- **Fix:** Documentado `evento` no PRODUCAO.md e na tabela de referencia de campos, alinhado com o codigo real.
- **Files modified:** PRODUCAO.md (criado ja com o valor correto)

---

## Checklist Pre-ativacao

O PRODUCAO.md entrega um checklist de 8 itens que o usuario deve completar antes de instalar o snippet WordPress:

1. Secret de producao gerado (64 chars hexadecimais)
2. `WEBHOOK_IMOVEIS_SECRET` configurado em Production na Vercel
3. Redeploy de producao executado apos adicionar a variavel
4. Backup do wp-config.php feito
5. `YZIWS_WEBHOOK_SECRET` definido no wp-config.php
6. `YZIWS_WEBHOOK_URL` definido no wp-config.php
7. Teste sem auth retorna 401
8. Teste com auth valida retorna 200

---

## Proximo Passo

Apos completar 100% do checklist do PRODUCAO.md:

> **Nova quick task:** Instalar o snippet PHP no WordPress que dispara `imovel.upsert` / `imovel.delete` / `imovel.unpublish` para `YZIWS_WEBHOOK_URL` usando `YZIWS_WEBHOOK_SECRET` no header `Authorization: Bearer`.

---

## Commits

| Task | Commit | Mensagem |
|------|--------|----------|
| Task 2 | `92e563c` | `docs(quick-260501-rg3-02): criar PRODUCAO.md com guia de configuracao do webhook imoveis` |

---

## Self-Check: PASSED

- [x] `.planning/quick/260501-rg3-preparar-producao-webhook-imoveis/PRODUCAO.md` existe
- [x] Contem `WEBHOOK_IMOVEIS_SECRET` — OK
- [x] Contem `YZIWS_WEBHOOK_SECRET` — OK
- [x] Contem `openssl rand -hex 32` — OK
- [x] Contem `/api/webhook/imoveis` — OK
- [x] Commit `92e563c` existe
- [x] Zero alteracoes em codigo do projeto
- [x] Zero secrets reais escritos no documento
