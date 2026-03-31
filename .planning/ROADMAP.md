# Roadmap: YZIHUB YZI-OS Growth Engine

## Overview

Brownfield continuation of YZI-OS — the multi-tenant SaaS for high-ticket commercial automation. The kernel, auth scaffold, and main Cockpit pages exist. Remaining work covers: unlocking real tenant access, connecting CRM pages to live Supabase data, building two new Cockpit modules (Imóveis + Financeiro), wiring up Action Flow end-to-end, automating tenant provisioning via YZI FACTORY, and hardening the Vercel deploy for production.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Access & Auth** - Provision real tenant logins and harden proxy routing with tenant isolation
- [ ] **Phase 2: Cockpit CRM Live Data** - Connect Leads and Pipeline pages to real Supabase data per tenant
- [ ] **Phase 3: New Cockpit Pages** - Build Imóveis (Jurema Brokers) and Financeiro modules following Lei da Variedade Visual
- [ ] **Phase 4: Action Flow** - Wire CommandButtons → POST /api/actions/execute → job_queue → n8n webhook end-to-end
- [ ] **Phase 5: YZI FACTORY** - Automate tenant provisioning: Ativar Projeto triggers n8n → Evolution API → WhatsApp agent live
- [ ] **Phase 6: Deploy & Infra** - Stable Vercel production deploy with correct env vars, Supabase migrations and RLS validated

## Phase Details

### Phase 1: Access & Auth
**Goal**: Real tenant users can log in and reach their Cockpit; routing enforces tenant isolation; admin retains unrestricted control access
**Depends on**: Nothing (brownfield — existing kernel is the foundation)
**Requirements**: PROV-01, PROV-02, PROV-03, PROV-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. juremabrokers@gmail.com logs in and lands on /cockpit seeing only Jurema Brokers data
  2. contatocafecompam@gmail.com logs in and lands on /cockpit seeing only Café com Pam data
  3. Any email not present in `profiles` is redirected to /unauthorized
  4. Admin (Eric) can access /control without tenant restriction
  5. Session persists after browser refresh without re-login
**Plans**: TBD
**UI hint**: yes

### Phase 2: Cockpit CRM Live Data
**Goal**: Leads and Pipeline pages display real data from Supabase for the logged-in tenant, with functional interactions
**Depends on**: Phase 1
**Requirements**: LEAD-01, LEAD-02, LEAD-03, LEAD-04, PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05
**Success Criteria** (what must be TRUE):
  1. LeadsDataTable shows the logged-in tenant's actual leads from Supabase (not mock data)
  2. Café com Pam sees their 5-stage pipeline; Jurema Brokers sees their 6-stage pipeline — never each other's
  3. Dragging a card between pipeline columns persists the stage change in Supabase
  4. Clicking a lead row opens the drawer with full lead details
  5. CommandButtons on leads and pipeline cards are present and trigger action flow (dispatches POST /api/actions/execute)
**Plans**: TBD
**UI hint**: yes

### Phase 3: New Cockpit Pages
**Goal**: Imóveis page is live for Jurema Brokers and Financeiro page is live for all tenants, both following Lei da Variedade Visual
**Depends on**: Phase 2
**Requirements**: IMOV-01, IMOV-02, IMOV-03, IMOV-04, FIN-01, FIN-02, FIN-03, FIN-04
**Success Criteria** (what must be TRUE):
  1. Jurema Brokers tenant sees /cockpit/imoveis in navigation; other tenants do not (feature_flag gate)
  2. Imóveis page renders a data table of property listings; clicking a row opens a drawer with endereço, valor, status
  3. /cockpit/financeiro renders KPI cards (faturamento total, ticket médio, conversão) above a transaction table
  4. Financeiro period filter (semana / mês / custom) updates both KPIs and table correctly
**Plans**: TBD
**UI hint**: yes

### Phase 4: Action Flow
**Goal**: Any CommandButton action travels the full path from frontend through API to job_queue to n8n and back, updating lead/pipeline state
**Depends on**: Phase 2
**Requirements**: ACT-01, ACT-02, ACT-03, ACT-04
**Success Criteria** (what must be TRUE):
  1. POST /api/actions/execute with a valid {tenant_id, action, lead_id} payload returns success and creates a row in job_queue
  2. A new job_queue row triggers the n8n webhook within expected latency
  3. n8n processes the action and the lead or pipeline card reflects the updated status in Supabase
**Plans**: TBD

### Phase 5: YZI FACTORY
**Goal**: Clicking "Ativar Projeto" for a new tenant in YZI CONTROL triggers fully automated provisioning — WhatsApp agent live with no manual infra steps
**Depends on**: Phase 4
**Requirements**: FACT-01, FACT-02, FACT-03, FACT-04
**Success Criteria** (what must be TRUE):
  1. Clicking "Ativar Projeto" in YZI CONTROL dispatches the n8n provisioning webhook without manual intervention
  2. n8n creates a new Evolution API instance linked to the correct tenant_id
  3. The AI agent (Nina or Luana) becomes active on WhatsApp Business Cloud after provisioning completes
  4. Admin (Eric) can see real-time provisioning status in YZI CONTROL without refreshing
**Plans**: TBD

### Phase 6: Deploy & Infra
**Goal**: Production Vercel deploy is stable and correct; Supabase is fully migrated and RLS enforces tenant isolation in production
**Depends on**: Phase 1
**Requirements**: DEPL-01, DEPL-02, DEPL-03
**Success Criteria** (what must be TRUE):
  1. Vercel production URL serves the app with all features functional (no missing env var errors)
  2. Supabase migrations 004 and 005 are applied in the production database
  3. A tenant can only read their own rows across all tables (RLS verified by cross-tenant query attempt)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Access & Auth | 0/TBD | Not started | - |
| 2. Cockpit CRM Live Data | 0/TBD | Not started | - |
| 3. New Cockpit Pages | 0/TBD | Not started | - |
| 4. Action Flow | 0/TBD | Not started | - |
| 5. YZI FACTORY | 0/TBD | Not started | - |
| 6. Deploy & Infra | 0/TBD | Not started | - |
