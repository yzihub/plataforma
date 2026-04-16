"use client";

import type { Lead } from "@/lib/crm/types";
import {
  TableIcon,
  BoltIcon,
  ChatIcon,
  CalenderIcon,
  DollarLineIcon,
  DocsIcon,
  CheckCircleIcon,
  CloseLineIcon,
} from "@/icons";

type IconComponent = React.ComponentType<{ className?: string }>;

// ─── Status config (9 cards: Total + 8 metricas) ─────────────────────────────

const STATUS_CONFIG: Array<{
  value: string;
  Icon: IconComponent;
  label: string;
  accent: string;
}> = [
  { value: "",             Icon: TableIcon,       label: "Total de Leads",     accent: "text-gray-500 dark:text-gray-400" },
  { value: "new",          Icon: BoltIcon,        label: "Leads Novos",        accent: "text-blue-500 dark:text-blue-400" },
  { value: "qualified",    Icon: CheckCircleIcon, label: "Qualificados",       accent: "text-brand-500 dark:text-brand-400" },
  { value: "contacted",    Icon: ChatIcon,        label: "Leads Quentes",      accent: "text-amber-500 dark:text-amber-400" },
  { value: "meeting",      Icon: CalenderIcon,    label: "Visitas Agendadas",  accent: "text-brand-500 dark:text-brand-400" },
  { value: "proposal",     Icon: DollarLineIcon,  label: "Propostas",          accent: "text-amber-500 dark:text-amber-400" },
  { value: "won",          Icon: CheckCircleIcon, label: "Fechados",           accent: "text-emerald-500 dark:text-emerald-400" },
  { value: "lost",         Icon: CloseLineIcon,   label: "Perdidos",           accent: "text-gray-500 dark:text-gray-400" },
  { value: "negotiation",  Icon: DocsIcon,        label: "Negociacao",         accent: "text-orange-500 dark:text-orange-400" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeadsKpiStripProps {
  leads: Lead[];
  activeStatus: string;
  onStatusClick: (status: string) => void;
}

// ─── LeadsKpiStrip ────────────────────────────────────────────────────────────

export default function LeadsKpiStrip({ leads, activeStatus, onStatusClick }: LeadsKpiStripProps) {
  function countFor(statusValue: string): number {
    if (statusValue === "") return leads.length;
    return leads.filter((l) => l.status === statusValue).length;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
      {STATUS_CONFIG.map((cfg) => {
        const { value, label, accent } = cfg;
        const count = countFor(value);
        const isActive = activeStatus === value;

        return (
          <button
            key={value === "" ? "__total__" : value}
            type="button"
            onClick={() => onStatusClick(value)}
            className={[
              "flex items-center gap-3 rounded-2xl border p-4",
              "cursor-pointer select-none transition-all duration-150 text-left",
              "hover:border-brand-300 hover:shadow-sm",
              isActive
                ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 shadow-sm"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]",
            ].join(" ")}
          >
            {/* Icon container */}
            <div className={[
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              isActive
                ? "bg-brand-100 dark:bg-brand-500/20"
                : "bg-gray-100 dark:bg-gray-800",
            ].join(" ")}>
              <cfg.Icon className={`size-5 ${isActive ? "text-brand-500" : accent}`} />
            </div>

            {/* Label + number */}
            <div className="min-w-0">
              <p className={`text-xs font-medium leading-tight truncate ${isActive ? "text-brand-500" : "text-gray-500 dark:text-gray-400"}`}>
                {label}
              </p>
              <p className={`text-xl font-bold leading-tight mt-0.5 ${isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-800 dark:text-white/90"}`}>
                {count}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
