"use client";

import React from "react";
import { Lead, PipelineStage } from "@/lib/crm/types";
import LeadCard from "@/components/yzihub/LeadCard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onActionSuccess?: (leadId: string, jobId: string, action: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace(".", ",")}k`;
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

function InboxIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-gray-300 dark:text-gray-600"
    >
      <path
        d="M3 9h6l2 3h2l2-3h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 9V19a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 9l2-5h14l2 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KanbanColumn({
  stage,
  leads,
  onActionSuccess,
}: KanbanColumnProps) {
  const totalValue = leads.reduce((sum, lead) => sum + (lead.value ?? 0), 0);

  return (
    <div
      className="
        flex flex-col w-72 shrink-0 rounded-xl
        border border-gray-200 bg-gray-50
        dark:border-gray-700 dark:bg-gray-900/50
      "
    >
      {/* ── Header ── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        {/* Left side: dot + name + count */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: stage.color }}
            aria-hidden="true"
          />
          <span className="text-theme-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
            {stage.name}
          </span>
          <span className="text-theme-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full shrink-0">
            {leads.length}
          </span>
        </div>

        {/* Right side: total value */}
        {leads.length > 0 && (
          <span className="text-theme-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">
            {formatCurrencyShort(totalValue)}
          </span>
        )}
      </div>

      {/* ── Lead List ── */}
      {leads.length > 0 ? (
        <>
          <div
            className="
              flex flex-col gap-3 p-3 overflow-y-auto
              max-h-[calc(100vh-280px)]
              scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700
            "
          >
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onActionSuccess={onActionSuccess}
              />
            ))}
          </div>

          {/* ── Footer ── */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-theme-xs text-gray-400 dark:text-gray-500">
              Total:{" "}
              {totalValue.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </>
      ) : (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center p-6 text-center flex-1 min-h-[120px]">
          <InboxIcon />
          <p className="mt-2 text-theme-xs text-gray-400 dark:text-gray-500">
            Nenhum lead aqui
          </p>
        </div>
      )}
    </div>
  );
}
