import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { initialBehavioralScenarios } from "../tests/behavioral/scenarios/initial-scenarios";
import { runBehavioralSimulation } from "../tests/behavioral/runtime-simulations/behavioral-simulator";

const exportScenarioIds = [
  "lead_objetivo_bessa",
  "lead_frio_tem_imovel",
  "lead_investidor",
  "lead_ansioso_urgente",
  "lead_desconfiado",
  "lead_ja_sabe_o_que_quer",
  "inventory_sem_imovel_aderente",
  "inventory_incompativel",
  "inventory_regiao_indisponivel",
  "inventory_budget_inviavel",
  "inventory_perfil_extremamente_especifico",
  "lead_rejeita_opcoes",
];

const scenarioOverrides: Record<string, { name?: string; message?: string }> = {
  lead_ja_sabe_o_que_quer: {
    name: "LEAD DIRETO",
    message: "quero apartamento 3 quartos em cabo branco ate 900 mil",
  },
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function booleanLabel(value: boolean) {
  return value ? "true" : "false";
}

function listOrNone(values?: readonly string[]) {
  return values?.length ? values.join(", ") : "none";
}

function countMatches(text: string, terms: readonly string[]) {
  const normalized = normalize(text);
  return terms.filter((term) => normalized.includes(normalize(term))).length;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function ratingFromQuestionCount(questionCount: number, maxQuestions: number) {
  if (questionCount === 0) return "direto";
  if (questionCount <= maxQuestions) return "bom";
  return "alto";
}

function responseSizeLabel(wordCount: number) {
  if (wordCount <= 14) return "curta";
  if (wordCount <= 26) return "media";
  return "longa";
}

function automaticAnalysis(result: ReturnType<typeof runBehavioralSimulation>) {
  const questionBudget = result.decision.behavioral_contract.question_budget;
  const violations = result.log.violations;
  const failedExpectations = result.failedExpectations;
  const text = result.scenario.draft.text;
  const wordCount = countWords(text);
  const warmthSignals = countMatches(text, ["entendi", "entendo", "claro", "perfeito", "boa", "faz sentido", "legal", "certo", "otimo", "ajuda bastante", "tenho sim"]);
  const corporateSignals = countMatches(text, ["aderente", "analise", "criterio", "operacao", "perfil aderente", "curadoria"]);
  const policySignals = countMatches(text, ["te pergunto", "muda o filtro", "muda a analise", "contexto suficiente"]);
  const overlyPerfectSignals = countMatches(text, ["vou te mostrar algumas opcoes e depois", "te orientar pelo que fizer mais sentido", "pelo que fizer mais sentido"]);

  return {
    pacing: ratingFromQuestionCount(result.log.question_count, questionBudget.max_questions_per_turn),
    tamanho_resposta: responseSizeLabel(wordCount),
    contextualizacao: result.log.contextualization_detected ? "presente" : "ausente",
    warmth: warmthSignals > 0 ? "presente" : "baixa",
    espontaneidade: policySignals === 0 && overlyPerfectSignals <= 1 ? "boa" : "revisar",
    previsibilidade: overlyPerfectSignals === 0 && wordCount <= 26 ? "baixa" : "media",
    sdr_regression: violations.includes("sdr_behavior") ? "alta" : "baixa",
    fluidez: failedExpectations.length === 0 && policySignals === 0 ? "boa" : "revisar",
    friccao: result.log.question_count <= questionBudget.max_questions_per_turn ? "baixa" : "alta",
    corporatives: corporateSignals === 0 ? "baixo" : "revisar",
    sensacao_ia: policySignals === 0 && corporateSignals <= 1 ? "baixa" : "revisar",
    rigidez_policy: violations.length === 0 && policySignals === 0 ? "baixa" : "revisar",
  };
}

function displayTitle(name: string) {
  return name
    .toLowerCase()
    .replace(/^lead /, "Lead ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scenarioBlock(result: ReturnType<typeof runBehavioralSimulation>) {
  const contract = result.decision.behavioral_contract.contract;
  const questionBudget = result.decision.behavioral_contract.question_budget;
  const analysis = automaticAnalysis(result);
  const override = scenarioOverrides[result.scenario.id] ?? {};
  const name = override.name ?? result.scenario.name;
  const message = override.message ?? result.scenario.message;

  return [
    `# Cenario: ${displayTitle(name)}`,
    "",
    "Lead:",
    message,
    "",
    "Stage:",
    result.decision.behavioral_contract.stage,
    "",
    "Runtime State:",
    result.log.current_stage,
    "",
    "Behavioral Contract:",
    "",
    `* version: ${contract?.version ?? "none"}`,
    `* objective: ${contract?.objective ?? "none"}`,
    `* max_questions: ${questionBudget.max_questions_per_turn}`,
    `* max_consecutive_questions: ${questionBudget.max_consecutive_questions}`,
    `* question_budget_per_stage: ${questionBudget.max_questions_per_stage}`,
    `* remaining_consecutive_questions: ${questionBudget.remaining_consecutive_questions}`,
    `* contextualization_required: ${booleanLabel(Boolean(contract?.must_contextualize_relevant_questions))}`,
    `* must_generate_value_before_more_questions: ${booleanLabel(Boolean(contract?.must_generate_value_before_more_questions))}`,
    `* must_explain_consultive_model: ${booleanLabel(Boolean(contract?.must_explain_consultive_model))}`,
    `* must_request_permission_to_continue: ${booleanLabel(Boolean(contract?.must_request_permission_to_continue))}`,
    "",
    "Ju:",
    result.scenario.draft.text,
    "",
    "Runtime Signals:",
    "",
    `* question_count: ${result.log.question_count}`,
    `* presentation_due: ${booleanLabel(result.log.presentation_due)}`,
    `* contextualization_detected: ${booleanLabel(result.log.contextualization_detected)}`,
    `* behavioral_contract_applied: ${booleanLabel(result.log.behavioral_contract_applied)}`,
    `* tools_called: ${listOrNone(result.scenario.draft.tools_called)}`,
    `* property_cards_count: ${result.scenario.draft.property_cards_count}`,
    "",
    "Violacoes Detectadas:",
    "",
    `* runtime_violations: ${listOrNone(result.log.violations)}`,
    `* expectation_failures: ${listOrNone(result.failedExpectations)}`,
    "",
    "Behavioral Analysis:",
    "",
    `* pacing: ${analysis.pacing}`,
    `* tamanho resposta: ${analysis.tamanho_resposta}`,
    `* contextualizacao: ${analysis.contextualizacao}`,
    `* warmth: ${analysis.warmth}`,
    `* espontaneidade: ${analysis.espontaneidade}`,
    `* previsibilidade: ${analysis.previsibilidade}`,
    `* SDR regression: ${analysis.sdr_regression}`,
    `* fluidez: ${analysis.fluidez}`,
    `* friccao: ${analysis.friccao}`,
    `* corporatives: ${analysis.corporatives}`,
    `* sensacao IA: ${analysis.sensacao_ia}`,
    `* rigidez policy: ${analysis.rigidez_policy}`,
  ].join("\n");
}

const scenarios = exportScenarioIds.map((id) => {
  const scenario = initialBehavioralScenarios.find((candidate) => candidate.id === id);
  if (!scenario) throw new Error(`Behavioral scenario not found: ${id}`);
  return scenario;
});

const results = scenarios.map(runBehavioralSimulation);
const content = [
  "# Ju Runtime - Behavioral Transcripts",
  "",
  `Generated at: ${new Date().toISOString()}`,
  "",
  "Fonte: suite local deterministica de behavioral simulations. Este export nao usa Evolution API, WhatsApp real, webhook externo, outbound ou execucao de tools.",
  "",
  "Objetivo: permitir revisao humana de naturalidade, fluidez, contextualizacao, ritmo consultivo, warmth, excesso de perguntas, sensacao de SDR, sensacao de IA, rigidez de policy e qualidade do framing institucional.",
  "",
  ...results.map(scenarioBlock),
  "",
].join("\n\n");

const outputPath = resolve("docs/behavioral-transcripts.md");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content, "utf8");
console.log(`Behavioral transcripts exported to ${outputPath}`);
