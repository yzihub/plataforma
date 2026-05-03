---
phase: quick-260502-rxe
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - vitest.config.ts
  - tests/smoke/jurema-client.test.ts
  - tests/smoke/cockpit-pages.test.ts
  - tests/setup.ts
autonomous: true
requirements:
  - QUICK-260502-rxe-01
  - QUICK-260502-rxe-02
  - QUICK-260502-rxe-03

must_haves:
  truths:
    - "Comando `npm test` roda smoke tests e termina com exit 0"
    - "Smoke test do cliente Jurema valida que sendMessageToJurema constrói request correto"
    - "Smoke tests dos cockpit pages confirmam que cada page module importa sem crash"
    - "Typecheck (`npx tsc --noEmit`) continua passando após adicionar testes"
    - "Não há dependência de Cypress/Playwright instalada"
  artifacts:
    - path: "package.json"
      provides: "Script `test` + devDependencies vitest + jsdom"
      contains: "vitest"
    - path: "vitest.config.ts"
      provides: "Configuração mínima do Vitest com alias @/* e jsdom"
    - path: "tests/setup.ts"
      provides: "Bootstrap mínimo do ambiente de testes (env vars públicas)"
    - path: "tests/smoke/jurema-client.test.ts"
      provides: "Smoke test do cliente da Ju (sendMessageToJurema)"
    - path: "tests/smoke/cockpit-pages.test.ts"
      provides: "Smoke imports das 7 páginas do cockpit + 1 contratos"
  key_links:
    - from: "package.json scripts.test"
      to: "vitest"
      via: "npm test"
      pattern: "vitest"
    - from: "vitest.config.ts"
      to: "tsconfig paths"
      via: "alias @/*"
      pattern: "resolve.alias|@"
    - from: "tests/smoke/jurema-client.test.ts"
      to: "src/lib/agents/jurema.ts"
      via: "import sendMessageToJurema"
      pattern: "sendMessageToJurema"
---

<objective>
Adicionar smoke tests mínimos cobrindo o cliente da Ju e as páginas principais do cockpit, sem mexer em regra de negócio nem em RLS.

Purpose: Garantir um ponto de detecção rápido para regressões de import/build em rotas críticas (Jurema client, cockpit, corretores, evolution, calendário, imóveis, leads, contratos/financeiro).

Output:
- `vitest` instalado como devDependency leve (sem Cypress/Playwright).
- `npm test` roda smoke suite em segundos.
- 2 arquivos de teste: 1 unitário (cliente Jurema) + 1 de import-smoke das pages.
- Typecheck preservado.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@package.json
@tsconfig.json
@src/lib/agents/jurema.ts
@src/app/cockpit/page.tsx
@src/app/cockpit/jurema-teste/page.tsx

<interfaces>
<!-- Contratos chave que os testes dependem. Não explorar codebase além disto. -->

From src/lib/agents/jurema.ts:
```typescript
export type JuremaRequest = {
  message: string;
  phone: string;
  tenant_id?: string;
  source?: string;
  entrypoint?: string;
  property_id?: string;
  id_imovel?: string;
  intent?: string;
  context?: Record<string, unknown>;
};

export type JuremaResponse = {
  mode: "reply" | string;
  messages: string[];
  metadata: {
    agent?: "jurema" | string;
    lead_id?: string;
    deal_id?: string;
    deal_stage?: string;
    qualification_status?: string;
    lead_score?: number;
    missing_fields?: string[];
    imoveis_count?: number;
    feature_flags?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

export async function sendMessageToJurema(payload: JuremaRequest): Promise<JuremaResponse>;
// Lê NEXT_PUBLIC_YZI_API_URL e NEXT_PUBLIC_JUREMA_TENANT_ID do process.env
// Faz POST para `${API_URL}/agent/jurema`
```

Páginas alvo (Next.js App Router — default export é o componente React):
```text
src/app/cockpit/page.tsx                   → / cockpit (home)
src/app/cockpit/corretores/page.tsx        → /cockpit/corretores
src/app/cockpit/evolution/page.tsx         → /cockpit/evolution
src/app/cockpit/calendario/page.tsx        → /cockpit/calendario
src/app/cockpit/imoveis/page.tsx           → /cockpit/imoveis
src/app/cockpit/leads/page.tsx             → /cockpit/leads
src/app/cockpit/financeiro/page.tsx        → /cockpit/financeiro (rota estável de "contratos/financeiro")
src/app/cockpit/contratos/page.tsx         → /cockpit/contratos (rota estável de "contratos/financeiro")
```

