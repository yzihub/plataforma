import type { Pool } from "pg";
import type { CognitiveTurnResult, CostAuditSnapshot, NormalizedTurnInput, RuntimeConfig } from "./types";
import { logger } from "./observability";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function estimateTokensFromChars(chars: number): number {
  return Math.max(0, Math.ceil(chars / 4));
}

function roundCost(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function toolPayloadChars(result: CognitiveTurnResult): number {
  return JSON.stringify({
    calls: result.llm.tool_calls,
    results: result.llm.tool_results.map((tool) => ({
      tool: tool.tool,
      ok: tool.ok,
      output: tool.output,
      error: tool.error,
    })),
  }).length;
}

export function buildCostAuditSnapshot(
  input: NormalizedTurnInput,
  result: CognitiveTurnResult,
  config: RuntimeConfig,
): CostAuditSnapshot {
  const inbound = estimateTokensFromChars(clean(input.mensagemCliente).length);
  const outbound = estimateTokensFromChars(clean(result.llm.output).length);
  const retrieval = estimateTokensFromChars(result.context.context_chars);
  const tool = estimateTokensFromChars(toolPayloadChars(result));
  const inputTokens = result.llm.token_usage.input_tokens || inbound + retrieval + tool;
  const outputTokens = result.llm.token_usage.output_tokens || outbound;
  const totalTokens = result.llm.token_usage.total_tokens || inputTokens + outputTokens;
  const inputCost = (inputTokens / 1_000_000) * config.cost.input_usd_per_1m_tokens;
  const outputCost = (outputTokens / 1_000_000) * config.cost.output_usd_per_1m_tokens;

  return {
    trace_id: result.trace_id,
    tenant_id: input.tenant_id ?? null,
    conversation_id: result.conversation_id ?? input.conversation_id ?? null,
    lead_id: input.lead_id ?? null,
    funnel_stage: result.decision.runtime_state,
    tokens: {
      inbound,
      outbound,
      retrieval,
      tool,
      input: inputTokens,
      output: outputTokens,
      total: totalTokens,
    },
    cost: {
      input_usd: roundCost(inputCost),
      output_usd: roundCost(outputCost),
      total_usd: roundCost(inputCost + outputCost),
    },
    context_chars: result.context.context_chars,
    context_truncated: result.context.context.includes("<context_truncated>true</context_truncated>"),
    tool_count: result.llm.tool_calls.length,
    orchestration_passes: result.llm.passes,
  };
}

export async function persistCostAudit(pool: Pool, snapshot: CostAuditSnapshot): Promise<void> {
  await pool.query(
    `
      insert into ju_runtime_cost_audits
        (
          trace_id,
          tenant_id,
          conversation_id,
          lead_id,
          funnel_stage,
          inbound_tokens,
          outbound_tokens,
          retrieval_tokens,
          tool_tokens,
          input_tokens,
          output_tokens,
          total_tokens,
          estimated_cost_usd,
          context_chars,
          context_truncated,
          tool_count,
          orchestration_passes,
          payload,
          created_at
        )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,now())
      on conflict (trace_id) do nothing
    `,
    [
      snapshot.trace_id,
      snapshot.tenant_id ?? null,
      snapshot.conversation_id ?? null,
      snapshot.lead_id ?? null,
      snapshot.funnel_stage,
      snapshot.tokens.inbound,
      snapshot.tokens.outbound,
      snapshot.tokens.retrieval,
      snapshot.tokens.tool,
      snapshot.tokens.input,
      snapshot.tokens.output,
      snapshot.tokens.total,
      snapshot.cost.total_usd,
      snapshot.context_chars,
      snapshot.context_truncated,
      snapshot.tool_count,
      snapshot.orchestration_passes,
      JSON.stringify(snapshot),
    ],
  ).catch((error) => {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "runtime cost audit persistence skipped");
  });
}

export async function loadCostDashboard(pool: Pool): Promise<Record<string, unknown>> {
  const [summary, topConversations, stageCosts, spikes] = await Promise.all([
    pool.query(`
      select
        coalesce(sum(estimated_cost_usd) filter (where created_at >= date_trunc('day', now())), 0)::float8 as daily_cost,
        coalesce(avg(context_chars), 0)::float8 as avg_context_chars,
        coalesce(avg(retrieval_tokens), 0)::float8 as avg_retrieval_tokens,
        coalesce(avg(estimated_cost_usd), 0)::float8 as avg_turn_cost,
        coalesce(sum(estimated_cost_usd), 0)::float8 as window_cost,
        count(distinct lead_id)::int as leads,
        count(distinct conversation_id)::int as conversations
      from ju_runtime_cost_audits
      where created_at >= now() - interval '24 hours'
    `),
    pool.query(`
      select conversation_id, lead_id, sum(estimated_cost_usd)::float8 as cost_usd, sum(total_tokens)::int as total_tokens, count(*)::int as turns
      from ju_runtime_cost_audits
      where created_at >= now() - interval '24 hours'
        and conversation_id is not null
      group by conversation_id, lead_id
      order by cost_usd desc
      limit 10
    `),
    pool.query(`
      select funnel_stage, sum(estimated_cost_usd)::float8 as cost_usd, avg(total_tokens)::float8 as avg_tokens, count(*)::int as turns
      from ju_runtime_cost_audits
      where created_at >= now() - interval '24 hours'
      group by funnel_stage
      order by cost_usd desc
    `),
    pool.query(`
      select trace_id, conversation_id, total_tokens, estimated_cost_usd, context_chars, created_at
      from ju_runtime_cost_audits
      where created_at >= now() - interval '24 hours'
        and (
          total_tokens > 12000
          or context_truncated = true
          or estimated_cost_usd > (
            select coalesce(avg(estimated_cost_usd) * 3, 0.05)
            from ju_runtime_cost_audits
            where created_at >= now() - interval '24 hours'
          )
        )
      order by estimated_cost_usd desc, total_tokens desc
      limit 25
    `),
  ]);
  const row = summary.rows[0] ?? {};
  const dailyCost = Number(row.daily_cost ?? 0);
  const leads = Number(row.leads ?? 0);
  const conversations = Number(row.conversations ?? 0);

  return {
    window: "postgres_24h",
    daily_cost_usd: roundCost(dailyCost),
    average_cost_per_lead_usd: leads ? roundCost(dailyCost / leads) : 0,
    average_cost_per_conversation_usd: conversations ? roundCost(dailyCost / conversations) : 0,
    average_turn_cost_usd: roundCost(Number(row.avg_turn_cost ?? 0)),
    retrieval_overhead_tokens_avg: Math.round(Number(row.avg_retrieval_tokens ?? 0)),
    context_size_avg_chars: Math.round(Number(row.avg_context_chars ?? 0)),
    estimated_monthly_burn_usd: roundCost(dailyCost * 30),
    top_expensive_conversations: topConversations.rows,
    cost_by_funnel_stage: stageCosts.rows,
    spikes: spikes.rows,
  };
}
