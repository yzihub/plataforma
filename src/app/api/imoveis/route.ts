import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildN8nEnvelope, toN8nImovel } from "@/types/n8n-payloads";

// ─── GET /api/imoveis ─────────────────────────────────────────────────────────
// Retorna imóveis do tenant autenticado em formato padronizado para n8n

export async function GET() {
  try {
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

    const tenantId = profile.tenant_id as string;

    const { data: properties, error: propertiesError } = await supabase
      .from("imoveis")
      .select("id, tenant_id, titulo_comercial, bairro, valor, quartos, suites, vagas, metragem, descricao_imovel, foto_principal, tipo_de_imovel, finalidade, link_do_imovel, status_publicacao, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .eq("status_publicacao", "Publicado")
      .order("updated_at", { ascending: false });

    if (propertiesError) {
      console.error("[GET /api/imoveis] query error:", propertiesError);
      return NextResponse.json({ error: "Erro ao buscar imoveis" }, { status: 500 });
    }

    const payload = buildN8nEnvelope("imoveis", tenantId, (properties ?? []).map(toN8nImovel));
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[GET /api/imoveis] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
