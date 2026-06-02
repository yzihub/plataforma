import { buildCanonicalKernelDecision } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type {
  BehavioralCalibration,
  CognitiveTurnResult,
  CutoverFeatureFlags,
  NormalizedTurnInput,
  RuntimeConfig,
  ShadowComparison,
} from "@/runtime/types";
import { canonicalParityFixtures } from "../ju-cognitive-kernel/canonical-fixtures";

export const cutoverInput: NormalizedTurnInput = {
  tenant_id: "11111111-1111-1111-1111-111111111111",
  conversation_id: "22222222-2222-2222-2222-222222222222",
  lead_id: "33333333-3333-3333-3333-333333333333",
  telefoneCompleto: "5583999999999",
  mensagemCliente: "Quero um apartamento no Bessa ate 750 mil",
  messageType: "text",
  event_type: "inbound",
};

export const rolloutFlags: CutoverFeatureFlags = {
  shadow_only: false,
  internal_only: false,
  pilot_group: false,
  pilot_stage: 4,
  percentage_rollout: 100,
  force_n8n: false,
  force_kernel: false,
  emergency_fallback: false,
  pilot_tenants: [],
  pilot_phones: [],
  pilot_leads: [],
  blocked_tenants: [],
  blocked_phones: [],
  blocked_leads: [],
  rollout_frozen: false,
  followup_only: false,
  inbound_only: false,
  max_orchestration_latency_ms: 8000,
  max_tool_latency_ms: 2500,
  max_total_latency_ms: 10000,
  readiness_level: 5,
};

export function shadowOnlyFlags(overrides: Partial<CutoverFeatureFlags> = {}): CutoverFeatureFlags {
  return {
    ...rolloutFlags,
    shadow_only: true,
    percentage_rollout: 0,
    readiness_level: 0,
    ...overrides,
  };
}

export function runtimeConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    databaseUrl: "postgres://local/test",
    redisUrl: "redis://localhost:6379",
    openaiApiKey: "test",
    openaiModel: "gpt-4.1",
    simpleMode: true,
    n8nBaseUrl: "https://n8n.local",
    runtimeMode: "shadow",
    lockTtlMs: 45000,
    port: 3333,
    featureFlags: rolloutFlags,
    limits: {
      max_recent_messages: 20,
      max_summary_chars: 2400,
      max_retrieval_chunks: 6,
      max_doctrine_retrieval: 2,
      max_metadata_chars: 4000,
      max_context_chars: 24000,
      max_orchestration_passes: 2,
    },
    cost: {
      input_usd_per_1m_tokens: 2,
      output_usd_per_1m_tokens: 8,
    },
    behavioralQa: {
      phone: "5583999990002",
      tenant_id: "11111111-1111-1111-1111-111111111111",
    },
    toolWebhookUrls: {},
    ...overrides,
  };
}

function comparison(overrides: Partial<ShadowComparison> = {}): ShadowComparison {
  return {
    severity: "LOW",
    score: {
      parity: 100,
      governance_adherence: 100,
      consultative_behavior: 100,
      timing: 100,
      orchestration_correctness: 100,
      overall: 100,
    },
    divergences: [],
    critical_failures: [],
    parity: {
      next_best_action: true,
      property_presentation_due: true,
      required_tools: true,
      funnel_stage: true,
      qualification_depth: true,
      governance_flags: true,
      inventory_fatigue: true,
      spouse_decision: true,
      rendered_context: true,
      tool_decisions: true,
      output_behavior: true,
    },
    output_analysis: {
      original_questions: 0,
      candidate_questions: 0,
      original_sdr_behavior: false,
      candidate_sdr_behavior: false,
      original_permission_to_search: false,
      candidate_permission_to_search: false,
      original_pressure: false,
      candidate_pressure: false,
      candidate_consultative: true,
    },
    readiness: {
      ready_for_cutover: true,
      parity_threshold_met: true,
      zero_critical_divergences: true,
      zero_sdr_regressions: true,
      governance_stable: true,
      tool_parity_stable: true,
    },
    ...overrides,
  };
}

