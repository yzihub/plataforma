import { describe, expect, it } from "vitest";
import { buildJuRuntimeContext } from "@/lib/ju-runtime/context-builder";
import { buildJuRuntimeDecision } from "@/lib/ju-runtime/state-engine";

describe("buildJuRuntimeDecision", () => {
  it("requires consultar_imoveis when the lead is search-ready", () => {
    const decision = buildJuRuntimeDecision({
      tenant_id: "tenant",
      lead: { id: "lead", tenant_id: "tenant", status: "contacted" },
      deal: {
        id: "deal",
        tenant_id: "tenant",
        lead_id: "lead",
        location_preference: "Bessa",
        property_type: "apartamento",
      },
      conversation: { id: "conversation", tenant_id: "tenant", lead_id: "lead", deal_id: "deal" },
      current_message: "quero opcoes no Bessa",
    });

    expect(decision.runtime_state).toBe("buscando_imoveis");
    expect(decision.next_action).toBe("apresentar_imoveis");
    expect(decision.objective_state).toBe("apresentar_imoveis");
    expect(decision.expected_output).toContain("consultar_imoveis");
    expect(decision.required_tools).toContain("consultar_imoveis");
    expect(decision.allowed_tools).toContain("consultar_imoveis");
    expect(decision.blocked_questions).toContain("bairro");
    expect(decision.retrieval_policy).toBe("disabled");
  });

  it("routes human requests to handoff without letting the LLM decide flow", () => {
    const decision = buildJuRuntimeDecision({
      tenant_id: "tenant",
      lead: { id: "lead", tenant_id: "tenant", status: "contacted" },
      conversation: { id: "conversation", tenant_id: "tenant", lead_id: "lead" },
      current_message: "quero falar com um corretor humano",
    });

    expect(decision.runtime_state).toBe("handoff_humano");
    expect(decision.next_action).toBe("handoff_corretor");
    expect(decision.objective_state).toBe("encaminhar_corretor");
    expect(decision.conversation_mode).toBe("escalation");
    expect(decision.handoff_state).toBe("requested");
    expect(decision.required_tools).toContain("setar_lead_quente");
    expect(decision.decision_payload.response_contract).toMatchObject({
      backend_decides_flow: true,
    });
  });

  it("keeps unresolved qualification state explicit", () => {
    const decision = buildJuRuntimeDecision({
      tenant_id: "tenant",
      lead: { id: "lead", tenant_id: "tenant", status: "contacted" },
      conversation: { id: "conversation", tenant_id: "tenant", lead_id: "lead" },
      current_message: "nao sei ainda",
      recent_messages: [
        { direction: "outbound", sender_type: "agent", content: "Qual bairro voce prefere?" },
        { direction: "inbound", sender_type: "lead", content: "Ainda nao sei" },
      ],
    });

    expect(decision.runtime_state).toBe("qualificacao");
    expect(decision.next_action).toBe("qualificar_objetivo");
    expect(decision.objective_state).toBe("qualificar_intencao");
    expect(decision.missing_fields).toContain("objetivo");
    expect(decision.allowed_tools).toContain("atualizar_qualificacao");
  });

  it("builds governed context without reopening blocked fields", () => {
    const input = {
      tenant_id: "tenant",
      lead: { id: "lead", tenant_id: "tenant", status: "contacted" },
      deal: {
        id: "deal",
        tenant_id: "tenant",
        lead_id: "lead",
        location_preference: "Bessa",
        property_type: "apartamento",
      },
      conversation: { id: "conversation", tenant_id: "tenant", lead_id: "lead", deal_id: "deal" },
      current_message: "manda opcoes",
      recent_messages: Array.from({ length: 12 }, (_, index) => ({
        direction: index % 2 ? "inbound" : "outbound",
        sender_type: index % 2 ? "lead" : "agent",
        content: `mensagem ${index}`,
      })),
    };

    const decision = buildJuRuntimeDecision(input);
    const context = buildJuRuntimeContext(input, decision);

    expect(context.tool_rules.required_tools).toContain("consultar_imoveis");
    expect(context.retrieval_rules.allowed).toBe(false);
    expect(context.hierarchy.tier_4_short_transcript).toHaveLength(6);
    expect(context.context).toContain("blocked_questions: bairro, tipo_imovel");
    expect(context.context).toContain("Nao reabra fluxo por transcript");
    expect(context.context).toContain("objective_state: apresentar_imoveis");
  });

  it("flags invalid objective switching for audit", () => {
    const decision = buildJuRuntimeDecision(
      {
        tenant_id: "tenant",
        lead: { id: "lead", tenant_id: "tenant", status: "contacted" },
        conversation: { id: "conversation", tenant_id: "tenant", lead_id: "lead" },
        current_message: "preciso mandar documento?",
        deal: { id: "deal", tenant_id: "tenant", lead_id: "lead", deal_stage: "contrato" },
      },
      {
        runtime_state: "buscando_imoveis",
        next_action: "apresentar_imoveis",
        objective_state: "apresentar_imoveis",
      },
    );

    expect(decision.objective_state).toBe("cobrar_documentacao");
    expect(decision.valid_objective_transition).toBe(false);
    expect(decision.decision_payload.objective_governance).toMatchObject({
      active_objective: "cobrar_documentacao",
      valid_transition: false,
    });
  });

  it("keeps media failures in a bounded objective", () => {
    const decision = buildJuRuntimeDecision({
      tenant_id: "tenant",
      lead: { id: "lead", tenant_id: "tenant", status: "contacted" },
      conversation: { id: "conversation", tenant_id: "tenant", lead_id: "lead" },
      current_message: "",
      media_state: "failed",
    });

    expect(decision.next_action).toBe("fallback_midia");
    expect(decision.objective_state).toBe("tratar_falha_midia");
    expect(decision.expected_output).toContain("falha de midia");
  });

  it("keeps silence as wait state instead of inventing a new objective", () => {
    const decision = buildJuRuntimeDecision({
      tenant_id: "tenant",
      lead: { id: "lead", tenant_id: "tenant", status: "contacted" },
      deal: {
        id: "deal",
        tenant_id: "tenant",
        lead_id: "lead",
        intent: "moradia",
        location_preference: "Bessa",
        budget_max: 700000,
        timeline: "3 meses",
      },
      conversation: { id: "conversation", tenant_id: "tenant", lead_id: "lead", deal_id: "deal" },
      current_message: "",
    });

    expect(decision.next_action).toBe("aguardar_resposta");
    expect(decision.objective_state).toBe("aguardar_resposta");
  });

  it("allows lazy retrieval only for objective-scoped questions", () => {
    const input = {
      tenant_id: "tenant",
      lead: { id: "lead", tenant_id: "tenant", status: "contacted" },
      deal: {
        id: "deal",
        tenant_id: "tenant",
        lead_id: "lead",
        intent: "moradia",
        location_preference: "Bessa",
        budget_max: 700000,
        timeline: "3 meses",
      },
      conversation: { id: "conversation", tenant_id: "tenant", lead_id: "lead", deal_id: "deal" },
      current_message: "qual o perfil desse bairro?",
    };

    const decision = buildJuRuntimeDecision(input);
    const context = buildJuRuntimeContext(input, decision);

    expect(decision.objective_state).toBe("responder_duvida");
    expect(decision.retrieval_policy).toBe("lazy");
    expect(context.retrieval_rules.allowed).toBe(true);
    expect(context.retrieval_rules.max_chunks).toBe(2);
  });
});
