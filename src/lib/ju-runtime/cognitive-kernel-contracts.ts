import { z } from "zod";

export const JU_KERNEL_VERSION = "ju_hardened_hot_path_contract_v1" as const;

export const canonicalRuntimeStates = [
  "lead_novo",
  "qualificando",
  "matching",
  "comparando",
  "visita",
  "followup",
] as const;

export const canonicalNextBestActions = [
  "descobrir_contexto",
  "aprofundar_criterios",
  "apresentar_opcoes_aderentes",
  "acompanhar_decisao_casal",
  "consolidar_favorito",
  "facilitar_agendamento",
  "manter_radar_contextual",
  "reduzir_inventory",
] as const;

export const canonicalTools = [
  "consultar_imoveis",
  "atualizar_qualificacao",
  "setar_lead_quente",
  "conhecimento_estrategico_luana1",
] as const;

export const contextBlockOrder = [
  "yzi_operational_runtime",
  "estado_operacional",
  "funnel_runtime",
  "preferencias_cliente",
  "governanca_comportamental",
  "historico_curto",
  "internal_behavioral_event",
  "mensagem_atual",
  "tool_revalidation",
] as const;

export type CanonicalRuntimeState = (typeof canonicalRuntimeStates)[number];
export type CanonicalNextBestAction = (typeof canonicalNextBestActions)[number];
export type CanonicalTool = (typeof canonicalTools)[number];
export type CanonicalContextBlock = (typeof contextBlockOrder)[number];

export type CanonicalLead = {
  id?: string | null;
  tenant_id?: string | null;
  name?: string | null;
  status?: string | null;
  ai_status?: string | null;
  ai_last_intent?: string | null;
};

export type CanonicalDeal = {
  id?: string | null;
  intent?: string | null;
  location_preference?: string | null;
  property_type?: string | null;
  bedrooms?: string | number | null;
  budget_min?: string | number | null;
  budget_max?: string | number | null;
  timeline?: string | null;
  payment_method?: string | null;
  decision_maker?: string | null;
};

export type CanonicalConversation = {
  id?: string | null;
  status?: string | null;
  ai_paused?: boolean | null;
};

export type CanonicalMessage = {
  direction?: "inbound" | "outbound" | string | null;
  sender_type?: "lead" | "agent" | string | null;
  content?: string | null;
  created_at?: string | null;
};

export type CanonicalOperationalContext = {
  funnel_stage?: CanonicalRuntimeState | null;
  decision_style?: "casal" | "individual" | "desconhecido" | string | null;
  objective?: string | null;
  preferred_regions?: string[];
  property_type?: string | null;
  bedrooms?: string | number | null;
  budget_min?: string | number | null;
  budget_max?: string | number | null;
  beach_interest?: boolean;
  financing_signal?: boolean;
  fgts_signal?: boolean;
  credit_letter_signal?: boolean;
  favorite_property?: string | null;
  visit_interest_score?: number;
  followup_enabled?: boolean;
};

export type CanonicalRuntimeMemory = {
  qualification_depth?: number;
  inventory_fatigue?: boolean;
  properties_sent_count?: number;
  spouse_decision_signal?: boolean;
  revisit_inventory_signal?: boolean;
  favorite_signal?: boolean;
  visit_intent_signal?: boolean;
  handoff_signal?: boolean;
  property_intent_signal?: boolean;
  next_best_action?: CanonicalNextBestAction | string | null;
  last_property_presentation_at?: string | null;
};

export type CanonicalKernelInput = {
  tenant_id?: string | null;
  lead?: CanonicalLead | null;
  deal?: CanonicalDeal | null;
  conversation?: CanonicalConversation | null;
  recent_messages?: CanonicalMessage[];
  mensagemCliente?: string | null;
  messageType?: string | null;
  event_type?: string | null;
  internal_behavioral_event?: Record<string, unknown> | null;
  operational_context?: CanonicalOperationalContext | null;
  runtime_memory?: CanonicalRuntimeMemory | null;
  now?: string | null;
};

