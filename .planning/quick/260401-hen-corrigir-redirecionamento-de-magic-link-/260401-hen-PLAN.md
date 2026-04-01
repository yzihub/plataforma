---
phase: quick
plan: 260401-hen
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/auth/callback/route.ts
autonomous: true
must_haves:
  truths:
    - "Magic link click from localhost:3001 email lands on /auth/callback and exchanges code for session"
    - "User WITH profile in profiles table is redirected to /cockpit after callback"
    - "User WITHOUT profile is redirected to /unauthorized after callback"
    - "Global admin user is redirected to /control after callback"
  artifacts:
    - path: "src/app/auth/callback/route.ts"
      provides: "Auth callback with profile-aware redirect"
      contains: "profiles"
  key_links:
    - from: "src/app/auth/callback/route.ts"
      to: "profiles table"
      via: "supabase.from('profiles').select()"
      pattern: "profiles.*select"
---

<objective>
Fix Magic Link redirect flow so the auth callback route checks the `profiles` table before deciding where to send the user.

Purpose: Currently `/auth/callback/route.ts` blindly sends non-admin users to `/cockpit`, which then triggers the proxy.ts Gatekeeper to redirect profileless users to `/unauthorized` — causing a confusing double redirect. The callback should handle this directly.

Output: Updated `auth/callback/route.ts` with profile check.
</objective>

<execution_context>
@.planning/quick/260401-hen-corrigir-redirecionamento-de-magic-link-/260401-hen-PLAN.md
</execution_context>

<context>
@CLAUDE.md
@src/app/auth/callback/route.ts
@src/proxy.ts (reference for Gatekeeper pattern)

<interfaces>
<!-- Current auth callback — the file being fixed -->
From src/app/auth/callback/route.ts:
```typescript
// Current: redirects ALL non-admin to /cockpit (BUG — no profile check)
export async function GET(req: NextRequest) {
  // ... exchanges code for session ...
  return NextResponse.redirect(`${origin}${isGlobalAdmin ? "/control" : "/cockpit"}`);
}
```

From src/proxy.ts (Gatekeeper pattern to replicate):
```typescript
// This is the pattern to follow for profile check:
const { data: profile } = await supabase
  .from('profiles')
  .select('id, tenant_id')
  .eq('id', user.id)
  .maybeSingle()

if (!profile) {
  return NextResponse.redirect(new URL('/unauthorized', request.url))
}
```

From src/lib/supabase/auth.ts:
```typescript
// emailRedirectTo is already correct:
const emailRedirectTo =
  `${process.env.NEXT_PUBLIC_APP_URL || ...}/auth/callback`
```

From src/proxy.ts:
```typescript
// /auth/callback is already a public route:
const PUBLIC_ROUTES = ['/signin', '/signup', '/reset-password', '/auth/callback', '/unauthorized', '/error-404']
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add profile check to auth callback route</name>
  <files>src/app/auth/callback/route.ts</files>
  <action>
Modify src/app/auth/callback/route.ts to add a profile check after successful code exchange:

1. After `exchangeCodeForSession` succeeds and user is obtained:
   - If `user.user_metadata?.role === 'global_admin'` → redirect to `/control` (unchanged)
   - Otherwise, query `profiles` table: `supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()`
   - If profile exists → redirect to `/cockpit`
   - If NO profile → redirect to `/unauthorized`

2. Keep the existing error fallback: redirect to `/signin?error=auth`

Use the same Supabase server client already imported (`createClient` from `@/lib/supabase/server`).

Do NOT change any other files. The `.env.local`, `auth.ts`, `SignInForm.tsx`, and `proxy.ts` are all correct as-is:
- NEXT_PUBLIC_APP_URL = http://localhost:3001 (correct)
- emailRedirectTo points to /auth/callback (correct)
- /auth/callback is in PUBLIC_ROUTES (correct)
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit src/app/auth/callback/route.ts 2>&1 | head -20</automated>
  </verify>
  <done>
- auth/callback/route.ts compiles without errors
- Global admin users redirect to /control
- Users with profile redirect to /cockpit
- Users without profile redirect to /unauthorized
- Auth errors redirect to /signin?error=auth
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Auth callback route with profile-aware redirect logic</what-built>
  <how-to-verify>
    1. Run `npm run dev` (or your dev command) on localhost:3001
    2. Go to /signin, enter an email that EXISTS in profiles table, send magic link
    3. Click magic link in email → should land on /cockpit
    4. Go to /signin, enter an email that does NOT exist in profiles → send magic link
    5. Click magic link → should land on /unauthorized
    6. Verify no double redirects in browser Network tab
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- TypeScript compiles: `npx tsc --noEmit src/app/auth/callback/route.ts`
- Profile check query uses `.maybeSingle()` (not `.single()`) to avoid throwing on missing profile
- Redirect targets match Gatekeeper logic in proxy.ts
</verification>

<success_criteria>
- Magic link flow completes without double redirects
- Users with profile land on /cockpit
- Users without profile land on /unauthorized
- Global admins land on /control
</success_criteria>

<output>
After completion, create `.planning/quick/260401-hen-corrigir-redirecionamento-de-magic-link-/260401-hen-SUMMARY.md`
</output>
