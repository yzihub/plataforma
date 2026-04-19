import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── GET /api/brokers/[id] ────────────────────────────────────────────────────
// Busca um corretor pelo id para uso do ContratoEditor

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: brokerId } = await params;
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

    const { data: broker, error } = await supabase
      .from("brokers")
      .select("id, tenant_id, full_name, phone, email, role, is_active, created_at, updated_at")
      .eq("id", brokerId)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (error || !broker) {
      return NextResponse.json({ error: "Corretor nao encontrado" }, { status: 404 });
    }

    return NextResponse.json(broker, { status: 200 });
  } catch (err) {
    console.error("[GET /api/brokers/:id] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
