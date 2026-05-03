import { NextResponse } from "next/server";
import { fetchQrCode } from "@/lib/evolution/client";

export const dynamic = "force-dynamic";

// ─── POST /api/evolution/qr ───────────────────────────────────────────────────
// Generates/refreshes QR code for WhatsApp instance connection.
// Returns qr:null and pendente_configuracao when env vars are not set.

export async function POST(_req: Request) {
  try {
    const data = await fetchQrCode();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[POST /api/evolution/qr]", err);
    return NextResponse.json(
      {
        ok: true,
        configured: false,
        status: "erro",
        qr: null,
        message: "Falha interna ao gerar QR code",
      },
      { status: 500 }
    );
  }
}
