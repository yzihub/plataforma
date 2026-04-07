import { Suspense } from "react";
import { getCockpitData } from "@/lib/crm/queries";
import { cafePamData, juremaLeads } from "@/lib/crm/mock-data";
import type { Lead, PipelineStage } from "@/lib/crm/types";
import LeadsClient from "@/components/yzihub/LeadsClient";

// ─── Fallback mock stages (quando Supabase nao configurado) ──────────────────

const MOCK_STAGES: PipelineStage[] = [
  { id: "novo",        tenant_id: "mock", name: "Novo",        color: "#3B82F6", position: 0, is_won: false, is_lost: false },
  { id: "contato",     tenant_id: "mock", name: "Contato",     color: "#64748B", position: 1, is_won: false, is_lost: false },
  { id: "qualificado", tenant_id: "mock", name: "Qualificado", color: "#F59E0B", position: 2, is_won: false, is_lost: false },
  { id: "reuniao",     tenant_id: "mock", name: "Reuniao",     color: "#8B5CF6", position: 3, is_won: false, is_lost: false },
  { id: "proposta",    tenant_id: "mock", name: "Proposta",    color: "#F97316", position: 4, is_won: false, is_lost: false },
  { id: "contrato",    tenant_id: "mock", name: "Contrato",    color: "#10B981", position: 5, is_won: false, is_lost: false },
  { id: "fechado",     tenant_id: "mock", name: "Fechado",     color: "#22C55E", position: 6, is_won: true,  is_lost: false },
  { id: "perdido",     tenant_id: "mock", name: "Perdido",     color: "#EF4444", position: 7, is_won: false, is_lost: true  },
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
