---
phase: quick-260502-rxe
plan: "01"
subsystem: testing
tags: [vitest, smoke-tests, jurema-client, cockpit-pages]
dependency_graph:
  requires: []
  provides: [npm-test, smoke-suite]
  affects: [package.json, vitest.config.ts, tests/]
tech_stack:
  added: [vitest@2.1.9, jsdom@25.0.1, "@vitejs/plugin-react@4.7.0"]
  patterns: [smoke-import, vi.stubGlobal, vitest-globals]
key_files:
  created:
    - vitest.config.ts
    - tests/setup.ts
    - tests/smoke/jurema-client.test.ts
    - tests/smoke/cockpit-pages.test.ts
  modified:
    - package.json (scripts + devDependencies)
    - .gitignore (/.vitest-cache)
decisions:
  - "Vitest v2 escolhido — ESM-first, sem necessidade de babel, integra com Next 16/Vite"
  - "jsdom como environment — permite importar módulos React sem servidor"
  - "Sem mocks de next/headers necessários — jsdom trata o import lazy sem crash"
  - "vi.stubGlobal('fetch') para isolar testes do cliente sem bater no backend real"
metrics:
  duration: "24 min"
  completed_date: "2026-05-03"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 2
---

# Phase quick-260502-rxe Plan 01: Smoke Tests Summary

**One-liner:** Vitest v2 instalado com 11 smoke tests cobrindo cliente Jurema (3 cenários) e 8 pages do cockpit via import dinâmico, `npm test` finaliza em ~5s com exit 0.

## Comando para rodar

```bash
npm test
```

Ou para um arquivo específico:

```bash
npm test -- --run tests/smoke/jurema-client.test.ts
npm test -- --run tests/smoke/cockpit-pages.test.ts
```

## Resultado dos testes

```
Test Files  2 passed (2)
      Tests 11 passed (11)
   Duration  ~4-5s
```

### Por arquivo

| Arquivo | Testes | Status |
|---------|--------|--------|
| tests/smoke/jurema-client.test.ts | 3 | PASS |
| tests/smoke/cockpit-pages.test.ts | 8 | PASS |

### Detalhes jurema-client.test.ts

| Teste | Status |
|-------|--------|
| envia POST para /agent/jurema usando tenant fallback do env | PASS |
| respeita tenant_id customizado no payload | PASS |
| lança erro quando backend responde !ok | PASS |

### Detalhes cockpit-pages.test.ts

| Rota | Status |
|------|--------|
| /cockpit | PASS |
| /cockpit/corretores | PASS |
| /cockpit/evolution | PASS |
| /cockpit/calendario | PASS |
| /cockpit/imoveis | PASS |
| /cockpit/leads | PASS |
| /cockpit/contratos | PASS |
| /cockpit/financeiro | PASS |

## Resultado do `tsc --noEmit`

```
(no output — zero erros)
```

TypeScript passa sem nenhum novo erro após adição dos arquivos de teste e configuração.

## Rotas testadas e rotas puladas

Todas as 8 rotas importaram com sucesso. Nenhuma rota foi pulada.

Nota sobre `/cockpit/leads`: esta page é Server Component que importa `getCockpitData` → `createClient (server)` → `cookies from next/headers`. O vitest com jsdom trata o import sem crash (o módulo carrega mas não executa o `await cookies()` em tempo de import). Nenhum mock adicional foi necessário.

## Diff resumido de devDependencies adicionadas

```diff
"devDependencies": {
+  "@vitejs/plugin-react": "^4.7.0",
+  "jsdom": "^25.0.1",
+  "vitest": "^2.1.9"
}
```

Versões instaladas efetivas:
- vitest: 2.1.9
- jsdom: 25.0.1
- @vitejs/plugin-react: 4.7.0

Sem Cypress, Playwright ou Jest adicionados.

## Commits

| Hash | Mensagem |
|------|----------|
| 3946616 | chore(quick-260502-rxe): install vitest + setup script npm test |
| e897027 | test(quick-260502-rxe): smoke test sendMessageToJurema (3 testes) |
| 754be12 | test(quick-260502-rxe): smoke import das 8 pages do cockpit |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — arquivos de teste não contêm stubs. Os testes verificam comportamento real do cliente Jurema e importabilidade real das pages.

## Self-Check: PASSED

- [x] tests/smoke/jurema-client.test.ts exists
- [x] tests/smoke/cockpit-pages.test.ts exists
- [x] vitest.config.ts exists
- [x] tests/setup.ts exists
- [x] Commits 3946616, e897027, 754be12 exist
- [x] `npm test` exits 0 with 11 passing tests
- [x] `tsc --noEmit` exits 0
- [x] No Cypress/Playwright/Jest in package.json
- [x] No src/** files modified
