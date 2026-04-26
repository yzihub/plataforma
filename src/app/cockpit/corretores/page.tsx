import CorretoresClient from "@/components/yzihub/CorretoresClient";

export default function CorretoresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Corretores</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gestão da equipe comercial do tenant
        </p>
      </div>
      <CorretoresClient />
    </div>
  );
}
