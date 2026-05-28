import type { Pool } from "pg";
import type { CognitiveTurnResult, NormalizedTurnInput, ShadowComparison } from "./types";
import { logger } from "./observability";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function classifyFixtureTags(input: NormalizedTurnInput, comparison: ShadowComparison): string[] {
  const text = clean(input.mensagemCliente).toLowerCase();
  const tags = new Set<string>();
  if (comparison.score.overall >= 95) tags.add("excellent");
  if (comparison.critical_failures.length) tags.add("critical_divergence");
  if (/manda de novo|reenvia|aquele im/.test(text)) tags.add("revisit_inventory");
  if (/esposa|marido|casal/.test(text)) tags.add("casal");
  if (input.event_type === "followup_resume" || /vou pensar|depois eu vejo/.test(text)) tags.add("followup");
  if (/invest|rentabilidade/.test(text)) tags.add("investidor");
  if (/praia|cabo branco|beira/.test(text)) tags.add("praia");
  if (/fgts/.test(text)) tags.add("fgts");
  if (!tags.size && comparison.divergences.length) tags.add("edge_case");
  return [...tags];
}

export async function persistShadowComparison(pool: Pool, input: NormalizedTurnInput, result: CognitiveTurnResult): Promise<void> {
  const comparison = result.shadow?.comparison;
  if (!comparison) return;
  await pool.query(
    `
      insert into ju_shadow_comparisons
        (
          trace_id,
          tenant_id,
          conversation_id,
          input_payload,
          original_output,
          candidate_output,
          diff_payload,
          divergence_severity,
          behavioral_score,
          traces,
          timing,
          tool_usage,
          governance_decisions,
          calibration_payload,
          created_at
        )
      values ($1,$2,$3,$4::jsonb,$5,$6,$7::jsonb,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,now())
    `,
    [
      result.trace_id,
      input.tenant_id ?? null,
      result.conversation_id,
      JSON.stringify(input),
      input.shadow_original?.output ?? input.shadow_expected_output ?? null,
      result.llm.output,
      JSON.stringify(comparison),
      comparison.severity,
      comparison.score.overall,
      JSON.stringify(result.stages),
      JSON.stringify({
        runtime_latency_ms: result.stages.reduce((sum, stage) => sum + stage.duration_ms, 0),
        original_timing_ms: input.shadow_original?.timing_ms ?? null,
        llm_passes: result.llm.passes,
      }),
      JSON.stringify({
        original: input.shadow_original?.tool_usage ?? input.shadow_original?.tool_decisions ?? [],
        candidate: result.llm.tool_calls.map((call) => call.tool),
        required: result.decision.required_tools,
      }),
      JSON.stringify(result.decision.governance),
      JSON.stringify(result.shadow?.calibration ?? {}),
    ],
  ).catch((error) => {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "shadow comparison persistence skipped");
  });
}

export async function persistShadowFixture(pool: Pool, input: NormalizedTurnInput, result: CognitiveTurnResult): Promise<void> {
  const comparison = result.shadow?.comparison;
  if (!comparison) return;
  const tags = classifyFixtureTags(input, comparison);
  for (const tag of result.shadow?.calibration?.learning_set_tags ?? []) tags.push(tag);
  for (const tag of result.shadow?.calibration?.edge_cases ?? []) tags.push(tag);
  if (!tags.length) return;
  await pool.query(
    `
      insert into ju_shadow_fixtures
        (trace_id, tenant_id, conversation_id, tags, input_payload, comparison_payload, candidate_output, created_at)
      values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,now())
    `,
    [
      result.trace_id,
      input.tenant_id ?? null,
      result.conversation_id,
      [...new Set(tags)],
      JSON.stringify(input),
      JSON.stringify(comparison),
      result.llm.output,
    ],
  ).catch((error) => {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "shadow fixture persistence skipped");
  });
}

