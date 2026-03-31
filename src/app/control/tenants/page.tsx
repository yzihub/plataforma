import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import TenantsTable from "@/components/yzihub/TenantsTable";
import type { ControlTenant, ControlProject } from "@/lib/control/types";

export const metadata: Metadata = {
  title: "Tenants — YZI CONTROL",
};

async function fetchTenants(): Promise<ControlTenant[]> {
  const admin = createAdminClient();

  const [tenantsRes, projectsRes] = await Promise.all([
    admin
      .from("tenants")
      .select("id, name, slug, plan, status, created_at")
      .order("created_at", { ascending: false }),

    admin
      .from("projects")
      .select("id, tenant_id, name, type, status, agent_name, agent_phone"),
  ]);

  if (tenantsRes.error || !tenantsRes.data) return [];

  const rawProjects = projectsRes.data ?? [];

  return tenantsRes.data.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    status: t.status,
    projects: rawProjects.filter((p) => p.tenant_id === t.id) as ControlProject[],
    stats: {
      total_leads: 0,
      active_leads: 0,
      won_leads: 0,
      pipeline_value: 0,
      conversion_rate: 0,
    },
    created_at: t.created_at,
  }));
}

export default async function TenantsPage() {
  const tenants = await fetchTenants().catch(() => []);

  return <TenantsTable initialTenants={tenants} />;
}
