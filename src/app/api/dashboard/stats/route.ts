import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

type LeadChartRow = {
  created_at: string;
  source: string | null;
  status: string | null;
  ai_status: string | null;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function statusLabel(status: string | null) {
  const labels: Record<string, string> = {
    new: "Novo",
    contacted: "Contato",
    qualified: "Qualificado",
    meeting: "Visita",
    proposal: "Proposta",
    negotiation: "Negociação",
    won: "Fechado",
    lost: "Perdido",
    lead_quente: "Lead quente",
    novo: "Novo",
  };

  if (!status) return "Sem status";
  return labels[status] ?? status.replace(/_/g, " ");
}

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────
// Agrega métricas v1 do tenant ativo em uma única chamada.

export async function GET() {
  try {
    const supabase = createAdminClient();

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
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (!profile?.tenant_id) {
        return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 401 });
      }
      tenantId = profile.tenant_id as string;
    }

    const since24h = new Date(Date.now() - 86_400_000).toISOString();
    const start30d = new Date();
    start30d.setHours(0, 0, 0, 0);
    start30d.setDate(start30d.getDate() - 29);

    const [leadsTotal, leadsQuentes, conversasCount, imoveisDisponiveis, corretoresAtivos, mensagensCount, leadsChart] =
      await Promise.all([
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .or("ai_temperature.eq.quente,ai_status.eq.lead_quente"),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
        supabase
          .from("imoveis")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status_operacional", "disponivel"),
        supabase
          .from("corretores")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("is_active", true),
        supabase
          .from("conversation_messages")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", since24h),
        supabase
          .from("leads")
          .select("created_at, source, status, ai_status")
          .eq("tenant_id", tenantId),
      ]);

    if (leadsChart.error) {
      console.error("[GET /api/dashboard/stats] leads chart error:", leadsChart.error);
    }

    const chartRows = (leadsChart.data ?? []) as LeadChartRow[];
    const byDay = new Map<string, number>();
    for (let i = 0; i < 30; i += 1) {
      const day = new Date(start30d);
      day.setDate(start30d.getDate() + i);
      byDay.set(dateKey(day), 0);
    }

    const bySource = new Map<string, number>();
    const byStatus = new Map<string, number>();

    for (const lead of chartRows) {
      const day = dateKey(new Date(lead.created_at));
      if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);

      const source = lead.source?.trim() || "Sem origem";
      bySource.set(source, (bySource.get(source) ?? 0) + 1);

      const status = statusLabel(lead.status || lead.ai_status);
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    }

    return NextResponse.json(
      {
        total_leads: leadsTotal.count ?? 0,
        leads_quentes: leadsQuentes.count ?? 0,
        conversas_abertas: conversasCount.count ?? 0,
        imoveis_disponiveis: imoveisDisponiveis.count ?? 0,
        mensagens_recentes: mensagensCount.count ?? 0,
        corretores_ativos: corretoresAtivos.count ?? 0,
        leads_por_dia: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
        leads_por_origem: Array.from(bySource.entries()).map(([source, count]) => ({ source, count })),
        status_pipeline: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("[GET /api/dashboard/stats] error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
