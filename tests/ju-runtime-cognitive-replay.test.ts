import { describe, expect, it } from "vitest";
import { buildJuRuntimeContext } from "@/lib/ju-runtime/context-builder";
import { buildJuRuntimeDecision } from "@/lib/ju-runtime/state-engine";
import type { JuRuntimeDecision, JuRuntimeInput } from "@/lib/ju-runtime/types";

const tenantId = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";
const leadId = "11111111-1111-4111-8111-111111111111";
const dealId = "22222222-2222-4222-8222-222222222222";
const conversationId = "33333333-3333-4333-8333-333333333333";

function baseInput(overrides: Partial<JuRuntimeInput> = {}): JuRuntimeInput {
  return {
    tenant_id: tenantId,
    lead: {
      id: leadId,
      tenant_id: tenantId,
      status: "contacted",
      metadata: {},
    },
    deal: {
      id: dealId,
      tenant_id: tenantId,
      lead_id: leadId,
      deal_stage: "qualificacao",
    },
    conversation: {
      id: conversationId,
      tenant_id: tenantId,
      lead_id: leadId,
      deal_id: dealId,
      status: "open",
      ai_paused: false,
      metadata: {},
    },
    recent_messages: [],
    current_message: "",
    ...overrides,
  };
}

function decide(input: JuRuntimeInput, previous?: JuRuntimeDecision) {
  const decision = buildJuRuntimeDecision(
    input,
    previous
      ? {
          runtime_state: previous.runtime_state,
          next_action: previous.next_action,
          objective_state: previous.objective_state,
        }
      : null,
  );
  const context = buildJuRuntimeContext(input, decision);
  return { decision, context };
}

