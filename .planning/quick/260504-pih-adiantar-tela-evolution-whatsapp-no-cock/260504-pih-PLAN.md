---
phase: quick-260504-pih
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/evolution/types.ts
  - src/lib/evolution/client.ts
  - src/app/api/evolution/webhook/route.ts
  - src/components/yzihub/EvolutionConnectClient.tsx
autonomous: true
requirements: [PIH-01, PIH-02, PIH-03]

must_haves:
  truths:
    - "Item Evolution continua visivel no sidebar do cockpit (sem mudanca)"
    - "Em /cockpit/evolution o usuario ve cards informativos: Instancia, Base URL, Agente conectado, Webhook URL"
    - "Status da conexao da instancia aparece live (conectado/desconectado/aguardando_qr/erro/pendente)"
    - "Status do webhook aparece live (configurado/divergente/ausente/erro/pendente)"
    - "Botao 'Atualizar status' refaz fetch dos endpoints e atualiza os cards"
    - "Botao 'Enviar teste' abre form com numero + mensagem e envia via /api/evolution/test-send"
    - "Loading, erro e sucesso aparecem em todas as 3 operacoes (status/webhook/test)"
    - "Nenhuma chamada a Evolution sai do client; tudo via /api/evolution/*"
    - "EVOLUTION_API_KEY nunca aparece em bundle do client (sem NEXT_PUBLIC_)"
    - "npm run build passa sem erros"
  artifacts:
    - path: "src/app/api/evolution/webhook/route.ts"
      provides: "GET endpoint que consulta findWebhook na Evolution e retorna status do webhook configurado"
    - path: "src/lib/evolution/types.ts"
      provides: "Tipos EvolutionWebhookStatusValue e EvolutionWebhookResponse"
    - path: "src/lib/evolution/client.ts"
      provides: "Funcao getInstanceWebhook() server-only"
    - path: "src/components/yzihub/EvolutionConnectClient.tsx"
      provides: "Painel operacional com 6 cards (4 estaticos + 2 live), botao 'Atualizar status' e form 'Enviar teste'"
  key_links:
    - from: "src/components/yzihub/EvolutionConnectClient.tsx"
      to: "/api/evolution/status"
      via: "fetch GET on mount + onClick 'Atualizar status'"
      pattern: "fetch.*api/evolution/status"
    - from: "src/components/yzihub/EvolutionConnectClient.tsx"
      to: "/api/evolution/webhook"
      via: "fetch GET on mount + onClick 'Atualizar status'"
      pattern: "fetch.*api/evolution/webhook"
    - from: "src/components/yzihub/EvolutionConnectClient.tsx"
      to: "/api/evolution/test-send"
      via: "fetch POST com {phone, message}"
      pattern: "fetch.*api/evolution/test-send"
    - from: "src/app/api/evolution/webhook/route.ts"
      to: "src/lib/evolution/client.ts"
      via: "import { getInstanceWebhook }"
      pattern: "getInstanceWebhook"
---

<objective>
Adiantar `/cockpit/evolution` como painel operacional simples da instancia WhatsApp da Jurema Brokers.

Purpose: dar visibilidade rapida (live status conexao + webhook + dados estaticos da instancia) e capacidade de teste basico de envio, sem mexer em Ju/Agno/Supabase/webhook Python. Mantem padrao server-only para a API key da Evolution.

Output: novo endpoint /api/evolution/webhook, funcao getInstanceWebhook em src/lib/evolution/client.ts, e refatoracao de EvolutionConnectClient.tsx para layout de cards informativos + botoes "Atualizar status" e "Enviar teste".
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@src/lib/evolution/client.ts
@src/lib/evolution/types.ts
@src/app/api/evolution/status/route.ts
@src/app/api/evolution/test-send/route.ts
@src/app/cockpit/evolution/page.tsx
@src/components/yzihub/EvolutionConnectClient.tsx
@src/layout/AppSidebar.tsx

