import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KanbanData, Lead, PipelineStage, Tenant } from "./types";
import { buildOperationalKanbanBoard } from "./operational-funnel";

/**
 * Busca dados do pipeline CRM para o tenant do usuário autenticado.
 * Retorna null se o usuário não tiver tenant vinculado.
 */
const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

export async function getCockpitData(): Promise<KanbanData | null> {
  const isDevBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  const admin = createAdminClient();
  let tenantId: string;

  if (isDevBypass) {
    tenantId = DEV_JUREMA_TENANT_ID;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await admin
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) return null;
    tenantId = profile.tenant_id as string;
  }

  const [tenantRes, stagesRes, leadsRes, brokersRes, dealsRes, contractsRes, appointmentsRes, timelineRes, imoveisRes] = await Promise.all([
    admin
      .from("tenants")
      .select("id, name, slug")
      .eq("id", tenantId)
      .single(),

    admin
      .from("pipeline_stages")
      .select("id, tenant_id, name, color, position, is_won, is_lost")
      .eq("tenant_id", tenantId)
      .order("position"),

    admin
      .from("leads")
      .select(
        "id, tenant_id, stage_id, name, email, phone, company, source, status, score, value, notes, metadata, assigned_to, last_action_at, created_at, updated_at, ai_status, ai_temperature, ai_last_summary, ai_last_intent, ai_qualified_at, ai_hot_at, phone_normalized, corretor_id"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(300),

    admin
      .from("corretores")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(200),

    admin
      .from("jurema_deals")
      .select("id, lead_id, deal_stage, qualification_status, broker_status, lead_score, budget_max, bedrooms, property_type, location_preference, metadata, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(300),

    admin
      .from("contracts")
      .select("id, lead_id, imovel_id, project_id, broker_id, status, type, signed_at, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(300),

    admin
      .from("appointments")
      .select("lead_id, broker_id, appointment_type, status, start_at, end_at, title, description, metadata, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(300),

    admin
      .from("timeline_events")
      .select("lead_id, contract_id, imovel_id, corretor_id, event_type, event_category, title, description, metadata, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(500),

    admin
      .from("imoveis")
      .select("id, titulo_comercial, title, bairro, referencia_unica, id_imovel, status_operacional, status_publicacao, metadata, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(300),
  ]);

  if (tenantRes.error || !tenantRes.data) return null;

  if (stagesRes.error) {
    console.error("[getCockpitData] stages query error:", stagesRes.error.message);
  }
  if (leadsRes.error) {
    console.error("[getCockpitData] leads query error:", leadsRes.error.message);
  }

  const operationalKanban = buildOperationalKanbanBoard({
    leads: (leadsRes.data ?? []) as Lead[],
    brokers: (brokersRes.data ?? []) as Array<{ id: string; name: string; full_name?: string | null }>,
    deals: (dealsRes.data ?? []) as Array<{
      id: string;
      lead_id: string | null;
      deal_stage: string | null;
      qualification_status: string | null;
      broker_status: string | null;
      lead_score: number | null;
      budget_max: number | null;
      bedrooms: string | null;
      property_type: string | null;
      location_preference: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
      updated_at: string | null;
    }>,
    contracts: (contractsRes.data ?? []) as Array<{
      id: string;
      lead_id: string | null;
      imovel_id: string | null;
      project_id: string | null;
      broker_id: string | null;
      status: string | null;
      type: string | null;
      signed_at: string | null;
      created_at: string;
      updated_at: string | null;
    }>,
    appointments: (appointmentsRes.data ?? []) as Array<{
      lead_id: string | null;
      broker_id: string | null;
      appointment_type: string | null;
      status: string | null;
      start_at: string | null;
      end_at: string | null;
      title: string | null;
      description: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
      updated_at: string | null;
    }>,
    timelineEvents: (timelineRes.data ?? []) as Array<{
      lead_id: string | null;
      contract_id: string | null;
      imovel_id: string | null;
      corretor_id: string | null;
      event_type: string;
      event_category: string | null;
      title: string | null;
      description: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }>,
    imoveis: (imoveisRes.data ?? []) as Array<{
      id: string;
      titulo_comercial: string | null;
      title: string | null;
      bairro: string | null;
      referencia_unica: string | null;
      id_imovel: string | null;
      status_operacional: string | null;
      status_publicacao: string | null;
      metadata: Record<string, unknown> | null;
      updated_at: string | null;
    }>,
  });

  return {
    tenant: tenantRes.data as Tenant,
    stages: (stagesRes.data ?? []) as PipelineStage[],
    leads: (leadsRes.data ?? []) as Lead[],
    operationalKanban,
  };
}

/**
 * Busca dados do pipeline para um tenant específico (uso admin).
 */
export async function getCockpitDataByTenant(tenantId: string): Promise<KanbanData | null> {
  const admin = createAdminClient();

  const [tenantRes, stagesRes, leadsRes] = await Promise.all([
    admin.from("tenants").select("id, name, slug").eq("id", tenantId).single(),
    admin
      .from("pipeline_stages")
      .select("id, tenant_id, name, color, position, is_won, is_lost")
      .eq("tenant_id", tenantId)
      .order("position"),
    admin
      .from("leads")
      .select(
        "id, tenant_id, stage_id, name, email, phone, company, source, status, score, value, notes, metadata, assigned_to, last_action_at, created_at, updated_at, ai_status, ai_temperature, ai_last_summary, ai_last_intent, ai_qualified_at, ai_hot_at, phone_normalized, corretor_id"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  if (tenantRes.error || !tenantRes.data) return null;

  if (stagesRes.error) {
    console.error("[getCockpitDataByTenant] stages query error:", stagesRes.error.message);
  }
  if (leadsRes.error) {
    console.error("[getCockpitDataByTenant] leads query error:", leadsRes.error.message);
  }

  return {
    tenant: tenantRes.data as Tenant,
    stages: (stagesRes.data ?? []) as PipelineStage[],
    leads: (leadsRes.data ?? []) as Lead[],
  };
}
