import {
  assertCanonicalResponseDraft,
  buildCanonicalKernelDecision,
  renderCanonicalContextContract,
  type CanonicalKernelDecision,
} from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type { BehavioralScenario } from "../scenarios/initial-scenarios";

export type BehavioralSimulationLog = {
  scenario_id: string;
  scenario_name: string;
  current_stage: string;
  question_count: number;
  presentation_due: boolean;
  contextualization_detected: boolean;
  violations: string[];
  behavioral_contract_applied: boolean;
  contract_stage: string;
  next_best_action: string;
  inventory_constraint_active: boolean;
  inventory_constraint_reason: string | null;
};

export type BehavioralSimulationResult = {
  scenario: BehavioralScenario;
  decision: CanonicalKernelDecision;
  context: string;
  log: BehavioralSimulationLog;
  failedExpectations: string[];
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAny(text: string, terms: string[]) {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function countQuestions(text: string) {
  return (text.match(/\?/g) ?? []).length;
}

function detectsContextualization(text: string) {
  return hasAny(text, [
    "te pergunto",
    "porque",
    "pra eu nao",
    "pra eu te",
    "sem te encher",
    "nada a ver",
    "coisa aleatoria",
    "depende do tipo",
    "me diz so",
    "ajuda bastante",
    "muda bastante",
    "caminho mais simples",
    "o que pesa mais",
    "direto ao ponto",
    "para entender",
    "faz sentido",
    "rotina",
    "contexto",
    "curadoria",
    "perfil",
    "liquidez",
    "demanda",
    "comecar bem",
    "pelo que fizer mais sentido",
    "sendo bem transparente",
    "prefiro ser honesta",
    "realmente coerente",
    "opcao desalinhada",
    "opção desalinhada",
    "nao faz sentido",
    "não faz sentido",
    "com seguranca",
    "com segurança",
    "perfil anotado",
    "forcar um encaixe ruim",
    "forçar um encaixe ruim",
  ]);
}

function detectsDryQuestion(text: string) {
  const normalized = normalize(text).trim();
  return /^(qual|quanto|onde|quando|voce|pretende)\b/.test(normalized) && !detectsContextualization(text);
}

function detectsExcessiveDepth(text: string) {
  const normalized = normalize(text);
  const depthTerms = ["renda", "entrada", "financiamento", "fgts", "documentacao", "score", "cadastro"];
  return depthTerms.filter((term) => normalized.includes(term)).length >= 2;
}

function behavioralExpectationFailures(scenario: BehavioralScenario, result: {
  decision: CanonicalKernelDecision;
  questionCount: number;
  contextualizationDetected: boolean;
  violationCodes: string[];
}) {
  const failures: string[] = [];
  const { expectations, draft } = scenario;

  if (expectations.runtime_state && result.decision.runtime_state !== expectations.runtime_state) {
    failures.push(`runtime_state expected ${expectations.runtime_state}, got ${result.decision.runtime_state}`);
  }
  if (expectations.next_best_action && result.decision.next_best_action !== expectations.next_best_action) {
    failures.push(`next_best_action expected ${expectations.next_best_action}, got ${result.decision.next_best_action}`);
  }
  if (typeof expectations.presentation_due === "boolean" && result.decision.property_presentation_due !== expectations.presentation_due) {
    failures.push(`presentation_due expected ${expectations.presentation_due}, got ${result.decision.property_presentation_due}`);
  }
  if (typeof expectations.inventory_constraint_active === "boolean" && result.decision.inventory_constraint.active !== expectations.inventory_constraint_active) {
    failures.push(`inventory_constraint_active expected ${expectations.inventory_constraint_active}, got ${result.decision.inventory_constraint.active}`);
  }
  if (expectations.no_tools_called && draft.tools_called?.length) {
    failures.push(`expected no tools called, got ${draft.tools_called.join(",")}`);
  }
  if (typeof expectations.property_cards_count === "number" && (draft.property_cards_count ?? 0) !== expectations.property_cards_count) {
    failures.push(`property_cards_count expected ${expectations.property_cards_count}, got ${draft.property_cards_count ?? 0}`);
  }
  if (result.questionCount > expectations.max_questions) {
    failures.push(`question_count expected <= ${expectations.max_questions}, got ${result.questionCount}`);
  }
  if (expectations.contextualization_required && !result.contextualizationDetected) {
    failures.push("contextualization was required but not detected");
  }
  for (const code of expectations.forbidden_violation_codes ?? []) {
    if (result.violationCodes.includes(code)) {
      failures.push(`forbidden violation detected: ${code}`);
    }
  }
  for (const term of expectations.required_terms ?? []) {
    if (!hasAny(draft.text, [term])) {
      failures.push(`required term missing: ${term}`);
    }
  }
  for (const term of expectations.forbidden_terms ?? []) {
    if (hasAny(draft.text, [term])) {
      failures.push(`forbidden term detected: ${term}`);
    }
  }
  if (detectsDryQuestion(draft.text)) {
    failures.push("dry question detected");
  }
  if (result.decision.behavioral_contract.stage === "SAUDACAO" && hasAny(draft.text, ["orcamento", "financiamento", "financiar", "entrada"])) {
    failures.push("budget or financing question during SAUDACAO");
  }
  if (detectsExcessiveDepth(draft.text)) {
    failures.push("excessive depth detected");
  }

  return failures;
}

export function runBehavioralSimulation(scenario: BehavioralScenario): BehavioralSimulationResult {
  const input = {
    mensagemCliente: scenario.message,
    recent_messages: [],
    ...(scenario.input ?? {}),
  };
  const decision = buildCanonicalKernelDecision(input);
  const context = renderCanonicalContextContract(input, decision);
  const runtimeViolations = assertCanonicalResponseDraft(decision, scenario.draft);
  const violationCodes = [...new Set(runtimeViolations.map((violation) => violation.code))];
  const questionCount = countQuestions(scenario.draft.text);
  const contextualizationDetected = detectsContextualization(scenario.draft.text);
  const log: BehavioralSimulationLog = {
    scenario_id: scenario.id,
    scenario_name: scenario.name,
    current_stage: decision.runtime_state,
    question_count: questionCount,
    presentation_due: decision.property_presentation_due,
    contextualization_detected: contextualizationDetected,
    violations: violationCodes,
    behavioral_contract_applied: decision.behavioral_contract.enforced,
    contract_stage: decision.behavioral_contract.stage,
    next_best_action: decision.next_best_action,
    inventory_constraint_active: decision.inventory_constraint.active,
    inventory_constraint_reason: decision.inventory_constraint.reason,
  };

  return {
    scenario,
    decision,
    context,
    log,
    failedExpectations: behavioralExpectationFailures(scenario, {
      decision,
      questionCount,
      contextualizationDetected,
      violationCodes,
    }),
  };
}

export function formatBehavioralSimulationLog(log: BehavioralSimulationLog) {
  return [
    `[behavioral-simulation] ${log.scenario_name}`,
    `current_stage=${log.current_stage}`,
    `question_count=${log.question_count}`,
    `presentation_due=${log.presentation_due}`,
    `next_best_action=${log.next_best_action}`,
    `inventory_constraint_active=${log.inventory_constraint_active}`,
    `inventory_constraint_reason=${log.inventory_constraint_reason ?? "none"}`,
    `contextualization_detected=${log.contextualization_detected}`,
    `violations=${log.violations.length ? log.violations.join(",") : "none"}`,
    `behavioral_contract_applied=${log.behavioral_contract_applied}`,
    `contract_stage=${log.contract_stage}`,
  ].join(" | ");
}