function calibration(overrides: Partial<BehavioralCalibration> = {}): BehavioralCalibration {
  return {
    consultative_parity_score: {
      early_property_presentation: 100,
      avoidance_sdr: 100,
      avoidance_abstract_qualification: 100,
      learning_through_curation: 100,
      consultative_behavior: 100,
      overall: 100,
    },
    sdr_regression: {
      detected: false,
      reasons: [],
      severity: "LOW",
    },
    tool_timing: {
      consultar_imoveis_required: true,
      consultar_imoveis_executed: true,
      status: "on_time",
      stable: true,
    },
    property_presentation_due_audit: {
      should_activate: true,
      did_activate: true,
      failed_to_activate: false,
      over_triggered: false,
      stable: true,
    },
    governance_parity_audit: {
      inventory_fatigue: true,
      revisit_inventory: true,
      spouse_governance: true,
      followup_pressure: true,
      anti_loop: true,
      stable: true,
    },
    conversational_rhythm: {
      questions_per_response: 0,
      average_response_chars: 160,
      commercial_pressure: false,
      consultative_density: 100,
      presentation_timing: "early",
    },
    learning_set_tags: ["excellent_parity", "high_performing_conversation"],
    edge_cases: [],
    trends: {
      parity_over_time_key: "cutover:test:parity",
      governance_stability_key: "cutover:test:governance",
      sdr_regression_trend_key: "cutover:test:sdr",
      tool_timing_trend_key: "cutover:test:tools",
      consultative_score_trend_key: "cutover:test:consultative",
    },
    readiness_gates: {
      parity_gt_97: true,
      zero_critical_sdr_regressions: true,
      zero_critical_governance_violations: true,
      tool_timing_stable: true,
      property_presentation_due_stable: true,
      consultative_score_stable: true,
      ready_for_cutover: true,
      readiness_score: 100,
    },
    human_review: {
      required: false,
      reasons: [],
      priority: "LOW",
    },
    would_have_replied: {
      output: "Separei tres opcoes aderentes no Bessa para voce comparar.",
      tool_calls: ["consultar_imoveis"],
    },
    ...overrides,
  };
}

export function cutoverResult(overrides: Partial<CognitiveTurnResult> = {}): CognitiveTurnResult {
  const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_quente);
  return {
    ok: true,
    mode: "shadow",
    trace_id: "trace-cutover-test",
    conversation_id: cutoverInput.conversation_id ?? null,
    decision,
    context: {
      context: "_context\nmensagem_atual: Quero um apartamento no Bessa",
      context_chars: 56,
      required_blocks_present: true,
    },
    llm: {
      output: "Separei tres opcoes aderentes no Bessa para voce comparar.",
      governance_violations: [],
      tool_calls: [{ tool: "consultar_imoveis", input: { bairro: "Bessa" } }],
      tool_results: [{ tool: "consultar_imoveis", ok: true, latency_ms: 120, output: { count: 3 } }],
      token_usage: {
        input_tokens: 700,
        output_tokens: 80,
        total_tokens: 780,
      },
      passes: 2,
    },
    violations: [],
    stages: [
      { stage: "normalize", started_at: "2026-05-25T12:00:00.000Z", duration_ms: 1, ok: true },
      { stage: "hydrate", started_at: "2026-05-25T12:00:00.001Z", duration_ms: 5, ok: true },
      { stage: "llm", started_at: "2026-05-25T12:00:00.006Z", duration_ms: 100, ok: true },
      { stage: "tools", started_at: "2026-05-25T12:00:00.106Z", duration_ms: 120, ok: true },
    ],
    shadow: {
      expected_output: "Separei tres opcoes aderentes no Bessa para voce comparar.",
      actual_output: "Separei tres opcoes aderentes no Bessa para voce comparar.",
      exact_match: true,
      comparison: comparison(),
      calibration: calibration(),
    },
    ...overrides,
  };
}

export function withCalibration(
  result: CognitiveTurnResult,
  overrides: Partial<BehavioralCalibration>,
): CognitiveTurnResult {
  return {
    ...result,
    shadow: {
      expected_output: result.shadow?.expected_output,
      actual_output: result.shadow?.actual_output ?? result.llm.output,
      exact_match: result.shadow?.exact_match ?? true,
      comparison: result.shadow?.comparison ?? comparison(),
      calibration: calibration(overrides),
    },
  };
}
