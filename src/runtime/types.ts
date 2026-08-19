import type {
  CanonicalKernelDecision,
  CanonicalKernelInput,
  CanonicalMessage,
  CanonicalTool,
  RuntimeViolation,
} from "@/lib/ju-runtime/cognitive-kernel-contracts";

export type RuntimeMode = "active" | "shadow" | "behavioral_qa";

export type RuntimeConfig = {
  databaseUrl: string;
  redisUrl: string;
  openaiApiKey: string;
  openaiModel: string;
  simpleMode: boolean;
  n8nBaseUrl: string;
  n8nApiKey?: string;
  toolWebhookUrls: Partial<Record<CanonicalTool, string>>;
  runtimeMode: RuntimeMode;
  lockTtlMs: number;
  port: number;
  featureFlags: CutoverFeatureFlags;
  limits: RuntimeHardLimits;
  cost: RuntimeCostConfig;
  behavioralQa: BehavioralQaConfig;
};

export type BehavioralQaConfig = {
  phone: string;
  tenant_id: string;
};

export type RuntimeHardLimits = {
  max_recent_messages: number;
  max_summary_chars: number;
  max_retrieval_chunks: number;
  max_doctrine_retrieval: number;
  max_metadata_chars: number;
  max_context_chars: number;
  max_orchestration_passes: number;
};

export type RuntimeCostConfig = {
  input_usd_per_1m_tokens: number;
  output_usd_per_1m_tokens: number;
};

export type RuntimeTraceStage =
  | "normalize"
  | "lock"
  | "hydrate"
  | "memory"
  | "behavioral"
  | "context"
  | "llm"
  | "tools"
  | "shadow_compare"
  | "calibration"
  | "persist"
  | "outbound"
  | "release";

export type RuntimeStageTrace = {
  stage: RuntimeTraceStage;
  started_at: string;
  duration_ms: number;
  ok: boolean;
  metadata?: Record<string, unknown>;
};

export type NormalizedTurnInput = {
  tenant_id?: string | null;
  conversation_id?: string | null;
  lead_id?: string | null;
  deal_id?: string | null;
  sessionId?: string | null;
  telefoneCompleto?: string | null;
  remoteJid?: string | null;
  instance?: string | null;
  mensagemCliente: string;
  messageType?: string | null;
  event_type?: string | null;
  internal_behavioral_event?: Record<string, unknown> | null;
  shadow_expected_output?: string | null;
  shadow_original?: ShadowOriginalSnapshot | null;
  dry_run?: boolean;
};

export type HydratedTurn = CanonicalKernelInput & {
  sessionId?: string | null;
  telefoneCompleto?: string | null;
  remoteJid?: string | null;
  instance?: string | null;
  runtime_state_row?: Record<string, unknown> | null;
};

export type MemoryRuntimeResult = {
  recent_messages: CanonicalMessage[];
  compact_history: CanonicalMessage[];
  summary: string;
  behavioral_memory: Record<string, unknown>;
  operational_memory: Record<string, unknown>;
  runtime_memory: NonNullable<CanonicalKernelInput["runtime_memory"]>;
  persisted: boolean;
};

export type BehavioralRuntimeResult = {
  decision: CanonicalKernelDecision;
  operational_context: NonNullable<CanonicalKernelInput["operational_context"]>;
  runtime_memory: NonNullable<CanonicalKernelInput["runtime_memory"]>;
  violations: RuntimeViolation[];
};

export type RenderedContext = {
  context: string;
  context_chars: number;
  required_blocks_present: boolean;
};

export type ToolCallRequest = {
  tool: CanonicalTool;
  input: Record<string, unknown>;
  tool_call_id?: string;
};

export type ToolCallResult = {
  tool: CanonicalTool;
  ok: boolean;
  latency_ms: number;
  output: unknown;
  error?: string;
};

export type LlmRuntimeResult = {
  output: string;
  // Audit-only governance violations detected on the response draft. NEVER concatenated
  // into `output` — surfaced here (and to logs/metrics) for auditoria.
  governance_violations: RuntimeViolation[];
  tool_calls: ToolCallRequest[];
  tool_results: ToolCallResult[];
  token_usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  passes: number;
};

