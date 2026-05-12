import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── /api/corretores ──────────────────────────────────────────────────────────
// GET    — lista corretores do tenant
// PATCH  — atualiza um corretor (body: { id, ...fields })
// DELETE — exclui um corretor (body: { id })
//
// Todos os handlers usam admin client (service_role) para contornar RLS.
// Escopo garantido via tenant_id resolvido server-side a partir da sessão.

const BROKER_SELECT =
  "id, tenant_id, name, phone, email, role, tipo, cpf, is_active, address, city, state, zip_code, bank, bank_agency, bank_account, bank_account_type, pix_key, pix_key_type, pix_beneficiary, notes, created_at, updated_at";
const DEAL_SELECT = "id, lead_id, assigned_broker_id";

const DEV_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// ─── Shared: resolve tenant_id ────────────────────────────────────────────────

async function resolveTenantId(): Promise<{ tenantId: string } | NextResponse> {
  // DEV_BYPASS: skip auth in development — consistent with proxy.ts and TenantContext
  const isDevBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  if (isDevBypass) {
    return { tenantId: DEV_TENANT_ID };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

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

  return { tenantId: profile.tenant_id as string };
}

// ─── GET /api/corretores ──────────────────────────────────────────────────────

export async function GET() {
  try {
    const result = await resolveTenantId();
    if (result instanceof NextResponse) return result;
    const { tenantId } = result;

    const admin = createAdminClient();

    const [brokersResult, dealsResult] = await Promise.all([
      admin
        .from("corretores")
        .select(BROKER_SELECT)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200),
      admin
        .from("jurema_deals")
        .select(DEAL_SELECT)
        .eq("tenant_id", tenantId),
    ]);

    if (brokersResult.error) {
      console.error("[GET /api/corretores] brokers query error:", brokersResult.error);
      return NextResponse.json({ error: "Erro ao buscar corretores" }, { status: 500 });
    }

    if (dealsResult.error) {
      console.error("[GET /api/corretores] deals query error:", dealsResult.error);
      return NextResponse.json({ error: "Erro ao buscar corretores" }, { status: 500 });
    }

    const leadReceivedSets = new Map<string, Set<string>>();
    const dealCounts = new Map<string, number>();

    for (const deal of dealsResult.data ?? []) {
      const brokerId = deal.assigned_broker_id;
      if (!brokerId) continue;

      dealCounts.set(brokerId, (dealCounts.get(brokerId) ?? 0) + 1);

      if (deal.lead_id) {
        const existing = leadReceivedSets.get(brokerId) ?? new Set<string>();
        existing.add(deal.lead_id);
        leadReceivedSets.set(brokerId, existing);
      }
    }

    const leadReceivedCounts = Object.fromEntries(
      Array.from(leadReceivedSets.entries()).map(([brokerId, leads]) => [brokerId, leads.size])
    );
    const assignedDealCounts = Object.fromEntries(dealCounts.entries());

    return NextResponse.json(
      {
        data: brokersResult.data ?? [],
        stats: {
          leadReceivedCounts,
          assignedDealCounts,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
        },
      }
    );
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
