import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { timingSafeEqual } from "crypto";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_TENANTS = new Set([
  "b179ae75-3d56-4de8-8840-fc9c4d9ec21e", // Café com Pam
  "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361", // Jurema Brokers
]);

const VALID_EVENTOS = new Set([
  "imovel.upsert",
  "imovel.delete",
  "imovel.unpublish",
]);

const KNOWN_TEXT_FIELDS = [
  "titulo_comercial",
  "titulo_seo",
  "descricao_imovel",
  "tipo_de_imovel",
  "finalidade",
  "bairro",
  "foto_principal",
  "link_do_imovel",
  "link_sanitizado",
  "imagem_card",
  "status_publicacao",
  "status_operacional",
] as const;

const KNOWN_TEXT_OR_NUMBER_FIELDS = ["quartos", "suites", "vagas"] as const;

const KNOWN_NUMERIC_FIELDS = ["metragem", "valor"] as const;

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Logger ───────────────────────────────────────────────────────────────────

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  event: string;
  tenant_id?: string;
  id_imovel?: string;
  evento?: string;
  http_status?: number;
  duration_ms?: number;
  source?: string;
  error_code?: string;
  trace_id: string;
}

function structuredLog(entry: LogEntry): void {
  console.log(JSON.stringify(entry));
}

