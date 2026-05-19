import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCognitiveSeverity } from "@/lib/cockpit/severity";
import type { ReplayDirection, ReplayFrame } from "@/lib/cockpit/types";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

export const dynamic = "force-dynamic";

function computeDirection(
  from: string | null,
  to: string | null,
  loopDetected: boolean,
  validTransition: boolean | null
): ReplayDirection {
  if (loopDetected) return "loop";
  if (!from) return "início";
  if (from === to) return "estável";
  if (validTransition === false) return "regressão";
  return "avanço";
}

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
        `runtime_trace_id,
         runtime_state, previous_runtime_state,
         objective_state, next_action,
         loop_detected, loop_risk, fallback_triggered,
         retrieval_policy, retrieval_allowed, valid_transition,
         latency_ms, created_at`
      )
      .eq("tenant_id", tenantId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/observabilidade/sessoes/[id]/replay]", error);
      return NextResponse.json(
        { error: "Erro ao buscar replay" },
        { status: 500 }
      );
    }

    if (!traces || traces.length === 0) {
      return NextResponse.json(
        { error: "Sessao nao encontrada" },
        { status: 404 }
      );
    }

    const frames: ReplayFrame[] = traces.map((t, i) => {
      const loopDetected = t.loop_detected ?? false;
      const validTransition = t.valid_transition ?? null;
      return {
        runtime_trace_id: t.runtime_trace_id,
        sequence: i + 1,
        direction: computeDirection(
          t.previous_runtime_state ?? null,
          t.runtime_state ?? null,
          loopDetected,
          validTransition
        ),
        previous_runtime_state: t.previous_runtime_state ?? null,
        runtime_state: t.runtime_state ?? null,
        // Carry prior frame's objective_state as previous
        previous_objective_state: i > 0 ? (traces[i - 1].objective_state ?? null) : null,
        objective_state: t.objective_state ?? null,
        next_action: t.next_action ?? null,
        loop_detected: loopDetected,
        fallback_triggered: t.fallback_triggered ?? false,
        retrieval_policy: t.retrieval_policy ?? null,
        retrieval_allowed: t.retrieval_allowed ?? null,
        valid_transition: validTransition,
        latency_ms: t.latency_ms ?? null,
        severity: computeCognitiveSeverity({
          loop_detected: loopDetected,
          loop_risk: t.loop_risk ?? null,
          valid_transition: validTransition,
          fallback_triggered: t.fallback_triggered ?? false,
          retrieval_allowed: t.retrieval_allowed ?? null,
        }),
        created_at: t.created_at,
      };
    });

    return NextResponse.json({ frames }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/observabilidade/sessoes/[id]/replay]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
