import type { FunnelStage } from "./funnel-stage";

export type ConsultativePolicy = {
  stage: FunnelStage;
  must_contextualize_relevant_questions: boolean;
  must_generate_value_before_more_questions: boolean;
  must_explain_consultive_model: boolean;
  must_request_permission_to_continue: boolean;
  institutional_framing: "premium_consultative" | "light_consultative";
  pacing: "trust_first" | "value_before_depth";
  relevant_question_context_example: string;
};

export function consultativePolicyForStage(stage: FunnelStage): ConsultativePolicy {
  if (stage === "SAUDACAO") {
    return {
      stage,
      must_contextualize_relevant_questions: true,
      must_generate_value_before_more_questions: true,
      must_explain_consultive_model: true,
      must_request_permission_to_continue: true,
      institutional_framing: "premium_consultative",
      pacing: "trust_first",
      relevant_question_context_example:
        "Te pergunto isso para entender o melhor caminho antes de falar de opcoes.",
    };
  }

  if (stage === "QUALIFICACAO_MINIMA") {
    return {
      stage,
      must_contextualize_relevant_questions: true,
      must_generate_value_before_more_questions: true,
      must_explain_consultive_model: false,
      must_request_permission_to_continue: false,
      institutional_framing: "light_consultative",
      pacing: "value_before_depth",
      relevant_question_context_example:
        "Te pergunto isso porque a regiao muda bastante conforme rotina e estilo de imovel.",
    };
  }

  return {
    stage,
    must_contextualize_relevant_questions: true,
    must_generate_value_before_more_questions: false,
    must_explain_consultive_model: false,
    must_request_permission_to_continue: false,
    institutional_framing: "light_consultative",
    pacing: "value_before_depth",
    relevant_question_context_example:
      "Contextualize a pergunta com o motivo operacional antes de pedir informacao.",
  };
}

