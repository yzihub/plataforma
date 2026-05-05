# Codebase Structure

**Analysis Date:** 2025-05-05

## Directory Layout

```
src/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Old admin template (unused)
│   ├── (full-width-pages)/       # Auth pages layout
│   │   └── (auth)/
│   │       ├── signin/
│   │       ├── signup/
│   │       └── reset-password/
│   ├── api/                      # Server API routes
│   │   ├── appointments/
│   │   ├── brokers/
│   │   ├── contracts/
│   │   ├── corretores/
│   │   ├── evolution/
│   │   ├── imoveis/
│   │   ├── leads/
│   │   └── observabilidade/
│   ├── cockpit/                  # Main tenant app
│   │   ├── calendario/           # Appointments UI
│   │   ├── chat/                 # Messages (placeholder)
│   │   ├── contratos/            # Contracts manager
│   │   ├── corretores/           # Brokers table
│   │   ├── crm/                  # CRM pipeline (Café com Pam)
│   │   ├── evolution/            # WhatsApp integration
│   │   ├── financeiro/           # Commissions & payments
│   │   ├── imoveis/              # Properties catalog
│   │   ├── jurema/               # Jurema Kanban (deal pipeline)
│   │   ├── jurema-teste/         # Ju agent test tool (admin)
│   │   ├── leads/                # Leads list
│   │   ├── observabilidade/      # Agent metrics (admin)
│   │   ├── pipeline/             # Lead pipeline visualization
│   │   ├── tasks/                # Tasks (placeholder)
│   │   ├── ai-agent/             # Agent configuration (placeholder)
│   │   ├── layout.tsx            # Cockpit shell (sidebar + header)
│   │   └── page.tsx              # Dashboard home
│   ├── control/                  # Global admin panel
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── tenants/
│   │   └── logs/
│   ├── auth/
│   │   └── callback/             # Supabase OAuth callback
│   ├── layout.tsx                # Root layout (providers)
│   └── globals.css               # Tailwind styles
│
├── components/
│   ├── ui/                       # Reusable primitives
│   │   ├── alert/
│   │   ├── avatar/
│   │   ├── badge/
│   │   ├── button/
│   │   ├── dropdown/
│   │   ├── modal/
│   │   ├── table/
│   │   └── ...more
│   ├── form/                     # Form elements
│   │   ├── Form.tsx
│   │   ├── Select.tsx
│   │   ├── MultiSelect.tsx
│   │   ├── date-picker.tsx
│   │   └── input/
│   ├── layout/                   # App shell (moved to src/layout/)
│   ├── yzihub/                   # Business logic components
│   │   ├── CorretoresClient.tsx
│   │   ├── ImoveisClient.tsx
│   │   ├── LeadsClient.tsx
│   │   ├── JuremaKanbanClient.tsx
│   │   ├── PipelineDashboardClient.tsx
│   │   ├── FinanceiroClient.tsx
│   │   ├── Calendario/
│   │   │   ├── CalendarioClient.tsx
│   │   │   ├── NewAppointmentModal.tsx
│   │   │   └── ...
│   │   ├── Contratos/
│   │   │   ├── ContractsClient.tsx
│   │   │   ├── ContratoEditor.tsx
│   │   │   └── ...
│   │   ├── PropertyCard.tsx
│   │   ├── PropertyDrawer.tsx
│   │   ├── PropertyTable.tsx
│   │   ├── LeadDrawer.tsx
│   │   ├── CorretorDrawer.tsx
│   │   ├── KanbanBoard.tsx
│   │   └── ...more
│   ├── auth/
│   │   ├── SignInForm.tsx
│   │   └── SignUpForm.tsx
│   ├── ecommerce/                # Legacy template components
│   ├── charts/
│   ├── tables/
│   ├── header/
│   └── ...
│
├── context/
│   ├── TenantContext.tsx         # Tenant data + plan management
│   ├── SidebarContext.tsx        # Mobile sidebar state
│   └── ThemeContext.tsx          # Light/dark theme
│
├── layout/
│   ├── AppHeader.tsx             # Top navigation bar
│   ├── AppSidebar.tsx            # Side navigation menu
│   ├── Backdrop.tsx              # Mobile overlay
│   ├── AppSidebar.tsx            # Navigation menu
│   └── SidebarWidget.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # Server-side client (session auth)
│   │   ├── client.ts             # Client-side client (anon key)
│   │   └── admin.ts              # Admin client (service_role, bypass RLS)
│   ├── agents/
│   │   └── jurema.ts             # Ju agent HTTP client
│   ├── crm/
│   │   ├── queries.ts            # Server-side Supabase queries
│   │   ├── types.ts              # CRM type definitions
│   │   └── mock-data.ts          # Fallback data (Café com Pam)
│   ├── control/
│   │   ├── queries.ts            # Admin queries
│   │   ├── types.ts              # Admin types
│   │   ├── tenant-actions.ts     # Tenant operations
│   │   └── mock-data.ts          # Admin mock data
│   ├── tenancy/
│   │   ├── getCurrentTenant.ts
│   │   └── loadTenantContext.ts
│   ├── contracts/
│   │   ├── templates.ts          # Contract template library
│   │   └── mock-data.ts
│   ├── evolution/
│   │   ├── client.ts             # WhatsApp integration
│   │   └── types.ts
│   └── env-validation.ts         # Environment variable validation
│
├── types/
│   ├── appointments.ts           # Appointment entity type
│   ├── brokers.ts                # Broker entity type
│   ├── properties.ts             # Property entity type
│   ├── n8n-payloads.ts          # n8n API envelope format
│   └── ...
│
├── hooks/
│   ├── useTenant.ts              # useContext(TenantContext) wrapper
│   └── ...
│
├── icons/
│   └── index.tsx                 # Exported icon components
│
├── proxy.ts                      # Next.js middleware (auth guard)
│
└── env-validation.ts             # Shared env helpers
```

