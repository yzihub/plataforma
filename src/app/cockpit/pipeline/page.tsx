import { createClient } from "@/lib/supabase/server";
import { cafePamData } from "@/lib/crm/mock-data";
import type { Lead, PipelineStage } from "@/lib/crm/types";
import PipelineClient from "@/components/yzihub/PipelineClient";

// ─── Busca dados do pipeline do tenant autenticado ───────────────────────────

async function fetchPipelineData(): Promise<{
  leads: Lead[];
  stages: PipelineStage[];
  tenantName: string;
}> {
  const fallback = {
    leads: cafePamData.leads,
    stages: cafePamData.stages,
    tenantName: cafePamData.tenant.name,
  };

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fallback;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) return fallback;

    const tenantId = profile.tenant_id;

    // Busca paralela: tenant name + stages + leads
    const [tenantRes, stagesRes, leadsRes] = await Promise.all([
      supabase
        .from("tenants")
        .select("name")
        .eq("id", tenantId)
        .single(),

      supabase
        .from("pipeline_stages")
        .select("id, tenant_id, name, color, position, is_won, is_lost")
        .eq("tenant_id", tenantId)
        .order("position", { ascending: true }),

      supabase
        .from("leads")
        .select("id, tenant_id, stage_id, name, email, phone, company, source, status, score, value, notes, assigned_to, last_action_at, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);

    if (stagesRes.error || leadsRes.error || !stagesRes.data || !leadsRes.data) {
      return fallback;
    }

    return {
      tenantName: tenantRes.data?.name ?? fallback.tenantName,
      stages: stagesRes.data as PipelineStage[],
      leads: leadsRes.data as Lead[],
    };
  } catch {
    return fallback;
  }
}

// ─── Page (Server Component) ─────────────────────────────────────────────────

export default async function PipelinePage() {
  const { leads, stages, tenantName } = await fetchPipelineData();
  return (
    <PipelineClient
      initialLeads={leads}
      initialStages={stages}
      tenantName={tenantName}
    />
  );
}
