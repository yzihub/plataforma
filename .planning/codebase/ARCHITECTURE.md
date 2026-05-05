# Architecture

**Analysis Date:** 2025-05-05

## Pattern Overview

**Overall:** Next.js 16 multi-tenant CRM dashboard with server-side authentication, client-side state management, and real-time data synchronization via Supabase RLS.

**Key Characteristics:**
- **Multi-tenant isolation** — All data scoped to `tenant_id` via Supabase RLS and server-side session resolution
- **SSR + Client Components** — Server pages fetch initial data; client components handle real-time updates and interactions
- **Middleware-based auth** — `src/proxy.ts` enforces authentication at request level; public routes bypass gating
- **Context providers** — `TenantContext` manages tenant data and plan permissions; `SidebarContext` handles UI state
- **Admin bypass** — `NEXT_PUBLIC_DEV_BYPASS` skips auth in development for faster local iteration
- **Role-based access** — Global admins (`global_admin` metadata) route to `/control`; regular users to `/cockpit`

## Layers

**Authentication & Session (src/proxy.ts + src/lib/supabase/)**
- Purpose: Middleware-level auth guard; session management
- Location: `src/proxy.ts` (Next.js middleware); `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts`
- Contains: Auth logic, Supabase client initialization, environment validation
- Depends on: Supabase SDK, environment variables
- Used by: All pages and API routes; all context providers

**TenantContext Layer (src/context/TenantContext.tsx)**
- Purpose: Load tenant data at app startup; expose tenant metadata (id, name, plan, activeModules) to all client components
- Location: `src/context/TenantContext.tsx`
- Contains: Provider component, useContext hook, tenant data fetching
- Depends on: Supabase client, user session from proxy
- Used by: CockpitLayout (`src/app/cockpit/layout.tsx`); useTenant hook; all management pages

**UI Shell & Navigation (src/layout/, src/context/SidebarContext.tsx)**
- Purpose: Global app shell (header, sidebar); navigation menu with module gating
- Location: `src/layout/AppHeader.tsx`, `src/layout/AppSidebar.tsx`, `src/context/SidebarContext.tsx`, `src/cockpit/layout.tsx`
- Contains: Header, sidebar menu, backdrop, theme toggle
- Depends on: TenantContext for module/plan visibility
- Used by: All cockpit pages via layout nesting

**Data Fetching (src/lib/crm/, src/app/api/)**
- Purpose: Server-side queries (SSR) and client-side API routes for CRUD operations
- Location: `src/lib/crm/queries.ts` (server query helpers); `src/app/api/` (Next.js route handlers)
- Contains: Supabase queries, n8n payload formatting, tenant-scoped data access
- Depends on: Supabase admin/anon clients, authentication context
- Used by: Server pages (data fetching); client components (API calls)

**Agent Integration (src/lib/agents/, CLAUDE.md)**
- Purpose: Communication with backend AI agents (Nina, Jurema/Ju)
- Location: `src/lib/agents/jurema.ts` (Ju client); agent routes map to backend endpoints
- Contains: HTTP clients for `/agent/jurema` and `/agent/nina` (future)
- Depends on: `NEXT_PUBLIC_YZI_API_URL`, tenant IDs from environment
- Used by: Chat pages, lead generation flows, Kanban views

**UI Components (src/components/yzihub/)**
- Purpose: Business-logic components for CRM features
- Location: `src/components/yzihub/` (client components); `src/components/ui/` (reusable primitives)
- Contains: Kanban boards, tables, drawers, modals, cards
- Depends on: React hooks, Supabase client, useTenant hook
- Used by: Cockpit pages

**Types & Contracts (src/types/)**
- Purpose: Shared TypeScript types for entities and API payloads
- Location: `src/types/appointments.ts`, `src/types/n8n-payloads.ts`, `src/types/brokers.ts`, etc.
- Contains: Entity types, API request/response shapes, n8n envelope format
- Depends on: Nothing
- Used by: All layers for type safety

## Data Flow

**Initial Page Load:**

1. **Request arrives** → proxy.ts validates session
2. **User authenticated?** → Redirect to /signin if no
3. **Page loads** (server component or layout)
4. **TenantProvider mounts** → fetchTenant() queries Supabase for tenant data
5. **Page renders** with initial data (from server or fallback)
6. **Client hydrates** → useEffect hooks trigger additional fetches via /api routes

Example: `/cockpit/imoveis` page:
- `src/app/cockpit/imoveis/page.tsx` is a server component
- Returns JSX wrapping `ImoveisClient` (client component)
- `ImoveisClient.tsx` calls GET `/api/imoveis` via useTenant context
- API route resolves tenant_id from session, queries `imoveis` table, returns n8n envelope
- Component maps response to UI and renders PropertyCard/PropertyTable

**Agent Communication:**

1. User sends message in test page or chat flow
2. `sendMessageToJurema()` (from `src/lib/agents/jurema.ts`) POSTs to backend
3. Backend processes with Ju agent logic
4. Returns `JuremaResponse` with metadata (deal_stage, lead_score, messages)
5. Frontend reads metadata, updates UI (e.g., show deal cards, update stage)

