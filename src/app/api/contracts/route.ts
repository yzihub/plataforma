import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildN8nEnvelope, toN8nContract } from "@/types/n8n-payloads";
import { normalizeContractFinancialMetadata, parseBRLMoney } from "@/lib/contracts/money";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// ─── GET /api/contracts ───────────────────────────────────────────────────────
// Retorna todos os contratos do tenant autenticado, ordenados por updated_at desc

export async function GET() {
  try {
    // DEV_BYPASS: skip auth in development — consistent with proxy.ts and TenantContext
    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    const supabase = isDevBypass ? createAdminClient() : await createClient();

    let tenantId: string;

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

    // Buscar contratos do tenant
    const { data: contracts, error: contractsError } = await supabase
      .from("contracts")
      .select("id, tenant_id, lead_id, broker_id, lead_name, project_id, imovel_id, project_name, corretor_name, title, type, status, value, commission_percentage, commission_amount, signed_at, expires_at, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false });

    if (contractsError) {
      console.error("[GET /api/contracts] query error:", contractsError);
      return NextResponse.json({ error: "Erro ao buscar contratos" }, { status: 500 });
    }

    const rows = contracts ?? [];
    const leadIds = Array.from(new Set(rows.map((c) => c.lead_id).filter(Boolean)));
    const imovelIds = Array.from(new Set(rows.map((c) => c.imovel_id ?? c.project_id).filter(Boolean)));
    const brokerIds = Array.from(new Set(rows.map((c) => c.broker_id).filter(Boolean)));

    const [leadsRes, imoveisRes, brokersRes] = await Promise.all([
      leadIds.length > 0
        ? supabase.from("leads").select("id, name").eq("tenant_id", tenantId).in("id", leadIds)
        : Promise.resolve({ data: [] }),
      imovelIds.length > 0
        ? supabase.from("imoveis").select("id, titulo_comercial, bairro, referencia_unica, id_imovel").eq("tenant_id", tenantId).in("id", imovelIds)
        : Promise.resolve({ data: [] }),
      brokerIds.length > 0
        ? supabase.from("corretores").select("id, name").eq("tenant_id", tenantId).in("id", brokerIds)
        : Promise.resolve({ data: [] }),
    ]);

    const leadById = new Map((leadsRes.data ?? []).map((lead) => [lead.id, lead.name]));
    const imovelById = new Map((imoveisRes.data ?? []).map((imovel) => [
      imovel.id,
      [imovel.titulo_comercial, imovel.referencia_unica ?? imovel.id_imovel, imovel.bairro].filter(Boolean).join(" · "),
    ]));
    const brokerById = new Map((brokersRes.data ?? []).map((broker) => [broker.id, broker.name]));

    const payload = buildN8nEnvelope("contracts", tenantId, rows.map((contract) => toN8nContract({
      ...contract,
      lead_name: contract.lead_name ?? (contract.lead_id ? leadById.get(contract.lead_id) : null),
      project_name: contract.project_name ?? (contract.imovel_id ? imovelById.get(contract.imovel_id) : null) ?? (contract.project_id ? imovelById.get(contract.project_id) : null),
      corretor_name: contract.corretor_name ?? (contract.broker_id ? brokerById.get(contract.broker_id) : null),
    })));
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[GET /api/contracts] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ─── POST /api/contracts ──────────────────────────────────────────────────────
// Cria um novo contrato vinculado ao tenant autenticado

export async function POST(req: NextRequest) {
  try {
    // DEV_BYPASS: skip auth in development — consistent with proxy.ts and TenantContext
    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    const supabase = isDevBypass ? createAdminClient() : await createClient();

    let tenantId: string;

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

    // Ler body
    const body = await req.json();
    const admin = createAdminClient();

    const [leadRes, imovelRes, brokerRes] = await Promise.all([
      body.lead_id
        ? admin.from("leads").select("id, name").eq("id", body.lead_id).eq("tenant_id", tenantId).maybeSingle()
        : Promise.resolve({ data: null }),
      (body.imovel_id || body.project_id)
        ? admin
            .from("imoveis")
            .select("id, titulo_comercial, bairro, referencia_unica, id_imovel")
            .eq("id", body.imovel_id ?? body.project_id)
            .eq("tenant_id", tenantId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      body.broker_id
        ? admin.from("corretores").select("id, name").eq("id", body.broker_id).eq("tenant_id", tenantId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const leadName = leadRes.data?.name ?? (typeof body.lead_name === "string" ? body.lead_name.trim() : "");
    const imovel = imovelRes.data as
      | { titulo_comercial?: string | null; bairro?: string | null; referencia_unica?: string | null; id_imovel?: string | null }
      | null;
    const projectName =
      [imovel?.titulo_comercial, imovel?.referencia_unica ?? imovel?.id_imovel, imovel?.bairro]
        .filter(Boolean)
        .join(" · ") ||
      body.project_name ||
      body.title ||
      null;
    const corretorName = brokerRes.data?.name ?? body.corretor_name ?? null;

    // Validar campos obrigatorios
    if (!leadName) {
      return NextResponse.json({ error: "lead_name e obrigatorio" }, { status: 400 });
    }

    if (body.value === undefined || body.value === null || body.value === "") {
      return NextResponse.json({ error: "value e obrigatorio" }, { status: 400 });
    }

    const metadataValue = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>).valor_total
      : null;
    const numericValue = parseBRLMoney(body.value ?? body.valor ?? metadataValue);
    if (isNaN(numericValue) || numericValue <= 0) {
      return NextResponse.json({ error: "value deve ser um numero positivo" }, { status: 400 });
    }

    // Montar payload de insercao
    const insertPayload = {
      tenant_id:     tenantId,
      lead_id:       body.lead_id       || null,
      lead_name:     leadName,
      project_id:    body.project_id    || null,
      imovel_id:     body.imovel_id ?? body.project_id ?? null,
      project_name:  projectName,
      broker_id:     body.broker_id     || null,
      corretor_name: corretorName,
      title:         body.title         || null,
      type:          body.type          || "venda",
      status:        body.status        || "draft",
      value:         numericValue,
      notes:         body.notes         || null,
      expires_at:    body.expires_at    || null,
      metadata:      normalizeContractFinancialMetadata(body.metadata as Record<string, unknown> | null | undefined, numericValue),
    };

    const { data: contract, error: insertError } = await supabase
      .from("contracts")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/contracts] insert error:", insertError);
      return NextResponse.json({ error: "Erro ao criar contrato" }, { status: 500 });
    }

    const payload = buildN8nEnvelope("contracts", tenantId, [toN8nContract(contract)]);
    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    console.error("[POST /api/contracts] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
