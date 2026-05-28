import { assertCanonicalResponseDraft } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type {
  CognitiveTurnResult,
  KernelConfidenceScore,
  ResponseGuardianResult,
} from "./types";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAny(text: string, patterns: string[]): boolean {
  const normalized = normalize(text);
  return patterns.some((pattern) => normalized.includes(normalize(pattern)));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildKernelConfidence(result: CognitiveTurnResult): KernelConfidenceScore {
  const calibration = result.shadow?.calibration;
  const comparison = result.shadow?.comparison;
  const parity = calibration?.readiness_gates.readiness_score ?? comparison?.score.parity ?? 0;
  const governance = comparison?.score.governance_adherence ?? (calibration?.governance_parity_audit.stable ? 100 : 0);
  const toolCorrectness = calibration?.tool_timing.stable ? 100 : 0;
  const consultative = calibration?.consultative_parity_score.overall ?? comparison?.score.consultative_behavior ?? 0;
  const orchestration = comparison?.score.orchestration_correctness ?? (result.llm.tool_results.every((tool) => tool.ok) ? 100 : 0);
  const failedStages = result.stages.filter((stage) => !stage.ok).length;
  const runtimeHealth = failedStages ? 0 : result.llm.tool_results.some((tool) => !tool.ok) ? 60 : 100;
  return {
    parity: clamp(parity),
    governance: clamp(governance),
    tool_correctness: clamp(toolCorrectness),
    consultative_behavior: clamp(consultative),
    orchestration_stability: clamp(orchestration),
    runtime_health: clamp(runtimeHealth),
    overall: clamp(
      parity * 0.25 +
        governance * 0.2 +
        toolCorrectness * 0.2 +
        consultative * 0.15 +
        orchestration * 0.1 +
        runtimeHealth * 0.1,
    ),
  };
}

export function guardKernelResponse(result: CognitiveTurnResult): ResponseGuardianResult {
  const output = clean(result.llm.output);
  const violations = new Set<string>();
  const draftViolations = assertCanonicalResponseDraft(result.decision, {
    text: output,
    tools_called: result.llm.tool_calls.map((call) => call.tool),
  });
  for (const violation of draftViolations) violations.add(violation.code);
  if ((output.match(/\?/g) ?? []).length > 1) violations.add("max_one_question_violation");
  if (hasAny(output, ["posso te mostrar", "quer que eu envie", "se quiser eu posso", "posso buscar"])) {
    violations.add("permission_to_search");
  }
  if (hasAny(output, ["triagem", "formulario", "formulário", "vou fazer algumas perguntas"])) {
    violations.add("sdr_behavior");
  }
  if (result.decision.property_presentation_due && !result.llm.tool_calls.some((call) => call.tool === "consultar_imoveis")) {
    violations.add("overqualification_without_inventory");
  }
  if (result.decision.signals.inventory_fatigue && result.llm.tool_calls.filter((call) => call.tool === "consultar_imoveis").length > 1) {
    violations.add("repeated_inventory_loop");
  }
  for (const violation of result.violations) violations.add(violation.code);
  for (const failure of result.shadow?.comparison?.critical_failures ?? []) violations.add(failure.code);
  if (result.shadow?.calibration?.human_review.required) violations.add("human_review_required");

  const confidence = buildKernelConfidence(result);
  const violationList = [...violations];
  return {
    allowed: violationList.length === 0 && confidence.overall >= 97,
    violations: violationList,
    fallback_required: violationList.length > 0 || confidence.overall < 97,
    confidence,
  };
}

