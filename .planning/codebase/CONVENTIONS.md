# Coding Conventions

**Analysis Date:** 2026-05-05

## Naming Patterns

**Files:**
- API routes: `src/app/api/[resource]/route.ts` for GET/POST/PUT/DELETE
- Components: PascalCase files (e.g., `CalendarioClient.tsx`, `NewAppointmentModal.tsx`)
- Utilities/services: camelCase files (e.g., `evolution/client.ts`, `supabase/admin.ts`)
- Hooks: `use[Feature].ts` (e.g., `useTenant.ts`, `useModal.ts`)
- Context providers: PascalCase with `Context` suffix (e.g., `TenantContext.tsx`)
- Types: collected in `src/types/[domain].ts` files
- API types: `N8nEnvelope`, `N8nLead`, `N8nImovel` (API contract types)

**Functions:**
- Async functions use `async`/`await` pattern consistently
- Event handlers: `handle[Event]` (e.g., `handleDateClick`, `handleEventClick`)
- Fetch/query functions: verb-first (e.g., `getCurrentTenantId`, `refetch`, `fetchProperties`)
- Helper functions: camelCase, descriptive (e.g., `mapN8nImovelToProperty`, `formatBRL`, `imovelLabel`)
- Mapper functions use `to[Type]` or `from[Type]` pattern (e.g., `toN8nLead`, `toCalEvent`)

**Variables:**
- State variables: camelCase (e.g., `properties`, `loading`, `fetchError`, `isOpen`)
- Boolean state: `is[Feature]` or `[action]ing` (e.g., `isOpen`, `loading`, `submitting`, `mounted`)
- Component props: camelCase with full word names, no abbreviations
- Enum-like constants: SCREAMING_SNAKE_CASE (e.g., `VALID_APPOINTMENT_TYPES`, `TYPE_BG`)
- Type unions for enums: lowercase literal strings (e.g., `"qualificacao" | "cadastro" | "briefing"`)

**Types:**
- Interfaces for object shapes: PascalCase with `I` prefix not used
- Type aliases for unions/primitives: PascalCase
- Generic parameters: Single capital letter (e.g., `<T>`)
- API request/response types: include `Request` / `Response` or `Input` / `Output` suffix
- Database row types: match table name exactly (e.g., `Appointment`, `Property`, `Lead`)

## Code Style

**Formatting:**
- No configuration file in use (Prettier); relies on ESLint defaults
- Indentation: 2 spaces
- Line length: No explicit limit; follow existing patterns
- Semicolons: Required at end of statements
- Quotes: Double quotes for strings (JavaScript/TypeScript standard)

**Linting:**
- ESLint config: `extends: "next/core-web-vitals"`
- Disable comments used sparingly, with specific violation noted (e.g., `// eslint-disable-next-line @typescript-eslint/no-explicit-any`)
- `@typescript-eslint/no-explicit-any` suppressed only where necessary (API mappers in n8n-payloads.ts)

