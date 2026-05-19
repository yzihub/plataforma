import SessionFeedTable from "@/components/cockpit/SessionFeedTable";

export const dynamic = "force-dynamic";

export default function SessoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Sessões
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Histórico de conversas cognitivas · Ju / Jurema Brokers
        </p>
      </div>

      <SessionFeedTable />
    </div>
  );
}
