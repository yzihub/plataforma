# Codebase Concerns

**Analysis Date:** 2026-05-05

## Jurema Brokers Manager Flow — Module Inventory

| Module | Route/Screen | Status | Real Data | Key Issues |
|--------|-------------|--------|-----------|-----------|
| **1. Corretores (Brokers)** | `/cockpit/corretores` | ✅ Implemented | Yes (API) | Missing deal assignment tracking; no metrics tied to performance |
| **2. Imóveis (Properties)** | `/cockpit/imoveis` | ✅ Implemented | Yes (API) | No filtering by broker/agent; no match scoring visible |
| **3. Leads** | `/cockpit/leads` | ✅ Implemented | Yes (API) | Generic CRM pipeline, NOT Jurema-specific; no deal_stage display |
| **4. CRM Pipeline** | `/cockpit/crm`, `/cockpit/pipeline` | ⚠️ Partial | Mock data | Uses hardcoded `cafePamData`; incompatible with Jurema schema |
| **5. Jurema Kanban** | `/cockpit/jurema` | ✅ Implemented | Yes (API) | Read-only; missing deal detail view; no deal_id → lead_id → broker lookups |
| **6. Conversas/Chat** | `/cockpit/chat` | ❌ Stub | Mock | Completely disabled; placeholder UI only |
| **7. Agendamentos (Appointments)** | `/cockpit/calendario` | ⚠️ Partial | Yes (API) | Events created but no property_id field; missing relationship to imovel |
| **8. Contratos (Contracts)** | `/cockpit/contratos` | ⚠️ Partial | Yes (API) | No link to jurema_property_matches; schema incomplete for Jurema workflow |
| **9. Financeiro (Commissions)** | `/cockpit/financeiro` | ❌ Stub | Mock | No commission calculation; comissoes table exists but not queried properly |

---

## Per-Module Concerns & Missing Relationships

### 1. Corretores (Brokers)

**Files:** `src/app/api/corretores/route.ts`, `src/components/yzihub/CorretoresClient.tsx`, `src/types/brokers.ts`

**What works:**
- API CRUD for `corretores` table ✓
- Lead assignment counting (counts leads where `assigned_to = broker_id`) ✓
- Status badge (ativo/inativo) ✓

**Critical gaps:**
- ❌ **No deal tracking** — `corretores` table has no field to count `jurema_deals` where `assigned_broker_id = corretor_id`
- ❌ **No performance metrics** — Missing: deals closed, commission earned, avg deal value
- ❌ **No relationship to jurema_appointments** — Can't see broker's scheduled visits/calls
- ❌ **No commission data visible** — `Financeiro` tab supposed to show commissions, but component doesn't load broker commission history
- ⚠️ **Missing imovel_count** — Can't see how many properties each broker specializes in

**Relation map (needed):**
```
corretores.id 
  ↔ jurema_deals.assigned_broker_id
  ↔ jurema_appointments.broker_id
  ↔ contracts.broker_id (missing in lookup)
  ↔ comissoes.broker_id (missing)
```

**Recommendation:** Add materialized view or cached field: `corretores.active_deals_count`, `corretores.commission_ytd`, `corretores.appointments_pending`.

---

### 2. Imóveis (Properties)

**Files:** `src/app/api/imoveis/route.ts`, `src/components/yzihub/ImoveisClient.tsx`, `src/types/properties.ts`

**What works:**
- Fetch from `imoveis` table with filters: `status_publicacao='Publicado'`, `status_operacional='disponivel'` ✓
- Grid + Table views ✓
- BRL formatting & metadata display ✓

**Critical gaps:**
- ❌ **No property ↔ deal tracking** — No visible `jurema_property_matches` relationships
- ❌ **No match score displayed** — `jurema_property_matches.match_score` not shown in card
- ❌ **No broker specialization filtering** — Manager can't filter "Show me properties managed by Broker X"
- ❌ **No "sold/reserved" status update** — Imovel stays "disponivel" even after contract signed
- ⚠️ **No contract link** — Manager can't navigate from property card to related contracts
- ⚠️ **Quartos field is TEXT, not NUMBER** — Can't sort by bedrooms; Ju's filter doesn't work accurately

