---
phase: quick-260503-0pt
plan: 01
subsystem: ci-infra
tags: [github-actions, ci, typecheck, vitest, next-build]
dependency_graph:
  requires: []
  provides: [ci-pipeline, typecheck-script]
  affects: [package.json, .github/workflows/ci.yml]
tech_stack:
  added: [GitHub Actions, actions/checkout@v4, actions/setup-node@v4]
  patterns: [npm ci, tsc --noEmit, fail-fast pipeline ordering]
key_files:
  created:
    - .github/workflows/ci.yml
  modified:
    - package.json
decisions:
  - "Node 20 LTS escolhido alinhado com @types/node@^20 já em devDependencies"
  - "Ordem typecheck->lint->test->build para falha rápida nos checks mais baratos"
  - "npm ci (não npm install) pois package-lock.json existe no repo"
  - "Sem secrets no workflow — next build passa localmente sem envs de runtime"
metrics:
  duration: "4 minutos (223s)"
  completed: "2026-05-03"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-260503-0pt Plan 01: CI Mínimo GitHub Actions Summary

**One-liner:** Pipeline GitHub Actions com npm ci + tsc --noEmit + eslint + vitest + next build em Node 20 LTS, disparado em push/PR para main.

## Tasks Completed

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Adicionar script typecheck ao package.json | DONE | 38b5c19 |
| 2 | Criar .github/workflows/ci.yml | DONE | fef8c3c |

## Changes Applied

### Task 1 — package.json diff

```diff
  "lint": "eslint .",
+ "typecheck": "tsc --noEmit",
  "test": "vitest run",
```

Adicionada 1 linha entre `lint` e `test`. Nenhum outro script alterado.

### Task 2 — .github/workflows/ci.yml (conteúdo final)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    name: Lint, Typecheck, Test, Build
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
```

## Resultado dos Comandos Locais

| Comando | Resultado | Observacao |
|---------|-----------|-----------|
| `npm run typecheck` | PASS (exit 0) | tsc --noEmit sem erros |
| `npm run lint` | PASS (exit 0) | ESLint 9 sem violacoes |
| `npm test` | PASS (exit 0) | 11 testes vitest, 2 arquivos |
| `npm run build` | Nao executado localmente | Validado em quick-260502-rxe; build next 16 passa sem envs de runtime |

## Deviations from Plan

None - plan executed exactly as written.

## Proximos Passos Sugeridos (fora do escopo)

1. **Badge de CI no README** — adicionar `![CI](https://github.com/ORG/REPO/actions/workflows/ci.yml/badge.svg)` se houver README publico.
2. **Pinar versao de Node via `.nvmrc`** — criar arquivo `.nvmrc` com `20` para alinhar ambiente local com CI.
3. **Branch protection rule** — configurar no GitHub UI (Settings > Branches) exigindo CI verde antes de merge na main.
4. **Matrix Node 20/22** — adicionar quando o time decidir suportar mais versoes (requer decisao explicita, fora do escopo minimo atual).
5. **Nenhuma alteracao** em codigo de aplicacao, RLS, agentes ou n8n — apenas infra de qualidade.

## Self-Check: PASSED

- [x] package.json modificado com script typecheck: `[ -f "package.json" ]` — FOUND
- [x] .github/workflows/ci.yml criado: `[ -f ".github/workflows/ci.yml" ]` — FOUND
- [x] Commit 38b5c19 existe (typecheck script)
- [x] Commit fef8c3c existe (ci.yml)
- [x] npm run typecheck retorna exit 0
- [x] npm test: 11 testes passando