// ─── POST /api/webhook/imoveis ────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const trace_id = crypto.randomUUID();
  const source = request.headers.get("x-source") ?? undefined;

  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    structuredLog({
      timestamp: new Date().toISOString(),
      level: "warn",
      event: "webhook.imoveis.auth_failed",
      http_status: 401,
      duration_ms: Date.now() - startTime,
      source,
      error_code: "unauthorized",
      trace_id,
    });
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const incomingToken = authHeader.slice("Bearer ".length);
  const secret = process.env.WEBHOOK_IMOVEIS_SECRET ?? "";

  let tokenValid = false;
  try {
    const incomingBuf = Buffer.from(incomingToken);
    const secretBuf = Buffer.from(secret);
    if (incomingBuf.length === secretBuf.length) {
      tokenValid = timingSafeEqual(incomingBuf, secretBuf);
    }
  } catch {
    tokenValid = false;
  }

  if (!tokenValid) {
    structuredLog({
      timestamp: new Date().toISOString(),
      level: "warn",
      event: "webhook.imoveis.auth_failed",
      http_status: 401,
      duration_ms: Date.now() - startTime,
      source,
      error_code: "unauthorized",
      trace_id,
    });
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  // ── 2. Content-Type ──────────────────────────────────────────────────────────
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    structuredLog({
      timestamp: new Date().toISOString(),
      level: "warn",
      event: "webhook.imoveis.rejected",
      http_status: 415,
      duration_ms: Date.now() - startTime,
      source,
      error_code: "unsupported_media_type",
      trace_id,
    });
    return NextResponse.json(
      { ok: false, error: "unsupported_media_type" },
      { status: 415 }
    );
  }

  // ── 3. Parse JSON ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (err) {
    structuredLog({
      timestamp: new Date().toISOString(),
      level: "warn",
      event: "webhook.imoveis.rejected",
      http_status: 400,
      duration_ms: Date.now() - startTime,
      source,
      error_code: "malformed_json",
      trace_id,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "malformed_json",
        message: `JSON parse failed: ${err instanceof Error ? err.message : "unknown error"}`,
      },
      { status: 400 }
    );
  }

  const { evento, tenant_id, id_imovel, data } = body;

  // ── 4. Validar evento ────────────────────────────────────────────────────────
  if (typeof evento !== "string" || !VALID_EVENTOS.has(evento)) {
    structuredLog({
      timestamp: new Date().toISOString(),
      level: "warn",
      event: "webhook.imoveis.rejected",
      tenant_id: typeof tenant_id === "string" ? tenant_id : undefined,
      id_imovel: typeof id_imovel === "string" ? id_imovel : undefined,
      evento: typeof evento === "string" ? evento : undefined,
      http_status: 422,
      duration_ms: Date.now() - startTime,
      source,
      error_code: "invalid_event",
      trace_id,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_event",
        message: `Campo 'evento' deve ser um dos valores: imovel.upsert, imovel.delete, imovel.unpublish. Recebido: ${String(evento)}`,
        details: {
          field: "evento",
          reason: `invalid value: ${String(evento)}`,
        },
      },
      { status: 422 }
    );
  }

  // ── 5. Validar tenant_id ─────────────────────────────────────────────────────
  if (
    typeof tenant_id !== "string" ||
    !UUID_V4_REGEX.test(tenant_id) ||
    !ALLOWED_TENANTS.has(tenant_id)
  ) {
    structuredLog({
      timestamp: new Date().toISOString(),
      level: "warn",
      event: "webhook.imoveis.rejected",
      tenant_id: typeof tenant_id === "string" ? tenant_id : undefined,
      id_imovel: typeof id_imovel === "string" ? id_imovel : undefined,
      evento,
      http_status: 422,
      duration_ms: Date.now() - startTime,
      source,
      error_code: "invalid_tenant",
      trace_id,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_tenant",
        message: `Campo 'tenant_id' deve ser um UUID v4 válido e estar na whitelist de tenants permitidos.`,
        details: {
          field: "tenant_id",
          reason: !UUID_V4_REGEX.test(String(tenant_id))
            ? "invalid UUID v4 format"
            : "tenant not in whitelist",
        },
      },
      { status: 422 }
    );
  }

  // ── 6. Validar id_imovel ─────────────────────────────────────────────────────
  if (
    typeof id_imovel !== "string" ||
    id_imovel.trim().length === 0 ||
    id_imovel.length > 100
  ) {
    structuredLog({
      timestamp: new Date().toISOString(),
      level: "warn",
      event: "webhook.imoveis.rejected",
      tenant_id,
      id_imovel: typeof id_imovel === "string" ? id_imovel : undefined,
      evento,
      http_status: 422,
      duration_ms: Date.now() - startTime,
      source,
      error_code: "invalid_id_imovel",
      trace_id,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_id_imovel",
        message:
          "Campo 'id_imovel' deve ser uma string não vazia com no máximo 100 caracteres.",
        details: {
          field: "id_imovel",
          reason:
            typeof id_imovel !== "string"
              ? "expected string"
              : id_imovel.trim().length === 0
                ? "empty string"
                : "exceeds 100 characters",
        },
      },
      { status: 422 }
    );
  }

  // ── Log received ─────────────────────────────────────────────────────────────
  structuredLog({
    timestamp: new Date().toISOString(),
    level: "info",
    event: "webhook.imoveis.received",
    tenant_id,
    id_imovel,
    evento,
    source,
    trace_id,
  });

  // ── 7 & 8. Validações específicas para upsert ─────────────────────────────────
  if (evento === "imovel.upsert") {
    if (
      data === null ||
      data === undefined ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      structuredLog({
        timestamp: new Date().toISOString(),
        level: "warn",
        event: "webhook.imoveis.rejected",
        tenant_id,
        id_imovel,
        evento,
        http_status: 422,
        duration_ms: Date.now() - startTime,
        source,
        error_code: "missing_data",
        trace_id,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "missing_data",
          message:
            "Campo 'data' é obrigatório para imovel.upsert e deve ser um objeto.",
          details: {
            field: "data",
            reason:
              data === null || data === undefined
                ? "field missing"
                : Array.isArray(data)
                  ? "expected object, got array"
                  : `expected object, got ${typeof data}`,
          },
        },
        { status: 422 }
      );
    }

    const dataObj = data as Record<string, unknown>;

    // Validate text fields
    for (const field of KNOWN_TEXT_FIELDS) {
      if (field in dataObj && dataObj[field] !== null) {
        if (typeof dataObj[field] !== "string") {
          structuredLog({
            timestamp: new Date().toISOString(),
            level: "warn",
            event: "webhook.imoveis.rejected",
            tenant_id,
            id_imovel,
            evento,
            http_status: 422,
            duration_ms: Date.now() - startTime,
            source,
            error_code: "invalid_field_type",
            trace_id,
          });
          return NextResponse.json(
            {
              ok: false,
              error: "invalid_field_type",
              message: `Campo '${field}' deve ser uma string.`,
              details: {
                field: `data.${field}`,
                reason: `expected string, got ${typeof dataObj[field]}`,
              },
            },
            { status: 422 }
          );
        }
      }
    }

    // Validate text or number fields (quartos, suites, vagas)
    for (const field of KNOWN_TEXT_OR_NUMBER_FIELDS) {
      if (field in dataObj && dataObj[field] !== null) {
        if (
          typeof dataObj[field] !== "string" &&
          typeof dataObj[field] !== "number"
        ) {
          structuredLog({
            timestamp: new Date().toISOString(),
            level: "warn",
            event: "webhook.imoveis.rejected",
            tenant_id,
            id_imovel,
            evento,
            http_status: 422,
            duration_ms: Date.now() - startTime,
            source,
            error_code: "invalid_field_type",
            trace_id,
          });
          return NextResponse.json(
            {
              ok: false,
              error: "invalid_field_type",
              message: `Campo '${field}' deve ser string ou número.`,
              details: {
                field: `data.${field}`,
                reason: `expected string or number, got ${typeof dataObj[field]}`,
              },
            },
            { status: 422 }
          );
        }
      }
    }

    // Validate numeric fields (metragem, valor) — string numerics are rejected
    for (const field of KNOWN_NUMERIC_FIELDS) {
      if (field in dataObj && dataObj[field] !== null) {
        if (typeof dataObj[field] !== "number") {
          structuredLog({
            timestamp: new Date().toISOString(),
            level: "warn",
            event: "webhook.imoveis.rejected",
            tenant_id,
            id_imovel,
            evento,
            http_status: 422,
            duration_ms: Date.now() - startTime,
            source,
            error_code: "invalid_field_type",
            trace_id,
          });
          return NextResponse.json(
            {
              ok: false,
              error: "invalid_field_type",
              message: `Campo '${field}' deve ser numérico.`,
              details: {
                field: `data.${field}`,
                reason: `expected numeric, got ${typeof dataObj[field]}`,
              },
            },
            { status: 422 }
          );
        }
      }
    }

    // Validate metadata field
    if ("metadata" in dataObj && dataObj.metadata !== null) {
      if (
        typeof dataObj.metadata !== "object" ||
        Array.isArray(dataObj.metadata)
      ) {
        structuredLog({
          timestamp: new Date().toISOString(),
          level: "warn",
          event: "webhook.imoveis.rejected",
          tenant_id,
          id_imovel,
          evento,
          http_status: 422,
          duration_ms: Date.now() - startTime,
          source,
          error_code: "invalid_field_type",
          trace_id,
        });
        return NextResponse.json(
          {
            ok: false,
            error: "invalid_field_type",
            message: "Campo 'metadata' deve ser um objeto JSON.",
            details: {
              field: "data.metadata",
              reason: Array.isArray(dataObj.metadata)
                ? "expected object, got array"
                : `expected object, got ${typeof dataObj.metadata}`,
            },
          },
          { status: 422 }
        );
      }
    }
  }

  // ── 9. Execute action ─────────────────────────────────────────────────────────
  const admin = createAdminClient();

  try {
    if (evento === "imovel.upsert") {
      const dataObj = data as Record<string, unknown>;

      // ── Determine created: SELECT before upsert ──
      const { data: existing } = await admin
        .from("imoveis")
        .select("id, metadata")
        .eq("tenant_id", tenant_id)
        .eq("id_imovel", id_imovel)
        .maybeSingle();

      const wasCreated = existing === null;

      // ── Build upsert payload with only present fields (merge partial via COALESCE) ──
      // Only include fields that are present in data — absent fields are not included,
      // so Supabase ON CONFLICT DO UPDATE will not touch those columns.
      const payload: Record<string, unknown> = {
        tenant_id,
        id_imovel,
        updated_at: new Date().toISOString(),
      };

      // Text fields
      for (const field of KNOWN_TEXT_FIELDS) {
        if (field in dataObj) {
          payload[field] = dataObj[field]; // null is allowed (clears the column)
        }
      }

      // Text-or-number fields: convert to string before persisting
      for (const field of KNOWN_TEXT_OR_NUMBER_FIELDS) {
        if (field in dataObj) {
          payload[field] =
            dataObj[field] !== null ? String(dataObj[field]) : null;
        }
      }

      // Numeric fields
      for (const field of KNOWN_NUMERIC_FIELDS) {
        if (field in dataObj) {
          payload[field] = dataObj[field];
        }
      }

      // metadata: client-side merge (|| semantics: merge objects, null removes key)
      // Per implementation_note: SELECT existing → merge in JS → include in upsert
      if ("metadata" in dataObj) {
        const incomingMeta =
          dataObj.metadata !== null
            ? (dataObj.metadata as Record<string, unknown>)
            : null;

        if (incomingMeta === null) {
          // Explicit null: clear metadata
          payload.metadata = null;
        } else {
          const existingMeta =
            existing?.metadata !== null &&
            typeof existing?.metadata === "object"
              ? (existing.metadata as Record<string, unknown>)
              : {};

          // Merge: existing keys preserved, incoming keys overwrite, null values remove keys
          const merged = { ...existingMeta, ...incomingMeta };

          // Remove keys set to null (jsonb_strip_nulls equivalent)
          const mergedClean = Object.fromEntries(
            Object.entries(merged).filter(([, v]) => v !== null)
          );

          payload.metadata = mergedClean;
        }
      }

      const { data: upserted, error: upsertError } = await admin
        .from("imoveis")
        .upsert(payload, { onConflict: "tenant_id,id_imovel" })
        .select("id")
        .single();

      if (upsertError) {
        throw upsertError;
      }

      structuredLog({
        timestamp: new Date().toISOString(),
        level: "info",
        event: "webhook.imoveis.upserted",
        tenant_id,
        id_imovel,
        evento,
        http_status: 200,
        duration_ms: Date.now() - startTime,
        source,
        trace_id,
      });

      return NextResponse.json(
        {
          ok: true,
          action: "upserted",
          created: wasCreated,
          id_imovel,
          tenant_id,
          imovel_id: upserted.id,
        },
        { status: 200 }
      );
    }

    if (evento === "imovel.delete") {
      const { data: deleted, error: deleteError } = await admin
        .from("imoveis")
        .delete()
        .eq("tenant_id", tenant_id)
        .eq("id_imovel", id_imovel)
        .select("id");

      if (deleteError) {
        throw deleteError;
      }

      const found = (deleted?.length ?? 0) > 0;

      structuredLog({
        timestamp: new Date().toISOString(),
        level: "info",
        event: "webhook.imoveis.deleted",
        tenant_id,
        id_imovel,
        evento,
        http_status: 200,
        duration_ms: Date.now() - startTime,
        source,
        trace_id,
      });

      return NextResponse.json(
        {
          ok: true,
          action: "delete",
          found,
          id_imovel,
          tenant_id,
        },
        { status: 200 }
      );
    }

    // evento === "imovel.unpublish"
    const { data: unpublished, error: unpublishError } = await admin
      .from("imoveis")
      .update({
        status_publicacao: "Despublicado",
        status_operacional: "indisponivel",
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenant_id)
      .eq("id_imovel", id_imovel)
      .select("id");

    if (unpublishError) {
      throw unpublishError;
    }

    const found = (unpublished?.length ?? 0) > 0;

    structuredLog({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "webhook.imoveis.unpublished",
      tenant_id,
      id_imovel,
      evento,
      http_status: 200,
      duration_ms: Date.now() - startTime,
      source,
      trace_id,
    });

    return NextResponse.json(
      {
        ok: true,
        action: "unpublish",
        found,
        id_imovel,
        tenant_id,
      },
      { status: 200 }
    );
  } catch (err) {
    const errMessage =
      err instanceof Error ? err.message : "unknown database error";

    structuredLog({
      timestamp: new Date().toISOString(),
      level: "error",
      event: "webhook.imoveis.error",
      tenant_id,
      id_imovel,
      evento,
      http_status: 500,
      duration_ms: Date.now() - startTime,
      source,
      error_code: "internal_error",
      trace_id,
    });

    console.error(`[webhook.imoveis] internal error trace_id=${trace_id}:`, errMessage);

    return NextResponse.json(
      { ok: false, error: "internal_error", trace_id },
      { status: 500 }
    );
  }
}
