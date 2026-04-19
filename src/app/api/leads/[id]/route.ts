import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── GET /api/leads/[id] ─────────────────────────────────────────────────────
// Busca um lead pelo id (para uso do ContratoEditor e outros)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const supabase = await createClient();

    const tenantId = await resolveTenant(supabase);
    if (!tenantId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: "Lead nao encontrado" }, { status: 404 });
    }

    return NextResponse.json(lead, { status: 200 });
  } catch (err) {
    console.error("[GET /api/leads/:id] unexpected:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Campos permitidos para PATCH
const ALLOWED_UPDATE_FIELDS = [
  "stage_id", "name", "email", "phone", "company", "source", "status",
  "score", "value", "assigned_to", "notes",
  "janela_visita", "regiao_interesse", "bairro_interesse", "objetivo", "interesse_principal",
  "finalidade", "faixa_valor", "imovel_ref", "status_agendamento", "data_agendamento",
] as const;

// ─── Helper: resolve tenant ────────────────────────────────────────────────────

async function resolveTenant(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) return null;
  return profile.tenant_id as string;
}

// ─── PATCH /api/leads/[id] ────────────────────────────────────────────────────
// Atualiza campos do lead (stage_id, dados do formulário, etc.)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const supabase = await createClient();

    const tenantId = await resolveTenant(supabase);
    if (!tenantId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    // Verificar que o lead pertence ao tenant
    const { data: existing, error: checkError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: "Lead nao encontrado ou sem permissao" }, { status: 403 });
    }

    const body = await req.json() as Record<string, unknown>;

    // Filtrar apenas campos permitidos
    const updateData: Record<string, unknown> = {
      last_action_at: new Date().toISOString(),
    };
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (field in body) updateData[field] = body[field];
    }

    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (updateError) {
      console.error("[PATCH /api/leads/:id]", updateError);
      return NextResponse.json({ error: "Erro ao atualizar lead" }, { status: 500 });
    }

    return NextResponse.json(updatedLead, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/leads/:id] unexpected:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ─── DELETE /api/leads/[id] ───────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const supabase = await createClient();

    const tenantId = await resolveTenant(supabase);
    if (!tenantId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("[DELETE /api/leads/:id]", error);
      return NextResponse.json({ error: "Erro ao excluir lead" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/leads/:id] unexpected:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
