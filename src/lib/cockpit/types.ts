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
