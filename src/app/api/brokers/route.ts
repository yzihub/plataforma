import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── GET /api/brokers ─────────────────────────────────────────────────────────
// Retorna corretores do tenant autenticado como array JSON simples (uso interno)

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

    const { data: brokers, error: brokersError } = await supabase
      .from("brokers")
      .select("id, tenant_id, full_name, phone, email, role, is_active, created_at, updated_at")
      .eq("tenant_id", profile.tenant_id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });

    if (brokersError) {
      console.error("[GET /api/brokers] query error:", brokersError);
      return NextResponse.json({ error: "Erro ao buscar corretores" }, { status: 500 });
    }

    return NextResponse.json(brokers ?? [], { status: 200 });
  } catch (err) {
    console.error("[GET /api/brokers] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
