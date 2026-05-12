import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// ─── GET /api/followups ───────────────────────────────────────────────────────
// Lista follow_up_tasks do tenant atual + lead.name (somente leitura).
// Status válidos no DB: pendente | em_andamento | resolvido | ignorado | automatizado
// Filtro opcional ?status= (todos|pendente|automatizado|ignorado)

export async function GET(req: Request) {
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
      const {
        data: { user },
        error: authError,
      } = await anonClient.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
      }

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        return NextResponse.json(
          { error: "Perfil nao encontrado" },
          { status: 401 }
        );
      }
      tenantId = profile.tenant_id as string;
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    let query = admin
      .from("follow_up_tasks")
      .select(
        "id, tenant_id, lead_id, type, priority, status, trigger_source, trigger_reason, detected_at, due_at, resolved_at, created_at, updated_at, leads(name, phone)"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (
      statusFilter &&
      ["pendente", "em_andamento", "resolvido", "ignorado", "automatizado"].includes(
        statusFilter
      )
    ) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/followups] query error:", error);
      return NextResponse.json(
        { error: "Erro ao buscar follow-ups" },
        { status: 500 }
      );
    }

    const tasks = (data ?? []).map((row) => {
      const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
      return {
        id: row.id,
        tenant_id: row.tenant_id,
        lead_id: row.lead_id,
        lead_name: lead?.name ?? null,
        lead_phone: lead?.phone ?? null,
        type: row.type,
        priority: row.priority,
        status: row.status,
        trigger_source: row.trigger_source,
        trigger_reason: row.trigger_reason,
        detected_at: row.detected_at,
        due_at: row.due_at,
        resolved_at: row.resolved_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        tenant_id: tenantId,
        generated_at: new Date().toISOString(),
        tasks,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (err) {
    console.error("[GET /api/followups] unexpected error:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
