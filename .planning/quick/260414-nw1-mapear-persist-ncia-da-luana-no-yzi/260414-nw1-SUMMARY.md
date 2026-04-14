---
phase: quick-260414-nw1
plan: 01
subsystem: n8n-workflows / supabase-leads / luana-jurema-brokers
tags: [documentation, mapping, leads, metadata, luana, jurema-brokers, supabase]
dependency_graph:
  requires: [260408-rqi, 260408-sow, 260408-rzc, 260409-5w2]
  provides: [luana-persistence-map]
  affects: []
key_files:
  created:
    - .planning/quick/260414-nw1-mapear-persist-ncia-da-luana-no-yzi/MAP.md
decisions:
  - "MAP.md é documentação pura — nenhum arquivo de código foi alterado"
  - "Campos sem confirmação explícita nas fontes marcados como (a confirmar)"
metrics:
  duration: ~10 min
  completed_date: "2026-04-14"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 260414-nw1: Mapear Persistência da Luana — Summary

**One-liner:** Documento MAP.md criado como referência canônica de persistência da Luana: 10 colunas fixas da tabela `leads`, 13 campos de `metadata` JSONB, 4 regras de persistência (idempotência, GET antes do build_context, merge exclusivo via `atualizar_qualificacao`, handoff via `setar_lead_quente`).

## Artifacts

- [MAP.md](.//MAP.md) — Mapeamento completo de persistência (143 linhas)

## O que foi documentado

1. Arquitetura canônica do fluxo Webhook → Normaliza → Search → If1 → Dados do Lead → Agente → tool calls
2. Colunas fixas da tabela `leads`: `id`, `tenant_id`, `phone`, `name`, `status`, `score`, `source`, `stage_id`, `created_at`, `updated_at`
3. Campos em `metadata` JSONB: `bairro_interesse`, `faixa_valor`, `finalidade`, `tipo_imovel`, `quartos`, `urgencia`, `score`, `objetivo`, `origem`, `localizacao_visita` e mais 3 (a confirmar)
4. Regras de persistência: idempotência UPSERT, GET obrigatório na 2ª mensagem, merge `{ ...antigo, ...novo }`, papel distinto de `atualizar_qualificacao` vs `setar_lead_quente`
5. Anti-patterns explícitos (criar lead novo a cada mensagem, overwrite de metadata, Airtable, etc.)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Escrever MAP.md com mapeamento de persistência | 6d54424 | .planning/quick/260414-nw1-.../MAP.md |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- MAP.md existe: FOUND
- Contém "## Colunas fixas": PASS
- Contém "## Campos em `metadata`": PASS
- Contém "atualizar_qualificacao": PASS
- Contém "GET": PASS
- Nenhum arquivo de código modificado: PASS
