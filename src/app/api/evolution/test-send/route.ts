import { NextResponse } from "next/server";
import { sendTestMessage } from "@/lib/evolution/client";

export const dynamic = "force-dynamic";

// ─── POST /api/evolution/test-send ───────────────────────────────────────────
// Sends a test WhatsApp message via Evolution API.
// Validates `phone` BEFORE checking env vars — ensures bad requests get 400
// even in unconfigured environments.

export async function POST(req: Request) {
  // Parse body — gracefully handle malformed JSON
  const body = await req.json().catch(() => ({}));

  // Validate phone FIRST (before env check per spec)
  if (!body.phone || typeof body.phone !== "string") {
    return NextResponse.json({ error: "phone obrigatorio" }, { status: 400 });
  }

  try {
    const data = await sendTestMessage({
      phone: body.phone,
      message: typeof body.message === "string" ? body.message : undefined,
    });
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[POST /api/evolution/test-send]", err);
    return NextResponse.json(
      {
        ok: true,
        configured: false,
        status: "erro",
        sent: false,
        message: "Falha interna ao enviar mensagem de teste",
      },
      { status: 500 }
    );
  }
}
