import type { CanonicalKernelDecision, RuntimeViolationCode } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type {
  DivergenceSeverity,
  LlmRuntimeResult,
  RenderedContext,
  ShadowBehavioralScores,
  ShadowComparison,
  ShadowDivergence,
  ShadowOriginalSnapshot,
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

function questionCount(text: unknown): number {
  return (clean(text).match(/\?/g) ?? []).length;
}

function hasAny(text: unknown, patterns: string[]): boolean {
  const normalized = normalize(text);
  return patterns.some((pattern) => normalized.includes(normalize(pattern)));
}

function equalArray(a?: unknown[] | null, b?: unknown[] | null): boolean | null {
  if (!a && !b) return null;
  const left = [...new Set((a ?? []).map(clean).filter(Boolean))].sort();
  const right = [...new Set((b ?? []).map(clean).filter(Boolean))].sort();
  return JSON.stringify(left) === JSON.stringify(right);
}

function boolParity(original?: boolean | null, candidate?: boolean | null): boolean | null {
  if (original === null || original === undefined) return null;
  return Boolean(original) === Boolean(candidate);
}

function stringParity(original?: string | null, candidate?: string | null): boolean | null {
  if (!clean(original)) return null;
  return normalize(original) === normalize(candidate);
}

function severityRank(severity: DivergenceSeverity): number {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[severity];
}

function maxSeverity(divergences: ShadowDivergence[]): DivergenceSeverity {
  return divergences.reduce<DivergenceSeverity>(
    (max, divergence) => severityRank(divergence.severity) > severityRank(max) ? divergence.severity : max,
    "LOW",
  );
}

function push(
  divergences: ShadowDivergence[],
  args: Omit<ShadowDivergence, "severity"> & { severity: DivergenceSeverity },
) {
  divergences.push(args);
}

function outputTraits(text: string) {
  return {
    questions: questionCount(text),
    sdr_behavior: hasAny(text, ["preencher cadastro", "vou fazer algumas perguntas", "formulario", "triagem", "me responda mais"]),
    permission_to_search: hasAny(text, ["posso te mostrar", "quer que eu envie", "se quiser eu posso", "posso buscar", "quer que eu busque"]),
    pressure: hasAny(text, ["ultima chance", "preciso que decida agora", "urgente", "vai perder"]),
    consultative: hasAny(text, ["faz sentido", "com o que voce me disse", "com o que você me disse", "essa linha", "curadoria", "opcao alinhada", "opção alinhada"]),
  };
}

function scoreFromDivergences(divergences: ShadowDivergence[], outputCandidate: ReturnType<typeof outputTraits>): ShadowBehavioralScores {
  const critical = divergences.filter((d) => d.severity === "CRITICAL").length;
  const high = divergences.filter((d) => d.severity === "HIGH").length;
  const medium = divergences.filter((d) => d.severity === "MEDIUM").length;
  const low = divergences.filter((d) => d.severity === "LOW").length;
  const penalty = critical * 35 + high * 18 + medium * 8 + low * 3;
  const governancePenalty = divergences.filter((d) => d.code.includes("governance") || d.code.includes("sdr") || d.code.includes("permission")).length * 18;
  const toolPenalty = divergences.filter((d) => d.field.includes("tool") || d.field.includes("required_tools")).length * 20;
  const consultativePenalty = (outputCandidate.sdr_behavior ? 35 : 0) + (outputCandidate.permission_to_search ? 30 : 0) + (outputCandidate.questions > 1 ? 15 : 0);
  const timingPenalty = divergences.some((d) => d.code === "missed_property_presentation") ? 35 : 0;

  const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
  const parity = clamp(100 - penalty);
  const governance = clamp(100 - governancePenalty);
  const consultative = clamp(100 - consultativePenalty);
  const timing = clamp(100 - timingPenalty);
  const orchestration = clamp(100 - toolPenalty);
  return {
    parity,
    governance_adherence: governance,
    consultative_behavior: consultative,
    timing,
    orchestration_correctness: orchestration,
    overall: clamp((parity * 0.3) + (governance * 0.25) + (consultative * 0.2) + (timing * 0.15) + (orchestration * 0.1)),
  };
}

function missingCriticalCodes(divergences: ShadowDivergence[]): RuntimeViolationCode[] {
  return divergences
    .filter((d) => d.severity === "CRITICAL")
    .map((d) => d.code as RuntimeViolationCode);
}

export function compareShadowBehavior(args: {
  original: ShadowOriginalSnapshot | null | undefined;
  decision: CanonicalKernelDecision;
  context: RenderedContext;
  llm: LlmRuntimeResult;
  runtime_memory?: Record<string, unknown>;
}): ShadowComparison {
  const original = args.original ?? {};
  const candidateOutput = args.llm.output;
  const originalOutput = clean(original.output);
  const candidateTools = args.llm.tool_calls.map((call) => call.tool);
  const originalTools = original.tool_usage ?? original.tool_decisions ?? [];
  const divergences: ShadowDivergence[] = [];

  const parity = {
    next_best_action: stringParity(original.next_best_action, args.decision.next_best_action),
    property_presentation_due: boolParity(original.property_presentation_due, args.decision.property_presentation_due),
    required_tools: equalArray(original.required_tools, args.decision.required_tools),
    funnel_stage: stringParity(original.funnel_stage, args.decision.runtime_state),
    qualification_depth: original.qualification_depth == null ? null : Number(original.qualification_depth) === Number(args.runtime_memory?.qualification_depth ?? 0),
    governance_flags: original.governance_flags ? true : null,
    inventory_fatigue: boolParity(original.inventory_fatigue, args.decision.signals.inventory_fatigue),
    spouse_decision: boolParity(original.spouse_decision, args.decision.signals.spouse_decision_signal),
    rendered_context: original.rendered_context ? normalize(original.rendered_context).includes("property_presentation_due") === args.context.context.includes("PROPERTY_PRESENTATION_DUE") : null,
    tool_decisions: equalArray(originalTools, candidateTools),
    output_behavior: originalOutput ? null : null,
  };

  for (const [field, value] of Object.entries(parity)) {
    if (value === false) {
      const severity: DivergenceSeverity = field === "required_tools" || field === "tool_decisions" ? "HIGH" : "MEDIUM";
      push(divergences, {
        field,
        severity,
        code: `${field}_mismatch`,
        message: `Shadow ${field} diverged from n8n snapshot.`,
        original: (original as Record<string, unknown>)[field],
        candidate: field === "funnel_stage" ? args.decision.runtime_state : (args.decision as unknown as Record<string, unknown>)[field],
      });
    }
  }

  const originalTraits = outputTraits(originalOutput);
  const candidateTraits = outputTraits(candidateOutput);

  if (candidateTraits.sdr_behavior && !originalTraits.sdr_behavior) {
    push(divergences, {
      field: "output",
      severity: "CRITICAL",
      code: "sdr_regression",
      message: "Candidate introduced SDR behavior.",
      original: originalOutput,
      candidate: candidateOutput,
    });
  }
  if (candidateTraits.permission_to_search) {
    push(divergences, {
      field: "output",
      severity: "CRITICAL",
      code: "permission_to_search",
      message: "Candidate asked permission to search/present inventory.",
      original: originalOutput,
      candidate: candidateOutput,
    });
  }
  if (args.decision.property_presentation_due && !candidateTools.includes("consultar_imoveis")) {
    push(divergences, {
      field: "tool_decisions",
      severity: "CRITICAL",
      code: "mandatory_tool_missing",
      message: "property_presentation_due requires consultar_imoveis.",
      original: originalTools,
      candidate: candidateTools,
    });
  }
  if (args.decision.property_presentation_due && candidateTraits.questions > 0 && !candidateTools.includes("consultar_imoveis")) {
    push(divergences, {
      field: "output",
      severity: "CRITICAL",
      code: "missed_property_presentation",
      message: "Candidate kept qualifying instead of presenting inventory.",
      original: originalOutput,
      candidate: candidateOutput,
    });
  }
  if (candidateTraits.questions > 1) {
    push(divergences, {
      field: "output",
      severity: "HIGH",
      code: "excessive_questions",
      message: "Candidate asked more than one question.",
      original: originalTraits.questions,
      candidate: candidateTraits.questions,
    });
  }
  if (candidateTraits.pressure && !originalTraits.pressure) {
    push(divergences, {
      field: "output",
      severity: "HIGH",
      code: "commercial_pressure_regression",
      message: "Candidate introduced excessive commercial pressure.",
      original: originalOutput,
      candidate: candidateOutput,
    });
  }
  if (args.decision.signals.inventory_fatigue && candidateTools.includes("consultar_imoveis") && candidateTraits.questions === 0 && !candidateTraits.consultative) {
    push(divergences, {
      field: "output",
      severity: "HIGH",
      code: "inventory_loop_risk",
      message: "Inventory fatigue requires reanchor or narrowing, not repeated inventory dump.",
      original: originalOutput,
      candidate: candidateOutput,
    });
  }

  const score = scoreFromDivergences(divergences, candidateTraits);
  const criticalFailures = divergences.filter((d) => d.severity === "CRITICAL");
  const readiness = {
    ready_for_cutover: score.parity > 95 && criticalFailures.length === 0 && !candidateTraits.sdr_behavior && score.governance_adherence >= 95 && parity.tool_decisions !== false,
    parity_threshold_met: score.parity > 95,
    zero_critical_divergences: criticalFailures.length === 0,
    zero_sdr_regressions: !missingCriticalCodes(divergences).includes("sdr_behavior") && !divergences.some((d) => d.code === "sdr_regression"),
    governance_stable: score.governance_adherence >= 95,
    tool_parity_stable: parity.tool_decisions !== false && parity.required_tools !== false,
  };

  return {
    severity: divergences.length ? maxSeverity(divergences) : "LOW",
    score,
    divergences,
    critical_failures: criticalFailures,
    parity,
    output_analysis: {
      original_questions: originalTraits.questions,
      candidate_questions: candidateTraits.questions,
      original_sdr_behavior: originalTraits.sdr_behavior,
      candidate_sdr_behavior: candidateTraits.sdr_behavior,
      original_permission_to_search: originalTraits.permission_to_search,
      candidate_permission_to_search: candidateTraits.permission_to_search,
      original_pressure: originalTraits.pressure,
      candidate_pressure: candidateTraits.pressure,
      candidate_consultative: candidateTraits.consultative,
    },
    readiness,
  };
}
