---
status: resolved
trigger: "Cockpit não abre / telas Leads, Corretores e Imóveis travam em loading infinito quando Supabase falha ou retorna erro. Dados reais do Supabase não aparecem no frontend."
created: 2026-04-17T00:00:00Z
updated: 2026-04-17T12:00:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: RESOLVED — All four bugs confirmed fixed and build verified clean.
  - TenantContext: setLoading(false) in !user path: FIXED
  - ImoveisClient: hardcoded tenant_id replaced with tenant!.id: FIXED
  - ImoveisClient: silent error path now logs + sets fetchError state: FIXED
  - queries.ts: stagesRes/leadsRes errors now logged with console.error: FIXED

next_action: COMPLETE — archived

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Cockpit abre normalmente; telas de Leads, Corretores e Imóveis exibem dados reais do Supabase; erro do Supabase mostra estado amigável em vez de loading infinito
actual: Loading infinito quando Supabase falha ou timeout; dados não aparecem; erros silenciosos no console; cockpit potencialmente derrubado por falha em uma tela
errors: Provavelmente erros silenciosos — sem mensagem visível ao usuário; suspeita de fetch sem tratamento de erro adequado, sem timeout, sem fallback de estado
reproduction: Abrir /cockpit, /cockpit/leads, /cockpit/crm — verificar se carrega dados reais ou trava
started: Problema existente nas sessões de debug anteriores

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-04-17T00:10:00Z
  checked: TenantContext.tsx lines 72-91
  found: When !user && !isDevBypass, code runs setTenant(null) + setIsGlobalAdmin(false) but NEVER calls setLoading(false). The finally block does call setLoading(false) but only if code reaches it — and the early returns before the try block exit without going through finally.
  implication: TenantContext.loading stays true forever when there is no user and no DEV_BYPASS. ImoveisClient depends on tenantLoading — it shows the skeleton spinner forever.

- timestamp: 2026-04-17T00:10:00Z
  checked: TenantContext.tsx lines 165-170
  found: The try/finally structure IS there, but the early-return path at line 90 (setTenant(null); setIsGlobalAdmin(false); return;) exits the function BEFORE the finally, so setLoading(false) in finally at line 170 never runs for the !user unauthenticated case.
  implication: Root cause of the infinite loading spinner for unauthenticated or session-expired users.

- timestamp: 2026-04-17T00:10:00Z
  checked: ImoveisClient.tsx lines 162-194
  found: fetchProperties() has no error handling at all. If supabase call fails with error, the error branch at line 185 simply skips setProperties — but setLoading(false) IS called either way (line 188). So ImoveisClient itself does terminate loading. However: if tenantLoading never resolves (see above), useEffect never fires (guard at line 163: if (tenantLoading) return) → loading spinner shown forever.
  implication: ImoveisClient infinite spinner is caused by TenantContext.loading stuck at true. Secondary issue: hardcoded tenant_id "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361" at line 179 ignores tenant.id — data won't show for other tenants.

- timestamp: 2026-04-17T00:10:00Z
  checked: ImoveisClient.tsx lines 183-189
  found: No console.error when supabase returns an error — error is silently discarded (only the if (!error && data) path sets state).
  implication: Silent error — user sees empty list with no message, developer sees nothing in console.

- timestamp: 2026-04-17T00:10:00Z
  checked: queries.ts getCockpitData() lines 27-55
  found: stagesRes.error and leadsRes.error are never checked — code happily returns partial data (stagesRes.data ?? []) even if the query errored. Only tenantRes.error is checked.
  implication: If leads query fails, returns empty leads silently. No error surfaced to the page.

- timestamp: 2026-04-17T00:10:00Z
  checked: leads/page.tsx lines 18-46
  found: fetchLeadsAndStages() has a try/catch that returns empty arrays on any error. This is correct — page is safe. But the underlying getCockpitData() silently swallows stage/lead query errors before the catch even fires.
  implication: Leads page is resilient (returns empty, not crash) but silent on errors.

- timestamp: 2026-04-17T00:10:00Z
  checked: cockpit/page.tsx entire file
  found: Page is 100% mock data — no Supabase calls at all. Cannot cause loading issues.
  implication: /cockpit/page.tsx is NOT part of the problem.

- timestamp: 2026-04-17T00:10:00Z
  checked: crm/page.tsx entire file
  found: Page is "use client" with hardcoded cafePamData mock. No Supabase calls. Cannot cause loading issues.
  implication: /cockpit/crm/page.tsx is NOT part of the problem (yet — it uses mock data not real Supabase data).

- timestamp: 2026-04-17T00:10:00Z
  checked: api/brokers/route.ts
  found: Properly handles auth errors, profile errors, query errors with console.error and JSON error responses. No infinite loading risk here.
  implication: /api/brokers is safe.

- timestamp: 2026-04-17T00:10:00Z
  checked: LeadsClient.tsx brokers fetch useEffect
  found: If fetch fails (!res.ok), just returns without setting corretores. No crash, no infinite loading. Error is logged. Acceptable.
  implication: Brokers fetch in LeadsClient is resilient.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: |
  Three bugs combined to produce the symptoms:
  1. TenantContext.tsx — The `!user && !isDevBypass` early-return path called `setTenant(null)` and `return` WITHOUT calling `setLoading(false)`. The `finally` block never ran for this path, so `loading` stayed `true` forever. ImoveisClient depends on `tenantLoading` and never fires its useEffect, causing infinite skeleton.
  2. ImoveisClient.tsx — Hardcoded `tenant_id = "82cc7aa9..."` in the imoveis query ignored the real authenticated tenant's id. Silently discarded query errors with no console output and no user-visible error state.
  3. queries.ts — `stagesRes.error` and `leadsRes.error` from the parallel Promise.all were never checked or logged — errors swallowed silently, empty arrays returned without any trace in logs.

fix: |
  1. TenantContext.tsx: Added `setLoading(false)` before the `return` in the `!user && !isDevBypass` branch (line 90).
  2. ImoveisClient.tsx: Changed `.eq("tenant_id", "82cc7aa9-...")` to `.eq("tenant_id", tenant!.id)`. Added `fetchError` state with `setFetchError(error.message)` on query failure. Added `console.error` for the error path. Added error UI block below the loading skeleton check.
  3. queries.ts: Added `console.error` checks for `stagesRes.error` and `leadsRes.error` in both `getCockpitData()` and `getCockpitDataByTenant()`.

verification: |
  - Human confirmed: 3 previously patched bugs resolved in production flow.
  - Full integration validation pass: leads query uses real tenant_id, corretores query uses real tenant_id, no hardcoded UUIDs remain.
  - CorretoresClient: uses tenant!.id in both brokers + leads queries — no hardcode.
  - getCockpitData / getCockpitDataByTenant: errors logged for both stages and leads queries.
  - TenantContext: all early-return paths inside try block — finally always fires setLoading(false).
  - CockpitLayout: shows spinner only while loading; shows error state if tenant not found; renders children when confirmed.
  - `rtk tsc --noEmit`: 0 new errors (3 pre-existing in unrelated files).
  - `rtk next build`: Errors: 0 | Warnings: 0.

files_changed:
  - src/context/TenantContext.tsx
  - src/components/yzihub/ImoveisClient.tsx
  - src/lib/crm/queries.ts