<interfaces>
<!-- Funcoes ja existentes em src/lib/evolution/client.ts (server-only) -->
```ts
export function isEvolutionConfigured(): boolean;
export async function getInstanceStatus(): Promise<EvolutionStatusResponse>;
export async function sendTestMessage(input: EvolutionTestSendInput): Promise<EvolutionTestSendResponse>;
```

<!-- Tipos ja existentes em src/lib/evolution/types.ts -->
```ts
export type EvolutionStatusValue =
  | "conectado"
  | "desconectado"
  | "aguardando_qr"
  | "erro"
  | "pendente_configuracao";

export type EvolutionStatusResponse = {
  ok: true;
  configured: boolean;
  status: EvolutionStatusValue;
  instance?: string;
  phone_number?: string | null;
  last_seen_at?: string | null;
  message?: string;
};

export type EvolutionTestSendInput = { phone: string; message?: string };
export type EvolutionTestSendResponse = {
  ok: true;
  configured: boolean;
  status: EvolutionStatusValue;
  sent: boolean;
  message_id?: string | null;
};
```

<!-- Sidebar (apenas leitura — item ja existe, NAO mexer): -->
```ts
// src/layout/AppSidebar.tsx ~ linha 90
{ name: "Evolution", icon: <ChatIcon />, path: "/cockpit/evolution" }
```

<!-- Convencao Evolution API (referencia): -->
// findWebhook: GET {baseUrl}/webhook/find/{instance} headers: { apikey }
// resposta tipica: { url, enabled, events, webhookByEvents, webhookBase64 }

<!-- Constantes operacionais (hardcode aceitavel — sao publicas): -->
// EXPECTED_WEBHOOK_URL = "https://yzi-os.yzihub.com/webhook/evolution"
// AGENT_NAME = "Ju"
// CLIENT_NAME = "Jurema Brokers"
</interfaces>

<env_vars>
<!-- Server-only — JAMAIS expor com NEXT_PUBLIC_ -->
EVOLUTION_BASE_URL       # ex: https://evo.yzihub.com
EVOLUTION_API_KEY        # apikey header value
EVOLUTION_INSTANCE_NAME  # ex: jurema-brokers
</env_vars>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — getInstanceWebhook + GET /api/evolution/webhook</name>
  <files>src/lib/evolution/types.ts, src/lib/evolution/client.ts, src/app/api/evolution/webhook/route.ts</files>
  <action>
Adicionar suporte a leitura live do webhook configurado na instancia da Evolution.

1. Em `src/lib/evolution/types.ts` — adicionar (NAO remover nada existente):

```ts
export type EvolutionWebhookStatusValue =
  | "configurado"        // url retornada bate com a esperada
  | "divergente"         // Evolution retornou url diferente da esperada
  | "ausente"            // Evolution nao tem webhook configurado
  | "erro"               // falha de comunicacao
  | "pendente_configuracao"; // env vars nao configuradas

export type EvolutionWebhookResponse = {
  ok: true;
  configured: boolean;
  status: EvolutionWebhookStatusValue;
  /** URL atualmente configurada na Evolution (null se ausente/erro) */
  webhook_url: string | null;
  /** URL esperada (constante) — facilita comparacao no client */
  expected_url: string;
  /** lista de eventos atualmente assinados, ou null */
  events?: string[] | null;
  /** webhook ativo? (campo `enabled` da Evolution) */
  enabled?: boolean;
  message?: string;
};
```

2. Em `src/lib/evolution/client.ts` — adicionar export de constante e nova funcao no final do arquivo:

