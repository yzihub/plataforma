import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ─── /api/corretores ──────────────────────────────────────────────────────────
// GET    — lista corretores do tenant
// PATCH  — atualiza um corretor (body: { id, ...fields })
// DELETE — exclui um corretor (body: { id })
//
// Todos os handlers usam admin client (service_role) para contornar RLS.
// Escopo garantido via tenant_id resolvido server-side a partir da sessão.

const BROKER_SELECT =
  "id, tenant_id, name, phone, email, role, tipo, cpf, is_active, address, city, state, zip_code, bank, bank_agency, bank_account, bank_account_type, pix_key, pix_key_type, pix_beneficiary, notes, created_at, updated_at";

// ─── Shared: resolve tenant_id ────────────────────────────────────────────────

async function resolveTenantId(): Promise<{ tenantId: string } | NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

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

  return { tenantId: profile.tenant_id as string };
}

// ─── GET /api/corretores ──────────────────────────────────────────────────────

export async function GET() {
  try {
    const result = await resolveTenantId();
    if (result instanceof NextResponse) return result;
    const { tenantId } = result;

    const admin = createAdminClient();

    const { data: brokers, error: brokersError } = await admin
      .from("corretores")
      .select(BROKER_SELECT)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (brokersError) {
      console.error("[GET /api/corretores] query error:", brokersError);
      return NextResponse.json({ error: "Erro ao buscar corretores" }, { status: 500 });
    }

    return NextResponse.json({ data: brokers ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/corretores] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ─── PATCH /api/corretores ────────────────────────────────────────────────────
// Body: { id: string, ...BrokerInput fields }

export async function PATCH(request: NextRequest) {
  try {
    const result = await resolveTenantId();
    if (result instanceof NextResponse) return result;
    const { tenantId } = result;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const id = typeof body.id === "string" ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    const { id: _id, tenant_id: _tid, created_at: _ca, ...updateFields } = body;
    void _id; void _tid; void _ca;

    const admin = createAdminClient();

    const { data, error: updateError } = await admin
      .from("corretores")
      .update({ ...updateFields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select(BROKER_SELECT)
      .single();

    if (updateError) {
      console.error("[PATCH /api/corretores] update error:", updateError);
      return NextResponse.json({ error: "Erro ao atualizar corretor" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/corretores] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ─── DELETE /api/corretores ───────────────────────────────────────────────────
// Body: { id: string }

export async function DELETE(request: NextRequest) {
  try {
    const result = await resolveTenantId();
    if (result instanceof NextResponse) return result;
    const { tenantId } = result;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const id = typeof body.id === "string" ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error: deleteError } = await admin
      .from("corretores")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (deleteError) {
      console.error("[DELETE /api/corretores] delete error:", deleteError);
      return NextResponse.json({ error: "Erro ao excluir corretor" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/corretores] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
