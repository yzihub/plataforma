import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ─── PATCH /api/conversations/[id] ───────────────────────────────────────────
// Atualiza campos de uma conversation (ex: ai_paused).
// Usa createAdminClient — bypass RLS, mesmo padrão de /api/imoveis.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { ai_paused?: unknown };
    const supabase = createAdminClient();

    if (typeof body.ai_paused !== "boolean") {
      return NextResponse.json(
        { error: "ai_paused booleano obrigatorio" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("conversations")
      .update({
        ai_paused: body.ai_paused,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, tenant_id, lead_id, ai_paused, last_message, last_message_at, created_at")
      .single();

    if (error) {
      console.error("[PATCH /api/conversations/[id]] error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[PATCH /api/conversations/[id]] erro interno:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
