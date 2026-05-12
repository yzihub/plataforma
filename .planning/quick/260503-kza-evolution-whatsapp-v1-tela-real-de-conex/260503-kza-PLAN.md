---
phase: quick-260503-kza
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/evolution/client.ts
  - src/lib/evolution/types.ts
  - src/app/api/evolution/status/route.ts
  - src/app/api/evolution/qr/route.ts
  - src/app/api/evolution/disconnect/route.ts
  - src/app/api/evolution/test-send/route.ts
  - src/components/yzihub/EvolutionConnectClient.tsx
  - src/app/cockpit/evolution/page.tsx
  - tests/smoke/evolution-api.test.ts
autonomous: true
requirements:
  - QUICK-260503-KZA
must_haves:
  truths:
    - "Página /cockpit/evolution renderiza padrão TailAdmin (header + cards + estados)"
    - "UI mostra status da instância (conectado | desconectado | aguardando_qr | erro | pendente_configuracao)"
    - "Quando status=aguardando_qr, UI exibe QR Code (string base64) com instrução de leitura"
    - "Quando status=conectado, UI exibe número conectado mascarado"
    - "Botão 'Atualizar status' chama GET /api/evolution/status e atualiza UI"
    - "Botão 'Gerar/Atualizar QR' chama POST /api/evolution/qr e atualiza UI"
    - "Botão 'Desconectar' chama POST /api/evolution/disconnect com confirmação"
    - "Botão 'Testar envio' abre input de número e chama POST /api/evolution/test-send"
    - "Quando EVOLUTION_BASE_URL ou EVOLUTION_API_KEY não estão setadas, todos endpoints retornam {status:'pendente_configuracao'} sem chamar URL externa"
    - "Nenhuma string contendo EVOLUTION_API_KEY, EVOLUTION_BASE_URL ou EVOLUTION_INSTANCE aparece em respostas JSON ao client"
    - "npm run typecheck passa sem erros novos"
    - "npm test passa (incluindo novos testes de evolution-api)"
  artifacts:
    - path: "src/lib/evolution/types.ts"
      provides: "EvolutionStatus, EvolutionQrPayload, EvolutionStatusResponse, EvolutionTestSendPayload, EvolutionApiResult types"
    - path: "src/lib/evolution/client.ts"
      provides: "Server-only helpers: getInstanceStatus, fetchQrCode, disconnectInstance, sendTestMessage — lê env, NUNCA exporta keys"
      contains: "isEvolutionConfigured"
    - path: "src/app/api/evolution/status/route.ts"
      provides: "GET handler — retorna status da instância (stub seguro se não configurado)"
    - path: "src/app/api/evolution/qr/route.ts"
      provides: "POST handler — gera/atualiza QR code"
    - path: "src/app/api/evolution/disconnect/route.ts"
      provides: "POST handler — desconecta instância"
    - path: "src/app/api/evolution/test-send/route.ts"
      provides: "POST handler — envia mensagem de teste {phone, message}"
    - path: "src/components/yzihub/EvolutionConnectClient.tsx"
      provides: "Client component TailAdmin com KPIs/status/QR/ações"
    - path: "src/app/cockpit/evolution/page.tsx"
      provides: "Server page mínimo que renderiza header + EvolutionConnectClient (substitui placeholder 'Em construção')"
    - path: "tests/smoke/evolution-api.test.ts"
      provides: "Smoke tests vitest — modo pendente_configuracao + mock de fetch para status/qr/disconnect/test-send"
  key_links:
    - from: "src/components/yzihub/EvolutionConnectClient.tsx"
      to: "/api/evolution/status, /api/evolution/qr, /api/evolution/disconnect, /api/evolution/test-send"
      via: "fetch(...) em handlers de botão e useEffect inicial"
      pattern: "fetch\\(.*api/evolution"
    - from: "src/app/api/evolution/*/route.ts"
      to: "src/lib/evolution/client.ts"
      via: "import { getInstanceStatus, fetchQrCode, disconnectInstance, sendTestMessage, isEvolutionConfigured }"
      pattern: "from \"@/lib/evolution/client\""
    - from: "src/lib/evolution/client.ts"
      to: "process.env.EVOLUTION_BASE_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME"
      via: "leitura server-side apenas; sem NEXT_PUBLIC_*"
      pattern: "process\\.env\\.EVOLUTION_"