export type CognitiveTurnResult = {
  ok: boolean;
  mode: RuntimeMode;
  trace_id: string;
  conversation_id: string | null;
  decision: CanonicalKernelDecision;
  context: RenderedContext;
  llm: LlmRuntimeResult;
  violations: RuntimeViolation[];
  stages: RuntimeStageTrace[];
  shadow?: {
    expected_output?: string | null;
    actual_output: string;
    exact_match: boolean;
    comparison?: ShadowComparison;
    calibration?: BehavioralCalibration;
  };
};

export type DivergenceSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ShadowOriginalSnapshot = {
  output?: string | null;
  next_best_action?: string | null;
  property_presentation_due?: boolean | null;
  required_tools?: string[] | null;
  funnel_stage?: string | null;
  qualification_depth?: number | null;
  governance_flags?: Record<string, unknown> | null;
  inventory_fatigue?: boolean | null;
  spouse_decision?: boolean | null;
  rendered_context?: string | null;
  tool_decisions?: string[] | null;
  tool_usage?: string[] | null;
  timing_ms?: number | null;
};

export type ShadowDivergence = {
  field: string;
  severity: DivergenceSeverity;
  code: string;
  message: string;
  original: unknown;
  candidate: unknown;
};

export type ShadowBehavioralScores = {
  parity: number;
  governance_adherence: number;
  consultative_behavior: number;
  timing: number;
  orchestration_correctness: number;
  overall: number;
};

export type ShadowComparison = {
  severity: DivergenceSeverity;
  score: ShadowBehavioralScores;
  divergences: ShadowDivergence[];
  critical_failures: ShadowDivergence[];
  parity: {
    next_best_action: boolean | null;
    property_presentation_due: boolean | null;
    required_tools: boolean | null;
    funnel_stage: boolean | null;
    qualification_depth: boolean | null;
    governance_flags: boolean | null;
    inventory_fatigue: boolean | null;
    spouse_decision: boolean | null;
    rendered_context: boolean | null;
    tool_decisions: boolean | null;
    output_behavior: boolean | null;
  };
  output_analysis: {
    original_questions: number;
    candidate_questions: number;
    original_sdr_behavior: boolean;
    candidate_sdr_behavior: boolean;
    original_permission_to_search: boolean;
    candidate_permission_to_search: boolean;
    original_pressure: boolean;
    candidate_pressure: boolean;
    candidate_consultative: boolean;
  };
  readiness: {
    ready_for_cutover: boolean;
    parity_threshold_met: boolean;
    zero_critical_divergences: boolean;
    zero_sdr_regressions: boolean;
    governance_stable: boolean;
    tool_parity_stable: boolean;
  };
};

export type CalibrationDatasetTag =
  | "excellent_parity"
  | "sdr_regression"
  | "tool_timing_failure"
  | "governance_violation"
  | "inventory_fatigue_edge_case"
  | "high_performing_conversation"
  | "critical_review"
  | "edge_case";

export type EdgeCaseTag =
  | "casal_indeciso"
  | "followup_sensivel"
  | "revisit_inventory"
  | "investidor"
  | "praia"
  | "financiamento_complexo"
  | "lead_confuso"
  | "multiplos_objetivos";

