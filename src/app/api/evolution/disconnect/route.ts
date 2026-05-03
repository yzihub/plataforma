import { NextResponse } from "next/server";
import { disconnectInstance } from "@/lib/evolution/client";

export const dynamic = "force-dynamic";

// ─── POST /api/evolution/disconnect ──────────────────────────────────────────
// Disconnects (logs out) the WhatsApp instance.
// Returns pendente_configuracao without making external calls when env not set.

export async function POST(_req: Request) {
  try {
    const data = await disconnectInstance();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[POST /api/evolution/disconnect]", err);
    return NextResponse.json(
      {
        ok: true,
        configured: false,
        status: "erro",
        message: "Falha interna ao desconectar instancia",
      },
      { status: 500 }
    );
  }
}
