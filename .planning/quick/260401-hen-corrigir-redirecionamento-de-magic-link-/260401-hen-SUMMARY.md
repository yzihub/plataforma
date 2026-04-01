---
phase: quick
plan: 260401-hen
subsystem: auth
tags: [auth, magic-link, redirect, profiles, supabase]
dependency_graph:
  requires: []
  provides: [profile-aware-auth-callback]
  affects: [auth-flow, cockpit-access, unauthorized-redirect]
tech_stack:
  added: []
  patterns: [supabase-maybeSingle, profile-check-at-callback]
key_files:
  created: []
  modified:
    - src/app/auth/callback/route.ts
decisions:
  - Profile check happens at callback, not at Gatekeeper, to avoid double redirect
metrics:
  duration: "~5 minutes"
  completed: "2026-04-01T15:35:47Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 1
---

# Quick Task 260401-hen: Fix Magic Link Redirect Flow Summary

**One-liner:** Auth callback now checks `profiles` table to route users to `/cockpit` or `/unauthorized` instead of blindly redirecting to `/cockpit` and relying on proxy.ts Gatekeeper.

## What Was Done

Added a `profiles` table query in `src/app/auth/callback/route.ts` after successful code exchange. Non-admin users now get redirected based on profile existence, eliminating the double-redirect pattern that was flowing through `proxy.ts`.

## Redirect Logic (After Fix)

| User Type | Redirect Target |
|-----------|----------------|
| `global_admin` role | `/control` |
| Has record in `profiles` | `/cockpit` |
| No record in `profiles` | `/unauthorized` |
| Auth error / no code | `/signin?error=auth` |

## Tasks

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Add profile check to auth callback route | Complete | 41c440f |
| 2 | Human verify magic link flow | Approved | - |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- File `src/app/auth/callback/route.ts` exists and was modified
- Commit `41c440f` exists in git log
- No TypeScript errors in callback route (confirmed via `tsc --noEmit | grep callback` returning no output)
- `.maybeSingle()` used (not `.single()`) — won't throw on missing profile
- Redirect targets match Gatekeeper logic in `proxy.ts`
