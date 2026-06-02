import type { FunnelStage } from "./funnel-stage";
import { consultativePolicyForStage, type ConsultativePolicy } from "./consultative-policies";
import { presentationGateForStage, type PresentationGate } from "./presentation-gates";
import { questionBudgetForStage } from "./question-budget";

export const BEHAVIORAL_CONTRACT_VERSION = "ju_behavioral_contracts_v1_phase_1" as const;

export type BehavioralContract = {
  version: typeof BEHAVIORAL_CONTRACT_VERSION;
  stage: FunnelStage;
  objective: string;
  allowed_depth: "opening_trust" | "minimal_qualification";
  question_budget_per_stage: number;
  max_questions: number;
  max_consecutive_questions: number;
  must_explain_consultive_model: boolean;
  must_request_permission_to_continue: boolean;
  must_generate_value_before_more_questions: boolean;
  must_contextualize_relevant_questions: boolean;
  institutional_framing: ConsultativePolicy["institutional_framing"];
  consultative_pacing: ConsultativePolicy["pacing"];
  presentation_gate: PresentationGate;
  forbidden_topics: string[];
  forbidden_behaviors: string[];
  response_requirements: string[];
};

const BASE_FORBIDDEN_BEHAVIORS = [
  "checklist_sdr",
  "interrogatorio",
  "aprofundamento_excessivo",
  "framing_comercial_improvisado",
];

export function behavioralContractForStage(stage: FunnelStage): BehavioralContract | null {
  const policy = consultativePolicyForStage(stage);
  const gate = presentationGateForStage(stage);

  if (stage === "SAUDACAO") {
    return {
      version: BEHAVIORAL_CONTRACT_VERSION,
      stage,
      objective: "abrir leve e humano, como conversa real de whatsapp, e descobrir o que a pessoa procura",
      allowed_depth: "opening_trust",
      question_budget_per_stage: questionBudgetForStage(stage),
      max_questions: 1,
      max_consecutive_questions: 1,
      must_explain_consultive_model: false,
      must_request_permission_to_continue: false,
      must_generate_value_before_more_questions: true,
      // Abertura leve: pedir o nome ou "o que voce procura" NAO precisa de justificativa
      // consultiva. Forcar contextualizacao aqui transformava a saudacao humana em
      // abstract_qualification_loop. A contextualizacao volta a valer em QUALIFICACAO_MINIMA.
      must_contextualize_relevant_questions: false,
      institutional_framing: policy.institutional_framing,
      consultative_pacing: policy.pacing,
      presentation_gate: gate,
      forbidden_topics: ["orcamento", "financiamento"],
      forbidden_behaviors: [
        ...BASE_FORBIDDEN_BEHAVIORS,
        "perguntar_budget",
        "perguntar_financiamento",
        "discurso_institucional",
        "apresentar_missao",
        "explicar_modelo_consultivo",
        "onboarding_corporativo",
        "pedir_permissao_para_continuar",
      ],
      response_requirements: [
        "abrir de forma leve e humana, como conversa real de whatsapp",
        "nao apresentar missao, nao explicar modelo consultivo, nao pedir permissao",
        "fazer no maximo uma pergunta (nome ou o que a pessoa procura)",
      ],
    };
  }

  if (stage === "QUALIFICACAO_MINIMA") {
    return {
      version: BEHAVIORAL_CONTRACT_VERSION,
      stage,
      objective: "entender intencao inicial sem transformar a conversa em interrogatorio",
      allowed_depth: "minimal_qualification",
      question_budget_per_stage: questionBudgetForStage(stage),
      max_questions: 2,
      max_consecutive_questions: 2,
      must_explain_consultive_model: false,
      must_request_permission_to_continue: false,
      must_generate_value_before_more_questions: true,
      must_contextualize_relevant_questions: true,
      institutional_framing: policy.institutional_framing,
      consultative_pacing: policy.pacing,
      presentation_gate: gate,
      forbidden_topics: [],
      forbidden_behaviors: [...BASE_FORBIDDEN_BEHAVIORS, "mais_de_duas_perguntas_consecutivas"],
      response_requirements: [
        "gerar valor antes de nova pergunta relevante",
        "contextualizar pergunta relevante",
        "fazer no maximo duas perguntas consecutivas",
      ],
    };
  }

  return null;
}

