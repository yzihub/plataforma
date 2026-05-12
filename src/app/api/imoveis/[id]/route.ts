import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

async function getTenantId(request: NextRequest) {
  const isDevBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  if (isDevBypass) {
    return {
      tenantId: request.nextUrl.searchParams.get("tenant_id") ?? DEV_JUREMA_TENANT_ID,
      error: null,
      status: 200,
    };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { tenantId: null, error: "Nao autenticado", status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    return { tenantId: null, error: "Perfil nao encontrado", status: 401 };
  }

  return { tenantId: profile.tenant_id as string, error: null, status: 200 };
}

function cleanMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== null)
  );
}

// ─── GET /api/imoveis/[id] ────────────────────────────────────────────────────
// Busca um imóvel pelo UUID dentro do tenant. Usado pelo ContratoEditor.
// NÃO filtra status_publicacao — contratos podem ser gerados para imóveis em rascunho.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string" || id.trim() === "") {
      return NextResponse.json({ error: "ID do imóvel inválido" }, { status: 400 });
    }

    const { tenantId, error: authError, status } = await getTenantId(request);
    if (authError || !tenantId) {
      return NextResponse.json({ error: authError }, { status });
    }

    const supabase = createAdminClient();

    const { data: imovel, error } = await supabase
      .from("imoveis")
      .select(
        "id, tenant_id, id_imovel, referencia_unica, titulo_comercial, bairro, valor, quartos, suites, vagas, metragem, descricao_imovel, foto_principal, tipo_de_imovel, finalidade, link_do_imovel, status_publicacao, metadata, created_at, updated_at"
      )
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/imoveis/:id] query error:", error);
      return NextResponse.json({ error: "Erro ao buscar imóvel" }, { status: 500 });
    }

    if (!imovel) {
      return NextResponse.json({ error: "Imóvel não encontrado" }, { status: 404 });
    }

    return NextResponse.json(imovel, { status: 200 });
  } catch (err) {
    console.error("[GET /api/imoveis/:id] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string" || id.trim() === "") {
      return NextResponse.json({ error: "ID do imovel invalido" }, { status: 400 });
    }

    const { tenantId, error: authError, status } = await getTenantId(request);
    if (authError || !tenantId) {
      return NextResponse.json({ error: authError }, { status });
    }

    const body = await request.json() as Record<string, unknown>;
    const admin = createAdminClient();

    const { data: existing, error: existingError } = await admin
      .from("imoveis")
      .select("id, metadata")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error("[PATCH /api/imoveis/:id] select error:", existingError);
      return NextResponse.json({ error: "Erro ao buscar imovel" }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Imovel nao encontrado" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    for (const field of [
      "titulo_comercial",
      "valor",
      "bairro",
      "metragem",
      "descricao_imovel",
      "tipo_de_imovel",
      "finalidade",
    ]) {
      if (field in body) updateData[field] = body[field];
    }

    if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
      const existingMetadata =
        existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
          ? existing.metadata as Record<string, unknown>
          : {};

      updateData.metadata = cleanMetadata({
        ...existingMetadata,
        ...(body.metadata as Record<string, unknown>),
      });
    }

    const { data: imovel, error: updateError } = await admin
      .from("imoveis")
      .update(updateData)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("id, metadata")
      .single();

    if (updateError) {
      console.error("[PATCH /api/imoveis/:id] update error:", updateError);
      return NextResponse.json({ error: "Erro ao salvar imovel" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, imovel }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/imoveis/:id] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
