import type { Pool } from "pg";
import type { CognitiveTurnResult, NormalizedTurnInput, PilotRolloutDecision } from "./types";
import { logger } from "./observability";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function edgeReasons(result: CognitiveTurnResult, pilot?: PilotRolloutDecision): string[] {
  const reasons = new Set<string>();
  if (result.shadow?.comparison?.severity === "CRITICAL") reasons.add("critical_divergence");
  if (result.shadow?.calibration?.sdr_regression.detected) reasons.add("sdr_regression");
  if (pilot && !pilot.authorized_to_send) reasons.add("fallback_conversation");
  if (pilot?.reason === "live_validation_failed") reasons.add("guardian_rejection");
  for (const blocker of pilot?.edge_case_blockers ?? []) reasons.add(`edge_case:${blocker}`);
  for (const violation of pilot?.live_validation.violations ?? []) reasons.add(`guardian:${violation}`);
  return [...reasons];
}

export async function persistEdgeCaseQueue(
  pool: Pool,
  input: NormalizedTurnInput,
  result: CognitiveTurnResult,
  pilot?: PilotRolloutDecision,
): Promise<void> {
  const reasons = edgeReasons(result, pilot);
  if (!reasons.length) return;
  await pool.query(
    `
      insert into ju_runtime_edge_case_queue
        (trace_id, tenant_id, conversation_id, lead_id, reasons, severity, payload, reviewed, created_at)
      values ($1,$2,$3,$4,$5,$6,$7::jsonb,false,now())
      on conflict (trace_id) do nothing
    `,
    [
      result.trace_id,
      input.tenant_id ?? null,
      result.conversation_id ?? input.conversation_id ?? null,
      input.lead_id ?? null,
      reasons,
      result.shadow?.comparison?.severity ?? result.shadow?.calibration?.sdr_regression.severity ?? "LOW",
      JSON.stringify({
        input,
        output: result.llm.output,
        decision: result.decision,
        pilot,
        comparison: result.shadow?.comparison ?? null,
        calibration: result.shadow?.calibration ?? null,
      }),
    ],
  ).catch((error) => {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "edge case queue persistence skipped");
  });
}

export async function loadRuntimeReadiness(pool: Pool): Promise<Record<string, unknown>> {
  const result = await pool.query(`
    select
      count(*)::int as total,
      count(*) filter (where responder = 'kernel')::int as kernel_responses,
      count(*) filter (where responder = 'n8n')::int as fallback_responses,
      count(*) filter (where confidence_score < 80)::int as low_confidence,
      count(*) filter (where divergence_score is not null and divergence_score < 97)::int as divergence_failures,
      count(*) filter (where route_decision->'pilot'->>'reason' = 'live_validation_failed')::int as guardian_rejections,
      coalesce(avg(confidence_score), 0)::float8 as avg_confidence,
      coalesce(avg(divergence_score), 100)::float8 as avg_divergence_score
    from ju_cutover_audit_logs
    where created_at >= now() - interval '24 hours'
  `);
  const row = result.rows[0] ?? {};
  const total = Number(row.total ?? 0);
  const fallback = Number(row.fallback_responses ?? 0);
  const guardian = Number(row.guardian_rejections ?? 0);
  const divergenceScore = Number(row.avg_divergence_score ?? 100);
  const confidence = Number(row.avg_confidence ?? 0);
  const fallbackRate = total ? fallback / total : 0;
  return {
    window: "postgres_24h",
    parity: Math.round(divergenceScore * 100) / 100,
    governance_stability: Number(row.divergence_failures ?? 0) === 0,
    fallback_rate: Math.round(fallbackRate * 10000) / 100,
    guardian_rejection_rate: total ? Math.round((guardian / total) * 10000) / 100 : 0,
    divergence_score: Math.round(divergenceScore * 100) / 100,
    kernel_confidence: Math.round(confidence * 100) / 100,
    cutover_ready: total > 0 && divergenceScore >= 97 && fallbackRate <= 0.05 && guardian === 0 && confidence >= 90,
  };
}

export async function loadRuntimeQaConversation(
  pool: Pool,
  conversationId: string,
): Promise<Record<string, unknown>> {
  const [audit, messages, memory, cost, edge] = await Promise.all([
    pool.query(
      "select * from ju_cutover_audit_logs where conversation_id = $1 order by created_at desc limit 50",
      [conversationId],
    ),
    pool.query(
      "select direction, sender_type, content, message_type, metadata, created_at from conversation_messages where conversation_id = $1 order by created_at asc limit 100",
      [conversationId],
    ).catch(() => ({ rows: [] })),
    pool.query(
      "select summary, behavioral_memory, operational_memory, updated_at from ju_runtime_memory where conversation_id = $1 order by updated_at desc limit 1",
      [conversationId],
    ).catch(() => ({ rows: [] })),
    pool.query(
      "select trace_id, total_tokens, estimated_cost_usd, context_chars, created_at from ju_runtime_cost_audits where conversation_id = $1 order by created_at desc limit 50",
      [conversationId],
    ).catch(() => ({ rows: [] })),
    pool.query(
      "select reasons, severity, payload, reviewed, created_at from ju_runtime_edge_case_queue where conversation_id = $1 order by created_at desc limit 50",
      [conversationId],
    ).catch(() => ({ rows: [] })),
  ]);

  return {
    conversation_id: clean(conversationId),
    replay: messages.rows,
    metadata: {
      audit_turns: audit.rows.length,
      memory: memory.rows[0] ?? null,
      cost: cost.rows,
      edge_cases: edge.rows,
    },
    context_hydration: audit.rows.map((row) => ({
      trace_id: row.trace_id,
      input_payload: row.input_payload,
      governance_decisions: row.governance_decisions,
      route_decision: row.route_decision,
    })),
    tool_calls: audit.rows.map((row) => ({
      trace_id: row.trace_id,
      tool_usage: row.tool_usage,
    })),
    traces: audit.rows.map((row) => ({
      trace_id: row.trace_id,
      runtime_traces: row.runtime_traces,
      created_at: row.created_at,
    })),
  };
}

export async function loadRuntimeQaTrace(pool: Pool, traceId: string): Promise<Record<string, unknown> | null> {
  const result = await pool.query(
    `
      select
        a.*,
        c.payload as cost_payload,
        e.payload as edge_payload
      from ju_cutover_audit_logs a
      left join ju_runtime_cost_audits c on c.trace_id = a.trace_id
      left join ju_runtime_edge_case_queue e on e.trace_id = a.trace_id
      where a.trace_id = $1
      limit 1
    `,
    [traceId],
  );
  return result.rows[0] ?? null;
}
