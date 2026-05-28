-- P0.1 - Governance version + shadow decision baseline.
-- Additive only. Do not run directly in production before review/dry-run.

alter table public.ju_runtime_states
  add column if not exists governance_version text default 'p0_shadow_2026_05_27',
  add column if not exists owner_pipeline text default 'n8n',
  add column if not exists funnel_stage_canonical text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ju_runtime_states_owner_pipeline_check'
  ) then
    alter table public.ju_runtime_states
      add constraint ju_runtime_states_owner_pipeline_check
      check (owner_pipeline is null or owner_pipeline in ('n8n', 'pipeline_b', 'manual', 'unknown'))
      not valid;
  end if;
end $$;

alter table public.ju_runtime_states
  validate constraint ju_runtime_states_owner_pipeline_check;

create index if not exists idx_ju_runtime_states_governance_owner
  on public.ju_runtime_states(owner_pipeline, governance_version, updated_at desc);

create index if not exists idx_ju_runtime_states_funnel_stage_canonical
  on public.ju_runtime_states(tenant_id, funnel_stage_canonical, updated_at desc)
  where funnel_stage_canonical is not null;

create table if not exists public.ju_runtime_shadow_decisions (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null,
  request_id text null,
  tenant_id uuid null,
  conversation_id uuid null,
  lead_id uuid null,
  deal_id uuid null,
  message_id text null,
  phone text null,
  governance_version text not null default 'p0_shadow_2026_05_27',
  owner_pipeline text not null default 'n8n',
  shadow_pipeline text not null default 'pipeline_b',
  n8n_decision jsonb not null default '{}'::jsonb,
  pipeline_b_decision jsonb not null default '{}'::jsonb,
  pipeline_b_signals jsonb not null default '{}'::jsonb,
  pipeline_b_runtime_memory jsonb not null default '{}'::jsonb,
  runtime_context jsonb not null default '{}'::jsonb,
  divergence_payload jsonb not null default '{}'::jsonb,
  retrieval_divergent boolean null,
  next_best_action_divergent boolean null,
  stage_divergent boolean null,
  property_presentation_due_divergent boolean null,
  retrieval_activation_mismatch boolean null,
  property_presentation_mismatch boolean null,
  fallback_used boolean not null default false,
  timeout_occurred boolean not null default false,
  shadow_failed boolean not null default false,
  shadow_error text null,
  latency_ms integer null,
  created_at timestamptz not null default now(),
  constraint ju_runtime_shadow_decisions_owner_pipeline_check
    check (owner_pipeline in ('n8n', 'pipeline_b', 'manual', 'unknown')),
  constraint ju_runtime_shadow_decisions_shadow_pipeline_check
    check (shadow_pipeline in ('pipeline_b'))
);

create index if not exists idx_ju_runtime_shadow_decisions_created_at
  on public.ju_runtime_shadow_decisions(created_at desc);

create index if not exists idx_ju_runtime_shadow_decisions_tenant_created
  on public.ju_runtime_shadow_decisions(tenant_id, created_at desc);

create index if not exists idx_ju_runtime_shadow_decisions_conversation_created
  on public.ju_runtime_shadow_decisions(conversation_id, created_at desc);

create index if not exists idx_ju_runtime_shadow_decisions_divergence
  on public.ju_runtime_shadow_decisions(created_at desc)
  where coalesce(retrieval_divergent, false)
     or coalesce(next_best_action_divergent, false)
     or coalesce(stage_divergent, false)
     or coalesce(property_presentation_due_divergent, false)
     or coalesce(shadow_failed, false)
     or coalesce(timeout_occurred, false)
     or coalesce(fallback_used, false);

create index if not exists idx_ju_runtime_shadow_decisions_payload_gin
  on public.ju_runtime_shadow_decisions using gin (divergence_payload);

alter table public.ju_runtime_shadow_decisions enable row level security;

drop policy if exists "ju_runtime_shadow_decisions_select" on public.ju_runtime_shadow_decisions;
create policy "ju_runtime_shadow_decisions_select" on public.ju_runtime_shadow_decisions
  for select using (
    is_global_admin()
    or tenant_id is null
    or tenant_id = auth_tenant_id()
  );

drop policy if exists "ju_runtime_shadow_decisions_insert" on public.ju_runtime_shadow_decisions;
create policy "ju_runtime_shadow_decisions_insert" on public.ju_runtime_shadow_decisions
  for insert with check (
    is_global_admin()
    or tenant_id is null
    or tenant_id = auth_tenant_id()
  );
