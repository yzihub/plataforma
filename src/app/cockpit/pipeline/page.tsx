import { createClient } from "@/lib/supabase/server";
import { cafePamData } from "@/lib/crm/mock-data";
import type { Lead, PipelineStage } from "@/lib/crm/types";
import PipelineDashboardClient from "@/components/yzihub/PipelineDashboardClient";

interface Broker {
  id: string;
  name: string;
}

// ─── Busca dados do pipeline do tenant autenticado ───────────────────────────

async function fetchPipelineData(): Promise<{
  leads: Lead[];
  stages: PipelineStage[];
  brokers: Broker[];
  tenantName: string;
}> {
  const fallback = {
    leads: cafePamData.leads,
    stages: cafePamData.stages,
    brokers: [] as Broker[],
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

    // Busca paralela: tenant name + stages + leads + brokers
    const [tenantRes, stagesRes, leadsRes, brokersRes] = await Promise.all([
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

      supabase
        .from("corretores")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    if (stagesRes.error || leadsRes.error || !stagesRes.data || !leadsRes.data) {
      return fallback;
    }

    const brokers: Broker[] = brokersRes.error || !brokersRes.data
      ? []
      : brokersRes.data.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }));

    return {
      tenantName: tenantRes.data?.name ?? fallback.tenantName,
      stages: stagesRes.data as PipelineStage[],
      leads: leadsRes.data as Lead[],
      brokers,
    };
  } catch {
    return fallback;
  }
}

// ─── Page (Server Component) ─────────────────────────────────────────────────

export default async function PipelinePage() {
  const { leads, stages, brokers, tenantName } = await fetchPipelineData();
  return (
    <PipelineDashboardClient
      leads={leads}
      stages={stages}
      brokers={brokers}
      tenantName={tenantName}
    />
  );
}
