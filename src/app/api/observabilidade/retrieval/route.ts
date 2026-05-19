import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCognitiveSeverity } from "@/lib/cockpit/severity";
import type { RetrievalEvent } from "@/lib/cockpit/types";

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
        `runtime_trace_id, conversation_id,
         retrieval_policy, retrieval_allowed,
         runtime_state, objective_state,
         loop_detected, loop_risk, fallback_triggered,
         valid_transition,
         latency_ms, created_at`
      )
      .eq("tenant_id", tenantId)
      .or("retrieval_allowed.eq.true,retrieval_policy.neq.disabled")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[GET /api/observabilidade/retrieval]", error);
      return NextResponse.json(
        { error: "Erro ao buscar retrieval" },
        { status: 500 }
      );
    }

    const events: RetrievalEvent[] = (traces ?? []).map((t) => ({
      runtime_trace_id: t.runtime_trace_id,
      conversation_id: t.conversation_id ?? "",
      retrieval_policy: t.retrieval_policy ?? null,
      retrieval_allowed: t.retrieval_allowed ?? null,
      runtime_state: t.runtime_state ?? null,
      objective_state: t.objective_state ?? null,
      latency_ms: t.latency_ms ?? null,
      severity: computeCognitiveSeverity({
        loop_detected: t.loop_detected ?? false,
        loop_risk: t.loop_risk ?? null,
        valid_transition: t.valid_transition ?? null,
        fallback_triggered: t.fallback_triggered ?? false,
        retrieval_allowed: t.retrieval_allowed ?? null,
      }),
      created_at: t.created_at,
    }));

    return NextResponse.json({ events }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/observabilidade/retrieval]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
