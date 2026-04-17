import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KanbanData, Lead, PipelineStage, Tenant } from "./types";

/**
 * Busca dados do pipeline CRM para o tenant do usuário autenticado.
 * Retorna null se o usuário não tiver tenant vinculado.
 */
export async function getCockpitData(): Promise<KanbanData | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Busca perfil para obter tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) return null;

  const tenantId = profile.tenant_id as string;

  // Busca tenant, stages e leads em paralelo
  const [tenantRes, stagesRes, leadsRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("id", tenantId)
      .single(),

    supabase
      .from("pipeline_stages")
      .select("id, tenant_id, name, color, position, is_won, is_lost")
      .eq("tenant_id", tenantId)
      .order("position"),

    supabase
      .from("leads")
      .select(
        "id, tenant_id, stage_id, name, email, phone, company, source, status, score, value, notes, assigned_to, last_action_at, created_at"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
  ]);

  if (tenantRes.error || !tenantRes.data) return null;

  if (stagesRes.error) {
    console.error("[getCockpitData] stages query error:", stagesRes.error.message);
  }
  if (leadsRes.error) {
    console.error("[getCockpitData] leads query error:", leadsRes.error.message);
  }

  return {
    tenant: tenantRes.data as Tenant,
    stages: (stagesRes.data ?? []) as PipelineStage[],
    leads: (leadsRes.data ?? []) as Lead[],
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
        "id, tenant_id, stage_id, name, email, phone, company, source, status, score, value, notes, assigned_to, last_action_at, created_at"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
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
