import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildN8nEnvelope, toN8nLead } from "@/types/n8n-payloads";

// ─── GET /api/leads ───────────────────────────────────────────────────────────
// Retorna leads do tenant autenticado em formato padronizado para n8n

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

    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, tenant_id, stage_id, name, email, phone, company, source, status, score, value, notes, metadata, assigned_to, last_action_at, created_at, updated_at, ai_status, ai_temperature, ai_last_summary, ai_last_intent, ai_qualified_at, ai_hot_at, phone_normalized, corretor_id")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false });

    if (leadsError) {
      console.error("[GET /api/leads] query error:", leadsError);
      return NextResponse.json({ error: "Erro ao buscar leads" }, { status: 500 });
    }

    const payload = buildN8nEnvelope("leads", tenantId, (leads ?? []).map(toN8nLead));
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[GET /api/leads] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ─── POST /api/leads ──────────────────────────────────────────────────────────
// Cria novo lead para o tenant autenticado

export async function POST(req: NextRequest) {
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
    const body = await req.json() as Record<string, unknown>;

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name e obrigatorio" }, { status: 400 });
    }

    const { data: newLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        tenant_id: tenantId,
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        company: body.company ?? null,
        source: body.source ?? null,
        status: body.status ?? "new",
        score: typeof body.score === "number" ? body.score : 0,
        value: typeof body.value === "number" ? body.value : 0,
        assigned_to: body.assigned_to ?? null,
        notes: body.notes ?? null,
        stage_id: body.stage_id ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/leads]", insertError);
      return NextResponse.json({ error: "Erro ao criar lead" }, { status: 500 });
    }

    return NextResponse.json(newLead, { status: 201 });
  } catch (err) {
    console.error("[POST /api/leads] unexpected:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
