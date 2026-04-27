import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildN8nEnvelope, toN8nContract } from "@/types/n8n-payloads";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// ─── GET /api/contracts ───────────────────────────────────────────────────────
// Retorna todos os contratos do tenant autenticado, ordenados por updated_at desc

export async function GET() {
  try {
    const supabase = await createClient();

    // DEV_BYPASS: skip auth in development — consistent with proxy.ts and TenantContext
    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

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
      .select("id, tenant_id, lead_id, broker_id, lead_name, project_name, corretor_name, title, type, status, value, signed_at, expires_at, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false });

    if (contractsError) {
      console.error("[GET /api/contracts] query error:", contractsError);
      return NextResponse.json({ error: "Erro ao buscar contratos" }, { status: 500 });
    }

    const payload = buildN8nEnvelope("contracts", tenantId, (contracts ?? []).map(toN8nContract));
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
    const supabase = await createClient();

    // DEV_BYPASS: skip auth in development — consistent with proxy.ts and TenantContext
    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

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

    // Validar campos obrigatorios
    if (!body.lead_name || body.lead_name.trim() === "") {
      return NextResponse.json({ error: "lead_name e obrigatorio" }, { status: 400 });
    }

    if (body.value === undefined || body.value === null || body.value === "") {
      return NextResponse.json({ error: "value e obrigatorio" }, { status: 400 });
    }

    const numericValue = parseFloat(body.value);
    if (isNaN(numericValue) || numericValue < 0) {
      return NextResponse.json({ error: "value deve ser um numero positivo" }, { status: 400 });
    }

    // Montar payload de insercao
    const insertPayload = {
      tenant_id:     tenantId,
      lead_id:       body.lead_id       || null,
      lead_name:     body.lead_name.trim(),
      project_id:    body.project_id    || null,
      project_name:  body.project_name  || null,
      broker_id:     body.broker_id     || null,
      corretor_name: body.corretor_name || null,
      title:         body.title         || null,
      type:          body.type          || "venda",
      status:        body.status        || "draft",
      value:         numericValue,
      notes:         body.notes         || null,
      expires_at:    body.expires_at    || null,
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
