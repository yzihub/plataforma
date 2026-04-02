"use client";

import { useState, useMemo } from "react";
import type { FinanceRecord } from "@/types/finance";

// ─── BRL formatter ─────────────────────────────────────────────────────────────

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// ─── Bell icon ─────────────────────────────────────────────────────────────────

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─── Status bar config ─────────────────────────────────────────────────────────

type StatusKey = "concluido" | "em_andamento" | "pendente" | "atrasado";

const STATUS_BAR: Record<StatusKey, { barClass: string; labelClass: string }> = {
  concluido:    { barClass: "bg-emerald-500",              labelClass: "text-emerald-600 dark:text-emerald-400" },
  em_andamento: { barClass: "bg-amber-400",                labelClass: "text-amber-600 dark:text-amber-400" },
  pendente:     { barClass: "bg-blue-500",                 labelClass: "text-blue-600 dark:text-blue-400" },
  atrasado:     { barClass: "bg-red-500 animate-pulse",    labelClass: "text-red-600 dark:text-red-400" },
};

function statusConfig(status: string | undefined) {
  return STATUS_BAR[(status as StatusKey) ?? "pendente"] ?? STATUS_BAR.pendente;
}

// ─── SearchBar ─────────────────────────────────────────────────────────────────

function SearchBar({
  search,
  onSearch,
}: {
  search: string;
  onSearch: (v: string) => void;
}) {
  return (
    <div className="relative flex-1">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder="Buscar por ID ou descricao..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder-gray-500"
      />
    </div>
  );
}

// ─── FinanceiroClient ──────────────────────────────────────────────────────────

export default function FinanceiroClient({
  initialRecords,
}: {
  initialRecords: FinanceRecord[];
}) {
  const [search, setSearch] = useState("");

  const filteredRecords = useMemo(() => {
    if (!search) return initialRecords;
    const q = search.toLowerCase();
    return initialRecords.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)
    );
  }, [initialRecords, search]);

  // ─── Summary metrics ───────────────────────────────────────────────────────

  const totalComissoes = useMemo(
    () => initialRecords.reduce((s, r) => s + r.final_amount, 0),
    [initialRecords]
  );

  const aReceber = useMemo(
    () =>
      initialRecords
        .filter((r) => r.status === "pendente" || r.status === "em_andamento")
        .reduce((s, r) => s + r.final_amount, 0),
    [initialRecords]
  );

  const atrasadosCount = useMemo(
    () => initialRecords.filter((r) => r.status === "atrasado").length,
    [initialRecords]
  );

  // ─── Bar chart data ────────────────────────────────────────────────────────

  const maxAmount = useMemo(
    () => Math.max(...initialRecords.map((r) => r.final_amount), 1),
    [initialRecords]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Financeiro
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filteredRecords.length} de {initialRecords.length} registros
          </p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Total Comissoes</p>
          <p className="mt-1.5 text-xl font-bold text-gray-800 dark:text-white/90">{brlFormatter.format(totalComissoes)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">A Receber</p>
          <p className="mt-1.5 text-xl font-bold text-blue-600 dark:text-blue-400">{brlFormatter.format(aReceber)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Atrasados</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <p className="text-xl font-bold text-red-500">{atrasadosCount}</p>
          </div>
        </div>
      </div>

      {/* Bar chart — Comissoes por Status */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Comissoes por Status
        </h2>
        <div className="space-y-3">
          {initialRecords.map((record) => {
            const cfg = statusConfig(record.status ?? undefined);
            const widthPct = Math.max(4, Math.round((record.final_amount / maxAmount) * 100));
            return (
              <div key={record.id} className="flex items-center gap-3">
                {/* Label */}
                <span className="w-52 shrink-0 truncate text-xs text-gray-600 dark:text-gray-400">
                  {record.description ?? record.id.slice(0, 8)}
                </span>
                {/* Bar */}
                <div className="flex-1 h-5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cfg.barClass}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                {/* Amount */}
                <span className={`w-32 shrink-0 text-right text-xs font-semibold ${cfg.labelClass}`}>
                  {brlFormatter.format(record.final_amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <SearchBar search={search} onSearch={setSearch} />

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead>
            <tr className="bg-gray-50 dark:bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Descricao
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Valor
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Alerta Financeiro
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Prioridade
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className="bg-white transition-colors hover:bg-gray-50 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                >
                  {/* Descricao */}
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {record.description ?? <span className="font-mono text-xs text-gray-400">{record.id.slice(0, 8)}…</span>}
                  </td>

                  {/* Valor — BRL formatted */}
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                    {brlFormatter.format(record.final_amount)}
                  </td>

                  {/* Alerta Financeiro */}
                  <td className="px-4 py-3">
                    {record.financial_alert ? (
                      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-500">
                        ATENCAO
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
                        OK
                      </span>
                    )}
                  </td>

                  {/* Prioridade */}
                  <td className="px-4 py-3">
                    {record.priority_flag ? (
                      <BellIcon className="size-5 animate-pulse text-amber-500" />
                    ) : (
                      <BellIcon className="size-5 text-gray-400" />
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {record.status === "atrasado" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-500 animate-pulse">
                        ATRASADO
                      </span>
                    ) : (
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {record.status ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
