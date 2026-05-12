import type { Lead } from "@/lib/crm/types";

export type OperationalFunnelStageId =
  | "descoberta"
  | "qualificacao"
  | "interesse_validado"
  | "match_imobiliario"
  | "visita"
  | "negociacao"
  | "juridico"
  | "fechado"
  | "pos_venda";

export type PropertyMatchStatus =
  | "imovel_enviado"
  | "interesse"
  | "visita_marcada"
  | "visita_realizada"
  | "negociacao"
  | "proposta"
  | "contrato"
  | "fechado"
  | "perdido";

export type OperationalFunnelStage = {
  id: OperationalFunnelStageId;
  title: string;
  description: string;
  color: string;
};

export type OperationalTimelineEvent = {
  lead_id: string | null;
  contract_id: string | null;
  imovel_id: string | null;
  corretor_id: string | null;
  event_type: string;
  event_category: string | null;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type OperationalAppointment = {
  lead_id: string | null;
  broker_id: string | null;
  appointment_type: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
};

export type OperationalDeal = {
  id: string;
  lead_id: string | null;
  deal_stage: string | null;
  qualification_status: string | null;
  broker_status: string | null;
  lead_score: number | null;
  budget_max: number | null;
  bedrooms: string | null;
  property_type: string | null;
  location_preference: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
};

export type OperationalContract = {
  id: string;
  lead_id: string | null;
  imovel_id: string | null;
  project_id: string | null;
  broker_id: string | null;
  status: string | null;
  type: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type OperationalImovel = {
  id: string;
  titulo_comercial: string | null;
  title: string | null;
  bairro: string | null;
  referencia_unica: string | null;
  id_imovel: string | null;
  status_operacional: string | null;
  status_publicacao: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

export type OperationalBroker = {
  id: string;
  name: string | null;
  full_name?: string | null;
};

export type OperationalKanbanCard = {
  lead: Lead;
  stage_id: OperationalFunnelStageId;
  property_match_status: PropertyMatchStatus;
  broker_name: string | null;
  property_label: string | null;
  latest_event_title: string | null;
  latest_event_description: string | null;
  latest_event_type: string | null;
  latest_event_at: string | null;
  follow_up_label: string | null;
  badges: string[];
  signals: string[];
  is_hot: boolean;
  is_lost: boolean;
  has_contract: boolean;
  has_visit: boolean;
};

export type OperationalKanbanBoard = {
  stages: OperationalFunnelStage[];
  cards: OperationalKanbanCard[];
  counts: Record<OperationalFunnelStageId, number>;
  totals: {
    total: number;
    hot: number;
    with_visit: number;
    juridico: number;
    fechados: number;
    pos_venda: number;
    overdue_48h: number;
    lost: number;
  };
};

const STAGES: OperationalFunnelStage[] = [
  {
    id: "descoberta",
    title: "Descoberta",
    description: "Triagem inicial e leitura do contexto.",
    color: "bg-slate-500",
  },
  {
    id: "qualificacao",
    title: "Qualificacao",
    description: "Leitura comercial e prioreza da oportunidade.",
    color: "bg-blue-500",
  },
  {
    id: "interesse_validado",
    title: "Interesse Validado",
    description: "Sinal claro de aderencia ao imovel.",
    color: "bg-cyan-500",
  },
  {
    id: "match_imobiliario",
    title: "Match Imobiliario",
    description: "Imovel ja conectado ao lead.",
    color: "bg-indigo-500",
  },
  {
    id: "visita",
    title: "Visita",
    description: "Visita marcada ou realizada.",
    color: "bg-violet-500",
  },
  {
    id: "negociacao",
    title: "Negociacao",
    description: "Ajustes, proposta e reserva operacional.",
    color: "bg-amber-500",
  },
  {
    id: "juridico",
    title: "Juridico",
    description: "Contrato em andamento ou enviado.",
    color: "bg-fuchsia-500",
  },
  {
    id: "fechado",
    title: "Fechado",
    description: "Contrato assinado e negocio concluido.",
    color: "bg-emerald-500",
  },
  {
    id: "pos_venda",
    title: "Pos-venda",
    description: "Acompanhamento apos a conversao.",
    color: "bg-slate-400",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numberOrZero(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function boolFromRecord(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) return false;
  return keys.some((key) => {
    const value = record[key];
    return value === true || value === "true" || value === 1 || value === "1";
  });
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hoursSince(iso: string | null | undefined) {
  const date = parseDate(iso);
  if (!date) return null;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

function latestByLead<T>(
  items: T[],
  getLeadId: (item: T) => string | null,
  getTimestamp: (item: T) => string | null | undefined,
) {
  const map = new Map<string, T>();
  for (const item of items) {
    const leadId = getLeadId(item);
    if (!leadId) continue;
    const current = map.get(leadId);
    const currentTime = current ? new Date(getTimestamp(current) ?? 0).getTime() : -1;
    const nextTime = new Date(getTimestamp(item) ?? 0).getTime();
    if (!current || nextTime > currentTime) {
      map.set(leadId, item);
    }
  }
  return map;
}

function selectPropertyLabel(property: OperationalImovel | null | undefined) {
  if (!property) return null;
  return text(property.titulo_comercial, property.title, property.referencia_unica, property.id_imovel, property.bairro);
}

function selectBrokerName(broker: OperationalBroker | null | undefined, fallback?: string | null) {
  return text(broker?.name, broker?.full_name, fallback);
}

function contractIsSigned(contract: OperationalContract | null | undefined) {
  if (!contract) return false;
  const status = text(contract.status).toLowerCase();
  return status === "signed" || status === "assinado";
}

function contractIsSent(contract: OperationalContract | null | undefined) {
  if (!contract) return false;
  const status = text(contract.status).toLowerCase();
  return status === "sent" || status === "enviado";
}

function contractIsDraft(contract: OperationalContract | null | undefined) {
  if (!contract) return false;
  const status = text(contract.status).toLowerCase();
  return status === "draft" || status === "rascunho";
}

function appointmentIsScheduled(appointment: OperationalAppointment | null | undefined) {
  if (!appointment) return false;
  const status = text(appointment.status).toLowerCase();
  if (["cancelado", "cancelled", "canceled"].includes(status)) return false;
  if (["scheduled", "confirmado", "confirmed", "agendado", "marcado"].includes(status)) return true;
  const startAt = parseDate(appointment.start_at);
  return !!startAt && startAt.getTime() >= Date.now();
}

function appointmentIsRealized(appointment: OperationalAppointment | null | undefined) {
  if (!appointment) return false;
  const status = text(appointment.status).toLowerCase();
  return ["done", "completed", "realizada", "concluida", "concluída"].includes(status);
}

function hasPropertyReference(
  lead: Lead,
  deal: OperationalDeal | null | undefined,
  contract: OperationalContract | null | undefined,
  appointment: OperationalAppointment | null | undefined,
) {
  const leadMetadata = isRecord(lead.metadata) ? lead.metadata : {};
  const dealMetadata = isRecord(deal?.metadata) ? deal.metadata : {};
  const appointmentMetadata = isRecord(appointment?.metadata) ? appointment.metadata : {};
  return Boolean(
    text(leadMetadata.imovel_ref, leadMetadata.imovel_id, dealMetadata.imovel_ref, dealMetadata.imovel_id, appointmentMetadata.imovel_ref, contract?.imovel_id, contract?.project_id),
  );
}

function getPropertyMatchStatus(
  lead: Lead,
  deal: OperationalDeal | null | undefined,
  contract: OperationalContract | null | undefined,
  appointment: OperationalAppointment | null | undefined,
  latestEventType: string | null,
  isLost: boolean,
): PropertyMatchStatus {
  if (isLost) return "perdido";

  if (contractIsSigned(contract) || latestEventType === "contract_signed" || latestEventType === "property_sold") {
    return "fechado";
  }

  if (contractIsSent(contract) || latestEventType === "contract_sent" || contractIsDraft(contract) || latestEventType === "contract_draft") {
    return "contrato";
  }

  if (latestEventType === "property_reserved" || text(deal?.deal_stage).toLowerCase().includes("negoci") || text(deal?.deal_stage).toLowerCase().includes("proposta")) {
    return text(deal?.deal_stage).toLowerCase().includes("proposta") ? "proposta" : "negociacao";
  }

  if (appointmentIsRealized(appointment) || latestEventType === "property_presented") {
    return "visita_realizada";
  }

  if (appointmentIsScheduled(appointment) || text(lead.metadata?.status_agendamento).toLowerCase() === "confirmado") {
    return "visita_marcada";
  }

  if (hasPropertyReference(lead, deal, contract, appointment)) {
    const leadMetadata = isRecord(lead.metadata) ? lead.metadata : {};
    if (boolFromRecord(leadMetadata, ["interesse_validado", "interesse_confirmado"])) {
      return "interesse";
    }
    return "imovel_enviado";
  }

  return "interesse";
}

function resolveOperationalStage(
  lead: Lead,
  deal: OperationalDeal | null | undefined,
  contract: OperationalContract | null | undefined,
  appointment: OperationalAppointment | null | undefined,
  latestEventType: string | null,
  propertyMatchStatus: PropertyMatchStatus,
  isLost: boolean,
): OperationalFunnelStageId {
  if (isLost) return "descoberta";

  const stageText = text(deal?.deal_stage).toLowerCase();
  const qualificationText = text(deal?.qualification_status).toLowerCase();
  const leadMeta = isRecord(lead.metadata) ? lead.metadata : {};
  const hasPostSaleFlag = boolFromRecord(leadMeta, ["pos_venda", "pos_venda_ativo", "pos_venda_ativo"]);

  if (latestEventType === "payment_confirmed" || hasPostSaleFlag) return "pos_venda";
  if (contractIsSigned(contract) || latestEventType === "contract_signed" || latestEventType === "property_sold") return "fechado";
  if (contractIsSent(contract) || latestEventType === "contract_sent" || contractIsDraft(contract) || latestEventType === "contract_draft") return "juridico";
  if (appointmentIsRealized(appointment) || latestEventType === "property_presented" || appointmentIsScheduled(appointment)) return "visita";
  if (propertyMatchStatus === "negociacao" || propertyMatchStatus === "proposta" || latestEventType === "property_reserved") return "negociacao";
  if (propertyMatchStatus === "imovel_enviado" || propertyMatchStatus === "interesse") {
    if (hasPropertyReference(lead, deal, contract, appointment)) return "match_imobiliario";
  }
  if (text(lead.status).toLowerCase() === "qualified" || latestEventType === "lead_qualified" || qualificationText.includes("quente") || numberOrZero(lead.score) >= 70) {
    return hasPropertyReference(lead, deal, contract, appointment) ? "match_imobiliario" : "interesse_validado";
  }
  if (text(lead.status).toLowerCase() === "contacted" || lead.assigned_to || lead.corretor_id || stageText) {
    return "qualificacao";
  }

  return "descoberta";
}

function formatRelativeAge(hours?: number | null) {
  if (hours == null) return "";
  if (hours < 24) return "hoje";
  if (hours < 48) return "1d";
  if (hours < 72) return "2d";
  return `${Math.round(hours / 24)}d`;
}

function buildBadgeList({
  lead,
  latestEventType,
  latestEventAt,
  appointment,
  contract,
  propertyMatchStatus,
}: {
  lead: Lead;
  latestEventType: string | null;
  latestEventAt: string | null;
  appointment: OperationalAppointment | null;
  contract: OperationalContract | null;
  propertyMatchStatus: PropertyMatchStatus;
}) {
  const badges: string[] = [];
  const leadMeta = isRecord(lead.metadata) ? lead.metadata : {};
  const score = numberOrZero(lead.score);
  const leadAi = lead as Lead & { ai_temperature?: string | null; ai_status?: string | null };
  const temperature = text(leadAi.ai_temperature, leadAi.ai_status).toLowerCase();
  const looseStage = resolveLooseStageFromStatus(lead.status);

  if (score >= 80 || temperature.includes("quente")) badges.push("🔥 lead quente");
  if (appointmentIsScheduled(appointment)) badges.push("📅 visita marcada");
  if (appointmentIsRealized(appointment)) badges.push("👀 revisitou imóvel");
  if (boolFromRecord(leadMeta, ["financiamento_aprovado", "credito_aprovado", "financiamento_status_aprovado"])) badges.push("🏦 financiamento aprovado");
  if (contractIsSent(contract) || latestEventType === "contract_sent") badges.push("📄 contrato enviado");
  if (propertyMatchStatus === "negociacao" || propertyMatchStatus === "proposta") badges.push("📊 negociação ativa");

  const overdue = hoursSince(latestEventAt ?? lead.last_action_at);
  if (overdue != null && overdue >= 48 && looseStage !== "fechado" && looseStage !== "pos_venda") {
    badges.push("⏳ sem resposta 48h");
  }

  return badges.slice(0, 4);
}

function resolveLooseStageFromStatus(status: string | null | undefined): OperationalFunnelStageId | null {
  const normalized = text(status).toLowerCase();
  if (normalized === "won") return "fechado";
  if (normalized === "lost") return "descoberta";
  return null;
}

function buildSignals({
  lead,
  deal,
  appointment,
  latestEventTitle,
  latestEventDescription,
  propertyMatchStatus,
}: {
  lead: Lead;
  deal: OperationalDeal | null;
  appointment: OperationalAppointment | null;
  latestEventTitle: string | null;
  latestEventDescription: string | null;
  propertyMatchStatus: PropertyMatchStatus;
}) {
  const signals: string[] = [];
  const leadMeta = isRecord(lead.metadata) ? lead.metadata : {};

  if (latestEventTitle) signals.push(latestEventTitle);
  if (latestEventDescription && latestEventDescription !== latestEventTitle) signals.push(latestEventDescription);
  if (deal?.lead_score != null) signals.push(`score ${deal.lead_score}`);
  if (appointment?.title) signals.push(appointment.title);
  if (propertyMatchStatus === "visita_marcada") signals.push("Visita agendada");
  if (propertyMatchStatus === "visita_realizada") signals.push("Visita realizada");
  if (boolFromRecord(leadMeta, ["financiamento_aprovado", "credito_aprovado", "financiamento_status_aprovado"])) signals.push("Financiamento aprovado");

  return signals.slice(0, 3);
}

export function buildOperationalKanbanBoard({
  leads,
  brokers,
  deals,
  contracts,
  appointments,
  timelineEvents,
  imoveis,
}: {
  leads: Lead[];
  brokers: OperationalBroker[];
  deals: OperationalDeal[];
  contracts: OperationalContract[];
  appointments: OperationalAppointment[];
  timelineEvents: OperationalTimelineEvent[];
  imoveis: OperationalImovel[];
}): OperationalKanbanBoard {
  const brokerMap = new Map(brokers.map((broker) => [broker.id, broker]));
  const latestDealByLead = latestByLead(deals, (item) => item.lead_id, (item) => item.updated_at ?? item.created_at);
  const latestContractByLead = latestByLead(contracts, (item) => item.lead_id, (item) => item.updated_at ?? item.signed_at ?? item.created_at);
  const latestAppointmentByLead = latestByLead(appointments, (item) => item.lead_id, (item) => item.updated_at ?? item.start_at ?? item.created_at);
  const latestEventByLead = latestByLead(timelineEvents, (item) => item.lead_id, (item) => item.created_at);
  const propertyMap = new Map(imoveis.map((imovel) => [imovel.id, imovel]));

  const cards = leads.map((lead) => {
    const deal = latestDealByLead.get(lead.id) ?? null;
    const contract = latestContractByLead.get(lead.id) ?? null;
    const appointment = latestAppointmentByLead.get(lead.id) ?? null;
    const latestEvent = latestEventByLead.get(lead.id) ?? null;
    const latestEventType = latestEvent?.event_type ?? null;

    const brokerId = text(lead.assigned_to, lead.corretor_id);
    const broker = brokerMap.get(brokerId) ?? null;
    const propertyId = text(
      lead.metadata?.imovel_id,
      lead.metadata?.imovel_ref,
      deal?.metadata?.imovel_id,
      deal?.metadata?.imovel_ref,
      contract?.imovel_id,
      contract?.project_id,
      latestEvent?.imovel_id,
    );
    const property = propertyId ? propertyMap.get(propertyId) ?? null : null;
    const propertyLabel = selectPropertyLabel(property) || text(deal?.location_preference, lead.metadata?.regiao_interesse, lead.metadata?.bairro_interesse);

    const propertyMatchStatus = getPropertyMatchStatus(lead, deal, contract, appointment, latestEventType, text(lead.status).toLowerCase() === "lost");
    const stage_id = resolveOperationalStage(lead, deal, contract, appointment, latestEventType, propertyMatchStatus, text(lead.status).toLowerCase() === "lost");
    const isLost = text(lead.status).toLowerCase() === "lost" || propertyMatchStatus === "perdido";
    const hasContract = contractIsDraft(contract) || contractIsSent(contract) || contractIsSigned(contract) || ["contract_draft", "contract_sent", "contract_signed"].includes(latestEventType ?? "");
    const hasVisit = appointmentIsScheduled(appointment) || appointmentIsRealized(appointment) || latestEventType === "property_presented";
    const latestEventTitle = text(latestEvent?.title, latestEvent?.event_type);
    const latestEventDescription = text(latestEvent?.description);
    const latestEventAt = latestEvent?.created_at ?? null;

  const card: OperationalKanbanCard = {
      lead,
      stage_id,
      property_match_status: propertyMatchStatus,
      broker_name: selectBrokerName(broker, text(lead.assigned_to, lead.corretor_id)),
      property_label: propertyLabel || null,
      latest_event_title: latestEventTitle || null,
      latest_event_description: latestEventDescription || null,
      latest_event_type: latestEventType,
      latest_event_at: latestEventAt,
      follow_up_label:
        hoursSince(latestEventAt ?? lead.last_action_at) != null
          ? formatRelativeAge(hoursSince(latestEventAt ?? lead.last_action_at))
          : null,
      badges: buildBadgeList({
        lead,
        latestEventType,
        latestEventAt,
        appointment,
        contract,
        propertyMatchStatus,
      }),
      signals: buildSignals({
        lead,
        deal,
        appointment,
        latestEventTitle: latestEventTitle || null,
        latestEventDescription: latestEventDescription || null,
        propertyMatchStatus,
      }),
      is_hot: numberOrZero(lead.score) >= 80 || text((lead as Lead & { ai_temperature?: string | null; ai_status?: string | null }).ai_temperature, (lead as Lead & { ai_temperature?: string | null; ai_status?: string | null }).ai_status).toLowerCase().includes("quente"),
      is_lost: text(lead.status).toLowerCase() === "lost" || propertyMatchStatus === "perdido",
      has_contract: hasContract,
      has_visit: hasVisit,
    };

    return card;
  });

  const counts: Record<OperationalFunnelStageId, number> = {
    descoberta: 0,
    qualificacao: 0,
    interesse_validado: 0,
    match_imobiliario: 0,
    visita: 0,
    negociacao: 0,
    juridico: 0,
    fechado: 0,
    pos_venda: 0,
  };

  const visibleCards = cards.filter((card) => {
    if (card.is_lost) return false;
    counts[card.stage_id] += 1;
    return true;
  });

  const totals = {
    total: visibleCards.length,
    hot: visibleCards.filter((card) => card.is_hot).length,
    with_visit: visibleCards.filter((card) => card.has_visit).length,
    juridico: visibleCards.filter((card) => card.stage_id === "juridico").length,
    fechados: visibleCards.filter((card) => card.stage_id === "fechado").length,
    pos_venda: visibleCards.filter((card) => card.stage_id === "pos_venda").length,
    overdue_48h: visibleCards.filter((card) => card.badges.includes("⏳ sem resposta 48h")).length,
    lost: cards.filter((card) => card.is_lost).length,
  };

  return {
    stages: STAGES,
    cards: visibleCards,
    counts,
    totals,
  };
}
