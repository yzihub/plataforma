import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── Helper: autenticar e resolver tenant_id ──────────────────────────────────

async function getAuthContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, tenantId: null, error: "Nao autenticado", status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    return { supabase, user, tenantId: null, error: "Perfil nao encontrado", status: 401 };
  }

  return { supabase, user, tenantId: profile.tenant_id as string, error: null, status: 200 };
}

// ─── PATCH /api/contracts/[id] ────────────────────────────────────────────────
// Atualiza status, notes, signed_at, file_url, file_name, title, type, value, expires_at

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const { supabase, tenantId, error, status } = await getAuthContext();

    if (error || !tenantId) {
      return NextResponse.json({ error }, { status });
    }

    // Verificar que o contrato pertence ao tenant
    const { data: existing, error: checkError } = await supabase
      .from("contracts")
      .select("id, tenant_id, status")
      .eq("id", contractId)
      .eq("tenant_id", tenantId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: "Contrato nao encontrado ou sem permissao" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Campos permitidos para atualizacao
    const ALLOWED_FIELDS = [
      "status",
      "notes",
      "signed_at",
      "file_url",
      "file_name",
      "title",
      "type",
      "value",
      "expires_at",
    ];

    const updateData: Record<string, unknown> = {};

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nenhum campo valido para atualizar" }, { status: 400 });
    }

    // Auto-set signed_at quando status muda para 'assinado' sem signed_at informado
    if (updateData.status === "assinado" && !updateData.signed_at) {
      updateData.signed_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from("contracts")
      .update(updateData)
      .eq("id", contractId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (updateError) {
      console.error("[PATCH /api/contracts/:id] update error:", updateError);
      return NextResponse.json({ error: "Erro ao atualizar contrato" }, { status: 500 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/contracts/:id] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ─── POST /api/contracts/[id] ─────────────────────────────────────────────────
// Upload de arquivo PDF/DOCX vinculado ao contrato

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const { supabase, tenantId, error, status } = await getAuthContext();

    if (error || !tenantId) {
      return NextResponse.json({ error }, { status });
    }

    // Verificar que o contrato pertence ao tenant
    const { data: existing, error: checkError } = await supabase
      .from("contracts")
      .select("id, tenant_id")
      .eq("id", contractId)
      .eq("tenant_id", tenantId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: "Contrato nao encontrado ou sem permissao" },
        { status: 403 }
      );
    }

    // Ler FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 });
    }

    // Validar tipo de arquivo
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo nao permitido. Use PDF ou DOCX." },
        { status: 400 }
      );
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Maximo 10MB." },
        { status: 400 }
      );
    }

    // Converter para buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Definir caminho no storage: {tenantId}/{contractId}/{filename}
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${tenantId}/${contractId}/${safeFileName}`;

    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("contracts")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[POST /api/contracts/:id] upload error:", uploadError);
      return NextResponse.json({ error: "Erro ao fazer upload do arquivo" }, { status: 500 });
    }

    // Gerar URL assinada (1 hora)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("contracts")
      .createSignedUrl(storagePath, 3600);

    if (urlError || !signedUrlData?.signedUrl) {
      console.error("[POST /api/contracts/:id] signed URL error:", urlError);
      return NextResponse.json({ error: "Erro ao gerar URL do arquivo" }, { status: 500 });
    }

    const fileUrl = signedUrlData.signedUrl;

    // Atualizar contrato com file_url e file_name
    const { data: updated, error: updateError } = await supabase
      .from("contracts")
      .update({ file_url: fileUrl, file_name: file.name })
      .eq("id", contractId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (updateError) {
      console.error("[POST /api/contracts/:id] contract update error:", updateError);
      return NextResponse.json({ error: "Arquivo enviado mas falha ao atualizar contrato" }, { status: 500 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("[POST /api/contracts/:id] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
