import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_TEMPLATES } from "@/types/contract-templates";

// ─── GET /api/contracts/templates ─────────────────────────────────────────────
// Lista templates disponíveis.
// Sem ?id   → retorna { templates: [{ id, label, type }] } (sem body — payload leve)
// Com ?id=X → retorna template completo { id, label, type, body }

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const template = CONTRACT_TEMPLATES.find((t) => t.id === id);
    if (!template) {
      return NextResponse.json({ error: "Template nao encontrado" }, { status: 404 });
    }
    return NextResponse.json(template, { status: 200 });
  }

  // Lista resumida (sem body) para reduzir payload
  const templates = CONTRACT_TEMPLATES.map(({ id, label, type }) => ({ id, label, type }));
  return NextResponse.json({ templates }, { status: 200 });
}