**Relation map (needed):**
```
imoveis.id (aka imovel_id, aka id_imovel)
  ↔ jurema_property_matches.property_id (not visible in UI)
  ↔ contracts.imovel_id (missing lookup)
  ← jurema_deals.lead_score + intent + property_type (for match context)
```

**Recommendation:** 
- Add column to `imoveis`: `last_matched_deal_id`, `last_match_score` (updated by n8n on every match)
- Add badge on property card: "Matched 3 times" or "Matched with Fulano"
- Create "Property Details" modal showing all related matches + deals + contracts

---

### 3. Leads

**Files:** `src/app/cockpit/leads/page.tsx`, `src/components/yzihub/LeadsClient.tsx`, `src/lib/crm/types.ts`, `src/app/api/leads/route.ts`

**What works:**
- Fetch from `leads` table ✓
- Show `score`, `value`, `status`, `assigned_to` ✓
- Kanban by stage (but generic CRM stages, not Jurema-specific) ✓

**Critical gaps:**
- ❌ **Schema mismatch** — `leads` table is shared CRM (Café com Pam + Jurema). Jurema-specific fields in `types.ts` are UNUSED in actual queries
  - `bairro_interesse`, `objetivo`, `faixa_valor`, `imovel_ref` are defined in TypeScript but never fetched from DB
- ❌ **No deal_stage visibility** — Manager sees CRM `status` (new/contacted/won/lost) but NOT Jurema's `deal_stage` (qualificacao/corretor/visita)
- ❌ **Missing AI metadata** — Queries fetch `ai_status`, `ai_temperature`, `ai_last_intent` but UI doesn't display them
- ❌ **No Jurema filter** — Can't isolate "just Jurema leads" from other tenant leads
- ❌ **No lead ↔ deal join** — When manager clicks a lead, doesn't show related `jurema_deal`

**Relation map (needed):**
```
leads.id (global CRM lead)
  ↔ jurema_deals.lead_id (Jurema-specific deal, has stage/score/broker)
  ↔ contracts.lead_id (but type is wrong; should join through deal)
```

**Recommendation:**
- Separate views: `/cockpit/leads` (generic CRM) and `/cockpit/jurema-leads` (Jurema-only, showing deal_stage + lead_score from `jurema_deals`)
- Add **Lead → Deal modal**: clicking lead ID in jurema view opens deal detail (see Jurema Kanban)
- Update `LeadDrawer` to show `if deal exists → link to deal stage`

---

### 4. CRM Pipeline

**Files:** `src/app/cockpit/pipeline/page.tsx`, `src/app/cockpit/crm/page.tsx`, `src/lib/crm/mock-data.ts`

**What works:**
- Renders pipeline stages + leads ✓
- Kanban board with drag-drop (in PipelineClient) ✓

**Critical gaps:**
- ❌ **USES MOCK DATA AS FALLBACK** — Line 19-24 in `pipeline/page.tsx`:
  ```typescript
  const fallback = {
    leads: cafePamData.leads,  // HARDCODED, not current tenant
    stages: cafePamData.stages, // HARDCODED
  ```
  If any query fails, manager sees fake "Café com Pam" pipeline data, not Jurema
- ❌ **CRM and Jurema mixed** — Pipeline is for generic CRM (Café com Pam uses this). Jurema has its own Kanban board at `/cockpit/jurema`. No reconciliation.
- ❌ **No Jurema stage mapping** — Jurema's 9 stages (qualificacao → fechamento) are NOT in `pipeline_stages` table (which has generic CRM stages like "contacted", "won")
- ⚠️ **Broken broker assignment** — Line 62-67 fetches brokers but only for display; doesn't update lead.assigned_to

**Relation map issue:**
```
This pipeline uses:
  leads (generic)
  ↔ pipeline_stages (generic CRM stages, not Jurema stages)
  ↔ brokers (but only for display)

Jurema pipeline is separate:
  jurema_deals
  ↔ STAGES (hardcoded in JuremaKanbanClient, not in DB)
  ↔ brokers (via assigned_broker_id)
```