Example: `/cockpit/jurema-teste`:
- Form input → submit
- POST `https://yzi-os.yzihub.com/agent/jurema` with phone + message
- Response contains `metadata.deal_stage`, `metadata.lead_score`
- Frontend displays conversation and metadata formatted

**Real-time Subscriptions (future):**

Not currently implemented. Supabase realtime hooks exist in components but are not active.

## Key Abstractions

**TenantData (src/context/TenantContext.tsx)**
- Purpose: Encapsulates tenant metadata and permissions
- Examples: `{ id: "82cc7aa9...", name: "Jurema Brokers", plan: "growth", activeModules: ["crm"], settings: {...} }`
- Pattern: Single source of truth for tenant context; available to all client components via useTenant hook

**JuremaDeal (src/components/yzihub/JuremaKanbanClient.tsx)**
- Purpose: Represents a deal in the Jurema Brokers sales pipeline
- Examples: See type definition in JuremaKanbanClient.tsx (deal_stage, qualification_status, lead_score, client_name, etc.)
- Pattern: Passed from server (SQL query) → client (Kanban component) → immutable display

**N8nEnvelope (src/types/n8n-payloads.ts)**
- Purpose: Standardized API response wrapper for integration with n8n workflows
- Examples: `{ entity: "imoveis", tenant_id: "...", count: 5, fetched_at: "2025-05-05T...", data: [...] }`
- Pattern: All GET `/api/` routes return this shape for consistency

**Lead, Appointment, Broker (src/types/)**
- Purpose: Database entity types
- Examples: `Lead`, `Appointment`, `Broker` types match Supabase table schemas
- Pattern: Imported in API routes and components for type safety

## Entry Points

**Web (HTTP)**
- `http://localhost:3002/signin` — Authentication page
- `http://localhost:3002/cockpit` — Main dashboard (requires auth + tenant)
- `http://localhost:3002/control` — Global admin panel (requires global_admin role)
- `http://localhost:3002/cockpit/{page}` — Feature pages (Leads, Imóveis, Corretores, etc.)

**API Routes (Server-side, next/response)**
- `GET /api/leads` — Fetch all leads for tenant
- `POST /api/leads` — Create new lead
- `GET /api/imoveis` — Fetch all properties (Jurema)
- `GET /api/corretores` — Fetch all brokers
- `PATCH /api/corretores` — Update broker
- `GET /api/appointments` — Fetch appointments
- `POST /api/appointments` — Create appointment
- `GET /api/contracts` — Fetch contracts
- `POST /api/contracts` — Create contract

**Agent Routes (External, fetch-based)**
- `POST https://yzi-os.yzihub.com/agent/jurema` — Send message to Ju agent (Nina, same endpoint pattern)
- Payload: `{ message, phone, tenant_id, source?, entrypoint?, property_id? }`
- Response: `{ mode, messages, metadata }`

## Error Handling

**Strategy:** 
- Server-side — Log errors, return 4xx/5xx with JSON error messages
- Client-side — Catch errors, set local state, display user-friendly messages in UI

**Patterns:**

1. **Auth failures** (401):
   - Caught in proxy.ts → redirect to /signin
   - Caught in API routes → return 401 + error message
   - Caught in components → setState({ error: "Not authenticated" })

2. **Validation failures** (400):
   - API route checks request shape, returns 400 with reason
   - Component validates form, returns error before sending

3. **Server errors** (500):
   - API routes catch exceptions, log to console, return 500 with generic message
   - Components display "Erro ao carregar dados" in UI

4. **Network/Supabase failures**:
   - TenantContext catches error, sets error state (doesn't block page)
   - CockpitLayout shows yellow warning banner but renders page
   - API routes log errors, return 500

5. **Agent failures** (Ju/Nina requests):
   - sendMessageToJurema catches HTTP error, throws with status code
   - Test page catches, displays error message to user

## Cross-Cutting Concerns

**Logging:** 
- Console.error() for unexpected errors in pages, components, API routes
- Examples: `console.error("[GET /api/imoveis] query error:", error)`
- No centralized logging service yet; all logs go to stdout/stderr

**Validation:**
- Env validation: `src/lib/env-validation.ts` — requireEnv() helper
- Request validation: API routes validate JSON body shape before processing
- No schema validation library (no Zod, no Joi); manual if-checks
- Type safety: TypeScript compiler catches type mismatches at build time

**Authentication:**
- Session cookie set by Supabase auth
- Verified in proxy.ts middleware and API routes
- Role-based (global_admin metadata)
- No JWT parsing on frontend; trust Supabase session

**Authorization (Tenancy):**
- All queries scoped to tenant_id from session
- API routes resolve tenant_id server-side from profiles table
- Supabase RLS policies enforce row-level isolation
- No cross-tenant data leakage possible (by design)

**Data Consistency:**
- Optimistic updates not used (no fast/local state mutations)
- All writes go through API routes, wait for response
- No conflict resolution; last-write-wins (DB transactions handled by Supabase)

---

*Architecture analysis: 2025-05-05*
