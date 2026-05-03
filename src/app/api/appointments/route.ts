import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Appointment, AppointmentType, NewAppointmentInput } from "@/types/appointments";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCurrentTenantId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
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
      .select("*")
      .eq("tenant_id", tenantId)
      .order("start_at", { ascending: true });

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

    return NextResponse.json({ ok: true, appointment: data as Appointment }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/appointments] unexpected error:", err);
    return NextResponse.json({ ok: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}
