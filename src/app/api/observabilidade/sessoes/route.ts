import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCognitiveSeverity } from "@/lib/cockpit/severity";
import type { CognitiveSeverity, SessionSummary } from "@/lib/cockpit/types";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

const SEVERITY_RANK: Record<CognitiveSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
  nominal: 0,
};

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
        `runtime_trace_id, conversation_id, lead_id, deal_id,
         runtime_state, objective_state,
         loop_detected, loop_risk, fallback_triggered,
         valid_transition, retrieval_allowed,
         latency_ms, created_at`
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("[GET /api/observabilidade/sessoes]", error);
      return NextResponse.json(
        { error: "Erro ao buscar sessoes" },
        { status: 500 }
      );
    }

    type SessionAcc = {
      conversation_id: string;
      lead_id: string | null;
      deal_id: string | null;
      runtime_state: string | null;
      objective_state: string | null;
      severities: CognitiveSeverity[];
      latencies: number[];
      trace_count: number;
      loop_count: number;
      fallback_count: number;
      first_trace_at: string;
      last_trace_at: string;
    };

    const sessionMap = new Map<string, SessionAcc>();

    for (const t of traces ?? []) {
      const cid = t.conversation_id;
      if (!cid) continue;

      const severity = computeCognitiveSeverity({
        loop_detected: t.loop_detected ?? false,
        loop_risk: t.loop_risk ?? null,
        valid_transition: t.valid_transition ?? null,
        fallback_triggered: t.fallback_triggered ?? false,
        retrieval_allowed: t.retrieval_allowed ?? null,
      });

      const existing = sessionMap.get(cid);
      if (!existing) {
        sessionMap.set(cid, {
          conversation_id: cid,
          lead_id: t.lead_id ?? null,
          deal_id: t.deal_id ?? null,
          runtime_state: t.runtime_state ?? null,
          objective_state: t.objective_state ?? null,
          severities: [severity],
          latencies: t.latency_ms !== null ? [t.latency_ms as number] : [],
          trace_count: 1,
          loop_count: t.loop_detected ? 1 : 0,
          fallback_count: t.fallback_triggered ? 1 : 0,
          first_trace_at: t.created_at,
          last_trace_at: t.created_at,
        });
      } else {
        existing.severities.push(severity);
        if (t.latency_ms !== null) existing.latencies.push(t.latency_ms as number);
        existing.trace_count++;
        if (t.loop_detected) existing.loop_count++;
        if (t.fallback_triggered) existing.fallback_count++;
        // Traces are desc: last seen = oldest
        existing.first_trace_at = t.created_at;
      }
    }

    const sessions: SessionSummary[] = Array.from(sessionMap.values())
      .slice(0, 50)
      .map((s) => {
        let worst: CognitiveSeverity = "nominal";
        for (const sv of s.severities) {
          if (SEVERITY_RANK[sv] > SEVERITY_RANK[worst]) worst = sv;
        }
        const avg_latency_ms =
          s.latencies.length > 0
            ? Math.round(
                s.latencies.reduce((a, b) => a + b, 0) / s.latencies.length
              )
            : null;
        return {
          conversation_id: s.conversation_id,
          lead_id: s.lead_id,
          deal_id: s.deal_id,
          runtime_state: s.runtime_state,
          objective_state: s.objective_state,
          worst_severity: worst,
          avg_latency_ms,
          trace_count: s.trace_count,
          loop_count: s.loop_count,
          fallback_count: s.fallback_count,
          first_trace_at: s.first_trace_at,
          last_trace_at: s.last_trace_at,
        };
      });

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/observabilidade/sessoes]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