---

<objective>
Transformar a página `/cockpit/evolution` (atualmente stub "Em construção") numa tela real de conexão de WhatsApp via Evolution API, mantendo TailAdmin e arquitetura YZI (frontend nunca toca segredo nem chama serviço externo direto).

Purpose: hoje o cockpit não tem visibilidade nem controle do estado da conexão WhatsApp da Jurema/Café com Pam. Sem isso, não dá para diagnosticar quando a Ju/Nina param de responder. Esta tela v1 entrega visibilidade básica (status + QR + número conectado) e ações server-side seguras (gerar QR, desconectar, testar envio), com stubs explícitos quando a integração ainda não foi configurada — para não quebrar build/typecheck mesmo sem env vars de produção.

Output:
- Lib server-side `src/lib/evolution/{client,types}.ts` (única que toca env vars EVOLUTION_*).
- 4 rotas API: status, qr, disconnect, test-send.
- Componente client `EvolutionConnectClient.tsx` em padrão TailAdmin.
- Page server reescrita.
- Smoke tests vitest validando modo pendente_configuracao + chamadas mockadas.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@src/app/cockpit/evolution/page.tsx
@src/app/cockpit/observabilidade/page.tsx
@src/app/api/observabilidade/agent-metrics/route.ts
@src/components/yzihub/AgentMetricsClient.tsx
@tests/smoke/jurema-client.test.ts
@.claude/skills/yzihub-patterns/SKILL.md

<interfaces>
<!-- Padrão de route handler server-side já em uso no projeto (extraído de observabilidade/agent-metrics): -->

```ts
// src/app/api/observabilidade/agent-metrics/route.ts (referência)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // 1. resolver tenant_id (DEV_BYPASS ou via session)
    // 2. consultar Supabase
    // 3. NextResponse.json({ ok: true, ... }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/...] ", err);
    return NextResponse.json({ error: "..." }, { status: 500 });
  }
}
```

<!-- Padrão de KPI card / cliente TailAdmin (extraído de AgentMetricsClient.tsx): -->

```tsx
// src/components/yzihub/AgentMetricsClient.tsx (referência de estilo)
"use client";
import { useState, useEffect } from "react";

function KpiCard({ label, value, icon, accent, iconBg }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
      {/* ... */}
    </div>
  );
}
```

<!-- Stub atual a substituir: -->

```tsx
// src/app/cockpit/evolution/page.tsx (ATUAL — substituir)
export default function EvolutionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold ...">Evolution</h1>
        <p className="mt-1 text-sm ...">Integração com Evolution API — WhatsApp</p>
      </div>
      <div className="rounded-2xl border ... p-12 ...">
        {/* placeholder "Em construção" */}
      </div>
    </div>
  );
}
```

<!-- Padrão de smoke test vitest (extraído de tests/smoke/jurema-client.test.ts): -->

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function mockOk(json: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => json });
}

describe("...", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());
  it("...", async () => {
    const fetchMock = mockOk({ ... });
    vi.stubGlobal("fetch", fetchMock);
    // ...
  });
});
```

<!-- Env vars a usar (server-only, nunca NEXT_PUBLIC_): -->
- `EVOLUTION_BASE_URL` — ex: `https://evolution.yzihub.com`
- `EVOLUTION_API_KEY` — bearer token / apikey header
- `EVOLUTION_INSTANCE_NAME` — nome da instância (ex: `jurema` ou `cafepam`)

