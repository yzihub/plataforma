---
phase: quick-260416-rng
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/brokers.ts
  - src/app/api/corretores/create/route.ts
  - src/components/yzihub/CorretoresClient.tsx
autonomous: true
requirements:
  - RNG-01
  - RNG-02
  - RNG-03
must_haves:
  truths:
    - "Ao salvar um novo corretor pelo drawer, o frontend chama POST /api/corretores/create (não escreve direto no Supabase)"
    - "A API route valida name (>=2 chars), normaliza phone (só dígitos) e repassa payload ao webhook n8n https://api.yzihub.com/webhook/corretores"
    - "Em caso de sucesso do webhook, a lista de corretores é atualizada (refresh) e o drawer fecha"
    - "Em caso de falha (validação ou webhook), o usuário vê mensagem de erro amigável e o drawer permanece aberto"
    - "O payload enviado ao webhook NÃO contém campo id, usa name (não full_name) e inclui tenant_id"
  artifacts:
    - path: "src/app/api/corretores/create/route.ts"
      provides: "POST handler que valida payload e chama webhook n8n"
      exports: ["POST"]
    - path: "src/types/brokers.ts"
      provides: "Tipo BrokerCreatePayload com contrato do webhook"
      contains: "BrokerCreatePayload"
    - path: "src/components/yzihub/CorretoresClient.tsx"
      provides: "handleSave ajustado para chamar /api/corretores/create no modo create"
      contains: "/api/corretores/create"
  key_links:
    - from: "src/components/yzihub/CorretoresClient.tsx"
      to: "/api/corretores/create"
      via: "fetch POST com payload BrokerCreatePayload"
      pattern: "fetch.*api/corretores/create"
    - from: "src/app/api/corretores/create/route.ts"
      to: "https://api.yzihub.com/webhook/corretores"
      via: "fetch POST server-side"
      pattern: "api\\.yzihub\\.com/webhook/corretores"
---

<objective>
Substituir o INSERT direto no Supabase (modo criar novo corretor) por uma chamada à API route `POST /api/corretores/create`, que valida o payload e delega a persistência ao webhook n8n `https://api.yzihub.com/webhook/corretores`. Isso alinha o módulo Corretores à Regra de Ouro do YZIHUB: frontend nunca escreve em fontes de automação diretamente — sempre via API route que invoca n8n.

Purpose: Centralizar a criação de corretores no pipeline n8n (onboarding, triggers, validações server-side), mantendo o frontend limpo de lógica de persistência para fluxos de automação.

Output:
- Nova API route `src/app/api/corretores/create/route.ts` com validação + chamada ao webhook.
- Tipo `BrokerCreatePayload` em `src/types/brokers.ts`.
- `CorretoresClient.handleSave` ajustado no ramo de criação para chamar a nova route (edit/delete continuam em Supabase — fora do escopo).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@src/components/yzihub/CorretorDrawer.tsx
@src/components/yzihub/CorretoresClient.tsx
@src/app/api/brokers/route.ts
@src/types/brokers.ts

<interfaces>
<!-- Contratos relevantes extraídos do código atual -->

From src/types/brokers.ts:
```typescript
export interface Broker {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export type BrokerInput = Pick<Broker, "name" | "phone" | "email" | "role" | "is_active">;
```

From src/components/yzihub/CorretorDrawer.tsx (contrato do onSave):
```typescript
onSave: (input: BrokerInput, id?: string) => Promise<void>;
// Quando id === undefined → CRIAR (este é o caminho que muda neste plano)
// Quando id !== undefined → EDITAR (permanece em Supabase, fora do escopo)
```

From src/components/yzihub/CorretoresClient.tsx (estado atual de handleSave — ramo criar):
```typescript
// ATUAL (INSERT direto no Supabase — será substituído):
const { data, error: insertError } = await supabase
  .from(BROKERS_TABLE)
  .insert({ ...input, is_active: input.is_active ?? true, tenant_id: tenant.id })
  .select()
  .single();
```

Webhook target (server-side):
- URL: https://api.yzihub.com/webhook/corretores
- Método: POST
- Payload esperado:
  ```json
  {
    "tenant_id": "b179ae75-3d56-4de8-8840-fc9c4d9ec21e",
    "name": "João Silva",
    "email": "joao@jurema.com",
    "phone": "83999999999",
    "is_active": true,
    "role": "vendas",
    "notes": "Especialista em alto padrão"
  }
  ```
