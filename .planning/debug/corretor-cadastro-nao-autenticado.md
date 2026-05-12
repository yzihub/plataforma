---
status: awaiting_human_verify
trigger: "Cadastro de corretor falha com 'Não autenticado' — o create nunca chega ao Supabase."
created: 2026-04-19T00:00:00Z
updated: 2026-04-19T00:00:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED — DEV_BYPASS=true faz TenantContext usar tenant fake sem sessão Supabase real. A rota /api/corretores/create chama getUser() e recebe null porque não há cookie de auth → 401.
test: Aplicar DEV_BYPASS check na API route igual ao TenantContext. Usar tenant_id hardcoded quando bypass ativo.
expecting: Com bypass, a rota aceita o request sem sessão e usa profile.tenant_id do bypass.
next_action: Aplicar fix em src/app/api/corretores/create/route.ts

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Clicar "Salvar" no form de novo corretor deve inserir registro em public.corretores com tenant_id correto e fechar o modal com sucesso.
actual: Aparece erro "Não autenticado" (ou similar). O insert não acontece. Não há crash de layout, apenas falha silenciosa ou mensagem de erro.
errors: "Não autenticado" — erro exato desconhecido, pode ser HTTP 401 ou mensagem customizada na rota API.
reproduction: 1. Login no cockpit como tenant Jurema Brokers. 2. Navegar para a seção de Corretores. 3. Clicar em "Novo Corretor". 4. Preencher form e clicar Salvar. 5. Erro aparece.
started: Provavelmente sempre falhou — nunca foi testado end-to-end com autenticação real.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-04-19T00:10:00Z
  checked: src/context/TenantContext.tsx
  found: Quando NEXT_PUBLIC_DEV_BYPASS=true, o TenantContext bypassa completamente o Supabase e seta tenant hardcoded {id: "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361", name: "Jurema Brokers (DEV)"}. Não há sessão Supabase real, não há cookies de auth.
  implication: Qualquer API route que chame supabase.auth.getUser() retornará null em DEV_BYPASS → 401.

- timestamp: 2026-04-19T00:10:00Z
  checked: src/app/api/corretores/create/route.ts linha 20-23
  found: A rota chama getUser() sem qualquer lógica de DEV_BYPASS. Se user==null retorna {error: "Nao autenticado"} com 401. A string de erro bate exatamente com o sintoma reportado.
  implication: Root cause confirmado — a rota não trata o modo DEV_BYPASS.

- timestamp: 2026-04-19T00:10:00Z
  checked: src/proxy.ts linhas 48-53
  found: O middleware tem DEV_BYPASS check e retorna supabaseResponse sem guards de auth. Isso confirma que o request chega à rota API, mas sem cookies de sessão válidos.
  implication: Middleware deixa passar, mas API route ainda exige sessão. Gap de consistência entre middleware e API routes no modo dev.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: DEV_BYPASS=true em .env.local faz TenantContext usar tenant fake sem sessão Supabase real (sem cookies de auth). A rota /api/corretores/create chamava supabase.auth.getUser() incondicionalmente e recebia null → 401 "Nao autenticado". O middleware (proxy.ts) já tinha lógica DEV_BYPASS, mas a API route não.
fix: Adicionado DEV_BYPASS check no início de POST /api/corretores/create. Quando ativo, pula getUser()/profiles e usa o mesmo tenant_id hardcoded do TenantContext (82cc7aa9-fc6e-4f37-8d8e-8a71c1691361). Em produção (NODE_ENV=production), o bypass nunca é ativado — fluxo normal de auth permanece inalterado.
verification: tsc --noEmit passou sem erros. Padrão idêntico ao proxy.ts e TenantContext.tsx.
files_changed:
  - src/app/api/corretores/create/route.ts
