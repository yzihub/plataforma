import type { SupabaseClient } from "@supabase/supabase-js";

export type TimelineEventType =
  | "lead_created"
  | "lead_assigned"
  | "lead_qualified"
  | "lead_lost"
  | "property_presented"
  | "contract_draft"
  | "contract_generated"
  | "contract_sent"
  | "contract_signed"
  | "property_reserved"
  | "property_sold"
  | "financial_created"
  | "commission_created"
  | "payment_confirmed";

export type TimelineEventCategory = "lead" | "property" | "contract" | "financial";

type TimelineEventDefinition = {
  category: TimelineEventCategory;
  title: string;
  description: string;
};

const EVENT_DEFINITIONS: Record<TimelineEventType, TimelineEventDefinition> = {
  lead_created: {
    category: "lead",
    title: "Lead criado",
    description: "Novo lead registrado na operacao.",
  },
  lead_assigned: {
    category: "lead",
    title: "Lead atribuido",
    description: "Lead direcionado para corretor responsavel.",
  },
  lead_qualified: {
    category: "lead",
    title: "Lead qualificado",
    description: "Lead avancado para qualificacao.",
  },
  lead_lost: {
    category: "lead",
    title: "Lead perdido",
    description: "Lead marcado como perdido na operacao.",
  },
  property_presented: {
    category: "property",
    title: "Imovel apresentado",
    description: "Imovel apresentado em visita ou demonstracao.",
  },
  contract_draft: {
    category: "contract",
    title: "Contrato em rascunho",
    description: "Contrato salvo como rascunho.",
  },
  contract_generated: {
    category: "contract",
    title: "Contrato gerado",
    description: "Contrato gerado a partir do fluxo operacional.",
  },
  contract_sent: {
    category: "contract",
    title: "Contrato enviado",
    description: "Contrato enviado para formalizacao.",
  },
  contract_signed: {
    category: "contract",
    title: "Contrato assinado",
    description: "Contrato assinado e consolidado.",
  },
  property_reserved: {
    category: "property",
    title: "Imovel reservado",
    description: "Imovel movido para reserva operacional.",
  },
  property_sold: {
    category: "property",
    title: "Imovel vendido",
    description: "Imovel concluido como vendido.",
  },
  financial_created: {
    category: "financial",
    title: "Lancamento financeiro criado",
    description: "Lancamento financeiro criado automaticamente.",
  },
  commission_created: {
    category: "financial",
    title: "Comissao criada",
    description: "Comissao criada automaticamente.",
  },
  payment_confirmed: {
    category: "financial",
    title: "Pagamento confirmado",
    description: "Pagamento confirmado operacionalmente.",
  },
};

export type TimelineEventInput = {
  tenant_id: string;
  lead_id?: string | null;
  deal_id?: string | null;
  contract_id?: string | null;
  imovel_id?: string | null;
  corretor_id?: string | null;
  event_type: TimelineEventType;
  event_category?: TimelineEventCategory | null;
  title?: string | null;
  description?: string | null;
  event_label?: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
};

export async function recordTimelineEvent(
  supabase: SupabaseClient,
  input: TimelineEventInput,
) {
  const definition = EVENT_DEFINITIONS[input.event_type];
  const eventCategory = input.event_category?.trim() || definition.category;
  const title = input.title?.trim() || definition.title;
  const description = input.description?.trim() || definition.description;
  const eventLabel = input.event_label?.trim() || title;
  const metadata = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
    ? input.metadata
    : {};

  const { error } = await supabase.from("timeline_events").insert({
    tenant_id: input.tenant_id,
    lead_id: input.lead_id ?? null,
    deal_id: input.deal_id ?? null,
    contract_id: input.contract_id ?? null,
    imovel_id: input.imovel_id ?? null,
    corretor_id: input.corretor_id ?? null,
    event_type: input.event_type,
    event_category: eventCategory,
    title,
    description,
    event_label: eventLabel,
    metadata,
    created_by: input.created_by ?? null,
  });

  if (error) {
    throw error;
  }
}
