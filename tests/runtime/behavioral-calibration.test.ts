import { describe, expect, it } from "vitest";
import { buildCanonicalKernelDecision } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import { calibrateBehavior } from "@/runtime/behavioral_calibration";
import { compareShadowBehavior } from "@/runtime/divergence_engine";
import type { LlmRuntimeResult, NormalizedTurnInput, RenderedContext } from "@/runtime/types";
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
    token_usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
    passes: 1,
  };
}

function normalizeFixture(name: keyof typeof canonicalParityFixtures): NormalizedTurnInput {
  const fixture = canonicalParityFixtures[name];
  return {
    tenant_id: fixture.tenant_id,
    conversation_id: fixture.conversation?.id,
    mensagemCliente: fixture.mensagemCliente ?? "",
    event_type: fixture.event_type,
    internal_behavioral_event: fixture.internal_behavioral_event ?? null,
    shadow_original: {
      output: "Encontrei uma opção alinhada com o que você pediu.",
      tool_usage: ["consultar_imoveis"],
      next_best_action: "apresentar_opcoes_aderentes",
      property_presentation_due: true,
      required_tools: ["consultar_imoveis"],
      funnel_stage: "matching",
    },
  };
}

describe("calibrateBehavior", () => {
  it("scores excellent consultative parity when presentation is early and tool timing is stable", () => {
    const input = normalizeFixture("lead_quente");
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_quente);
    const runtime = llm("Encontrei uma opção alinhada com o que você pediu. Essa linha faz sentido?", ["consultar_imoveis"]);
    const comparison = compareShadowBehavior({ original: input.shadow_original, decision, context, llm: runtime });
    const calibration = calibrateBehavior({ input, decision, llm: runtime, comparison });

    expect(calibration.tool_timing.status).toBe("on_time");
    expect(calibration.sdr_regression.detected).toBe(false);
    expect(calibration.consultative_parity_score.early_property_presentation).toBe(100);
    expect(calibration.learning_set_tags).toContain("excellent_parity");
    expect(calibration.would_have_replied.output).toBe(runtime.output);
  });

  it("detects SDR regression and delayed property presentation", () => {
    const input = normalizeFixture("lead_quente");
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_quente);
    const runtime = llm("Posso buscar para você? Antes me responda: bairro? valor? quartos?");
    const comparison = compareShadowBehavior({ original: input.shadow_original, decision, context, llm: runtime });
    const calibration = calibrateBehavior({ input, decision, llm: runtime, comparison });

    expect(calibration.sdr_regression.detected).toBe(true);
    expect(calibration.sdr_regression.severity).toBe("CRITICAL");
    expect(calibration.tool_timing.status).toBe("missing");
    expect(calibration.property_presentation_due_audit.stable).toBe(true);
    expect(calibration.human_review.required).toBe(true);
  });

  it("detects edge cases for casal, revisit inventory, praia and financing", () => {
    const input = normalizeFixture("casal");
    input.mensagemCliente = "Vou falar com minha esposa, tenho FGTS e queria praia no Cabo Branco";
    const fixture = {
      ...canonicalParityFixtures.casal,
      mensagemCliente: input.mensagemCliente,
    };
    const decision = buildCanonicalKernelDecision(fixture);
    const runtime = llm("Claro, faz sentido vocês olharem juntos. Posso reancorar a opção.", []);
    const comparison = compareShadowBehavior({ original: input.shadow_original, decision, context, llm: runtime });
    const calibration = calibrateBehavior({ input, decision, llm: runtime, comparison });

    expect(calibration.edge_cases).toEqual(expect.arrayContaining(["casal_indeciso", "praia"]));
    expect(calibration.governance_parity_audit.spouse_governance).toBe(true);
  });
});

