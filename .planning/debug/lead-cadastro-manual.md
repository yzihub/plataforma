---
status: awaiting_human_verify
trigger: "lead-cadastro-manual-nao-funciona — Cadastro manual de lead via LeadDrawer não persiste no banco. Falha silenciosa sem exibir erros reais."
created: 2026-04-19T00:00:00Z
updated: 2026-04-19T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED — Both bugs fixed, TypeScript passes clean.
test: user should open LeadDrawer → preencher dados → Criar Lead → verificar que aparece na lista
expecting: lead created and listed; errors real (ex: "Nao autenticado") shown if something fails
next_action: await human verification

## Symptoms

expected: Usuário preenche nome, telefone, corretor, bairro e referência do imóvel no drawer de novo lead → dados salvos no banco → lead aparece na lista
actual: Cadastro não funciona — falha silenciosa, nenhum dado persiste
errors: Desconhecido — falha silenciosa, sem erro exibido ao usuário
reproduction: Abrir LeadDrawer de criação manual, preencher campos, submeter
started: Não confirmado se alguma vez funcionou

## Eliminated

- hypothesis: bairro_interesse not included in POST insert
  evidence: POST /api/leads DOES include bairro_interesse in the insert (line 100 of route.ts)
  timestamp: 2026-04-19T00:01:00Z

- hypothesis: onLeadSaved wiring broken
  evidence: LeadsClient.handleLeadSaved correctly handles new lead (prepends to list). POST returns 201 + newLead directly.
  timestamp: 2026-04-19T00:01:00Z

## Evidence

- timestamp: 2026-04-19T00:01:00Z
  checked: LeadDrawer.tsx handleSave (line 479)
  found: When res.ok is false, shows generic "Erro ao salvar. Tente novamente." — never reads res.json() for actual error
  implication: Any API error (401, 500) is swallowed silently from user perspective

- timestamp: 2026-04-19T00:01:00Z
  checked: GET /api/leads SQL SELECT (line 31 of route.ts)
  found: SELECT did NOT include bairro_interesse, imovel_ref, interesse_principal, finalidade, faixa_valor, objetivo, janela_visita, regiao_interesse, status_agendamento, data_agendamento
  implication: After page refresh, all imobiliário fields were missing from leads

- timestamp: 2026-04-19T00:01:00Z
  checked: getCockpitData() and getCockpitDataByTenant() in queries.ts
  found: Same missing fields in SSR queries used by /cockpit/leads page
  implication: Initial page load was stripping all imobiliário data

- timestamp: 2026-04-19T00:02:00Z
  checked: tsc --noEmit
  found: Exit 0, no type errors after fixes
  implication: Changes are type-safe

## Resolution

root_cause: Two bugs:
  1. SILENT ERROR — handleSave in TabDados (LeadDrawer.tsx) did not read the API error body when !res.ok, showing only the generic message "Erro ao salvar. Tente novamente." — real errors like "Nao autenticado" (401) or DB failures were invisible to user.
  2. MISSING FIELDS in SELECT — /api/leads GET route, getCockpitData(), and getCockpitDataByTenant() all omitted all imobiliário fields (bairro_interesse, imovel_ref, interesse_principal, finalidade, faixa_valor, objetivo, janela_visita, regiao_interesse, status_agendamento, data_agendamento) from their SELECT clauses. Data was saved to DB but never returned after page load/refresh.

fix: 
  1. LeadDrawer.tsx handleSave: now reads res.json() on error and shows errBody.error if present.
  2. src/app/api/leads/route.ts GET SELECT: expanded to include all imobiliário fields.
  3. src/lib/crm/queries.ts getCockpitData() and getCockpitDataByTenant(): both expanded to include all imobiliário fields.

verification: TypeScript check passes clean (exit 0).
files_changed: [src/components/yzihub/LeadDrawer.tsx, src/app/api/leads/route.ts, src/lib/crm/queries.ts]
