import type { FunnelStage } from "./funnel-stage";
import type { JuRuntimeMessage } from "./types";

export type QuestionBudget = {
  stage: FunnelStage;
  max_questions_per_stage: number;
  max_questions_per_turn: number;
  max_consecutive_questions: number;
  consecutive_outbound_questions: number;
  remaining_consecutive_questions: number;
};

const QUESTION_BUDGET_PER_STAGE: Partial<Record<FunnelStage, number>> = Object.freeze({
  SAUDACAO: 1,
  QUALIFICACAO_MINIMA: 2,
});

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function isOutbound(message: JuRuntimeMessage): boolean {
  return message.direction === "outbound" || message.sender_type === "agent";
}

function hasQuestion(message: JuRuntimeMessage): boolean {
  return clean(message.content).includes("?");
}

export function questionBudgetForStage(stage: FunnelStage): number {
  return QUESTION_BUDGET_PER_STAGE[stage] ?? 1;
}

export function countConsecutiveOutboundQuestions(messages: JuRuntimeMessage[] = []): number {
  let count = 0;
  for (const message of [...messages].reverse()) {
    if (!isOutbound(message)) break;
    if (hasQuestion(message)) count += 1;
  }
  return count;
}

export function buildQuestionBudget(
  stage: FunnelStage,
  messages: JuRuntimeMessage[] = [],
  maxConsecutiveQuestions = questionBudgetForStage(stage),
): QuestionBudget {
  const consecutive = countConsecutiveOutboundQuestions(messages);
  const perStage = questionBudgetForStage(stage);
  return {
    stage,
    max_questions_per_stage: perStage,
    max_questions_per_turn: stage === "SAUDACAO" ? 1 : Math.min(1, perStage),
    max_consecutive_questions: maxConsecutiveQuestions,
    consecutive_outbound_questions: consecutive,
    remaining_consecutive_questions: Math.max(0, maxConsecutiveQuestions - consecutive),
  };
}