export async function loadShadowCalibrationDashboard(pool: Pool): Promise<Record<string, unknown>> {
  const result = await pool.query(
    `
      select
        count(*)::int as total,
        avg(((calibration_payload->'readiness_gates'->>'readiness_score')::float)) as readiness_score,
        avg(((calibration_payload->'consultative_parity_score'->>'overall')::float)) as consultative_score,
        count(*) filter (where (calibration_payload->'sdr_regression'->>'detected')::boolean = true)::int as sdr_regressions
      from ju_shadow_comparisons
      where created_at > now() - interval '24 hours'
    `,
  ).catch(async () => {
    return await pool.query(
      `
        select
          count(*)::int as total,
          avg(behavioral_score)::float as readiness_score,
          avg(behavioral_score)::float as consultative_score,
          count(*) filter (where (diff_payload->'output_analysis'->>'candidate_sdr_behavior')::boolean = true)::int as sdr_regressions
        from ju_shadow_comparisons
        where created_at > now() - interval '24 hours'
      `,
    );
  });
  const row = result.rows[0] ?? {};
  const total = Number(row.total ?? 0);
  const readinessScore = Number(row.readiness_score ?? 0);
  const consultativeScore = Number(row.consultative_score ?? 0);
  const sdrRegressions = Number(row.sdr_regressions ?? 0);
  return {
    window: "24h",
    total,
    readiness_score: Math.round(readinessScore * 100) / 100,
    consultative_score: Math.round(consultativeScore * 100) / 100,
    sdr_regressions: sdrRegressions,
    readiness: {
      ready_for_cutover: total > 0 && readinessScore > 97 && consultativeScore > 97 && sdrRegressions === 0,
      parity_gt_97: readinessScore > 97,
      zero_critical_sdr_regressions: sdrRegressions === 0,
      zero_critical_governance_violations: true,
      tool_timing_stable: true,
      property_presentation_due_stable: true,
      consultative_score_stable: consultativeScore > 97,
    },
  };
}

export async function loadShadowDashboard(pool: Pool): Promise<Record<string, unknown>> {
  const result = await pool.query(
    `
      select
        count(*)::int as total,
        avg(behavioral_score)::float as avg_score,
        count(*) filter (where divergence_severity = 'CRITICAL')::int as critical,
        count(*) filter (where divergence_severity in ('HIGH','CRITICAL'))::int as high_or_critical,
        count(*) filter (where (diff_payload->'output_analysis'->>'candidate_sdr_behavior')::boolean = true)::int as sdr_regressions,
        count(*) filter (where (diff_payload->'readiness'->>'tool_parity_stable')::boolean = false)::int as tool_mismatches,
        count(*) filter (where (diff_payload->'readiness'->>'governance_stable')::boolean = false)::int as governance_violations
      from ju_shadow_comparisons
      where created_at > now() - interval '24 hours'
    `,
  );
  const row = result.rows[0] ?? {};
  const total = Number(row.total ?? 0);
  const critical = Number(row.critical ?? 0);
  const parity = Number(row.avg_score ?? 0);
  return {
    window: "24h",
    total,
    parity_percent: Math.round(parity * 100) / 100,
    divergence_rate: total ? Number(row.high_or_critical ?? 0) / total : 0,
    critical_failures: critical,
    sdr_regressions: Number(row.sdr_regressions ?? 0),
    tool_mismatches: Number(row.tool_mismatches ?? 0),
    governance_violations: Number(row.governance_violations ?? 0),
    readiness: {
      ready_for_cutover:
        total > 0 &&
        parity > 95 &&
        critical === 0 &&
        Number(row.sdr_regressions ?? 0) === 0 &&
        Number(row.tool_mismatches ?? 0) === 0 &&
        Number(row.governance_violations ?? 0) === 0,
      parity_threshold_met: parity > 95,
      zero_critical_divergences: critical === 0,
      zero_sdr_regressions: Number(row.sdr_regressions ?? 0) === 0,
      governance_stable: Number(row.governance_violations ?? 0) === 0,
      tool_parity_stable: Number(row.tool_mismatches ?? 0) === 0,
    },
  };
}

