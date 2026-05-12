import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

async function getAuthContext() {
  const isDevBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  const supabase = isDevBypass ? createAdminClient() : await createClient();

  if (isDevBypass) {
    return { supabase, tenantId: DEV_JUREMA_TENANT_ID, error: null, status: 200 };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, tenantId: null, error: "Nao autenticado", status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    return { supabase, tenantId: null, error: "Perfil nao encontrado", status: 401 };
  }

  return { supabase, tenantId: profile.tenant_id as string, error: null, status: 200 };
}

export async function GET() {
  try {
    const { supabase, tenantId, error, status } = await getAuthContext();

    if (error || !tenantId) {
      return NextResponse.json({ error }, { status });
    }

    const { data: contracts, error: financeError } = await supabase
      .from("contracts")
      .select("id, tenant_id, lead_id, broker_id, lead_name, imovel_id, project_id, project_name, corretor_name, title, type, status, value, commission_percentage, commission_amount, signed_at, metadata, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (financeError) {
      console.error("[GET /api/financeiro] query error:", financeError);
      return NextResponse.json({ error: "Erro ao buscar financeiro" }, { status: 500 });
    }

    const brokerIds = Array.from(new Set((contracts ?? []).map((contract) => contract.broker_id).filter(Boolean)));

    const brokersRes = await (
      brokerIds.length > 0
        ? supabase.from("corretores").select("id, name").eq("tenant_id", tenantId).in("id", brokerIds)
        : Promise.resolve({ data: [] })
    );

    const brokerById = new Map((brokersRes.data ?? []).map((broker) => [broker.id, broker.name]));

    const payload = (contracts ?? []).flatMap((contract) => {
      const valor = Number(contract.value) || 0;
      const percentage = Number(contract.commission_percentage) || 5;
      const commission = Number(contract.commission_amount) || (valor > 0 ? (valor * percentage) / 100 : 0);
      const dataEvento = contract.signed_at ?? contract.updated_at ?? contract.created_at;
      const status = contract.status === "signed" || contract.status === "assinado" ? "confirmado" : "previsto";
      const brokerName = contract.broker_id ? brokerById.get(contract.broker_id) ?? null : contract.corretor_name ?? null;
      const base = {
        tenant_id: contract.tenant_id,
        comissao_id: null,
        contract_id: contract.id,
        data_evento: dataEvento,
        status,
        metadata: contract.metadata,
        created_at: contract.created_at,
        updated_at: contract.updated_at,
        contract,
        broker_name: brokerName,
      };

      return [
        {
          ...base,
          id: `${contract.id}:entrada`,
          tipo: "entrada",
          categoria: "contrato",
          descricao: contract.title ?? contract.project_name ?? "Contrato",
          valor,
        },
        {
          ...base,
          id: `${contract.id}:comissao`,
          tipo: "saida",
          categoria: "comissao",
          descricao: `Comissao - ${brokerName ?? contract.corretor_name ?? "corretor"}`,
          valor: commission,
        },
      ];
    });

    return NextResponse.json({ data: payload }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/financeiro] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
