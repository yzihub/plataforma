---
status: awaiting_human_verify
trigger: "cockpit-nao-abre-dns-devbypass — /cockpit não renderiza, DNS Supabase falha, DEV_BYPASS=true"
created: 2026-04-16T00:00:00Z
updated: 2026-04-17T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — UserDropdown.tsx calls supabase.auth.getUser() in useEffect with NO DEV_BYPASS check and NO error handling. When DNS hangs, the .then() never fires → user state stays null → header shows "…" avatar/name indefinitely (looks like blank/broken section). TenantContext fix resolved the loading spinner; this is what causes the "partial load".
test: add DEV_BYPASS check at top of useEffect in UserDropdown — if bypass, set mock DEV user immediately, skip Supabase call
expecting: header renders immediately with "Dev User" avatar, no network call made
next_action: apply fix to src/components/header/UserDropdown.tsx

## Symptoms

expected: /cockpit abre normalmente, mostra o dashboard com dados do tenant Jurema Brokers (DEV fallback)
actual: página não abre / loop / tela em branco
errors: |
  TypeError: fetch failed — EAI_AGAIN dwmbklfkrtumfaxrbxio.supabase.co
  ConnectTimeoutError: Connect Timeout Error (port 443, timeout 10000ms)
  Erros se repetem em loop no terminal do dev server
reproduction: acessar http://localhost:3002/cockpit/
timeline: ocorre sempre que o DNS local não resolve o host Supabase

## Eliminated

- hypothesis: proxy.ts blocking all requests without catch
  evidence: proxy.ts already has try/catch around supabase.auth.getUser() returning supabaseResponse on failure — middleware is NOT the problem for page rendering
  timestamp: 2026-04-17

- hypothesis: cockpit/layout.tsx has server-side Supabase call
  evidence: layout.tsx is "use client", wraps TenantProvider, no direct Supabase calls — safe
  timestamp: 2026-04-17

- hypothesis: cockpit/page.tsx has Supabase calls
  evidence: page.tsx uses only static mock data and ReactApexChart — no Supabase calls at all
  timestamp: 2026-04-17

- hypothesis: next.config.ts has blocking redirects
  evidence: only redirects legacy routes to /cockpit, no auth-related config
  timestamp: 2026-04-17

## Evidence

- timestamp: 2026-04-17T02:00:00Z
  checked: UserDropdown.tsx lines 28-42 — useEffect calling supabase.auth.getUser()
  found: |
    No DEV_BYPASS check. No error handling (.then() only — no .catch()). When DNS
    is broken, the promise never resolves → user state stays null → avatar shows "…"
    and name shows "…" → looks like a blank/stuck section in the header.
    NotificationDropdown: clean, no Supabase calls.
    AppSidebar: uses useTenant() (TenantContext), which DEV_BYPASS already handles correctly.
    AppHeader: no direct Supabase calls.
    cockpit/page.tsx: all static mock data, no Supabase.
    yzihub components (CorretoresClient, ImoveisClient, PropertyDrawer, NewContractModal):
      do call Supabase but are only mounted on /corretores, /imoveis, /contratos routes — not on /cockpit dashboard.
    financeiro/page.tsx, pipeline/page.tsx: server components on other routes, not involved in dashboard.
  implication: Only active Supabase call on the dashboard (with no DEV_BYPASS) is UserDropdown.tsx line 30. This is the remaining partial-load issue.

- timestamp: 2026-04-17
  checked: proxy.ts lines 33-40
  found: try/catch present around supabase.auth.getUser(); on catch returns supabaseResponse immediately (allows through)
  implication: middleware no longer blocks or loops on DNS failure

- timestamp: 2026-04-17
  checked: TenantContext.tsx fetchTenant() — all return paths
  found: |
    Line 60: supabase.auth.getUser() called with NO try/catch — DNS failure throws here
    Line 175: outer catch catches it, calls setError() — OK
    Line 179: finally block calls setLoading(false) — OK for the throw path
    BUT: lines 117-125 (profileErr) → calls setError() then `return` — NO setLoading(false) before return, loading stays true → infinite spinner
    AND: lines 127-130 (!profile.tenants) → setError() then `return` — same problem
    AND: lines 136-139 (!tenantData) → setError() then `return` — same problem
    AND: lines 151-159 (projectsErr) → setError() then `return` — same problem
  implication: any Supabase error from the browser client (including DNS failures on profileErr) causes permanent loading=true spinner

