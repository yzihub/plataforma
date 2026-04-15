"use client";

interface FilterState {
  brokerId?: string;
  period?: string;
  source?: string;
}

interface Broker {
  id: string;
  name: string;
}

interface PipelineHeaderProps {
  brokers: Broker[];
  onFilterChange: (f: FilterState) => void;
}

export default function PipelineHeader({ brokers, onFilterChange }: PipelineHeaderProps) {
  function handleChange(field: keyof FilterState, value: string) {
    onFilterChange({ [field]: value || undefined });
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03] p-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-white/40 mb-4">
        <span>Cockpit</span>
        <span>/</span>
        <span className="text-gray-800 dark:text-white/90 font-medium">Pipeline</span>
      </div>

      {/* Filters + Actions row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 flex-1">
          {/* Corretor */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-white/40 font-medium uppercase tracking-wide">
              Corretor
            </label>
            <select
              onChange={(e) => handleChange("brokerId", e.target.value)}
              className="min-w-[140px] rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-3 py-1.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos</option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Período */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-white/40 font-medium uppercase tracking-wide">
              Período
            </label>
            <select
              onChange={(e) => handleChange("period", e.target.value)}
              className="min-w-[120px] rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-3 py-1.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
          </div>

          {/* Origem */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-white/40 font-medium uppercase tracking-wide">
              Origem
            </label>
            <select
              onChange={(e) => handleChange("source", e.target.value)}
              className="min-w-[140px] rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-3 py-1.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todas</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Instagram">Instagram</option>
              <option value="Indicação">Indicação</option>
              <option value="Site">Site</option>
              <option value="Google Ads">Google Ads</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Zap Imóveis">Zap Imóveis</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-end gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-1.5 text-sm text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 px-3 py-1.5 text-sm text-white font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Lead
          </button>
        </div>
      </div>
    </div>
  );
}
