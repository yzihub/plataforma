/**
 * Canonical funnel state machine for the Ju cognitive runtime.
 *
 * P1 preparation only — additive. Not yet wired into the live runtime.
 * Intended to replace the dual taxonomies (`JuRuntimeState` x 6 states
 * vs `CanonicalRuntimeState` x 6 states vs `JuObjectiveState` x 14) in
 * a future migration. Until then, this module is the agreed contract.
 */

export const FunnelStages = [
  "SAUDACAO",
  "DESCOBERTA",
  "QUALIFICACAO_MINIMA",
  "CURADORIA",
  "APRESENTACAO",
  "COMPARACAO",
  "CORRETOR",
  "VISITA",
  "NEGOCIACAO",
  "CONTRATO",
  "FOLLOWUP",
] as const;

export type FunnelStage = (typeof FunnelStages)[number];

export const FUNNEL_STAGE_INDEX: Readonly<Record<FunnelStage, number>> = Object.freeze(
  FunnelStages.reduce(
    (acc, stage, index) => {
      acc[stage] = index;
      return acc;
    },
    {} as Record<FunnelStage, number>,
  ),
);

export type RetrievalPolicy = "disabled" | "lazy" | "tool_required" | "augment_only";

export type FunnelStageContract = {
  /** Tools the runtime may invoke in this stage. */
  allowed_tools: ReadonlyArray<string>;
  /** Tools the runtime must invoke before answering. */
  required_tools: ReadonlyArray<string>;
  /** Catalog retrieval policy (`consultar_imoveis`). */
  catalog_retrieval: RetrievalPolicy;
  /** RAG / institutional knowledge retrieval policy. */
  knowledge_retrieval: RetrievalPolicy;
  /** Hard cap on questions per outbound turn (0 = no question). */
  max_questions_per_turn: 0 | 1;
  /** Hard cap on property cards per turn. */
  max_cards_per_turn: number;
  /** Fields that must already be resolved to reach this stage. */
  min_evidence_for_advance: ReadonlyArray<string>;
  /** Phrases the runtime should strip from the LLM draft. */
  forbidden_phrases: ReadonlyArray<string>;
};

export const FUNNEL_STAGE_CONTRACTS: Readonly<Record<FunnelStage, FunnelStageContract>> = Object.freeze({
  SAUDACAO: {
    allowed_tools: [],
    required_tools: [],
    catalog_retrieval: "disabled",
    knowledge_retrieval: "disabled",
    max_questions_per_turn: 1,
    max_cards_per_turn: 0,
    min_evidence_for_advance: [],
    forbidden_phrases: [
      "posso te mostrar",
      "quer que eu envie",
      "se quiser eu posso",
      "vou fazer algumas perguntas",
      "triagem",
      "formulario",
      "formulário",
    ],
  },
  DESCOBERTA: {
    allowed_tools: ["atualizar_qualificacao", "conhecimento_estrategico_luana1"],
    required_tools: [],
    catalog_retrieval: "disabled",
    knowledge_retrieval: "lazy",
    max_questions_per_turn: 1,
    max_cards_per_turn: 0,
    min_evidence_for_advance: ["intent"],
    forbidden_phrases: ["posso te mostrar", "vou fazer algumas perguntas", "triagem"],
  },
  QUALIFICACAO_MINIMA: {
    allowed_tools: ["atualizar_qualificacao", "consultar_imoveis", "conhecimento_estrategico_luana1"],
    required_tools: [],
    catalog_retrieval: "disabled",
    knowledge_retrieval: "lazy",
    max_questions_per_turn: 1,
    max_cards_per_turn: 0,
    min_evidence_for_advance: ["intent", "bairro_or_tipologia"],
    forbidden_phrases: ["posso te mostrar", "triagem"],
  },
  CURADORIA: {
    allowed_tools: ["consultar_imoveis", "atualizar_qualificacao", "conhecimento_estrategico_luana1"],
    required_tools: ["consultar_imoveis"],
    catalog_retrieval: "tool_required",
    knowledge_retrieval: "augment_only",
    max_questions_per_turn: 0,
    max_cards_per_turn: 0,
    min_evidence_for_advance: ["bairro", "faixa_valor", "quartos_or_tipologia"],
    forbidden_phrases: ["posso te mostrar", "quer que eu envie", "se quiser eu posso"],
  },
  APRESENTACAO: {
    allowed_tools: ["consultar_imoveis", "atualizar_qualificacao", "conhecimento_estrategico_luana1", "setar_lead_quente"],
    required_tools: ["consultar_imoveis"],
    catalog_retrieval: "tool_required",
    knowledge_retrieval: "augment_only",
    max_questions_per_turn: 1,
    max_cards_per_turn: 3,
    min_evidence_for_advance: ["cards_sent"],
    forbidden_phrases: ["posso te mostrar", "quer que eu envie", "se quiser eu posso"],
  },
  COMPARACAO: {
    allowed_tools: ["consultar_imoveis", "atualizar_qualificacao", "conhecimento_estrategico_luana1", "setar_lead_quente"],
    required_tools: [],
    catalog_retrieval: "lazy",
    knowledge_retrieval: "augment_only",
    max_questions_per_turn: 1,
    max_cards_per_turn: 3,
    min_evidence_for_advance: ["favorite_signal_or_spouse_decision"],
    forbidden_phrases: [],
  },
  CORRETOR: {
    allowed_tools: ["setar_lead_quente", "atualizar_qualificacao"],
    required_tools: ["setar_lead_quente"],
    catalog_retrieval: "disabled",
    knowledge_retrieval: "augment_only",
    max_questions_per_turn: 1,
    max_cards_per_turn: 0,
    min_evidence_for_advance: ["broker_assigned"],
    forbidden_phrases: [],
  },
  VISITA: {
    allowed_tools: ["setar_lead_quente", "atualizar_qualificacao"],
    required_tools: [],
    catalog_retrieval: "disabled",
    knowledge_retrieval: "augment_only",
    max_questions_per_turn: 1,
    max_cards_per_turn: 0,
    min_evidence_for_advance: ["visit_scheduled"],
    forbidden_phrases: [],
  },
  NEGOCIACAO: {
    allowed_tools: ["setar_lead_quente", "atualizar_qualificacao"],
    required_tools: [],
    catalog_retrieval: "disabled",
    knowledge_retrieval: "augment_only",
    max_questions_per_turn: 1,
    max_cards_per_turn: 0,
    min_evidence_for_advance: ["proposal_received"],
    forbidden_phrases: [],
  },
  CONTRATO: {
    allowed_tools: ["atualizar_qualificacao"],
    required_tools: [],
    catalog_retrieval: "disabled",
    knowledge_retrieval: "augment_only",
    max_questions_per_turn: 1,
    max_cards_per_turn: 0,
    min_evidence_for_advance: ["contract_signed"],
    forbidden_phrases: [],
  },
  FOLLOWUP: {
    allowed_tools: ["consultar_imoveis", "atualizar_qualificacao", "conhecimento_estrategico_luana1"],
    required_tools: [],
    catalog_retrieval: "lazy",
    knowledge_retrieval: "augment_only",
    max_questions_per_turn: 1,
    max_cards_per_turn: 3,
    min_evidence_for_advance: ["lead_reactivated"],
    forbidden_phrases: ["posso te mostrar"],
  },
});

