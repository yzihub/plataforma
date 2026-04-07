"use client";

import { useState } from "react";
import type { Lead, LeadStatus } from "@/lib/crm/types";

// ─── BRL formatter ────────────────────────────────────────────────────────────

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

// ─── Jurema pipeline stages ───────────────────────────────────────────────────

const STAGES: { id: string; label: string; status: LeadStatus; color: string }[] = [
  { id: "novo",        label: "Novo",        status: "new",         color: "#3B82F6" },
  { id: "contato",     label: "Contato",     status: "contacted",   color: "#64748B" },
  { id: "qualificado", label: "Qualificado", status: "qualified",   color: "#F59E0B" },
  { id: "reuniao",     label: "Reunião",     status: "meeting",     color: "#8B5CF6" },
  { id: "proposta",    label: "Proposta",    status: "proposal",    color: "#F97316" },
  { id: "contrato",    label: "Contrato",    status: "negotiation", color: "#10B981" },
  { id: "fechado",     label: "Fechado",     status: "won",         color: "#22C55E" },
  { id: "perdido",     label: "Perdido",     status: "lost",        color: "#EF4444" },
];

// ─── Score color helper ───────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return "#10B981"; // green
  if (score >= 40) return "#F59E0B"; // amber
  return "#EF4444";                  // red
}

// ─── Move menu (quick action) ─────────────────────────────────────────────────

function MoveMenu({
  currentStatus,
  onMove,
}: {
  currentStatus: LeadStatus;
  onMove: (status: LeadStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const targets = STAGES.filter((s) => s.status !== currentStatus);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="text-[10px] text-gray-400 hover:text-gray-200 transition-colors px-1.5 py-0.5 rounded border border-gray-700 hover:border-gray-500"
        title="Mover para..."
      >
        Mover
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-xl border border-gray-700 bg-gray-800 shadow-lg py-1"
          onMouseLeave={() => setOpen(false)}
        >
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={(e) => { e.stopPropagation(); onMove(t.status); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              style={{ borderLeft: `3px solid ${t.color}` }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  onMove,
}: {
  lead: Lead;
  onMove: (leadId: string, newStatus: LeadStatus) => void;
}) {
  const score = lead.score ?? 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 hover:shadow-md transition-shadow cursor-default">
      {/* Top: name + source badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-sm text-gray-800 dark:text-white/90 leading-tight line-clamp-1">
          {lead.name}
        </span>
        {lead.source && (
          <span className="shrink-0 text-[10px] font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 rounded px-1.5 py-0.5">
            {lead.source}
          </span>
        )}
      </div>

      {/* Score Luana */}
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="inline-block size-2 rounded-full shrink-0"
          style={{ backgroundColor: scoreColor(score) }}
        />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Score Luana: <span className="font-semibold text-gray-700 dark:text-gray-200">{score}</span>
        </span>
      </div>

      {/* VGV */}
      <div className="mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          VGV:{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {brlFormatter.format(lead.value ?? 0)}
          </span>
        </span>
      </div>

      {/* Bottom: Corretor + move action */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
          Corretor: {lead.assigned_to ?? "Sem corretor"}
        </span>
        <MoveMenu
          currentStatus={lead.status}
          onMove={(newStatus) => onMove(lead.id, newStatus)}
        />
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  onMove,
}: {
  stage: typeof STAGES[number];
  leads: Lead[];
  onMove: (leadId: string, newStatus: LeadStatus) => void;
}) {
  return (
    <div
      className="flex flex-col min-w-[240px] w-60 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-hidden"
      style={{ borderTopColor: stage.color, borderTopWidth: "3px" }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
        <span
          className="inline-block size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <span className="font-semibold text-sm text-gray-700 dark:text-white/80">
          {stage.label}
        </span>
        <span
          className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            backgroundColor: `${stage.color}20`,
            color: stage.color,
          }}
        >
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
        {leads.length === 0 ? (
          <p className="text-center text-xs text-gray-400 dark:text-gray-600 py-6">
            Nenhum lead
          </p>
        ) : (
          leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onMove={onMove} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── LeadsKanban ──────────────────────────────────────────────────────────────

export default function LeadsKanban({ leads }: { leads: Lead[] }) {
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);

  const handleMove = (leadId: string, newStatus: LeadStatus) => {
    setLocalLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {STAGES.map((stage) => {
          const stageLeads = localLeads.filter((l) => l.status === stage.status);
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={stageLeads}
              onMove={handleMove}
            />
          );
        })}
      </div>
    </div>
  );
}
