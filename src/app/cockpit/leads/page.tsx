import { Suspense } from "react";
import { getCockpitData } from "@/lib/crm/queries";
import { cafePamData, juremaLeads } from "@/lib/crm/mock-data";
import type { Lead, PipelineStage } from "@/lib/crm/types";
import LeadsClient from "@/components/yzihub/LeadsClient";

// ─── Fallback mock stages (quando Supabase nao configurado) ──────────────────

const MOCK_STAGES: PipelineStage[] = [
  { id: "novo_lead",       tenant_id: "mock", name: "Novo Lead",        color: "#3B82F6", position: 0, is_won: false, is_lost: false },
  { id: "lead_quente",     tenant_id: "mock", name: "Lead Quente",      color: "#F97316", position: 1, is_won: false, is_lost: false },
  { id: "em_qualificacao", tenant_id: "mock", name: "Em Qualificação",  color: "#F59E0B", position: 2, is_won: false, is_lost: false },
  { id: "qualificando",    tenant_id: "mock", name: "Qualificando",     color: "#8B5CF6", position: 3, is_won: false, is_lost: false },
  { id: "agendamento",     tenant_id: "mock", name: "Agendamento",      color: "#10B981", position: 4, is_won: false, is_lost: false },
];

// ─── Busca leads e stages do tenant autenticado ──────────────────────────────

async function fetchLeadsAndStages(): Promise<{ leads: Lead[]; stages: PipelineStage[] }> {
  try {
    const data = await getCockpitData();

    if (!data) {
      // Fallback para mock quando usuario nao autenticado ou sem tenant
      return {
        leads: [...cafePamData.leads, ...juremaLeads],
        stages: MOCK_STAGES,
      };
    }

    return {
      leads: data.leads,
      stages: data.stages.length > 0 ? data.stages : MOCK_STAGES,
    };
  } catch {
    // Supabase nao configurado — usa mock para dev local
    return {
      leads: [...cafePamData.leads, ...juremaLeads],
      stages: MOCK_STAGES,
    };
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
