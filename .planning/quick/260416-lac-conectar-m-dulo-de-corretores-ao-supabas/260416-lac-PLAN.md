---
phase: quick-260416-lac
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/brokers/route.ts
autonomous: false
requirements:
  - BROK-01  # Listagem de corretores ligada ao Supabase (filtrada por tenant_id)
  - BROK-02  # Criação/edição de corretor persistindo no Supabase
  - BROK-03  # Toggle ativo/inativo (is_active) persistindo no Supabase
  - BROK-04  # Sem mock data no código final
  - BROK-05  # Tipagem correta (Broker / BrokerInput)
  - BROK-06  # Loading state e tratamento de erro
must_haves:
  truths:
    - "Listagem de corretores vem 100% do Supabase filtrada por tenant_id"
    - "Criar um corretor novo persiste no Supabase e aparece na UI"
    - "Editar um corretor persiste no Supabase e atualiza a UI"
    - "Alternar Ativo/Inativo no drawer persiste is_active no Supabase"
    - "Nenhum mock/hardcoded broker existe no caminho de produção"
    - "API /api/brokers retorna o mesmo shape consumido pela UI (inclui is_active)"
  artifacts:
    - path: "src/components/yzihub/CorretoresClient.tsx"
      provides: "Lista + CRUD de corretores contra brokers table"
      contains: "BROKERS_TABLE"
    - path: "src/components/yzihub/CorretorDrawer.tsx"
      provides: "Form de criação/edição com toggle is_active"
      contains: "is_active"
    - path: "src/types/brokers.ts"
      provides: "Tipo Broker e BrokerInput"
      contains: "is_active"
    - path: "src/app/api/brokers/route.ts"
      provides: "Endpoint GET /api/brokers filtrado por tenant_id"
      contains: "is_active"
  key_links:
    - from: "src/components/yzihub/CorretoresClient.tsx"
      to: "Supabase brokers table"
      via: "createClient().from('brokers').select/insert/update/delete + .eq('tenant_id', tenant.id)"
      pattern: "from\\(BROKERS_TABLE\\)"
    - from: "src/components/yzihub/CorretorDrawer.tsx"
      to: "onSave(input, id?)"
      via: "form submit -> handleSave em CorretoresClient"
      pattern: "onSave\\(input"
    - from: "src/app/api/brokers/route.ts"
      to: "Broker shape esperado pela UI"
      via: "SELECT colunas alinhado com types/brokers.ts"
      pattern: "is_active"
---

<objective>
Validar e finalizar a integração do módulo de Corretores com Supabase (tabela `brokers`), remover qualquer resíduo de mock, e fechar uma única fonte de verdade de dados filtrada por `tenant_id`.

Purpose: Garantir que a equipe comercial do tenant é gerenciada exclusivamente pelo banco — listar, criar, editar e ativar/desativar corretor são operações reais, não simulações.

Output:
- `src/app/api/brokers/route.ts` com shape consistente (inclui `is_active`)
- Validação manual de CRUD + toggle ativo/inativo persistido
- Zero mock/hardcoded broker no caminho de produção
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

# Arquivos do módulo (já conectados ao Supabase — apenas validar)
@src/components/yzihub/CorretoresClient.tsx
@src/components/yzihub/CorretorDrawer.tsx
@src/components/yzihub/CorretoresKpiStrip.tsx
@src/types/brokers.ts
@src/app/api/brokers/route.ts
@src/context/TenantContext.tsx
@src/hooks/useTenant.ts

<interfaces>
<!-- Contratos atuais — executor NÃO deve explorar codebase para descobrir. -->

From src/types/brokers.ts:
```typescript
export interface Broker {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export type BrokerInput = Pick<Broker, "full_name" | "phone" | "email" | "role" | "is_active">;
```

From src/hooks/useTenant.ts:
```typescript
// Re-export de TenantContext
export { useTenantContext as useTenant } from "@/context/TenantContext";
// tenant: { id: string; name: string; plan: TenantPlan; activeModules: ActiveModule[]; settings: Record<string, unknown> } | null
// loading: boolean
```

