import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCognitiveSeverity } from "@/lib/cockpit/severity";
import type { LoopEvent } from "@/lib/cockpit/types";

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
         runtime_state, objective_state,
         loop_detected, loop_risk, fallback_triggered,
         valid_transition, retrieval_allowed,
         latency_ms, created_at`
      )
      .eq("tenant_id", tenantId)
      .eq("loop_detected", true)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[GET /api/observabilidade/loops]", error);
      return NextResponse.json(
        { error: "Erro ao buscar loops" },
        { status: 500 }
      );
    }

    const rows = traces ?? [];

    // Compute repetition_count: how many times this state looped in this session.
    // Process chronologically (ASC) to assign ascending counts, then restore DESC order.
    const countMap = new Map<string, number>();
    const countByIndex: number[] = new Array(rows.length);

    for (let i = rows.length - 1; i >= 0; i--) {
      const t = rows[i];
      const key = `${t.conversation_id ?? ""}:${t.runtime_state ?? ""}`;
      const next = (countMap.get(key) ?? 0) + 1;
      countMap.set(key, next);
      countByIndex[i] = next;
    }

    const events: LoopEvent[] = rows.map((t, i) => ({
      runtime_trace_id: t.runtime_trace_id,
      conversation_id: t.conversation_id ?? "",
      runtime_state: t.runtime_state ?? null,
      objective_state: t.objective_state ?? null,
      repetition_count: countByIndex[i],
      latency_ms: t.latency_ms ?? null,
      severity: computeCognitiveSeverity({
        loop_detected: true,
        loop_risk: t.loop_risk ?? null,
        valid_transition: t.valid_transition ?? null,
        fallback_triggered: t.fallback_triggered ?? false,
        retrieval_allowed: t.retrieval_allowed ?? null,
      }),
      created_at: t.created_at,
    }));

    return NextResponse.json({ events }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/observabilidade/loops]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