export type CanonicalSignals = {
  property_intent: boolean;
  useful_context: boolean;
  region_context: boolean;
  budget_context: boolean;
  type_context: boolean;
  bedrooms_context: boolean;
  matching_context_complete: boolean;
  objective_context: boolean;
  beach_interest: boolean;
  financing_signal: boolean;
  fgts_signal: boolean;
  credit_letter_signal: boolean;
  spouse_decision_signal: boolean;
  revisit_inventory_signal: boolean;
  favorite_signal: boolean;
  visit_intent_signal: boolean;
  handoff_signal: boolean;
  followup_signal: boolean;
  property_revalidation_required: boolean;
  inventory_fatigue: boolean;
  properties_sent_count: number;
};

export type RuntimeViolationCode =
  | "invalid_state_transition"
  | "invalid_next_action"
  | "missing_required_tool"
  | "forbidden_tool"
  | "orphan_tool_execution"
  | "sdr_behavior"
  | "permission_to_search"
  | "abstract_qualification_loop"
  | "too_many_questions"
  | "too_many_properties"
  | "inventory_loop"
  | "excessive_followup_pressure"
  | "invalid_context_contract"
  | "memory_replay_unbounded";

export type RuntimeViolation = {
  code: RuntimeViolationCode;
  message: string;
};

export type CanonicalKernelDecision = {
  version: typeof JU_KERNEL_VERSION;
  runtime_state: CanonicalRuntimeState;
  next_best_action: CanonicalNextBestAction;
  property_presentation_due: boolean;
  required_tools: CanonicalTool[];
  allowed_tools: CanonicalTool[];
  forbidden_tools: CanonicalTool[];
  retrieval_policy: "minimal" | "tool_required";
  signals: CanonicalSignals;
  governance: {
    ai_first_runtime: true;
    supabase_is_source_of_truth: true;
    redis_is_short_memory: true;
    consultar_imoveis_is_truth: true;
    never_reconstruct_property_url: true;
    max_questions_per_message: 1;
    max_properties_per_presentation: 3;
    max_recent_history_messages: 10;
    max_followup_due_tasks: 5;
    presentation_mode: "none" | "curated" | "revalidation" | "curated_or_reanchor";
    inventory_fatigue_protection: boolean;
    followup_pressure_reduction: boolean;
    spouse_decision_governance: boolean;
  };
  state_machine: {
    valid_transitions: CanonicalRuntimeState[];
    forbidden_transitions: CanonicalRuntimeState[];
    side_effects: string[];
  };
  blocked_behaviors: RuntimeViolationCode[];
  context_contract: {
    required_blocks: CanonicalContextBlock[];
    optional_blocks: CanonicalContextBlock[];
    rendering_order: CanonicalContextBlock[];
  };
  memory_contract: {
    recent_history_max: 10;
    compact_history_required: true;
    rolling_summary_boundary: "outside_hot_path_until_persisted";
    bounded_replay: true;
  };
};

export type CanonicalResponseDraft = {
  text: string;
  tools_called?: CanonicalTool[];
  property_cards_count?: number;
};

const stateTransitionMap: Record<CanonicalRuntimeState, CanonicalRuntimeState[]> = {
  lead_novo: ["lead_novo", "qualificando", "matching", "followup"],
  qualificando: ["qualificando", "matching", "comparando", "visita", "followup"],
  matching: ["matching", "comparando", "visita", "followup", "qualificando"],
  comparando: ["comparando", "matching", "visita", "followup"],
  visita: ["visita", "comparando", "followup"],
  followup: ["followup", "matching", "comparando", "visita", "qualificando"],
};

const stateSideEffects: Record<CanonicalRuntimeState, string[]> = {
  lead_novo: ["preserve_entrypoint", "avoid_sdr_form"],
  qualificando: ["update_qualification_when_new_profile_signal"],
  matching: ["consultar_imoveis_when_property_presentation_due", "persist_properties_sent_count"],
  comparando: ["respect_spouse_timing", "reanchor_favorite_before_new_inventory"],
  visita: ["setar_lead_quente_only_after_visit_or_coffee_acceptance"],
  followup: ["reduce_pressure", "mark_followup_after_successful_outbound"],
};

const nextActionContracts: Record<
  CanonicalNextBestAction,
  {
    validWhen: string[];
    forbiddenWhen: string[];
    preconditions: string[];
    postconditions: string[];
  }
