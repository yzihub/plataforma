import { NextRequest, NextResponse } from "next/server";

// ─── GET /api/contracts/[id]/pdf ──────────────────────────────────────────────
// Placeholder — geração de PDF não implementada ainda.
// TODO: implementar geração de PDF via puppeteer, html-pdf ou serviço externo.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.info(`[GET /api/contracts/${id}/pdf] PDF generation not yet implemented`);
  return NextResponse.json(
    { error: "Geracao de PDF nao implementada", contractId: id },
    { status: 501 }
  );
}
