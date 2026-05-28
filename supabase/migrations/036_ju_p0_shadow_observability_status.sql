-- P0.2 - Shadow observability status + explicit tool activation divergence.
-- Additive only. No hot-path behavior changes.

alter table public.ju_runtime_shadow_decisions
  add column if not exists shadow_status text not null default 'ok',
  add column if not exists tool_activation_divergent boolean null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ju_runtime_shadow_decisions_shadow_status_check'
  ) then
    alter table public.ju_runtime_shadow_decisions
      add constraint ju_runtime_shadow_decisions_shadow_status_check
      check (shadow_status in ('ok', 'failed', 'timeout', 'fallback', 'skipped'))
      not valid;
  end if;
end $$;

alter table public.ju_runtime_shadow_decisions
  validate constraint ju_runtime_shadow_decisions_shadow_status_check;

update public.ju_runtime_shadow_decisions
set shadow_status = case
  when timeout_occurred then 'timeout'
  when shadow_failed then 'failed'
  when fallback_used then 'fallback'
  else 'ok'
end
where shadow_status is null
   or shadow_status = ''
   or shadow_status = 'ok';

create index if not exists idx_ju_runtime_shadow_decisions_status_created
  on public.ju_runtime_shadow_decisions(shadow_status, created_at desc);

create index if not exists idx_ju_runtime_shadow_decisions_tool_activation
  on public.ju_runtime_shadow_decisions(created_at desc)
  where coalesce(tool_activation_divergent, false);
