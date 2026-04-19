import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    let tenantId: string;

    if (isDevBypass) {
      const param = request.nextUrl.searchParams.get("tenant_id");
      tenantId = param ?? "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";
    } else {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
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

    const supabase = isDevBypass ? createAdminClient() : await createClient();

    const { data: imovel, error } = await supabase
      .from("imoveis")
      .select(
        "id, tenant_id, titulo_comercial, bairro, valor, quartos, suites, vagas, metragem, descricao_imovel, foto_principal, tipo_de_imovel, finalidade, link_do_imovel, status_publicacao, created_at, updated_at"
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
