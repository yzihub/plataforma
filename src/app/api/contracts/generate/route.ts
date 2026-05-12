import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncPropertyStatusForContract } from "@/lib/contracts/property-status";
import { recordTimelineEvent } from "@/lib/timeline/events";
import { normalizeContractFinancialMetadata, parseBRLMoney } from "@/lib/contracts/money";

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

function devErrorDetail(error: unknown) {
  if (!isDev || !error || typeof error !== "object") return {};

  const supabaseError = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return {
    detail: supabaseError.message,
    message: supabaseError.details,
    hint: supabaseError.hint,
    code: supabaseError.code,
  };
}

export async function POST(req: NextRequest) {
  try {
    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    const supabase = isDevBypass ? createAdminClient() : await createClient();

    let tenantId: string;
    let createdBy: string | null = null;

    if (isDevBypass) {
      tenantId = DEV_JUREMA_TENANT_ID;
    } else {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
      }
      createdBy = user.id;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 401 });
      }

      tenantId = profile.tenant_id as string;
    }

    const body = await req.json() as {
      lead_id?: string | null;
      imovel_id?: string | null;
      project_id?: string | null;
      property_id?: string | null;
      broker_id?: string | null;
      modelo?: string | null;
      title?: string | null;
      type?: string | null;
      value?: number | string | null;
      lead_name?: string | null;
      project_name?: string | null;
      corretor_name?: string | null;
      comprador?: string | null;
      vendedor?: string | null;
      imovel?: string | null;
      corretor?: string | null;
      valor?: number | string | null;
      forma_pagamento?: string | null;
      comissao?: number | string | null;
      observacoes?: string | null;
      conteudo?: string | null;
      content?: string | null;
      renderedBody?: string | null;
      metadata?: Record<string, unknown> | null;
      canais?: { whatsapp: boolean; email: boolean };
    };

    const modelo = textOrNull(body.modelo);
    const leadId = uuidOrNull(body.lead_id);
    const imovelId =
      uuidOrNull(body.imovel_id) ??
      uuidOrNull(body.project_id) ??
      uuidOrNull(body.property_id);
    const brokerId = uuidOrNull(body.broker_id);
    const leadName = textOrNull(body.lead_name) ?? textOrNull(body.comprador);
    const projectName = textOrNull(body.project_name) ?? textOrNull(body.imovel);
    const corretorName = textOrNull(body.corretor_name) ?? textOrNull(body.corretor);
    const title = textOrNull(body.title) ?? (modelo ? `${modelo} - ${leadName ?? "sem comprador"}` : null);
    const metadataValue = objectOrNull(body.metadata)?.valor_total;
    const valor = parseBRLMoney(body.value ?? body.valor ?? metadataValue);
    const comissao = body.comissao == null ? null : parseBRLMoney(body.comissao);
    const conteudo =
      textOrNull(body.conteudo) ??
      textOrNull(body.content) ??
      textOrNull(body.renderedBody) ??
      textOrNull(body.observacoes);
    const validTypes = new Set(["venda", "locacao", "servico", "parceria"]);
    const type = body.type && validTypes.has(body.type) ? body.type : "venda";

    if (!modelo) {
      return NextResponse.json({ error: "Campo 'modelo' e obrigatorio" }, { status: 400 });
    }
    if (!leadId) {
      return NextResponse.json({ error: "Lead e obrigatorio" }, { status: 400 });
    }
    if (!imovelId) {
      return NextResponse.json({ error: "Imovel e obrigatorio" }, { status: 400 });
    }
    if (!brokerId) {
      return NextResponse.json({ error: "Corretor e obrigatorio" }, { status: 400 });
    }
    if (valor <= 0) {
      return NextResponse.json({ error: "Valor e obrigatorio" }, { status: 400 });
    }

    const commissionPercentage = 5;
    const commissionAmount = parseFloat((valor * commissionPercentage / 100).toFixed(2));

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
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
        status: "sent",
        value: valor,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        notes: body.observacoes ?? null,
        conteudo,
        metadata: normalizeContractFinancialMetadata(null, valor),
      })
      .select("id, conteudo")
      .single();

    if (contractError) {
      console.error("[POST /api/contracts/generate] contract insert error:", contractError);
      return NextResponse.json(
        { error: "Erro ao registrar contrato", ...devErrorDetail(contractError) },
        { status: 500 },
      );
    }

    try {
      await recordTimelineEvent(supabase, {
        tenant_id: tenantId,
        lead_id: leadId,
        contract_id: contract.id,
        imovel_id: imovelId,
        corretor_id: brokerId,
        event_type: "contract_sent",
        metadata: {
          source: "api/contracts/generate",
          modelo,
          type,
          value: valor,
        },
        created_by: createdBy,
      });
    } catch (timelineError) {
      console.error("[POST /api/contracts/generate] timeline error:", timelineError);
    }

    try {
      await syncPropertyStatusForContract({
        supabase,
        tenantId,
        propertyId: imovelId,
        contractStatus: "sent",
      });
    } catch (propertyStatusError) {
      console.error("[POST /api/contracts/generate] property status sync error:", propertyStatusError);
      return NextResponse.json(
        { error: "Contrato salvo, mas nao foi possivel atualizar o status operacional do imovel" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Contrato salvo",
        contract_id: contract.id,
        conteudo_len: contract.conteudo?.length ?? 0,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[POST /api/contracts/generate] unexpected error:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor", ...devErrorDetail(err) },
      { status: 500 },
    );
  }
}