> = {
  descobrir_contexto: {
    validWhen: ["no useful context", "lead_novo"],
    forbiddenWhen: ["property_presentation_due", "visit_intent_signal"],
    preconditions: ["message present", "ai not paused"],
    postconditions: ["ask at most one useful question"],
  },
  aprofundar_criterios: {
    validWhen: ["qualification_depth >= 4", "no property_presentation_due"],
    forbiddenWhen: ["property_presentation_due", "revisit_inventory_signal"],
    preconditions: ["at least one missing useful criterion"],
    postconditions: ["persist qualification if new signal exists"],
  },
  apresentar_opcoes_aderentes: {
    validWhen: ["property_presentation_due", "matching", "revalidation"],
    forbiddenWhen: ["no property intent and no runtime demand"],
    preconditions: ["consultar_imoveis is required"],
    postconditions: ["present before asking", "use pure valid URL from tool", "max 3 properties"],
  },
  acompanhar_decisao_casal: {
    validWhen: ["spouse_decision_signal", "decision_style casal"],
    forbiddenWhen: ["single decision with visit acceptance"],
    preconditions: ["casal signal exists"],
    postconditions: ["reduce pressure", "do not force immediate visit"],
  },
  consolidar_favorito: {
    validWhen: ["favorite_signal", "revisit_inventory_signal"],
    forbiddenWhen: ["no favorite context"],
    preconditions: ["favorite or previous property reference exists"],
    postconditions: ["reanchor favorite", "avoid mass inventory"],
  },
  facilitar_agendamento: {
    validWhen: ["visit_intent_signal"],
    forbiddenWhen: ["no visit or coffee acceptance"],
    preconditions: ["lead accepted visit or coffee"],
    postconditions: ["setar_lead_quente may be required"],
  },
  manter_radar_contextual: {
    validWhen: ["followup"],
    forbiddenWhen: ["property_presentation_due with useful context"],
    preconditions: ["followup task or followup signal"],
    postconditions: ["short natural consultative message", "no automation disclosure"],
  },
  reduzir_inventory: {
    validWhen: ["inventory_fatigue"],
    forbiddenWhen: ["fresh explicit revalidation needing URL truth"],
    preconditions: ["properties_sent_count >= 6"],
    postconditions: ["stop mass recommendations", "ask one narrowing question or reanchor"],
  },
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalize(term)));
}

function usefulNumber(value: unknown) {
  return clean(value) !== "" && clean(value) !== "0";
}

function countOutboundProperties(messages: CanonicalMessage[]) {
  return messages.filter((message) => {
    const text = normalize(message.content);
    const outbound = message.direction === "outbound" || message.sender_type === "agent";
    return outbound && (text.includes("https://jurema.app/imovel") || text.includes("https://juremabksimoveis.com.br/imoveis"));
  }).length;
}

