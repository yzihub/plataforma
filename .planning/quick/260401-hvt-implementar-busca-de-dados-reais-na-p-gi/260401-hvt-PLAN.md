---
phase: quick
plan: 260401-hvt
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/cockpit/leads/page.tsx
  - src/components/yzihub/LeadsClient.tsx
  - src/components/yzihub/LeadsView.tsx
autonomous: true
requirements:
  - "Cockpit/Leads: conectar componente LeadsDataTable ao Supabase real com dados do tenant logado"
must_haves:
  truths:
    - "Logged-in user sees only leads belonging to their tenant_id"
    - "Unauthenticated users are redirected, not shown mock data"
    - "Table displays Nome, WhatsApp, Status, Origem, Valor Imovel columns from real Supabase data"
    - "Empty state is shown when tenant has no leads (not mock fallback)"
  artifacts:
    - path: "src/app/cockpit/leads/page.tsx"
      provides: "Server component that fetches real leads filtered by tenant_id"
      contains: "supabase.from.*leads.*eq.*tenant_id"
    - path: "src/components/yzihub/LeadsClient.tsx"
      provides: "Client component rendering leads table with correct field mapping"
      contains: "lead.phone"
  key_links:
    - from: "src/app/cockpit/leads/page.tsx"
      to: "supabase.leads"
      via: "server-side fetch with auth.getUser() -> profiles.tenant_id"
      pattern: "auth\\.getUser.*profiles.*tenant_id.*leads"
    - from: "src/app/cockpit/leads/page.tsx"
      to: "src/components/yzihub/LeadsClient.tsx"
      via: "initialLeads prop"
      pattern: "LeadsClient.*initialLeads"
---

<objective>
Connect the /cockpit/leads page to real Supabase data, replacing mock fallbacks with proper error handling and ensuring tenant isolation via auth.getUser() -> profiles.tenant_id.

Purpose: The leads page currently falls back to mock data (cafePamData) when auth fails. Real tenant data must be displayed with proper field mapping (Nome, WhatsApp, Status, Origem, Valor Imovel).
Output: Working leads page fetching real data from Supabase with tenant isolation.
</objective>

<execution_context>
@.claude/get-shit-done/workflows/execute-plan.md
@.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@src/app/cockpit/leads/page.tsx
@src/components/yzihub/LeadsClient.tsx
@src/lib/crm/types.ts
@src/lib/supabase/server.ts
@supabase/migrations/001_initial_schema.sql (lines 77-95 — leads table schema)

<interfaces>
<!-- Supabase leads table schema (from 001_initial_schema.sql) -->
leads table columns:
  id: UUID (PK)
  tenant_id: UUID (FK tenants)
  stage_id: UUID (FK pipeline_stages, nullable)
  name: TEXT NOT NULL
  email: TEXT
  phone: TEXT
  company: TEXT
  source: TEXT
  status: TEXT ('new'|'contacted'|'qualified'|'proposal'|'negotiation'|'won'|'lost')
  score: INTEGER (default 0)
  value: NUMERIC(12,2) (default 0)
  notes: TEXT
  metadata: JSONB
  assigned_to: UUID (FK profiles, nullable)
  last_action_at: TIMESTAMPTZ
  created_at: TIMESTAMPTZ

<!-- Lead TypeScript type (from src/lib/crm/types.ts) -->
```typescript
export interface Lead {
  id: string
  tenant_id: string
  stage_id: string | null
  name: string
  email: string | null
  phone: string | null
  company: string | null
  source: string | null
  status: LeadStatus
  score: number
  value: number
  notes: string | null
  assigned_to: string | null
  last_action_at: string | null
  created_at: string
}
```

<!-- CSV field mapping (user requirement) -->
Nome -> lead.name
WhatsApp -> lead.phone
Status -> lead.status
Origem -> lead.source
Valor Imovel -> lead.value
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix fetchLeads to remove mock fallback and add proper error handling</name>
  <files>src/app/cockpit/leads/page.tsx</files>
  <action>
The current fetchLeads() in src/app/cockpit/leads/page.tsx falls back to cafePamData.leads in THREE places: when no user, when no tenant_id, and on error. This masks real data issues.

