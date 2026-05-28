-- Rollback P0.2 - Shadow observability status + explicit tool activation divergence.
-- Intended for manual review before execution.

drop index if exists public.idx_ju_runtime_shadow_decisions_tool_activation;
drop index if exists public.idx_ju_runtime_shadow_decisions_status_created;

alter table public.ju_runtime_shadow_decisions
  drop constraint if exists ju_runtime_shadow_decisions_shadow_status_check;

alter table public.ju_runtime_shadow_decisions
  drop column if exists tool_activation_divergent,
  drop column if exists shadow_status;
