import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

export const dynamic = "force-dynamic";

// ─── GET /api/conversations ───────────────────────────────────────────────────
// Retorna conversations do tenant ativo, com dados do lead mergeados em memória.
// Usa createAdminClient (bypass RLS) — mesmo padrão de /api/imoveis.

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) {
        return NextResponse.json(
          { error: "Perfil nao encontrado" },
          { status: 401 }
        );
      }

      tenantId = profile.tenant_id as string;
    }

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(
        "id, tenant_id, lead_id, ai_paused, last_message, last_message_at, created_at"
      )
      .eq("tenant_id", tenantId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) {
      console.error("[GET /api/conversations] query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Merge leads em memória (sem FK constraint no schema cache)
    const leadIds = [
      ...new Set(
        (conversations ?? [])
          .map((c) => c.lead_id)
          .filter(Boolean) as string[]
      ),
    ];

    let leadsMap: Record<
      string,
      { id: string; name: string | null; phone: string | null }
    > = {};

    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, name, phone")
        .in("id", leadIds);
      leadsMap = Object.fromEntries((leads ?? []).map((l) => [l.id, l]));
    }

    const data = (conversations ?? []).map((conv) => ({
      ...conv,
      leads: conv.lead_id ? (leadsMap[conv.lead_id] ?? null) : null,
    }));

    return NextResponse.json(
      { data, tenantId },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[GET /api/conversations] erro interno:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
