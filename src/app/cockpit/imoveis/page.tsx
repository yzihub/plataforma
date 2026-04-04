import ImoveisClient from "@/components/yzihub/ImoveisClient";

// ─── Page ─────────────────────────────────────────────────────────────────────
// Thin wrapper: ImoveisClient handles all data fetching via TenantContext.

export default function ImoveisPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Imóveis</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Catálogo de Imóveis</p>
        </div>
      </div>

      <ImoveisClient />
    </div>
  );
}
