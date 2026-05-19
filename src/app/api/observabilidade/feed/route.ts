import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCognitiveSeverity } from "@/lib/cockpit/severity";
import type { CognitiveFeedRow } from "@/lib/cockpit/types";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

export const dynamic = "force-dynamic";

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

    const { data: traces, error } = await supabase
      .from("ju_runtime_traces")
      .select(
        `runtime_trace_id, correlation_id, conversation_id,
         lead_id, deal_id,
         runtime_state, previous_runtime_state,
         objective_state, next_action,
         loop_risk, loop_detected, fallback_triggered,
         retrieval_policy, retrieval_allowed, valid_transition,
         latency_ms, status, created_at`
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[GET /api/observabilidade/feed]", error);
      return NextResponse.json(
        { error: "Erro ao buscar feed" },
        { status: 500 }
      );
    }

    const rows: CognitiveFeedRow[] = (traces ?? []).map((t) => ({
      runtime_trace_id: t.runtime_trace_id,
      correlation_id: t.correlation_id,
      conversation_id: t.conversation_id ?? null,
      lead_id: t.lead_id ?? null,
      deal_id: t.deal_id ?? null,
      runtime_state: t.runtime_state ?? null,
      previous_runtime_state: t.previous_runtime_state ?? null,
      objective_state: t.objective_state ?? null,
      next_action: t.next_action ?? null,
      loop_risk: t.loop_risk ?? null,
      loop_detected: t.loop_detected ?? false,
      fallback_triggered: t.fallback_triggered ?? false,
      retrieval_policy: t.retrieval_policy ?? null,
      retrieval_allowed: t.retrieval_allowed ?? null,
      valid_transition: t.valid_transition ?? null,
      latency_ms: t.latency_ms ?? null,
      status: t.status ?? "ok",
      created_at: t.created_at,
      severity: computeCognitiveSeverity({
        loop_detected: t.loop_detected ?? false,
        loop_risk: t.loop_risk ?? null,
        valid_transition: t.valid_transition ?? null,
        fallback_triggered: t.fallback_triggered ?? false,
        retrieval_allowed: t.retrieval_allowed ?? null,
      }),
    }));

    return NextResponse.json({ rows }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/observabilidade/feed]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
