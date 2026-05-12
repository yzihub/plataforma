import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordTimelineEvent } from "@/lib/timeline/events";
import type { Appointment, AppointmentType, NewAppointmentInput } from "@/types/appointments";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCurrentTenantId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const isDevBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  if (isDevBypass) {
    return DEV_JUREMA_TENANT_ID;
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) return null;
  return profile.tenant_id as string;
}

const VALID_APPOINTMENT_TYPES: AppointmentType[] = [
  "visita",
  "reuniao",
  "retorno",
  "consulta",
  "outro",
];

async function validateTenantRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  body: Partial<NewAppointmentInput>
): Promise<string | null> {
  const relationChecks: Array<Promise<{ key: "lead_id" | "broker_id"; exists: boolean }>> = [];

  if (body.lead_id) {
    relationChecks.push(
      (async () => {
        const { data, error } = await supabase
          .from("leads")
          .select("id")
          .eq("id", body.lead_id)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        return { key: "lead_id" as const, exists: !error && !!data };
      })()
    );
  }

  if (body.broker_id) {
    relationChecks.push(
      (async () => {
        const { data, error } = await supabase
          .from("corretores")
          .select("id")
          .eq("id", body.broker_id)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        return { key: "broker_id" as const, exists: !error && !!data };
      })()
    );
  }

  const results = await Promise.all(relationChecks);

  for (const result of results) {
    if (!result.exists) {
      return result.key === "lead_id"
        ? "Lead inválido para o tenant atual."
        : "Corretor inválido para o tenant atual.";
    }
  }

  return null;
}

// ─── GET /api/appointments ────────────────────────────────────────────────────
// Retorna compromissos do tenant autenticado.
// Query params:
//   ?upcoming=true  →  filtra apenas start_at >= now()

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId(supabase);

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const upcoming = request.nextUrl.searchParams.get("upcoming") === "true";

    let query = supabase
      .from("appointments")
      .select("id, tenant_id, title, appointment_type, status, lead_id, broker_id, start_at, end_at, location, description, integration_provider, integration_status, external_event_id, metadata, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("start_at", { ascending: true })
      .limit(100);

    if (upcoming) {
      query = query.gte("start_at", new Date().toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/appointments] query error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, appointments: (data ?? []) as Appointment[] });
  } catch (err) {
    console.error("[GET /api/appointments] unexpected error:", err);
    return NextResponse.json({ ok: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ─── POST /api/appointments ───────────────────────────────────────────────────
// Cria um novo compromisso para o tenant autenticado.
// Body: NewAppointmentInput

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId(supabase);

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!isDevBypass && (authError || !user)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json() as Partial<NewAppointmentInput>;

    // ── Validação dos campos obrigatórios ────────────────────────────────────

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { ok: false, error: "Campo 'title' é obrigatório e não pode ser vazio." },
        { status: 400 }
      );
    }

    if (
      !body.appointment_type ||
      !VALID_APPOINTMENT_TYPES.includes(body.appointment_type as AppointmentType)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: `Campo 'appointment_type' inválido. Valores aceitos: ${VALID_APPOINTMENT_TYPES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if (!body.start_at || isNaN(Date.parse(body.start_at))) {
      return NextResponse.json(
        { ok: false, error: "Campo 'start_at' é obrigatório e deve ser uma data ISO válida." },
        { status: 400 }
      );
    }

    // ── Whitelist de campos permitidos ────────────────────────────────────────
    // integration_provider e integration_status NÃO vêm do body — definidos pelo servidor.

    const relationError = await validateTenantRelations(supabase, tenantId, body);
    if (relationError) {
      return NextResponse.json({ ok: false, error: relationError }, { status: 400 });
    }

    const insertPayload: Record<string, unknown> = {
      tenant_id:        tenantId,
      title:            body.title.trim(),
      appointment_type: body.appointment_type,
      start_at:         body.start_at,
    };

    // Campos opcionais com whitelist explícita
    if (body.status)      insertPayload.status      = body.status;
    if (body.lead_id)     insertPayload.lead_id     = body.lead_id;
    if (body.broker_id)   insertPayload.broker_id   = body.broker_id;
    if (body.end_at)      insertPayload.end_at      = body.end_at;
    if (body.location)    insertPayload.location    = body.location;
    if (body.description) insertPayload.description = body.description;
    if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
      insertPayload.metadata = body.metadata;
    }

    // ── Inserção ──────────────────────────────────────────────────────────────

    const { data, error } = await supabase
      .from("appointments")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/appointments] insert error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (body.appointment_type === "visita") {
      try {
        await recordTimelineEvent(supabase, {
          tenant_id: tenantId,
          lead_id: body.lead_id ?? null,
          corretor_id: body.broker_id ?? null,
          event_type: "property_presented",
          metadata: {
            source: "api/appointments",
            appointment_id: data.id,
            appointment_type: body.appointment_type,
            start_at: body.start_at,
            location: body.location ?? null,
          },
          created_by: user?.id ?? null,
        });
      } catch (timelineError) {
        console.error("[POST /api/appointments] timeline property_presented error:", timelineError);
      }
    }

    return NextResponse.json({ ok: true, appointment: data as Appointment }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/appointments] unexpected error:", err);
    return NextResponse.json({ ok: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}
