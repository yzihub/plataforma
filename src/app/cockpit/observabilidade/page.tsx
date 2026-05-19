import DriftAlert from "@/components/cockpit/DriftAlert";
import CognitiveHealthStrip from "@/components/cockpit/CognitiveHealthStrip";
import CognitiveFeedTable from "@/components/cockpit/CognitiveFeedTable";

// Legacy fallback — preserved for operational rollback
// import AgentMetricsClient from "@/components/yzihub/AgentMetricsClient";

export const dynamic = "force-dynamic";

export default function ObservabilidadePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Torre Cognitiva
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Saúde operacional · Ju / Jurema Brokers
        </p>
      </div>

      {/* 1. Atenção contextual — aparece apenas quando há anomalia */}
      <DriftAlert />

      {/* 2. Saúde operacional cognitiva — 6 sinais reativos */}
      <CognitiveHealthStrip />

      {/* 3. Causalidade recente navegável — 20 traços ordenados */}
      <CognitiveFeedTable />
    </div>
  );
}
