export type JuRuntimeState =
  | "lead_novo"
  | "qualificacao"
  | "buscando_imoveis"
  | "aguardando_resposta"
  | "visita_agendada"
  | "followup_visita"
  | "negociacao"
  | "contrato"
  | "pos_venda"
  | "handoff_humano";

export type JuNextAction =
  | "qualificar_objetivo"
  | "qualificar_budget"
  | "qualificar_bairro"
  | "apresentar_imoveis"
  | "agendar_visita"
  | "followup_visita"
  | "cobrar_documentacao"
  | "handoff_corretor"
  | "responder_duvida"
  | "aguardar_resposta"
  | "fallback_midia";

export type JuConversationMode =
  | "discovery"
  | "qualification"
  | "recommendation"
  | "scheduling"
  | "negotiation"
  | "support"
  | "followup"
  | "escalation";

export type JuEscalationState = "none" | "requested" | "required" | "active" | "resolved";
export type JuHandoffState = "none" | "requested" | "assigned" | "completed";
export type JuLoopRisk = "low" | "medium" | "high";
export type JuRetrievalPolicy = "disabled" | "lazy" | "required";

export type JuObjectiveState =
  | "qualificar_intencao"
  | "qualificar_budget"
  | "qualificar_bairro"
  | "apresentar_imoveis"
  | "agendar_visita"
  | "confirmar_visita"
  | "followup_visita"
  | "recuperar_lead"
  | "cobrar_documentacao"
  | "negociar"
  | "encaminhar_corretor"
  | "responder_duvida"
  | "aguardar_resposta"
  | "tratar_falha_midia";

export type JuAllowedTool =
  | "consultar_imoveis"
  | "atualizar_qualificacao"
  | "setar_lead_quente"
  | "cadastro_inicial1"
  | "SUPORTE1"
  | "conhecimento_estrategico_luana1";

export type JuRuntimeLead = {
  id?: string | null;
  tenant_id?: string | null;
  name?: string | null;
  phone?: string | null;
  status?: string | null;
  ai_status?: string | null;
  ai_temperature?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type JuRuntimeDeal = {
  id?: string | null;
  tenant_id?: string | null;
  lead_id?: string | null;
  deal_stage?: string | null;
  qualification_status?: string | null;
  intent?: string | null;
  purpose?: string | null;
  location_preference?: string | null;
  budget_min?: number | string | null;
  budget_max?: number | string | null;
  property_type?: string | null;
  timeline?: string | null;
  payment_method?: string | null;
  assigned_broker_id?: string | null;
  status_agendamento?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type JuRuntimeConversation = {
  id?: string | null;
  tenant_id?: string | null;
  lead_id?: string | null;
  deal_id?: string | null;
  status?: string | null;
  ai_paused?: boolean | null;
  last_message?: string | null;
  last_message_at?: string | null;
  last_inbound_at?: string | null;
  last_outbound_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type JuRuntimeMessage = {
  id?: string | null;
  direction?: string | null;
  sender_type?: string | null;
  content?: string | null;
  message_type?: string | null;
  created_at?: string | null;
};

export type JuRuntimeInput = {
  tenant_id?: string | null;
  lead?: JuRuntimeLead | null;
  deal?: JuRuntimeDeal | null;
  conversation?: JuRuntimeConversation | null;
  recent_messages?: JuRuntimeMessage[];
  current_message?: string | null;
  media_state?: "none" | "processing" | "transcribed" | "failed" | null;
  entry_profile?: string | null;
  now?: string | null;
};

export type JuRuntimeDecision = {
  tenant_id: string | null;
  lead_id: string | null;
  deal_id: string | null;
  conversation_id: string | null;
  runtime_state: JuRuntimeState;
  next_action: JuNextAction;
  conversation_mode: JuConversationMode;
  escalation_state: JuEscalationState;
  handoff_state: JuHandoffState;
  objective_state: JuObjectiveState;
  objective_priority: number;
  expected_output: string;
  valid_objective_transition: boolean;
  allowed_tools: JuAllowedTool[];
  required_tools: JuAllowedTool[];
  retrieval_policy: JuRetrievalPolicy;
  blocked_questions: string[];
  resolved_fields: string[];
  missing_fields: string[];
  loop_risk: JuLoopRisk;
  transition_reason: string;
  valid_transition: boolean;
  token_budget: {
    state_chars_max: number;
    transcript_messages_max: number;
    memory_summary_chars_max: number;
    rag_chunks_max: number;
  };
  state_payload: Record<string, unknown>;
  decision_payload: Record<string, unknown>;
};

export type JuRuntimeContext = {
  context: string;
  hierarchy: {
    tier_1_critical_state: Record<string, unknown>;
    tier_2_operational_memory: Record<string, unknown>;
    tier_3_semantic_memory: Record<string, unknown>;
    tier_4_short_transcript: JuRuntimeMessage[];
    tier_5_retrieval: Record<string, unknown>;
  };
  retrieval_rules: {
    policy: JuRetrievalPolicy;
    allowed: boolean;
    max_chunks: number;
    reason: string;
  };
  tool_rules: {
    allowed_tools: JuAllowedTool[];
    required_tools: JuAllowedTool[];
    forbidden_tools: JuAllowedTool[];
  };
  token_metrics: {
    estimated_context_chars: number;
    short_transcript_messages: number;
    max_transcript_messages: number;
  };
};
