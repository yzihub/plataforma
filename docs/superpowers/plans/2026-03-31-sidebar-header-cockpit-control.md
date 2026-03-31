# Sidebar & Header — Cockpit / Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire AppSidebar and AppHeader to `useTenant` in both `/cockpit` and `/control` layouts, with a dedicated ControlSidebar for admin navigation.

**Architecture:** TenantContext is extended with `isGlobalAdmin`. AppSidebar drops its duplicate hook and reads from context. A new ControlSidebar provides admin-focused navigation. UserDropdown shows real Supabase auth data.

**Tech Stack:** Next.js 15, TypeScript, Tailwind v4, Supabase client, TailAdmin component patterns.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/context/TenantContext.tsx` | Modify | Add `isGlobalAdmin` derived from `user_metadata.role` |
| `src/hooks/useTenant.ts` | Modify | Re-export `isGlobalAdmin` via type |
| `src/layout/AppSidebar.tsx` | Modify | Use `useTenant` instead of internal hook |
| `src/layout/ControlSidebar.tsx` | Create | Admin-specific navigation for /control |
| `src/app/control/layout.tsx` | Modify | Use `ControlSidebar` instead of `AppSidebar` |
| `src/components/header/UserDropdown.tsx` | Modify | Real Supabase auth user data |

---

### Task 1: Extend TenantContext with isGlobalAdmin

**Files:**
- Modify: `src/context/TenantContext.tsx`

- [ ] Add `isGlobalAdmin: boolean` to `TenantContextType`
- [ ] Derive from `user.user_metadata?.role === "global_admin"` in `fetchTenant`
- [ ] Pass via context provider value
- [ ] Commit: `feat(tenant): expose isGlobalAdmin from TenantContext`

### Task 2: Refactor AppSidebar to use useTenant

**Files:**
- Modify: `src/layout/AppSidebar.tsx`

- [ ] Remove `useTenantModules` internal hook (lines 63-103)
- [ ] Import `useTenant` from `@/hooks/useTenant`
- [ ] Replace `{ modules, isGlobalAdmin, ready }` with `useTenant()` — map `tenant?.activeModules`
- [ ] `ready` → `!loading`; `isGlobalAdmin` from context
- [ ] Commit: `refactor(sidebar): use useTenant context, remove duplicate fetch`

### Task 3: Create ControlSidebar

**Files:**
- Create: `src/layout/ControlSidebar.tsx`

- [ ] Admin sections: Dashboard `/control`, Tenants `/control/tenants`, Factory `/factory`, Logs `/control/logs`, Settings `/settings`
- [ ] No module filtering — all items always visible
- [ ] Same collapse/expand/hover behavior as AppSidebar
- [ ] Accent color different (amber/warning) to visually distinguish admin context
- [ ] Commit: `feat(layout): add ControlSidebar for admin navigation`

### Task 4: Update control/layout.tsx

**Files:**
- Modify: `src/app/control/layout.tsx`

- [ ] Import `ControlSidebar` instead of `AppSidebar`
- [ ] Commit: `feat(control): use ControlSidebar in /control layout`

### Task 5: Update UserDropdown with real auth

**Files:**
- Modify: `src/components/header/UserDropdown.tsx`

- [ ] Import `useTenant` to get `tenant.name`
- [ ] Use Supabase `supabase.auth.getUser()` for user name/email
- [ ] Show real name, email, avatar initials fallback
- [ ] Wire sign-out via `supabase.auth.signOut()` + `router.push('/signin')`
- [ ] Commit: `feat(header): UserDropdown shows real auth user data`
