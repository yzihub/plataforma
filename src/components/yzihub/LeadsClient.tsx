"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import LeadDrawer from "@/components/yzihub/LeadDrawer";
import LeadsDataTable from "@/components/yzihub/LeadsDataTable";
import LeadsKanban from "@/components/yzihub/LeadsKanban";
import LeadsKpiStrip from "@/components/yzihub/LeadsKpiStrip";
import type { Lead, PipelineStage } from "@/lib/crm/types";
import { PlusIcon, GridIcon, ListIcon } from "@/icons";

// ─── Corretor type (shared with drawer) ───────────────────────────────────────

export type Corretor = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
};

// ─── Botão Novo Lead ─────────────────────────────────────────────────────────

function NovoLeadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors"
    >
      <PlusIcon className="size-4" />
      Novo Lead
    </button>
  );
}

// ─── LeadsClient ──────────────────────────────────────────────────────────────

export default function LeadsClient({
  initialLeads,
  stages,
}: {
  initialLeads: Lead[];
  stages: PipelineStage[];
}) {
  const searchParams = useSearchParams();

  // Default is always "table"; "kanban" only when explicit query param
  const initialView = searchParams?.get("view") === "kanban" ? "kanban" : "table";
  const [view, setView] = useState<"table" | "kanban">(initialView);

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");

  const [corretores, setCorretores] = useState<Corretor[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/brokers", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || cancelled) return;
        const active: Corretor[] = data
          .filter((b: { is_active?: boolean }) => b.is_active !== false)
          .map((b: { id: string; name: string; phone?: string | null; email?: string | null }) => ({
            id: b.id,
            name: b.name,
            phone: b.phone ?? undefined,
            email: b.email ?? undefined,
          }));
        setCorretores(active);
      } catch (err) {
        console.error("[LeadsClient] falha ao carregar corretores:", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  function openNewLead() {
    setSelectedLead(null);
    setDrawerOpen(true);
  }

  function openLead(lead: Lead) {
    setSelectedLead(lead);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedLead(null);
  }

  function handleLeadSaved(savedLead: Lead) {
    setLeads((prev) => {
      const exists = prev.some((l) => l.id === savedLead.id);
      return exists
        ? prev.map((l) => l.id === savedLead.id ? savedLead : l)
        : [savedLead, ...prev];
    });
    setSelectedLead(savedLead);
  }

  function handleLeadDeleted(leadId: string) {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    closeDrawer();
  }

  const handleMoveLead = (leadId: string, newStageId: string) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, stage_id: newStageId, last_action_at: new Date().toISOString() }
          : l
      )
    );
  };

  // Inline edit handler — optimistic update; persist to Supabase via PATCH /api/leads/:id (TODO)
  function handleInlineEdit(leadId: string, patch: Partial<Lead>) {
    setLeads((prev) =>
      prev.map((l) => l.id === leadId ? { ...l, ...patch } : l)
    );
    // TODO: persist to Supabase via PATCH /api/leads/:id
  }

  // Kanban: all 3 filters
  const kanbanLeads = useMemo(() => leads.filter((l) => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.phone ?? "").includes(search);
    const matchStatus = !filterStatus || l.status === filterStatus;
    const matchSource = !filterSource || l.source === filterSource;
    return matchSearch && matchStatus && matchSource;
  }), [leads, search, filterStatus, filterSource]);

  // Table: search + source (status filtered via KPI strip click — passed to table)
  const tableLeads = useMemo(() => leads.filter((l) => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.phone ?? "").includes(search);
    const matchStatus = !filterStatus || l.status === filterStatus;
    const matchSource = !filterSource || l.source === filterSource;
    return matchSearch && matchStatus && matchSource;
  }), [leads, search, filterStatus, filterSource]);

  const displayCount = view === "table" ? tableLeads.length : kanbanLeads.length;

  // Unique sources from all leads (for origin filter)
  const sources = useMemo(
    () => Array.from(new Set(leads.map((l) => l.source).filter(Boolean))) as string[],
    [leads]
  );

  return (
    <>
      <div className="space-y-5">
        {/* Header row — simplified: title + count + Novo Lead button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Leads</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {displayCount} de {leads.length} leads
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Toggle Grid / Kanban */}
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-800 dark:bg-gray-900">
              <button
                type="button"
                onClick={() => setView("table")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "table"
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <GridIcon className="size-4" /> Grid
              </button>
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "kanban"
                    ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                }`}
              >
                <ListIcon className="size-3.5" /> Kanban
              </button>
            </div>
            <NovoLeadButton onClick={openNewLead} />
          </div>
        </div>

        {/* Table view (default) */}
        {view === "table" && (
          <>
            {/* KPI strip — above table, clickable to filter by status */}
            <LeadsKpiStrip
              leads={leads}
              activeStatus={filterStatus}
              onStatusClick={setFilterStatus}
            />

            <LeadsDataTable
              leads={tableLeads}
              onSelect={openLead}
              activeStatus={filterStatus}
              onStatusChange={setFilterStatus}
              search={search}
              onSearchChange={setSearch}
              activeSource={filterSource}
              onSourceChange={setFilterSource}
              sources={sources}
              corretores={corretores}
              onInlineEdit={handleInlineEdit}
              selectedLeadId={selectedLead?.id ?? null}
            />
          </>
        )}

        {/* Kanban view — accessible only via ?view=kanban */}
        {view === "kanban" && (
          <>
            <LeadsKanban
              leads={kanbanLeads}
              stages={stages}
              onMoveLead={handleMoveLead}
              onLeadSelect={openLead}
              selectedLeadId={selectedLead?.id ?? null}
            />
          </>
        )}
      </div>

      <LeadDrawer
        lead={selectedLead}
        isOpen={drawerOpen}
        onClose={closeDrawer}
        onLeadSaved={handleLeadSaved}
        onLeadDeleted={handleLeadDeleted}
        corretores={corretores}
      />
    </>
  );
}
