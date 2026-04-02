"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import LeadDrawer from "@/components/yzihub/LeadDrawer";
import LeadsDataTable from "@/components/yzihub/LeadsDataTable";
import LeadsKanban from "@/components/yzihub/LeadsKanban";
import type { Lead } from "@/lib/crm/types";
import { PlusIcon } from "@/icons";

// ─── Filter options ───────────────────────────────────────────────────────────

const ALL_STATUS = [
  { value: "new",         label: "Novo Lead" },
  { value: "contacted",   label: "Contato" },
  { value: "qualified",   label: "Agendado" },
  { value: "proposal",    label: "Proposta" },
  { value: "negotiation", label: "Contrato" },
  { value: "won",         label: "Fechado" },
  { value: "lost",        label: "Perdido" },
];

const ALL_SOURCES = ["Instagram", "Site", "Indicação", "WhatsApp", "Zap Imóveis", "OLX", "LinkedIn", "Google Ads", "TikTok"];

// ─── View toggle icons ────────────────────────────────────────────────────────

function TableViewIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`size-4 transition-colors ${active ? "text-brand-500" : "text-gray-400"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function KanbanViewIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`size-4 transition-colors ${active ? "text-brand-500" : "text-gray-400"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="5" height="12" rx="1" />
      <rect x="17" y="3" width="5" height="15" rx="1" />
    </svg>
  );
}

// ─── SearchBar ────────────────────────────────────────────────────────────────

function SearchBar({
  search,
  status,
  source,
  onSearch,
  onStatus,
  onSource,
}: {
  search: string;
  status: string;
  source: string;
  onSearch: (v: string) => void;
  onStatus: (v: string) => void;
  onSource: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          placeholder="Buscar lead por nome..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder-gray-500"
        />
      </div>

      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className="rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90"
      >
        <option value="">Todos os status</option>
        {ALL_STATUS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <select
        value={source}
        onChange={(e) => onSource(e.target.value)}
        className="rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90"
      >
        <option value="">Todas as origens</option>
        {ALL_SOURCES.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ─── LeadsClient ──────────────────────────────────────────────────────────────

export default function LeadsClient({ initialLeads }: { initialLeads: Lead[] }) {
  const searchParams = useSearchParams();
  const initialView = searchParams?.get("view") === "kanban" ? "kanban" : "table";

  const [view, setView] = useState<"table" | "kanban">(initialView);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filteredLeads = useMemo(() => {
    return initialLeads.filter((l) => {
      const matchSearch =
        !search ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.phone ?? "").includes(search);
      const matchStatus = !filterStatus || l.status === filterStatus;
      const matchSource = !filterSource || l.source === filterSource;
      return matchSearch && matchStatus && matchSource;
    });
  }, [initialLeads, search, filterStatus, filterSource]);

  return (
    <>
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Leads</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredLeads.length} de {initialLeads.length} leads
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-1">
              <button
                onClick={() => setView("table")}
                className={`rounded-lg p-1.5 transition-colors ${
                  view === "table"
                    ? "bg-brand-500/10"
                    : "hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                }`}
                title="Visualizacao em tabela"
              >
                <TableViewIcon active={view === "table"} />
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`rounded-lg p-1.5 transition-colors ${
                  view === "kanban"
                    ? "bg-brand-500/10"
                    : "hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                }`}
                title="Visualizacao Kanban"
              >
                <KanbanViewIcon active={view === "kanban"} />
              </button>
            </div>

            <button className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors">
              <PlusIcon className="size-4" />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Table view */}
        {view === "table" && (
          <>
            <SearchBar
              search={search}
              status={filterStatus}
              source={filterSource}
              onSearch={setSearch}
              onStatus={setFilterStatus}
              onSource={setFilterSource}
            />
            <LeadsDataTable leads={filteredLeads} onSelect={setSelectedLead} />
          </>
        )}

        {/* Kanban view */}
        {view === "kanban" && (
          <LeadsKanban leads={filteredLeads} />
        )}
      </div>

      {view === "table" && (
        <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </>
  );
}
