"use client";

import type { Broker } from "@/types/brokers";
import {
  GroupIcon,
  CheckCircleIcon,
  CloseLineIcon,
  ShootingStarIcon,
} from "@/icons";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CorretoresKpiStripProps {
  brokers: Broker[];
  leadCounts: Record<string, number>;
}

// ─── CorretoresKpiStrip ───────────────────────────────────────────────────────

export default function CorretoresKpiStrip({ brokers, leadCounts }: CorretoresKpiStripProps) {
  const totalAtivos = brokers.filter((b) => b.is_active).length;
  const totalInativos = brokers.filter((b) => !b.is_active).length;

  // Top corretor por leads (maior contagem; empate = primeiro alfabeticamente)
  let topCorretor = "-";
  if (brokers.length > 0) {
    const sorted = [...brokers].sort((a, b) => {
      const diff = (leadCounts[b.id] ?? 0) - (leadCounts[a.id] ?? 0);
      if (diff !== 0) return diff;
      return a.full_name.localeCompare(b.full_name);
    });
    const leader = sorted[0];
    if (leader && (leadCounts[leader.id] ?? 0) > 0) {
      topCorretor = leader.full_name.split(" ")[0]; // primeiro nome para caber no card
    }
  }

  const cards = [
    {
      Icon: GroupIcon,
      label: "Total Corretores",
      value: String(brokers.length),
      accent: "text-gray-500 dark:text-gray-400",
    },
    {
      Icon: CheckCircleIcon,
      label: "Ativos",
      value: String(totalAtivos),
      accent: "text-emerald-500 dark:text-emerald-400",
    },
    {
      Icon: CloseLineIcon,
      label: "Inativos",
      value: String(totalInativos),
      accent: "text-gray-400 dark:text-gray-500",
    },
    {
      Icon: ShootingStarIcon,
      label: "Top Corretor",
      value: topCorretor,
      accent: "text-amber-500 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ Icon, label, value, accent }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4"
        >
          {/* Icon container */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800">
            <Icon className={`size-5 ${accent}`} />
          </div>

          {/* Label + value */}
          <div className="min-w-0">
            <p className="text-xs font-medium leading-tight truncate text-gray-500 dark:text-gray-400">
              {label}
            </p>
            <p className="text-xl font-bold leading-tight mt-0.5 text-gray-800 dark:text-white/90 truncate">
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
