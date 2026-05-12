---
status: awaiting_human_verify
trigger: "leads-not-showing-frontend — n8n salva leads no Supabase mas a tela de Leads no frontend não exibe os registros"
created: 2026-04-16T00:00:00Z
updated: 2026-04-16T00:00:00Z
---

## Current Focus

hypothesis: LeadsPage.fetchLeadsAndStages() cai no fallback de mock quando getCockpitData() retorna null porque o servidor-side Supabase client não tem sessão (user não autenticado server-side) — mesmo com DEV_BYPASS ativo no client-side
test: lido todo o fluxo: page.tsx → getCockpitData() → fallback mock
expecting: fix é trocar fallback mock por query admin-client ou garantir autenticação server-side correta
next_action: aplicar patch mínimo em LeadsPage para usar getCockpitDataByTenant com tenant do contexto, ou remover o fallback silencioso

## Symptoms

expected: Lista de leads exibe todos os registros já persistidos no Supabase
actual: Tela de Leads aparece vazia ou não mostra registros reais
errors: Nenhum erro relatado — apenas lista vazia
reproduction: Acessar a tela de Leads no cockpit
timeline: Leads existem no banco (inseridos pelo n8n), nunca apareceram no frontend

## Eliminated

- hypothesis: Filtro de tenant_id errado na query
  evidence: getCockpitData() busca tenant_id do profile do usuário autenticado — correto quando há sessão
  timestamp: 2026-04-16

- hypothesis: Problema de mapper/campo incompatível entre Supabase e Lead type
  evidence: campos na query de getCockpitData() batem com o tipo Lead em types.ts
  timestamp: 2026-04-16

- hypothesis: Filtro de status excluindo registros
  evidence: não há filtro de status na query de getCockpitData() — busca todos os leads do tenant
  timestamp: 2026-04-16

## Evidence

- timestamp: 2026-04-16
  checked: src/app/cockpit/leads/page.tsx
  found: fetchLeadsAndStages() retorna cafePamData.leads + juremaLeads quando getCockpitData() retorna null OU quando lança exceção — catch silencioso na linha 36
  implication: qualquer falha de auth server-side faz a página mostrar mock data sem nenhum erro visível

- timestamp: 2026-04-16
  checked: src/lib/crm/queries.ts getCockpitData()
  found: supabase.auth.getUser() linha 12 retorna null user → função retorna null imediatamente
  implication: se a sessão não existe server-side (cookie não enviado, middleware não configurado, DEV_BYPASS só funciona client-side via TenantContext), a query real nunca é executada

- timestamp: 2026-04-16
  checked: src/context/TenantContext.tsx
  found: DEV_BYPASS configura tenant fake apenas no TenantContext (client-side) — não afeta server components
  implication: em dev com DEV_BYPASS=true, o TenantContext tem tenant "Jurema Brokers" mas o server component LeadsPage não tem sessão

- timestamp: 2026-04-16
  checked: src/app/api/leads/route.ts GET
  found: API route também usa auth — mas LeadsPage não chama esta API, chama getCockpitData() diretamente server-side
  implication: o endpoint /api/leads não é usado pela tela de Leads; o fluxo é server component → getCockpitData()

## Resolution

root_cause: src/app/cockpit/leads/page.tsx lines 23-28 e 35-40: quando getCockpitData() retorna null (usuário não autenticado server-side) ou lança exceção, a página cai silenciosamente no fallback de mock data (cafePamData.leads + juremaLeads). Os leads reais inseridos pelo n8n nunca são exibidos porque a sessão server-side não está ativa ou não está sendo lida corretamente pelo createClient() do Supabase.

fix: Em ambiente autenticado (produção/staging), o createClient() server-side precisa ler os cookies da sessão. O fallback deve retornar array vazio (não mock data) para que o problema seja visível. Adicionalmente, o DEV_BYPASS deve ser suportado também na página server, passando o tenant_id hardcoded para getCockpitDataByTenant().

verification: tsc clean na página modificada; 3 erros TypeScript pre-existentes em outros arquivos não relacionados
files_changed:
  - src/app/cockpit/leads/page.tsx
