import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// ─── PATCH /api/followups/[id] ────────────────────────────────────────────────
// Atualiza status de uma follow_up_task. Aceita action=resolver|ignorar.
// resolver -> status='resolvido', resolved_at=now
// ignorar  -> status='ignorado',  resolved_at=now

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id invalido" }, { status: 400 });
    }

    const admin = createAdminClient();

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

      const { data: profile, error: profileError } = await admin
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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : null;

    let nextStatus: "resolvido" | "ignorado" | null = null;
    if (action === "resolver") nextStatus = "resolvido";
    else if (action === "ignorar") nextStatus = "ignorado";

    if (!nextStatus) {
      return NextResponse.json(
        { error: "action invalido (use 'resolver' ou 'ignorar')" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("follow_up_tasks")
      .update({
        status: nextStatus,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/followups/[id]] update error:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar follow-up" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Follow-up nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, task: data }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/followups/[id]] unexpected:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
