import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// ─── GET /api/observabilidade/agent-metrics ───────────────────────────────────
// Retorna agregados de agent_metrics_events + jurema_deals (somente leitura)
// Escopo: agent_name='jurema' — sem coluna tenant_id na tabela de eventos

export async function GET() {
  try {
    const supabase = createAdminClient();

    // DEV_BYPASS: skip auth in development — consistent with proxy.ts and TenantContext
    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    let tenantId: string;

    if (isDevBypass) {
      tenantId = DEV_JUREMA_TENANT_ID;
    } else {
      // Admin client bypasses RLS; resolve tenant from session cookie via anon client
      const { createClient } = await import("@/lib/supabase/server");
      const anonClient = await createClient();
      const {
        data: { user },
        error: authError,
      } = await anonClient.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
      }

      const { data: profile, error: profileError } = await supabase
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

    const since30d = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Queries paralelas: eventos + deals
    const [eventsResult, dealsResult] = await Promise.all([
      // NOTA: agent_metrics_events não tem tenant_id como coluna direta.
      // Escopo dado por agent_name='jurema' — cada agente é exclusivo de um tenant.
      supabase
        .from("agent_metrics_events")
        .select("id, agent_name, event_type, project_id, created_at")
        .eq("agent_name", "jurema")
        .gte("created_at", since30d)
        .order("created_at", { ascending: false })
        .limit(500),

      supabase
        .from("jurema_deals")
        .select("id, deal_stage, lead_score, qualification_status")
        .eq("tenant_id", tenantId),
    ]);

    if (eventsResult.error) {
      console.error(
        "[GET /api/observabilidade/agent-metrics] events query error:",
        eventsResult.error
      );
      return NextResponse.json(
        { error: "Erro ao buscar eventos" },
        { status: 500 }
      );
    }

    if (dealsResult.error) {
      console.error(
        "[GET /api/observabilidade/agent-metrics] deals query error:",
        dealsResult.error
      );
      return NextResponse.json(
        { error: "Erro ao buscar deals" },
        { status: 500 }
      );
    }

    const events = eventsResult.data ?? [];
    const deals = dealsResult.data ?? [];

    // ─── Agregados de eventos ────────────────────────────────────────────────
    const now = Date.now();
    const since24h = now - 24 * 60 * 60 * 1000;
    const since7d = now - 7 * 24 * 60 * 60 * 1000;

    const events_total = events.length;
    const events_24h = events.filter(
      (e) => new Date(e.created_at).getTime() >= since24h
    ).length;
    const events_7d = events.filter(
      (e) => new Date(e.created_at).getTime() >= since7d
    ).length;

    // Agrupar por event_type
    const byTypeMap = new Map<
      string,
      { count: number; count_24h: number; count_7d: number }
    >();

    for (const e of events) {
      const ts = new Date(e.created_at).getTime();
      const existing = byTypeMap.get(e.event_type) ?? {
        count: 0,
        count_24h: 0,
        count_7d: 0,
      };
      existing.count += 1;
      if (ts >= since24h) existing.count_24h += 1;
      if (ts >= since7d) existing.count_7d += 1;
      byTypeMap.set(e.event_type, existing);
    }

    const by_event_type = Array.from(byTypeMap.entries())
      .map(([event_type, counts]) => ({ event_type, ...counts }))
      .sort((a, b) => b.count - a.count);

    // ─── Agregados de deals ──────────────────────────────────────────────────
    // NOTA: frontend apenas conta — score já calculado pelo backend
    const deals_total = deals.length;
    const deals_qualified = deals.filter(
      (d) => (d.lead_score ?? 0) >= 70
    ).length;
    const deals_in_corretor_stage = deals.filter(
      (d) => d.deal_stage === "corretor"
    ).length;

    // Primeiros 50 eventos (já vêm ordenados desc)
    const recent_events = events.slice(0, 50).map((e) => ({
      id: e.id,
      agent_name: e.agent_name,
      event_type: e.event_type,
      project_id: e.project_id,
      created_at: e.created_at,
    }));

    return NextResponse.json(
      {
        ok: true,
        tenant_id: tenantId,
        generated_at: new Date().toISOString(),
        totals: {
          events_total,
          events_24h,
          events_7d,
          deals_total,
          deals_qualified,
          deals_in_corretor_stage,
        },
        by_event_type,
        recent_events,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/observabilidade/agent-metrics]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