export type BehavioralCalibration = {
  consultative_parity_score: {
    early_property_presentation: number;
    avoidance_sdr: number;
    avoidance_abstract_qualification: number;
    learning_through_curation: number;
    consultative_behavior: number;
    overall: number;
  };
  sdr_regression: {
    detected: boolean;
    reasons: string[];
    severity: DivergenceSeverity;
  };
  tool_timing: {
    consultar_imoveis_required: boolean;
    consultar_imoveis_executed: boolean;
    status: "on_time" | "too_early" | "too_late" | "missing" | "not_required";
    stable: boolean;
  };
  property_presentation_due_audit: {
    should_activate: boolean;
    did_activate: boolean;
    failed_to_activate: boolean;
    over_triggered: boolean;
    stable: boolean;
  };
  governance_parity_audit: {
    inventory_fatigue: boolean;
    revisit_inventory: boolean;
    spouse_governance: boolean;
    followup_pressure: boolean;
    anti_loop: boolean;
    stable: boolean;
  };
  conversational_rhythm: {
    questions_per_response: number;
    average_response_chars: number;
    commercial_pressure: boolean;
    consultative_density: number;
    presentation_timing: "early" | "delayed" | "not_applicable";
  };
  learning_set_tags: CalibrationDatasetTag[];
  edge_cases: EdgeCaseTag[];
  trends: {
    parity_over_time_key: string;
    governance_stability_key: string;
    sdr_regression_trend_key: string;
    tool_timing_trend_key: string;
    consultative_score_trend_key: string;
  };
  readiness_gates: {
    parity_gt_97: boolean;
    zero_critical_sdr_regressions: boolean;
    zero_critical_governance_violations: boolean;
    tool_timing_stable: boolean;
    property_presentation_due_stable: boolean;
    consultative_score_stable: boolean;
    ready_for_cutover: boolean;
    readiness_score: number;
  };
  human_review: {
    required: boolean;
    reasons: string[];
    priority: DivergenceSeverity;
  };
  would_have_replied: {
    output: string;
    tool_calls: string[];
  };
};

export type ReadinessLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type CutoverFeatureFlags = {
  shadow_only: boolean;
  internal_only: boolean;
  pilot_group: boolean;
  pilot_stage: PilotStage;
  percentage_rollout: number;
  force_n8n: boolean;
  force_kernel: boolean;
  emergency_fallback: boolean;
  pilot_tenants: string[];
  pilot_phones: string[];
  pilot_leads: string[];
  blocked_tenants: string[];
  blocked_phones: string[];
  blocked_leads: string[];
  rollout_frozen: boolean;
  followup_only: boolean;
  inbound_only: boolean;
  max_orchestration_latency_ms: number;
  max_tool_latency_ms: number;
  max_total_latency_ms: number;
  readiness_level: ReadinessLevel;
};

export type TrafficResponder = "n8n" | "kernel";

export type TrafficRouteReason =
  | "shadow_only"
  | "internal_only"
  | "pilot_group"
  | "percentage_rollout"
  | "force_n8n"
  | "force_kernel"
  | "emergency_fallback"
  | "safety_gate_block"
  | "auto_fallback"
  | "conversation_owner"
  | "idempotent_duplicate";

export type KernelConfidenceScore = {
  parity: number;
  governance: number;
  tool_correctness: number;
  consultative_behavior: number;
  orchestration_stability: number;
  runtime_health: number;
  overall: number;
};

export type ResponseGuardianResult = {
  allowed: boolean;
  violations: string[];
  fallback_required: boolean;
  confidence: KernelConfidenceScore;
};

export type TrafficRouteDecision = {
  responder: TrafficResponder;
  reason: TrafficRouteReason;
  readiness_level: ReadinessLevel;
  rollout_bucket: number;
  fallback_reasons: string[];
  safety_gates: {
    parity_ok: boolean;
    no_sdr_regression: boolean;
    governance_ok: boolean;
    consultative_score_ok: boolean;
    tool_timing_ok: boolean;
    runtime_health_ok: boolean;
  };
  guardian: ResponseGuardianResult;
  conversation_owner: TrafficResponder;
  idempotency_key: string;
  live_comparison_continues: true;
};

export type PilotStage = 0 | 1 | 2 | 3 | 4;

export type PilotOverrideAction =
  | "move_to_n8n"
  | "move_to_kernel"
  | "freeze_rollout"
  | "pause_tenant"
  | "block_lead";

export type PilotRolloutReason =
  | "shadow_or_disabled"
  | "internal_only"
  | "simple_inbound"
  | "controlled_traffic"
  | "selected_tenant"
  | "conversation_continuity"
  | "traffic_router_fallback"
  | "safe_filter_block"
  | "edge_case_block"
  | "latency_guard"
  | "live_validation_failed"
  | "operator_override"
  | "rollout_frozen";

export type PilotSafeFilter = {
  simple_text: boolean;
  normal_inbound: boolean;
  no_media: boolean;
  no_complex_followup: boolean;
  no_multiple_objectives: boolean;
  no_edge_cases: boolean;
};