/**
 * Canonical, deterministic transition matrix. Regressions (moving back to
 * an earlier stage) are only allowed on explicit reset signals — never on
 * ambiguous LLM output. The live engine still uses its own legacy matrix;
 * this is the agreed target for the P1-1 migration.
 */
export const FUNNEL_TRANSITIONS: Readonly<Record<FunnelStage, ReadonlyArray<FunnelStage>>> = Object.freeze({
  SAUDACAO: ["DESCOBERTA", "CORRETOR"],
  DESCOBERTA: ["QUALIFICACAO_MINIMA", "CORRETOR"],
  QUALIFICACAO_MINIMA: ["CURADORIA", "CORRETOR"],
  CURADORIA: ["APRESENTACAO", "CORRETOR"],
  APRESENTACAO: ["COMPARACAO", "CORRETOR", "VISITA"],
  COMPARACAO: ["APRESENTACAO", "CORRETOR", "VISITA"],
  CORRETOR: ["VISITA", "FOLLOWUP"],
  VISITA: ["NEGOCIACAO", "FOLLOWUP", "CORRETOR"],
  NEGOCIACAO: ["CONTRATO", "FOLLOWUP", "CORRETOR"],
  CONTRATO: ["FOLLOWUP"],
  FOLLOWUP: ["DESCOBERTA", "CURADORIA", "APRESENTACAO", "CORRETOR"],
});

const EXPLICIT_RESET_SIGNALS = Object.freeze([
  "reset_busca",
  "mudei_de_ideia",
  "comecar_de_novo",
  "outro_imovel_completamente",
]);

export function isExplicitReset(signal: string | null | undefined): boolean {
  if (!signal) return false;
  return EXPLICIT_RESET_SIGNALS.includes(signal.trim().toLowerCase());
}

export function canTransition(from: FunnelStage, to: FunnelStage, opts: { reset_signal?: string | null } = {}): boolean {
  if (from === to) return true;
  const fromIndex = FUNNEL_STAGE_INDEX[from];
  const toIndex = FUNNEL_STAGE_INDEX[to];
  const isRegression = toIndex < fromIndex;
  if (isRegression && !isExplicitReset(opts.reset_signal)) return false;
  if (isRegression && isExplicitReset(opts.reset_signal)) return true;
  return FUNNEL_TRANSITIONS[from].includes(to);
}

export function contractFor(stage: FunnelStage): FunnelStageContract {
  return FUNNEL_STAGE_CONTRACTS[stage];
}

export const FUNNEL_STAGE_VERSION = "ju_funnel_stage_v1_p1_prep";
