import type { SupabaseClient } from "@supabase/supabase-js";
import { recordTimelineEvent } from "@/lib/timeline/events";

type ContractSnapshot = {
  id: string;
  tenant_id: string;
  lead_id?: string | null;
  imovel_id?: string | null;
  project_id?: string | null;
  broker_id?: string | null;
  lead_name?: string | null;
  project_name?: string | null;
  corretor_name?: string | null;
  type?: string | null;
  status?: string | null;
  value?: number | null;
  commission_percentage?: number | null;
  commission_amount?: number | null;
  signed_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type RelatedParty = {
  id: string;
  name?: string | null;
  title?: string | null;
  titulo_comercial?: string | null;
  bairro?: string | null;
  referencia_unica?: string | null;
  id_imovel?: string | null;
  valor?: number | null;
};

export type FinancialSyncResult = {
  commissionId: string | null;
  entries: Array<{
    id: string;
    tipo: string;
    categoria: string;
    descricao: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function formatTitle(property: RelatedParty | null) {
  if (!property) return "";
  return firstText(property.titulo_comercial, property.title, property.referencia_unica, property.id_imovel, property.bairro);
}

function asDateOnly(value: string | null | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function buildSnapshot(contract: ContractSnapshot, property: RelatedParty | null, broker: RelatedParty | null) {
  const metadata = isRecord(contract.metadata) ? contract.metadata : {};
  return {
    source: "contracts.metadata",
    contract_id: contract.id,
    tenant_id: contract.tenant_id,
    lead_id: contract.lead_id ?? null,
    imovel_id: contract.imovel_id ?? contract.project_id ?? null,
    broker_id: contract.broker_id ?? null,
    contract_type: contract.type ?? null,
    contract_status: contract.status ?? null,
    lead_name: contract.lead_name ?? null,
    project_name: contract.project_name ?? formatTitle(property),
    corretor_name: contract.corretor_name ?? broker?.name ?? null,
    signed_at: contract.signed_at ?? null,
    metadata,
  };
}

export async function syncFinancialRecordsForSignedContract({
  supabase,
  tenantId,
  contract,
  property,
  broker,
  createdBy,
}: {
  supabase: SupabaseClient;
  tenantId: string;
  contract: ContractSnapshot;
  property: RelatedParty | null;
  broker: RelatedParty | null;
  createdBy?: string | null;
}): Promise<FinancialSyncResult> {
  const contractType = firstText(contract.type, "venda");
  const contractValue = firstNumber(contract.value, property?.valor);
  const commissionPercentage = firstNumber(contract.commission_percentage, isRecord(contract.metadata) ? contract.metadata.percentual_honorarios : null, 5);
  const commissionAmount = firstNumber(
    contract.commission_amount,
    isRecord(contract.metadata) ? contract.metadata.valor_honorarios : null,
    contractValue > 0 ? (contractValue * commissionPercentage) / 100 : 0,
  );
  const eventDate = asDateOnly(contract.signed_at);
  const snapshot = buildSnapshot(contract, property, broker);
  const isLocacao = contractType === "locacao";
  const saleCategory = isLocacao ? "aluguel" : "venda";
  const brokerId = firstText(contract.broker_id, broker?.id);

  if (!brokerId) {
    throw new Error("Contrato assinado sem broker_id vinculado");
  }

  const commissionStatus = "previsto";
  const saleStatus = isLocacao ? "previsto" : "confirmado";

  const { data: commissionRow, error: commissionError } = await supabase
    .from("comissoes")
    .upsert(
      {
        tenant_id: tenantId,
        contract_id: contract.id,
        broker_id: brokerId,
        percentual: commissionPercentage,
        valor: commissionAmount,
        status: commissionStatus,
        notes: "Gerado automaticamente ao assinar contrato",
      },
      { onConflict: "tenant_id,contract_id,broker_id" },
    )
    .select("id")
    .single();

  if (commissionError) throw commissionError;

  const financePayload = [
    {
      tenant_id: tenantId,
      contract_id: contract.id,
      comissao_id: commissionRow?.id ?? null,
      tipo: "entrada",
      categoria: saleCategory,
      descricao: isLocacao
        ? `Contrato de locacao assinado - ${contract.lead_name ?? "sem contratante"}`
        : `Contrato de venda assinado - ${contract.lead_name ?? "sem comprador"}`,
      valor: contractValue,
      data_evento: eventDate,
      status: saleStatus,
      metadata: {
        ...snapshot,
        kind: "sale",
        recurring: isLocacao
          ? {
              frequency: "mensal",
              installments: [],
              settlement: "repasses futuros",
            }
          : null,
      },
    },
    {
      tenant_id: tenantId,
      contract_id: contract.id,
      comissao_id: commissionRow?.id ?? null,
      tipo: "saida",
      categoria: "comissao",
      descricao: `Comissao pendente - ${contract.corretor_name ?? broker?.name ?? "corretor"}`,
      valor: commissionAmount,
      data_evento: eventDate,
      status: commissionStatus,
      metadata: {
        ...snapshot,
        kind: "commission",
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
      },
    },
  ];

  const { data: financeRows, error: financeError } = await supabase
    .from("financeiro")
    .upsert(financePayload, {
      onConflict: "tenant_id,contract_id,categoria,tipo,data_evento",
    })
    .select("id, tipo, categoria, descricao")
    .order("created_at", { ascending: false });

  if (financeError) throw financeError;

  try {
    await recordTimelineEvent(supabase, {
      tenant_id: tenantId,
      lead_id: contract.lead_id ?? null,
      contract_id: contract.id,
      imovel_id: contract.imovel_id ?? contract.project_id ?? null,
      corretor_id: brokerId,
      event_type: "financial_created",
      metadata: {
        source: "contracts/financial-sync",
        commission_id: commissionRow?.id ?? null,
        finance_entry_ids: (financeRows ?? []).map((row) => row.id),
        contract_type: contractType,
      },
      created_by: createdBy ?? null,
    });
  } catch (timelineError) {
    console.error("[syncFinancialRecordsForSignedContract] financial timeline error:", timelineError);
  }

  try {
    await recordTimelineEvent(supabase, {
      tenant_id: tenantId,
      lead_id: contract.lead_id ?? null,
      contract_id: contract.id,
      imovel_id: contract.imovel_id ?? contract.project_id ?? null,
      corretor_id: brokerId,
      event_type: "commission_created",
      metadata: {
        source: "contracts/financial-sync",
        commission_id: commissionRow?.id ?? null,
        finance_entry_ids: (financeRows ?? []).map((row) => row.id),
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        contract_type: contractType,
      },
      created_by: createdBy ?? null,
    });
  } catch (timelineError) {
    console.error("[syncFinancialRecordsForSignedContract] timeline error:", timelineError);
  }

  return {
    commissionId: commissionRow?.id ?? null,
    entries: financeRows ?? [],
  };
}