Se QUALQUER uma faltar → `isEvolutionConfigured()` retorna false → todas rotas retornam `{ ok: true, status: "pendente_configuracao", configured: false }` sem fazer fetch externo. Isso garante que typecheck/test/CI funcionem sem credenciais reais.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Criar lib server-side Evolution + 4 rotas API com stubs seguros</name>
  <files>src/lib/evolution/types.ts, src/lib/evolution/client.ts, src/app/api/evolution/status/route.ts, src/app/api/evolution/qr/route.ts, src/app/api/evolution/disconnect/route.ts, src/app/api/evolution/test-send/route.ts, tests/smoke/evolution-api.test.ts</files>
  <behavior>
    Test 1 — `isEvolutionConfigured()` retorna false quando faltam EVOLUTION_BASE_URL ou EVOLUTION_API_KEY ou EVOLUTION_INSTANCE_NAME.
    Test 2 — `isEvolutionConfigured()` retorna true quando as 3 env vars estão setadas.
    Test 3 — GET /api/evolution/status sem env configurado retorna `{ ok: true, configured: false, status: "pendente_configuracao" }` HTTP 200, sem fazer fetch externo.
    Test 4 — POST /api/evolution/qr sem env configurado retorna `{ ok: true, configured: false, status: "pendente_configuracao", qr: null }` HTTP 200.
    Test 5 — POST /api/evolution/disconnect sem env configurado retorna `{ ok: true, configured: false, status: "pendente_configuracao" }` HTTP 200.
    Test 6 — POST /api/evolution/test-send sem env configurado retorna `{ ok: true, configured: false, status: "pendente_configuracao", sent: false }` HTTP 200 (não chama serviço externo).
    Test 7 — POST /api/evolution/test-send com body `{}` retorna 400 com `{ error: "phone obrigatorio" }` (validação acontece ANTES do check de env).
    Test 8 — Nenhuma resposta JSON contém as substrings literais `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY` ou `EVOLUTION_INSTANCE_NAME` (anti-leak check via JSON.stringify).
  </behavior>
  <action>
    Implementar PRIMEIRO os testes em `tests/smoke/evolution-api.test.ts`, RED, depois implementar:

    1. `src/lib/evolution/types.ts`:
       - `export type EvolutionStatusValue = "conectado" | "desconectado" | "aguardando_qr" | "erro" | "pendente_configuracao"`
       - `export type EvolutionStatusResponse = { ok: true; configured: boolean; status: EvolutionStatusValue; instance?: string; phone_number?: string | null; last_seen_at?: string | null; message?: string }`
       - `export type EvolutionQrResponse = { ok: true; configured: boolean; status: EvolutionStatusValue; qr: string | null; expires_in_seconds?: number }` (qr = base64 PNG ou data URL)
       - `export type EvolutionDisconnectResponse = { ok: true; configured: boolean; status: EvolutionStatusValue }`
       - `export type EvolutionTestSendResponse = { ok: true; configured: boolean; status: EvolutionStatusValue; sent: boolean; message_id?: string | null }`
       - `export type EvolutionTestSendInput = { phone: string; message?: string }`

    2. `src/lib/evolution/client.ts` (server-only — adicionar `import "server-only"` no topo se já estiver no projeto, senão omitir):
       - `function readEnv()` lê EVOLUTION_BASE_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME (sem prefixo NEXT_PUBLIC_).
       - `export function isEvolutionConfigured(): boolean` — retorna true só se as 3 estiverem setadas e não-vazias.
       - `export async function getInstanceStatus(): Promise<EvolutionStatusResponse>` — se não configurado: `{ ok: true, configured: false, status: "pendente_configuracao", message: "EVOLUTION_* env vars ausentes — integracao pendente de configuracao" }`. Se configurado: fazer `fetch(\`${baseUrl}/instance/connectionState/${instance}\`, { headers: { apikey: apiKey }, cache: "no-store" })` e mapear resposta para EvolutionStatusValue (Evolution API costuma retornar `{ instance: { state: "open" | "close" | "connecting" } }` → mapear: open→conectado, close→desconectado, connecting→aguardando_qr). Tentar capturar phone_number de `instance.profileName` ou `instance.owner` se disponível. Em erro de fetch retornar `{ ok: true, configured: true, status: "erro", message: "<msg>" }`.
       - `export async function fetchQrCode(): Promise<EvolutionQrResponse>` — stub seguro se não configurado. Configurado: `fetch(\`${baseUrl}/instance/connect/${instance}\`, { headers: { apikey: apiKey }, cache: "no-store" })` → retornar `qr` do payload (campo `base64` ou `qrcode.base64` na Evolution API). Erro → status:"erro", qr:null.
       - `export async function disconnectInstance(): Promise<EvolutionDisconnectResponse>` — stub seguro. Configurado: `fetch(\`${baseUrl}/instance/logout/${instance}\`, { method: "DELETE", headers: { apikey: apiKey } })`.
       - `export async function sendTestMessage(input: EvolutionTestSendInput): Promise<EvolutionTestSendResponse>` — stub seguro. Configurado: POST `\`${baseUrl}/message/sendText/${instance}\`` com body `{ number: input.phone, text: input.message ?? "[YZI] Teste de envio do cockpit." }` e header `apikey`. Retornar `{ ok:true, configured:true, status:"conectado", sent:true, message_id: data.key?.id ?? null }`.
       - CRÍTICO: nenhuma função pode incluir o nome literal das env vars no campo `message` da resposta — só prefixos genéricos (`"integracao pendente de configuracao"`, `"falha ao consultar evolution"`).

    3. `src/app/api/evolution/status/route.ts`:
       ```ts
       import { NextResponse } from "next/server";
       import { getInstanceStatus } from "@/lib/evolution/client";
       export const dynamic = "force-dynamic";
       export async function GET() {
         try {
           const data = await getInstanceStatus();
           return NextResponse.json(data, { status: 200 });
         } catch (err) {
           console.error("[GET /api/evolution/status]", err);
           return NextResponse.json({ ok: true, configured: false, status: "erro", message: "Falha interna" }, { status: 500 });
         }
       }
       ```

    4. `src/app/api/evolution/qr/route.ts` — análogo, POST chamando `fetchQrCode()`.

    5. `src/app/api/evolution/disconnect/route.ts` — análogo, POST chamando `disconnectInstance()`.

    6. `src/app/api/evolution/test-send/route.ts` — POST que faz `const body = await req.json().catch(() => ({}))`, valida `if (!body.phone || typeof body.phone !== "string") return 400 { error: "phone obrigatorio" }`, depois chama `sendTestMessage({ phone: body.phone, message: body.message })`.

    7. Smoke tests `tests/smoke/evolution-api.test.ts`:
       - Importar handlers diretamente: `import { GET as getStatus } from "@/app/api/evolution/status/route";` etc.
       - Manipular env via `vi.stubEnv("EVOLUTION_BASE_URL", "")` no início e `vi.stubEnv("EVOLUTION_BASE_URL", "https://e.test")` em cenários "configurado".
       - Para testes "configurado", usar `vi.stubGlobal("fetch", mockOk(...))` para mockar resposta da Evolution API.
       - Cada teste construir Request quando precisar (`new Request("http://test/api/evolution/test-send", { method: "POST", body: JSON.stringify({ phone: "5585999999999" }) })`).
       - Anti-leak: `expect(JSON.stringify(json)).not.toContain("EVOLUTION_API_KEY")` etc.

    Por que assim:
    - Toda lógica de fetch externo isolada em `lib/evolution/client.ts` → routes ficam triviais → fácil testar.
    - Stubs `pendente_configuracao` garantem CI/typecheck verdes mesmo sem env vars de produção (vide regra "Se a integração real ainda não estiver configurada, criar stubs seguros").
    - Frontend NUNCA recebe URL/key — só o status enum + qr base64 quando aplicável.
    - Validação de body ANTES do check de env evita 200 enganoso quando o request já está mal formado.
  </action>
  <verify>
    <automated>npm test -- evolution-api &amp;&amp; npm run typecheck</automated>
  </verify>
  <done>
    - 7 arquivos criados: 2 lib + 4 routes + 1 test.
    - `npm test` passa (jurema, cockpit-pages, evolution-api todos verdes).
    - `npm run typecheck` passa sem erros novos.
    - Curl manual em dev (sem env): `curl http://localhost:3002/api/evolution/status` retorna `{"ok":true,"configured":false,"status":"pendente_configuracao",...}`.
    - `grep -r "EVOLUTION_API_KEY" src/lib/evolution src/app/api/evolution` mostra USO da env (process.env.EVOLUTION_API_KEY) mas nenhuma string que vaze a key em si.
  </done>
