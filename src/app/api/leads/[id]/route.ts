import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordTimelineEvent } from "@/lib/timeline/events";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// ─── Helper: resolve tenant (com dev bypass) ─────────────────────────────────
// Retorna tenantId ou null. Em dev bypass, retorna DEV_JUREMA_TENANT_ID sem auth.

async function resolveTenant(): Promise<string | null> {
  const isDevBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  if (isDevBypass) return DEV_JUREMA_TENANT_ID;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) return null;
  return profile.tenant_id as string;
}

// ─── GET /api/leads/[id] ─────────────────────────────────────────────────────
// Busca um lead pelo id (para uso do ContratoEditor e outros)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

    const tenantId = await resolveTenant();
    if (!tenantId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: lead, error } = await admin
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

// Campos permitidos para PATCH (colunas diretas).
// Regra YZIHUB: corretor responsável é leads.corretor_id (não assigned_to).
const ALLOWED_UPDATE_FIELDS = [
  "stage_id", "name", "email", "phone", "company", "source", "status",
  "score", "value", "notes", "corretor_id",
] as const;

// Campos imobiliários que ficam em metadata (não são colunas diretas)
const METADATA_FIELDS = [
  "janela_visita", "regiao_interesse", "bairro_interesse", "objetivo", "interesse_principal",
  "finalidade", "faixa_valor", "imovel_ref", "status_agendamento", "data_agendamento",
  "cpf", "rg", "nacionalidade", "estado_civil", "profissao", "data_nascimento",
  "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "estado",
  "pix", "banco", "agencia", "conta", "dados_bancarios",
  "observacoes_juridicas",
] as const;

async function syncOperationalDealAssignment(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  leadId: string,
  brokerId: string | null
): Promise<void> {
  const { data: deal, error: dealError } = await admin
    .from("jurema_deals")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("lead_id", leadId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dealError || !deal?.id) {
    return;
  }

  const brokerStatus = brokerId ? "atribuido" : "nao_atribuido";

  const { error: updateError } = await admin
    .from("jurema_deals")
    .update({
      assigned_broker_id: brokerId,
      broker_status: brokerStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deal.id)
    .eq("tenant_id", tenantId);

  if (updateError) {
    console.error("[PATCH /api/leads/:id] deal sync error:", updateError);
  }
}

// ─── PATCH /api/leads/[id] ────────────────────────────────────────────────────
// Atualiza campos do lead (stage_id, dados do formulário, etc.)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

    const tenantId = await resolveTenant();
    if (!tenantId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    const admin = createAdminClient();

    // Verificar que o lead pertence ao tenant (e buscar metadata atual para merge)
    const { data: existing, error: checkError } = await admin
      .from("leads")
      .select("id, metadata, assigned_to, status")
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: "Lead nao encontrado ou sem permissao" }, { status: 403 });
    }

    const body = await req.json() as Record<string, unknown>;

    // Filtrar apenas campos permitidos. Strings vazias viram null para evitar
    // que selects "—" gravem string vazia em colunas uuid (corretor_id, assigned_to).
    const updateData: Record<string, unknown> = {
      last_action_at: new Date().toISOString(),
    };
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (!(field in body)) continue;
      const raw = body[field];
      updateData[field] = typeof raw === "string" && raw.trim() === "" ? null : raw;
    }

    const assignedTo = typeof body.assigned_to === "string" && body.assigned_to.trim()
      ? body.assigned_to.trim()
      : typeof body.corretor_id === "string" && body.corretor_id.trim()
        ? body.corretor_id.trim()
        : null;

    if (assignedTo) {
      updateData.assigned_to = assignedTo;
      updateData.corretor_id = assignedTo;
    } else if ("assigned_to" in body || "corretor_id" in body) {
      updateData.assigned_to = null;
      updateData.corretor_id = null;
    }

    // Campos imobiliários vão para metadata (merge com valor existente)
    const metadataPatch: Record<string, unknown> = {};
    for (const field of METADATA_FIELDS) {
      if (!(field in body)) continue;
      const raw = body[field];
      metadataPatch[field] = typeof raw === "string" && raw.trim() === "" ? null : raw;
    }
    if (Object.keys(metadataPatch).length > 0) {
      const currentMeta = (existing.metadata as Record<string, unknown>) ?? {};
      updateData.metadata = { ...currentMeta, ...metadataPatch };
    }

    const { data: updatedLead, error: updateError } = await admin
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

    const previousAssignedTo = typeof existing.assigned_to === "string" ? existing.assigned_to : null;
    const nextAssignedTo = typeof updatedLead?.assigned_to === "string" ? updatedLead.assigned_to : null;
    const previousStatus = typeof existing.status === "string" ? existing.status : null;
    const nextStatus = typeof updatedLead?.status === "string" ? updatedLead.status : null;

    if (nextAssignedTo && nextAssignedTo !== previousAssignedTo) {
      try {
        await recordTimelineEvent(admin, {
          tenant_id: tenantId,
          lead_id: leadId,
          corretor_id: nextAssignedTo,
          event_type: "lead_assigned",
          metadata: {
            source: "api/leads/[id]",
            previous_assigned_to: previousAssignedTo,
            next_assigned_to: nextAssignedTo,
          },
          created_by: user?.id ?? null,
        });
      } catch (timelineError) {
        console.error("[PATCH /api/leads/:id] timeline lead_assigned error:", timelineError);
      }
    }

    if (nextStatus === "qualified" && previousStatus !== "qualified") {
      try {
        await recordTimelineEvent(admin, {
          tenant_id: tenantId,
          lead_id: leadId,
          event_type: "lead_qualified",
          metadata: {
            source: "api/leads/[id]",
            previous_status: previousStatus,
            next_status: nextStatus,
          },
          created_by: user?.id ?? null,
        });
      } catch (timelineError) {
        console.error("[PATCH /api/leads/:id] timeline lead_qualified error:", timelineError);
      }
    }

    const normalizedNextStatus = typeof nextStatus === "string" ? nextStatus.trim().toLowerCase() : "";
    const normalizedPreviousStatus = typeof previousStatus === "string" ? previousStatus.trim().toLowerCase() : "";
    if (normalizedNextStatus && ["lost", "perdido"].includes(normalizedNextStatus) && normalizedNextStatus !== normalizedPreviousStatus) {
      try {
        await recordTimelineEvent(admin, {
          tenant_id: tenantId,
          lead_id: leadId,
          corretor_id: nextAssignedTo ?? null,
          event_type: "lead_lost",
          metadata: {
            source: "api/leads/[id]",
            previous_status: previousStatus,
            next_status: nextStatus,
          },
          created_by: user?.id ?? null,
        });
      } catch (timelineError) {
        console.error("[PATCH /api/leads/:id] timeline lead_lost error:", timelineError);
      }
    }

    if ("assigned_to" in body || "corretor_id" in body) {
      const nextBrokerId = typeof updatedLead?.assigned_to === "string" && updatedLead.assigned_to.trim()
        ? updatedLead.assigned_to.trim()
        : typeof updatedLead?.corretor_id === "string" && updatedLead.corretor_id.trim()
          ? updatedLead.corretor_id.trim()
          : null;

      await syncOperationalDealAssignment(admin, tenantId, leadId, nextBrokerId);
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

    const tenantId = await resolveTenant();
    if (!tenantId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { error } = await admin
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
