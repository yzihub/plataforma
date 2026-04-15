"use client";

import type { Lead, PipelineStage } from "@/lib/crm/types";

interface PipelineKPIsProps {
  leads: Lead[];
  stages: PipelineStage[];
}

// Stable pseudo-random variation % per stage (seeded by stage id length to avoid hydration mismatch)
function stableVariation(stageId: string): number {
  let hash = 0;
  for (let i = 0; i < stageId.length; i++) {
    hash = (hash * 31 + stageId.charCodeAt(i)) & 0xffff;
  }
  return hash % 16; // 0–15
}

export default function PipelineKPIs({ leads, stages }: PipelineKPIsProps) {
  const total = leads.length || 1;

  const activeStages = stages
    .filter((s) => !s.is_lost)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      {activeStages.map((stage) => {
        const count = leads.filter((l) => l.stage_id === stage.id).length;
        const pct = Math.round((count / total) * 100);
        const variation = stableVariation(stage.id);
        const isPositive = stage.position % 2 === 0;

        return (
          <div
            key={stage.id}
            className="rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03] p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-gray-500 dark:text-white/40 leading-tight line-clamp-2">
                {stage.name}
              </p>
              <span
                className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  isPositive
                    ? "bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400"
                    : "bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400"
                }`}
              >
                {isPositive ? "+" : "-"}{variation}%
              </span>
            </div>

            <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{count}</p>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-white/30 mb-1">
                <span>{pct}% do total</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