- Regras: NÃO enviar `id`; usar `name` (não `full_name`); `phone` só dígitos; `name` mínimo 2 chars.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar API route POST /api/corretores/create + tipagem</name>
  <files>
    src/types/brokers.ts,
    src/app/api/corretores/create/route.ts
  </files>
  <action>
    **1) Adicionar tipo em `src/types/brokers.ts`** (append, não remover nada):

    ```typescript
    // Payload enviado do frontend para /api/corretores/create
    // e repassado ao webhook n8n. NUNCA contém `id`.
    export interface BrokerCreatePayload {
      tenant_id: string;
      name: string;
      email: string | null;
      phone: string | null;
      is_active: boolean;
      role: string | null;
      notes?: string | null;
    }
    ```

    **2) Criar `src/app/api/corretores/create/route.ts`** seguindo o padrão de `src/app/api/brokers/route.ts`:

    - `export async function POST(request: Request)`.
    - Autenticar via Supabase server (mesmo padrão do GET existente): `createClient()` de `@/lib/supabase/server`, `supabase.auth.getUser()`, `profiles → tenant_id`. Se não autenticado → 401.
    - Ler `body = await request.json()` (tolerar JSON inválido com try/catch → 400).
    - Validar payload:
      - `name` string, trim, length ≥ 2 → senão 400 `{ error: "Nome inválido (mínimo 2 caracteres)" }`.
      - `tenant_id` deve ser fornecido OU, se ausente, usar o `tenant_id` do profile autenticado (prefir fornecido, fallback no profile). Em DEV, o front envia b179ae75-3d56-4de8-8840-fc9c4d9ec21e — a route apenas confia após checar que o usuário pertence a esse tenant (comparar com profile.tenant_id; se divergir → 403 `{ error: "tenant_id inválido" }`).
      - `is_active` default `true` se ausente.
      - `role`, `email`, `notes` → opcionais, `null` se vazios.
    - Normalizar `phone`: `phone?.replace(/\D/g, "") || null`.
    - Montar `webhookPayload: BrokerCreatePayload` garantindo que NÃO há campo `id`.
    - `fetch("https://api.yzihub.com/webhook/corretores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(webhookPayload) })` com `try/catch`.
    - Se `!response.ok` → log + 502 `{ error: "Falha ao criar corretor no n8n", status: response.status }`.
    - Em sucesso: tentar parsear JSON do webhook (tolerar resposta vazia); retornar 201 `{ ok: true, data: <webhookResponseOrNull> }`.
    - Erro inesperado → 500 `{ error: "Erro interno do servidor" }` com `console.error`.

    **Porquês importantes a incluir como comentários no arquivo:**
    - `// NÃO enviar campo id no payload — n8n gera/resolve`.
    - `// phone normalizado: apenas dígitos (padrão YZIHUB validado em quick-260416-ln6)`.
    - `// tenant_id validado contra profiles para prevenir cross-tenant write`.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    Expected: 0 errors nas alterações. Também rodar:
    `ls src/app/api/corretores/create/route.ts` (arquivo existe).
    `grep -n "BrokerCreatePayload" src/types/brokers.ts` (tipo exportado).
    `grep -n "api.yzihub.com/webhook/corretores" src/app/api/corretores/create/route.ts` (URL correta).
  </verify>
  <done>
    - `src/types/brokers.ts` exporta `BrokerCreatePayload` sem campo `id`.
    - `src/app/api/corretores/create/route.ts` exporta `POST`.
    - Route autentica via Supabase server, valida name ≥ 2, normaliza phone, cross-checa tenant_id contra profile, chama o webhook n8n com o payload correto e retorna {ok,data} em 201 ou erro padronizado {error} com status apropriado.
    - `tsc --noEmit` sem erros novos.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Ajustar CorretoresClient.handleSave para usar /api/corretores/create no modo criar</name>
  <files>src/components/yzihub/CorretoresClient.tsx</files>
  <action>
    Objetivo: no ramo `!id` (criar) de `handleSave`, substituir o `supabase.insert` por `fetch("/api/corretores/create", ...)`. O ramo `id` (editar) permanece idêntico (Supabase direto), pois está fora do escopo deste plano.

    **Mudanças cirúrgicas em `handleSave`:**

    1. **Manter** a validação inicial `if (!input.name || input.name.trim().length < 2) throw new Error("Nome inválido");`
    2. **Manter** o ramo `if (id) { ... update ... }` exatamente como está.
    3. **Substituir** o `else { ... insert ... }` por:

       ```typescript
       } else {
         // CREATE → delega ao webhook n8n via API route (Regra de Ouro: frontend nunca escreve em fontes de automação).
         const payload = {
           tenant_id: tenant.id,
           name: input.name,
           email: input.email ?? null,
           phone: input.phone ?? null, // já normalizado pelo CorretorDrawer
           is_active: input.is_active ?? true,
           role: input.role ?? null,
           notes: null, // reservado para uso futuro
         };

         const res = await fetch("/api/corretores/create", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify(payload),
         });

         if (!res.ok) {
           const body = await res.json().catch(() => ({}));
           throw new Error(body?.error ?? "Falha ao criar corretor");
         }

         // Refresh: refazer o fetch da lista a partir do Supabase, já que a source of truth
         // (criada pelo n8n) precisa ser lida depois. Extraímos o bloco de fetch em uma função.
         await refetchBrokers();
       }
       ```

    4. **Extrair** a lógica do `useEffect` (o `fetchData()` que carrega brokers + leads) em uma função de componente `refetchBrokers()` chamável também pós-create. Implementação sugerida:

       ```typescript
       async function refetchBrokers() {
         if (!tenant?.id) return;
         const supabase = createClient();
         const { data, error: brokersError } = await supabase
           .from(BROKERS_TABLE)
           .select("id, tenant_id, name, phone, email, role, is_active, created_at, updated_at")
           .eq("tenant_id", tenant.id)
           .order("created_at", { ascending: false });
         if (!brokersError && data) setBrokers(data as Broker[]);
       }
       ```

       Manter `useEffect` existente (pode chamar `refetchBrokers()` internamente, ou deixar o fetchData inline como está — escolher a forma que gera menor diff). Preferir: manter `useEffect` como está e adicionar `refetchBrokers` como função separada.

    5. **Tratamento de erro**: o bloco `catch` existente já captura o `throw new Error(...)` e seta `setError(...)`. O `CorretorDrawer` já mostra "Erro ao salvar. Tente novamente." via `saveError`, e o banner do `CorretoresClient` mostra `error` detalhado. Não mudar esse fluxo.

    **Não alterar**:
    - `handleDelete` (Supabase direto — fora do escopo).
    - Ramo de edit (`if (id)`) — fora do escopo.
    - `CorretorDrawer.tsx` — o contrato `onSave(input, id?)` já cobre o fluxo; nenhuma mudança necessária lá (a normalização de phone já acontece dentro do drawer antes de chamar onSave).
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    Também:
    `grep -n "/api/corretores/create" src/components/yzihub/CorretoresClient.tsx` (fetch presente).
    `grep -n "supabase.*from(BROKERS_TABLE).*insert" src/components/yzihub/CorretoresClient.tsx` (NÃO deve mais retornar no ramo create — se retornar, deve ser apenas refs históricas removidas; idealmente 0 resultados no ramo `else`).
    Test manual (checkpoint não-blocking): abrir `/cockpit/crm/corretores`, clicar "Novo Corretor", preencher nome válido + phone, salvar. Esperado: drawer fecha, lista faz refresh, corretor aparece (após n8n terminar).
  </verify>
  <done>
    - No modo criar, `handleSave` faz `fetch POST /api/corretores/create` com payload `{ tenant_id, name, email, phone, is_active, role, notes }` (sem `id`).
    - Em sucesso → `refetchBrokers()` atualiza a lista e drawer fecha.
    - Em erro → `setError(...)` mostra banner e drawer mantém o feedback via `saveError`.
    - Ramo de edit intocado. `handleDelete` intocado.
    - `tsc --noEmit` sem erros novos.
  </done>
