import { NextResponse } from "next/server";
import { getInstanceStatus } from "@/lib/evolution/client";

export const dynamic = "force-dynamic";

// ─── GET /api/evolution/status ────────────────────────────────────────────────
// Returns the current WhatsApp connection status.
// When EVOLUTION_* env vars are missing, returns pendente_configuracao without
// making any external calls — safe for CI and dev environments without credentials.

export async function GET() {
  try {
    const data = await getInstanceStatus();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[GET /api/evolution/status]", err);
    return NextResponse.json(
      {
        ok: true,
        configured: false,
        status: "erro",
        message: "Falha interna ao consultar status",
      },
      { status: 500 }
    );
  }
}
