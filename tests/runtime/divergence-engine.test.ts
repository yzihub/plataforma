import { describe, expect, it } from "vitest";
import { buildCanonicalKernelDecision } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import { compareShadowBehavior } from "@/runtime/divergence_engine";
import type { LlmRuntimeResult, RenderedContext } from "@/runtime/types";
import { canonicalParityFixtures } from "../ju-cognitive-kernel/canonical-fixtures";

const context: RenderedContext = {
  context: "<governanca_comportamental>\nPROPERTY_PRESENTATION_DUE: true\n</governanca_comportamental>",
  context_chars: 90,
  required_blocks_present: true,
};

function llm(output: string, tools: string[] = []): LlmRuntimeResult {
  return {
    output,
    tool_calls: tools.map((tool) => ({ tool: tool as never, input: {} })),
    tool_results: [],
    token_usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 },
    passes: 1,
  };
}

describe("compareShadowBehavior", () => {
  it("classifies missing mandatory consultar_imoveis as critical", () => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_quente);
    const comparison = compareShadowBehavior({
      original: {
        output: "Encontrei uma opção alinhada.",
        next_best_action: "apresentar_opcoes_aderentes",
        property_presentation_due: true,
        required_tools: ["consultar_imoveis"],
        funnel_stage: "matching",
        tool_usage: ["consultar_imoveis"],
      },
      decision,
      context,
      llm: llm("Qual bairro e valor você prefere?"),
    });

    expect(comparison.severity).toBe("CRITICAL");
    expect(comparison.critical_failures.map((failure) => failure.code)).toContain("mandatory_tool_missing");
    expect(comparison.readiness.ready_for_cutover).toBe(false);
  });

  it("detects SDR and permission regressions in candidate output", () => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_quente);
    const comparison = compareShadowBehavior({
      original: {
        output: "Achei uma opção alinhada com o que você pediu.",
        tool_usage: ["consultar_imoveis"],
      },
      decision,
      context,
      llm: llm("Posso te mostrar? Antes vou fazer algumas perguntas de triagem.", ["consultar_imoveis"]),
    });

    expect(comparison.critical_failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["sdr_regression", "permission_to_search"]),
    );
    expect(comparison.score.consultative_behavior).toBeLessThan(50);
  });

  it("marks cutover readiness only when parity and governance are stable", () => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_quente);
    const comparison = compareShadowBehavior({
      original: {
        output: "Encontrei uma opção alinhada com o que você pediu.",
        next_best_action: "apresentar_opcoes_aderentes",
        property_presentation_due: true,
        required_tools: ["consultar_imoveis"],
        funnel_stage: "matching",
        tool_usage: ["consultar_imoveis"],
      },
      decision,
      context,
      llm: llm("Encontrei uma opção alinhada com o que você pediu. Faz sentido?", ["consultar_imoveis"]),
      runtime_memory: { qualification_depth: 4 },
    });

    expect(comparison.critical_failures).toHaveLength(0);
    expect(comparison.readiness.zero_critical_divergences).toBe(true);
    expect(comparison.readiness.tool_parity_stable).toBe(true);
  });
});

