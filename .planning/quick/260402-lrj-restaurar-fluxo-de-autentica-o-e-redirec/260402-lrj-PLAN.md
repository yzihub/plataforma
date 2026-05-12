---
phase: quick
plan: 260402-lrj
type: execute
wave: 1
depends_on: []
files_modified:
  - .env.example
  - src/components/auth/SignInForm.tsx
  - src/context/TenantContext.tsx
  - src/app/cockpit/layout.tsx
autonomous: true
must_haves:
  truths:
    - "Google OAuth redirects to http://localhost:3001/auth/callback in dev"
    - "Sign-in page shows TailAdmin split layout (form left, illustration right)"
    - "Cockpit shows friendly tenant setup screen when profile has no tenant_id, not a 500 error"
    - "No hardcoded production URLs block local auth flow"
  artifacts:
    - path: "src/components/auth/SignInForm.tsx"
      provides: "Google OAuth sign-in with correct redirect URL"
    - path: "src/context/TenantContext.tsx"
      provides: "Graceful error state when tenant_id missing"
    - path: "src/app/cockpit/layout.tsx"
      provides: "Tenant setup fallback UI instead of crash"
  key_links:
    - from: "src/components/auth/SignInForm.tsx"
      to: "/auth/callback"
      via: "supabase.auth.signInWithOAuth redirectTo"
      pattern: "window\\.location\\.origin.*auth/callback"
    - from: "src/app/cockpit/layout.tsx"
      to: "TenantContext"
      via: "TenantProvider wrapping children"
      pattern: "TenantProvider"
---

<objective>
Restaurar o fluxo completo de autenticacao e redirecionamento para ambiente local (localhost:3001).

Purpose: O login via Google OAuth precisa funcionar localmente sem travar em URLs de producao. Alem disso, o layout do signin deve voltar ao padrao TailAdmin e o cockpit deve tratar graciosamente a ausencia de tenant_id.

Output: Auth flow funcional em localhost:3001 com fallback amigavel no cockpit.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.env.local
@.env.example
@src/components/auth/SignInForm.tsx
@src/app/(full-width-pages)/(auth)/signin/page.tsx
@src/app/(full-width-pages)/(auth)/layout.tsx
@src/app/auth/callback/route.ts
@src/app/cockpit/layout.tsx
@src/context/TenantContext.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix env defaults and cleanup production URL references</name>
  <files>.env.example</files>
  <action>
    1. In `.env.example`, update the default NEXT_PUBLIC_APP_URL from `http://localhost:3000` to `http://localhost:3001` to match the actual dev port.
    2. Verify `.env.local` already has `NEXT_PUBLIC_APP_URL=http://localhost:3001` (it does, confirmed).
    3. Search the entire `src/` directory for any hardcoded production URLs (vercel.app domains, yzihub.com references in auth/redirect logic). The only yzihub.com reference found is FACTORY_N8N_WEBHOOK_URL which is correct and unrelated to auth. Confirm no other production URLs exist in auth-related files.
    4. In `src/components/auth/SignInForm.tsx`, the `getRedirectUrl()` function already uses `window.location.origin` which correctly resolves to localhost:3001 in dev. No changes needed to the redirect logic itself.

    NOTE: The Supabase Dashboard must also have `http://localhost:3001/auth/callback` in the Redirect URLs whitelist under Authentication > URL Configuration. This is a manual step the user must verify in the Supabase Dashboard.
  </action>
  <verify>
    <automated>grep -n "NEXT_PUBLIC_APP_URL" D:/dev/plataforma/.env.example | grep "3001"</automated>
  </verify>
  <done>.env.example shows port 3001 as default. No hardcoded production URLs in auth flow.</done>
</task>

<task type="auto">
  <name>Task 2: Add graceful tenant-missing fallback in cockpit layout</name>
  <files>src/context/TenantContext.tsx, src/app/cockpit/layout.tsx</files>
  <action>
    The current TenantProvider in TenantContext.tsx sets `error` when profile is not found (line 88-89), but the cockpit layout.tsx does NOT check `loading` or `error` state — it just renders children, which can crash with a 500 if components expect tenant data.

    1. In `src/app/cockpit/layout.tsx`, import `useTenantContext` from `@/context/TenantContext` (note: layout is already "use client").

    2. Inside `CockpitLayout`, after the existing sidebar state hooks, destructure `{ loading, error, tenant }` from `useTenantContext()`. BUT — the TenantProvider wraps children in this same layout, so we need a nested approach. Create a new inner component `CockpitContent` that:
       - Calls `useTenantContext()` to get `{ loading, error, tenant }`
       - If `loading` is true: render a centered spinner/loading state with text "Carregando seu cockpit..." using TailAdmin dark styles (gray-900 bg, white text, animate-spin).
       - If `error` is truthy OR `tenant` is null (after loading completes): render a friendly "Configuracao de Tenant" card instead of crashing. The card should:
         - Be centered on screen with max-w-lg
         - Show a title "Configuracao Pendente"
         - Show message "Sua conta ainda nao esta vinculada a um tenant. Entre em contato com o administrador para completar a configuracao."
         - Show a "Voltar ao Login" link/button pointing to `/signin`
         - Use TailAdmin dark styling: rounded-2xl, border border-gray-800, bg-white/[0.03], text colors matching existing cockpit cards
       - If tenant loaded successfully: render `{children}` normally.

    3. Update the JSX in CockpitLayout to wrap `{children}` with `<CockpitContent>{children}</CockpitContent>` inside the TenantProvider.

    Keep the existing sidebar, header, and layout structure intact. Only the inner content area should show the fallback.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Cockpit layout compiles without errors. When tenant is missing, a friendly "Configuracao Pendente" card is shown instead of a 500 error. Normal tenant flow renders children as before.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    1. Fixed env defaults to use port 3001
    2. Added graceful tenant-missing fallback in cockpit layout
    3. Verified no production URLs blocking local auth
  </what-built>
  <how-to-verify>
    1. Run `npm run dev` (should start on port 3001)
    2. Visit http://localhost:3001/signin — confirm split TailAdmin layout (form left, illustration/logo right)
    3. Click "Entrar com Google" — confirm it redirects to Google OAuth, then back to localhost:3001/auth/callback
    4. After login, if your profile has a tenant_id: confirm cockpit loads normally
    5. To test the fallback: temporarily remove your tenant_id from the profiles table in Supabase, refresh /cockpit — should show "Configuracao Pendente" card, not a 500 error
    6. IMPORTANT: Verify in Supabase Dashboard > Authentication > URL Configuration that `http://localhost:3001/auth/callback` is in the Redirect URLs list
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `npm run dev` starts without errors on port 3001
- TypeScript compilation passes: `npx tsc --noEmit`
- Sign-in page renders with TailAdmin split layout
- OAuth redirect URL uses localhost:3001
- Cockpit handles missing tenant gracefully (no 500)
</verification>

<success_criteria>
- Google OAuth login works end-to-end on localhost:3001
- Sign-in page shows original TailAdmin layout (form left, illustration right)
- Cockpit shows friendly "Configuracao Pendente" screen when tenant_id is missing
- No hardcoded production URLs interfere with local development
</success_criteria>

<output>
After completion, create `.planning/quick/260402-lrj-restaurar-fluxo-de-autentica-o-e-redirec/260402-lrj-SUMMARY.md`
</output>