describe("Ju runtime cognitive replay", () => {
  it("keeps a new lead in explicit qualification without global retrieval", () => {
    const { decision, context } = decide(
      baseInput({
        lead: { id: leadId, tenant_id: tenantId, status: "new", metadata: {} },
        current_message: "oi, estou procurando um imovel",
      }),
    );

    expect(decision.runtime_state).toBe("lead_novo");
    expect(decision.objective_state).toBe("qualificar_intencao");
    expect(decision.next_action).toBe("qualificar_objetivo");
    expect(decision.retrieval_policy).toBe("disabled");
    expect(context.retrieval_rules.allowed).toBe(false);
    expect(context.hierarchy.tier_4_short_transcript).toHaveLength(0);
  });

  it("moves to recommendation only when the search objective is active", () => {
    const { decision } = decide(
      baseInput({
        deal: {
          id: dealId,
          tenant_id: tenantId,
          lead_id: leadId,
          intent: "moradia",
          location_preference: "Bessa",
          property_type: "apartamento",
          budget_max: 700000,
        },
        current_message: "quero opcoes no Bessa",
      }),
    );

    expect(decision.runtime_state).toBe("buscando_imoveis");
    expect(decision.objective_state).toBe("apresentar_imoveis");
    expect(decision.required_tools).toContain("consultar_imoveis");
    expect(decision.allowed_tools).toContain("consultar_imoveis");
    expect(decision.retrieval_policy).toBe("disabled");
  });

  it("does not reopen resolved fields after an intent change", () => {
    const previous = decide(
      baseInput({
        deal: {
          id: dealId,
          tenant_id: tenantId,
          lead_id: leadId,
          intent: "moradia",
          location_preference: "Bessa",
          budget_max: 700000,
        },
        current_message: "quero opcoes no Bessa",
      }),
    ).decision;

    const { decision } = decide(
      baseInput({
        deal: {
          id: dealId,
          tenant_id: tenantId,
          lead_id: leadId,
          intent: "aluguel",
          location_preference: "Manaira",
          budget_max: 4500,
        },
        current_message: "agora quero aluguel em Manaira",
      }),
      previous,
    );

    expect(decision.objective_state).toBe("apresentar_imoveis");
    expect(decision.blocked_questions).toEqual(expect.arrayContaining(["objetivo", "bairro", "budget"]));
    expect(decision.valid_objective_transition).toBe(true);
  });

  it("keeps lateral property questions as answer-only objectives", () => {
    const { decision, context } = decide(
      baseInput({
        deal: {
          id: dealId,
          tenant_id: tenantId,
          lead_id: leadId,
          intent: "moradia",
          location_preference: "Bessa",
          budget_max: 700000,
        },
        current_message: "qual o perfil desse bairro?",
      }),
    );

    expect(decision.objective_state).toBe("responder_duvida");
    expect(decision.next_action).toBe("responder_duvida");
    expect(decision.retrieval_policy).toBe("lazy");
    expect(context.retrieval_rules.allowed).toBe(true);
    expect(context.retrieval_rules.max_chunks).toBe(2);
  });

  it("bounds media failures instead of switching objectives", () => {
    const { decision } = decide(
      baseInput({
        current_message: "",
        media_state: "failed",
      }),
    );

    expect(decision.objective_state).toBe("tratar_falha_midia");
    expect(decision.next_action).toBe("fallback_midia");
    expect(decision.allowed_tools).toContain("SUPORTE1");
  });

  it("keeps silence as wait state for short or long resumptions", () => {
    for (const lastInboundAt of ["2026-05-18T14:00:00.000Z", "2026-05-17T14:00:00.000Z", "2026-05-11T14:00:00.000Z"]) {
      const { decision } = decide(
        baseInput({
          conversation: {
            id: conversationId,
            tenant_id: tenantId,
            lead_id: leadId,
            deal_id: dealId,
            status: "open",
            ai_paused: false,
            last_inbound_at: lastInboundAt,
          },
          current_message: "",
        }),
      );

      expect(decision.objective_state).toBe("aguardar_resposta");
      expect(decision.next_action).toBe("aguardar_resposta");
      expect(decision.required_tools).toHaveLength(0);
    }
  });

  it("keeps follow-up objective explicit", () => {
    const { decision } = decide(
      baseInput({
        deal: {
          id: dealId,
          tenant_id: tenantId,
          lead_id: leadId,
          deal_stage: "followup_visita",
          location_preference: "Bessa",
          budget_max: 700000,
        },
        current_message: "e ai?",
      }),
    );

    expect(decision.runtime_state).toBe("followup_visita");
    expect(decision.objective_state).toBe("followup_visita");
    expect(decision.conversation_mode).toBe("followup");
  });

  it("routes escalation and handoff without LLM flow decisions", () => {
    const { decision } = decide(
      baseInput({
        current_message: "quero falar com um corretor humano agora",
      }),
    );

    expect(decision.runtime_state).toBe("handoff_humano");
    expect(decision.objective_state).toBe("encaminhar_corretor");
    expect(decision.handoff_state).toBe("requested");
    expect(decision.escalation_state).toBe("required");
    expect(decision.required_tools).toContain("setar_lead_quente");
    expect(decision.decision_payload).toMatchObject({
      response_contract: {
        backend_decides_flow: true,
      },
    });
  });

  it("caps transcript and exposes token budget in context", () => {
    const recentMessages = Array.from({ length: 18 }, (_, index) => ({
      direction: index % 2 ? "inbound" : "outbound",
      sender_type: index % 2 ? "lead" : "agent",
      content: `mensagem operacional ${index}`,
    }));

    const { decision, context } = decide(
      baseInput({
        recent_messages: recentMessages,
        current_message: "quero opcoes no Bessa",
        deal: {
          id: dealId,
          tenant_id: tenantId,
          lead_id: leadId,
          location_preference: "Bessa",
          property_type: "apartamento",
        },
      }),
    );

    expect(context.hierarchy.tier_4_short_transcript.length).toBeLessThanOrEqual(decision.token_budget.transcript_messages_max);
    expect(context.token_metrics.short_transcript_messages).toBe(context.hierarchy.tier_4_short_transcript.length);
    expect(context.context).toContain("Nao reabra fluxo por transcript");
  });

  it("records invalid objective transitions for audit instead of hiding them", () => {
    const previous = decide(
      baseInput({
        deal: {
          id: dealId,
          tenant_id: tenantId,
          lead_id: leadId,
          location_preference: "Bessa",
          property_type: "apartamento",
        },
        current_message: "manda opcoes",
      }),
    ).decision;

    const { decision } = decide(
      baseInput({
        deal: {
          id: dealId,
          tenant_id: tenantId,
          lead_id: leadId,
          deal_stage: "contrato",
        },
        current_message: "preciso mandar documento?",
      }),
      previous,
    );

    expect(decision.objective_state).toBe("cobrar_documentacao");
    expect(decision.valid_objective_transition).toBe(false);
    expect(decision.decision_payload).toMatchObject({
      objective_governance: {
        valid_transition: false,
      },
    });
  });
});
