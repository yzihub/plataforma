---
phase: quick-260502-dnq
plan: 01
subsystem: wordpress-webhook
tags: [php, mu-plugin, wordpress, ssh, webhook, imoveis, instalacao]
dependency_graph:
  requires: [260501-ufh, 260501-vnn]
  provides: [guia-instalacao-ssh-mu-plugin]
  affects: [wordpress-jurema]
tech_stack:
  added: []
  patterns: [wordpress-mu-plugin, ssh-deployment, wp-config-constants]
key_files:
  created:
    - .planning/quick/260502-dnq-instalar-webhook-wordpress-mu-plugin/INSTALACAO-MU-PLUGIN.md
  modified: []
decisions:
  - "Guia criado com 8 etapas SSH (A-H): conectar, backup, mkdir mu-plugins, scp/upload, permissoes, constantes wp-config, validacao php -l, checklist"
  - "YZIWS_WEBHOOK_SECRET usa placeholder SEU_SECRET_AQUI — nunca hardcoded no guia ou no snippet"
  - "Tres opcoes de upload documentadas: scp (recomendado), painel File Manager, heredoc inline"
  - "Rollback documentado: cp bak para wp-config.php + rm mu-plugin"
metrics:
  duration: 180s
  completed: 2026-05-02T12:57:42Z
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-260502-dnq Plan 01: Instalar Webhook WordPress Mu-Plugin Summary

**One-liner:** Guia SSH completo gerado (INSTALACAO-MU-PLUGIN.md) com 8 etapas para instalar yziws-webhook-imoveis.php como mu-plugin no WordPress da Jurema Brokers, incluindo backup, php -l, rollback e checklist.

---

## Status

**Aguardando execucao manual pelo usuario via SSH.**

O executor criou o guia completo de instalacao. A instalacao em si requer acesso SSH
ao servidor WordPress da Jurema Brokers, que deve ser realizada pelo usuario manualmente
seguindo o guia `INSTALACAO-MU-PLUGIN.md`.

---

## What Was Done

Criado o documento `INSTALACAO-MU-PLUGIN.md` com guia completo para instalacao do
mu-plugin `yziws-webhook-imoveis.php` no servidor WordPress da Jurema Brokers via SSH.

O guia cobre:

- Pre-requisitos (dados necessarios: SSH, caminhos, secret da Vercel)
- 8 etapas sequenciais (A-H) com comandos SSH copiavel-e-executavel
- Backup obrigatorio do `wp-config.php` com timestamp antes de qualquer alteracao
- Criacao do diretorio `wp-content/mu-plugins/` com owner e permissoes corretos
- Upload do snippet via `scp` (opcao 1/recomendada), painel File Manager (opcao 2) ou heredoc (opcao 3)
- Ajuste de permissoes: `644` para o arquivo, `755` para o diretorio
- Validacao de sintaxe PHP com `php -l` em ambos arquivos (mu-plugin e wp-config.php)
- Adicao das constantes `YZIWS_WEBHOOK_URL` e `YZIWS_WEBHOOK_SECRET` no `wp-config.php`
  com posicionamento correto (antes da linha `/* That's all, stop editing! */`)
- Checklist de 9 itens para confirmar conclusao
- Instrucoes de rollback completas (restaurar bak + remover mu-plugin)
- Registro de execucao com tabela para preenchimento pos-instalacao
- Proximo passo: configurar secret na Vercel + testar 1 imovel real

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 2 (parcial) | Criar INSTALACAO-MU-PLUGIN.md com guia SSH completo | `5657a1d` | INSTALACAO-MU-PLUGIN.md |

**Pendente (aguardando usuario):**
- Task 1: usuario fornece SSH + caminhos + secret → executor configura wp-config.php
- Task 2 (execucao real): comandos SSH rodados no servidor
- Task 3: verificacao final (site carregando, Must-Use listado, php -l limpo)

---

## Deviations from Plan

### Auto-executed (before checkpoint)

A Task 1 e `type="checkpoint:human-action"` (gate bloqueante), mas o guia INSTALACAO-MU-PLUGIN.md
e parte dos artefatos de Task 2 e foi criado antecipadamente para que o usuario tenha
o documento completo durante e apos a execucao SSH.

---

## Security Notes

- O placeholder `SEU_SECRET_AQUI` esta presente no guia — nunca o valor real
- O secret nao foi commitado em nenhum arquivo
- O guia orienta explicitamente a nao compartilhar o valor do secret em chat publico ou PR

---

## Known Stubs

- `INSTALACAO-MU-PLUGIN.md` > secao "Registro de Execucao": tabela com campos a preencher
  apos a instalacao (intencional — o usuario preenche com os valores reais apos executar)

---

## Self-Check

- INSTALACAO-MU-PLUGIN.md: FOUND em `.planning/quick/260502-dnq-instalar-webhook-wordpress-mu-plugin/INSTALACAO-MU-PLUGIN.md`
- Commit `5657a1d`: FOUND via git log

## Self-Check: PASSED
