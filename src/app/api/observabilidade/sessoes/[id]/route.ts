import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCognitiveSeverity } from "@/lib/cockpit/severity";
import type {
  CognitiveSeverity,
  SessionDetail,
  SessionTransition,
} from "@/lib/cockpit/types";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

const SEVERITY_RANK: Record<CognitiveSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
  nominal: 0,
};

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
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

    const { data: traces, error } = await supabase
      .from("ju_runtime_traces")
      .select(
        `runtime_trace_id, lead_id, deal_id,
         runtime_state, previous_runtime_state, objective_state,
         loop_detected, loop_risk, fallback_triggered,
         valid_transition, retrieval_allowed,
         latency_ms, created_at`
      )
      .eq("tenant_id", tenantId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/observabilidade/sessoes/[id]]", error);
      return NextResponse.json(
        { error: "Erro ao buscar sessao" },
        { status: 500 }
      );
    }

    if (!traces || traces.length === 0) {
      return NextResponse.json(
        { error: "Sessao nao encontrada" },
        { status: 404 }
      );
    }

    const severities = traces.map((t) =>
      computeCognitiveSeverity({
        loop_detected: t.loop_detected ?? false,
        loop_risk: t.loop_risk ?? null,
        valid_transition: t.valid_transition ?? null,
        fallback_triggered: t.fallback_triggered ?? false,
        retrieval_allowed: t.retrieval_allowed ?? null,
      })
    );

    let worst: CognitiveSeverity = "nominal";
    for (const s of severities) {
      if (SEVERITY_RANK[s] > SEVERITY_RANK[worst]) worst = s;
    }

    const latencies = traces
      .map((t) => t.latency_ms)
      .filter((ms): ms is number => ms !== null && typeof ms === "number");

    const recent_transitions: SessionTransition[] = traces
      .slice(0, 8)
      .map((t, i) => ({
        runtime_trace_id: t.runtime_trace_id,
        from: t.previous_runtime_state ?? null,
        to: t.runtime_state ?? null,
        objective_state: t.objective_state ?? null,
        severity: severities[i],
        created_at: t.created_at,
      }));

    const detail: SessionDetail = {
      conversation_id: conversationId,
      lead_id: traces[0].lead_id ?? null,
      deal_id: traces[0].deal_id ?? null,
      current_runtime_state: traces[0].runtime_state ?? null,
      current_objective_state: traces[0].objective_state ?? null,
      worst_severity: worst,
      avg_latency_ms:
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : null,
      max_latency_ms: latencies.length > 0 ? Math.max(...latencies) : null,
      trace_count: traces.length,
      loop_count: traces.filter((t) => t.loop_detected).length,
      fallback_count: traces.filter((t) => t.fallback_triggered).length,
      irregular_transitions: traces.filter((t) => t.valid_transition === false)
        .length,
      retrieval_count: traces.filter((t) => t.retrieval_allowed === true)
        .length,
      first_trace_at: traces[traces.length - 1].created_at,
      last_trace_at: traces[0].created_at,
      recent_transitions,
    };

    return NextResponse.json(detail, { status: 200 });
  } catch (err) {
    console.error("[GET /api/observabilidade/sessoes/[id]]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
