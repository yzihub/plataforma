import type { Pool } from "pg";
import type { NormalizedTurnInput, PilotOverrideAction, PilotRolloutDecision } from "./types";
import { logger } from "./observability";

type PilotOverrideRecord = {
  action: PilotOverrideAction;
  reason?: string | null;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export async function loadPilotOverrides(pool: Pool, input: NormalizedTurnInput): Promise<PilotOverrideRecord[]> {
  const result = await pool.query(
    `
      select action, reason
      from ju_pilot_overrides
      where active = true
        and (
          (tenant_id is not null and tenant_id = $1)
          or (lead_id is not null and lead_id = $2)
          or (conversation_id is not null and conversation_id = $3)
          or (phone is not null and phone = $4)
          or action = 'freeze_rollout'
        )
      order by created_at desc
      limit 20
    `,
    [
      input.tenant_id ?? null,
      input.lead_id ?? null,
      input.conversation_id ?? null,
      clean(input.telefoneCompleto || input.remoteJid) || null,
    ],
  ).catch(() => ({ rows: [] }));
  return result.rows
    .map((row) => ({ action: clean(row.action) as PilotOverrideAction, reason: row.reason as string | null }))
    .filter((row) =>
      ["move_to_n8n", "move_to_kernel", "freeze_rollout", "pause_tenant", "block_lead"].includes(row.action),
    );
}

export async function persistPilotOverride(
  pool: Pool,
  input: {
    action: PilotOverrideAction;
    reason?: string | null;
    tenant_id?: string | null;
    conversation_id?: string | null;
    lead_id?: string | null;
    phone?: string | null;
    operator_id?: string | null;
    active?: boolean;
  },
): Promise<void> {
  await pool.query(
    `
      insert into ju_pilot_overrides
        (action, reason, tenant_id, conversation_id, lead_id, phone, operator_id, active, created_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,now())
    `,
    [
      input.action,
      input.reason ?? null,
      input.tenant_id ?? null,
      input.conversation_id ?? null,
      input.lead_id ?? null,
      input.phone ?? null,
      input.operator_id ?? null,
      input.active ?? true,
    ],
  );
}

export async function persistPilotSample(
  pool: Pool,
  input: NormalizedTurnInput,
  decision: PilotRolloutDecision,
): Promise<void> {
  const tags = new Set<string>();
  if (decision.authorized_to_send) tags.add("live_kernel_response");
  if (!decision.authorized_to_send) tags.add("fallback_conversation");
  if (decision.edge_case_blockers.length > 0) tags.add("edge_case");
  if (decision.live_validation.violations.length > 0) tags.add("regression");
  if (decision.readiness_score >= 99 && decision.authorized_to_send) tags.add("best_response");
  if (decision.fallback_reasons.length > 0) tags.add("divergent_or_blocked");

  await pool.query(
    `
      insert into ju_pilot_response_samples
        (tenant_id, conversation_id, lead_id, phone, tags, pilot_decision, sent_output, created_at)
      values ($1,$2,$3,$4,$5,$6::jsonb,$7,now())
    `,
    [
      input.tenant_id ?? null,
      input.conversation_id ?? null,
      input.lead_id ?? null,
      clean(input.telefoneCompleto || input.remoteJid) || null,
      [...tags],
      JSON.stringify(decision),
      decision.response_to_send,
    ],
  ).catch((error) => {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "pilot sample persistence skipped");
  });
}

export async function loadPilotDashboard(pool: Pool): Promise<Record<string, unknown>> {
  const result = await pool.query(`
    select
      count(*)::int as total,
      count(*) filter (where (route_decision->'pilot'->>'authorized_to_send')::boolean = true)::int as kernel,
      count(*) filter (where (route_decision->'pilot'->>'authorized_to_send')::boolean = false)::int as fallback,
      count(*) filter (where route_decision->'pilot'->>'reason' = 'live_validation_failed')::int as guardian_rejections,
      count(*) filter (where route_decision->'pilot'->'live_validation'->'violations' ? 'sdr_behavior')::int as sdr_regressions,
      count(*) filter (where route_decision->'pilot'->>'reason' in ('edge_case_block', 'safe_filter_block'))::int as governance_violations,
      avg((route_decision->'pilot'->>'readiness_score')::numeric) as readiness_score
    from ju_cutover_audit_logs
    where created_at >= now() - interval '24 hours'
  `);
  const row = result.rows[0] ?? {};
  const total = Number(row.total ?? 0);
  const kernel = Number(row.kernel ?? 0);
  const fallback = Number(row.fallback ?? 0);
  return {
    window: "postgres_24h",
    total_decisions: total,
    rollout_percent: total ? Math.round((kernel / total) * 10000) / 100 : 0,
    active_conversations: kernel,
    fallback_rate: total ? Math.round((fallback / total) * 10000) / 100 : 0,
    guardian_rejections: Number(row.guardian_rejections ?? 0),
    sdr_regressions: Number(row.sdr_regressions ?? 0),
    governance_violations: Number(row.governance_violations ?? 0),
    readiness_score: Math.round(Number(row.readiness_score ?? 0) * 100) / 100,
  };
}
