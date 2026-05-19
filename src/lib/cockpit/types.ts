export type CognitiveSeverity = "critical" | "warning" | "nominal" | "info";

export interface CognitiveHealthData {
  total_traces: number;
  loops_detectados: number;
  fallbacks: number;
  erros: number;
  transicoes_irregulares: number;
  latencia_media_ms: number | null;
  latencia_maxima_ms: number | null;
  recuperacoes_ativas: number;
  conversas_ativas: number;
  generated_at: string;
}

export interface CognitiveFeedRow {
  runtime_trace_id: string;
  correlation_id: string;
  conversation_id: string | null;
  lead_id: string | null;
  deal_id: string | null;
  runtime_state: string | null;
  previous_runtime_state: string | null;
  objective_state: string | null;
  next_action: string | null;
  loop_risk: string | null;
  loop_detected: boolean;
  fallback_triggered: boolean;
  retrieval_policy: string | null;
  retrieval_allowed: boolean | null;
  valid_transition: boolean | null;
  latency_ms: number | null;
  status: string;
  created_at: string;
  severity: CognitiveSeverity;
}

export interface SessionSummary {
  conversation_id: string;
  lead_id: string | null;
  deal_id: string | null;
  runtime_state: string | null;
  objective_state: string | null;
  worst_severity: CognitiveSeverity;
  avg_latency_ms: number | null;
  trace_count: number;
  loop_count: number;
  fallback_count: number;
  first_trace_at: string;
  last_trace_at: string;
}

export interface SessionTransition {
  runtime_trace_id: string;
  from: string | null;
  to: string | null;
  objective_state: string | null;
  severity: CognitiveSeverity;
  created_at: string;
}

export interface SessionDetail {
  conversation_id: string;
  lead_id: string | null;
  deal_id: string | null;
  current_runtime_state: string | null;
  current_objective_state: string | null;
  worst_severity: CognitiveSeverity;
  avg_latency_ms: number | null;
  max_latency_ms: number | null;
  trace_count: number;
  loop_count: number;
  fallback_count: number;
  irregular_transitions: number;
  retrieval_count: number;
  first_trace_at: string;
  last_trace_at: string;
  recent_transitions: SessionTransition[];
}

export interface LoopEvent {
  runtime_trace_id: string;
  conversation_id: string;
  runtime_state: string | null;
  objective_state: string | null;
  repetition_count: number;
  latency_ms: number | null;
  severity: CognitiveSeverity;
  created_at: string;
}

export type ReplayDirection = "início" | "avanço" | "estável" | "regressão" | "loop";

export interface ReplayFrame {
  runtime_trace_id: string;
  sequence: number;
  direction: ReplayDirection;
  previous_runtime_state: string | null;
  runtime_state: string | null;
  previous_objective_state: string | null;
  objective_state: string | null;
  next_action: string | null;
  loop_detected: boolean;
  fallback_triggered: boolean;
  retrieval_policy: string | null;
  retrieval_allowed: boolean | null;
  valid_transition: boolean | null;
  latency_ms: number | null;
  severity: CognitiveSeverity;
  created_at: string;
}
