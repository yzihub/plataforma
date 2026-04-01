# Phase 1: Access & Auth - Research

**Researched:** 2026-03-31
**Domain:** Supabase Auth + Next.js 16 middleware + multi-tenant profile provisioning
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Habilitar acesso para: `juremabrokers@gmail.com` (tenant: Jurema Brokers) e `contatocafecompam@gmail.com` (tenant: Café com Pam)
- Inserir registros na tabela `profiles` vinculando email → tenant_id correto para cada usuário
- O middleware é `proxy.ts` (Next.js 16) — não criar novo middleware, usar o existente
- O redirecionamento pós-login deve enviar o usuário para `/dashboard` (e de lá para `/cockpit`)
- O vínculo email→tenant_id é lido da tabela `profiles` pelo proxy
- Verificar se a tabela `tenants` já possui os slugs `jurema-brokers` e `cafe-com-pam` antes de inserir profiles
- Se os slugs não existirem, criar os registros de tenant primeiro, depois os profiles
- Cada usuário vê apenas os dados do seu próprio tenant_id
- RLS (Row Level Security) no Supabase deve estar ativo para as tabelas relevantes
- Qualquer email não cadastrado em `profiles` deve ser redirecionado para `/unauthorized`
- O proxy.ts é o ponto de aplicação desta regra — verificar se já implementa ou adicionar lógica
- Admin (Eric) mantém acesso irrestrito ao `/control` sem restrição de tenant

### Claude's Discretion
- Ordem de execução das verificações no proxy (JWT decode → profiles lookup → tenant_id assignment)
- Forma de persistir tenant_id na sessão (cookie, JWT claim, ou server-side session)
- Estratégia de seed SQL vs. UI admin para inserir profiles

### Deferred Ideas (OUT OF SCOPE)
- Cadastro de novos tenants via UI (FACT-* — Phase 5)
- Automação de provisionamento via n8n (Phase 5)
- Notificações de acesso (v2 requirements)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROV-01 | Admin pode inserir perfil de novo tenant na tabela `profiles` com tenant_id vinculado | SQL seed script pattern from migration 002_seed_admin.sql is the established approach |
| PROV-02 | juremabrokers@gmail.com tem acesso ao Cockpit com tenant_id correto (Jurema Brokers) | Requires: (1) Supabase Auth user created, (2) profile row inserted with correct tenant_id |
| PROV-03 | contatocafecompam@gmail.com tem acesso ao Cockpit com tenant_id correto (Café com Pam) | Same two-step as PROV-02 for Café com Pam |
| PROV-04 | Usuário sem e-mail em `profiles` é redirecionado para `/unauthorized` | proxy.ts must add profiles lookup after auth check; /unauthorized page already exists |
| AUTH-01 | proxy.ts lê tenant_id do perfil logado ao proteger rotas `/dashboard` e `/cockpit` | Critical gap: proxy.ts exists but is not wired as Next.js middleware — middleware.ts is missing |
| AUTH-02 | Usuário só enxerga dados do seu próprio tenant (isolamento por tenant_id) | RLS policies in 001_initial_schema.sql exist but rely on auth_tenant_id() which requires profiles row |
| AUTH-03 | Admin (Eric) tem acesso ao `/control` sem restrição de tenant | proxy.ts already implements this via user_metadata.role === 'global_admin' check |
| AUTH-04 | Sessão persiste entre refreshes de browser | @supabase/ssr cookie-based session is already implemented in proxy.ts and lib/supabase/server.ts |
</phase_requirements>

---

## Summary

This phase provisions two real tenant users and hardens the middleware routing layer. The codebase already has most of the pieces: Supabase Auth integration, `/unauthorized` page, RLS schema, and route guard logic in `proxy.ts`. However, three critical gaps prevent any of this from working today.

**Gap 1 (Blocking):** `src/proxy.ts` exists with correct logic but `src/middleware.ts` does NOT exist. Next.js 16 requires a file named `middleware.ts` (at project root or in `src/`) that exports a `middleware` function and a `config` matcher. The proxy function currently lives in `src/proxy.ts` and is never called. This means NO route protection is active right now.

**Gap 2 (Blocking):** `proxy.ts` does NOT check whether the authenticated user has a row in the `profiles` table. It only checks `supabase.auth.getUser()`. This means any registered Supabase Auth user (even without a profile) can access `/cockpit` — PROV-04 is not enforced.

