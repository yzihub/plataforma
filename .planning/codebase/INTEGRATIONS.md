# External Integrations

**Analysis Date:** 2026-05-05

## APIs & External Services

**YZI OS Backend Agents:**
- Nina Agent (Café com Pam) - Agent for consultoria pipeline
  - SDK/Client: Custom fetch via `src/lib/agents/` (planned implementation)
  - Endpoint: `POST https://yzi-os.yzihub.com/agent/nina`
  - Auth: None (public endpoint, tenant_id passed in body)
  - Used for: Lead creation, qualification, consultoria flow (Café com Pam)

- Jurema Agent (Ju) - Agent for real estate search and qualification
  - SDK/Client: `src/lib/agents/jurema.ts` - `sendMessageToJurema()`
  - Endpoint: `POST https://yzi-os.yzihub.com/agent/jurema`
  - Auth: None (public endpoint, tenant_id passed in body)
  - Environment: `NEXT_PUBLIC_YZI_API_URL`, `NEXT_PUBLIC_JUREMA_TENANT_ID`
  - Used for: Lead qualification, property search, deal stage management, scoring

**Evolution API - WhatsApp Integration:**
- Service: Evolution (WhatsApp instance management)
- Purpose: Connect, manage, and control WhatsApp business instance
- Base URL: `process.env.EVOLUTION_BASE_URL`
- API Key: `process.env.EVOLUTION_API_KEY`
- Instance Name: `process.env.EVOLUTION_INSTANCE_NAME`
- Server-only client: `src/lib/evolution/client.ts` (never exposed to browser)
- Endpoints:
  - `GET {baseUrl}/instance/connectionState/{instance}` - Get WhatsApp connection status
  - `POST {baseUrl}/instance/connect/{instance}` - Generate QR code for connection
  - `DELETE {baseUrl}/instance/logout/{instance}` - Disconnect WhatsApp instance
  - `POST {baseUrl}/message/sendText/{instance}` - Send WhatsApp message
  - `GET {baseUrl}/webhook/find/{instance}` - Get webhook configuration
- Frontend API routes: `src/app/api/evolution/*`
  - `/api/evolution/status` - GET instance status
  - `/api/evolution/qr` - POST generate QR code
  - `/api/evolution/disconnect` - DELETE logout
  - `/api/evolution/test-send` - POST test message send

## Data Storage

