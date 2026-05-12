import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildN8nEnvelope, toN8nLead } from "@/types/n8n-payloads";
import { recordTimelineEvent } from "@/lib/timeline/events";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// ─── GET /api/leads ───────────────────────────────────────────────────────────
// Retorna leads do tenant autenticado em formato padronizado para n8n

export async function GET() {
  try {
    const admin = createAdminClient();

    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    let tenantId: string;

    if (isDevBypass) {
      tenantId = DEV_JUREMA_TENANT_ID;
    } else {
      const { createClient } = await import("@/lib/supabase/server");
      const anonClient = await createClient();
      const { data: { user }, error: authError } = await anonClient.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
      }

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 401 });
      }
      tenantId = profile.tenant_id as string;
    }

    const { data: leads, error: leadsError } = await admin
      .from("leads")
      .select("id, tenant_id, stage_id, name, email, phone, company, source, status, score, value, notes, metadata, assigned_to, last_action_at, created_at, updated_at, ai_status, ai_temperature, ai_last_summary, ai_last_intent, ai_qualified_at, ai_hot_at, phone_normalized, corretor_id")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(500);

    if (leadsError) {
      console.error("[GET /api/leads] query error:", leadsError);
      return NextResponse.json({ error: "Erro ao buscar leads" }, { status: 500 });
    }

    const payload = buildN8nEnvelope("leads", tenantId, (leads ?? []).map(toN8nLead));
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    console.error("[GET /api/leads] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ─── POST /api/leads ──────────────────────────────────────────────────────────
// Cria novo lead para o tenant autenticado.
// Alinha com o payload enviado por LeadDrawer.handleSave (mesmos campos do PATCH).

// Helper: string vazia/whitespace vira null (para colunas uuid/text que não toleram "").
function emptyToNull(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? null : v;
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    let createdBy: string | null = null;

    // DEV bypass: aceita NEXT_PUBLIC_DEV_BYPASS (já em uso no GET) e DEV_BYPASS (server-side).
    const isDevBypass =
      (process.env.NEXT_PUBLIC_DEV_BYPASS === "true" || process.env.DEV_BYPASS === "true") &&
      process.env.NODE_ENV !== "production";

    let tenantId: string;

    if (isDevBypass) {
      tenantId = DEV_JUREMA_TENANT_ID;
    } else {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
      }
      createdBy = user.id;

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 401 });
      }
      tenantId = profile.tenant_id as string;
    }

    const body = await req.json() as Record<string, unknown>;

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name e obrigatorio" }, { status: 400 });
    }

    // Campos imobiliários vão para metadata (mesma lista usada no PATCH).
    const METADATA_FIELDS = [
      "janela_visita", "regiao_interesse", "bairro_interesse", "objetivo", "interesse_principal",
      "finalidade", "faixa_valor", "imovel_ref", "status_agendamento", "data_agendamento",
      "cpf", "rg", "nacionalidade", "estado_civil", "profissao", "data_nascimento",
      "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "estado",
      "pix", "banco", "agencia", "conta", "dados_bancarios",
      "observacoes_juridicas",
    ] as const;
    const metadata: Record<string, unknown> = {};
    for (const field of METADATA_FIELDS) {
      if (!(field in body)) continue;
      const v = emptyToNull(body[field]);
      if (v !== null && v !== undefined) metadata[field] = v;
    }

    const { data: newLead, error: insertError } = await admin
      .from("leads")
      .insert({
        tenant_id: tenantId,
        name: body.name.trim(),
        email: emptyToNull(body.email),
        phone: emptyToNull(body.phone),
        company: emptyToNull(body.company),
        source: emptyToNull(body.source),
        status: typeof body.status === "string" && body.status ? body.status : "new",
        score: typeof body.score === "number" ? body.score : 0,
        value: typeof body.value === "number" ? body.value : 0,
        notes: emptyToNull(body.notes),
        stage_id: emptyToNull(body.stage_id),
        assigned_to: emptyToNull(body.assigned_to ?? body.corretor_id),
        corretor_id: emptyToNull(body.corretor_id ?? body.assigned_to),
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/leads]", insertError);
      const errorPayload: { error: string; detail?: string } = { error: "Erro ao criar lead" };
      if (process.env.NODE_ENV !== "production") {
        errorPayload.detail = insertError.message;
      }
      return NextResponse.json(errorPayload, { status: 500 });
    }

    try {
      await recordTimelineEvent(admin, {
        tenant_id: tenantId,
        lead_id: newLead.id,
        corretor_id: (newLead.assigned_to as string | null) ?? (newLead.corretor_id as string | null),
        event_type: "lead_created",
        metadata: {
          source: "api/leads",
          stage_id: newLead.stage_id ?? null,
          status: newLead.status ?? null,
        },
        created_by: createdBy,
      });
    } catch (timelineError) {
      console.error("[POST /api/leads] timeline error:", timelineError);
    }

    return NextResponse.json(newLead, { status: 201 });
  } catch (err) {
    console.error("[POST /api/leads] unexpected:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
