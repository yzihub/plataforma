import { createAdminClient } from "@/lib/supabase/admin";
import type { ControlDashboardData, ControlTenant, ControlProject, Job, ActionLog } from "./types";

/**
 * Busca todos os dados do painel CONTROL (admin global).
 * Usa service_role para bypasear RLS e ver todos os tenants.
 */
export async function getControlDashboard(): Promise<ControlDashboardData | null> {
  const admin = createAdminClient();

  // Busca tenants, projects, leads, jobs e logs em paralelo
  const [tenantsRes, projectsRes, leadsRes, jobsRes, logsRes] = await Promise.all([
    admin
      .from("tenants")
      .select("id, name, slug, plan, status, created_at")
      .order("created_at", { ascending: false }),

    admin
      .from("projects")
      .select("id, tenant_id, name, type, status, agent_name, agent_phone"),

    admin
      .from("leads")
      .select("id, tenant_id, status, value"),

    admin
      .from("job_queue")
      .select(
        "id, tenant_id, lead_id, action, status, attempts, error, scheduled_at, started_at, finished_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(20),

    admin
      .from("action_logs")
      .select("id, tenant_id, lead_id, job_id, action, channel, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (tenantsRes.error) {
    console.error("[control] tenants fetch error:", tenantsRes.error);
    return null;
  }

  const rawTenants = tenantsRes.data ?? [];
  const rawProjects = projectsRes.data ?? [];
  const rawLeads = leadsRes.data ?? [];
  const rawJobs = jobsRes.data ?? [];
  const rawLogs = logsRes.data ?? [];

  // Busca nomes de leads para enriquecer jobs e logs
  const leadIds = [
    ...new Set([
      ...rawJobs.map((j) => j.lead_id).filter(Boolean),
      ...rawLogs.map((l) => l.lead_id).filter(Boolean),
    ]),
  ] as string[];

  let leadNames: Record<string, string> = {};
  if (leadIds.length > 0) {
    const { data: leadData } = await admin
      .from("leads")
      .select("id, name")
      .in("id", leadIds);
    leadNames = Object.fromEntries((leadData ?? []).map((l) => [l.id, l.name]));
  }

  // Mapa tenant_id → name para enriquecer jobs e logs
  const tenantNames: Record<string, string> = Object.fromEntries(
    rawTenants.map((t) => [t.id, t.name])
  );

  // Monta ControlTenant com stats calculados
  const today = new Date().toDateString();
  const todayJobs = rawJobs.filter(
    (j) => new Date(j.created_at).toDateString() === today
  );

  const tenants: ControlTenant[] = rawTenants.map((t) => {
    const tProjects = rawProjects.filter((p) => p.tenant_id === t.id) as ControlProject[];
    const tLeads = rawLeads.filter((l) => l.tenant_id === t.id);
    const wonLeads = tLeads.filter((l) => l.status === "won");
    const lostLeads = tLeads.filter((l) => l.status === "lost");
    const activeLeads = tLeads.filter((l) => l.status !== "won" && l.status !== "lost");

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      projects: tProjects,
      stats: {
        total_leads: tLeads.length,
        active_leads: activeLeads.length,
        won_leads: wonLeads.length,
        pipeline_value: tLeads.reduce((sum, l) => sum + (l.value ?? 0), 0),
        conversion_rate:
          tLeads.length > 0 ? (wonLeads.length / tLeads.length) * 100 : 0,
      },
      created_at: t.created_at,
    };
  });

  const recent_jobs: Job[] = rawJobs.map((j) => ({
    id: j.id,
    tenant_id: j.tenant_id,
    tenant_name: tenantNames[j.tenant_id] ?? j.tenant_id,
    lead_id: j.lead_id ?? null,
    lead_name: j.lead_id ? (leadNames[j.lead_id] ?? null) : null,
    action: j.action,
    status: j.status,
    attempts: j.attempts ?? 0,
    error: j.error ?? null,
    scheduled_at: j.scheduled_at,
    started_at: j.started_at ?? null,
    finished_at: j.finished_at ?? null,
    created_at: j.created_at,
  }));

  const recent_logs: ActionLog[] = rawLogs.map((l) => ({
    id: l.id,
    tenant_id: l.tenant_id,
    tenant_name: tenantNames[l.tenant_id] ?? l.tenant_id,
    lead_id: l.lead_id ?? null,
    lead_name: l.lead_id ? (leadNames[l.lead_id] ?? null) : null,
    job_id: l.job_id ?? null,
    action: l.action,
    channel: l.channel,
    summary: l.summary ?? null,
    created_at: l.created_at,
  }));

  const activeTenants = tenants.filter((t) => t.status === "active");

  return {
    tenants,
    recent_jobs,
    recent_logs,
    global_stats: {
      total_tenants: tenants.length,
      active_tenants: activeTenants.length,
      total_leads: rawLeads.length,
      total_jobs_today: todayJobs.length,
      jobs_pending: rawJobs.filter((j) => j.status === "pending").length,
      jobs_failed: rawJobs.filter((j) => j.status === "failed").length,
    },
  };
}
