"use client";

import React, { useState, useEffect } from "react";
import { KanbanData, Lead, PipelineStage } from "@/lib/crm/types";
import KanbanColumn from "@/components/yzihub/KanbanColumn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  data: KanbanData;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

function UsersIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-brand-500"
    >
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 19c0-3.314 2.686-6 6-6s6 2.686 6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 13c2.21 0 4 1.79 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-warning-500"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7v5l3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-success-500"
    >
      <path
        d="M12 3v18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-brand-500"
    >
      <path
        d="M3 17l5-5 4 4 9-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7h6v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-gray-400"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M16.5 16.5L21 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPipelineValue(total: number): string {
  if (total >= 1_000_000) {
    return `R$ ${(total / 1_000_000).toFixed(1).replace(".", ",")}mi`;
  }
  if (total >= 1_000) {
    return `R$ ${(total / 1_000).toFixed(1).replace(".", ",")}k`;
  }
  return total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        {icon}
      </div>
      <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KanbanBoard({ data }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(data.leads);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  // ── Metrics ──
  const totalLeads = leads.length;
  const inProgressLeads = leads.filter(
    (l) => l.status !== "won" && l.status !== "lost"
  ).length;
  const totalValue = leads.reduce((sum, l) => sum + (l.value ?? 0), 0);
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const conversionRate =
    totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(0) : "0";

  // ── Sorted stages ──
  const sortedStages = [...data.stages].sort((a, b) => a.position - b.position);

  // ── Filtered leads ──
  const lowerSearch = searchTerm.toLowerCase().trim();
  const filteredLeads = lowerSearch
    ? leads.filter(
        (l) =>
          l.name.toLowerCase().includes(lowerSearch) ||
          (l.email ?? "").toLowerCase().includes(lowerSearch) ||
          (l.phone ?? "").toLowerCase().includes(lowerSearch) ||
          (l.company ?? "").toLowerCase().includes(lowerSearch)
      )
    : leads;

  // ── Action success handler ──
  function handleActionSuccess(
    leadId: string,
    jobId: string,
    action: string
  ) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, last_action_at: new Date().toISOString() }
          : l
      )
    );
    setToast({
      message: `Ação "${action}" executada com sucesso.`,
      type: "success",
    });
  }

  // ── Toast auto-dismiss ──
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="relative">
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-theme-sm transition-all ${
            toast.type === "success" ? "bg-success-500" : "bg-error-500"
          }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {data.tenant.name}
          </h1>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            Pipeline CRM
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          <PlusIcon />
          Novo Lead
        </button>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <MetricCard
          label="Total Leads"
          value={totalLeads}
          icon={<UsersIcon />}
        />
        <MetricCard
          label="Em Andamento"
          value={inProgressLeads}
          icon={<ClockIcon />}
        />
        <MetricCard
          label="Valor Pipeline"
          value={formatPipelineValue(totalValue)}
          icon={<CurrencyIcon />}
        />
        <MetricCard
          label="Conversão"
          value={`${conversionRate}%`}
          icon={<TrendUpIcon />}
        />
      </div>

      {/* ── Filter / Search ── */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar lead..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-theme-sm text-gray-700 placeholder-gray-400 shadow-theme-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* ── Board ── */}
      <div
        className="
          flex gap-4 overflow-x-auto pb-4
          scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700
        "
      >
        {sortedStages.map((stage: PipelineStage) => {
          const stageLeads = filteredLeads.filter(
            (l) => l.stage_id === stage.id
          );
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={stageLeads}
              onActionSuccess={handleActionSuccess}
            />
          );
        })}
      </div>
    </div>
  );
}
