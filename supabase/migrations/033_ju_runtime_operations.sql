create table if not exists public.ju_runtime_cost_audits (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null unique,
  tenant_id uuid null,
  conversation_id uuid null,
  lead_id uuid null,
  funnel_stage text not null,
  inbound_tokens integer not null default 0,
  outbound_tokens integer not null default 0,
  retrieval_tokens integer not null default 0,
  tool_tokens integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  estimated_cost_usd numeric(12, 6) not null default 0,
  context_chars integer not null default 0,
  context_truncated boolean not null default false,
  tool_count integer not null default 0,
  orchestration_passes integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ju_runtime_cost_audits_created_at_idx
  on public.ju_runtime_cost_audits (created_at desc);

create index if not exists ju_runtime_cost_audits_conversation_idx
  on public.ju_runtime_cost_audits (conversation_id, created_at desc);

create index if not exists ju_runtime_cost_audits_lead_idx
  on public.ju_runtime_cost_audits (lead_id, created_at desc);

create index if not exists ju_runtime_cost_audits_stage_idx
  on public.ju_runtime_cost_audits (funnel_stage, created_at desc);

create table if not exists public.ju_runtime_edge_case_queue (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null unique,
  tenant_id uuid null,
  conversation_id uuid null,
  lead_id uuid null,
  reasons text[] not null default '{}',
  severity text not null default 'LOW',
  payload jsonb not null default '{}'::jsonb,
  reviewed boolean not null default false,
  reviewed_by text null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists ju_runtime_edge_case_queue_created_at_idx
  on public.ju_runtime_edge_case_queue (created_at desc);

create index if not exists ju_runtime_edge_case_queue_reviewed_idx
  on public.ju_runtime_edge_case_queue (reviewed, severity, created_at desc);

create index if not exists ju_runtime_edge_case_queue_reasons_idx
  on public.ju_runtime_edge_case_queue using gin (reasons);
