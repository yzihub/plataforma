create table if not exists public.ju_behavioral_qa_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null unique,
  tenant_id uuid null,
  phone text null,
  summary jsonb not null default '{}'::jsonb,
  report_markdown text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ju_behavioral_qa_runs_created_at_idx
  on public.ju_behavioral_qa_runs (created_at desc);

create index if not exists ju_behavioral_qa_runs_tenant_idx
  on public.ju_behavioral_qa_runs (tenant_id, created_at desc);

create index if not exists ju_behavioral_qa_runs_summary_idx
  on public.ju_behavioral_qa_runs using gin (summary);
