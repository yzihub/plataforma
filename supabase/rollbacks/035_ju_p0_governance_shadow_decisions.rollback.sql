-- Rollback P0.1 - Governance version + shadow decision baseline.
-- Intended for manual review before execution.

drop policy if exists "ju_runtime_shadow_decisions_insert" on public.ju_runtime_shadow_decisions;
drop policy if exists "ju_runtime_shadow_decisions_select" on public.ju_runtime_shadow_decisions;

drop table if exists public.ju_runtime_shadow_decisions;

drop index if exists public.idx_ju_runtime_states_funnel_stage_canonical;
drop index if exists public.idx_ju_runtime_states_governance_owner;

alter table public.ju_runtime_states
  drop constraint if exists ju_runtime_states_owner_pipeline_check;

alter table public.ju_runtime_states
  drop column if exists funnel_stage_canonical,
  drop column if exists owner_pipeline,
  drop column if exists governance_version;
