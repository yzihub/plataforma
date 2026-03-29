import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const VALID_MODULES = ["crm_setup", "sdr_setup", "radar_setup", "social_setup", "ia_onboarding"] as const;
type FactoryModule = (typeof VALID_MODULES)[number];

const MODULE_TO_PROJECT_TYPE: Record<FactoryModule, string> = {
  crm_setup: "crm",
  sdr_setup: "sdr",
  radar_setup: "radar",
  social_setup: "social",
  ia_onboarding: "ia_onboarding",
};

export async function POST(req: NextRequest) {
  // 1. Verifica sessão — exige global_admin
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const isGlobalAdmin = user.user_metadata?.role === "global_admin";
  if (!isGlobalAdmin) {
    return NextResponse.json({ error: "Apenas administradores globais podem ativar projetos." }, { status: 403 });
  }

  // 2. Valida body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { tenant_id, tenant_name, slug, plan, modules, agent_name, agent_phone } = body;

  const isNewTenant = !tenant_id;

  if (isNewTenant && (typeof tenant_name !== "string" || !tenant_name.trim())) {
    return NextResponse.json({ error: "tenant_name obrigatório para novo tenant." }, { status: 400 });
  }
  if (!Array.isArray(modules) || modules.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos um módulo." }, { status: 400 });
  }

  const validModules = (modules as string[]).filter((m): m is FactoryModule =>
    VALID_MODULES.includes(m as FactoryModule)
  );
  if (validModules.length === 0) {
    return NextResponse.json({ error: "Nenhum módulo válido selecionado." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 3. Cria ou recupera tenant
  let resolvedTenantId = typeof tenant_id === "string" ? tenant_id : null;

  if (isNewTenant) {
    const tenantSlug = typeof slug === "string" && slug.trim()
      ? slug.trim()
      : (tenant_name as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const { data: newTenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        name: (tenant_name as string).trim(),
        slug: tenantSlug,
        plan: typeof plan === "string" ? plan : "starter",
        status: "active",
      })
      .select("id")
      .single();

    if (tenantError) {
      console.error("[factory] tenant insert error:", tenantError);
      return NextResponse.json({ error: "Falha ao criar tenant: " + tenantError.message }, { status: 500 });
    }

    resolvedTenantId = newTenant.id;
  }

  if (!resolvedTenantId) {
    return NextResponse.json({ error: "tenant_id inválido." }, { status: 400 });
  }

  // 4. Insere projetos para cada módulo selecionado
  const projectInserts = validModules.map((mod) => ({
    tenant_id: resolvedTenantId as string,
    name: mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    type: MODULE_TO_PROJECT_TYPE[mod],
    status: "pending",
    config: {},
    agent_name: typeof agent_name === "string" && agent_name.trim() ? agent_name.trim() : null,
    agent_phone: typeof agent_phone === "string" && agent_phone.trim() ? agent_phone.trim() : null,
  }));

  const { error: projectsError } = await admin.from("projects").insert(projectInserts);

  if (projectsError) {
    console.error("[factory] projects insert error:", projectsError);
    // Não bloqueia — continua com o job
  }

  // 5. Insere pipeline padrão se novo tenant com crm_setup
  if (isNewTenant && validModules.includes("crm_setup")) {
    const defaultStages = [
      { name: "Novo Lead",   color: "#6366f1", position: 0, is_won: false, is_lost: false },
      { name: "Contato",     color: "#3b82f6", position: 1, is_won: false, is_lost: false },
      { name: "Qualificado", color: "#f59e0b", position: 2, is_won: false, is_lost: false },
      { name: "Proposta",    color: "#8b5cf6", position: 3, is_won: false, is_lost: false },
      { name: "Negociação",  color: "#f97316", position: 4, is_won: false, is_lost: false },
      { name: "Fechado",     color: "#22c55e", position: 5, is_won: true,  is_lost: false },
      { name: "Perdido",     color: "#ef4444", position: 6, is_won: false, is_lost: true  },
    ].map((s) => ({ ...s, tenant_id: resolvedTenantId as string }));

    await admin.from("pipeline_stages").insert(defaultStages);
  }

  // 6. Enfileira job factory_activate
  const { data: job, error: jobError } = await admin
    .from("job_queue")
    .insert({
      tenant_id: resolvedTenantId,
      action: "factory_activate",
      status: "pending",
      payload: {
        modules: validModules,
        agent_name: agent_name ?? null,
        agent_phone: agent_phone ?? null,
        triggered_by: user.id,
      },
    })
    .select("id")
    .single();

  if (jobError) {
    console.error("[factory] job_queue insert error:", jobError);
    return NextResponse.json({ error: "Falha ao enfileirar job." }, { status: 500 });
  }

  // 7. Registra action_log
  await admin.from("action_logs").insert({
    tenant_id: resolvedTenantId,
    action: "factory_activate",
    triggered_by: user.id,
    channel: "web",
    summary: `YZI FACTORY ativado: módulos [${validModules.join(", ")}]`,
  });

  // 8. Dispara webhook n8n (fire-and-forget)
  const webhookUrl = process.env.FACTORY_N8N_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: job.id,
        tenant_id: resolvedTenantId,
        modules: validModules,
        agent_name: agent_name ?? null,
        agent_phone: agent_phone ?? null,
      }),
    }).catch((err) => console.error("[factory] n8n webhook error:", err));
  }

  return NextResponse.json(
    { job_id: job.id, tenant_id: resolvedTenantId, status: "pending", modules: validModules },
    { status: 201 }
  );
}
