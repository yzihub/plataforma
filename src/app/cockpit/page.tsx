import { Metadata } from "next";
import KanbanBoard from "@/components/yzihub/KanbanBoard";
import { getCockpitData } from "@/lib/crm/queries";
import { cafePamData } from "@/lib/crm/mock-data";

export const metadata: Metadata = {
  title: "YZI COCKPIT — Pipeline CRM",
};

export default async function CockpitPage() {
  // Tenta buscar dados reais; fallback para mock se Supabase vazio ou sem tenant
  const data = await getCockpitData().catch(() => null);
  const kanbanData = data ?? cafePamData;

  return (
    <div className="space-y-6">
      <KanbanBoard data={kanbanData} />
    </div>
  );
}
