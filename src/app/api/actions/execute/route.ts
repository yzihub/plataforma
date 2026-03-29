import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const VALID_ACTIONS = [
  "qualify",
  "send_proposal",
  "schedule",
  "close",
  "ai_takeover",
] as const;

type CrmAction = (typeof VALID_ACTIONS)[number];

function isValidAction(action: unknown): action is CrmAction {
  return VALID_ACTIONS.includes(action as CrmAction);
}

export async function POST(req: NextRequest) {
  // 1. Verifica sessão do usuário
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  // 2. Valida body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { action, lead_id, tenant_id } = body as Record<string, unknown>;

  if (!isValidAction(action)) {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }
  if (typeof lead_id !== "string" || !lead_id) {
    return NextResponse.json({ error: "lead_id obrigatório." }, { status: 400 });
  }
  if (typeof tenant_id !== "string" || !tenant_id) {
    return NextResponse.json(
      { error: "tenant_id obrigatório." },
      { status: 400 }
    );
  }

  // 3. Confirma que o usuário pertence ao tenant solicitado
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const isGlobalAdmin = user.user_metadata?.role === "global_admin";

  if (!isGlobalAdmin && profile?.tenant_id !== tenant_id) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  // 4. Usa admin client para inserir na job_queue (bypassa RLS para operação server-side)
  const admin = createAdminClient();

  const { data: job, error: jobError } = await admin
    .from("job_queue")
    .insert({
      tenant_id,
      lead_id,
      action,
      status: "pending",
      payload: { triggered_by: user.id },
    })
    .select("id")
    .single();

  if (jobError) {
    console.error("[execute] job_queue insert error:", jobError);
    return NextResponse.json(
      { error: "Falha ao enfileirar ação." },
      { status: 500 }
    );
  }

  // 5. Registra no action_logs
  await admin.from("action_logs").insert({
    tenant_id,
    lead_id,
    job_id: job.id,
    action,
    triggered_by: user.id,
    channel: "web",
    summary: `Ação "${action}" disparada via UI`,
  });

  // 6. Atualiza last_action_at do lead
  await admin
    .from("leads")
    .update({ last_action_at: new Date().toISOString() })
    .eq("id", lead_id)
    .eq("tenant_id", tenant_id);

  return NextResponse.json({ job_id: job.id, status: "pending" }, { status: 201 });
}
