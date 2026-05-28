import type { FunnelStage } from "./funnel-stage";

export type PresentationGate = {
  stage: FunnelStage;
  property_presentation_allowed: boolean;
  requires_value_before_presentation: boolean;
  reason: string;
};

export function presentationGateForStage(stage: FunnelStage): PresentationGate {
  if (stage === "SAUDACAO") {
    return {
      stage,
      property_presentation_allowed: false,
      requires_value_before_presentation: true,
      reason: "saudacao cria confianca e consentimento; nao apresenta imoveis.",
    };
  }

  if (stage === "QUALIFICACAO_MINIMA") {
    return {
      stage,
      property_presentation_allowed: false,
      requires_value_before_presentation: true,
      reason: "qualificacao minima entende intencao inicial sem interrogatorio.",
    };
  }

  return {
    stage,
    property_presentation_allowed: true,
    requires_value_before_presentation: false,
    reason: "stage permite apresentacao quando demais contratos autorizarem.",
  };
}