Tsconfig path alias:
```text
"@/*": ["./src/*"]
```

Stack:
- Next 16, React 19, TypeScript 5.9 strict.
- Sem framework de teste instalado hoje.
- ESLint v9 / eslint-config-next v16 já presente.
</interfaces>

<constraints>
- Não usar Cypress, Playwright, Jest. Usar Vitest (mais leve, ESM-first, integra com Next 16/Vite).
- Não rodar testes que precisem de servidor Next vivo (sem `next dev`).
- Não tocar em RLS, regras de negócio, schemas, banco.
- Não mockar Supabase nem trocar imports de pages — apenas verificar que módulos carregam.
- Manter TailAdmin (não alterar componentes/UI).
- Tests devem rodar offline.
</constraints>

</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Instalar vitest + setup e configurar script `npm test`</name>
  <files>
    package.json,
    vitest.config.ts,
    tests/setup.ts,
    .gitignore
  </files>
  <behavior>
    - Comando `npm test -- --run` retorna exit code 0 mesmo sem nenhum teste real (passa por "no tests found" sem erro fatal) OU retorna 0 com 0 testes.
    - `npx tsc --noEmit` passa sem novos erros após adição dos arquivos de config.
    - Vitest resolve alias `@/*` apontando para `src/*` (validado pelos testes da Task 2/3).
    - process.env.NEXT_PUBLIC_YZI_API_URL e NEXT_PUBLIC_JUREMA_TENANT_ID estão disponíveis dentro dos testes (via setup.ts).
  </behavior>
  <action>
    1. Instalar devDependencies leves:
       ```
       rtk npm install -D vitest@^2 jsdom@^25 @vitejs/plugin-react@^4
       ```
       Justificativa: vitest é o runner ESM-first padrão para Next 16. jsdom é necessário porque pages usam React (mesmo sem renderizar, alguns imports tocam `window`). @vitejs/plugin-react permite vitest entender JSX/TSX em arquivos .tsx das pages.

       NÃO instalar @testing-library/react nesta etapa — smoke tests não renderizam, apenas importam.

    2. Adicionar script de teste em `package.json`:
       ```json
       "scripts": {
         "test": "vitest run",
         "test:watch": "vitest"
       }
       ```
       Manter os scripts existentes (`dev`, `build`, `start`, `lint`).

    3. Criar `vitest.config.ts` na raiz:
       ```ts
       import { defineConfig } from "vitest/config";
       import react from "@vitejs/plugin-react";
       import path from "node:path";

       export default defineConfig({
         plugins: [react()],
         resolve: {
           alias: {
             "@": path.resolve(__dirname, "./src"),
           },
         },
         test: {
           environment: "jsdom",
           globals: true,
           include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
           setupFiles: ["./tests/setup.ts"],
         },
       });
       ```

    4. Criar `tests/setup.ts` (mínimo — bootstra env vars públicas usadas pelo cliente Ju):
       ```ts
       // Smoke setup — apenas variáveis públicas que o cliente Ju espera.
       // NÃO setar nada server-side / service_role / secrets.
       process.env.NEXT_PUBLIC_YZI_API_URL =
         process.env.NEXT_PUBLIC_YZI_API_URL ?? "https://yzi-os.test.local";
       process.env.NEXT_PUBLIC_JUREMA_TENANT_ID =
         process.env.NEXT_PUBLIC_JUREMA_TENANT_ID ??
         "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";
       ```

    5. Garantir que `.gitignore` ignora `coverage/` e `.vitest-cache/` (adicionar se ausente, sem alterar entradas existentes).

    6. Validar:
       - `rtk tsc --noEmit` passa.
       - `rtk npm test` executa vitest e finaliza ok (sem testes nesta task ainda).
  </action>
  <verify>
    <automated>cd /d/dev/plataforma && npm test -- --run --passWithNoTests && npx tsc --noEmit</automated>
  </verify>
  <done>
    `package.json` tem script `test`, `vitest.config.ts` e `tests/setup.ts` existem, `npm test` finaliza com exit 0, `tsc --noEmit` passa sem novos erros.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Smoke test do cliente Jurema (sendMessageToJurema)</name>
  <files>
    tests/smoke/jurema-client.test.ts
  </files>
  <behavior>
    - Test 1 (happy path): `sendMessageToJurema({ message: "oi", phone: "5585988811150" })` chama `fetch` exatamente uma vez com:
      - URL = `https://yzi-os.test.local/agent/jurema`
      - method = "POST"
      - header `Content-Type: application/json`
      - body JSON contendo `tenant_id = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"` (fallback do env), `message`, `phone`.
      Resposta mock retorna `{ mode: "reply", messages: ["ok"], metadata: { agent: "jurema", deal_stage: "qualificacao" } }` e função devolve este objeto.
    - Test 2 (custom tenant): `sendMessageToJurema({ message: "oi", phone: "5585988811150", tenant_id: "custom-tenant" })` envia `tenant_id: "custom-tenant"` no body (não usa fallback).
    - Test 3 (error path): se `fetch` resolve com `{ ok: false, status: 500, text: () => "boom" }`, a função throws Error com mensagem contendo "500" e "boom".

    Regras:
    - Mockar `globalThis.fetch` com `vi.fn()` em cada teste; restaurar com `vi.restoreAllMocks()` no afterEach.
    - NÃO bater em backend real.
    - NÃO testar a regra de negócio da Ju (deal_stage, score etc.) — backend é fonte da verdade.
  </behavior>
  <action>
    Criar `tests/smoke/jurema-client.test.ts`:

    ```ts
    import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
    import { sendMessageToJurema } from "@/lib/agents/jurema";

    const JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

    function mockOk(json: unknown) {
      return vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => json,
      });
    }

    describe("sendMessageToJurema (smoke)", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it("envia POST para /agent/jurema usando tenant fallback do env", async () => {
        const fakeResponse = {
          mode: "reply",
          messages: ["ok"],
          metadata: { agent: "jurema", deal_stage: "qualificacao" },
        };
        const fetchMock = mockOk(fakeResponse);
        vi.stubGlobal("fetch", fetchMock);

        const result = await sendMessageToJurema({
          message: "oi",
          phone: "5585988811150",
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("https://yzi-os.test.local/agent/jurema");
        expect(init.method).toBe("POST");
        expect(init.headers["Content-Type"]).toBe("application/json");

        const body = JSON.parse(init.body);
        expect(body.tenant_id).toBe(JUREMA_TENANT_ID);
        expect(body.message).toBe("oi");
        expect(body.phone).toBe("5585988811150");

        expect(result).toEqual(fakeResponse);
      });

      it("respeita tenant_id customizado no payload", async () => {
        const fetchMock = mockOk({ mode: "reply", messages: [], metadata: {} });
        vi.stubGlobal("fetch", fetchMock);

        await sendMessageToJurema({
          message: "oi",
          phone: "5585988811150",
          tenant_id: "custom-tenant",
        });

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.tenant_id).toBe("custom-tenant");
      });

      it("lança erro quando backend responde !ok", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => "boom",
        });
        vi.stubGlobal("fetch", fetchMock);

        await expect(
          sendMessageToJurema({ message: "oi", phone: "5585988811150" })
        ).rejects.toThrow(/500.*boom|boom.*500/);
      });
    });
    ```

    Notas:
    - Usar `vi.stubGlobal("fetch", ...)` — vitest restaura globals entre testes com restoreAllMocks.
    - Não importar nada que toque DOM / Supabase.
  </action>
  <verify>
    <automated>cd /d/dev/plataforma && npm test -- --run tests/smoke/jurema-client.test.ts</automated>
  </verify>
  <done>
    3 testes do cliente Jurema passam (happy path com env, tenant custom, erro 500). Nenhum hit a backend real. `npx tsc --noEmit` continua passando.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Smoke imports das pages do cockpit + contratos/financeiro</name>
  <files>
    tests/smoke/cockpit-pages.test.ts
  </files>
  <behavior>
    - Para cada page alvo, o teste:
      1. Importa o módulo dinamicamente (`await import("@/app/cockpit/...")`).
      2. Confirma que `module.default` é definido (`expect(mod.default).toBeDefined()`).
      3. Confirma que `module.default` é uma função (componente React) — `expect(typeof mod.default).toBe("function")`.
    - Se um import lança, o teste falha com nome da rota — sinalizando regressão de import/build.
    - Não renderizar componentes (React Server Components / hooks de auth quebrariam smoke).
    - Páginas alvo:
      - `@/app/cockpit/page` (cockpit home)
      - `@/app/cockpit/corretores/page`
      - `@/app/cockpit/evolution/page`
      - `@/app/cockpit/calendario/page`
      - `@/app/cockpit/imoveis/page`
      - `@/app/cockpit/leads/page`
      - `@/app/cockpit/contratos/page`     (rota estável de contratos)
      - `@/app/cockpit/financeiro/page`    (rota estável de financeiro)
  </behavior>
  <action>
    Criar `tests/smoke/cockpit-pages.test.ts`:

    ```ts
    import { describe, it, expect } from "vitest";

    const ROUTES: ReadonlyArray<{ name: string; importer: () => Promise<{ default?: unknown }> }> = [
      { name: "/cockpit",                importer: () => import("@/app/cockpit/page") },
      { name: "/cockpit/corretores",     importer: () => import("@/app/cockpit/corretores/page") },
      { name: "/cockpit/evolution",      importer: () => import("@/app/cockpit/evolution/page") },
      { name: "/cockpit/calendario",     importer: () => import("@/app/cockpit/calendario/page") },
      { name: "/cockpit/imoveis",        importer: () => import("@/app/cockpit/imoveis/page") },
      { name: "/cockpit/leads",          importer: () => import("@/app/cockpit/leads/page") },
      { name: "/cockpit/contratos",      importer: () => import("@/app/cockpit/contratos/page") },
      { name: "/cockpit/financeiro",     importer: () => import("@/app/cockpit/financeiro/page") },
    ];

    describe("Cockpit pages (smoke import)", () => {
      for (const route of ROUTES) {
        it(`carrega o módulo da rota ${route.name}`, async () => {
          const mod = await route.importer();
          expect(mod.default).toBeDefined();
          expect(typeof mod.default).toBe("function");
        });
      }
    });
    ```

    Se algum import falhar por dependência server-only (ex.: `next/headers`, Supabase server client) durante carregamento de módulo:
    - Adicionar mocks mínimos em `tests/setup.ts` SOMENTE se necessário, ex.:
      ```ts
      vi.mock("next/headers", () => ({
        cookies: () => ({ get: () => undefined, getAll: () => [] }),
        headers: () => new Headers(),
      }));
      ```
    - NÃO mexer no código das pages para acomodar testes — se um page de fato não carrega isolado, comentar essa rota no array com `// SKIP: motivo`, registrar no SUMMARY e seguir.

    Regra final: smoke ≠ render. Apenas confirma que o bundle de cada rota carrega.
  </action>
  <verify>
    <automated>cd /d/dev/plataforma && npm test -- --run tests/smoke/cockpit-pages.test.ts</automated>
  </verify>
  <done>
    Todas as 8 rotas (ou as que forem importáveis isoladamente) passam no smoke import. Rotas pulads (se houver) estão documentadas no SUMMARY com motivo. Suite completa (`npm test`) finaliza com exit 0. `npx tsc --noEmit` passa.
  </done>