**Databases:**
- Supabase PostgreSQL (primary)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`
  - Client: `@supabase/supabase-js` (browser/anon key), `@supabase/ssr` (server)
  - Authentication: NEXT_PUBLIC_SUPABASE_ANON_KEY (public), SUPABASE_SERVICE_ROLE_KEY (admin only)

**Core Tables:**
- `profiles` - User profiles and tenant associations
  - Columns: id, tenant_id, created_at, updated_at
- `leads` - Global lead table for both tenants
  - Columns: id, tenant_id, name, email, phone, phone_normalized, source, status, score, value, assigned_to, notes, metadata, ai_status, ai_temperature, ai_last_summary, ai_last_intent, ai_qualified_at, ai_hot_at, corretor_id, created_at, updated_at
  - Used by: Both Nina (Café com Pam) and Jurema (Jurema Brokers)

**Jurema Brokers (82cc7aa9-fc6e-4f37-8d8e-8a71c1691361) Tables:**
- `jurema_deals` - Real estate deal opportunities
  - Columns: id, tenant_id, lead_id, deal_stage, qualification_status, client_name, client_phone, client_email, intent, property_type, location_preference, budget_min, budget_max, bedrooms, suites, parking_spots, purpose, timeline, payment_method, entry_amount, fgts_available, financing_approved, decision_maker, motivation, pain_point, lead_score, assigned_broker_id, broker_status, metadata, raw_payload, created_at, updated_at
  - Stages: qualificacao, perfil_busca, score, curadoria, corretor, visita, proposta, fechamento, nutricao, perdido
  - Qualification status: incompleto, frio, morno, quente, desqualificado
  - Broker status: nao_atribuido, aguardando_corretor, atribuido, em_atendimento, encerrado

- `imoveis` - Real estate properties catalog
  - Columns: id, tenant_id, id_imovel, titulo_comercial, titulo_seo, descricao_imovel, tipo_de_imovel, finalidade, bairro, quartos, suites, vagas, metragem, valor, foto_principal, link_do_imovel, link_sanitizado, imagem_card, status_publicacao, status_operacional, metadata, created_at, updated_at
  - Filters: status_publicacao = "Publicado", status_operacional = "disponivel"

- `jurema_property_matches` - Property suggestions/matches sent to deals
  - Columns: id, tenant_id, deal_id, property_id, property_source, match_score, match_reason, status, metadata, raw_payload, created_at, updated_at
  - Status: sugerido, enviado, interessado, descartado, visitado

- `jurema_appointments` - Visit and meeting scheduling
  - Columns: id, tenant_id, deal_id, property_id, broker_id, appointment_type, appointment_status, scheduled_at, scheduled_end_at, location_type, location_details, calendar_event_id, meet_link, metadata, raw_payload, created_at, updated_at

**Café com Pam (b179ae75-3d56-4de8-8840-fc9c4d9ec21e) Tables:**
- `cafe_pam_projects` - Consultoria project tracking
  - Columns: id, tenant_id, lead_id, project_stage, payment_status, booking_status, media_status, client_name, client_phone, payment_link_sent_at, payment_paid_at, booked_at, metadata, created_at, updated_at
  - Stages: qualificacao, cadastro, briefing, midias, pagamento, agendamento
  - Metadata fields: lead_source_context, entrypoint, plan_interest, briefing_complete, briefing_missing_fields, briefing_block_sent, id_agendamento, meet_link

- `cafe_pam_briefings` - Consultoria briefing details
  - Used for consultoria briefing questionnaire data

- `cafe_pam_payments` - Payment tracking for consultoria
  - Columns: id, tenant_id, project_id, provider, external_payment_id, asaas_payment_id, payment_link, payment_method, amount, status, payment_status, due_date, paid_at, failed_at, raw_payload, metadata, created_at, updated_at
  - Status values: pendente, link_enviado, pago, cancelado, falhou, expirado
  - Provider: asaas (payment processor)

**Shared Tables:**
- `corretores` - Real estate brokers/agents
  - Columns: id, tenant_id, name, phone, email, role, tipo, cpf, is_active, address, city, state, zip_code, bank, bank_agency, bank_account, bank_account_type, pix_key, pix_key_type, pix_beneficiary, notes, created_at, updated_at

- `contracts` - Sales and rental contracts
  - Columns: id, tenant_id, lead_id, broker_id, lead_name, project_id, imovel_id, project_name, corretor_name, title, type, status, value, signed_at, expires_at, created_at, updated_at
  - Types: venda, locacao
  - Status: draft, pending, signed, executed, cancelled, expired

- `appointments` - Calendar events (generic operational calendar)
  - Columns: id, tenant_id, title, appointment_type, status, lead_id, broker_id, start_at, end_at, location, description, integration_provider, integration_status, external_event_id, metadata, created_at, updated_at
  - Types: visita, reuniao, retorno, consulta, outro
  - Status: agendado, confirmado, realizado, cancelado, reagendado
  - Integration providers: google_calendar, n8n, null

- `agent_metrics_events` - Analytics and event tracking
  - Events: message_received, stage_changed, property_options_requested, property_search_failed, handoff_requested
  - Fields: agent_name (jurema, nina, etc.), project_id (deal_id for Jurema), event_type

**File Storage:**
- Local filesystem only (for DOCX parsing via mammoth library)
- No cloud storage integration detected (Supabase storage not used)

**Caching:**
- None detected - all queries direct to Supabase

## Authentication & Identity

**Auth Provider:**
- Supabase Authentication (custom OAuth integration)
- Magic link authentication via `src/app/auth/callback/route.ts`
- Google OAuth support (mentioned in comments)

**Implementation:**
- Server-side authentication via `@supabase/ssr` for Next.js 16
- Cookie-based session management (handled by proxy middleware in `src/proxy.ts`)
- Anon key for client, service role key for admin operations (server-side only)
- Multi-tenant: Tenant ID resolved from user profile on each request

**Authorization:**
- Row-level security (RLS) enforced by Supabase
- Admin operations use service_role key to bypass RLS (`src/lib/supabase/admin.ts`)
- Tenant scoping: All queries filter by resolved tenant_id from authenticated user

## Monitoring & Observability

**Error Tracking:**
- None detected - standard console.error logging

**Logs:**
- Structured JSON logging in webhook handler `src/app/api/webhook/imoveis/route.ts`
- Log entries: timestamp, level, event, tenant_id, trace_id, duration_ms, HTTP status
- Console output in JSON format for aggregation

**Metrics:**
- `agent_metrics_events` table stores agent activity events
- Events tracked: message_received, stage_changed, property_options_requested, property_search_failed, handoff_requested

## CI/CD & Deployment

**Hosting:**
- Vercel (primary target, referenced in NEXT_PUBLIC_APP_URL)

**Build:**
- Next.js 16 build pipeline
- TypeScript compilation
- ESLint validation

**CI Pipeline:**
- None explicitly configured (no GitHub Actions, CircleCI, or similar detected)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role (admin, server-only)
- `NEXT_PUBLIC_APP_URL` - App URL for auth redirects (http://localhost:3001 or https://xxx.vercel.app)
- `NEXT_PUBLIC_YZI_API_URL` - YZI OS backend base URL (https://yzi-os.yzihub.com)
- `NEXT_PUBLIC_CAFE_PAM_TENANT_ID` - Café com Pam tenant UUID
- `NEXT_PUBLIC_JUREMA_TENANT_ID` - Jurema Brokers tenant UUID
- `NEXT_PUBLIC_DEFAULT_TENANT_ID` - Default tenant for dev bypass

**Optional (for integrations):**
- `EVOLUTION_BASE_URL` - Evolution API base URL (for WhatsApp)
- `EVOLUTION_API_KEY` - Evolution API key
- `EVOLUTION_INSTANCE_NAME` - Evolution WhatsApp instance name
- `WEBHOOK_IMOVEIS_SECRET` - Bearer token for imoveis webhook validation
- `FACTORY_N8N_WEBHOOK_URL` - n8n factory webhook URL
- `NEXT_PUBLIC_DEV_BYPASS` - Development mode flag to skip auth (not in production)

**Secrets location:**
- `.env.local` - Local development (git-ignored)
- Vercel environment dashboard - Production/staging
- Service role key NEVER committed or exposed to browser

## Webhooks & Callbacks

**Incoming:**
- `POST /api/webhook/imoveis` - Webhook for property upsert/delete/unpublish events
  - Source: External property management system
  - Authentication: Bearer token via `Authorization` header (timing-safe comparison)
  - Events: imovel.upsert, imovel.delete, imovel.unpublish
  - Validation: Tenant whitelist, event type validation, field type validation
  - Logging: Structured JSON with trace_id for tracking

**Outgoing:**
- Evolution webhook configuration (via YZI OS backend, not direct from frontend)
  - Expected: `https://yzi-os.yzihub.com/webhook/evolution`
  - Purpose: Receive WhatsApp message events from Evolution API
  - Managed by: YZI OS backend, checked/validated by frontend status endpoint

## n8n Integration

**Purpose:**
- Operational workflow automation (not called directly by frontend for sensitive operations)

**Endpoints:**
- Factory activation webhook: `FACTORY_N8N_WEBHOOK_URL`
  - Route: `src/app/api/factory/activate/route.ts`
  - Purpose: Activate factory/operational workflows

**Managed by:**
- n8n workflows handle: payment link generation, Google Calendar integration, email notifications, contract generation triggers
- Frontend calls n8n indirectly via backend, never directly with sensitive data

## API Response Standards

**N8n Payload Format:**
- All data exports to n8n follow standard envelope (`src/types/n8n-payloads.ts`)
- Envelope: { entity: string, tenant_id: string, count: number, fetched_at: ISO8601, data: T[] }
- Entity types: leads, imoveis, contracts, properties
- Mapper functions: toN8nLead(), toN8nImovel(), toN8nContract(), toN8nProperty()

---

*Integration audit: 2026-05-05*
