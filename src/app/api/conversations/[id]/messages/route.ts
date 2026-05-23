import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ─── GET /api/conversations/[id]/messages ────────────────────────────────────
// Retorna mensagens de uma conversation.
// Usa createAdminClient — bypass RLS, mesmo padrão de /api/imoveis.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("conversation_messages")
      .select(
        "id, conversation_id, content, direction, sender_type, created_at"
      )
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("[GET /api/conversations/[id]/messages] error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { data: data ?? [], conversation_id: id },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[GET /api/conversations/[id]/messages] erro interno:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
