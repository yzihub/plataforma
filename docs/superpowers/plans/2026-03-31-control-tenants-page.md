# Control Tenants Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admin table page at `/control/tenants` listing all tenants with a "Novo Tenant" creation modal.

**Architecture:** Server component `page.tsx` fetches via `createAdminClient()` (service_role, bypasses RLS). Passes data to `TenantsTable` client component that owns table + modal state. Server action handles tenant creation + path revalidation.

**Tech Stack:** Next.js 15 server components, Supabase admin client, TailAdmin Table/Modal/Badge, TypeScript.

---

## File Map

| File | Action |
|---|---|
| `src/lib/control/tenant-actions.ts` | Create — server action: createTenant |
| `src/components/yzihub/TenantsTable.tsx` | Create — client table + modal |
| `src/app/control/tenants/page.tsx` | Create — server page |

### Task 1: Server action createTenant
- Create `src/lib/control/tenant-actions.ts`
- Inserts into `tenants` (name, slug, plan, status = active)
- `revalidatePath('/control/tenants')`

### Task 2: TenantsTable client component
- `src/components/yzihub/TenantsTable.tsx`
- Props: `initialTenants: ControlTenant[]`
- TailAdmin Table/TableHeader/TableBody/TableRow/TableCell
- Badge color: active=success, inactive=warning, suspended=error
- Plan badge: starter=light, growth=primary, enterprise=dark
- "Novo Tenant" button → Modal with form → calls createTenant action

### Task 3: Server page
- `src/app/control/tenants/page.tsx`
- Fetch via createAdminClient(), pass to TenantsTable
- Fallback to empty array on error
