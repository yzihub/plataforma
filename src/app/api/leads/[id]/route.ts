import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── PATCH /api/leads/[id] ────────────────────────────────────────────────────
// Atualiza stage_id e last_action_at de um lead, com autenticacao tenant-scoped

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const supabase = await createClient();

    // Verificar autenticacao
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    // Buscar tenant_id do usuario
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 401 });
    }

    const tenantId = profile.tenant_id as string;

    // Ler body
    const body = await req.json();
    const { stage_id } = body as { stage_id: string };

    if (!stage_id) {
      return NextResponse.json({ error: "stage_id e obrigatorio" }, { status: 400 });
    }

    // Verificar que o lead pertence ao tenant do usuario
    const { data: existingLead, error: leadCheckError } = await supabase
      .from("leads")
      .select("id, tenant_id")
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .single();

    if (leadCheckError || !existingLead) {
      return NextResponse.json({ error: "Lead nao encontrado ou sem permissao" }, { status: 403 });
    }

    // Atualizar stage_id e last_action_at
    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update({
        stage_id,
        last_action_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (updateError) {
      console.error("[PATCH /api/leads/:id] update error:", updateError);
      return NextResponse.json({ error: "Erro ao atualizar lead" }, { status: 500 });
    }

    return NextResponse.json(updatedLead, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/leads/:id] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
