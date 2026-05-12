import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildN8nEnvelope, toN8nImovel } from "@/types/n8n-payloads";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// ─── GET /api/imoveis ─────────────────────────────────────────────────────────
// Retorna imóveis do tenant autenticado em formato padronizado para n8n

export async function GET() {
  try {
    const supabase = createAdminClient();

    // DEV_BYPASS: skip auth in development — consistent with proxy.ts and TenantContext
    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    let tenantId: string;

    if (isDevBypass) {
      tenantId = DEV_JUREMA_TENANT_ID;
    } else {
      // Admin client bypasses RLS; resolve tenant from session cookie via anon client
      const { createClient } = await import("@/lib/supabase/server");
      const anonClient = await createClient();
      const { data: { user }, error: authError } = await anonClient.auth.getUser();
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

    const { data: properties, error: propertiesError } = await supabase
      .from("imoveis")
      .select("id, tenant_id, id_imovel, external_id, titulo_comercial, tipo_de_imovel, finalidade, bairro, quartos, suites, vagas, metragem, valor, descricao_imovel, foto_principal, imagem_card, link_do_imovel, link_sanitizado, status_publicacao, status_operacional, referencia_unica, metadata, updated_at")
      .eq("tenant_id", tenantId)
      .eq("status_publicacao", "Publicado")
      .eq("status_operacional", "disponivel")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (propertiesError) {
      console.error("[GET /api/imoveis] query error:", propertiesError);
      return NextResponse.json({ error: "Erro ao buscar imoveis" }, { status: 500 });
    }

    const payload = buildN8nEnvelope("imoveis", tenantId, (properties ?? []).map(toN8nImovel));
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    console.error("[GET /api/imoveis] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