**Gap 3 (Data):** The two tenant users (`juremabrokers@gmail.com` and `contatocafecompam@gmail.com`) do not exist in Supabase Auth or in the `profiles` table. Their tenant records exist in `tenants` table via migration 003, but with slugs `cafepam` and `jurema` (not `cafe-com-pam` and `jurema-brokers`). The UUIDs from migration 003 must be used when inserting profiles.

**Primary recommendation:** Wire `src/middleware.ts` to export from `src/proxy.ts`, add profiles-check logic to proxy.ts, then create the two Supabase Auth users and insert their profiles rows.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/ssr | ^0.9.0 | SSR-safe Supabase client for middleware | Required by Supabase for Next.js App Router cookie handling |
| @supabase/supabase-js | ^2.100.1 | Supabase client SDK | Project's source of truth for all backend ops |
| next | ^16.1.6 | Framework — middleware, server actions, routing | Project stack (locked) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| createAdminClient (src/lib/supabase/admin.ts) | internal | Service-role client bypassing RLS | For server-side provisioning scripts that need to write to auth.users or bypass RLS |
| createServerClient (from @supabase/ssr) | 0.9.x | Middleware-safe client with cookie support | Used inside proxy.ts — already wired correctly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQL seed scripts | Supabase Dashboard UI | SQL is reproducible and version-controlled; UI is manual and not auditable |
| Supabase Auth email/password | Google OAuth | OAuth is already wired in SignInForm but marked Out of Scope; email/password is sufficient for v1 |

---

## Architecture Patterns

### Recommended Project Structure (existing — do not change)
```
src/
├── middleware.ts          # MUST CREATE — re-exports proxy() and config from proxy.ts
├── proxy.ts               # EXISTS — route guard logic (add profiles check here)
├── lib/
│   ├── supabase/
│   │   ├── admin.ts       # Service-role client for server-only provisioning
│   │   ├── server.ts      # SSR client for server components/actions
│   │   └── client.ts      # Browser client
│   └── auth/
│       └── actions.ts     # Server actions: signIn, signOut, signUp
├── context/
│   └── TenantContext.tsx  # Client-side tenant state (reads profiles + tenants via RLS)
supabase/
└── migrations/
    ├── 001_initial_schema.sql  # Schema + RLS policies
    ├── 002_seed_admin.sql      # Admin user pattern (reference for tenant users)
    ├── 003_seed_clients.sql    # Tenant records exist here
    ├── 004_cafe_com_pam.sql    # Pipeline stages for Café com Pam
    ├── 005_jurema_brokers.sql  # Pipeline stages for Jurema Brokers
    └── 006_provision_tenants.sql  # NEW: Auth users + profiles for the two tenants
```

### Pattern 1: Next.js Middleware Wiring (MUST CREATE)
**What:** `src/middleware.ts` is the entry point Next.js calls on every request. It re-exports the proxy function and matcher config.
**When to use:** This pattern is required — Next.js ignores `proxy.ts` completely; only `middleware.ts` is auto-loaded.
**Example:**
```typescript
// src/middleware.ts
export { proxy as middleware, config } from './proxy'
```

### Pattern 2: Profiles-Gatekeeper Check in proxy.ts
**What:** After verifying `user` is authenticated, query `profiles` table. If no row found, redirect to `/unauthorized`.
**When to use:** This is the PROV-04 / AUTH-01 requirement. Add after the existing `supabase.auth.getUser()` call.
**Key constraint:** This query runs on EVERY request to protected routes. Must be a fast single-row lookup using the PK (`profiles.id = user.id`). The RLS policy `profiles_select` already allows users to read their own row.

```typescript
// Inside proxy() after const { data: { user } } = await supabase.auth.getUser()
// Only check profile for non-public, non-control routes where user is authenticated
if (user && !isPublicRoute && !isControlRoute) {
  const isGlobalAdmin = user.user_metadata?.role === 'global_admin'
  if (!isGlobalAdmin) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }
}
```

### Pattern 3: Tenant User Provisioning via SQL (migration 006)
**What:** Create Supabase Auth user + profiles row using SQL executed in Supabase Dashboard SQL Editor (service role required for auth.users writes).
**When to use:** PROV-01, PROV-02, PROV-03 — one-time provisioning of the two tenant users.
**Reference:** migration `002_seed_admin.sql` shows the exact pattern. Replicate it.