export type PilotLatencyGuards = {
  orchestration_ms: number;
  max_orchestration_ms: number;
  max_tool_ms: number;
  max_tool_latency_ms: number;
  total_ms: number;
  max_total_ms: number;
  ok: boolean;
};

export type PilotRolloutDecision = {
  authorized_to_send: boolean;
  responder: TrafficResponder;
  stage: PilotStage;
  reason: PilotRolloutReason;
  fallback_reasons: string[];
  safe_filter: PilotSafeFilter;
  edge_case_blockers: string[];
  live_validation: ResponseGuardianResult;
  latency_guards: PilotLatencyGuards;
  readiness_score: number;
  response_to_send: string | null;
  dual_logging_required: true;
  parity_comparison_continues: true;
};

export type CostAuditSnapshot = {
  trace_id: string;
  tenant_id?: string | null;
  conversation_id?: string | null;
  lead_id?: string | null;
  funnel_stage: string;
  tokens: {
    inbound: number;
    outbound: number;
    retrieval: number;
    tool: number;
    input: number;
    output: number;
    total: number;
  };
  cost: {
    input_usd: number;
    output_usd: number;
    total_usd: number;
  };
  context_chars: number;
  context_truncated: boolean;
  tool_count: number;
  orchestration_passes: number;
};

export type BehavioralQaScenario = {
  id: string;
  title: string;
  category:
    | "lead_frio"
    | "praia_fgts"
    | "casal_indeciso"
    | "investidor_airbnb"
    | "revisita_imovel"
    | "inventory_fatigue"
    | "followup_sensivel"
    | "alto_padrao"
    | "lead_confuso"
    | "visita_agendamento"
    | "financiamento_complexo"
    | "reenvio_imovel"
    | "cliente_objetivo"
    | "cliente_emocional"
    | "lead_some_volta";
  conversation_id: string;
  lead_id: string;
  deal_id: string;
  description: string;
  messages: string[];
  expected_behavior: string[];
  expected_tools: CanonicalTool[];
};

export type BehavioralQaHumanReview = {
  naturalidade: number;
  consultoria: number;
  timing: number;
  anti_sdr: number;
  curadoria: number;
  followup: number;
  humanidade: number;
  pressao_comercial: number;
  qualidade_recomendacoes: number;
  notes: string[];
};

export type BehavioralQaAudit = {
  scenario_id: string;
  conversation_id: string;
  trace_ids: string[];
  turns: Array<{
    inbound: string;
    outbound: string;
    context_chars: number;
    next_best_action: string;
    property_presentation_due: boolean;
    required_tools: CanonicalTool[];
    tool_calls: CanonicalTool[];
    guardian_violations: string[];
    divergence_severity?: DivergenceSeverity;
  }>;
  tool_timing: {
    consultar_imoveis: "early" | "late" | "correct" | "missing" | "not_required" | "without_context";
    notes: string[];
  };
  sdr_regression: {
    detected: boolean;
    reasons: string[];
  };
  governance: {
    violations: string[];
    inventory_fatigue_ok: boolean;
    spouse_governance_ok: boolean;
    anti_loop_ok: boolean;
    followup_pressure_ok: boolean;
    revisit_inventory_ok: boolean;
    contextual_pacing_ok: boolean;
  };
  human_review: BehavioralQaHumanReview;
  score: number;
  fallback_count: number;
  guardian_rejections: number;
};

export type BehavioralQaRunReport = {
  run_id: string;
  tenant_id: string;
  phone: string;
  started_at: string;
  completed_at: string;
  scenarios: BehavioralQaScenario[];
  audits: BehavioralQaAudit[];
  summary: {
    total_scenarios: number;
    total_conversations: number;
    parity_rate: number;
    fallback_rate: number;
    sdr_regressions: number;
    governance_violations: number;
    guardian_rejections: number;
    average_score: number;
    ready_for_internal_pilot: boolean;
    ready_for_1_percent_rollout: boolean;
    ready_for_continuous_human_qa: boolean;
  };
  markdown: string;
};