**Recommendation:**
- **DO NOT USE MOCK DATA in production** — Remove fallback or log error + show empty state
- Create DB table for Jurema stages (or migrate to `pipeline_stages` with tenant-specific stage sets)
- Reconcile: Both pipelines should use same data model OR clearly separate by tenant in routing

---

### 5. Jurema Kanban

**Files:** `src/app/cockpit/jurema/page.tsx`, `src/components/yzihub/JuremaKanbanClient.tsx`

**What works:**
- Fetches `jurema_deals` table ✓
- Displays cards with: client_name, lead_score, intent, property_type, budget, broker_status ✓
- Stage columns with counts ✓
- KPI strip (total deals, hot leads, awaiting broker) ✓
- Search by name/phone/location ✓

**Critical gaps:**
- ❌ **Read-only, no deal detail view** — Clicking a card does NOTHING. Manager can't see:
  - Full lead details (email, phone, address)
  - missing_fields (what info is still needed?)
  - qualification_status breakdown
  - Linked appointments/visits
  - Linked contracts
  - Property matches sent
- ❌ **No lead_id → lead join** — Kanban shows `client_name` from deal, but no way to jump to original lead record
- ❌ **Stages hardcoded** — STAGES array in component, not from DB. If Ju changes stage names, code breaks
- ❌ **No metadata.missing_fields display** — Backend sends `missing_fields` array in metadata, but UI ignores it
- ❌ **No broker assignment UI** — `broker_status` shown but can't reassign broker from Kanban
- ⚠️ **Missing lead → property matches link** — No way to see "which imoveis were sent to this deal?"

**Relation map (needed):**
```
jurema_deals.id (the deal card)
  → leads.id (via deal.lead_id) — for contact details
  → corretores.id (via deal.assigned_broker_id) — for broker name
  ← jurema_property_matches (all matches sent to this deal)
  ← jurema_appointments (all visits scheduled for this deal)
  ← contracts.project_id (if contract exists for this deal)
```

**Recommendation:**
- Add **Deal Detail Drawer**: shows deal + linked lead + matches + appointments + contracts
- Move STAGES to DB table `jurema_stages` or config table with tenant_id
- Show `metadata.missing_fields` as red badges on card
- Add "Assign Broker" button → modal to reassign from deal view

---

### 6. Conversas/Chat

**Files:** `src/app/cockpit/chat/page.tsx`

**What works:**
- Route exists ✓

**Critical gaps:**
- ❌ **Completely disabled** — Page is stub with greyed-out input
- ❌ **No message storage** — No `conversations` or `messages` table evident
- ❌ **No Evolution integration visible** — Even though Evolution WhatsApp client exists, chat page doesn't use it
- ❌ **No lead ↔ conversation link** — Can't see chat history with a specific lead
- ❌ **No broker ↔ customer conversation** — Chat history not tied to lead/deal/broker workflow

**Recommendation:** Defer chat until Evolution integration is clearer. If needed:
- Create `conversations` table with `lead_id`, `broker_id`, `tenant_id`
- Create `messages` table with `conversation_id`, `sender_id` (lead or broker), `body`, `timestamp`
- Link Evolution incoming messages to conversation

---

### 7. Agendamentos (Appointments/Calendar)

**Files:** `src/app/cockpit/calendario/page.tsx`, `src/components/yzihub/Calendario/`, `src/app/api/appointments/route.ts`, `src/types/appointments.ts`

**What works:**
- Calendar UI with day/week/month views ✓
- Create appointment via `/api/appointments` POST ✓
- Fetch appointments via GET with `?upcoming=true` filter ✓
- Appointment types: visita, reuniao, retorno, consulta, outro ✓
- Status tracking: agendado → realizado ✓

