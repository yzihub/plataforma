import EvolutionConnectClient from "@/components/yzihub/EvolutionConnectClient";

export const dynamic = "force-dynamic";

export default function EvolutionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Evolution</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Conexão WhatsApp via Evolution API — status, QR Code e ações operacionais
        </p>
      </div>
      <EvolutionConnectClient />
    </div>
  );
}
