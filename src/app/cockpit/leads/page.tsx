import { Suspense } from "react";
import { getCockpitData } from "@/lib/crm/queries";
import LeadsClient from "@/components/yzihub/LeadsClient";

async function LeadsLoader() {
  const data = await getCockpitData();

  if (!data) {
    return <LeadsClient initialLeads={[]} stages={[]} operationalKanban={null} />;
  }

  return (
    <LeadsClient
      initialLeads={data.leads}
      stages={data.stages}
      operationalKanban={data.operationalKanban ?? null}
    />
  );
}

function LeadsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-36 rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="h-10 w-28 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<LeadsSkeleton />}>
      <LeadsLoader />
    </Suspense>
  );
}
