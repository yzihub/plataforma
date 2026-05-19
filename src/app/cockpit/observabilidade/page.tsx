import Link from "next/link";
import DriftAlert from "@/components/cockpit/DriftAlert";
import CognitiveHealthStrip from "@/components/cockpit/CognitiveHealthStrip";
import CognitiveFeedTable from "@/components/cockpit/CognitiveFeedTable";

// Legacy fallback — preserved for operational rollback
// import AgentMetricsClient from "@/components/yzihub/AgentMetricsClient";

export const dynamic = "force-dynamic";

const SUB_BOARDS = [
  { name: "Sessões",   href: "/cockpit/observabilidade/sessoes",   description: "Conversas · replay causal" },
  { name: "Loops",     href: "/cockpit/observabilidade/loops",     description: "Repetições cognitivas" },
  { name: "Retrieval", href: "/cockpit/observabilidade/retrieval", description: "Governança de memória" },
  { name: "Handoffs",  href: "/cockpit/observabilidade/handoffs",  description: "Continuidade IA → humano" },
] as const;

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

      {/* Sub-board navigation */}
      <div className="flex flex-wrap gap-2">
        {SUB_BOARDS.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="flex flex-col gap-0.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800/60"
          >
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{b.name}</span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">{b.description}</span>
          </Link>
        ))}
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
