import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordTimelineEvent } from "@/lib/timeline/events";
import { parseBRLMoney, normalizeContractFinancialMetadata } from "@/lib/contracts/money";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";
const isDev = process.env.NODE_ENV !== "production";

function uuidOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function textOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectOrNull(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isMissingMetadataColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return e.code === "42703" && /metadata/i.test(e.message ?? "");
}

function cleanMetadataPatch(value: Record<string, unknown> | null) {
  if (!value) return null;

  const cleaned = Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      if (typeof item !== "string") return [];
      return [[key, item.trim()]];
    }),
  );

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function devDetail(error: unknown) {
  if (!isDev || !error || typeof error !== "object") return {};
  const e = error as { message?: string; details?: string; hint?: string; code?: string };
  return {
    detail: e.message,
    message: e.details,
    hint: e.hint,
    code: e.code,
  };
}

async function getAuthContext() {
  const isDevBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  const supabase = isDevBypass ? createAdminClient() : await createClient();

  if (isDevBypass) {
    return { supabase, tenantId: DEV_JUREMA_TENANT_ID, userId: null, error: null, status: 200 };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, tenantId: null, userId: null, error: "Nao autenticado", status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    return { supabase, tenantId: null, userId: null, error: "Perfil nao encontrado", status: 401 };
  }

  return { supabase, tenantId: profile.tenant_id as string, userId: user.id, error: null, status: 200 };
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, tenantId, userId, error, status } = await getAuthContext();

    if (error || !tenantId) {
      return NextResponse.json({ error }, { status });
    }

    const body = (await req.json()) as Record<string, unknown>;

    const contractId =
      uuidOrNull(body.contract_id) ??
      uuidOrNull(body.contractId) ??
      uuidOrNull(body.id);
    const leadId =
      uuidOrNull(body.lead_id) ??
      uuidOrNull(body.leadId);
    const imovelId =
      uuidOrNull(body.imovel_id) ??
      uuidOrNull(body.project_id) ??
      uuidOrNull(body.property_id);
    const brokerId = uuidOrNull(body.broker_id);
    const leadName = textOrNull(body.lead_name) ?? textOrNull(body.comprador);
    const projectName = textOrNull(body.project_name) ?? textOrNull(body.imovel);
    const corretorName = textOrNull(body.corretor_name) ?? textOrNull(body.corretor);
    const title =
      textOrNull(body.title) ??
      (leadName ? `Rascunho - ${leadName}` : "Rascunho de contrato");
    const typeValue = textOrNull(body.type) ?? textOrNull(body.modelo) ?? "venda";
    const validTypes = new Set(["venda", "locacao", "servico", "parceria"]);
    const type = validTypes.has(typeValue) ? typeValue : "venda";
    const metadataValue = objectOrNull(body.metadata)?.valor_total;
    const value = parseBRLMoney(body.value ?? body.valor ?? metadataValue);
    const notes = textOrNull(body.notes) ?? textOrNull(body.body);
    const conteudo =
      textOrNull(body.conteudo) ??
      textOrNull(body.content) ??
      textOrNull(body.renderedBody) ??
      notes;
    const statusValue = textOrNull(body.status) ?? "draft";
    const metadataPatch = cleanMetadataPatch(objectOrNull(body.metadata));
    let existingMetadata: Record<string, unknown> = {};

    if (contractId) {
      const { data: existingMetadataRow, error: metadataLoadError } = await supabase
        .from("contracts")
        .select("metadata")
        .eq("id", contractId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (metadataLoadError && !isMissingMetadataColumn(metadataLoadError)) {
        console.error("[POST /api/contracts/draft] metadata load error:", metadataLoadError);
        return NextResponse.json(
          { error: "Erro ao carregar metadata do contrato", ...devDetail(metadataLoadError) },
          { status: 500 },
        );
      }

      if (!metadataLoadError && existingMetadataRow?.metadata && typeof existingMetadataRow.metadata === "object" && !Array.isArray(existingMetadataRow.metadata)) {
        existingMetadata = existingMetadataRow.metadata as Record<string, unknown>;
      }
    }

    if (!leadId) {
      return NextResponse.json({ error: "lead_id e obrigatorio" }, { status: 400 });
    }
    if (!imovelId) {
      return NextResponse.json({ error: "imovel_id e obrigatorio" }, { status: 400 });
    }
    if (!brokerId) {
      return NextResponse.json({ error: "broker_id e obrigatorio" }, { status: 400 });
    }
    if (value <= 0) {
      return NextResponse.json({ error: "value e obrigatorio" }, { status: 400 });
    }

    const commissionPercentage = 5;
    const commissionAmount = parseFloat((value * commissionPercentage / 100).toFixed(2));
    const payload = {
      tenant_id: tenantId,
      lead_id: leadId,
      project_id: imovelId,
      imovel_id: imovelId,
      broker_id: brokerId,
      lead_name: leadName,
      project_name: projectName,
      corretor_name: corretorName,
      title,
      type,
      status: statusValue,
      value,
      commission_percentage: commissionPercentage,
      commission_amount: commissionAmount,
      notes,
      conteudo,
      updated_at: new Date().toISOString(),
      metadata: normalizeContractFinancialMetadata(
        {
          ...existingMetadata,
          ...(metadataPatch ?? {}),
        },
        value,
      ),
    };

    const { tenant_id: _tenantId, ...baseUpdatePayload } = payload;
    void _tenantId;

    let queryPayload: Record<string, unknown> = contractId
      ? { ...baseUpdatePayload, metadata: payload.metadata }
      : payload;

    const runQuery = (payloadToPersist: Record<string, unknown>) => contractId
      ? supabase
          .from("contracts")
          .update(payloadToPersist)
          .eq("id", contractId)
          .eq("tenant_id", tenantId)
          .select()
          .single()
      : supabase
          .from("contracts")
          .insert(payloadToPersist)
          .select()
          .single();

    let { data: contract, error: contractError } = await runQuery(queryPayload);

    if (contractError && isMissingMetadataColumn(contractError) && "metadata" in queryPayload) {
      const { metadata: _metadata, ...fallbackPayload } = queryPayload;
      void _metadata;
      const retry = await runQuery(fallbackPayload);
      contract = retry.data;
      contractError = retry.error;
    }

    if (contractError) {
      console.error("[POST /api/contracts/draft] contract insert error:", contractError);
      return NextResponse.json(
        { error: "Erro ao salvar rascunho", ...devDetail(contractError) },
        { status: 500 },
      );
    }

    try {
      await recordTimelineEvent(supabase, {
        tenant_id: tenantId,
        lead_id: leadId,
        contract_id: contract?.id ?? null,
        imovel_id: imovelId,
        corretor_id: brokerId,
        event_type: "contract_draft",
        metadata: {
          source: "api/contracts/draft",
          status: statusValue,
          type,
          value,
        },
        created_by: userId,
      });
    } catch (timelineError) {
      console.error("[POST /api/contracts/draft] timeline error:", timelineError);
    }

    return NextResponse.json(
      {
        success: true,
        contract,
        data: [contract],
        conteudo_len: contract.conteudo?.length ?? 0,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/contracts/draft] unexpected error:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor", ...devDetail(err) },
      { status: 500 },
    );
  }
}
