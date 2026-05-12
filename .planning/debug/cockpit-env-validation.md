---
status: awaiting_human_verify
trigger: "Cockpit está em processo de estabilização local. Precisa-se validar se .env.local, Supabase client e variáveis obrigatórias estão corretas; o sistema deve falhar com erro visível (não silencioso) se faltar alguma configuração."
created: 2026-04-17T00:00:00Z
updated: 2026-04-17T00:01:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED — no runtime env var validation exists at app startup; TypeScript `!` assertions suppress errors silently; browser shows yellow banner only AFTER Supabase call fails (too late, unhelpful for config issues)
test: read all three supabase client files, proxy.ts, cockpit layout, .env.local
expecting: implement startup validation in src/lib/supabase/client.ts and src/lib/supabase/server.ts that throws at module load time
next_action: implement fix — create src/lib/env-validation.ts with explicit checks, import in both client.ts and server.ts

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: cockpit carrega normalmente com dados do Supabase; se variável faltando, erro claro/visível aparece no browser ou terminal
actual: a validação de variáveis de ambiente pode estar ausente ou silenciosa — cockpit pode falhar de forma opaca
errors: possivelmente nenhum erro visível (bug silencioso de configuração)
reproduction: 1) remover uma env var do .env.local; 2) acessar /cockpit; 3) verificar se erro é claro ou silencioso
started: investigação proativa antes de bugs aparecerem em produção

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: cockpit layout has no error display at all
  evidence: CockpitContent in layout.tsx DOES show a yellow banner when TenantContext.error is set — but only after the Supabase call fails at runtime
  timestamp: 2026-04-17

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-04-17
  checked: src/lib/supabase/client.ts
  found: uses `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `NEXT_PUBLIC_SUPABASE_ANON_KEY!` with TypeScript non-null assertion — no runtime check; if undefined, createBrowserClient receives `undefined` cast as string
  implication: missing env var causes cryptic Supabase SDK error at call time, not at import time

- timestamp: 2026-04-17
  checked: src/lib/supabase/server.ts
  found: same pattern — `!` assertions with no guard; silence until first supabase call
  implication: same as client.ts — opaque failure

- timestamp: 2026-04-17
  checked: src/lib/supabase/admin.ts
  found: same pattern — SUPABASE_SERVICE_ROLE_KEY also unvalidated
  implication: API routes using admin client can fail silently

- timestamp: 2026-04-17
  checked: src/proxy.ts (middleware)
  found: uses `!` assertions for both env vars; no explicit validation; if vars missing, createServerClient receives undefined and auth.getUser() fails silently, likely returning no user — which causes ALL routes to redirect to /signin
  implication: missing env var makes the app appear to be "not logged in" everywhere — completely opaque, no error shown

- timestamp: 2026-04-17
  checked: next.config.ts
  found: no `env` validation section, no serverRuntimeConfig, no publicRuntimeConfig, no custom error throw
  implication: Next.js itself does not enforce required env vars at build/boot time

- timestamp: 2026-04-17
  checked: src/app/cockpit/layout.tsx — CockpitContent component
  found: shows yellow banner "Falha ao conectar ao Supabase — {error}" when TenantContext error is set; shows "Configuração Pendente" screen when tenant is null
  implication: UI handles Supabase errors gracefully AFTER the fact, but the error message comes from Supabase SDK internals — not from a clear "missing env var" message

- timestamp: 2026-04-17
  checked: src/scripts/validate-auth-system.ts
  found: comprehensive external validation script (run manually with npx tsx) — checks all env vars, Supabase connectivity, profile/tenant join, route protection
  implication: validation exists as a one-shot dev tool only; NO runtime protection in the running app itself

- timestamp: 2026-04-17
  checked: .env.local vs .env.example
  found: .env.local has all required vars set correctly; .env.example has 5 required vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL, FACTORY_N8N_WEBHOOK_URL)
  implication: current local config is fine; but cloning the repo and running without .env.local gives zero feedback about what's wrong

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: All three Supabase clients (client.ts, server.ts, admin.ts) and the proxy.ts middleware consumed env vars with TypeScript `!` non-null assertions and zero runtime validation. When env vars are missing: (1) the middleware silently treats every user as unauthenticated and redirects all routes to /signin with no error shown; (2) if somehow reached, TenantContext shows a yellow banner with an opaque SDK-internal error rather than a clear "missing NEXT_PUBLIC_SUPABASE_URL" message.
fix: created src/lib/env-validation.ts with requireEnv() helper that throws "[YZI CONFIG] Missing required environment variable: {name}" at call time; replaced all `process.env.VAR!` assertions in client.ts, server.ts, admin.ts, and proxy.ts with requireEnv() calls. tsc --noEmit passes cleanly on all changed files.
verification: tsc --noEmit shows zero errors in changed files; pre-existing errors in CorretorDrawer/LeadsDataTable are unrelated to this fix
files_changed: [src/lib/env-validation.ts, src/lib/supabase/client.ts, src/lib/supabase/server.ts, src/lib/supabase/admin.ts, src/proxy.ts]