```ts
import type {
  EvolutionWebhookResponse,
  // ... demais ja importados
} from "./types";

/** URL publica esperada do webhook YZI OS para a Evolution. */
export const EXPECTED_WEBHOOK_URL = "https://yzi-os.yzihub.com/webhook/evolution";

/**
 * GET webhook config da instancia na Evolution.
 * Endpoint: GET {baseUrl}/webhook/find/{instance}
 * Resposta tipica: { url, enabled, events, webhookByEvents, webhookBase64 }
 * Retorna safe stub quando env vars nao estao configuradas.
 */
export async function getInstanceWebhook(): Promise<EvolutionWebhookResponse> {
  if (!isEvolutionConfigured()) {
    return {
      ok: true,
      configured: false,
      status: "pendente_configuracao",
      webhook_url: null,
      expected_url: EXPECTED_WEBHOOK_URL,
      message: "Integracao pendente de configuracao no servidor",
    };
  }

  const { baseUrl, apiKey, instance } = (function readEnv() {
    return {
      baseUrl: process.env.EVOLUTION_BASE_URL ?? "",
      apiKey: process.env.EVOLUTION_API_KEY ?? "",
      instance: process.env.EVOLUTION_INSTANCE_NAME ?? "",
    };
  })();

  try {
    const res = await fetch(`${baseUrl}/webhook/find/${instance}`, {
      headers: { apikey: apiKey },
      cache: "no-store",
    });

    // Evolution retorna 404 quando webhook ausente — tratar como "ausente"
    if (res.status === 404) {
      return {
        ok: true,
        configured: true,
        status: "ausente",
        webhook_url: null,
        expected_url: EXPECTED_WEBHOOK_URL,
      };
    }

    if (!res.ok) {
      return {
        ok: true,
        configured: true,
        status: "erro",
        webhook_url: null,
        expected_url: EXPECTED_WEBHOOK_URL,
        message: `Falha ao consultar webhook: HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const url: string | null = data?.url ?? data?.webhook?.url ?? null;
    const events: string[] | null = Array.isArray(data?.events) ? data.events : null;
    const enabled: boolean | undefined =
      typeof data?.enabled === "boolean" ? data.enabled : undefined;

    if (!url) {
      return {
        ok: true,
        configured: true,
        status: "ausente",
        webhook_url: null,
        expected_url: EXPECTED_WEBHOOK_URL,
        events,
        enabled,
      };
    }

    const status: EvolutionWebhookResponse["status"] =
      url.trim().replace(/\/+$/, "") ===
      EXPECTED_WEBHOOK_URL.trim().replace(/\/+$/, "")
        ? "configurado"
        : "divergente";

    return {
      ok: true,
      configured: true,
      status,
      webhook_url: url,
      expected_url: EXPECTED_WEBHOOK_URL,
      events,
      enabled,
    };
  } catch {
    return {
      ok: true,
      configured: true,
      status: "erro",
      webhook_url: null,
      expected_url: EXPECTED_WEBHOOK_URL,
      message: "Falha ao consultar webhook",
    };
  }
}
```

Observacao: NAO refatorar `readEnv()` para um helper exportado — manter o padrao do arquivo (fechado e tipado por inline).

3. Criar `src/app/api/evolution/webhook/route.ts` seguindo exatamente o padrao de `src/app/api/evolution/status/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getInstanceWebhook, EXPECTED_WEBHOOK_URL } from "@/lib/evolution/client";

export const dynamic = "force-dynamic";

// ─── GET /api/evolution/webhook ───────────────────────────────────────────────
// Returns the current webhook configuration on the Evolution instance.
// When EVOLUTION_* env vars are missing, returns pendente_configuracao without
// making any external calls — safe for CI and dev environments without credentials.