```sql
-- Step 1: Create auth user (requires service_role execution context)
INSERT INTO auth.users (id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'juremabrokers@gmail.com',
  crypt('<PASSWORD>', gen_salt('bf')),
  NOW(),
  '{"full_name": "Jurema Brokers"}'::jsonb,  -- NO global_admin role
  'authenticated', 'authenticated', NOW(), NOW()
) RETURNING id;  -- capture UUID for step 2

-- Step 2: Insert profile row linking to tenant
INSERT INTO profiles (id, tenant_id, full_name, role)
VALUES (
  '<UUID from step 1>',
  'aaaaaaaa-0002-0002-0002-000000000002',  -- Jurema Brokers tenant_id from migration 003
  'Jurema Brokers',
  'owner'
);
```

### Pattern 4: Tenant Slug Reality Check
**What:** Migration 003 created tenants with slugs `cafepam` and `jurema` — NOT `cafe-com-pam` / `jurema-brokers`.
**Impact:** The CONTEXT.md check for slugs `jurema-brokers` and `cafe-com-pam` will find nothing. Use the existing tenant UUIDs from migration 003 directly.
**Tenant UUIDs (from 003_seed_clients.sql):**
- Café com Pam: `aaaaaaaa-0001-0001-0001-000000000001`
- Jurema Brokers: `aaaaaaaa-0002-0002-0002-000000000002`

### Anti-Patterns to Avoid
- **Creating a new middleware.ts with copy-pasted proxy logic:** The locked decision says "use the existing proxy.ts" — just re-export it from middleware.ts.
- **Adding Supabase profile query on public routes:** Profile lookup should only run for authenticated users on protected routes — checking on /signin creates unnecessary DB calls.
- **Using signUp() action to create tenant users:** `signUp` is for self-registration and does not set `tenant_id`. Use direct SQL seed with service_role.
- **Calling `supabase.auth.admin.createUser()` from a Next.js API route:** Requires service_role key — admin.ts client already exists for this, but the simpler approach is SQL seed via Dashboard.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie-based SSR session | Custom cookie JWT parsing | `createServerClient` from `@supabase/ssr` | Already handles token refresh, cookie rotation, PKCE — already in proxy.ts |
| Tenant data isolation | Manual WHERE tenant_id = X in every query | Supabase RLS with `auth_tenant_id()` function | Already defined in 001_initial_schema.sql; enforced at DB layer even if app code forgets |
| Profile existence check | Separate API route for gatekeeper | Direct Supabase query in proxy.ts | Middleware has direct DB access via SSR client; no extra round-trip needed |
| Session persistence | localStorage tokens, manual refresh | @supabase/ssr cookie handling | Already implemented; sessions survive refresh by design |

**Key insight:** The entire auth infrastructure already exists. This phase is 80% wiring and 20% data provisioning.

---

## Runtime State Inventory

