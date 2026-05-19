import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCognitiveSeverity } from "@/lib/cockpit/severity";
import type { HandoffEvent, HandoffState, CognitiveSeverity } from "@/lib/cockpit/types";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// Stages where an unassigned broker indicates an orphaned deal.
const LATE_STAGES = new Set([
  "corretor",
  "visita",
  "proposta",
  "fechamento",
]);

export const dynamic = "force-dynamic";

function computeHandoffState(
  brokerStatus: string | null,
  dealStage: string | null
): HandoffState {
  if (brokerStatus === "em_atendimento" || brokerStatus === "atribuido") return "ativo";
  if (brokerStatus === "aguardando_corretor") return "aguardando";
  if (brokerStatus === "encerrado") return "encerrado";
  // nao_atribuido or null — degraded if deal is already at a broker-dependent stage
  if (dealStage && LATE_STAGES.has(dealStage)) return "órfão";
  return "sem_handoff";
}

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

    // Step 1: fetch recent traces that have a deal_id
    const { data: traces, error: tracesError } = await supabase
      .from("ju_runtime_traces")
      .select(
        `runtime_trace_id, conversation_id, deal_id,
         runtime_state,
         loop_detected, loop_risk, fallback_triggered,
         valid_transition, retrieval_allowed,
         latency_ms, created_at`
      )
      .eq("tenant_id", tenantId)
      .not("deal_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (tracesError) {
      console.error("[GET /api/observabilidade/handoffs] traces:", tracesError);
      return NextResponse.json(
        { error: "Erro ao buscar handoffs" },
        { status: 500 }
      );
    }

    // Step 2: deduplicate — most recent trace per deal_id
    type TraceRow = NonNullable<typeof traces>[number];
    const latestByDeal = new Map<string, TraceRow>();
    for (const t of traces ?? []) {
      if (!t.deal_id) continue;
      if (!latestByDeal.has(t.deal_id)) latestByDeal.set(t.deal_id, t);
    }

    const dealIds = Array.from(latestByDeal.keys()).slice(0, 100);

    if (dealIds.length === 0) {
      return NextResponse.json({ events: [] }, { status: 200 });
    }

    // Step 3: batch fetch deals
    const { data: deals, error: dealsError } = await supabase
      .from("jurema_deals")
      .select("id, deal_stage, broker_status, assigned_broker_id")
      .eq("tenant_id", tenantId)
      .in("id", dealIds);

    if (dealsError) {
      console.error("[GET /api/observabilidade/handoffs] deals:", dealsError);
      return NextResponse.json(
        { error: "Erro ao buscar deals" },
        { status: 500 }
      );
    }

    // Step 4: index deals by id
    type DealRow = NonNullable<typeof deals>[number];
    const dealMap = new Map<string, DealRow>();
    for (const d of deals ?? []) dealMap.set(d.id, d);

    // Step 5: merge and compute handoff_state
    const events: HandoffEvent[] = dealIds.map((dealId) => {
      const trace = latestByDeal.get(dealId)!;
      const deal = dealMap.get(dealId);

      const brokerStatus = deal?.broker_status ?? null;
      const dealStage = deal?.deal_stage ?? null;

      const severity: CognitiveSeverity = computeCognitiveSeverity({
        loop_detected: trace.loop_detected ?? false,
        loop_risk: trace.loop_risk ?? null,
        valid_transition: trace.valid_transition ?? null,
        fallback_triggered: trace.fallback_triggered ?? false,
        retrieval_allowed: trace.retrieval_allowed ?? null,
      });

      return {
        runtime_trace_id: trace.runtime_trace_id,
        conversation_id: trace.conversation_id ?? "",
        deal_id: dealId,
        runtime_state: trace.runtime_state ?? null,
        deal_stage: dealStage,
        handoff_state: computeHandoffState(brokerStatus, dealStage),
        broker_status: brokerStatus,
        assigned_broker_id: deal?.assigned_broker_id ?? null,
        severity,
        latency_ms: trace.latency_ms ?? null,
        last_trace_at: trace.created_at,
      };
    });

    // Sort: órfão first, then aguardando, then others — all by recency within group
    const HANDOFF_RANK: Record<HandoffState, number> = {
      órfão: 3,
      aguardando: 2,
      ativo: 1,
      sem_handoff: 0,
      encerrado: 0,
    };
    events.sort(
      (a, b) =>
        HANDOFF_RANK[b.handoff_state] - HANDOFF_RANK[a.handoff_state] ||
        new Date(b.last_trace_at).getTime() - new Date(a.last_trace_at).getTime()
    );

    return NextResponse.json({ events }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/observabilidade/handoffs]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
