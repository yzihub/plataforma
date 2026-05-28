import type { CanonicalKernelDecision } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type {
  BehavioralCalibration,
  CalibrationDatasetTag,
  EdgeCaseTag,
  LlmRuntimeResult,
  NormalizedTurnInput,
  ShadowComparison,
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

function questionCount(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function consultativeDensity(output: string): number {
  const markers = [
    "faz sentido",
    "com o que voce",
    "com o que você",
    "essa linha",
    "curadoria",
    "alinhada",
    "tradeoff",
    "eu iria",
    "para o seu contexto",
  ];
  const hits = markers.filter((marker) => hasAny(output, [marker])).length;
  return clamp((hits / 4) * 100);
}

function edgeCases(input: NormalizedTurnInput, decision: CanonicalKernelDecision): EdgeCaseTag[] {
  const text = normalize(input.mensagemCliente);
  const tags = new Set<EdgeCaseTag>();
  if (decision.signals.spouse_decision_signal || hasAny(text, ["esposa", "marido", "casal", "vou falar com ela"])) tags.add("casal_indeciso");
  if (input.event_type === "followup_resume" || decision.runtime_state === "followup") tags.add("followup_sensivel");
  if (decision.signals.revisit_inventory_signal) tags.add("revisit_inventory");
  if (hasAny(text, ["invest", "rentabilidade", "valorizacao", "valorização"])) tags.add("investidor");
  if (decision.signals.beach_interest || hasAny(text, ["praia", "cabo branco", "beira mar"])) tags.add("praia");
  if (decision.signals.financing_signal && (decision.signals.fgts_signal || hasAny(text, ["carta", "entrada", "banco"]))) tags.add("financiamento_complexo");
  if (hasAny(text, ["nao sei", "não sei", "confuso", "talvez", "depende"])) tags.add("lead_confuso");
  if (hasAny(text, ["morar e investir", "comprar ou alugar", "casa ou apartamento", "praia ou centro"])) tags.add("multiplos_objetivos");
  return [...tags];
}

function learningSetTags(comparison: ShadowComparison, calibration: Pick<BehavioralCalibration, "tool_timing" | "governance_parity_audit" | "readiness_gates">): CalibrationDatasetTag[] {
  const tags = new Set<CalibrationDatasetTag>();
  if (comparison.score.overall >= 97 && comparison.critical_failures.length === 0) tags.add("excellent_parity");
  if (comparison.score.overall >= 97 && comparison.output_analysis.candidate_consultative) tags.add("high_performing_conversation");
  if (comparison.output_analysis.candidate_sdr_behavior || comparison.divergences.some((d) => d.code.includes("sdr"))) tags.add("sdr_regression");
  if (!calibration.tool_timing.stable) tags.add("tool_timing_failure");
  if (!calibration.governance_parity_audit.stable) tags.add("governance_violation");
  if (!calibration.readiness_gates.ready_for_cutover && comparison.critical_failures.length) tags.add("critical_review");
  if (comparison.divergences.length && tags.size === 0) tags.add("edge_case");
  return [...tags];
}

export function calibrateBehavior(args: {
  input: NormalizedTurnInput;
  decision: CanonicalKernelDecision;
  llm: LlmRuntimeResult;
  comparison: ShadowComparison;
}): BehavioralCalibration {
  const output = args.llm.output;
  const tools = args.llm.tool_calls.map((call) => call.tool);
  const originalTools = args.input.shadow_original?.tool_usage ?? args.input.shadow_original?.tool_decisions ?? [];
  const questions = questionCount(output);
  const sdrReasons: string[] = [];
  const permission = hasAny(output, ["posso te mostrar", "quer que eu envie", "se quiser eu posso", "posso buscar", "quer que eu busque"]);
  const formLike = hasAny(output, ["formulario", "formulário", "triagem", "vou fazer algumas perguntas", "me responda"]);
  const excessiveQualification = questions > 1;
  const delayedPresentation = args.decision.property_presentation_due && !tools.includes("consultar_imoveis");
  const excessivePressure = hasAny(output, ["ultima chance", "última chance", "preciso que decida agora", "urgente", "vai perder"]);
  if (permission) sdrReasons.push("pediu_autorizacao_para_buscar");
  if (formLike) sdrReasons.push("formulario_implicito");
  if (excessiveQualification) sdrReasons.push("multiplas_perguntas");
  if (delayedPresentation) sdrReasons.push("atraso_de_apresentacao");
  if (excessivePressure) sdrReasons.push("insistencia_excessiva");

  const required = args.decision.required_tools.includes("consultar_imoveis");
  const executed = tools.includes("consultar_imoveis");
  const originalExecuted = originalTools.includes("consultar_imoveis");
  const tooEarly = !args.decision.property_presentation_due && executed && !originalExecuted;
  const tooLate = required && !executed;
  const toolTimingStatus: BehavioralCalibration["tool_timing"]["status"] = !required && !executed
    ? "not_required"
    : tooLate
      ? "missing"
      : tooEarly
        ? "too_early"
        : executed
          ? "on_time"
          : "too_late";

  const shouldActivate = args.decision.signals.property_intent && args.decision.signals.useful_context;
  const didActivate = args.decision.property_presentation_due;
  const failedToActivate = shouldActivate && !didActivate;
  const overTriggered = !shouldActivate && didActivate && !args.decision.signals.property_revalidation_required;

  const governanceAudit = {
    inventory_fatigue: args.comparison.parity.inventory_fatigue !== false,
    revisit_inventory: args.decision.signals.revisit_inventory_signal ? args.decision.property_presentation_due : true,
    spouse_governance: args.decision.signals.spouse_decision_signal ? !excessivePressure : true,
    followup_pressure: args.decision.runtime_state === "followup" ? !excessivePressure : true,
    anti_loop: args.decision.signals.inventory_fatigue ? output.length < 1200 && questions <= 1 : true,
    stable: true,
  };
  governanceAudit.stable = Object.values(governanceAudit).every(Boolean);

  const density = consultativeDensity(output);
  const earlyPresentation = args.decision.property_presentation_due
    ? executed ? 100 : 0
    : tooEarly ? 45 : 100;
  const avoidanceSdr = clamp(100 - sdrReasons.length * 25);
  const avoidanceAbstract = args.decision.property_presentation_due && !executed ? 0 : 100;
  const learningThroughCuration = executed && density >= 50 ? 100 : executed ? 75 : args.decision.property_presentation_due ? 25 : 80;
  const consultativeBehavior = clamp((density * 0.5) + (avoidanceSdr * 0.5));
  const consultativeOverall = clamp(
    earlyPresentation * 0.25 +
      avoidanceSdr * 0.25 +
      avoidanceAbstract * 0.2 +
      learningThroughCuration * 0.15 +
      consultativeBehavior * 0.15,
  );

  const rhythm = {
    questions_per_response: questions,
    average_response_chars: output.length,
    commercial_pressure: excessivePressure,
    consultative_density: density,
    presentation_timing: args.decision.property_presentation_due ? (executed ? "early" : "delayed") : "not_applicable" as "early" | "delayed" | "not_applicable",
  };

  const gatesWithoutReady = {
    parity_gt_97: args.comparison.score.parity > 97,
    zero_critical_sdr_regressions: !args.comparison.critical_failures.some((failure) => failure.code.includes("sdr") || failure.code.includes("permission")) && sdrReasons.length === 0,
    zero_critical_governance_violations: governanceAudit.stable && !args.comparison.critical_failures.some((failure) => failure.code.includes("governance")),
    tool_timing_stable: toolTimingStatus === "on_time" || toolTimingStatus === "not_required",
    property_presentation_due_stable: !failedToActivate && !overTriggered,
    consultative_score_stable: consultativeOverall >= 97,
  };
  const readinessScore = clamp(Object.values(gatesWithoutReady).filter(Boolean).length / Object.keys(gatesWithoutReady).length * 100);
  const readiness = {
    ...gatesWithoutReady,
    ready_for_cutover: Object.values(gatesWithoutReady).every(Boolean),
    readiness_score: readinessScore,
  };

  const partial = {
    tool_timing: {
      consultar_imoveis_required: required,
      consultar_imoveis_executed: executed,
      status: toolTimingStatus,
      stable: toolTimingStatus === "on_time" || toolTimingStatus === "not_required",
    },
    governance_parity_audit: governanceAudit,
    readiness_gates: readiness,
  };

  const reviewReasons = [
    ...sdrReasons,
    ...(args.comparison.critical_failures.length ? ["critical_divergence"] : []),
    ...(!partial.tool_timing.stable ? ["tool_timing_unstable"] : []),
    ...(!governanceAudit.stable ? ["governance_unstable"] : []),
  ];

  return {
    consultative_parity_score: {
      early_property_presentation: earlyPresentation,
      avoidance_sdr: avoidanceSdr,
      avoidance_abstract_qualification: avoidanceAbstract,
      learning_through_curation: learningThroughCuration,
      consultative_behavior: consultativeBehavior,
      overall: consultativeOverall,
    },
    sdr_regression: {
      detected: sdrReasons.length > 0,
      reasons: sdrReasons,
      severity: sdrReasons.some((reason) => reason === "pediu_autorizacao_para_buscar" || reason === "atraso_de_apresentacao") ? "CRITICAL" : sdrReasons.length ? "HIGH" : "LOW",
    },
    tool_timing: partial.tool_timing,
    property_presentation_due_audit: {
      should_activate: shouldActivate,
      did_activate: didActivate,
      failed_to_activate: failedToActivate,
      over_triggered: overTriggered,
      stable: !failedToActivate && !overTriggered,
    },
    governance_parity_audit: governanceAudit,
    conversational_rhythm: rhythm,
    learning_set_tags: learningSetTags(args.comparison, partial),
    edge_cases: edgeCases(args.input, args.decision),
    trends: {
      parity_over_time_key: "calibration.parity.over_time",
      governance_stability_key: "calibration.governance.stability",
      sdr_regression_trend_key: "calibration.sdr.regression",
      tool_timing_trend_key: "calibration.tool_timing.consultar_imoveis",
      consultative_score_trend_key: "calibration.consultative.score",
    },
    readiness_gates: readiness,
    human_review: {
      required: reviewReasons.length > 0,
      reasons: reviewReasons,
      priority: args.comparison.critical_failures.length || sdrReasons.length ? "CRITICAL" : reviewReasons.length ? "HIGH" : "LOW",
    },
    would_have_replied: {
      output,
      tool_calls: tools,
    },
  };
}
