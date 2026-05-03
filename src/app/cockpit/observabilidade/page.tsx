import AgentMetricsClient from "@/components/yzihub/AgentMetricsClient";

export const dynamic = "force-dynamic";

export default function ObservabilidadePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Observabilidade
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Eventos reais do agent_metrics_events (Ju / Jurema)
        </p>
      </div>
      <AgentMetricsClient />
    </div>
  );
}