export function inferCanonicalSignals(input: CanonicalKernelInput): CanonicalSignals {
  const message = normalize(input.mensagemCliente);
  const deal = input.deal ?? {};
  const lead = input.lead ?? {};
  const operational = input.operational_context ?? {};
  const runtime = input.runtime_memory ?? {};
  const recent = input.recent_messages ?? [];
  const conversationText = normalize([input.mensagemCliente, ...recent.slice(-12).map((m) => m.content)].join(" "));

  const propertyRevalidationRequired = hasAny(message, [
    "manda de novo",
    "manda novamente",
    "reenvia",
    "link deu erro",
    "link falhou",
    "qual era aquele imovel",
    "qual era aquele imóvel",
    "abre mais aquele apartamento",
    "detalhes do imovel anterior",
    "aquele que voce falou",
    "tinha comentado",
    "ainda faz sentido",
    "voltei aqui",
  ]);
  const revisitInventorySignal = propertyRevalidationRequired || hasAny(conversationText, ["aquele apartamento", "me manda aquele"]);
  const visitIntentSignal = hasAny(conversationText, ["visitar", "visita", "agendar visita", "marcar visita", "ver pessoalmente", "quero conhecer"]);
  const humanHandoffSignal = hasAny(conversationText, [
    "quero corretor",
    "um corretor",
    "corretor humano",
    "humano",
    "atendente",
    "atendimento humano",
    "ligacao",
    "ligacao de alguem",
    "ligar",
    "me liga",
    "pode me ligar",
    "telefone de alguem",
    "alguem para falar",
    "falar com alguem",
    "falar com alguém",
    "falar com corretor",
    "falar com atendente",
  ]);
  const handoffSignal = visitIntentSignal || humanHandoffSignal;
  const spouseDecisionSignal = hasAny(conversationText, ["minha esposa", "meu marido", "falar com ela", "esperando ela", "casal"]);
  const favoriteSignal = hasAny(conversationText, ["gostei mais desse", "esse ficou melhor", "esse fez mais sentido", "esse me agradou", "preferi esse", "curti esse"]);
  const beachInterest = Boolean(operational.beach_interest) || hasAny(conversationText, ["praia", "beira mar", "beira-mar", "cabo branco", "tambau", "bessa"]);
  const financingSignal = Boolean(operational.financing_signal) || hasAny(conversationText, ["financiamento", "financiar"]);
  const fgtsSignal = Boolean(operational.fgts_signal) || hasAny(conversationText, ["fgts"]);
  const creditLetterSignal = Boolean(operational.credit_letter_signal) || hasAny(conversationText, ["carta de credito", "carta contemplada"]);
  const propertyIntent = revisitInventorySignal || visitIntentSignal || hasAny(message, [
    "imovel",
    "imoveis",
    "apartamento",
    "apto",
    "cobertura",
    "casa",
    "flat",
    "studio",
    "opcao",
    "opcoes",
    "sugestao",
    "sugestoes",
    "recomendacao",
    "recomendacoes",
    "link",
    "visita",
    "visitar",
    "disponivel",
    "disponiveis",
    "pode mandar",
    "manda uma",
    "me manda",
    "se tiver",
    "tem algo",
    "financiar",
    "financiamento",
    "alto padrao",
    "alto padrão",
  ]);
  const regionContext = Boolean(operational.preferred_regions?.length || deal.location_preference || hasAny(message, [
    "bessa",
    "jardim oceania",
    "cabo branco",
    "tambau",
    "manaira",
    "intermares",
    "ponta de campina",
    "altiplano",
  ]));
  const budgetContext = Boolean(usefulNumber(operational.budget_min) || usefulNumber(operational.budget_max) || usefulNumber(deal.budget_min) || usefulNumber(deal.budget_max) || /(?:r\$|\b\d+\s*(?:mil|k)\b)/i.test(clean(input.mensagemCliente)));
  const bedroomsContext = Boolean(usefulNumber(operational.bedrooms) || usefulNumber(deal.bedrooms) || /\b[1-6]\s*(?:quartos?|qts?|dormitorios?|dorms?)\b/i.test(clean(input.mensagemCliente)));
  const typeContext = Boolean(operational.property_type || deal.property_type || /\b(?:apartamento|apto|ape|flat|studio|casa|cobertura|terreno)\b/i.test(clean(input.mensagemCliente)));
  const matchingContextComplete = regionContext && budgetContext && typeContext && bedroomsContext;
  const objectiveContext = Boolean(operational.objective || deal.intent || lead.ai_last_intent || /\b(?:morar|investir|investimento|alugar|familia|temporada|short stay)\b/i.test(clean(input.mensagemCliente)));
  const propertiesSentCount = runtime.properties_sent_count ?? countOutboundProperties(recent);

  return {
    property_intent: propertyIntent,
    useful_context: regionContext || budgetContext || typeContext || objectiveContext,
    region_context: regionContext,
    budget_context: budgetContext,
    type_context: typeContext,
    bedrooms_context: bedroomsContext,
    matching_context_complete: matchingContextComplete,
    objective_context: objectiveContext,
    beach_interest: beachInterest,
    financing_signal: financingSignal,
    fgts_signal: fgtsSignal,
    credit_letter_signal: creditLetterSignal,
    spouse_decision_signal: spouseDecisionSignal,
    revisit_inventory_signal: revisitInventorySignal,
    favorite_signal: favoriteSignal,
    visit_intent_signal: visitIntentSignal,
    handoff_signal: handoffSignal,
    followup_signal: Boolean(input.event_type === "followup_resume" || operational.followup_enabled || spouseDecisionSignal || hasAny(conversationText, ["vou pensar", "depois eu vejo", "vou analisar"])),
    property_revalidation_required: propertyRevalidationRequired,
    inventory_fatigue: Boolean(runtime.inventory_fatigue || propertiesSentCount >= 6),
    properties_sent_count: propertiesSentCount,
  };
}