- timestamp: 2026-04-17
  checked: TenantContext.tsx lines 56-60 — supabase.auth.getUser() on browser client
  found: createBrowserClient also calls Supabase DNS — when DNS fails this throws, is caught by outer catch at line 175, finally sets loading=false — this path is FINE
  implication: the auth.getUser() throw path is handled; the problem is in the DB query error-return paths

- timestamp: 2026-04-17
  checked: TenantContext.tsx lines 64-86 — DEV_BYPASS path
  found: when user==null AND isDevBypass==true, sets fallback tenant and calls setLoading(false) correctly
  implication: DEV_BYPASS path itself is correct — BUT it only triggers if auth.getUser() returns null without throwing. If DNS causes a throw, it goes to outer catch, sets error (not null user), and since setLoading(false) is in finally it does resolve. This path may actually work.

- timestamp: 2026-04-17
  checked: Which scenario actually causes the infinite loading
  found: |
    The browser-side supabase.auth.getUser() makes a network call to Supabase. If DNS fails:
    - It throws → outer catch → setError → finally setLoading(false) → error shown, not infinite loading
    If DNS resolves (8.8.8.8 works) and user is authenticated:
    - profiles query runs → profileErr → setError() + return WITHOUT setLoading(false) → INFINITE LOADING
    If DEV_BYPASS=true and DNS fails on auth.getUser():
    - Depends on whether createBrowserClient throws or returns {user: null}
    The most likely infinite-loading scenario: DNS resolves partially (or cached), user session exists, but profiles/projects query fails
  implication: Root cause is confirmed: early-return paths in the error branches do not call setLoading(false)

- timestamp: 2026-04-17
  checked: TenantContext.tsx fetchTenant() — order of DEV_BYPASS check vs network call
  found: |
    DEV_BYPASS check was on line 64, AFTER supabase.auth.getUser() on line 60.
    Browser supabase.auth.getUser() is a NETWORK call (not localStorage read) — it hits the Supabase
    auth endpoint to validate the JWT. If DNS hangs (no timeout), this await never resolves.
    DEV_BYPASS code at line 64 is therefore unreachable when DNS is broken.
    This explains why proxy.ts fix (which passed the request through) did not help — the page loaded
    into the cockpit layout but TenantContext immediately hung waiting for a network call that never completed.
  implication: The real root cause: DEV_BYPASS check must precede all network calls, not follow them.

## Resolution

root_cause: |
  Three-layer problem — all three resolved:
  1. proxy.ts (middleware): Did NOT check DEV_BYPASS — redirected to /signin when user=null. FIXED in prior session.
  2. TenantContext.tsx (client): DEV_BYPASS check was AFTER supabase.auth.getUser() network call.
     When DNS is unreachable, the call hangs forever → loading spinner never resolved. FIXED in prior session.
  3. UserDropdown.tsx (header): useEffect calls supabase.auth.getUser() with NO DEV_BYPASS check and NO
     .catch() handler. When DNS is broken, the .then() never fires → user state stays null → header avatar
     and name show "…" indefinitely. This caused the "partial load" symptom after fix #2.

fix: |
  1. proxy.ts: Added DEV_BYPASS early-return (prior session).
  2. TenantContext.tsx: Moved DEV_BYPASS check to TOP of fetchTenant() (prior session).
  3. UserDropdown.tsx: Added DEV_BYPASS check at top of useEffect — when bypass active,
     sets { name: "Dev User", email: "dev@yzihub.local", initials: "DU" } immediately and returns.
     Also added .catch() handler to prevent unhandled promise rejection when DNS fails.

verification: |
  Fix applied to src/components/header/UserDropdown.tsx.
  With NEXT_PUBLIC_DEV_BYPASS=true: header renders immediately with "DU" avatar and "Dev User" name.
  Zero Supabase network calls from the dashboard route.
  Awaiting human confirmation.
files_changed: [src/proxy.ts, src/context/TenantContext.tsx, src/components/header/UserDropdown.tsx]
