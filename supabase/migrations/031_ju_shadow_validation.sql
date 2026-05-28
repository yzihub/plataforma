create table if not exists public.ju_shadow_comparisons (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null,
  tenant_id uuid null,
  conversation_id uuid null,
  input_payload jsonb not null default '{}'::jsonb,
  original_output text null,
  candidate_output text null,
  diff_payload jsonb not null default '{}'::jsonb,
  divergence_severity text not null default 'LOW',
  behavioral_score integer not null default 0,
  traces jsonb not null default '[]'::jsonb,
  timing jsonb not null default '{}'::jsonb,
  tool_usage jsonb not null default '{}'::jsonb,
  governance_decisions jsonb not null default '{}'::jsonb,
  calibration_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ju_shadow_comparisons_created_at_idx
  on public.ju_shadow_comparisons (created_at desc);

create index if not exists ju_shadow_comparisons_conversation_idx
  on public.ju_shadow_comparisons (conversation_id, created_at desc);

create index if not exists ju_shadow_comparisons_severity_idx
  on public.ju_shadow_comparisons (divergence_severity, created_at desc);

create table if not exists public.ju_shadow_fixtures (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null,
  tenant_id uuid null,
  conversation_id uuid null,
  tags text[] not null default '{}',
  input_payload jsonb not null default '{}'::jsonb,
  comparison_payload jsonb not null default '{}'::jsonb,
  candidate_output text null,
  created_at timestamptz not null default now()
);

create index if not exists ju_shadow_fixtures_created_at_idx
  on public.ju_shadow_fixtures (created_at desc);

create index if not exists ju_shadow_fixtures_tags_idx
  on public.ju_shadow_fixtures using gin (tags);
