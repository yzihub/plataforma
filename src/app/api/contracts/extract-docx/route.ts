import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

// ─── POST /api/contracts/extract-docx ────────────────────────────────────────
// Recebe um arquivo .doc/.docx via multipart/form-data e retorna o texto extraído.
// O texto pode conter placeholders {{var}} se o documento foi criado com eles.

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    const allowed = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword", "application/octet-stream"];
    const name = file.name.toLowerCase();
    if (!name.endsWith(".docx") && !name.endsWith(".doc")) {
      return NextResponse.json({ error: "Formato inválido. Envie um arquivo .doc ou .docx" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });

    return NextResponse.json({ text: result.value }, { status: 200 });
  } catch (err) {
    console.error("extract-docx error:", err);
    return NextResponse.json({ error: "Erro ao processar o arquivo" }, { status: 500 });
  }
}
