import type { CanonicalKernelInput } from "@/lib/ju-runtime/cognitive-kernel-contracts";

const tenantId = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

function base(overrides: Partial<CanonicalKernelInput>): CanonicalKernelInput {
  return {
    tenant_id: tenantId,
    lead: {
      id: "lead-001",
      tenant_id: tenantId,
      name: "Cliente",
      status: "contacted",
      ai_status: "ativo",
    },
    deal: {
      id: "deal-001",
    },
    conversation: {
      id: "conversation-001",
      status: "open",
      ai_paused: false,
    },
    recent_messages: [],
    mensagemCliente: "",
    ...overrides,
  };
}

export const canonicalParityFixtures = {
  lead_frio: base({
    lead: { id: "lead-frio", tenant_id: tenantId, status: "new" },
    mensagemCliente: "Oi, estou começando a procurar algo em João Pessoa",
  }),
  lead_quente: base({
    deal: { id: "deal-quente", intent: "morar", location_preference: "Bessa", property_type: "apartamento", budget_max: 750000 },
    mensagemCliente: "Me manda opções no Bessa até 750 mil",
  }),
  praia: base({
    deal: { id: "deal-praia", intent: "morar", property_type: "apartamento" },
    mensagemCliente: "Quero um apartamento perto da praia no Cabo Branco",
  }),
  fgts: base({
    deal: { id: "deal-fgts", location_preference: "Bessa", property_type: "apartamento" },
    mensagemCliente: "Tenho FGTS e queria opções no Bessa",
  }),
  financiamento: base({
    deal: { id: "deal-financiamento", location_preference: "Manaíra", property_type: "apartamento" },
    mensagemCliente: "Dá para financiar algo em Manaíra?",
  }),
  casal: base({
    deal: { id: "deal-casal", intent: "morar", location_preference: "Bessa", property_type: "apartamento", decision_maker: "casal" },
    mensagemCliente: "Vou falar com minha esposa antes de decidir",
    recent_messages: [
      { direction: "outbound", sender_type: "agent", content: "Esse fez sentido: https://juremabksimoveis.com.br/imoveis/1842/" },
    ],
  }),
  follow_up: base({
    event_type: "followup_resume",
    internal_behavioral_event: { event_type: "followup_resume", followup_type: "momentum_recovery" },
    operational_context: { followup_enabled: true, funnel_stage: "followup", objective: "retomar_interesse", preferred_regions: ["Bessa"] },
    runtime_memory: { next_best_action: "retomar_contexto_consultivo" },
    mensagemCliente: "[EVENTO_INTERNO_FOLLOWUP]\nRetome a conversa de forma curta e natural.",
    recent_messages: [
      { direction: "inbound", sender_type: "lead", content: "Vou pensar com calma" },
      { direction: "outbound", sender_type: "agent", content: "Claro, fico por aqui." },
    ],
  }),
  revisit_inventory: base({
    deal: { id: "deal-revisit", intent: "morar", location_preference: "Bessa", property_type: "apartamento" },
    mensagemCliente: "Manda de novo aquele imóvel que você falou",
    recent_messages: [
      { direction: "outbound", sender_type: "agent", content: "Opção: https://juremabksimoveis.com.br/imoveis/1842/" },
    ],
  }),
  alto_padrao: base({
    deal: { id: "deal-alto", intent: "morar", location_preference: "Altiplano", property_type: "cobertura", budget_max: 2500000 },
    mensagemCliente: "Tem cobertura de alto padrão no Altiplano?",
  }),
  investidor: base({
    lead: { id: "lead-investidor", tenant_id: tenantId, status: "contacted", ai_last_intent: "investir" },
    deal: { id: "deal-investidor", intent: "investir", location_preference: "Cabo Branco", property_type: "flat" },
    mensagemCliente: "Quero opções para investimento e rentabilidade em Cabo Branco",
  }),
  visita_marcada: base({
    deal: { id: "deal-visita", intent: "morar", location_preference: "Bessa", property_type: "apartamento" },
    mensagemCliente: "Quero marcar uma visita para conhecer pessoalmente",
  }),
  inventory_fatigue: base({
    deal: { id: "deal-fatigue", intent: "morar", location_preference: "Bessa", property_type: "apartamento" },
    runtime_memory: { properties_sent_count: 6, inventory_fatigue: true },
    mensagemCliente: "Tem mais opções no Bessa?",
    recent_messages: Array.from({ length: 6 }, (_, index) => ({
      direction: "outbound",
      sender_type: "agent",
      content: `Opção ${index}: https://juremabksimoveis.com.br/imoveis/18${index}/`,
    })),
  }),
} satisfies Record<string, CanonicalKernelInput>;
