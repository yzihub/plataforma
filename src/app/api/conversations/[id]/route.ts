import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── PATCH /api/conversations/[id] ───────────────────────────────────────────
// Atualiza campos de uma conversation (ex: ai_paused).
// Usa createAdminClient — bypass RLS, mesmo padrão de /api/imoveis.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("conversations")
      .update(body)
      .eq("id", id);

    if (error) {
      console.error("[PATCH /api/conversations/[id]] error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/conversations/[id]] erro interno:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
