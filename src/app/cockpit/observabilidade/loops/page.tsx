import LoopsFeedTable from "@/components/cockpit/LoopsFeedTable";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LoopsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/cockpit/observabilidade"
          className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          ← Observabilidade
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
          Loops Operacionais
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sessões com repetição cognitiva detectada · abre replay causal
        </p>
      </div>
      <LoopsFeedTable />
    </div>
  );
}