**TypeScript:**
- Strict mode enabled (`strict: true`)
- No implicit `any` — mappers use explicit `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with comment explaining why
- Optional properties: `fieldName?: type` (with default in function signatures)
- Never use `as any`; use `as const` or cast to specific type

## Import Organization

**Order:**
1. External libraries (`react`, `next`, `@supabase/...`)
2. Internal absolute path imports (`@/lib/*`, `@/types/*`, `@/components/*`)
3. Relative imports (same directory or parent)
4. Type imports grouped after values

**Path Aliases:**
- `@/*` resolves to `src/*`
- Always use `@/` for all internal imports, never relative paths (`../../../`)

**Example from CalendarioClient.tsx:**
```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
// ... other external
import type { Appointment } from "@/types/appointments";
import IntegrationStatusBanner from "./IntegrationStatusBanner";
```

## Error Handling

**Pattern:** Try/catch with detailed logging and user-friendly responses

**API Routes:**
- Wrap entire handler in try/catch
- Log errors with route context: `console.error("[GET /api/route] error:", err)`
- Return NextResponse with appropriate HTTP status and error message
- Always provide `{ error: "User message" }` in JSON response
- Example from `/api/imoveis`:
```typescript
try {
  // ... logic
  if (propertiesError) {
    console.error("[GET /api/imoveis] query error:", propertiesError);
    return NextResponse.json({ error: "Erro ao buscar imoveis" }, { status: 500 });
  }
} catch (err) {
  console.error("[GET /api/imoveis] unexpected error:", err);
  return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
}
```

**Components (Client):**
- Use state for error messages: `const [fetchError, setFetchError] = useState<string | null>(null)`
- Set error in catch block, display to user in UI
- Wrap fetch calls in try/catch, extract message from response or error object
- Example from CalendarioClient.tsx:
```typescript
try {
  const res = await fetch("/api/appointments");
  if (!res.ok || !json.ok) {
    setFetchError(json.error ?? "Erro ao buscar compromissos.");
    return;
  }
  setAppointments(json.appointments ?? []);
} catch (err) {
  setFetchError(err instanceof Error ? err.message : "Erro inesperado.");
}
```

**Supabase Queries:**
- Always check `.error` property from Supabase response
- Log full error object with context when available
- Example from appointments/route.ts:
```typescript
const { data, error } = await query;
if (error) {
  console.error("[GET /api/appointments] query error:", error);
  return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
}
```

## Logging

**Framework:** `console` methods (no external logger)

**Patterns:**
- Info/debug: `console.log("[ROUTE/COMPONENT] message")`
- Errors: `console.error("[ROUTE] context:", error)` with full error object first
- Format: `[CONTEXT]` prefix for easy filtering
- Example contexts: `[GET /api/leads]`, `[TenantContext]`, `[CalendarioClient]`

**Diagnostic logs:**
- Temporary diagnostic logs marked with `// [DIAG] REMOVE AFTER VALIDATION`
- Example from TenantContext.tsx: `console.log("[DIAG] REMOVE AFTER VALIDATION — getUser result:", user?.id ?? "no user");`
- Remove before PR merge

## Comments

**When to Comment:**
- Explain WHY, not WHAT
- Complex business logic (e.g., dev bypass condition, state management)
- Non-obvious algorithm choices
- Workarounds for known issues
- Example from proxy.ts or evolution/client.ts patterns:
```typescript
// DEV_BYPASS: skip auth in development — consistent with proxy.ts and TenantContext
// This must run BEFORE any supabase.auth.getUser() call — if DNS is unreachable,
// that call hangs indefinitely and the loading spinner never resolves.
```

**Section headers:**
- Use ASCII dividers for major sections:
```typescript
// ─── Context ─────────────────────────────────────────────────────────────────
```
- Dividers are exactly 80 characters with pattern `// ─── [Section] ─[repeating]`

**JSDoc/TSDoc:**
- Not consistently used; when present, brief and descriptive
- Example from evolution/client.ts:
```typescript
/**
 * Returns true only if all three required env vars are present and non-empty.
 * When false, all functions return safe stubs (no external calls).
 */
export function isEvolutionConfigured(): boolean
```

## Function Design

**Size:** Keep functions under 100 lines; break complex logic into helpers

**Parameters:**
- Destructure objects rather than pass many positional arguments
- Use object parameter for 3+ related arguments
- Example from NewAppointmentModal (props pattern):
```typescript
interface NewAppointmentModalProps {
  isOpen:          boolean;
  onClose:         () => void;
  onCreated:       () => void;
  defaultStartAt?: string;
}
```

**Return Values:**
- Functions return data structures (types, interfaces)
- Async functions always return `Promise<Type>`
- Helper functions return specific types, not `any`
- Example pattern for Supabase: `const { data, error } = await query`

**Validation:**
- Validate inputs at function entry
- Return early with error response for invalid state
- Example from appointments/route.ts:
```typescript
if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
  return NextResponse.json(
    { ok: false, error: "Campo 'title' é obrigatório..." },
    { status: 400 }
  );
}
```

## Module Design

**Exports:**
- API routes export named functions (`GET`, `POST`, `PUT`, `DELETE`)
- Utils export named functions or default
- Components export default function
- Example from CalendarioClient.tsx:
```typescript
export default function CalendarioClient() { ... }
```

**Barrel Files:**
- Hook entry point pattern: `src/hooks/useTenant.ts` re-exports from `@/context/TenantContext`
- Allows clean imports: `import { useTenant } from "@/hooks/useTenant"`

**File organization:**
- Related types in dedicated `src/types/[domain].ts`
- API clients in `src/lib/[service]/client.ts`
- Server-only utils in `src/lib/supabase/server.ts`
- Client-only utils in `src/lib/supabase/client.ts`

## Supabase Query Patterns

**Tenant filtering (Jurema manager flow):**
- Always filter by `tenant_id` after auth check
- Example pattern:
```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("tenant_id")
  .eq("id", user.id)
  .single();

const tenantId = profile.tenant_id;

const { data: brokers } = await supabase
  .from("brokers")
  .select("id, tenant_id, full_name, phone, email...")
  .eq("tenant_id", tenantId)
```

**Relationship queries (lead_id, broker_id, deal_id):**
- Use dot notation for nested selects from `src/context/TenantContext.tsx`:
```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select(`
    id,
    tenant_id,
    tenants (
      id,
      name,
      plan,
      settings
    )
  `)
  .eq("id", user.id)
  .single();