Modify fetchLeads() in src/app/cockpit/leads/page.tsx:

1. Remove the import of cafePamData from "@/lib/crm/mock-data" entirely.

2. When no user is authenticated (auth.getUser returns null): use `redirect("/unauthorized")` from "next/navigation" instead of returning mock data. Import `redirect` at top.

3. When profile has no tenant_id: return empty array `[]` (not mock data). This means the user exists in auth but has no tenant — show empty state.

4. When Supabase query errors or returns null: return empty array `[]` (not mock data). Log the error with console.error for debugging.

5. In the catch block: return empty array `[]` (not mock data). Log the error.

6. Keep the existing select columns: "id, tenant_id, stage_id, name, email, phone, company, source, status, score, value, notes, assigned_to, last_action_at, created_at" — these already match the Lead type exactly.

7. Keep the .order("created_at", { ascending: false }) — most recent leads first.

The resulting page.tsx should be a clean server component with no mock imports.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit src/app/cockpit/leads/page.tsx 2>&1 | head -20</automated>
  </verify>
  <done>fetchLeads() returns real Supabase data filtered by tenant_id; unauthenticated users are redirected; no mock data fallbacks remain</done>
</task>

<task type="auto">
  <name>Task 2: Ensure LeadsClient displays WhatsApp (phone) column and clean up orphan LeadsView</name>
  <files>src/components/yzihub/LeadsClient.tsx, src/components/yzihub/LeadsView.tsx</files>
  <action>
Two changes needed:

**A) LeadsClient.tsx — Add WhatsApp/phone column to table:**

The current LeadsTable inside LeadsClient.tsx shows columns: Lead (name+email), Origem, Status, Score, Valor, Data, (action link). The user requires WhatsApp (phone) to be visible per CSV mapping.

In the LeadsTable component within LeadsClient.tsx:
1. Add "WhatsApp" to the table header array, inserting it after "Lead" — so headers become: ["Lead", "WhatsApp", "Origem", "Status", "Score", "Valor", "Data", ""]
2. Add a table cell after the Lead name/email cell that renders lead.phone:
```tsx
<td className="py-3.5 px-5 text-sm text-emerald-600 dark:text-emerald-400">
  {lead.phone ?? "—"}
</td>
```
Use emerald color to visually indicate WhatsApp (consistent with LeadsView.tsx pattern).

3. Also add phone to the search filter — update matchSearch in the useMemo to also search on phone:
```typescript
const matchSearch =
  !search ||
  l.name.toLowerCase().includes(search.toLowerCase()) ||
  (l.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
  (l.phone ?? "").toLowerCase().includes(search.toLowerCase());
```

**B) Delete orphan LeadsView.tsx:**

src/components/yzihub/LeadsView.tsx is not imported anywhere in the codebase (confirmed by grep). It has a stale local type with Portuguese field names (nome, numero_whatsapp, etc.) that do NOT match the Supabase schema. Delete this file to avoid confusion.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit src/components/yzihub/LeadsClient.tsx 2>&1 | head -20</automated>
  </verify>
  <done>LeadsClient table shows WhatsApp column from lead.phone; phone is searchable; orphan LeadsView.tsx deleted; TypeScript compiles cleanly</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — no TypeScript errors in modified files
2. `npm run build` — Next.js build passes (server component renders without mock import)
3. Manual: Log in as a tenant user, visit /cockpit/leads — table shows real leads with Nome, WhatsApp, Status, Origem, Valor columns
4. Manual: Log in as user with no leads — empty state shown (not mock data)
</verification>

<success_criteria>
- /cockpit/leads page fetches real data from Supabase `leads` table filtered by authenticated user's tenant_id
- No mock data fallbacks remain in the page
- Unauthenticated users are redirected to /unauthorized
- Table displays all required CSV fields: Nome, WhatsApp (phone), Status, Origem, Valor Imovel
- Phone/WhatsApp field is searchable
- Orphan LeadsView.tsx removed
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/260401-hvt-implementar-busca-de-dados-reais-na-p-gi/260401-hvt-SUMMARY.md`
</output>
