-- Exact database contract used by scripts/ju-behavioral-e2e-curl.js.
-- The runner does not write to a table named ju_behavioral_audits.
-- Required tables:
--   ju_behavioral_audit_runs
--   ju_behavioral_audit_scenarios
--   ju_behavioral_audit_turns
--   ju_behavioral_audit_tool_calls

create extension if not exists pgcrypto;

create table if not exists public.ju_behavioral_audit_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  endpoint text not null,
  suite_version text not null default 'ju_behavioral_e2e_v1',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  dry_run boolean not null default false,
  average_score numeric,
  passed boolean,
  regression_detected boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ju_behavioral_audit_runs_run_id_key unique (run_id)
);

create table if not exists public.ju_behavioral_audit_scenarios (
  id uuid primary key default gen_random_uuid(),
  run_id text not null references public.ju_behavioral_audit_runs(run_id) on delete cascade,
  scenario_id text not null,
  scenario_name text not null,
  persona text not null,
  emotional_context text not null,
  source_channel text not null,
  lead_origin jsonb not null default '{}'::jsonb,
  expected_behavior jsonb not null default '[]'::jsonb,
  anti_patterns jsonb not null default '[]'::jsonb,
  validation_checklist jsonb not null default '[]'::jsonb,
  scoring_rubric jsonb not null default '{}'::jsonb,
  score numeric,
  passed boolean,
  critical_violations integer not null default 0,
  warning_violations integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ju_behavioral_audit_scenarios_run_scenario_key unique (run_id, scenario_id)
);

create table if not exists public.ju_behavioral_audit_turns (
  id uuid primary key default gen_random_uuid(),
  run_id text not null references public.ju_behavioral_audit_runs(run_id) on delete cascade,
  scenario_id text not null,
  turn_index integer not null,
  input_payload jsonb not null,
  generated_context jsonb,
  user_message text not null,
  expected_stage text,
  expected_tool_required boolean not null default false,
  expected_retrieval_required boolean not null default false,
  raw_response jsonb,
  ai_final_response text,
  http_status integer,
  latency_ms integer,
  behavioral_score numeric,
  violations jsonb not null default '[]'::jsonb,
  positives jsonb not null default '[]'::jsonb,
  memory_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ju_behavioral_audit_turns_run_scenario_turn_key unique (run_id, scenario_id, turn_index)
);

create table if not exists public.ju_behavioral_audit_tool_calls (
  id uuid primary key default gen_random_uuid(),
  run_id text not null references public.ju_behavioral_audit_runs(run_id) on delete cascade,
  scenario_id text not null,
  turn_index integer not null,
  tool_name text not null,
  tool_input jsonb not null default '{}'::jsonb,
  tool_output jsonb not null default '{}'::jsonb,
  ranking_summary jsonb not null default '{}'::jsonb,
  card_payloads jsonb not null default '[]'::jsonb,
  url_count integer not null default 0,
  valid_url_count integer not null default 0,
  hallucinated_url_count integer not null default 0,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_ju_behavioral_audit_runs_started_at
  on public.ju_behavioral_audit_runs(started_at desc);

create index if not exists idx_ju_behavioral_audit_runs_passed
  on public.ju_behavioral_audit_runs(passed, regression_detected);

create index if not exists idx_ju_behavioral_audit_scenarios_run_id
  on public.ju_behavioral_audit_scenarios(run_id);

create index if not exists idx_ju_behavioral_audit_scenarios_score
  on public.ju_behavioral_audit_scenarios(score);

create index if not exists idx_ju_behavioral_audit_turns_run_scenario
  on public.ju_behavioral_audit_turns(run_id, scenario_id, turn_index);

create index if not exists idx_ju_behavioral_audit_turns_score
  on public.ju_behavioral_audit_turns(behavioral_score);

create index if not exists idx_ju_behavioral_audit_turns_http_status
  on public.ju_behavioral_audit_turns(http_status);

create index if not exists idx_ju_behavioral_audit_tool_calls_run_turn
  on public.ju_behavioral_audit_tool_calls(run_id, scenario_id, turn_index);

create index if not exists idx_ju_behavioral_audit_tool_calls_name
  on public.ju_behavioral_audit_tool_calls(tool_name);

create or replace view public.ju_behavioral_audit_dashboard as
select
  r.run_id,
  r.started_at,
  r.finished_at,
  r.endpoint,
  r.average_score,
  r.passed,
  r.regression_detected,
  r.metadata,
  s.scenario_id,
  s.scenario_name,
  s.source_channel,
  s.score as scenario_score,
  s.passed as scenario_passed,
  s.critical_violations,
  s.warning_violations,
  count(t.id) as turn_count,
  avg(t.latency_ms) as avg_latency_ms,
  avg(t.behavioral_score) as avg_turn_score,
  sum(case when t.expected_tool_required then 1 else 0 end) as tool_required_turns,
  sum(case when t.expected_retrieval_required then 1 else 0 end) as retrieval_required_turns,
  count(tc.id) as tool_call_count
from public.ju_behavioral_audit_runs r
join public.ju_behavioral_audit_scenarios s
  on s.run_id = r.run_id
left join public.ju_behavioral_audit_turns t
  on t.run_id = s.run_id
 and t.scenario_id = s.scenario_id
left join public.ju_behavioral_audit_tool_calls tc
  on tc.run_id = t.run_id
 and tc.scenario_id = t.scenario_id
 and tc.turn_index = t.turn_index
group by
  r.run_id,
  r.started_at,
  r.finished_at,
  r.endpoint,
  r.average_score,
  r.passed,
  r.regression_detected,
  r.metadata,
  s.scenario_id,
  s.scenario_name,
  s.source_channel,
  s.score,
  s.passed,
  s.critical_violations,
  s.warning_violations;

alter table public.ju_behavioral_audit_runs enable row level security;
alter table public.ju_behavioral_audit_scenarios enable row level security;
alter table public.ju_behavioral_audit_turns enable row level security;
alter table public.ju_behavioral_audit_tool_calls enable row level security;