</task>

<task type="auto">
  <name>Task 2: Criar EvolutionConnectClient (TailAdmin) + reescrever page</name>
  <files>src/components/yzihub/EvolutionConnectClient.tsx, src/app/cockpit/evolution/page.tsx</files>
  <action>
    1. `src/components/yzihub/EvolutionConnectClient.tsx` (`"use client"`):
       - Estado: `status: EvolutionStatusValue | null`, `configured: boolean`, `phone: string | null`, `lastSeenAt: string | null`, `qr: string | null`, `loading: { status, qr, disconnect, test }`, `error: string | null`, `feedback: string | null`, `testPhoneInput: string`.
       - `useEffect` inicial: chamar `refreshStatus()` (GET /api/evolution/status). Em modo `pendente_configuracao`, exibir banner amarelo "Integração pendente de configuração — defina EVOLUTION_BASE_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME no servidor" (ESSA é a única menção textual e é informativa, não vaza valor).
       - Layout TailAdmin (siga padrão de AgentMetricsClient.tsx):
         - Header subtitle já vem do page.
         - Linha 1: 3 KPI cards horizontais — Status (badge colorido: verde=conectado, amarelo=aguardando_qr, vermelho=desconectado/erro, cinza=pendente_configuracao), Número conectado (mascarado tipo `+55 85 ****-9999` ou "—"), Última atualização (formato pt-BR `dd/MM HH:mm` ou "—").
         - Linha 2: Card "QR Code" — quando `status === "aguardando_qr"` e `qr` truthy: `<img src={qr.startsWith('data:') ? qr : 'data:image/png;base64,' + qr} alt="QR Code" className="w-64 h-64 mx-auto rounded-xl border" />` + texto "Abra o WhatsApp > Aparelhos conectados > Conectar um aparelho e leia o código.". Senão exibir placeholder "Nenhum QR ativo. Clique em 'Gerar/Atualizar QR' para iniciar.".
         - Linha 3: Card "Ações" — 4 botões TailAdmin (`rounded-xl px-4 py-2 text-sm font-medium`):
           - "Atualizar status" (cinza, sempre habilitado quando !loading.status)
           - "Gerar/Atualizar QR" (azul/primary, desabilitado se `!configured`)
           - "Desconectar" (vermelho/danger, desabilitado se `!configured || status !== "conectado"`, com `confirm()` antes)
           - "Testar envio" (verde/success, abre input inline para telefone E164, desabilitado se `status !== "conectado"`)
         - Banner feedback (verde sucesso / vermelho erro) acima das ações quando `feedback` ou `error` truthy.
       - Handlers: `refreshStatus()`, `generateQr()`, `disconnect()`, `sendTest()` — todos usam `fetch("/api/evolution/...", { method, headers: {"Content-Type":"application/json"}, body })`, atualizam estado, capturam erro.
       - Sem dependências externas novas (só React + ícones já existentes em `@/icons`).

    2. `src/app/cockpit/evolution/page.tsx` (server component, substituir conteúdo atual):
       ```tsx
       import EvolutionConnectClient from "@/components/yzihub/EvolutionConnectClient";

       export const dynamic = "force-dynamic";

       export default function EvolutionPage() {
         return (
           <div className="space-y-6">
             <div>
               <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Evolution</h1>
               <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                 Conexão WhatsApp via Evolution API — status, QR Code e ações operacionais
               </p>
             </div>
             <EvolutionConnectClient />
           </div>
         );
       }
       ```

    Por que assim:
    - Mantém arquitetura TailAdmin idêntica à página `/cockpit/observabilidade` (page server enxuta + client component).
    - Botões desabilitados por estado evitam chamadas inválidas (ex: desconectar quando já desconectado).
    - Mascaramento do telefone no UI evita expor número completo na tela compartilhada.
    - Banner amarelo `pendente_configuracao` é honesto com o operador sem vazar segredo.
    - `confirm()` nativo basta pra v1 — não introduz lib de modal nova (regra: não alterar design system).

    NÃO fazer:
    - Não criar nenhum arquivo em `src/lib/agents/` (Ju/Nina não são tocadas).
    - Não modificar AppSidebar (entrada Evolution já existe na linha 90).
    - Não criar migration Supabase (escopo: só UI + API client).
    - Não chamar n8n.
    - Não usar service_role.
  </action>
  <verify>
    <automated>npm run typecheck &amp;&amp; npm run lint -- src/components/yzihub/EvolutionConnectClient.tsx src/app/cockpit/evolution/page.tsx</automated>
  </verify>
  <done>
    - `src/components/yzihub/EvolutionConnectClient.tsx` existe (>= 150 linhas, "use client", consome 4 endpoints).
    - `src/app/cockpit/evolution/page.tsx` reescrito (sem placeholder "Em construção").
    - `npm run typecheck` passa sem erros novos.
    - `npm run lint` passa nos arquivos editados.
    - Acessar `http://localhost:3002/cockpit/evolution` em dev (sem env Evolution): página renderiza header, KPIs com status "pendente_configuracao" cinza, banner amarelo informativo, card QR vazio, 4 botões (3 desabilitados — só "Atualizar status" habilitado).
  </done>
