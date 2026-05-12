import { getCockpitData } from "@/lib/crm/queries";
import { OperationalFunnelKanbanShell } from "@/components/yzihub/OperationalFunnelKanban";

export const dynamic = "force-dynamic";

export default async function LeadsKanbanPage() {
  const data = await getCockpitData();

  if (!data?.operationalKanban) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-400">
        Funil operacional indisponivel.
      </div>
    );
  }

  return (
    <OperationalFunnelKanbanShell
      board={data.operationalKanban}
      title="Funil Operacional Imobiliario"
      description="Leads maturando por comportamento, visita, contrato e financeiro."
    />
  );
}
