import { FunnelStages, type FunnelStage } from "./funnel-stage";
import { behavioralContractForStage, type BehavioralContract } from "./behavioral-contracts";
import { buildQuestionBudget, type QuestionBudget } from "./question-budget";
import type { JuRuntimeMessage } from "./types";

export type BehavioralGovernance = {
  stage: FunnelStage;
  contract: BehavioralContract | null;
  question_budget: QuestionBudget;
  enforced: boolean;
};

const STAGE_ALIASES: Record<string, FunnelStage> = {
  lead_novo: "SAUDACAO",
  descobrir_contexto: "SAUDACAO",
  saudacao: "SAUDACAO",
  qualificacao: "QUALIFICACAO_MINIMA",
  qualificando: "QUALIFICACAO_MINIMA",
  qualificar_intencao: "QUALIFICACAO_MINIMA",
  qualificar_objetivo: "QUALIFICACAO_MINIMA",
  qualificar_bairro: "QUALIFICACAO_MINIMA",
  qualificar_budget: "QUALIFICACAO_MINIMA",
  aprofundar_criterios: "QUALIFICACAO_MINIMA",
  qualification: "QUALIFICACAO_MINIMA",
  light_qualification: "QUALIFICACAO_MINIMA",
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeFunnelStage(value: unknown): FunnelStage {
  const raw = String(value ?? "").trim();
  if ((FunnelStages as readonly string[]).includes(raw)) return raw as FunnelStage;
  return STAGE_ALIASES[normalize(raw)] ?? "QUALIFICACAO_MINIMA";
}

export function buildBehavioralGovernance(
  stageLike: unknown,
  recentMessages: JuRuntimeMessage[] = [],
): BehavioralGovernance {
  const stage = normalizeFunnelStage(stageLike);
  const contract = behavioralContractForStage(stage);
  return {
    stage,
    contract,
    question_budget: buildQuestionBudget(stage, recentMessages, contract?.max_consecutive_questions),
    enforced: Boolean(contract),
  };
}