</task>

</tasks>

<verification>
Checklist final ponta a ponta (ANTES de marcar SUMMARY):

1. `npm run typecheck` → 0 erros novos.
2. `npm test` → 100% passing (suítes existentes + nova evolution-api).
3. `npm run lint` → sem warnings novos nos arquivos modificados.
4. Manual em dev (`npm run dev` → http://localhost:3002/cockpit/evolution):
   - Página carrega sem erro de console.
   - KPIs exibem "pendente_configuracao" (cinza).
   - Banner amarelo aparece informando env vars ausentes.
   - Botão "Atualizar status" funciona (mostra spinner, atualiza timestamp).
   - "Gerar/Atualizar QR", "Desconectar", "Testar envio" estão desabilitados.
5. Curl direto:
   - `curl http://localhost:3002/api/evolution/status` → JSON com configured:false.
   - `curl -X POST http://localhost:3002/api/evolution/qr` → JSON com qr:null, configured:false.
   - `curl -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3002/api/evolution/test-send` → HTTP 400 `{"error":"phone obrigatorio"}`.
6. Anti-leak grep em respostas:
   - Nenhum response.json contém os literais `EVOLUTION_API_KEY` ou valor da key.
7. Sidebar `/cockpit/evolution` continua acessível (entrada AppSidebar.tsx linha 90 intocada).
</verification>

<success_criteria>
1. `/cockpit/evolution` deixa de ser placeholder e vira tela operacional TailAdmin.
2. 5 estados de status modelados (conectado, desconectado, aguardando_qr, erro, pendente_configuracao) — UI distingue cada um.
3. 4 ações server-side criadas: status, qr, disconnect, test-send.
4. Stubs seguros funcionam sem env vars (CI verde, dev sem credenciais funciona).
5. Zero exposição de EVOLUTION_BASE_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE_NAME ao bundle client (nenhum `NEXT_PUBLIC_EVOLUTION_*`, nenhum literal vazado em JSON).
6. Ju, Nina, leads, contratos, financeiro, RLS, design system: 0 alterações.
7. typecheck + tests + lint passam.
8. Diff entregue ao usuário com:
   - Lista de arquivos criados/modificados
   - Lista de rotas API criadas
   - Output de typecheck (PASS)
   - Output de tests (PASS)
   - Instruções para configurar env vars de produção (`.env.local`: EVOLUTION_BASE_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME) — sem valores reais.
</success_criteria>

<output>
After completion, create `.planning/quick/260503-kza-evolution-whatsapp-v1-tela-real-de-conex/260503-kza-SUMMARY.md` with:
- Files created/modified
- Routes API criadas
- Output do typecheck
- Output dos testes
- Como configurar (placeholder env vars)
- Próximos passos sugeridos (v2: persistir status histórico, webhook de mensagens recebidas, multi-instância por tenant)
</output>
