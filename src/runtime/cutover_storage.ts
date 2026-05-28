import type { Pool } from "pg";
import type { CognitiveTurnResult, NormalizedTurnInput, PilotRolloutDecision, TrafficRouteDecision, TrafficResponder } from "./types";
import { logger } from "./observability";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export async function isDuplicateInbound(pool: Pool, idempotencyKey: string): Promise<boolean> {
  const result = await pool.query(
    "select 1 from ju_cutover_audit_logs where idempotency_key = $1 limit 1",
    [idempotencyKey],
  ).catch(() => ({ rows: [] }));
  return result.rows.length > 0;
}

export async function loadConversationOwner(pool: Pool, conversationId: string): Promise<TrafficResponder | null> {
  const result = await pool.query(
    "select responder from ju_cutover_audit_logs where conversation_id = $1 order by created_at desc limit 1",
    [conversationId],
  ).catch(() => ({ rows: [] }));
  const owner = clean(result.rows[0]?.responder);
  return owner === "kernel" || owner === "n8n" ? owner : null;
}

export async function persistCutoverAudit(
  pool: Pool,
  input: NormalizedTurnInput,
  result: CognitiveTurnResult,
  decision: TrafficRouteDecision,
  pilot?: PilotRolloutDecision,
): Promise<void> {
  await pool.query(
    `
      insert into ju_cutover_audit_logs
        (
          trace_id,
          tenant_id,
          conversation_id,
          lead_id,
          responder,
          reason,
          fallback_reasons,
          divergence_score,
          governance_score,
          confidence_score,
          safety_gates,
          runtime_traces,
          input_payload,
          kernel_output,
          original_output,
          tool_usage,
          governance_decisions,
          route_decision,
          sent_output,
          diff_payload,
          idempotency_key,
          live_comparison,
          created_at
        )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15,$16::jsonb,$17::jsonb,$18::jsonb,$19,$20::jsonb,$21,true,now())
      on conflict (idempotency_key) do nothing
    `,
    [
      result.trace_id,
      input.tenant_id ?? null,
      result.conversation_id,
      input.lead_id ?? null,
      decision.responder,
      decision.reason,
      decision.fallback_reasons,
      result.shadow?.comparison?.score.overall ?? null,
      decision.guardian.confidence.governance,
      decision.guardian.confidence.overall,
      JSON.stringify(decision.safety_gates),
      JSON.stringify(result.stages),
      JSON.stringify(input),
      result.llm.output,
      result.shadow?.expected_output ?? null,
      JSON.stringify({
        requested: result.llm.tool_calls.map((call) => call.tool),
        results: result.llm.tool_results.map((tool) => ({
          tool: tool.tool,
          ok: tool.ok,
          latency_ms: tool.latency_ms,
          error: tool.error ?? null,
        })),
      }),
      JSON.stringify({
        next_best_action: result.decision.next_best_action,
        property_presentation_due: result.decision.property_presentation_due,
        required_tools: result.decision.required_tools,
        signals: result.decision.signals,
        violations: result.violations,
      }),
      JSON.stringify(pilot ? { ...decision, pilot } : decision),
      pilot?.response_to_send ?? null,
      JSON.stringify({
        exact_match: result.shadow?.exact_match ?? null,
        original_chars: result.shadow?.expected_output?.length ?? null,
        kernel_chars: result.llm.output.length,
        sent_by: pilot?.responder ?? decision.responder,
      }),
      decision.idempotency_key,
    ],
  ).catch((error) => {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "cutover audit persistence skipped");
  });
}