function inferRuntimeState(input: CanonicalKernelInput, signals: CanonicalSignals): CanonicalRuntimeState {
  const depth = input.runtime_memory?.qualification_depth ?? 0;
  if (signals.handoff_signal) return "visita";
  if (input.event_type === "followup_resume") return "followup";
  if (signals.spouse_decision_signal || signals.revisit_inventory_signal || signals.favorite_signal) return "comparando";
  if (signals.followup_signal && !signals.handoff_signal) return "followup";
  if (signals.properties_sent_count >= 2 || (signals.property_intent && signals.useful_context)) return "matching";
  if (depth >= 4 || signals.useful_context) return "qualificando";
  return "lead_novo";
}

function inferNextBestAction(state: CanonicalRuntimeState, signals: CanonicalSignals, propertyPresentationDue: boolean): CanonicalNextBestAction {
  if (propertyPresentationDue) return "apresentar_opcoes_aderentes";
  if (signals.inventory_fatigue) return "reduzir_inventory";
  if (state === "lead_novo") return "descobrir_contexto";
  if (state === "qualificando") return "aprofundar_criterios";
  if (state === "matching") return "apresentar_opcoes_aderentes";
  if (state === "comparando") return signals.spouse_decision_signal ? "acompanhar_decisao_casal" : "consolidar_favorito";
  if (state === "visita") return "facilitar_agendamento";
  return "manter_radar_contextual";
}

function allowedToolsFor(action: CanonicalNextBestAction): CanonicalTool[] {
  if (action === "apresentar_opcoes_aderentes") return ["consultar_imoveis", "atualizar_qualificacao", "setar_lead_quente", "conhecimento_estrategico_luana1"];
  if (action === "facilitar_agendamento") return ["setar_lead_quente", "consultar_imoveis", "atualizar_qualificacao"];
  if (action === "descobrir_contexto" || action === "aprofundar_criterios") return ["atualizar_qualificacao", "conhecimento_estrategico_luana1"];
  if (action === "reduzir_inventory") return ["consultar_imoveis", "atualizar_qualificacao", "conhecimento_estrategico_luana1"];
  return ["consultar_imoveis", "atualizar_qualificacao", "conhecimento_estrategico_luana1"];
}

export function buildCanonicalKernelDecision(
  input: CanonicalKernelInput,
  previousState?: CanonicalRuntimeState | null,
): CanonicalKernelDecision {
  const signals = inferCanonicalSignals(input);
  const propertyPresentationDue = signals.property_revalidation_required || signals.matching_context_complete || (signals.property_intent && signals.useful_context);
  const runtimeState = inferRuntimeState(input, signals);
  const nextBestAction = inferNextBestAction(runtimeState, signals, propertyPresentationDue);
  const requiredTools: CanonicalTool[] = propertyPresentationDue || nextBestAction === "apresentar_opcoes_aderentes" ? ["consultar_imoveis"] : nextBestAction === "facilitar_agendamento" ? ["setar_lead_quente"] : [];
  const allowedTools = [...new Set([...allowedToolsFor(nextBestAction), ...requiredTools])];
  const forbiddenTools = canonicalTools.filter((tool) => !allowedTools.includes(tool));
  const validTransitions = stateTransitionMap[previousState ?? runtimeState] ?? [];

  return {
    version: JU_KERNEL_VERSION,
    runtime_state: runtimeState,
    next_best_action: nextBestAction,
    property_presentation_due: propertyPresentationDue,
    required_tools: requiredTools,
    allowed_tools: allowedTools,
    forbidden_tools: forbiddenTools,
    retrieval_policy: propertyPresentationDue ? "tool_required" : "minimal",
    signals,
    governance: {
      ai_first_runtime: true,
      supabase_is_source_of_truth: true,
      redis_is_short_memory: true,
      consultar_imoveis_is_truth: true,
      never_reconstruct_property_url: true,
      max_questions_per_message: 1,
      max_properties_per_presentation: 3,
      max_recent_history_messages: 10,
      max_followup_due_tasks: 5,
      presentation_mode: propertyPresentationDue ? (signals.property_revalidation_required ? "revalidation" : signals.inventory_fatigue ? "curated_or_reanchor" : "curated") : "none",
      inventory_fatigue_protection: signals.inventory_fatigue,
      followup_pressure_reduction: runtimeState === "followup",
      spouse_decision_governance: signals.spouse_decision_signal,
    },
    state_machine: {
      valid_transitions: validTransitions,
      forbidden_transitions: canonicalRuntimeStates.filter((state) => !validTransitions.includes(state)),
      side_effects: stateSideEffects[runtimeState],
    },
    blocked_behaviors: [
      "sdr_behavior",
      "permission_to_search",
      "abstract_qualification_loop",
      "too_many_questions",
      "too_many_properties",
      "inventory_loop",
      "excessive_followup_pressure",
      "orphan_tool_execution",
    ],
    context_contract: {
      required_blocks: contextBlockOrder.filter((block) => block !== "internal_behavioral_event"),
      optional_blocks: ["internal_behavioral_event"],
      rendering_order: [...contextBlockOrder],
    },
    memory_contract: {
      recent_history_max: 10,
      compact_history_required: true,
      rolling_summary_boundary: "outside_hot_path_until_persisted",
      bounded_replay: true,
    },
  };
}