**Critical gaps:**
- ❌ **No property_id field** — Appointment entity has `lead_id`, `broker_id` but NO `property_id` or `imovel_id`. When broker schedules a visit, can't specify which property is being visited.
- ❌ **No deal_id field** — Should link to `jurema_deals.id`, not just lead
- ❌ **No links visible** — Calendar shows appointment but can't click to see:
  - Related property details
  - Related deal/lead
  - Related broker profile
- ❌ **Google Calendar sync is incomplete** — Code mentions `integration_provider='google_calendar'` and `external_event_id`, but no working webhook to sync back changes
- ❌ **No appointment ↔ contract mapping** — After visit is done, manager should be able to create contract from appointment. No link.

**Relation map (needed):**
```
appointments.id
  ✓ lead_id → leads.id
  ✓ broker_id → corretores.id
  ❌ MISSING: imovel_id → imoveis.id
  ❌ MISSING: deal_id → jurema_deals.id
  ❌ MISSING: contract_id → contracts.id (for visits tied to specific contract)
```

**Recommendation:**
- Add `imovel_id` and `deal_id` (nullable) fields to `appointments` table
- Create appointment detail modal showing property + deal + broker details
- Add "Create Contract from this visit" button in appointment detail
- Implement webhook to sync Google Calendar changes back to `appointments.updated_at`

---

### 8. Contratos (Contracts)

**Files:** `src/app/cockpit/contratos/page.tsx`, `src/components/yzihub/Contratos/`, `src/app/api/contracts/route.ts`, `src/types/contracts.ts`

**What works:**
- CRUD for `contracts` table ✓
- Status tracking: draft → sent → signed ✓
- Contract templates + editor UI ✓
- Value + type (venda/locacao/servico/parceria) ✓

**Critical gaps:**
- ❌ **Incomplete schema** — `contracts` table has fields but relationships are unclear:
  - `lead_id` — which lead? (there can be multiple leads involved)
  - `project_id` — deprecated, being phased out
  - `imovel_id` — good, but not always populated
  - `broker_id` — optional; who signed it?
  - Missing: `jurema_deal_id` — should clearly link to the deal this contract closes
- ❌ **No property_id → imovel display** — Manager sees contract value but can't click to see which property it's for
- ❌ **No deal ↔ contract link** — In Jurema Kanban, no way to see "does this deal have a contract?"
- ❌ **No appointment ↔ contract** — After visit, no way to auto-generate contract from visit notes
- ❌ **Commission not calculated** — `comissoes` table exists, but:
  - No trigger to create commission record when contract signed
  - No formula for percentual based on contract value
  - Manager can't see commission status on contract card
- ❌ **No contract PDF download** — Route `/api/contracts/[id]/pdf` exists but returns 500 (TODO: not implemented)
- ⚠️ **No signature workflow** — Contract has `signed_at` but no `signed_by_user_id` or signature proof

**Relation map (needed):**
```
contracts.id
  ✓ lead_id → leads.id
  ✓ imovel_id → imoveis.id
  ✓ broker_id → corretores.id
  ❌ MISSING: deal_id → jurema_deals.id (should always exist for Jurema contracts)
  ❌ MISSING: appointment_id → appointments.id (optional; if contract from visit)
  ↔ comissoes.contract_id ← (commission records waiting for contract)
```

**Recommendation:**
- Add `deal_id` (non-nullable for Jurema tenant) to `contracts`
- Create contract detail modal linking to deal + property + broker + appointments
- Add trigger: `ON contracts.status = 'signed'` → auto-insert row into `comissoes` with `status = 'pendente'`
- Implement PDF generation (via Puppeteer or docx library)
- Show commission status badge on contract card

---

### 9. Financeiro (Financial / Commissions)

**Files:** `src/app/cockpit/financeiro/page.tsx`, `src/components/yzihub/Financeiro/FinanceiroClient.tsx`

**What works:**
- Route exists ✓
- UI structure with KPI cards (contracts by stage) ✓

**Critical gaps:**
- ❌ **Comissoes tab completely disconnected** — Sidebar links to `/cockpit/financeiro?tab=comissoes` but:
  - No Supabase query for `comissoes` table in FinanceiroClient
  - Component tries to load `.from("comissoes")` but logic incomplete (line ~108)
