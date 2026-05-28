import type {
  JuAllowedTool,
  JuRuntimeContext,
  JuRuntimeDecision,
  JuRuntimeInput,
  JuRuntimeMessage,
} from "./types";

const ALL_TOOLS: JuAllowedTool[] = [
  "consultar_imoveis",
  "atualizar_qualificacao",
  "setar_lead_quente",
  "cadastro_inicial1",
  "SUPORTE1",
  "conhecimento_estrategico_luana1",
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function usefulTranscript(messages: JuRuntimeMessage[], max: number) {
  return messages
    .filter((message) => clean(message.content))
    .slice(-Math.max(0, max));
}

function fieldValue(decision: JuRuntimeDecision, key: string) {
  const values = decision.state_payload.field_values;
  if (!values || typeof values !== "object" || Array.isArray(values)) return "";
  return clean((values as Record<string, unknown>)[key]);
}

function formatList(values: string[]) {
  return values.length ? values.join(", ") : "nenhum";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatTranscript(messages: JuRuntimeMessage[]) {
  if (!messages.length) return "sem transcript util para este turno";
  return messages
    .map((message) => {
      const who = message.direction === "outbound" || message.sender_type === "agent" ? "Ju" : "Cliente";
      return `${who}: ${clean(message.content)}`;
    })
    .join("\n");
}

function retrievalReason(decision: JuRuntimeDecision) {
  if (decision.retrieval_policy === "disabled") {
    return decision.objective_state === "apresentar_imoveis"
      ? "busca transacional deve usar consultar_imoveis, nao RAG"
      : "objective_state nao exige recuperacao semantica";
  }
  if (decision.retrieval_policy === "required") return "next_action exige contexto recuperado";
  return "retrieval permitido apenas se o objetivo atual exigir conhecimento institucional";
}

export function buildJuRuntimeContext(
  input: JuRuntimeInput,
  decision: JuRuntimeDecision,
): JuRuntimeContext {
  const shortTranscript = usefulTranscript(
    input.recent_messages ?? [],
    decision.token_budget.transcript_messages_max,
  );
  const forbiddenTools = ALL_TOOLS.filter((tool) => !decision.allowed_tools.includes(tool));
  const retrievalAllowed = decision.retrieval_policy !== "disabled";
  const behavioralGovernance = asRecord(decision.behavioral_governance);
  const behavioralContract = asRecord(behavioralGovernance.contract);
  const questionBudget = asRecord(behavioralGovernance.question_budget);

  const hierarchy = {
    tier_1_critical_state: {
      runtime_state: decision.runtime_state,
      next_action: decision.next_action,
      conversation_mode: decision.conversation_mode,
      objective_state: decision.objective_state,
      objective_priority: decision.objective_priority,
      expected_output: decision.expected_output,
      valid_objective_transition: decision.valid_objective_transition,
      handoff_state: decision.handoff_state,
      escalation_state: decision.escalation_state,
      loop_risk: decision.loop_risk,
      valid_transition: decision.valid_transition,
      behavioral_contract_stage: behavioralGovernance.stage ?? null,
      behavioral_contract_enforced: behavioralGovernance.enforced ?? false,
    },
    tier_2_operational_memory: {
      tenant_id: decision.tenant_id,
      lead_id: decision.lead_id,
      deal_id: decision.deal_id,
      conversation_id: decision.conversation_id,
      resolved_fields: decision.resolved_fields,
      missing_fields: decision.missing_fields,
      blocked_questions: decision.blocked_questions,
    },
    tier_3_semantic_memory: {
      objetivo: fieldValue(decision, "objetivo"),
      finalidade: fieldValue(decision, "finalidade"),
      bairro: fieldValue(decision, "bairro"),
      budget: fieldValue(decision, "budget"),
      tipo_imovel: fieldValue(decision, "tipo_imovel"),
      timeline: fieldValue(decision, "timeline"),
      pagamento: fieldValue(decision, "pagamento"),
    },
    tier_4_short_transcript: shortTranscript,
    tier_5_retrieval: {
      policy: decision.retrieval_policy,
      allowed: retrievalAllowed,
      max_chunks: decision.token_budget.rag_chunks_max,
      reason: retrievalReason(decision),
    },
  };

  const currentMessage = clean(input.current_message);
  const context = [
    "<runtime_contract>",
    "LLM fala. Backend decide. Banco guarda verdade.",
    "A proxima acao ja foi decidida pelo runtime. Nao reabra fluxo por transcript.",
    "O objetivo operacional tambem ja foi decidido. Nao troque de objetivo sem autorizacao do runtime.",
    "Use somente as tools permitidas em <tool_governance>.",
    "Nao pergunte campos listados em blocked_questions.",
    "Se o cliente pedir reenvio, link quebrado ou detalhes do imovel anterior, use consultar_imoveis novamente; nunca reconstrua URL por memoria.",
    "</runtime_contract>",
    "",
    "<critical_state>",
    `runtime_state: ${decision.runtime_state}`,
    `next_action: ${decision.next_action}`,
    `conversation_mode: ${decision.conversation_mode}`,
    `objective_state: ${decision.objective_state}`,
    `objective_priority: ${decision.objective_priority}`,
    `expected_output: ${decision.expected_output}`,
    `valid_objective_transition: ${decision.valid_objective_transition ? "true" : "false"}`,
    `handoff_state: ${decision.handoff_state}`,
    `escalation_state: ${decision.escalation_state}`,
    `loop_risk: ${decision.loop_risk}`,
    "</critical_state>",
    "",
    "<tool_governance>",
    `allowed_tools: ${formatList(decision.allowed_tools)}`,
    `required_tools: ${formatList(decision.required_tools)}`,
    `forbidden_tools: ${formatList(forbiddenTools)}`,
    "url_truth: consultar_imoveis",
    "</tool_governance>",
    "",
    "<state_memory>",
    `resolved_fields: ${formatList(decision.resolved_fields)}`,
    `missing_fields: ${formatList(decision.missing_fields)}`,
    `blocked_questions: ${formatList(decision.blocked_questions)}`,
    `objetivo: ${hierarchy.tier_3_semantic_memory.objetivo || "nao informado"}`,
    `finalidade: ${hierarchy.tier_3_semantic_memory.finalidade || "nao informado"}`,
    `bairro: ${hierarchy.tier_3_semantic_memory.bairro || "nao informado"}`,
    `budget: ${hierarchy.tier_3_semantic_memory.budget || "nao informado"}`,
    `tipo_imovel: ${hierarchy.tier_3_semantic_memory.tipo_imovel || "nao informado"}`,
    `timeline: ${hierarchy.tier_3_semantic_memory.timeline || "nao informado"}`,
    "</state_memory>",
    "",
    "<retrieval_governance>",
    `policy: ${decision.retrieval_policy}`,
    `allowed: ${retrievalAllowed ? "true" : "false"}`,
    `max_chunks: ${decision.token_budget.rag_chunks_max}`,
    `reason: ${retrievalReason(decision)}`,
    "</retrieval_governance>",
    "",
    "<behavioral_contract>",
    `stage: ${clean(behavioralGovernance.stage) || "nao_aplicavel"}`,
    `enforced: ${behavioralGovernance.enforced === true ? "true" : "false"}`,
    `objective: ${clean(behavioralContract.objective) || "nao_aplicavel"}`,
    `question_budget_per_stage: ${clean(behavioralContract.question_budget_per_stage) || clean(questionBudget.max_questions_per_stage) || "1"}`,
    `max_questions_per_turn: ${clean(questionBudget.max_questions_per_turn) || "1"}`,
    `max_consecutive_questions: ${clean(questionBudget.max_consecutive_questions) || "1"}`,
    `remaining_consecutive_questions: ${clean(questionBudget.remaining_consecutive_questions) || "1"}`,
    `must_explain_consultive_model: ${behavioralContract.must_explain_consultive_model === true ? "true" : "false"}`,
    `must_request_permission_to_continue: ${behavioralContract.must_request_permission_to_continue === true ? "true" : "false"}`,
    `must_generate_value_before_more_questions: ${behavioralContract.must_generate_value_before_more_questions === true ? "true" : "false"}`,
    `must_contextualize_relevant_questions: ${behavioralContract.must_contextualize_relevant_questions === true ? "true" : "false"}`,
    `institutional_framing: ${clean(behavioralContract.institutional_framing) || "light_consultative"}`,
    `consultative_pacing: ${clean(behavioralContract.consultative_pacing) || "value_before_depth"}`,
    `forbidden_behaviors: ${formatList((behavioralContract.forbidden_behaviors as string[] | undefined) ?? [])}`,
    `forbidden_topics: ${formatList((behavioralContract.forbidden_topics as string[] | undefined) ?? [])}`,
    "</behavioral_contract>",
    "",
    "<short_transcript>",
    formatTranscript(shortTranscript),
    "</short_transcript>",
    "",
    "<mensagem_atual>",
    currentMessage,
    "</mensagem_atual>",
  ].join("\n");

  return {
    context,
    hierarchy,
    retrieval_rules: {
      policy: decision.retrieval_policy,
      allowed: retrievalAllowed,
      max_chunks: decision.token_budget.rag_chunks_max,
      reason: retrievalReason(decision),
    },
    tool_rules: {
      allowed_tools: decision.allowed_tools,
      required_tools: decision.required_tools,
      forbidden_tools: forbiddenTools,
    },
    token_metrics: {
      estimated_context_chars: context.length,
      short_transcript_messages: shortTranscript.length,
      max_transcript_messages: decision.token_budget.transcript_messages_max,
    },
  };
}