From src/components/yzihub/CorretoresClient.tsx (já ligado ao Supabase):
- Usa `useTenant()` para obter `tenant.id`
- `supabase.from("brokers").select(...).eq("tenant_id", tenant.id)` no fetch
- `handleSave` faz `update` ou `insert` com `tenant_id` e `.eq("tenant_id", tenant.id)` no update
- `handleDelete` faz `delete` com `.eq("tenant_id", tenant.id)`
- Colunas selecionadas: `id, tenant_id, full_name, phone, email, role, is_active, created_at, updated_at`

From src/app/api/brokers/route.ts (DRIFT IDENTIFICADO):
- GET autentica via `supabase.auth.getUser()` + busca `profiles.tenant_id`
- Filtra `brokers` por `tenant_id`
- SELECT atual NÃO inclui `is_active` — precisa alinhar com shape da UI
</interfaces>

## Contexto do estado atual

Uma quick task anterior (`260416-dj5`, commit `a194a22`) já entregou:
- Migration `is_active` na tabela `brokers`
- KPI strip de 4 cards (`CorretoresKpiStrip`)
- Toggle ativo/inativo no `CorretorDrawer`
- Ranking top 5 por leads

O código atual em `CorretoresClient.tsx`, `CorretorDrawer.tsx` e `types/brokers.ts` **já está ligado ao Supabase** com `tenant_id` correto. Esta tarefa é primariamente:

1. Fechar o único drift residual: `GET /api/brokers` não retorna `is_active`.
2. Confirmar via validação humana que todas as 4 operações (listar / criar / editar / toggle) persistem no banco do tenant correto.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Alinhar GET /api/brokers ao shape Broker (incluir is_active)</name>
  <files>src/app/api/brokers/route.ts</files>
  <action>
Editar `src/app/api/brokers/route.ts`:

1. No `.select(...)` da query de brokers, adicionar `is_active` à lista de colunas. Substituir:
   ```
   .select("id, tenant_id, full_name, phone, email, role, created_at, updated_at")
   ```
   por:
   ```
   .select("id, tenant_id, full_name, phone, email, role, is_active, created_at, updated_at")
   ```

2. Adicionar filtro `.order("is_active", { ascending: false })` ANTES do `.order("created_at", ...)` para que corretores ativos apareçam primeiro quando a API for consumida (consumidor futuro). Usar a forma de múltiplos orders encadeando dois `.order(...)`.

3. NÃO alterar: autenticação, busca de perfil, filtro `.eq("tenant_id", profile.tenant_id)`, formato da resposta (`NextResponse.json(brokers ?? [], { status: 200 })`), nem estrutura de error handling.

4. Após editar, rodar `rtk tsc --noEmit` para garantir que não há erro de tipagem (o tipo `Broker` em `src/types/brokers.ts` já inclui `is_active`, então o shape retornado continua compatível).

Motivo: consumidores da API (ex: futura integração do `AssignBrokerModal` para puxar lista de corretores via endpoint em vez de prop) precisam saber se o corretor está ativo para filtrar/exibir corretamente. Sem este campo, drift silencioso entre UI e API.

Não mexer em nenhum outro arquivo. Não mexer em layout. Não mexer em `CorretoresClient.tsx`, `CorretorDrawer.tsx`, `CorretoresKpiStrip.tsx`, `types/brokers.ts` — todos já estão corretos.
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
  </verify>
  <done>
- `src/app/api/brokers/route.ts` inclui `is_active` no SELECT
- Dois `.order(...)` encadeados: `is_active desc` primeiro, `created_at desc` depois
- `rtk tsc --noEmit` passa sem erros novos
- Nenhum outro arquivo modificado
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Validar CRUD + toggle ativo/inativo ponta a ponta no Supabase</name>
  <what-built>
Módulo de Corretores conectado ao Supabase via `src/components/yzihub/CorretoresClient.tsx`:
- Listagem lê da tabela `brokers` filtrada por `tenant_id` do usuário logado
- Botão "Novo Corretor" abre drawer e persiste via `insert`
- Botão "Editar" abre drawer populado e persiste via `update`
- Toggle Ativo/Inativo no drawer persiste coluna `is_active`
- KPI strip reflete dados reais (Total, Ativos, Leads Atribuídos, Vendas)
- API `GET /api/brokers` retorna shape completo incluindo `is_active` (Task 1)
  </what-built>
  <how-to-verify>
