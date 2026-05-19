import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CognitiveHealthData } from "@/lib/cockpit/types";

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

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: traces, error } = await supabase
      .from("ju_runtime_traces")
      .select(
        "conversation_id, loop_detected, fallback_triggered, status, valid_transition, retrieval_allowed, latency_ms"
      )
      .eq("tenant_id", tenantId)
      .gte("created_at", since24h);

    if (error) {
      console.error("[GET /api/observabilidade/health]", error);
      return NextResponse.json(
        { error: "Erro ao buscar traces" },
        { status: 500 }
      );
    }

    const rows = traces ?? [];

    const conversas_ativas = new Set(
      rows.map((r) => r.conversation_id).filter(Boolean)
    ).size;
    const loops_detectados = rows.filter((r) => r.loop_detected === true).length;
    const fallbacks = rows.filter((r) => r.fallback_triggered === true).length;
    const erros = rows.filter((r) => r.status === "error").length;
    const transicoes_irregulares = rows.filter(
      (r) => r.valid_transition === false
    ).length;
    const recuperacoes_ativas = rows.filter(
      (r) => r.retrieval_allowed === true
    ).length;

    const latencies = rows
      .map((r) => r.latency_ms)
      .filter((ms): ms is number => ms !== null && typeof ms === "number");

    const latencia_media_ms =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null;
    const latencia_maxima_ms =
      latencies.length > 0 ? Math.max(...latencies) : null;

    const payload: CognitiveHealthData = {
      total_traces: rows.length,
      loops_detectados,
      fallbacks,
      erros,
      transicoes_irregulares,
      latencia_media_ms,
      latencia_maxima_ms,
      recuperacoes_ativas,
      conversas_ativas,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[GET /api/observabilidade/health]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