```

**Ordering:**
- Apply multiple `.order()` calls for secondary sort
- Example from /api/brokers:
```typescript
.order("is_active", { ascending: false })
.order("created_at", { ascending: false })
```

**Column selection:**
- Explicitly select columns to reduce bandwidth
- Example pattern: `"id, tenant_id, name, email, status, created_at, updated_at"`
- Include related ForeignKey columns for joins in client

**Admin vs. regular clients:**
- `createAdminClient()` uses `service_role` — API routes only
- `createClient()` from `@/lib/supabase/server` — respects RLS
- Never mix in same route; use appropriate client for operation
- Admin client example from /api/imoveis:
```typescript
const supabase = createAdminClient();
const { data: properties } = await supabase.from("imoveis")...
```

## Component Patterns

**"use client" directive:**
- Required for all interactive components (state, hooks, event handlers)
- Placed at top of file before imports
- Example from CalendarioClient.tsx:
```typescript
"use client";

import { useState, useEffect... }
```

**State initialization:**
- Initialize with actual data type, not empty generics
- Example from ImoveisClient.tsx:
```typescript
const [properties, setProperties] = useState<Property[]>([]);
const [loading, setLoading] = useState(true);
const [fetchError, setFetchError] = useState<string | null>(null);
```

**Data fetching in useEffect:**
- Set loading before fetch, always set it in finally
- Use cleanup flag for cancelled requests
- Example from ImoveisClient.tsx:
```typescript
useEffect(() => {
  let cancelled = false;
  async function fetchProperties() {
    setLoading(true);
    try {
      const res = await fetch("/api/imoveis");
      if (cancelled) return;
      // ... process
    } catch (err) {
      // ...
    } finally {
      setLoading(false);
    }
  }
  fetchProperties();
}, [tenantLoading, tenant?.id]);
```

**Loading UI:**
- Show spinner when loading: `{loading ? <Spinner /> : <Content />}`
- Example pattern from CalendarioClient.tsx:
```typescript
{!mounted || loading ? (
  <div className="flex h-[520px] items-center justify-center">
    <span className="inline-block size-7 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
  </div>
) : (
  <FullCalendar ... />
)}
```

**Error display:**
- Show error message in styled container
- Example from CalendarioClient.tsx:
```typescript
{fetchError && (
  <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5 px-4 py-3">
    <p className="text-sm text-rose-600 dark:text-rose-400">{fetchError}</p>
  </div>
)}
```

**Tailwind utilities:**
- Use design system colors: `brand-500`, `gray-200`, `rose-600` (not arbitrary values)
- Responsive classes: rarely used; layouts mostly fixed width
- Dark mode: `dark:` prefix for dark theme support
- Example: `text-gray-800 dark:text-white/90`
- Transition: `transition-colors` or `transition-all`

## API Route Structure

**Standard layout:**
1. Imports
2. Type definitions (if not in shared types file)
3. Helper functions (auth, validation)
4. Handler function with try/catch
5. Error response pattern

**Response format:**
- Success: `NextResponse.json(data, { status: 200 })` or `{ ok: true, data }`
- Error: `NextResponse.json({ error: "message" }, { status: [code] })` or `{ ok: false, error: "message" }`
- Consistency: Use either `{ ok, data/error }` or just data/error based on route

**Auth check pattern:**
All routes that need tenant_id follow this pattern:
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
}

const { data: profile } = await supabase
  .from("profiles")
  .select("tenant_id")
  .eq("id", user.id)
  .single();

if (!profile?.tenant_id) {
  return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 401 });
}

const tenantId = profile.tenant_id;
```

## N8n API Contract

**Mappers:** Functions in `src/types/n8n-payloads.ts` transform database rows to API contract

**Pattern:**
```typescript
export function toN8nImovel(row: any): N8nImovel {
  return {
    id: row.id,
    // map each field explicitly
    foto_principal: (() => {
      const f = row.foto_principal;
      if (!f) return null;
      if (typeof f === "string") {
        try { return JSON.parse(f)?.url ?? f; } catch { return f; }
      }
      return (f as { url?: string })?.url ?? null;
    })(),
  };
}
```

**Notes:**
- Suppress `@typescript-eslint/no-explicit-any` with comment explaining API row shape
- Handle type coercion (JSON parsing, nullable fields)
- N8nEnvelope wraps any entity with metadata and timestamp
```typescript
export function buildN8nEnvelope<T>(entity: string, tenantId: string, data: T[]): N8nEnvelope<T> {
  return {
    entity,
    tenant_id: tenantId,
    count: data.length,
    fetched_at: new Date().toISOString(),
    data,
  };
}
```

---

*Convention analysis: 2026-05-05*
