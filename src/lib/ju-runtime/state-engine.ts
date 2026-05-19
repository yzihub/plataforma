import type {
  JuAllowedTool,
  JuConversationMode,
  JuLoopRisk,
  JuNextAction,
  JuObjectiveState,
  JuRuntimeDecision,
  JuRuntimeInput,
  JuRuntimeState,
} from "./types";

const QUALIFICATION_FIELDS = {
  objetivo: "objetivo",
  finalidade: "finalidade",
  bairro: "bairro",
  budget: "budget",
  tipo_imovel: "tipo_imovel",
  timeline: "timeline",
  pagamento: "pagamento",
} as const;

const STATE_TOOLS: Record<JuRuntimeState, JuAllowedTool[]> = {
  lead_novo: ["atualizar_qualificacao", "conhecimento_estrategico_luana1"],
  qualificacao: ["consultar_imoveis", "atualizar_qualificacao", "conhecimento_estrategico_luana1"],
  buscando_imoveis: ["consultar_imoveis", "atualizar_qualificacao", "setar_lead_quente", "conhecimento_estrategico_luana1"],
  aguardando_resposta: ["consultar_imoveis", "atualizar_qualificacao", "setar_lead_quente"],
  visita_agendada: ["setar_lead_quente", "SUPORTE1"],
  followup_visita: ["consultar_imoveis", "setar_lead_quente", "SUPORTE1"],
  negociacao: ["setar_lead_quente", "SUPORTE1"],
  contrato: ["SUPORTE1"],
  pos_venda: ["SUPORTE1"],
  handoff_humano: ["setar_lead_quente", "SUPORTE1"],
};