export function assertCanonicalKernelDecision(decision: CanonicalKernelDecision): RuntimeViolation[] {
  const violations: RuntimeViolation[] = [];
  if (decision.property_presentation_due && !decision.required_tools.includes("consultar_imoveis")) {
    violations.push({ code: "missing_required_tool", message: "property_presentation_due requires consultar_imoveis." });
  }
  if (decision.property_presentation_due && decision.next_best_action !== "apresentar_opcoes_aderentes") {
    violations.push({ code: "invalid_next_action", message: "Property presentation due must force apresentar_opcoes_aderentes." });
  }
  if (decision.signals.inventory_fatigue && decision.governance.max_properties_per_presentation > 3) {
    violations.push({ code: "too_many_properties", message: "Inventory fatigue cannot increase presentation volume." });
  }
  if (decision.memory_contract.recent_history_max > 10) {
    violations.push({ code: "memory_replay_unbounded", message: "Recent history replay must remain bounded to 10 messages." });
  }
  return violations;
}

export function assertCanonicalResponseDraft(
  decision: CanonicalKernelDecision,
  draft: CanonicalResponseDraft,
): RuntimeViolation[] {
  const text = normalize(draft.text);
  const tools = draft.tools_called ?? [];
  const violations = assertCanonicalKernelDecision(decision);
  const questionCount = (draft.text.match(/\?/g) ?? []).length;
  const permissionPatterns = ["posso te mostrar", "quer que eu envie", "se quiser eu posso", "posso buscar", "quer que eu busque"];
  const sdrPatterns = ["preencher cadastro", "vou fazer algumas perguntas", "formulario", "triagem"];

  if (decision.required_tools.some((tool) => !tools.includes(tool))) {
    violations.push({ code: "missing_required_tool", message: "Draft did not call every required tool." });
  }
  if (tools.some((tool) => decision.forbidden_tools.includes(tool))) {
    violations.push({ code: "forbidden_tool", message: "Draft called a forbidden tool for the current action." });
  }
  if (tools.length && tools.every((tool) => !decision.allowed_tools.includes(tool))) {
    violations.push({ code: "orphan_tool_execution", message: "Tool execution is not anchored to the runtime action." });
  }
  if (questionCount > decision.governance.max_questions_per_message) {
    violations.push({ code: "too_many_questions", message: "Ju can ask at most one question per message." });
  }
  if (hasAny(text, permissionPatterns)) {
    violations.push({ code: "permission_to_search", message: "Ju cannot ask permission to search or present inventory." });
  }
  if (hasAny(text, sdrPatterns)) {
    violations.push({ code: "sdr_behavior", message: "Ju cannot behave like SDR/form triage." });
  }
  if (decision.property_presentation_due && !tools.includes("consultar_imoveis")) {
    violations.push({ code: "abstract_qualification_loop", message: "Useful property intent cannot continue as abstract qualification." });
  }
  if ((draft.property_cards_count ?? 0) > decision.governance.max_properties_per_presentation) {
    violations.push({ code: "too_many_properties", message: "Property presentation exceeded the maximum of 3." });
  }
  if (decision.runtime_state === "followup" && hasAny(text, ["urgente", "ultima chance", "preciso que decida agora"])) {
    violations.push({ code: "excessive_followup_pressure", message: "Follow-up must reduce pressure." });
  }
  return violations;
}

