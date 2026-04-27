import { Suspense } from "react";
import { getCockpitData } from "@/lib/crm/queries";
import type { Lead, PipelineStage } from "@/lib/crm/types";
import LeadsClient from "@/components/yzihub/LeadsClient";

// ─── Busca leads e stages do tenant autenticado ──────────────────────────────

async function fetchLeadsAndStages(): Promise<{ leads: Lead[]; stages: PipelineStage[] }> {
  try {
    const data = await getCockpitData();
    if (!data) return { leads: [], stages: [] };
    return { leads: data.leads, stages: data.stages };
  } catch (err) {
    console.error("[LeadsPage] erro ao buscar dados:", err);
    return { leads: [], stages: [] };
  }
}

// ─── Page (Server Component) ─────────────────────────────────────────────────

export default async function LeadsPage() {
  const { leads, stages } = await fetchLeadsAndStages();
  return (
    <Suspense fallback={null}>
      <LeadsClient initialLeads={leads} stages={stages} />
    </Suspense>
  );
}
