import { describe, expect, it } from "vitest";
import {
  assertCanonicalKernelDecision,
  assertCanonicalResponseDraft,
  buildCanonicalKernelDecision,
  canonicalKernelDecisionSchema,
  canonicalKernelInputSchema,
  canonicalNextBestActionContract,
  canonicalStateMachineContract,
  renderCanonicalContextContract,
} from "@/lib/ju-runtime/cognitive-kernel-contracts";
import { canonicalParityFixtures } from "./canonical-fixtures";

describe("canonical Ju cognitive kernel contracts", () => {
  it("defines the official hardened runtime state machine", () => {
    expect(canonicalStateMachineContract.states).toEqual([
      "lead_novo",
      "qualificando",
      "matching",
      "comparando",
      "visita",
      "followup",
    ]);
    expect(canonicalStateMachineContract.transitions.matching).toContain("comparando");
    expect(canonicalStateMachineContract.transitions.comparando).toContain("visita");
    expect(canonicalStateMachineContract.forbiddenTransitions.visita).toContain("lead_novo");
    expect(canonicalStateMachineContract.sideEffects.followup).toContain("reduce_pressure");
  });

  it("defines executable next_best_action preconditions and postconditions", () => {
    expect(canonicalNextBestActionContract.apresentar_opcoes_aderentes.preconditions).toContain("consultar_imoveis is required");
    expect(canonicalNextBestActionContract.aprofundar_criterios.forbiddenWhen).toContain("property_presentation_due");
    expect(canonicalNextBestActionContract.reduzir_inventory.validWhen).toContain("inventory_fatigue");
    expect(canonicalNextBestActionContract.facilitar_agendamento.postconditions).toContain("setar_lead_quente may be required");
  });

  it.each([
    "lead_quente",
    "praia",
    "fgts",
    "financiamento",
    "alto_padrao",
    "investidor",
  ] as const)("forces consultar_imoveis when property intent has useful context: %s", (fixtureName) => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures[fixtureName]);

    expect(decision.property_presentation_due).toBe(true);
    expect(decision.next_best_action).toBe("apresentar_opcoes_aderentes");
    expect(decision.required_tools).toContain("consultar_imoveis");
    expect(decision.retrieval_policy).toBe("tool_required");
    expect(assertCanonicalKernelDecision(decision)).toEqual([]);
  });

  it("calls consultar_imoveis after bairro, budget, type and bedrooms without blocking on optional refinements", () => {
    const decision = buildCanonicalKernelDecision({
      ...canonicalParityFixtures.lead_frio,
      deal: {
        id: "deal-bessa-600k",
        location_preference: "Bessa",
        property_type: "apartamento",
        bedrooms: 3,
        budget_max: 600000,
      },
      mensagemCliente: "Bessa, ate 600k, 3 quartos, seminovo, lazer completo e nascente.",
    });

    expect(decision.signals.matching_context_complete).toBe(true);
    expect(decision.signals.bedrooms_context).toBe(true);
    expect(decision.property_presentation_due).toBe(true);
    expect(decision.next_best_action).toBe("apresentar_opcoes_aderentes");
    expect(decision.required_tools).toContain("consultar_imoveis");
    expect(decision.retrieval_policy).toBe("tool_required");
    expect(assertCanonicalKernelDecision(decision)).toEqual([]);
  });

  it("keeps a cold lead consultative without SDR behavior", () => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_frio);

    expect(decision.runtime_state).toBe("lead_novo");
    expect(decision.next_best_action).toBe("descobrir_contexto");
    expect(decision.required_tools).toEqual([]);
    expect(decision.blocked_behaviors).toEqual(expect.arrayContaining(["sdr_behavior", "permission_to_search"]));
  });

  it("applies spouse governance without forcing pressure", () => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.casal);

    expect(decision.runtime_state).toBe("comparando");
    expect(decision.next_best_action).toBe("acompanhar_decisao_casal");
    expect(decision.governance.spouse_decision_governance).toBe(true);
    expect(decision.required_tools).toEqual([]);
  });

  it("formalizes follow-up pressure reduction", () => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.follow_up);
    const violations = assertCanonicalResponseDraft(decision, {
      text: "Última chance, preciso que decida agora.",
      tools_called: [],
    });

    expect(decision.runtime_state).toBe("followup");
    expect(decision.next_best_action).toBe("manter_radar_contextual");
    expect(decision.governance.followup_pressure_reduction).toBe(true);
    expect(violations.map((v) => v.code)).toContain("excessive_followup_pressure");
  });

  it("formalizes revisit inventory as revalidation, not URL reconstruction", () => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.revisit_inventory);

    expect(decision.signals.property_revalidation_required).toBe(true);
    expect(decision.property_presentation_due).toBe(true);
    expect(decision.governance.presentation_mode).toBe("revalidation");
    expect(decision.required_tools).toContain("consultar_imoveis");
  });

  it("protects inventory fatigue while preserving tool truth", () => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.inventory_fatigue);

    expect(decision.signals.inventory_fatigue).toBe(true);
    expect(decision.governance.inventory_fatigue_protection).toBe(true);
    expect(decision.governance.presentation_mode).toBe("curated_or_reanchor");
    expect(decision.required_tools).toContain("consultar_imoveis");
  });

  it("routes visit acceptance to appointment facilitation and setar_lead_quente", () => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.visita_marcada);

    expect(decision.runtime_state).toBe("visita");
    expect(decision.next_best_action).toBe("apresentar_opcoes_aderentes");
    expect(decision.required_tools).toContain("consultar_imoveis");
    expect(decision.allowed_tools).toContain("setar_lead_quente");
  });

  it.each([
    "quero falar com um corretor humano",
    "pode me ligar?",
    "quero atendimento humano",
    "tem alguém para falar comigo?",
  ])("routes operational handoff signal to setar_lead_quente: %s", (mensagemCliente) => {
    const decision = buildCanonicalKernelDecision({
      ...canonicalParityFixtures.lead_frio,
      mensagemCliente,
    });

    expect(decision.signals.handoff_signal).toBe(true);
    expect(decision.runtime_state).toBe("visita");
    expect(decision.next_best_action).toBe("facilitar_agendamento");
    expect(decision.required_tools).toContain("setar_lead_quente");
    expect(decision.allowed_tools).toContain("setar_lead_quente");
  });

  it("validates input and decision with Zod schemas", () => {
    const input = canonicalKernelInputSchema.parse(canonicalParityFixtures.lead_quente);
    const decision = buildCanonicalKernelDecision(input);

    expect(() => canonicalKernelDecisionSchema.parse(decision)).not.toThrow();
  });

  it("rejects forbidden consultative doctrine violations", () => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_quente);
    const violations = assertCanonicalResponseDraft(decision, {
      text: "Posso te mostrar algumas opções? Vou fazer algumas perguntas de triagem: qual bairro? qual valor?",
      tools_called: [],
      property_cards_count: 4,
    });

    expect(violations.map((violation) => violation.code)).toEqual(expect.arrayContaining([
      "missing_required_tool",
      "permission_to_search",
      "sdr_behavior",
      "abstract_qualification_loop",
      "too_many_questions",
      "too_many_properties",
    ]));
  });

  it("renders the official _context contract in hardened order", () => {
    const input = canonicalParityFixtures.revisit_inventory;
    const decision = buildCanonicalKernelDecision(input);
    const context = renderCanonicalContextContract(input, decision);

    expect(context.indexOf("<yzi_operational_runtime>")).toBeLessThan(context.indexOf("<estado_operacional>"));
    expect(context.indexOf("<estado_operacional>")).toBeLessThan(context.indexOf("<funnel_runtime>"));
    expect(context).toContain("PROPERTY_PRESENTATION_DUE: true");
    expect(context).toContain("requires_consultar_imoveis: true");
    expect(context).toContain("never_reconstruct_property_url: true");
  });

  it("keeps memory replay bounded to the official hot path limit", () => {
    const input = {
      ...canonicalParityFixtures.lead_quente,
      recent_messages: Array.from({ length: 18 }, (_, index) => ({
        direction: index % 2 ? "inbound" : "outbound",
        sender_type: index % 2 ? "lead" : "agent",
        content: `mensagem ${index}`,
      })),
    };
    const decision = buildCanonicalKernelDecision(input);
    const context = renderCanonicalContextContract(input, decision);

    expect(decision.memory_contract.recent_history_max).toBe(10);
    expect((context.match(/mensagem /g) ?? []).length).toBe(10);
  });

  it("provides a stable snapshot contract for the dominant property rule", () => {
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_quente);

    expect({
      runtime_state: decision.runtime_state,
      next_best_action: decision.next_best_action,
      property_presentation_due: decision.property_presentation_due,
      required_tools: decision.required_tools,
      retrieval_policy: decision.retrieval_policy,
      presentation_mode: decision.governance.presentation_mode,
      blocked_behaviors: decision.blocked_behaviors,
    }).toMatchInlineSnapshot(`
      {
        "blocked_behaviors": [
          "sdr_behavior",
          "permission_to_search",
          "abstract_qualification_loop",
          "too_many_questions",
          "too_many_properties",
          "inventory_loop",
          "excessive_followup_pressure",
          "orphan_tool_execution",
        ],
        "next_best_action": "apresentar_opcoes_aderentes",
        "presentation_mode": "curated",
        "property_presentation_due": true,
        "required_tools": [
          "consultar_imoveis",
        ],
        "retrieval_policy": "tool_required",
        "runtime_state": "matching",
      }
    `);
  });
});