export async function GET() {
  try {
    const data = await getInstanceWebhook();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[GET /api/evolution/webhook]", err);
    return NextResponse.json(
      {
        ok: true,
        configured: false,
        status: "erro",
        webhook_url: null,
        expected_url: EXPECTED_WEBHOOK_URL,
        message: "Falha interna ao consultar webhook",
      },
      { status: 500 }
    );
  }
}
```

Regras criticas (CLAUDE.md):
- API key da Evolution **nunca** chega ao client (sem `NEXT_PUBLIC_`).
- Nao usar `service_role`.
- Nao chamar n8n.
- Nao mexer em Supabase.
- Nao mexer em webhook Python / Agno.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit</automated>
    <automated>cd D:/dev/plataforma && node -e "require('fs').accessSync('src/app/api/evolution/webhook/route.ts'); console.log('OK route'); const c = require('fs').readFileSync('src/lib/evolution/client.ts','utf8'); if(!c.includes('getInstanceWebhook')) throw new Error('client.ts missing getInstanceWebhook'); if(!c.includes('EXPECTED_WEBHOOK_URL')) throw new Error('client.ts missing EXPECTED_WEBHOOK_URL'); const t = require('fs').readFileSync('src/lib/evolution/types.ts','utf8'); if(!t.includes('EvolutionWebhookResponse')) throw new Error('types.ts missing EvolutionWebhookResponse'); console.log('OK lib');"</automated>
  </verify>
  <done>
- Tipos `EvolutionWebhookStatusValue` e `EvolutionWebhookResponse` exportados em `types.ts`.
- `getInstanceWebhook` e `EXPECTED_WEBHOOK_URL` exportados em `client.ts`.
- Endpoint `GET /api/evolution/webhook` existe e responde 200 com shape `EvolutionWebhookResponse` (mesmo quando env vars ausentes — `pendente_configuracao`).
- `npx tsc --noEmit` passa.
- Nenhum import de Evolution em arquivos com `"use client"`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend — refatorar EvolutionConnectClient para painel operacional</name>
  <files>src/components/yzihub/EvolutionConnectClient.tsx</files>
  <action>
Refatorar `src/components/yzihub/EvolutionConnectClient.tsx` para o layout de painel operacional descrito no task_details.

NAO criar nova pagina — `src/app/cockpit/evolution/page.tsx` ja importa este componente e fica como esta.
NAO remover o sidebar item Evolution (ja existe em `src/layout/AppSidebar.tsx`).
NAO chamar Evolution direto do client; usar apenas `/api/evolution/*`.

Estrutura final do componente (substituir conteudo atual):

1. **Estado** (substituir o estado atual):
   ```ts
   type StatusJson = { ok: boolean; configured: boolean; status: EvolutionStatusValue; phone_number?: string | null; last_seen_at?: string | null; message?: string };
   type WebhookJson = { ok: boolean; configured: boolean; status: EvolutionWebhookStatusValue; webhook_url: string | null; expected_url: string; events?: string[] | null; enabled?: boolean; message?: string };
   type TestSendJson = { ok: boolean; configured: boolean; status: EvolutionStatusValue; sent: boolean; message_id?: string | null };
   ```
   - `connection: StatusJson | null`
   - `webhook: WebhookJson | null`
   - `loading: { refresh: boolean; test: boolean }`
   - `error: string | null` (banner global)
   - `feedback: string | null` (banner sucesso global)
   - `testForm: { phone: string; message: string; open: boolean }` (defaults: phone="", message="[YZI] Teste de envio do cockpit.")
   - `lastUpdatedAt: string | null` (ISO; setado apos refresh bem-sucedido)

2. **Constantes estaticas** (no topo do componente, fora do render):
   ```ts
   const STATIC = {
     instance: "Jurema Brokers",
     baseUrl: "https://evo.yzihub.com",
     agent: "Ju",
     webhookUrl: "https://yzi-os.yzihub.com/webhook/evolution",
   } as const;
   ```

3. **Efeitos**:
   - `useEffect` no mount → chamar `refreshAll()`.

4. **Handlers**:
   - `async function refreshAll()` — fetch paralelo de `/api/evolution/status` e `/api/evolution/webhook` via `Promise.allSettled`. Atualiza `connection` e `webhook`. Em qualquer falha de rede, set `error = "Erro ao atualizar. Tente novamente."`. Sucesso parcial NAO quebra a UI: o card cuja chamada falhou mostra status "erro" / "—". Set `lastUpdatedAt = new Date().toISOString()` ao final.
   - `async function sendTest()` — valida `testForm.phone.trim().length >= 8` (fail → `setError("Informe um numero valido (ex: 5585999991234).")`). POST `/api/evolution/test-send` com `{ phone: testForm.phone.trim(), message: testForm.message.trim() || undefined }`. Em sucesso (`json.sent === true`), `setFeedback(...)` e fecha o form. Em falha, `setError(...)`.
   - Ambos os handlers controlam o `loading` correspondente.

5. **Cards (layout TailAdmin dark)** — usar grid responsivo `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`, cada card com a mesma estrutura visual de `KpiCard` ja existente (rounded-2xl, border, bg `dark:bg-white/[0.03]`, padding p-4):

   - **Card 1 — Instancia:** label "Instancia", valor "Jurema Brokers". Icon: `BoltIcon`.
   - **Card 2 — Base URL:** label "Base URL", valor `STATIC.baseUrl` (font-mono, truncate). Icon: existente (escolher um neutro tipo `BoxCubeIcon` se disponivel, senao manter `BoltIcon`).
   - **Card 3 — Agente conectado:** label "Agente conectado", valor "Ju". Icon: `CheckCircleIcon`.
   - **Card 4 — Webhook URL:** label "Webhook URL", valor `STATIC.webhookUrl` (font-mono, text-xs, break-all). Icon neutro.
   - **Card 5 — Status da conexao (live):** label "Status da conexao", valor: `<StatusBadge status={connection?.status ?? null} />`. Subtitulo: numero mascarado se `connected` (reusar helper `maskPhone` ja existente). Loading: skeleton/spinner enquanto `loading.refresh && !connection`.
   - **Card 6 — Status do webhook (live):** label "Status do webhook", valor: novo `<WebhookBadge status={webhook?.status ?? null} />` (5 estados: configurado=verde, divergente=amber, ausente=red, erro=red, pendente_configuracao=gray). Subtitulo: se `divergente`, mostrar `webhook?.webhook_url` em font-mono small; se `configurado`, mostrar `enabled ? "Ativo" : "Desativado"` quando informado.

6. **Banners**:
   - Banner amber `pendente_configuracao` (manter o ja existente, mas disparar quando `connection?.status === "pendente_configuracao"` OU `webhook?.status === "pendente_configuracao"`).
   - Banners de error e feedback identicos aos atuais (vermelho/verde, fechaveis).

7. **Acoes (linha de botoes)**:
   - **Atualizar status** (`refreshAll`) — sempre habilitado quando nao loading. Bg gray-100/dark:bg-gray-800.
   - **Enviar teste** (toggle do form) — habilitado sempre que `connection?.status === "conectado"` (tooltip se desabilitado: "Instancia precisa estar conectada para testar envio").

8. **Form de teste** (renderizado quando `testForm.open === true`): 2 inputs (`phone` placeholder "5585999991234", `message` textarea pequeno) + botao "Enviar" (loading.test) + "Cancelar". Submit por `Enter` no campo phone. Se `phone` invalido, mostrar erro inline e NAO chamar API.

9. **Bloco "Ultima atualizacao":** rodape pequeno (text-xs text-gray-500) abaixo dos cards: "Ultima atualizacao: {formatDateTime(lastUpdatedAt)}" — reusar helper `formatDateTime` ja existente.

10. **Remover** do componente:
    - Estado `qr`, `loading.qr`, `loading.disconnect`, `showTestInput` antigo.
    - Handlers `generateQr` e `disconnect`.
    - Card de QR Code completo.
    - Botoes "Gerar/Atualizar QR" e "Desconectar".
    - Imports nao usados apos a remocao (manter pelo menos `BoltIcon`, `CheckCircleIcon`, `AlertIcon`, `TimeIcon`, `CloseLineIcon`).

11. **Imports tipos**:
    ```ts
    import type { EvolutionStatusValue, EvolutionWebhookStatusValue } from "@/lib/evolution/types";
    ```

12. **TailAdmin dark** — manter exatamente as classes ja em uso no arquivo (`dark:bg-white/[0.03]`, `dark:border-gray-800`, `dark:text-white/90`, etc). Nao introduzir nova paleta.

Regras criticas (CLAUDE.md):
- Nao calcular regra de negocio no client.
- Nao chamar Supabase, n8n nem Evolution direto.
- Nao expor API key.
- Nao alterar webhook Python / Agno / backend.
- Nao mexer em sidebar (item ja existe).
- Nao alterar `src/app/cockpit/evolution/page.tsx`.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit</automated>
    <automated>cd D:/dev/plataforma && node -e "const fs=require('fs'); const c=fs.readFileSync('src/components/yzihub/EvolutionConnectClient.tsx','utf8'); ['refreshAll','sendTest','/api/evolution/status','/api/evolution/webhook','/api/evolution/test-send','Jurema Brokers','https://evo.yzihub.com','https://yzi-os.yzihub.com/webhook/evolution','Atualizar status','Enviar teste'].forEach(s=>{ if(!c.includes(s)) throw new Error('missing: '+s); }); ['/instance/connect','/instance/logout','generateQr','disconnect()','QR Code'].forEach(s=>{ if(c.includes(s)) throw new Error('should be removed: '+s); }); console.log('OK component');"</automated>
    <automated>cd D:/dev/plataforma && npm run build</automated>
  </verify>
  <done>
- `/cockpit/evolution` renderiza 6 cards (4 estaticos + 2 live).
- Botao "Atualizar status" dispara fetch paralelo de `/api/evolution/status` e `/api/evolution/webhook`.
- Botao "Enviar teste" abre form com `phone` + `message` e envia via `/api/evolution/test-send`.
- Loading, erro e sucesso aparecem para refresh e test-send.
- Nenhuma chamada direta a Evolution no client; nenhum import de `EVOLUTION_API_KEY`.
- `npx tsc --noEmit` passa.
- `npm run build` passa sem erros.
  </done>
</task>

</tasks>

<verification>
Apos as duas tasks:

1. **Build & types:**
   - `npx tsc --noEmit` → sem erros.
   - `npm run build` → sucesso.

2. **Smoke manual (servidor sem env vars):**
   - `npm run dev` → abrir `/cockpit/evolution`.
   - Sidebar continua mostrando "Evolution".
   - Banner amber "Integracao pendente de configuracao" aparece (porque `EVOLUTION_*` nao definidas em dev).
   - Cards Instancia / Base URL / Agente / Webhook URL aparecem com valores estaticos.
   - Cards Status conexao e Status webhook mostram badge "Pendente configuracao".
   - Botao "Atualizar status" dispara loading e nao quebra a UI.
   - Botao "Enviar teste" abre form; input vazio mostra erro inline; com numero qualquer chama `/api/evolution/test-send` que retorna `pendente_configuracao` e UI mostra erro amigavel.

3. **Smoke manual (servidor com env vars reais):**
   - Setar `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME` em `.env.local`.
   - Reiniciar dev server.
   - Status da conexao reflete estado real.
   - Status do webhook mostra `configurado` se webhook na Evolution = `https://yzi-os.yzihub.com/webhook/evolution`, ou `divergente` mostrando a URL atual.

4. **Seguranca:**
   - `grep -r "EVOLUTION_API_KEY" src/components src/app | grep -v "/api/"` → vazio (zero ocorrencias em arquivos com `"use client"` ou em rotas que nao sejam API).
   - `grep -r "evo.yzihub.com" src/components src/app/cockpit` → so deve haver mencao em texto/UI estatico, nunca em fetch direto.
</verification>

<success_criteria>
- Sidebar mantem item "Evolution" (sem alteracao em AppSidebar.tsx).
- `/cockpit/evolution` renderiza painel operacional com 6 cards.
- Endpoints `/api/evolution/status`, `/api/evolution/webhook` e `/api/evolution/test-send` respondem 200 com shapes esperados.
- Botoes "Atualizar status" e "Enviar teste" funcionam com loading/erro/sucesso visiveis.
- API key da Evolution permanece server-only.
- `npm run build` passa.
- Nenhuma alteracao em: backend Python, Agno, Nina, Ju, Supabase schema, webhook Evolution existente, sidebar.
</success_criteria>

<output>
After completion, create `.planning/quick/260504-pih-adiantar-tela-evolution-whatsapp-no-cock/260504-pih-SUMMARY.md` listing:
- Files modified/created.
- Endpoints adicionados.
- Como testar local sem credenciais (estado pendente_configuracao).
- Como testar com credenciais reais.
- Pontos de atencao para producao (Vercel env vars EVOLUTION_*).
</output>