Rodar `rtk pnpm dev` e abrir o Cockpit como tenant Jurema (ou qualquer tenant com `profiles.tenant_id` válido).

Caminho: `/cockpit/corretores`

**1. Listagem (BROK-01, BROK-04, BROK-06):**
   - [ ] Página exibe skeleton de loading por alguns ms (não quebra em branco)
   - [ ] Lista final mostra apenas corretores do tenant atual (não de outros tenants)
   - [ ] Abrir Supabase Studio > tabela `brokers` e conferir que os nomes exibidos batem com os do banco filtrados por `tenant_id`
   - [ ] Não existe corretor "fake" ou hardcoded na lista

**2. Criação (BROK-02):**
   - [ ] Clicar em "Novo Corretor" abre drawer vazio
   - [ ] Preencher `full_name`, `phone`, `email` e clicar "Criar Corretor"
   - [ ] Drawer fecha, corretor aparece no TOPO da lista (order by created_at desc)
   - [ ] Conferir no Supabase Studio: registro existe com `tenant_id` correto, `is_active=true`

**3. Edição (BROK-02):**
   - [ ] Clicar "Editar" num corretor abre drawer populado com os dados dele
   - [ ] Alterar `full_name` e salvar
   - [ ] Drawer fecha, nome atualizado na lista
   - [ ] Conferir no Supabase: `full_name` atualizado, `updated_at` recente

**4. Toggle ativo/inativo (BROK-03):**
   - [ ] Abrir drawer de um corretor ATIVO
   - [ ] Clicar no toggle para "Inativo", salvar
   - [ ] Lista: badge muda para "Inativo" (cinza)
   - [ ] Conferir no Supabase: coluna `is_active = false`
   - [ ] Recarregar a página (F5) — o status permanece Inativo (persistência real)
   - [ ] Repetir voltando para Ativo — mesmo comportamento

**5. Tipagem e erros (BROK-05, BROK-06):**
   - [ ] DevTools > Console não mostra erro de TypeScript runtime nem warning sobre `Broker`
   - [ ] Forçar erro (ex: desligar internet antes de salvar) — banner de erro vermelho aparece no topo da lista com texto em PT-BR ("Erro ao salvar corretor...")

**6. API drift fix (Task 1):**
   - [ ] Abrir `/api/brokers` direto no browser (logado) — JSON de resposta contém campo `is_active` em cada broker
   - [ ] Brokers ativos aparecem antes dos inativos na resposta

**7. Isolamento multi-tenant (CLAUDE.md > Constraints):**
   - [ ] Se possível, logar com outro tenant e verificar que a lista de corretores é diferente (não vaza entre tenants)
  </how-to-verify>
  <resume-signal>Digite "aprovado" se tudo funciona, ou descreva qualquer gap observado</resume-signal>
</task>

</tasks>

<verification>
- [ ] `rtk tsc --noEmit` passa
- [ ] `GET /api/brokers` retorna `is_active` em cada item
- [ ] Usuário validou todos os 7 blocos de verificação manual
- [ ] Nenhum resíduo de mock encontrado no grep final (`rtk grep -i "mock|fakeBroker|sampleBroker" src/`)
</verification>

<success_criteria>
- Todos os `must_haves.truths` observáveis pelo usuário
- Persistência real confirmada no Supabase Studio (criar, editar, toggle)
- Isolamento por `tenant_id` confirmado
- Zero mocks no caminho de produção
- API route alinhada ao shape da UI
</success_criteria>

<output>
Após completar, criar `.planning/quick/260416-lac-conectar-m-dulo-de-corretores-ao-supabas/260416-lac-SUMMARY.md` com:
- O que foi verificado (estado já ligado ao Supabase antes desta task)
- Único fix de código: `is_active` no GET /api/brokers + order by ativo
- Resultados da validação humana por bloco (1-7)
- Confirmação de que STATE.md Quick Tasks será atualizado com commit hash
</output>
