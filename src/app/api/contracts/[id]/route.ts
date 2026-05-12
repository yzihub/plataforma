import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  contractPropertyId,
  syncPropertyStatusForContract,
} from "@/lib/contracts/property-status";
import { syncFinancialRecordsForSignedContract } from "@/lib/contracts/financial-sync";
import { recordTimelineEvent } from "@/lib/timeline/events";
import { normalizeContractFinancialMetadata, parseBRLMoney } from "@/lib/contracts/money";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// ─── Helper: autenticar e resolver tenant_id ──────────────────────────────────

async function getAuthContext() {
  const supabase = await createClient();

  // DEV_BYPASS: skip auth in development — consistent with proxy.ts and TenantContext
  const isDevBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  if (isDevBypass) {
    return { supabase: createAdminClient(), user: null, tenantId: DEV_JUREMA_TENANT_ID, error: null, status: 200 };
  }

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isMissingMetadataColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return e.code === "42703" && /metadata/i.test(e.message ?? "");
}

function cleanMetadataPatch(value: unknown) {
  if (!isRecord(value)) return null;

  const cleaned = Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      if (typeof item !== "string") return [];
      return [[key, item.trim()]];
    }),
  );

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

// ─── GET /api/contracts/[id] ──────────────────────────────────────────────────
// Retorna um contrato do tenant autenticado para pre-preencher o editor.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const { supabase, tenantId, user, error, status } = await getAuthContext();

    if (error || !tenantId) {
      return NextResponse.json({ error }, { status });
    }

    let { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, tenant_id, lead_id, broker_id, lead_name, project_id, imovel_id, project_name, corretor_name, title, type, status, value, commission_percentage, commission_amount, notes, conteudo, metadata, signed_at, expires_at, created_at, updated_at")
      .eq("id", contractId)
      .eq("tenant_id", tenantId)
      .single();

    if (contractError && isMissingMetadataColumn(contractError)) {
      const retry = await supabase
        .from("contracts")
        .select("id, tenant_id, lead_id, broker_id, lead_name, project_id, imovel_id, project_name, corretor_name, title, type, status, value, commission_percentage, commission_amount, notes, conteudo, signed_at, expires_at, created_at, updated_at")
        .eq("id", contractId)
        .eq("tenant_id", tenantId)
        .single();
      contract = retry.data ? { ...retry.data, metadata: null } : retry.data;
      contractError = retry.error;
    }

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contrato nao encontrado" }, { status: 404 });
    }

    return NextResponse.json(contract, { status: 200 });
  } catch (err) {
    console.error("[GET /api/contracts/:id] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ─── PATCH /api/contracts/[id] ────────────────────────────────────────────────
// Atualiza status, notes, signed_at, file_url, file_name, title, type, value, expires_at

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const { supabase, tenantId, user, error, status } = await getAuthContext();

    if (error || !tenantId) {
      return NextResponse.json({ error }, { status });
    }

    // Verificar que o contrato pertence ao tenant
    const { data: existing, error: checkError } = await supabase
      .from("contracts")
      .select("id, tenant_id, status, imovel_id, project_id, broker_id, lead_name, project_name, corretor_name, value, commission_percentage, commission_amount, signed_at, metadata")
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
    const hasIncomingValue = Object.prototype.hasOwnProperty.call(body, "value") || Object.prototype.hasOwnProperty.call(body, "valor");
    const metadataValue = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>).valor_total
      : null;
    const normalizedValue = hasIncomingValue ? parseBRLMoney(body.value ?? body.valor ?? metadataValue) : null;
    if (normalizedValue !== null && normalizedValue <= 0) {
      return NextResponse.json({ error: "value deve ser um numero positivo" }, { status: 400 });
    }

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
      "lead_id",
      "imovel_id",
      "project_id",
      "broker_id",
      "lead_name",
      "project_name",
      "corretor_name",
      "conteudo",
      "commission_percentage",
      "commission_amount",
      "expires_at",
    ];

    const updateData: Record<string, unknown> = {};

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (normalizedValue !== null) {
      updateData.value = normalizedValue;
    }

    const metadataPatch = cleanMetadataPatch(body.metadata);
    if (metadataPatch || normalizedValue !== null) {
      const { data: metadataRow, error: metadataLoadError } = await supabase
        .from("contracts")
        .select("metadata")
        .eq("id", contractId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (metadataLoadError && !isMissingMetadataColumn(metadataLoadError)) {
        console.error("[PATCH /api/contracts/:id] metadata load error:", metadataLoadError);
        return NextResponse.json({ error: "Erro ao carregar metadata do contrato" }, { status: 500 });
      }

      if (!metadataLoadError) {
        const existingMetadata = isRecord(metadataRow?.metadata) ? metadataRow.metadata : {};
        const mergedMetadata = {
          ...existingMetadata,
          ...(metadataPatch ?? {}),
        };
        const valueForMetadata = normalizedValue ?? (typeof existing.value === "number" ? existing.value : 0);
        updateData.metadata = normalizeContractFinancialMetadata(mergedMetadata, valueForMetadata);
      }
    }

    if (body.lead_id && !body.lead_name) {
      const { data: lead } = await supabase
        .from("leads")
        .select("name")
        .eq("id", body.lead_id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (lead?.name) updateData.lead_name = lead.name;
    }

    if ((body.imovel_id || body.project_id) && !body.project_name) {
      const { data: imovel } = await supabase
        .from("imoveis")
        .select("titulo_comercial, bairro, referencia_unica, id_imovel")
        .eq("id", body.imovel_id ?? body.project_id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      const projectName = imovel
        ? [imovel.titulo_comercial, imovel.referencia_unica ?? imovel.id_imovel, imovel.bairro].filter(Boolean).join(" · ")
        : "";
      if (projectName) updateData.project_name = projectName;
    }

    if (body.broker_id && !body.corretor_name) {
      const { data: broker } = await supabase
        .from("corretores")
        .select("name")
        .eq("id", body.broker_id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (broker?.name) updateData.corretor_name = broker.name;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nenhum campo valido para atualizar" }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const nextStatus = typeof updateData.status === "string" ? updateData.status : null;

    // Auto-set signed_at quando status muda para assinado sem signed_at informado.
    if ((nextStatus === "signed" || nextStatus === "assinado") && !updateData.signed_at) {
      updateData.signed_at = new Date().toISOString();
    }

    let { data: updated, error: updateError } = await supabase
      .from("contracts")
      .update(updateData)
      .eq("id", contractId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (updateError && isMissingMetadataColumn(updateError) && "metadata" in updateData) {
      const { metadata: _metadata, ...fallbackUpdateData } = updateData;
      void _metadata;
      const retry = await supabase
        .from("contracts")
        .update(fallbackUpdateData)
        .eq("id", contractId)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      updated = retry.data;
      updateError = retry.error;
    }

    if (updateError) {
      console.error("[PATCH /api/contracts/:id] update error:", updateError);
      return NextResponse.json({ error: "Erro ao atualizar contrato" }, { status: 500 });
    }

    if (nextStatus === "draft" || nextStatus === "rascunho") {
      try {
        await recordTimelineEvent(supabase, {
          tenant_id: tenantId,
          lead_id: (updated ?? existing).lead_id ?? null,
          contract_id: contractId,
          imovel_id: contractPropertyId(updated ?? existing),
          corretor_id: (updated ?? existing).broker_id ?? null,
          event_type: "contract_draft",
          metadata: {
            source: "api/contracts/[id]",
            status: nextStatus,
          },
          created_by: user?.id ?? null,
        });
      } catch (timelineError) {
        console.error("[PATCH /api/contracts/:id] timeline contract_draft error:", timelineError);
      }
    }

    if (nextStatus === "sent" || nextStatus === "enviado" || nextStatus === "signed" || nextStatus === "assinado") {
      try {
        await syncPropertyStatusForContract({
          supabase,
          tenantId,
          propertyId: contractPropertyId(updated ?? existing),
          contractStatus: nextStatus,
        });
      } catch (propertyStatusError) {
        console.error("[PATCH /api/contracts/:id] property status sync error:", propertyStatusError);
        return NextResponse.json(
          { error: "Contrato atualizado, mas nao foi possivel atualizar o status operacional do imovel" },
          { status: 500 },
        );
      }
    }

    if (nextStatus === "sent" || nextStatus === "enviado") {
      try {
        await recordTimelineEvent(supabase, {
          tenant_id: tenantId,
          lead_id: (updated ?? existing).lead_id ?? null,
          contract_id: contractId,
          imovel_id: contractPropertyId(updated ?? existing),
          corretor_id: (updated ?? existing).broker_id ?? null,
          event_type: "contract_sent",
          metadata: {
            source: "api/contracts/[id]",
            status: nextStatus,
          },
          created_by: user?.id ?? null,
        });
      } catch (timelineError) {
        console.error("[PATCH /api/contracts/:id] timeline contract_sent error:", timelineError);
      }

      try {
        await recordTimelineEvent(supabase, {
          tenant_id: tenantId,
          lead_id: (updated ?? existing).lead_id ?? null,
          contract_id: contractId,
          imovel_id: contractPropertyId(updated ?? existing),
          corretor_id: (updated ?? existing).broker_id ?? null,
          event_type: "property_reserved",
          metadata: {
            source: "api/contracts/[id]",
            status: "em_negociacao",
          },
          created_by: user?.id ?? null,
        });
      } catch (timelineError) {
        console.error("[PATCH /api/contracts/:id] timeline property_reserved error:", timelineError);
      }
    }

    if (nextStatus === "signed" || nextStatus === "assinado") {
      try {
        await syncFinancialRecordsForSignedContract({
          supabase,
          tenantId,
          contract: updated ?? existing,
          property: null,
          broker: updated?.broker_id ? { id: updated.broker_id as string, name: updated.corretor_name ?? null } : null,
          createdBy: user?.id ?? null,
        });
      } catch (financialSyncError) {
        console.error("[PATCH /api/contracts/:id] financial sync error:", financialSyncError);
        return NextResponse.json(
          { error: "Contrato assinado, mas nao foi possivel gerar o lancamento financeiro" },
          { status: 500 },
        );
      }

      try {
        await recordTimelineEvent(supabase, {
          tenant_id: tenantId,
          lead_id: (updated ?? existing).lead_id ?? null,
          contract_id: contractId,
          imovel_id: contractPropertyId(updated ?? existing),
          corretor_id: (updated ?? existing).broker_id ?? null,
          event_type: "contract_signed",
          metadata: {
            source: "api/contracts/[id]",
            status: nextStatus,
          },
          created_by: user?.id ?? null,
        });
      } catch (timelineError) {
        console.error("[PATCH /api/contracts/:id] timeline contract_signed error:", timelineError);
      }

      try {
        await recordTimelineEvent(supabase, {
          tenant_id: tenantId,
          lead_id: (updated ?? existing).lead_id ?? null,
          contract_id: contractId,
          imovel_id: contractPropertyId(updated ?? existing),
          corretor_id: (updated ?? existing).broker_id ?? null,
          event_type: "property_sold",
          metadata: {
            source: "api/contracts/[id]",
            status: "vendido",
          },
          created_by: user?.id ?? null,
        });
      } catch (timelineError) {
        console.error("[PATCH /api/contracts/:id] timeline property_sold error:", timelineError);
      }
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/contracts/:id] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const { supabase, tenantId, error, status } = await getAuthContext();

    if (error || !tenantId) {
      return NextResponse.json({ error }, { status });
    }

    const { data: deleted, error: deleteError } = await supabase
      .from("contracts")
      .delete()
      .eq("id", contractId)
      .eq("tenant_id", tenantId)
      .select("id")
      .single();

    if (deleteError || !deleted) {
      console.error("[DELETE /api/contracts/:id] delete error:", deleteError);
      return NextResponse.json({ error: "Contrato nao encontrado ou sem permissao" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: deleted.id }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/contracts/:id] unexpected error:", err);
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