> Phase involves provisioning records into live Supabase database — runtime state matters.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Supabase `tenants` table: Café com Pam (`aaaaaaaa-0001-*`) and Jurema Brokers (`aaaaaaaa-0002-*`) exist via migration 003 with slugs `cafepam` and `jurema`. Profiles for the two target emails do NOT exist. | Insert two auth.users rows + two profiles rows via SQL seed (migration 006) |
| Stored data | Supabase `profiles` table: Only Eric (admin) has a profile row (from migration 002 if applied). | Insert profiles for both tenant users |
| Live service config | Supabase Auth: `juremabrokers@gmail.com` and `contatocafecompam@gmail.com` do NOT exist as Auth users. | Create via SQL INSERT into auth.users (service_role) or Supabase Dashboard → Authentication → Users |
| OS-registered state | None — no OS-level registration of tenant emails. | None |
| Secrets/env vars | `SUPABASE_SERVICE_ROLE_KEY` required to write to auth.users directly. Must be set in environment. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` already in use. | Verify .env.local has SERVICE_ROLE_KEY before running seed |
| Build artifacts | No stale build artifacts relevant to this phase. | None |

**Critical ordering constraint:** Auth user must be created BEFORE the profiles INSERT, because `profiles.id` is a FK to `auth.users.id` with CASCADE DELETE. Inserting profile without auth user will fail with FK violation.

---

## Common Pitfalls

### Pitfall 1: proxy.ts Is Not Active Without middleware.ts
**What goes wrong:** The app appears to work (routes render) but there is ZERO route protection. Anyone can access `/cockpit`, `/control` without login.
**Why it happens:** Next.js only auto-loads a file named `middleware.ts` (or `middleware.js`) at the root or `src/` directory. The name `proxy.ts` is not recognized.
**How to avoid:** Create `src/middleware.ts` with `export { proxy as middleware, config } from './proxy'` — one line, no logic duplication.
**Warning signs:** `/cockpit` is accessible without being logged in.

### Pitfall 2: Profile Insert Fails (FK Violation)
**What goes wrong:** `INSERT INTO profiles` fails with "violates foreign key constraint profiles_id_fkey".
**Why it happens:** `profiles.id` references `auth.users.id`. If the auth user doesn't exist yet, the FK fails.
**How to avoid:** Always create the auth.users row first, capture the UUID, then insert profiles using that same UUID.
**Warning signs:** SQL seed script throws FK error on profiles insert.

### Pitfall 3: RLS Blocks the profiles Lookup in proxy.ts
**What goes wrong:** The profiles query in proxy.ts returns null even for valid users, causing all authenticated users to be redirected to `/unauthorized`.
**Why it happens:** The anon key is used in middleware. The RLS policy `profiles_select` allows `is_global_admin() OR tenant_id = auth_tenant_id()`. Since the user is authenticated, `auth.uid()` is set and the policy allows `id = auth.uid()` reads — this should work. However, if `createServerClient` in proxy.ts is not properly passing the session cookies, `auth.uid()` inside RLS will be NULL and the query will return nothing.
**How to avoid:** The existing `createServerClient` in proxy.ts correctly wires cookies via `getAll`/`setAll`. The query should use `.eq('id', user.id)` with `.maybeSingle()` (not `.single()` to avoid throwing on no-row).
**Warning signs:** All authenticated users redirect to /unauthorized. Check by logging `user.id` and querying profiles directly.

### Pitfall 4: Tenant Slug Mismatch
**What goes wrong:** Plan tries to find tenants by slug `cafe-com-pam` or `jurema-brokers` and finds nothing, then unnecessarily creates duplicate tenant records.
**Why it happens:** CONTEXT.md says to verify slugs, but the actual slugs in the DB (from migration 003) are `cafepam` and `jurema`.
**How to avoid:** Use the hardcoded UUIDs from migration 003 directly when inserting profiles. No slug lookup needed.
**Warning signs:** Duplicate tenant records with similar names but different UUIDs.

### Pitfall 5: maybeSingle() vs single() in Profile Check
**What goes wrong:** Using `.single()` throws a PostgREST error if 0 rows returned, which gets caught as an error (not as "no profile") and may break the proxy.
**Why it happens:** `.single()` expects exactly 1 row; 0 rows = error. `.maybeSingle()` returns null on 0 rows without error.
**How to avoid:** Use `.maybeSingle()` for the profiles gatekeeper check. Check `if (!profile)` to redirect.
**Warning signs:** 406 or "PGRST116" errors in server logs when unenrolled users try to access protected routes.

---

## Code Examples

### Wire middleware.ts (one-liner)
```typescript
// src/middleware.ts — ENTIRE FILE
// Source: Next.js docs on middleware + existing proxy.ts pattern
export { proxy as middleware, config } from './proxy'
```

### Profiles Gatekeeper in proxy.ts (addition)
```typescript
// Source: Supabase @supabase/ssr docs + existing proxy.ts structure
// Add this block AFTER the existing auth checks, BEFORE return supabaseResponse

if (user && !isPublicRoute) {
  const isGlobalAdmin = user.user_metadata?.role === 'global_admin'
  if (!isGlobalAdmin) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }
}
```

### SQL Seed for Tenant Users (migration 006 pattern)
```sql
-- Source: supabase/migrations/002_seed_admin.sql pattern
-- Run in Supabase SQL Editor (service_role context)

