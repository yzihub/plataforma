create table if not exists public.ju_cutover_audit_logs (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null,
  tenant_id uuid null,
  conversation_id uuid null,
  lead_id uuid null,
  responder text not null check (responder in ('n8n', 'kernel')),
  reason text not null,
  fallback_reasons text[] not null default '{}',
  divergence_score integer null,
  governance_score integer null,
  confidence_score integer null,
  safety_gates jsonb not null default '{}'::jsonb,
  runtime_traces jsonb not null default '[]'::jsonb,
  input_payload jsonb not null default '{}'::jsonb,
  kernel_output text null,
  original_output text null,
  tool_usage jsonb not null default '{}'::jsonb,
  governance_decisions jsonb not null default '{}'::jsonb,
  route_decision jsonb not null default '{}'::jsonb,
  sent_output text null,
  diff_payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  live_comparison boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ju_cutover_audit_logs_created_at_idx
  on public.ju_cutover_audit_logs (created_at desc);

create index if not exists ju_cutover_audit_logs_conversation_idx
  on public.ju_cutover_audit_logs (conversation_id, created_at desc);

create index if not exists ju_cutover_audit_logs_responder_idx
  on public.ju_cutover_audit_logs (responder, reason, created_at desc);

create table if not exists public.ju_pilot_overrides (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('move_to_n8n', 'move_to_kernel', 'freeze_rollout', 'pause_tenant', 'block_lead')),
  reason text null,
  tenant_id uuid null,
  conversation_id uuid null,
  lead_id uuid null,
  phone text null,
  operator_id text null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ju_pilot_overrides_lookup_idx
  on public.ju_pilot_overrides (active, tenant_id, lead_id, conversation_id, phone, created_at desc);

create table if not exists public.ju_pilot_response_samples (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null,
  conversation_id uuid null,
  lead_id uuid null,
  phone text null,
  tags text[] not null default '{}',
  pilot_decision jsonb not null default '{}'::jsonb,
  sent_output text null,
  created_at timestamptz not null default now()
);

create index if not exists ju_pilot_response_samples_tags_idx
  on public.ju_pilot_response_samples using gin (tags);

create index if not exists ju_pilot_response_samples_created_at_idx
  on public.ju_pilot_response_samples (created_at desc);
