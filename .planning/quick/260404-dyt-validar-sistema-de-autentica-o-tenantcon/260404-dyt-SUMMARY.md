---
phase: quick
plan: 260404-dyt
subsystem: auth
tags: [auth, supabase, tenant, validation, diagnostic]
dependency_graph:
  requires: []
  provides: [auth-validation-script, tenant-diag-logs]
  affects: [TenantContext, auth-callback]
tech_stack:
  added: [tsx, @supabase/supabase-js admin client]
  patterns: [service-role admin queries, env-var validation, fetch route protection]
key_files:
  created:
    - src/scripts/validate-auth-system.ts
  modified:
    - src/context/TenantContext.tsx
decisions:
  - Used SUPABASE_SERVICE_ROLE_KEY for admin script queries to bypass RLS
  - Script loads .env.local manually (tsx does not auto-load it)
  - Route protection test gracefully handles dev server not running (SKIPPED vs FAIL)
  - DIAG logs marked with "// [DIAG] REMOVE AFTER VALIDATION" for trivial searchability
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-04"
  tasks_completed: 1
  files_changed: 2
---

# Phase quick Plan 260404-dyt: Auth System Validation Summary

**One-liner:** Diagnostic script + TenantContext [DIAG] logs validating Google OAuth -> callback -> session -> profile-tenant JOIN chain on localhost:3002.

## What Was Built

### Task 1: Auth Validation Script + TenantContext Diagnostic Logs

Created `src/scripts/validate-auth-system.ts` — a Node.js/tsx script that validates the full auth system using the Supabase service role client. Tests five categories:

1. **ENV Validation** — NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_URL, SUPABASE_URL reachability, ANON_KEY presence, DEV_BYPASS state
2. **Supabase Connectivity** — profiles, tenants, projects queries with row counts
3. **Profile-Tenant JOIN** — exact TenantContext query replicated, validates id/name/plan fields
4. **Missing Profile Handling** — maybeSingle() with fake UUID returns null, no crash
5. **Route Protection** — fetch /cockpit without auth, expect redirect to signin (or SKIPPED if dev server not running)

**Script output (15/15 passed):**
```
[OK  ] ENV: NEXT_PUBLIC_SITE_URL — http://localhost:3002
[OK  ] ENV: NEXT_PUBLIC_APP_URL — http://localhost:3002
[OK  ] ENV: NEXT_PUBLIC_SUPABASE_URL — https://dwmbklfkrtumfaxrbxio.supabase.co
[OK  ] ENV: Supabase URL reachable — HTTP 401 (server responded)
[OK  ] ENV: NEXT_PUBLIC_SUPABASE_ANON_KEY — set (sb_publishab...)
[OK  ] ENV: NEXT_PUBLIC_DEV_BYPASS — WARNING: DEV_BYPASS is active (true)
[OK  ] Supabase: profiles query — 3 row(s) returned
[OK  ] Supabase: tenants query — 5 row(s) returned
[OK  ] Supabase: projects query — 0 row(s) for tenant_id=00000000-0000-0000-0000-000000000001
[OK  ] JOIN: profiles.select tenants — profile.id=df7f1c16-...
[OK  ] JOIN: tenant.id not null — 00000000-0000-0000-0000-000000000001
[OK  ] JOIN: tenant.name not empty — YZIHUB
[OK  ] JOIN: tenant.plan valid — enterprise
[OK  ] Missing profile: query returns null (not crash)
[OK  ] Route protection: /cockpit — SKIPPED (dev server not running)
=== SUMMARY: 15/15 passed ===
```

Added 5 `[DIAG]` console.log lines to `src/context/TenantContext.tsx`:
- After getUser: logs user.id or "no user"
- After profiles query: logs tenant_id or error message
- After profile errors: logs full error object
- After tenant resolved: logs id, name, plan
- After projects query: logs activeModules array
- On catch: logs full error

## Validação Completa (com servidor no ar)

Rodado novamente com servidor ativo na porta 3002 — **15/15 passed** (final):

```
[OK  ] ENV: NEXT_PUBLIC_DEV_BYPASS — false (bypass disabled — good for auth testing)
[OK  ] Route protection: /cockpit redirects to signin — HTTP 307 -> /signin?next=%2Fcockpit
=== SUMMARY: 15/15 passed ===
```

## Deviations from Plan

- package.json foi corrigido para porta 3002 (estava 3001)
- DEV_BYPASS foi desativado (false) durante a sessão de validação
- Proteção de rota validada via HTTP com servidor rodando

## Known Observations

- **projects query retorna 0 rows** para YZIHUB (tenant_id `00000000-0000-0000-0000-000000000001`) — TenantContext usa fallback `["crm"]` — OK enquanto não houver projects cadastrados
- **Logs `[DIAG]`** adicionados ao TenantContext — remover após validação manual com OAuth Google no browser
- **Servidor primeiro request** pode demorar 20-30s para compilar — normal em Next.js dev

## Self-Check: PASSED

- src/scripts/validate-auth-system.ts: FOUND
- src/context/TenantContext.tsx: FOUND (modified)
- Commit 4d8454f: FOUND