</task>

</tasks>

<verification>
- [ ] `src/app/api/corretores/create/route.ts` existe e exporta `POST`.
- [ ] `src/types/brokers.ts` exporta `BrokerCreatePayload` sem campo `id`.
- [ ] `CorretoresClient.tsx` chama `/api/corretores/create` no ramo create; ramo update permanece em Supabase.
- [ ] `npx tsc --noEmit` passa sem novos erros.
- [ ] Payload enviado ao webhook n8n usa `name` (não `full_name`), `phone` normalizado (só dígitos), inclui `tenant_id` e omite `id`.
- [ ] Validação server-side: name < 2 → 400, tenant_id divergente do profile → 403, webhook falha → 502.
- [ ] Refresh da lista após criação.
- [ ] Erros amigáveis no drawer/banner em caso de falha.
</verification>

<success_criteria>
1. Do ponto de vista do usuário: criar um novo corretor no drawer dispara o webhook n8n (não mais INSERT direto), e a lista é atualizada após sucesso.
2. Do ponto de vista da arquitetura: a Regra de Ouro é respeitada — frontend → API route → webhook n8n (nunca direto).
3. Do ponto de vista de segurança: `tenant_id` é cross-checado no servidor antes do webhook ser invocado.
4. Do ponto de vista do contrato: payload corresponde EXATAMENTE ao schema esperado pelo webhook (campos nomeados conforme especificado, sem `id`).
</success_criteria>

<output>
Após conclusão, criar `.planning/quick/260416-rng-criar-api-route-post-api-corretores-crea/260416-rng-SUMMARY.md` listando:
- Arquivos criados/modificados
- Decisões chave (por ex.: cross-check de tenant_id, extração de `refetchBrokers`)
- Pendências/Follow-ups (update e delete continuam em Supabase — candidato para próximo plano se for desejado unificar via n8n)
</output>