- ❌ **No commission calculation** — No formula for percentual; defaults to 0
- ❌ **No payment tracking** — Commission has `status` field but no `payment_date`, `payment_method`, `paid_at`
- ❌ **No broker commission breakdown** — Manager can't see "Broker X earned R$ Y this month"
- ❌ **No contract ↔ commission link** — Table shows `contract_id` but can't click to see related contract
- ❌ **No Asaas/payment integration** — Commissions marked "paid" but no integration with Asaas or payment processor
- ⚠️ **No commission approval workflow** — Direct signed → auto-paid. Should have approval step?

**Table schema issue:**
```
contracts.id → value (R$ amount)
  ↔ comissoes.contract_id
  ❌ comissoes table structure is unclear:
     - percentual: what's the formula?
     - valor: calculated as contract.value * percentual / 100?
     - status: who updates it? When?
     - payment_date: who sets it?
```

**Recommendation:**
- Create commission detail view showing:
  - Broker name + ID
  - Total contract value
  - Commission % (should come from broker profile or config)
  - Commission value (auto-calculated)
  - Payment status (pendente → pago)
- Add broker commission roll-up: `SELECT SUM(comissoes.valor) WHERE status='pago' GROUP BY broker_id`
- Integrate with Asaas: `POST /api/comissoes/{id}/pagar` → creates Asaas transfer

---

## Cross-Cutting Technical Debt

### 1. Missing DB Relationships & Foreign Keys

**Issue:** Many lookups require multi-step queries or rely on naming conventions instead of ForeignKey constraints.

**Files affected:** All API routes, all query files