const OBJECTIVE_TOOLS: Record<JuObjectiveState, JuAllowedTool[]> = {
  qualificar_intencao: ["atualizar_qualificacao", "conhecimento_estrategico_luana1"],
  qualificar_budget: ["atualizar_qualificacao", "consultar_imoveis"],
  qualificar_bairro: ["atualizar_qualificacao", "consultar_imoveis", "conhecimento_estrategico_luana1"],
  apresentar_imoveis: ["consultar_imoveis", "atualizar_qualificacao", "setar_lead_quente"],
  agendar_visita: ["setar_lead_quente", "consultar_imoveis"],
  confirmar_visita: ["setar_lead_quente", "SUPORTE1"],
  followup_visita: ["consultar_imoveis", "setar_lead_quente", "SUPORTE1"],
  recuperar_lead: ["atualizar_qualificacao", "consultar_imoveis"],
  cobrar_documentacao: ["SUPORTE1"],
  negociar: ["setar_lead_quente", "SUPORTE1"],
  encaminhar_corretor: ["setar_lead_quente", "SUPORTE1"],
  responder_duvida: ["conhecimento_estrategico_luana1", "consultar_imoveis"],
  aguardar_resposta: [],
  tratar_falha_midia: ["SUPORTE1"],
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function norm(value: unknown): string {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function metaValue(metadata: Record<string, unknown> | null | undefined, ...keys: string[]) {
  if (!metadata) return "";
  for (const key of keys) {
    const value = metadata[key];
    if (clean(value)) return clean(value);
  }
  return "";
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function inferResolvedFields(input: JuRuntimeInput) {
  const deal = input.deal ?? {};
  const leadMeta = input.lead?.metadata ?? {};
  const dealMeta = deal.metadata ?? {};

  const values = {
    objetivo: clean(deal.intent) || metaValue(leadMeta, "objetivo") || metaValue(dealMeta, "objetivo"),
    finalidade: clean(deal.purpose) || metaValue(leadMeta, "finalidade") || metaValue(dealMeta, "finalidade"),
    bairro: clean(deal.location_preference) || metaValue(leadMeta, "bairro_interesse", "bairro") || metaValue(dealMeta, "bairro_interesse", "bairro"),
    budget:
      clean(deal.budget_max) ||
      clean(deal.budget_min) ||
      metaValue(leadMeta, "faixa_valor", "budget", "valor_max") ||
      metaValue(dealMeta, "faixa_valor", "budget", "valor_max"),
    tipo_imovel: clean(deal.property_type) || metaValue(leadMeta, "tipo_imovel") || metaValue(dealMeta, "tipo_imovel"),
    timeline: clean(deal.timeline) || metaValue(leadMeta, "timeline", "prazo") || metaValue(dealMeta, "timeline", "prazo"),
    pagamento: clean(deal.payment_method) || metaValue(leadMeta, "payment_method", "pagamento") || metaValue(dealMeta, "payment_method", "pagamento"),
  };

  const resolved = Object.entries(values)
    .filter(([, value]) => clean(value))
    .map(([key]) => key);

  const missing = [
    values.objetivo || values.finalidade ? "" : QUALIFICATION_FIELDS.objetivo,
    values.bairro ? "" : QUALIFICATION_FIELDS.bairro,
    values.budget ? "" : QUALIFICATION_FIELDS.budget,
    values.timeline ? "" : QUALIFICATION_FIELDS.timeline,
  ];

  return {
    values,
    resolved_fields: unique(resolved),
    missing_fields: unique(missing),
  };
}

function inferSignals(input: JuRuntimeInput) {
  const current = norm(input.current_message);
  const conversation = input.conversation ?? {};
  const deal = input.deal ?? {};
  const lead = input.lead ?? {};
  const meta = { ...(lead.metadata ?? {}), ...(deal.metadata ?? {}), ...(conversation.metadata ?? {}) };
  const propertyRef = clean(meta.imovel_ref) || clean(meta.property_ref) || clean(meta.codigo_ref);

  return {
    current,
    isPaused: conversation.ai_paused === true || norm(conversation.status) === "paused",
    asksHuman: hasAny(current, ["humano", "corretor", "atendente", "ligacao", "ligar", "telefone de alguem", "falar com alguem"]),
    asksVisit: hasAny(current, ["visita", "visitar", "agenda", "agendar", "conhecer o imovel", "ver o imovel"]),
    asksProperties: hasAny(current, ["opcoes", "imoveis", "apartamento", "casa", "tem algum", "disponivel", "codigo", "ref", "jp"]),
    asksMarketContext: hasAny(current, [
      "perfil desse bairro",
      "perfil do bairro",
      "sobre esse bairro",
      "como e esse bairro",
      "bairro e bom",
      "vale a pena",
      "valorizacao",
      "liquidez",
      "regiao",
    ]),
    asksSupport: hasAny(current, ["problema", "suporte", "reclamacao", "erro", "nao consigo"]),
    propertyRef,
    hasContractSignal: hasAny(norm(deal.deal_stage), ["contrato"]) || hasAny(current, ["contrato", "documentacao", "documentos"]),
    hasNegotiationSignal: hasAny(norm(deal.deal_stage), ["negociacao", "proposta"]) || hasAny(current, ["proposta", "negociar", "desconto", "sinal"]),
    hasVisitScheduled: norm(deal.status_agendamento) === "confirmado" || norm(deal.deal_stage).includes("visita"),
    mediaFailed: input.media_state === "failed",
  };
}

function inferRuntimeState(input: JuRuntimeInput, resolved: string[]): JuRuntimeState {
  const signals = inferSignals(input);
  const dealStage = norm(input.deal?.deal_stage);
  const leadStatus = norm(input.lead?.status);

  if (signals.isPaused || signals.asksHuman) return "handoff_humano";
  if (signals.hasContractSignal) return "contrato";
  if (signals.hasNegotiationSignal) return "negociacao";
  if (dealStage.includes("follow")) return "followup_visita";
  if (signals.hasVisitScheduled) return "visita_agendada";
  if (signals.propertyRef || signals.asksProperties || (resolved.includes("bairro") && (resolved.includes("tipo_imovel") || resolved.includes("budget")))) {
    return "buscando_imoveis";
  }
  if (!input.lead?.id || leadStatus === "new" || leadStatus === "novo") return "lead_novo";
  return "qualificacao";
}

function inferNextAction(input: JuRuntimeInput, runtimeState: JuRuntimeState, resolved: string[], missing: string[]): JuNextAction {
  const signals = inferSignals(input);

  if (signals.mediaFailed) return "fallback_midia";
  if (signals.isPaused) return "aguardar_resposta";
  if (signals.asksHuman) return "handoff_corretor";
  if (!clean(input.current_message)) return "aguardar_resposta";
  if (signals.asksVisit || runtimeState === "visita_agendada") return "agendar_visita";
  if (signals.asksMarketContext) return "responder_duvida";
  if (runtimeState === "followup_visita") return "followup_visita";
  if (runtimeState === "contrato") return "cobrar_documentacao";
  if (runtimeState === "buscando_imoveis") return "apresentar_imoveis";
  if (missing.includes("objetivo") && !resolved.includes("finalidade")) return "qualificar_objetivo";
  if (missing.includes("bairro")) return "qualificar_bairro";
  if (missing.includes("budget")) return "qualificar_budget";
  return "responder_duvida";
}

function modeFor(runtimeState: JuRuntimeState, nextAction: JuNextAction): JuConversationMode {
  if (runtimeState === "handoff_humano" || nextAction === "handoff_corretor") return "escalation";
  if (nextAction === "agendar_visita") return "scheduling";
  if (runtimeState === "negociacao" || runtimeState === "contrato") return "negotiation";
  if (runtimeState === "followup_visita") return "followup";
  if (nextAction === "apresentar_imoveis") return "recommendation";
  if (nextAction.startsWith("qualificar_")) return "qualification";
  return "discovery";
}

function requiredToolsFor(objectiveState: JuObjectiveState, nextAction: JuNextAction): JuAllowedTool[] {
  if (objectiveState === "apresentar_imoveis" || nextAction === "apresentar_imoveis") return ["consultar_imoveis"];
  if (objectiveState === "encaminhar_corretor" || objectiveState === "agendar_visita") return ["setar_lead_quente"];
  return [];
}

function retrievalPolicyFor(objectiveState: JuObjectiveState, nextAction: JuNextAction) {
  if (objectiveState === "qualificar_bairro" || objectiveState === "responder_duvida") return "lazy" as const;
  if (objectiveState === "apresentar_imoveis" || nextAction === "apresentar_imoveis") return "disabled" as const;
  return "disabled" as const;
}

function detectLoopRisk(input: JuRuntimeInput, nextAction: JuNextAction): JuLoopRisk {
  const recent = input.recent_messages ?? [];
  const outboundQuestions = recent
    .filter((message) => message.direction === "outbound" || message.sender_type === "agent")
    .map((message) => norm(message.content))
    .filter(Boolean);

  const target = nextAction.replace("qualificar_", "");
  if (!target || !nextAction.startsWith("qualificar_")) return "low";

  const repeats = outboundQuestions.filter((message) => message.includes(target) || message.includes("qual")).length;
  if (repeats >= 2) return "high";
  if (repeats === 1) return "medium";
  return "low";
}

function blockedQuestionsFor(resolved: string[]) {
  return unique(
    resolved.map((field) => {
      if (field === "tipo_imovel") return "tipo_imovel";
      return field;
    }),
  );
}

function objectiveStateFor(runtimeState: JuRuntimeState, nextAction: JuNextAction): JuObjectiveState {
  if (nextAction === "fallback_midia") return "tratar_falha_midia";
  if (nextAction === "handoff_corretor") return "encaminhar_corretor";
  if (nextAction === "agendar_visita") return runtimeState === "visita_agendada" ? "confirmar_visita" : "agendar_visita";
  if (nextAction === "followup_visita") return "followup_visita";
  if (nextAction === "cobrar_documentacao") return "cobrar_documentacao";
  if (nextAction === "apresentar_imoveis") return "apresentar_imoveis";
  if (nextAction === "qualificar_budget") return "qualificar_budget";
  if (nextAction === "qualificar_bairro") return "qualificar_bairro";
  if (nextAction === "qualificar_objetivo") return "qualificar_intencao";
  if (nextAction === "aguardar_resposta") return "aguardar_resposta";
  if (runtimeState === "negociacao") return "negociar";
  return "responder_duvida";
}

function objectivePriorityFor(objectiveState: JuObjectiveState) {
  const priority: Record<JuObjectiveState, number> = {
    encaminhar_corretor: 100,
    tratar_falha_midia: 95,
    agendar_visita: 90,
    confirmar_visita: 88,
    apresentar_imoveis: 80,
    negociar: 75,
    cobrar_documentacao: 70,
    followup_visita: 65,
    recuperar_lead: 60,
    qualificar_intencao: 50,
    qualificar_budget: 45,
    qualificar_bairro: 45,
    responder_duvida: 35,
    aguardar_resposta: 10,
  };
  return priority[objectiveState];
}

function expectedOutputFor(objectiveState: JuObjectiveState) {
  const outputs: Record<JuObjectiveState, string> = {
    qualificar_intencao: "uma pergunta curta para descobrir intencao principal",
    qualificar_budget: "uma pergunta curta sobre faixa de valor ou financiamento",
    qualificar_bairro: "uma pergunta curta sobre bairro/regiao, sem repetir campo resolvido",
    apresentar_imoveis: "contextualizar busca e usar consultar_imoveis quando disponivel",
    agendar_visita: "conduzir para agendamento ou corretor responsavel",
    confirmar_visita: "confirmar dados essenciais da visita",
    followup_visita: "retomar visita com proxima acao clara",
    recuperar_lead: "retomar conversa com alternativa objetiva",
    cobrar_documentacao: "pedir documento pendente de forma direta",
    negociar: "conduzir negociacao sem inventar condicoes",
    encaminhar_corretor: "encaminhar para corretor/humano",
    responder_duvida: "responder apenas a duvida atual",
    aguardar_resposta: "nao avancar fluxo sem nova informacao",
    tratar_falha_midia: "explicar falha de midia e pedir reenvio se necessario",
  };
  return outputs[objectiveState];
}

function isValidObjectiveTransition(previous: JuObjectiveState | null | undefined, next: JuObjectiveState) {
  if (!previous || previous === next) return true;
  const allowed: Record<JuObjectiveState, JuObjectiveState[]> = {
    qualificar_intencao: ["qualificar_budget", "qualificar_bairro", "apresentar_imoveis", "encaminhar_corretor"],
    qualificar_budget: ["qualificar_bairro", "apresentar_imoveis", "encaminhar_corretor"],
    qualificar_bairro: ["qualificar_budget", "apresentar_imoveis", "encaminhar_corretor"],
    apresentar_imoveis: ["agendar_visita", "qualificar_budget", "qualificar_bairro", "encaminhar_corretor", "responder_duvida"],
    agendar_visita: ["confirmar_visita", "followup_visita", "encaminhar_corretor"],
    confirmar_visita: ["followup_visita", "negociar", "encaminhar_corretor"],
    followup_visita: ["apresentar_imoveis", "negociar", "encaminhar_corretor"],
    recuperar_lead: ["qualificar_intencao", "apresentar_imoveis", "encaminhar_corretor"],
    cobrar_documentacao: ["negociar", "encaminhar_corretor"],
    negociar: ["cobrar_documentacao", "encaminhar_corretor"],
    encaminhar_corretor: ["qualificar_intencao", "apresentar_imoveis", "agendar_visita"],
    responder_duvida: ["qualificar_intencao", "qualificar_budget", "qualificar_bairro", "apresentar_imoveis", "encaminhar_corretor"],
    aguardar_resposta: ["qualificar_intencao", "qualificar_budget", "qualificar_bairro", "apresentar_imoveis", "encaminhar_corretor"],
    tratar_falha_midia: ["qualificar_intencao", "apresentar_imoveis", "encaminhar_corretor"],
  };
  return allowed[previous]?.includes(next) ?? false;
}

function isValidTransition(previous: JuRuntimeState | null | undefined, next: JuRuntimeState) {
  if (!previous || previous === next) return true;
  const allowed: Record<JuRuntimeState, JuRuntimeState[]> = {
    lead_novo: ["qualificacao", "handoff_humano"],
    qualificacao: ["buscando_imoveis", "aguardando_resposta", "handoff_humano"],
    buscando_imoveis: ["aguardando_resposta", "visita_agendada", "handoff_humano", "qualificacao"],
    aguardando_resposta: ["qualificacao", "buscando_imoveis", "visita_agendada", "handoff_humano"],
    visita_agendada: ["followup_visita", "negociacao", "handoff_humano"],
    followup_visita: ["buscando_imoveis", "negociacao", "handoff_humano"],
    negociacao: ["contrato", "handoff_humano"],
    contrato: ["pos_venda", "handoff_humano"],
    pos_venda: ["handoff_humano"],
    handoff_humano: ["qualificacao", "buscando_imoveis", "visita_agendada"],
  };
  return allowed[previous]?.includes(next) ?? false;
}

export function buildJuRuntimeDecision(
  input: JuRuntimeInput,
  previousState?: Pick<JuRuntimeDecision, "runtime_state" | "next_action" | "objective_state"> | null,
): JuRuntimeDecision {
  const fields = inferResolvedFields(input);
  const runtimeState = inferRuntimeState(input, fields.resolved_fields);
  const nextAction = inferNextAction(input, runtimeState, fields.resolved_fields, fields.missing_fields);
  const objectiveState = objectiveStateFor(runtimeState, nextAction);
  const requiredTools = requiredToolsFor(objectiveState, nextAction);
  const allowedTools = unique([...STATE_TOOLS[runtimeState], ...OBJECTIVE_TOOLS[objectiveState], ...requiredTools]) as JuAllowedTool[];
  const conversationMode = modeFor(runtimeState, nextAction);
  const signals = inferSignals(input);
  const loopRisk = detectLoopRisk(input, nextAction);
  const validTransition = isValidTransition(previousState?.runtime_state, runtimeState);
  const validObjectiveTransition = isValidObjectiveTransition(previousState?.objective_state, objectiveState);

  return {
    tenant_id: input.tenant_id ?? input.lead?.tenant_id ?? input.deal?.tenant_id ?? input.conversation?.tenant_id ?? null,
    lead_id: input.lead?.id ?? input.conversation?.lead_id ?? input.deal?.lead_id ?? null,
    deal_id: input.deal?.id ?? input.conversation?.deal_id ?? null,
    conversation_id: input.conversation?.id ?? null,
    runtime_state: runtimeState,
    next_action: nextAction,
    conversation_mode: conversationMode,
    escalation_state: signals.asksSupport ? "requested" : signals.asksHuman ? "required" : "none",
    handoff_state: signals.asksHuman ? "requested" : "none",
    objective_state: objectiveState,
    objective_priority: objectivePriorityFor(objectiveState),
    expected_output: expectedOutputFor(objectiveState),
    valid_objective_transition: validObjectiveTransition,
    allowed_tools: allowedTools,
    required_tools: requiredTools,
    retrieval_policy: retrievalPolicyFor(objectiveState, nextAction),
    blocked_questions: blockedQuestionsFor(fields.resolved_fields),
    resolved_fields: fields.resolved_fields,
    missing_fields: fields.missing_fields,
    loop_risk: loopRisk,
    transition_reason: signals.mediaFailed
      ? "media_failure"
      : signals.asksHuman
        ? "human_handoff_signal"
        : nextAction,
    valid_transition: validTransition,
    token_budget: {
      state_chars_max: 1000,
      transcript_messages_max: loopRisk === "high" ? 3 : 6,
      memory_summary_chars_max: 1200,
      rag_chunks_max: nextAction === "responder_duvida" ? 2 : 0,
    },
    state_payload: {
      current_message_present: Boolean(clean(input.current_message)),
      media_state: input.media_state ?? "none",
      entry_profile: input.entry_profile ?? "unknown",
      field_values: fields.values,
      previous_runtime_state: previousState?.runtime_state ?? null,
      previous_next_action: previousState?.next_action ?? null,
      previous_objective_state: previousState?.objective_state ?? null,
    },
    decision_payload: {
      rule_version: "ju_runtime_objective_engine_v1",
      llm_may_decide_flow: false,
      objective_governance: {
        active_objective: objectiveState,
        priority: objectivePriorityFor(objectiveState),
        expected_output: expectedOutputFor(objectiveState),
        valid_transition: validObjectiveTransition,
      },
      response_contract: {
        speak_only_for_next_action: true,
        speak_only_for_objective: true,
        backend_decides_flow: true,
        database_is_truth: true,
      },
    },
  };
}