## Directory Purposes

**src/app/cockpit/**
- Purpose: Main multi-tenant application (CRM, properties, brokers, contracts)
- Contains: Feature pages, layout shells, API routes
- Key files: `layout.tsx` (shell with sidebar), `page.tsx` (dashboard home), feature pages

**src/app/api/**
- Purpose: Server-side API routes for CRUD and integrations
- Contains: Route handlers for leads, brokers, properties, appointments, contracts
- Key files: All `route.ts` files; resolving tenant from session; returning n8n envelopes

**src/components/yzihub/**
- Purpose: Business logic components specific to YZI Hub CRM
- Contains: Kanban boards, tables, drawers, modals for CRM features
- Key files: `*Client.tsx` (data-fetching containers); `*Drawer.tsx` (detail modals); `*Kanban*.tsx` (pipeline visualizations)

**src/lib/**
- Purpose: Shared logic, queries, and integrations
- Contains: Supabase clients, agent APIs, data queries, environment validation
- Key files: `supabase/*.ts` (auth clients), `agents/jurema.ts` (Ju integration), `crm/queries.ts` (server queries)

**src/context/**
- Purpose: React Context providers for global state
- Contains: Tenant data, sidebar mobile state, theme
- Key files: `TenantContext.tsx` (manages plan gating + tenant metadata)

**src/layout/**
- Purpose: App shell components (header, sidebar)
- Contains: Navigation menus, header bar, mobile backdrop
- Key files: `AppSidebar.tsx` (navigation with module gating), `AppHeader.tsx` (top bar with user menu)

**src/types/**
- Purpose: TypeScript type definitions
- Contains: Entity types (Lead, Broker, Appointment), API payloads (n8n envelope), request/response shapes
- Key files: `n8n-payloads.ts` (standardized API format), individual entity files

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx` — Root layout; instantiates providers (ThemeProvider, SidebarProvider)
- `src/app/cockpit/layout.tsx` — Cockpit shell; instantiates TenantProvider, renders sidebar + header
- `src/app/cockpit/page.tsx` — Dashboard homepage; mock stats and charts
- `src/proxy.ts` — Next.js middleware; authentication gate at request level

**Configuration:**

- `src/lib/env-validation.ts` — Helper to validate and fetch environment variables
- `.env.local` — Local environment configuration (Supabase URL, keys, tenant IDs, API URLs)
- `tailwind.config.ts` — Tailwind CSS configuration (likely in root, auto-loaded)
- `next.config.ts` — Next.js configuration (likely in root)

**Core Logic:**

- `src/lib/supabase/server.ts` — Server-side Supabase client (session-based auth)
- `src/lib/supabase/admin.ts` — Admin Supabase client (service_role, bypasses RLS)
- `src/context/TenantContext.tsx` — Tenant data provider; loads tenant ID from profiles table
- `src/lib/agents/jurema.ts` — Ju agent client; sendMessageToJurema() function
- `src/lib/crm/queries.ts` — Server-side Supabase queries for CRM data

**Testing:**

- `src/app/cockpit/jurema-teste/page.tsx` — Test page for Ju agent (POST /agent/jurema)
- Used for manual validation of agent responses before integration to production features

**Utilities:**

- `src/icons/index.tsx` — Icon components exported for use in UI
- `src/hooks/useTenant.ts` — useContext wrapper for TenantContext

## Naming Conventions

**Files:**

- Pages: `src/app/[route]/page.tsx` (server or "use client")
- Layouts: `src/app/[route]/layout.tsx`
- Client components: `*Client.tsx` (e.g., `ImoveisClient.tsx`, `LeadsClient.tsx`)
- Container/drawer components: `*Drawer.tsx` (e.g., `LeadDrawer.tsx`, `PropertyDrawer.tsx`)
- Table components: `*Table.tsx` (e.g., `PropertyTable.tsx`)
- Card components: `*Card.tsx` (e.g., `PropertyCard.tsx`, `LeadCard.tsx`)
- Utility/library files: camelCase.ts (e.g., `jurema.ts`, `queries.ts`, `types.ts`)
- Hooks: `use*` prefix (e.g., `useTenant.ts`, `useSidebar.ts`)
- Types: PascalCase (e.g., `Lead`, `Broker`, `JuremaDeal`)
- Directories: kebab-case (e.g., `pipeline`, `jurema-teste`, `evolution`)

**Directories:**

- Feature pages: `/app/cockpit/[feature-name]/`
- API routes: `/app/api/[entity]/`
- Component groups: `/components/[feature-group]/`
- Library modules: `/lib/[domain]/`

## Where to Add New Code

**New Feature (e.g., New CRM page like "Propostas"):**

1. **Page file**: `src/app/cockpit/propostas/page.tsx` (server or client component)
2. **Client component**: `src/components/yzihub/PropostasClient.tsx` (data fetching + UI)
3. **API route**: `src/app/api/propostas/route.ts` (GET, POST, PATCH, DELETE handlers)
4. **Types**: Add to `src/types/propostas.ts` or existing type file
5. **Sidebar menu**: Update `src/layout/AppSidebar.tsx` SECTIONS array to add nav item
6. **TenantContext**: If feature requires module gating, add module to ActiveModule type

**New Component/Module:**

- **UI primitive** (reusable): `src/components/ui/[name]/[Name].tsx`
- **Business component** (CRM-specific): `src/components/yzihub/[Name].tsx`
- **Layout component**: `src/layout/[Name].tsx`

**Utilities & Helpers:**

- **Supabase operations**: `src/lib/supabase/[module].ts` (or update existing)
- **Agent integrations**: `src/lib/agents/[agentName].ts`
- **CRM-specific queries**: `src/lib/crm/queries.ts` (append function)
- **Type definitions**: `src/types/[entity].ts` (new file if > 5 types)

**API Routes (CRUD for existing entity):**

- **Pattern**: `src/app/api/[entity]/route.ts` (GET list, POST create), `src/app/api/[entity]/[id]/route.ts` (GET one, PATCH, DELETE)
- **Tenant scoping**: Always resolve `tenant_id` from session first; scope all queries to it
- **Response format**: Use `buildN8nEnvelope()` if n8n integration needed; otherwise plain JSON
- **Error handling**: Return appropriate 4xx/5xx with { error: "message" } body

## Special Directories

**src/app/(admin)/**
- Purpose: Old admin template from Next.js dashboard template (unused)
- Generated: No (checked in)
- Committed: Yes
- Status: Deprecated; not actively used; can be removed in cleanup phase

**src/app/(full-width-pages)/(auth)/**
- Purpose: Authentication pages (signin, signup, reset-password)
- Generated: No
- Committed: Yes
- Status: Active; public routes (not gated by middleware)

**src/.claude/worktrees/**
- Purpose: Cursor agent worktrees (AI coding sessions)
- Generated: Yes (by Cursor)
- Committed: No (.gitignored)
- Status: Temporary; not source code

**.env.local**
- Purpose: Local environment configuration (never committed)
- Generated: No (user-created)
- Committed: No (.gitignored)
- Status: Must be created for local development; contains secrets

## All App Routes (Cockpit Manager)

### Jurema Brokers Specific Routes (Tenant: 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361)

| Route | Page Component | Client Component | Status | API Routes | Tables Used | Notes |
|-------|---|---|---|---|---|---|
| `/cockpit/corretores` | `src/app/cockpit/corretores/page.tsx` | `CorretoresClient.tsx` | **REAL** | GET/PATCH `/api/corretores` | `corretores` | Brokers CRUD; fetches leads for KPI stats |
| `/cockpit/leads` | `src/app/cockpit/leads/page.tsx` | `LeadsClient.tsx` | **REAL** | GET/POST `/api/leads` | `leads` | Leads list with filters; server-side initial fetch |
| `/cockpit/imoveis` | `src/app/cockpit/imoveis/page.tsx` | `ImoveisClient.tsx` | **REAL** | GET `/api/imoveis` | `imoveis` | Properties catalog; grid/table view toggle; no edit yet |
| `/cockpit/jurema` | `src/app/cockpit/jurema/page.tsx` | `JuremaKanbanClient.tsx` | **REAL** | None (server fetch) | `jurema_deals` | Deal Kanban by stage (qualificacao → perdido); read-only |
| `/cockpit/pipeline` | `src/app/cockpit/pipeline/page.tsx` | `PipelineDashboardClient.tsx` | **REAL** | None (server fetch) | `pipeline_stages`, `leads`, `brokers` | Lead pipeline + KPIs; old CRM (Café com Pam) |
| `/cockpit/crm` | `src/app/cockpit/crm/page.tsx` | Client-side only | **REAL** | None | `leads` (mock data) | CRM table with actions (contact, schedule, close); Café com Pam data |
| `/cockpit/contratos` | `src/app/cockpit/contratos/page.tsx` | `ContractsClient.tsx` | **REAL** | GET/POST `/api/contracts` | `contracts` | Contracts manager; templates, draft, generate, PDF |
| `/cockpit/contratos/novo` | `src/app/cockpit/contratos/novo/page.tsx` | Editor | **REAL** | POST `/api/contracts/generate` | `contracts` | Contract creation/editing interface |
| `/cockpit/financeiro` | `src/app/cockpit/financeiro/page.tsx` | `FinanceiroClient.tsx` | **PLACEHOLDER** | None | `payments` (not queried) | Commissions/payments view (tabs: comissoes, contratos, geral) |
| `/cockpit/calendario` | `src/app/cockpit/calendario/page.tsx` | `CalendarioClient.tsx` | **REAL** | GET/POST `/api/appointments` | `appointments` | Appointment calendar + management |
| `/cockpit/chat` | `src/app/cockpit/chat/page.tsx` | Static JSX | **PLACEHOLDER** | None | None | Chat page (disabled input; awaiting integration) |
| `/cockpit/evolution` | `src/app/cockpit/evolution/page.tsx` | `EvolutionConnectClient.tsx` | **REAL** | GET/POST `/api/evolution/...` | `evolution_connections` | WhatsApp integration (Evolution API) |
| `/cockpit/tasks` | `src/app/cockpit/tasks/page.tsx` | Static JSX | **PLACEHOLDER** | None | None | Tasks page (not implemented) |
| `/cockpit/ai-agent` | `src/app/cockpit/ai-agent/page.tsx` | Static JSX | **PLACEHOLDER** | None | None | Agent configuration (not implemented) |
| `/cockpit/observabilidade` | `src/app/cockpit/observabilidade/page.tsx` | `AgentMetricsClient.tsx` | **ADMIN ONLY** | GET `/api/observabilidade/agent-metrics` | `agent_metrics_events` | Agent metrics dashboard (Ju/Nina events) |
| `/cockpit/jurema-teste` | `src/app/cockpit/jurema-teste/page.tsx` | Test form (no client component) | **ADMIN ONLY** | POST `https://yzi-os.yzihub.com/agent/jurema` | None (external) | Manual agent testing tool |

### Cafe com Pam Routes (Tenant: b179ae75-3d56-4de8-8840-fc9c4d9ec21e)

| Route | Page Component | Client Component | Status | API Routes | Tables Used | Notes |
|-------|---|---|---|---|---|---|
| `/cockpit` | `src/app/cockpit/page.tsx` | Client-side only | **PLACEHOLDER** | None | None | Dashboard home; mock charts + stats (not real data) |

### Control Routes (Global Admin Only)

| Route | Page Component | Purpose |
|-------|---|---|
| `/control` | `src/app/control/page.tsx` | Admin dashboard |
| `/control/tenants` | `src/app/control/tenants/page.tsx` | Tenant management (activate, view logs) |
| `/control/logs` | `src/app/control/logs/page.tsx` | Action audit logs |

## Route Status Legend

- **REAL** — Fully implemented; fetches live data; performs CRUD operations
- **PLACEHOLDER** — Page exists but UI is static; no real data fetching or disabled inputs
- **ADMIN ONLY** — Requires `global_admin` role; visible in sidebar only for admins
- **BROKEN** — Page has code but doesn't render correctly; missing dependencies or errors

---

*Structure analysis: 2025-05-05*