</task>

</tasks>

<verification>
Sequência final (rodar em ordem):

1. `rtk npm install` (caso lockfile precise atualizar).
2. `rtk npm test` — todos os smoke tests verdes.
3. `rtk tsc --noEmit` — sem novos erros TS.
4. Conferir que `package.json` NÃO contém Cypress/Playwright/Jest.
5. Conferir que nada em `src/**` foi alterado (só novos arquivos em `tests/`, `vitest.config.ts`, `package.json`, eventualmente `.gitignore`).
</verification>

<success_criteria>
- [ ] `npm test` retorna exit 0
- [ ] Smoke do cliente Jurema cobre: tenant fallback, tenant custom, erro 500
- [ ] Smoke das 8 pages: cockpit, corretores, evolution, calendario, imoveis, leads, contratos, financeiro
- [ ] Nenhuma dependência pesada adicionada (sem cypress, sem playwright, sem jest)
- [ ] `npx tsc --noEmit` passa
- [ ] Layout TailAdmin intocado (nenhum src/components/** alterado)
- [ ] Nenhuma alteração em RLS, schema, regras de negócio
</success_criteria>

<output>
Após completar, gerar `.planning/quick/260502-rxe-criar-smoke-tests-m-nimos-para-rotas-da-/260502-rxe-SUMMARY.md` com:
- Comando para rodar (`npm test`).
- Resultado dos testes (passou/falhou por arquivo).
- Resultado do `tsc --noEmit`.
- Lista de rotas testadas e qualquer rota pulada (com motivo).
- Diff resumido de devDependencies adicionadas.
</output>