export function renderCanonicalContextContract(input: CanonicalKernelInput, decision: CanonicalKernelDecision): string {
  const recent = (input.recent_messages ?? []).slice(-decision.memory_contract.recent_history_max);
  return [
    "<yzi_operational_runtime>",
    "AI_FIRST_RUNTIME: true",
    "SUPABASE_IS_SOURCE_OF_TRUTH: true",
    "REDIS_IS_SHORT_MEMORY: true",
    "NEVER_RECONSTRUCT_PROPERTY_URL: true",
    "CONSULTAR_IMOVEIS_IS_TRUTH: true",
    "</yzi_operational_runtime>",
    "",
    "<estado_operacional>",
    `tenant_id: ${clean(input.tenant_id)}`,
    `lead_id: ${clean(input.lead?.id)}`,
    `deal_id: ${clean(input.deal?.id)}`,
    `conversation_id: ${clean(input.conversation?.id)}`,
    `ai_paused: ${input.conversation?.ai_paused === true ? "true" : "false"}`,
    "</estado_operacional>",
    "",
    "<funnel_runtime>",
    `funnel_stage: ${decision.runtime_state}`,
    `decision_style: ${decision.signals.spouse_decision_signal ? "casal" : "desconhecido"}`,
    `next_best_action: ${decision.next_best_action}`,
    `inventory_fatigue: ${decision.signals.inventory_fatigue ? "true" : "false"}`,
    `properties_sent_count: ${decision.signals.properties_sent_count}`,
    "</funnel_runtime>",
    "",
    "<preferencias_cliente>",
    `bairro_interesse: ${input.operational_context?.preferred_regions?.join(", ") || input.deal?.location_preference || "nao informado"}`,
    `tipo_imovel: ${input.operational_context?.property_type || input.deal?.property_type || "nao informado"}`,
    `orcamento_max: ${clean(input.operational_context?.budget_max) || clean(input.deal?.budget_max) || "nao informado"}`,
    `financing_signal: ${decision.signals.financing_signal ? "true" : "false"}`,
    `fgts_signal: ${decision.signals.fgts_signal ? "true" : "false"}`,
    "</preferencias_cliente>",
    "",
    "<governanca_comportamental>",
    "NAO_EMPURRAR_IMOVEIS_EM_LOOP: true",
    "MAXIMO_RECOMENDACOES_POR_INTERACAO: 3",
    "SE_FUNNEL_STAGE_FOLLOWUP_REDUZIR_PRESSAO: true",
    "SE_DECISION_STYLE_CASAL_RESPEITAR_TIMING: true",
    "SE_INVENTORY_FATIGUE_TRUE_PARAR_ENVIO_MASSIVO: true",
    `PROPERTY_PRESENTATION_DUE: ${decision.property_presentation_due ? "true" : "false"}`,
    `BLOCK_APROFUNDAR_CRITERIOS: ${decision.property_presentation_due ? "true" : "false"}`,
    `PRESENTAR_ANTES_DE_PERGUNTAR: ${decision.property_presentation_due ? "true" : "false"}`,
    "</governanca_comportamental>",
    "",
    "<historico_curto>",
    recent.map((message) => `${message.direction === "outbound" || message.sender_type === "agent" ? "Ju" : "Cliente"}: ${clean(message.content)}`).join("\n"),
    "</historico_curto>",
    "",
    input.event_type ? "<internal_behavioral_event>" : "",
    input.event_type ? JSON.stringify(input.internal_behavioral_event ?? {}, null, 2) : "",
    input.event_type ? "</internal_behavioral_event>" : "",
    "",
    "<mensagem_atual>",
    clean(input.mensagemCliente),
    "</mensagem_atual>",
    "",
    "<tool_revalidation>",
    `requires_consultar_imoveis: ${decision.signals.property_revalidation_required ? "true" : "false"}`,
    "url_truth: consultar_imoveis",
    "never_reconstruct_property_url: true",
    "</tool_revalidation>",
  ].filter((line, index, lines) => line !== "" || lines[index - 1] !== "").join("\n");
}

const canonicalRuntimeStateSchema = z.enum(canonicalRuntimeStates);
const canonicalNextBestActionSchema = z.enum(canonicalNextBestActions);
const canonicalToolSchema = z.enum(canonicalTools);

