"use client";

import type { Lead } from "@/lib/crm/types";

// ─── Status config (mirrors LeadsDataTable STATUS_BADGE) ─────────────────────

const STATUS_CONFIG: Array<{
  value: string;
  emoji: string;
  label: string;
  accent: string;
}> = [
  { value: "",            emoji: "📋", label: "Total",      accent: "text-gray-600 dark:text-gray-300" },
  { value: "new",         emoji: "🔥", label: "Novo Lead",  accent: "text-blue-500 dark:text-blue-400" },
  { value: "contacted",   emoji: "📞", label: "Contato",    accent: "text-amber-500 dark:text-amber-400" },
  { value: "qualified",   emoji: "📅", label: "Agendado",   accent: "text-brand-500 dark:text-brand-400" },
  { value: "meeting",     emoji: "🤝", label: "Reunião",    accent: "text-brand-500 dark:text-brand-400" },
  { value: "proposal",    emoji: "💰", label: "Proposta",   accent: "text-amber-500 dark:text-amber-400" },
  { value: "negotiation", emoji: "📋", label: "Contrato",   accent: "text-orange-500 dark:text-orange-400" },
  { value: "won",         emoji: "✅", label: "Fechado",    accent: "text-emerald-500 dark:text-emerald-400" },
  { value: "lost",        emoji: "❌", label: "Perdido",    accent: "text-gray-500 dark:text-gray-400" },
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
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
      {STATUS_CONFIG.map(({ value, emoji, label, accent }) => {
        const count = countFor(value);
        const isActive = activeStatus === value;

        return (
          <button
            key={value === "" ? "__total__" : value}
            type="button"
            onClick={() => onStatusClick(value)}
            className={[
              "flex flex-col items-center justify-center gap-1 rounded-2xl border p-4",
              "cursor-pointer select-none transition-all duration-150 text-center",
              "hover:border-brand-500 hover:shadow-sm",
              isActive
                ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 shadow-sm"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]",
            ].join(" ")}
          >
            <span className="text-xl leading-none">{emoji}</span>
            <span className={`text-2xl font-bold leading-none ${isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-800 dark:text-white/90"}`}>
              {count}
            </span>
            <span className={`text-[11px] font-medium leading-tight ${isActive ? "text-brand-500" : accent}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
