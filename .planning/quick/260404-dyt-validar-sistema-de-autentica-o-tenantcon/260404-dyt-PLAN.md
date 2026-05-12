---
phase: quick
plan: 260404-dyt
type: execute
wave: 1
depends_on: []
files_modified:
  - src/scripts/validate-auth-system.ts
  - src/context/TenantContext.tsx
autonomous: false
requirements: [VALIDATE-AUTH, VALIDATE-TENANT, VALIDATE-SUPABASE, VALIDATE-ROUTES]
must_haves:
  truths:
    - "Auth callback exchanges code for session correctly"
    - "TenantContext loads profile + tenant JOIN without errors"
    - "Supabase queries for profiles, tenants, projects return valid data"
    - "Protected routes redirect unauthenticated users to signin"
    - "User without profile gets controlled error, not crash"
    - "ENV vars NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_APP_URL point to localhost:3002"
  artifacts:
    - path: "src/scripts/validate-auth-system.ts"
      provides: "Server-side validation script for auth + tenant + supabase"
  key_links:
    - from: "SignInForm.tsx"
      to: "/auth/callback"
      via: "Google OAuth redirectTo"
      pattern: "signInWithOAuth.*redirectTo.*callback"
    - from: "/auth/callback/route.ts"
      to: "profiles table"
      via: "exchangeCodeForSession then profiles query"
      pattern: "exchangeCodeForSession.*profiles.*select"
    - from: "TenantContext.tsx"
      to: "profiles + tenants + projects"
      via: "Supabase JOIN queries"
      pattern: "profiles.*select.*tenants.*projects"
---

<objective>
Validate end-to-end the authentication system, TenantContext, and Supabase connectivity in the local environment (port 3002).

Purpose: Ensure the full auth chain works without DEV_BYPASS: Google OAuth -> callback -> session -> TenantContext -> profile/tenant/projects data. Produce a diagnostic report with OK/FAIL per test.

Output: Diagnostic script + temporary console logs in TenantContext + structured test report.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/context/TenantContext.tsx
@src/app/auth/callback/route.ts
@src/lib/supabase/client.ts
@src/lib/supabase/server.ts
@src/components/auth/SignInForm.tsx

Key facts discovered during planning:
- Auth uses Google OAuth (signInWithOAuth), NOT magic links
- Callback at /auth/callback/route.ts does exchangeCodeForSession then checks profiles
- TenantContext does: getUser -> profiles.select(id, tenant_id, tenants(id, name, plan, settings)) -> projects.select(type).eq(tenant_id)
- DEV_BYPASS is currently true in .env.local (NEXT_PUBLIC_DEV_BYPASS=true)
- ENV vars confirmed: NEXT_PUBLIC_SITE_URL=http://localhost:3002, NEXT_PUBLIC_APP_URL=http://localhost:3002
- No middleware.ts exists -- route protection is per-page (getUser in server components) + TenantContext client-side
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create server-side auth validation script and add TenantContext diagnostic logs</name>
  <files>src/scripts/validate-auth-system.ts, src/context/TenantContext.tsx</files>
  <action>
Create `src/scripts/validate-auth-system.ts` -- a Node.js script that validates the auth system using Supabase admin client. The script must:

1. ENV VALIDATION:
   - Check NEXT_PUBLIC_SITE_URL === "http://localhost:3002"
   - Check NEXT_PUBLIC_APP_URL === "http://localhost:3002"
   - Check NEXT_PUBLIC_SUPABASE_URL is set and reachable (fetch health endpoint)
   - Check NEXT_PUBLIC_SUPABASE_ANON_KEY is set
   - Check NEXT_PUBLIC_DEV_BYPASS value (report current state, warn if "true")
   - Print OK/FAIL for each

2. SUPABASE CONNECTIVITY:
   - Use @supabase/supabase-js createClient with SUPABASE_SERVICE_ROLE_KEY (from .env.local) for admin queries
   - Query `profiles` table: SELECT id, tenant_id LIMIT 5 -- validate returns rows
   - Query `tenants` table: SELECT id, name, plan LIMIT 5 -- validate FK relationship
   - Query `projects` table: filter by first tenant_id found, validate returns rows
   - Print OK/FAIL for each with row counts

