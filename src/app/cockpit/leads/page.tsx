import { createClient } from "@/lib/supabase/server";
import { cafePamData } from "@/lib/crm/mock-data";
import type { Lead } from "@/lib/crm/types";
import LeadsClient from "@/components/yzihub/LeadsClient";

// ─── Busca leads do tenant autenticado ───────────────────────────────────────

async function fetchLeads(): Promise<Lead[]> {
  try {
    const supabase = await createClient();

    // Usuário autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return cafePamData.leads;

    // Tenant do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) return cafePamData.leads;

    // Leads filtrados por tenant
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, tenant_id, stage_id, name, email, phone, company, source, status, score, value, notes, assigned_to, last_action_at, created_at")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (error || !leads) return cafePamData.leads;

    return leads as Lead[];
  } catch {
    // Supabase não configurado — usa mock para dev local
    return cafePamData.leads;
  }
}

// ─── Page (Server Component) ─────────────────────────────────────────────────

export default async function LeadsPage() {
  const leads = await fetchLeads();
  return <LeadsClient initialLeads={leads} />;
}