**Examples:**
- `jurema_deals.assigned_broker_id` → `corretores.id` (no FK defined)
- `contracts.imovel_id` → `imoveis.id` (no FK defined)
- `contracts.deal_id` → `jurema_deals.id` (field doesn't exist yet)
- `appointments.imovel_id` → `imoveis.id` (field missing)

**Fix approach:**
- Add `FOREIGN KEY` constraints in migrations
- Add `ON DELETE CASCADE` or `ON DELETE SET NULL` rules
- Update Supabase RLS policies to handle new FKs

---

### 2. Hardcoded Tenant IDs in API Routes

**Issue:** Dev bypass logic allows hardcoded tenant IDs to bypass auth in development.

**Files:** `src/app/api/imoveis/route.ts`, `src/app/api/contracts/route.ts`, `src/app/cockpit/jurema/page.tsx`

**Example (line 5-6):**
```typescript
const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";
if (isDevBypass && process.env.NEXT_PUBLIC_DEV_BYPASS === "true") {
  tenantId = DEV_JUREMA_TENANT_ID; // HARDCODED
}
```

**Risk:** If `NEXT_PUBLIC_DEV_BYPASS` is accidentally left `true` in production, all users see Jurema data regardless of their real tenant.

**Fix approach:**
- Remove dev bypass from production
- Use explicit test account in CI/CD instead
- Add CI check: fail if any `DEV_*_TENANT_ID` found in main branch

---

### 3. Mock Data as Fallback in Production

**Issue:** CRM Pipeline page uses hardcoded `cafePamData` when query fails.

**Files:** `src/app/cockpit/pipeline/page.tsx`, `src/lib/crm/mock-data.ts`

**Example (lines 19-24):**
```typescript
const fallback = {
  leads: cafePamData.leads,  // If query fails, manager sees fake data
  stages: cafePamData.stages,
};
```

**Risk:** Manager doesn't realize data is stale/fake. Makes decisions based on incorrect pipeline.

**Fix approach:**
- Log query errors to observabilidade
- Show error banner instead of silent fallback
- Return empty state (`leads: []`, `stages: []`) instead of mock data

---

### 4. Jurema Stages Hardcoded in Component

**Issue:** 9 Jurema stages defined in TypeScript array, not in database.

**Files:** `src/components/yzihub/JuremaKanbanClient.tsx` (lines 35-45)

**Risk:** If backend changes stage names, UI doesn't update. No audit trail of stage renames.

**Fix approach:**
- Create `jurema_stages` or `pipeline_stages` with `tenant_id` + `stage_name` + `order`
- Load stages on page mount
- Cache with 1-hour TTL

---

### 5. Missing Field: N8n Payload Standardization

**Issue:** `toN8nContract()`, `toN8nLead()`, `toN8nImovel()` functions map fields inconsistently.

**Files:** `src/types/n8n-payloads.ts`

**Examples:**
- Contract: `imovel_id` vs `project_id` (both exist, confusing)
- Lead: `phone` vs `phone_normalized` (which should be used?)
- Imovel: `quartos` is TEXT, but function doesn't validate integer

**Fix approach:**
- Document canonical field names for each entity
- Add TypeScript validation (Zod schema)
- Add unit tests for each `toN8n*()` function

---

### 6. Chat Completely Disabled

**Issue:** `/cockpit/chat` is a stub page. No message storage, no Evolution integration.

**Files:** `src/app/cockpit/chat/page.tsx`

**Risk:** Users expect to chat with leads; instead they get disabled UI.

**Fix approach:**
- Either implement chat (create `conversations` + `messages` tables, integrate Evolution), OR
- Remove from sidebar until ready
- Add roadmap note: "Chat coming Q3 2026"

---

### 7. PDF Generation Not Implemented

**Issue:** Contract PDF download route returns 500 error.

**Files:** `src/app/api/contracts/[id]/pdf/route.ts` (line 5, TODO comment)

**Risk:** Manager can't download signed contract for records.

**Fix approach:**
- Use `html-pdf` or `puppeteer` library
- Render contract template to HTML, convert to PDF
- Store PDF in Supabase storage, return download link

---

### 8. Commission Calculation Missing

**Issue:** No formula to calculate commission value from contract value + broker commission %.

**Files:** `src/components/yzihub/Financeiro/FinanceiroClient.tsx`

**Risk:** Manager sees commission table but values are 0 or manually entered.

**Fix approach:**
- Add `commission_percentual` field to `corretores` table (default 10%)
- Create trigger: `ON contracts status='signed'` → insert into `comissoes` with `valor = contract.value * corretores.commission_percentual / 100`
- Show formula in UI: "Broker gets 10% of R$ 500k = R$ 50k"

---

### 9. Lead → Deal Relationship Unclear

**Issue:** A lead can exist in `leads` table (global CRM) AND have a row in `jurema_deals` (Ju-specific). No clear join pattern.

**Files:** All CRM components, Jurema components

**Risk:** Manager sees lead in one view, deal in another, doesn't realize they're the same person.

**Fix approach:**
- **Option A (recommended):** In Jurema views, always join `leads` + `jurema_deals` on `lead_id`. Show both CRM status + Jurema stage.
- **Option B:** Separate Jurema leads into isolated view, hide from generic leads list.
- Consistency: Pick ONE pattern across all components.

---

### 10. Imovel ID Field Inconsistency

**Issue:** Property has three ID fields: `id`, `id_imovel`, `external_id`. Code uses them inconsistently.

**Files:** `src/components/yzihub/ImoveisClient.tsx` (line 44), `src/types/n8n-payloads.ts`, contracts table

**Risk:** Lookups fail when wrong ID is used. Property matches by `id` but some APIs expect `id_imovel`.

**Fix approach:**
- Document: `id` = internal UUID, `id_imovel` = WordPress export ID, `external_id` = legacy reference
- Use ONLY `id` for internal queries
- Store `id_imovel` in `metadata` or `external_id` field, never as primary lookup

---

## Test Coverage Gaps

**Critical areas with no/low test coverage:**

| Area | Files | Risk | Priority |
|------|-------|------|----------|
| Jurema deal stage transitions | `JuremaKanbanClient.tsx` | Deal stuck in wrong stage | HIGH |
| Commission calculation | `FinanceiroClient.tsx` | Wrong payout amount | HIGH |
| Contract PDF generation | `[id]/pdf/route.ts` | No downloadable proof | HIGH |
| Broker assignment workflows | Multiple | Lead lost to unassigned broker | MEDIUM |
| Property ↔ Deal matching | `ImoveisClient.tsx` → `/api/imoveis` | Match not sent to right lead | MEDIUM |
| Appointment creation | `appointments/route.ts` | Visit scheduled for wrong time | MEDIUM |
| Multi-tenant isolation | API routes | Jurema manager sees Café com Pam data | CRITICAL |

---

## Fragile Areas & Safe Modification Guide

### JuremaKanbanClient (Read-only, High Risk if Modified)

**Why fragile:**
- Hardcoded stage definitions
- No error handling for missing fields
- Assumes `metadata.qualification_status` exists

**Safe way to enhance:**
- Add modal component as sibling (not inside card)
- Use React portals for drawer
- Keep all deal mutations in parent or separate hook

---

### Contracts/Comissoes Table (Incomplete, Medium Risk)

**Why fragile:**
- Schema not finalized for Jurema workflow
- No migrations yet defining `deal_id` field
- Trigger for auto-insert commission doesn't exist

**Safe way to extend:**
- Add migration file: `migrations/022_contracts_jurema_extend.sql`
- Create trigger in migration, not in app code
- Test migration rollback before merging

---

### Financeiro Components (Stub Implementation, High Risk)

**Why fragile:**
- Commission calculation disconnected from contract values
- UI assumes comissoes table is populated, but no data flow
- Tab switching between "Geral" and "Comissoes" uses query params (brittle)

**Safe way to fix:**
- Implement full commission flow first (trigger, calculation)
- Then wire UI to query real data
- Add error boundaries around comissoes section

---

## Scaling Limits

**No immediate capacity issues, but:**

| Resource | Current | Limit | When it breaks |
|----------|---------|-------|----------------|
| Jurema deals per tenant | ~100 | ~10k | Deal list query becomes slow |
| Properties published | ~50 | ~1k | Grid view renders slow; filtering needed |
| Appointments per month | ~30 | ~500 | Calendar rendering lags |
| Contracts per tenant | ~20 | ~1k | Table pagination needed |
| Corretores per tenant | ~5 | ~100 | Dropdown becomes unwieldy |

**Current mitigation:** None. As Jurema scales, add:
- Pagination to all tables
- Debounced search
- Materialized views for aggregates (KPIs)

---

## Dependencies at Risk

**No critical package mismatches detected.**

### Minor risks:

- **Next.js 16 + Turbopack SVG issue** (from memory: `@svgr/webpack` hangs during build)
  - **Mitigation:** Use `--webpack` flag in dev script (already in use)
  
- **Supabase RLS policies**: If anyone adds a new table without RLS, data leaks across tenants
  - **Mitigation:** Add pre-commit hook to check RLS enabled on all public tables

---

## Summary: Jurema Manager Operability Status

**Can a Jurema manager actually use the system to manage deals end-to-end?**

| Step | Status | Blocker? |
|------|--------|----------|
| View all leads/deals | ✅ Partial | ⚠️ No detail view; read-only |
| Assign broker to deal | ❌ Not in UI | YES |
| See broker performance (deals closed, revenue) | ❌ Missing metrics | YES |
| Manage property catalog | ✅ Yes | ⚠️ No link to matches |
| Send properties to leads | ❌ Not visible | YES |
| Schedule property visits | ✅ Yes | ⚠️ Property ID not tracked |
| Track visit completion | ✅ Partial | ⚠️ No link to contract |
| Create + sign contracts | ✅ Yes | ⚠️ No property context |
| Calculate broker commissions | ❌ Not working | YES |
| Pay out commissions | ❌ Not connected | YES |
| Report on pipeline metrics | ✅ KPI cards exist | ⚠️ Some metrics missing |

**Conclusion:** System is ~40% ready for Jurema manager operations. Must implement:
1. Deal detail view (shows all linked data)
2. Broker assignment UI + performance metrics
3. Property ↔ match visibility
4. Commission calculation + payouts
5. Contract PDF generation

---

*Concerns audit: 2026-05-05*