3. PROFILE-TENANT JOIN VALIDATION:
   - Execute the exact same query TenantContext uses: profiles.select("id, tenant_id, tenants(id, name, plan, settings)") for first profile found
   - Validate: tenant.id is NOT null, tenant.name is NOT empty, tenant.plan is one of "starter"|"growth"|"enterprise"
   - Print OK/FAIL

4. USER WITHOUT PROFILE TEST:
   - Query auth.users to find any user NOT in profiles (if exists)
   - OR simulate by querying profiles with a fake UUID
   - Validate the query returns null/empty (not an error/crash)
   - Print OK/FAIL

5. ROUTE PROTECTION TEST:
   - Use fetch() to hit http://localhost:3002/cockpit without auth cookies
   - Validate response is a redirect (302/307) to /signin or returns the signin page
   - Print OK/FAIL

6. Output structured report at the end:
   ```
   === AUTH SYSTEM VALIDATION REPORT ===
   [OK/FAIL] ENV: NEXT_PUBLIC_SITE_URL
   [OK/FAIL] ENV: NEXT_PUBLIC_APP_URL
   ...
   [OK/FAIL] Supabase: connectivity
   [OK/FAIL] Supabase: profiles query
   ...
   === SUMMARY: X/Y passed ===
   ```

Run with: `npx tsx src/scripts/validate-auth-system.ts`

ALSO add temporary diagnostic console.log lines to TenantContext.tsx (clearly marked with "// [DIAG]" comments for easy removal):
- After getUser: log user.id (or "no user")
- After profiles query: log profile.tenant_id (or error)
- After tenants resolution: log tenant.id, tenant.name, tenant.plan
- After projects query: log activeModules array
- On error: log full error object

These logs will be visible in browser console when testing manually. Mark every line with `// [DIAG] REMOVE AFTER VALIDATION` so they are trivially searchable and removable.

IMPORTANT:
- Do NOT alter any UI rendering
- Do NOT use mocks or hardcoded data
- The script reads real .env.local values and queries real Supabase
- Use SUPABASE_SERVICE_ROLE_KEY for admin queries (bypasses RLS)
  </action>
  <verify>
    <automated>npx tsx src/scripts/validate-auth-system.ts 2>&1 | head -50</automated>
  </verify>
  <done>
    - Script runs without crashes and prints structured OK/FAIL report
    - TenantContext has clearly marked [DIAG] logs
    - No UI changes, no mocks, no hardcoded data
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Auth system validation script + TenantContext diagnostic logs. The script tests ENV vars, Supabase connectivity, profile-tenant joins, missing profile handling, and route protection.
  </what-built>
  <how-to-verify>
    1. Review the script output -- check each OK/FAIL line in the report
    2. Set NEXT_PUBLIC_DEV_BYPASS=false in .env.local temporarily
    3. Start the dev server: `npm run dev` (port 3002)
    4. Open http://localhost:3002/cockpit in an incognito window -- should redirect to /signin
    5. Sign in with Google -- should redirect to /cockpit after callback
    6. Open browser console -- look for [DIAG] logs showing user.id, tenant.id, tenant.name, tenant.plan, activeModules
    7. Verify TenantContext loaded without errors (no "Configuracao Pendente" screen)
    8. Report any FAIL items or unexpected behavior
  </how-to-verify>
  <resume-signal>Type "approved" with the validation report results, or describe any failures found</resume-signal>
</task>

</tasks>

<verification>
- `npx tsx src/scripts/validate-auth-system.ts` prints structured report with no crashes
- TenantContext [DIAG] logs visible in browser console after real Google OAuth login
- No DEV_BYPASS dependency in the validation flow
</verification>

<success_criteria>
- All ENV vars validated as correct for localhost:3002
- Supabase connectivity confirmed (profiles, tenants, projects queries succeed)
- Profile-tenant JOIN returns valid data (id not null, name not empty, plan valid)
- Missing profile scenario handled gracefully (no crash)
- Route protection works (unauthenticated access redirects to signin)
- Diagnostic report generated with clear OK/FAIL per test
</success_criteria>

<output>
After completion, create `.planning/quick/260404-dyt-validar-sistema-de-autentica-o-tenantcon/260404-dyt-SUMMARY.md`
</output>
