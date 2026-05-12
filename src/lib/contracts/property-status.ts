import type { SupabaseClient } from "@supabase/supabase-js";

type ContractCommercialStatus = "draft" | "sent" | "signed" | string | null | undefined;

type SyncPropertyStatusParams = {
  supabase: SupabaseClient;
  tenantId: string;
  propertyId: string | null | undefined;
  contractStatus: ContractCommercialStatus;
};

function normalizeContractStatus(status: ContractCommercialStatus) {
  if (status === "enviado") return "sent";
  if (status === "assinado") return "signed";
  return status;
}

export type PropertyStatusSyncResult = {
  skipped: boolean;
  transition: "none" | "sent_to_em_negociacao" | "signed_to_vendido";
  property?: {
    id: string;
    status_operacional: string | null;
    status_publicacao: string | null;
  } | null;
};

export function contractPropertyId(contract: {
  imovel_id?: string | null;
  project_id?: string | null;
}) {
  return contract.imovel_id ?? contract.project_id ?? null;
}

export async function syncPropertyStatusForContract({
  supabase,
  tenantId,
  propertyId,
  contractStatus,
}: SyncPropertyStatusParams): Promise<PropertyStatusSyncResult> {
  if (!propertyId) {
    return { skipped: true, transition: "none", property: null };
  }

  const normalizedStatus = normalizeContractStatus(contractStatus);
  const now = new Date().toISOString();

  if (normalizedStatus === "sent") {
    const { data, error } = await supabase
      .from("imoveis")
      .update({
        status_operacional: "em_negociacao",
        updated_at: now,
      })
      .eq("id", propertyId)
      .eq("tenant_id", tenantId)
      .eq("status_operacional", "disponivel")
      .select("id, status_operacional, status_publicacao")
      .maybeSingle();

    if (error) throw error;

    return {
      skipped: !data,
      transition: "sent_to_em_negociacao",
      property: data ?? null,
    };
  }

  if (normalizedStatus === "signed") {
    const { data, error } = await supabase
      .from("imoveis")
      .update({
        status_operacional: "vendido",
        status_publicacao: "Despublicado",
        updated_at: now,
      })
      .eq("id", propertyId)
      .eq("tenant_id", tenantId)
      .select("id, status_operacional, status_publicacao")
      .maybeSingle();

    if (error) throw error;

    return {
      skipped: !data,
      transition: "signed_to_vendido",
      property: data ?? null,
    };
  }

  return { skipped: true, transition: "none", property: null };
}