-- Café com Pam user
WITH new_user AS (
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'contatocafecompam@gmail.com',
    crypt('<SENHA_CAFE>', gen_salt('bf')),
    NOW(),
    '{"full_name": "Café com Pam"}'::jsonb,
    'authenticated', 'authenticated', NOW(), NOW()
  )
  ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
  RETURNING id
)
INSERT INTO profiles (id, tenant_id, full_name, role)
SELECT id, 'aaaaaaaa-0001-0001-0001-000000000001', 'Café com Pam', 'owner'
FROM new_user
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Jurema Brokers user (same pattern, different email + tenant_id)
WITH new_user AS (
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'juremabrokers@gmail.com',
    crypt('<SENHA_JUREMA>', gen_salt('bf')),
    NOW(),
    '{"full_name": "Jurema Brokers"}'::jsonb,
    'authenticated', 'authenticated', NOW(), NOW()
  )
  ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
  RETURNING id
)
INSERT INTO profiles (id, tenant_id, full_name, role)
SELECT id, 'aaaaaaaa-0002-0002-0002-000000000002', 'Jurema Brokers', 'owner'
FROM new_user
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` at root with all logic | Named export re-export pattern (`proxy.ts` + `middleware.ts`) | Standard Next.js App Router pattern | Separates route-guard logic from Next.js wiring; proxy.ts is testable in isolation |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Supabase deprecated auth-helpers in 2024 | `createServerClient` from `@supabase/ssr` is the current standard; already in use |
| `supabase.auth.session()` | `supabase.auth.getUser()` | Supabase v2 | `getUser()` makes a network call to verify token server-side; more secure than reading local session |

**Deprecated/outdated:**
- `auth.session()`: Removed in Supabase v2. `getUser()` is the correct pattern and already in use.
- `@supabase/auth-helpers-nextjs`: Deprecated. Project already uses `@supabase/ssr` correctly.

---

## Open Questions

1. **Passwords for tenant users**
   - What we know: The SQL seed pattern requires a password (uses `crypt()`)
   - What's unclear: What initial passwords should be set for `juremabrokers@gmail.com` and `contatocafecompam@gmail.com`? Or should they use Supabase "magic link" / Google OAuth flow instead?
   - Recommendation: For v1, set a known initial password and communicate to client, OR invite via Supabase Dashboard (Authentication → Users → Invite) which sends an email link — this is cleaner and avoids hardcoding passwords in SQL.

2. **Post-login redirect destination**
   - What we know: CONTEXT.md says redirect to `/dashboard`, but `next.config.ts` redirects `/` to `/cockpit` and `actions.ts` redirects directly to `/cockpit`. There is no `/dashboard` route.
   - What's unclear: Should the plan create a `/dashboard` route that redirects to `/cockpit`, or update `actions.ts` to redirect to `/cockpit` directly?
   - Recommendation: The `/dashboard` mention in CONTEXT.md appears to be a legacy reference. `/cockpit` is the canonical destination. Confirm with user, then update `actions.ts` to redirect to `/cockpit` (already the case — no change needed).

3. **Google OAuth for tenant users**
   - What we know: SignInForm already has Google OAuth button. The two tenant emails are Gmail addresses.
   - What's unclear: If tenants log in via Google OAuth, their `auth.users.id` will be different from what we insert in the SQL seed. The profiles row must be inserted AFTER their first OAuth login (using their real OAuth UUID).
   - Recommendation: Use Supabase "Invite user" flow instead of SQL seed for Gmail accounts — this avoids the OAuth UUID collision problem. Alternatively, require email/password login only for these tenants.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (remote) | All auth/data operations | Must verify | — | Cannot run without it |
| SUPABASE_SERVICE_ROLE_KEY | auth.users seed SQL | Must verify in .env.local | — | Use Supabase Dashboard UI invite instead |
| NEXT_PUBLIC_SUPABASE_URL | Supabase client | Must verify in .env.local | — | No fallback — blocking |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase client | Must verify in .env.local | — | No fallback — blocking |
| Node.js / npm | Dev server | Available (project exists) | Inferred from package.json | — |

**Missing dependencies with no fallback:**
- Supabase env vars must be present in `.env.local` before any code changes can be tested locally.

**Missing dependencies with fallback:**
- SUPABASE_SERVICE_ROLE_KEY: Can use Supabase Dashboard "Invite user" feature as an alternative to SQL seed for creating auth users.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or test directories found |
| Config file | None — Wave 0 gap |
| Quick run command | Manual browser test (see below) |
| Full suite command | Manual browser test (see below) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROV-01 | Admin can insert profile row | manual | Query: `SELECT * FROM profiles WHERE id = '<user_id>'` in Supabase dashboard | N/A |
| PROV-02 | juremabrokers@gmail.com logs into /cockpit | smoke (manual browser) | Log in, verify /cockpit loads with Jurema Brokers data | N/A |
| PROV-03 | contatocafecompam@gmail.com logs into /cockpit | smoke (manual browser) | Log in, verify /cockpit loads with Café com Pam data | N/A |
| PROV-04 | Unknown email → /unauthorized | smoke (manual browser) | Log in with unregistered email, verify redirect to /unauthorized | N/A |
| AUTH-01 | proxy.ts enforces profiles check | smoke (manual browser) | Attempt /cockpit without profile → expect /unauthorized | N/A |
| AUTH-02 | Tenant isolation — each user sees only own data | smoke (manual browser) | Log in as each tenant, verify TenantContext.tenant.id differs | N/A |
| AUTH-03 | Admin accesses /control without restriction | smoke (manual browser) | Log in as Eric (global_admin), navigate to /control | N/A |
| AUTH-04 | Session persists after browser refresh | smoke (manual browser) | Log in, refresh page, verify still on /cockpit without redirect to /signin | N/A |

### Sampling Rate
- **Per task commit:** Manual browser smoke test for the specific change
- **Per wave merge:** All 5 success criteria from ROADMAP.md verified manually
- **Phase gate:** Full success criteria checklist before `/gsd:verify-work`

### Wave 0 Gaps
- No automated test framework detected. This phase is fully testable via manual browser smoke tests — no test infrastructure needed for Phase 1.
- *(If automated tests are desired in future, consider: Playwright for e2e auth flows)*

---

## Project Constraints (from CLAUDE.md)

These directives are authoritative and override any research recommendations:

| Directive | Impact on Planning |
|-----------|-------------------|
| Stack: Next.js 15 + Supabase + Tailwind v4 — no change without explicit decision | No new libraries for auth; use existing @supabase/ssr |
| Components ONLY in `src/components/yzihub/` | Any UI additions (e.g., loading states in proxy redirect) go here |
| Gatekeeper: `/dashboard` requires email in `profiles` — fail = redirect `/unauthorized` | PROV-04 is a hard constraint, not optional |
| Action Flow: buttons → POST /api/actions/execute → job_queue → n8n (never direct) | Out of scope for Phase 1 but must not be violated in any auth-related UI code |
| Use context7 for Next.js, Supabase, Tailwind docs | Planner should reference context7 for any API questions |
| Subagents use haiku; Sonnet for architecture only | Execution tasks are lightweight — haiku model appropriate |

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `src/proxy.ts` — confirmed middleware logic, confirmed no middleware.ts exists
- Direct codebase read: `supabase/migrations/001_initial_schema.sql` — confirmed RLS policies, `auth_tenant_id()` function, `profiles` schema
- Direct codebase read: `supabase/migrations/003_seed_clients.sql` — confirmed tenant UUIDs and actual slugs (`cafepam`, `jurema`)
- Direct codebase read: `supabase/migrations/002_seed_admin.sql` — confirmed SQL seed pattern for auth.users + profiles
- Direct codebase read: `src/lib/auth/actions.ts` — confirmed signIn already redirects to /cockpit for non-admin
- Direct codebase read: `src/context/TenantContext.tsx` — confirmed client-side tenant fetch pattern
- Direct codebase read: `package.json` — confirmed @supabase/ssr ^0.9.0, next ^16.1.6

### Secondary (MEDIUM confidence)
- CLAUDE.md project instructions — stack constraints, component location rules
- .planning/CONTEXT.md, REQUIREMENTS.md, STATE.md — phase scope and requirements

### Tertiary (LOW confidence)
- None — all findings are directly from codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions read directly from package.json
- Architecture patterns: HIGH — proxy.ts, middleware gap, seed pattern all verified from source files
- Pitfalls: HIGH — all pitfalls derived from actual code inspection, not hypothetical
- Data provisioning: HIGH — tenant UUIDs and profile schema read directly from migration files

**Research date:** 2026-03-31
**Valid until:** 2026-06-30 (stable stack — Supabase/Next.js patterns unlikely to change significantly)