export const canonicalMessageSchema = z.object({
  direction: z.string().nullish(),
  sender_type: z.string().nullish(),
  content: z.string().nullish(),
  created_at: z.string().nullish(),
});

export const canonicalKernelInputSchema = z.object({
  tenant_id: z.string().nullish(),
  lead: z.object({
    id: z.string().nullish(),
    tenant_id: z.string().nullish(),
    name: z.string().nullish(),
    status: z.string().nullish(),
    ai_status: z.string().nullish(),
    ai_last_intent: z.string().nullish(),
  }).nullish(),
  deal: z.object({
    id: z.string().nullish(),
    intent: z.string().nullish(),
    location_preference: z.string().nullish(),
    property_type: z.string().nullish(),
    bedrooms: z.union([z.string(), z.number()]).nullish(),
    budget_min: z.union([z.string(), z.number()]).nullish(),
    budget_max: z.union([z.string(), z.number()]).nullish(),
    timeline: z.string().nullish(),
    payment_method: z.string().nullish(),
    decision_maker: z.string().nullish(),
  }).nullish(),
  conversation: z.object({
    id: z.string().nullish(),
    status: z.string().nullish(),
    ai_paused: z.boolean().nullish(),
  }).nullish(),
  recent_messages: z.array(canonicalMessageSchema).default([]),
  mensagemCliente: z.string().nullish(),
  messageType: z.string().nullish(),
  event_type: z.string().nullish(),
  internal_behavioral_event: z.record(z.string(), z.unknown()).nullish(),
  operational_context: z.record(z.string(), z.unknown()).nullish(),
  runtime_memory: z.record(z.string(), z.unknown()).nullish(),
  now: z.string().nullish(),
});

export const canonicalKernelDecisionSchema = z.object({
  version: z.literal(JU_KERNEL_VERSION),
  runtime_state: canonicalRuntimeStateSchema,
  next_best_action: canonicalNextBestActionSchema,
  property_presentation_due: z.boolean(),
  required_tools: z.array(canonicalToolSchema),
  allowed_tools: z.array(canonicalToolSchema),
  forbidden_tools: z.array(canonicalToolSchema),
  retrieval_policy: z.enum(["minimal", "tool_required"]),
  signals: z.record(z.string(), z.unknown()),
  governance: z.object({
    ai_first_runtime: z.literal(true),
    supabase_is_source_of_truth: z.literal(true),
    redis_is_short_memory: z.literal(true),
    consultar_imoveis_is_truth: z.literal(true),
    never_reconstruct_property_url: z.literal(true),
    max_questions_per_message: z.literal(1),
    max_properties_per_presentation: z.literal(3),
    max_recent_history_messages: z.literal(10),
    max_followup_due_tasks: z.literal(5),
    presentation_mode: z.enum(["none", "curated", "revalidation", "curated_or_reanchor"]),
    inventory_fatigue_protection: z.boolean(),
    followup_pressure_reduction: z.boolean(),
    spouse_decision_governance: z.boolean(),
  }),
  state_machine: z.object({
    valid_transitions: z.array(canonicalRuntimeStateSchema),
    forbidden_transitions: z.array(canonicalRuntimeStateSchema),
    side_effects: z.array(z.string()),
  }),
  blocked_behaviors: z.array(z.string()),
  context_contract: z.object({
    required_blocks: z.array(z.string()),
    optional_blocks: z.array(z.string()),
    rendering_order: z.array(z.string()),
  }),
  memory_contract: z.object({
    recent_history_max: z.literal(10),
    compact_history_required: z.literal(true),
    rolling_summary_boundary: z.literal("outside_hot_path_until_persisted"),
    bounded_replay: z.literal(true),
  }),
});

export const canonicalStateMachineContract = {
  states: canonicalRuntimeStates,
  transitions: stateTransitionMap,
  sideEffects: stateSideEffects,
  forbiddenTransitions: Object.fromEntries(
    canonicalRuntimeStates.map((state) => [
      state,
      canonicalRuntimeStates.filter((candidate) => !stateTransitionMap[state].includes(candidate)),
    ]),
  ) as Record<CanonicalRuntimeState, CanonicalRuntimeState[]>,
} as const;

export const canonicalNextBestActionContract = nextActionContracts;