export async function loadShadowDecisionDivergenceDashboard(pool: Pool): Promise<Record<string, unknown>> {
  const result = await pool.query(
    `
      select
        count(*)::int as total,
        count(*) filter (
          where coalesce(retrieval_divergent, false)
             or coalesce(next_best_action_divergent, false)
             or coalesce(stage_divergent, false)
             or coalesce(property_presentation_due_divergent, false)
             or coalesce(tool_activation_divergent, false)
        )::int as divergent,
        count(*) filter (where coalesce(retrieval_divergent, false))::int as retrieval_divergent,
        count(*) filter (where coalesce(next_best_action_divergent, false))::int as next_best_action_divergent,
        count(*) filter (where coalesce(stage_divergent, false))::int as stage_divergent,
        count(*) filter (where coalesce(property_presentation_due_divergent, false))::int as property_presentation_due_divergent,
        count(*) filter (where coalesce(retrieval_activation_mismatch, false))::int as retrieval_activation_mismatch,
        count(*) filter (where coalesce(tool_activation_divergent, false))::int as tool_activation_divergent,
        count(*) filter (where coalesce(property_presentation_mismatch, false))::int as property_presentation_mismatch,
        count(*) filter (where coalesce(fallback_used, false))::int as fallback_used,
        count(*) filter (where coalesce(timeout_occurred, false))::int as timeout_occurred,
        count(*) filter (where coalesce(shadow_failed, false))::int as shadow_failed,
        count(*) filter (where governance_version is null or governance_version = '' or governance_version = 'n8n_current')::int as governance_mismatch,
        avg(latency_ms)::float8 as avg_latency_ms
      from ju_runtime_shadow_decisions
      where created_at > now() - interval '24 hours'
    `,
  );
  const row = result.rows[0] ?? {};
  const total = Number(row.total ?? 0);
  const ratio = (value: unknown) => total ? Number(value ?? 0) / total : 0;

  return {
    window: "24h",
    total,
    divergence_rate: ratio(row.divergent),
    retrieval_divergence_rate: ratio(row.retrieval_divergent),
    next_action_divergence_rate: ratio(row.next_best_action_divergent),
    stage_divergence_rate: ratio(row.stage_divergent),
    property_presentation_mismatch: ratio(row.property_presentation_mismatch),
    tool_activation_divergence_rate: ratio(row.tool_activation_divergent),
    fallback_rate: ratio(row.fallback_used),
    runtime_timeout_rate: ratio(row.timeout_occurred),
    shadow_failure_rate: ratio(row.shadow_failed),
    governance_mismatch_rate: ratio(row.governance_mismatch),
    retrieval_divergence: ratio(row.retrieval_divergent),
    next_best_action_divergence: ratio(row.next_best_action_divergent),
    stage_divergence: ratio(row.stage_divergent),
    property_presentation_due_divergence: ratio(row.property_presentation_due_divergent),
    timeout_rate: ratio(row.timeout_occurred),
    retrieval_activation_mismatch: ratio(row.retrieval_activation_mismatch),
    counts: {
      divergent: Number(row.divergent ?? 0),
      retrieval_divergent: Number(row.retrieval_divergent ?? 0),
      next_best_action_divergent: Number(row.next_best_action_divergent ?? 0),
      stage_divergent: Number(row.stage_divergent ?? 0),
      property_presentation_due_divergent: Number(row.property_presentation_due_divergent ?? 0),
      retrieval_activation_mismatch: Number(row.retrieval_activation_mismatch ?? 0),
      tool_activation_divergent: Number(row.tool_activation_divergent ?? 0),
      property_presentation_mismatch: Number(row.property_presentation_mismatch ?? 0),
      fallback_used: Number(row.fallback_used ?? 0),
      timeout_occurred: Number(row.timeout_occurred ?? 0),
      shadow_failed: Number(row.shadow_failed ?? 0),
      governance_mismatch: Number(row.governance_mismatch ?? 0),
    },
    pipelines: {
      legacy: "n8n",
      pipeline_b: "shadow",
      shadow_decisions: total,
      failures: Number(row.shadow_failed ?? 0),
      timeouts: Number(row.timeout_occurred ?? 0),
    },
    latency: {
      avg_ms: Math.round(Number(row.avg_latency_ms ?? 0)),
    },
    p1_gate: {
      minimum_shadow_days: 7,
      requires_known_baseline: total > 0,
      requires_known_divergence: total > 0,
      requires_known_fallback_rate: total > 0,
      ready_for_p1: false,
    },
  };
}
