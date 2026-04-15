"use client";

import { useRef, useState, useCallback } from "react";
import type { Lead, LeadStatus, PipelineStage } from "@/lib/crm/types";

// ─── Status label map ─────────────────────────────────────────────────────────

const STATUS_LABEL: Record<LeadStatus, string> = {
  new:         "Novo Lead",
  contacted:   "Contato",
  qualified:   "Agendado",
  meeting:     "Reunião",
  proposal:    "Proposta",
  negotiation: "Contrato",
  won:         "Fechado",
  lost:        "Perdido",
};

const STATUS_COLOR: Record<LeadStatus, string> = {
  new:         "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  contacted:   "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  qualified:   "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  meeting:     "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  proposal:    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  won:         "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  lost:        "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

// ─── Score color ──────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 70) return "#10B981";
  if (s >= 40) return "#F59E0B";
  return "#EF4444";
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-brand-500","bg-violet-500","bg-amber-500",
  "bg-emerald-500","bg-rose-500","bg-sky-500","bg-orange-500",
];

function avatarBg(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  stages,
  onDragStart,
  onMove,
  onSelect,
}: {
  lead: Lead;
  stages: PipelineStage[];
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onMove: (leadId: string, newStageId: string) => void;
  onSelect?: (lead: Lead) => void;
}) {
  const score = lead.score ?? 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={() => onSelect?.(lead)}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3.5 hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all cursor-pointer active:cursor-grabbing select-none"
    >
      {/* ── Linha 1: Avatar + Nome + Status badge ── */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${avatarBg(lead.name)}`}>
          {initials(lead.name)}
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-white/90 truncate leading-tight">
          {lead.name}
        </span>
        <span className={`shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5 ${STATUS_COLOR[lead.status]}`}>
          {STATUS_LABEL[lead.status]}
        </span>
      </div>

      {/* ── Perfil resumido ── */}
      {lead.notes && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2.5 leading-relaxed">
          {lead.notes}
        </p>
      )}

      {/* ── Detalhes Jurema ── */}
      <div className="space-y-1 mb-2.5">
        {lead.interesse_principal && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <span className="text-[11px]">🏠</span>
            <span className="capitalize">{lead.interesse_principal}</span>
          </div>
        )}
        {lead.faixa_valor && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <span className="text-[11px]">💰</span>
            <span>{lead.faixa_valor}</span>
          </div>
        )}
        {lead.regiao_interesse && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <span className="text-[11px]">📍</span>
            <span>{lead.regiao_interesse}</span>
          </div>
        )}
      </div>

      {/* ── Score bar ── */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400">Score</span>
          <span className="text-[10px] font-semibold" style={{ color: scoreColor(score) }}>{score}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: scoreColor(score) }}
          />
        </div>
      </div>

      {/* ── Footer: data + corretor + mover ── */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex flex-col gap-0.5 min-w-0">
          {lead.assigned_to && (
            <span className="text-[10px] text-gray-400 truncate">👤 {lead.assigned_to}</span>
          )}
          <span className="text-[10px] text-gray-400">
            📅 {formatDate(lead.created_at)}
          </span>
        </div>
        <MoveMenu
          stages={stages}
          currentStageId={lead.stage_id}
          onMove={(newStageId) => onMove(lead.id, newStageId)}
        />
      </div>
    </div>
  );
}

// ─── Move menu ────────────────────────────────────────────────────────────────

function MoveMenu({
  stages,
  currentStageId,
  onMove,
}: {
  stages: PipelineStage[];
  currentStageId: string | null;
  onMove: (stageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const targets = stages.filter((s) => s.id !== currentStageId);

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
          className="absolute right-0 top-full mt-1 z-50 min-w-[130px] rounded-xl border border-gray-700 bg-gray-800 shadow-lg py-1"
          onMouseLeave={() => setOpen(false)}
        >
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={(e) => { e.stopPropagation(); onMove(t.id); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              style={{ borderLeft: `3px solid ${t.color}` }}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage, leads, stages, isDragOver,
  onDragStart, onDragOver, onDrop, onMove, onSelect,
}: {
  stage: PipelineStage;
  leads: Lead[];
  stages: PipelineStage[];
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onMove: (leadId: string, newStageId: string) => void;
  onSelect?: (lead: Lead) => void;
}) {
  return (
    <div
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDrop={(e) => onDrop(e, stage.id)}
      className={`flex flex-col min-w-[260px] w-64 rounded-2xl border transition-colors overflow-hidden ${
        isDragOver
          ? "border-brand-400 bg-brand-50/30 dark:bg-brand-500/5"
          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
      }`}
      style={{ borderTopColor: stage.color, borderTopWidth: "3px" }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
        <span className="inline-block size-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
        <span className="font-semibold text-sm text-gray-700 dark:text-white/80">{stage.name}</span>
        <span
          className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
        >
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div
        className={`flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-[80px] transition-colors ${isDragOver ? "bg-brand-50/20 dark:bg-brand-500/5" : ""}`}
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        {leads.length === 0 && !isDragOver && (
          <div className="flex items-center justify-center h-20 text-center">
            <p className="text-xs text-gray-300 dark:text-gray-600">Arraste um card aqui</p>
          </div>
        )}
        {leads.length === 0 && isDragOver && (
          <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-brand-300 dark:border-brand-600">
            <p className="text-xs text-brand-400">Soltar aqui</p>
          </div>
        )}
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            stages={stages}
            onDragStart={onDragStart}
            onMove={onMove}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

// ─── LeadsKanban ──────────────────────────────────────────────────────────────

export default function LeadsKanban({
  leads,
  stages,
  onMoveLead,
  onLeadSelect,
}: {
  leads: Lead[];
  stages: PipelineStage[];
  onMoveLead: (leadId: string, newStageId: string) => void;
  onLeadSelect?: (lead: Lead) => void;
}) {
  const dragLeadId = useRef<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    dragLeadId.current = leadId;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStageId(stageId);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const leadId = dragLeadId.current;
    if (!leadId) return;

    dragLeadId.current = null;
    setDragOverStageId(null);

    onMoveLead(leadId, targetStageId);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: targetStageId }),
      });
      if (!res.ok) console.error("[LeadsKanban] Erro ao persistir stage:", await res.text());
    } catch (err) {
      console.error("[LeadsKanban] Erro de rede ao mover lead:", err);
    }
  }, [onMoveLead]);

  const handleDragEnd = useCallback(() => {
    setDragOverStageId(null);
    dragLeadId.current = null;
  }, []);

  return (
    <div className="overflow-x-auto pb-4" onDragEnd={handleDragEnd}>
      <div className="flex gap-4 min-w-max">
        {sortedStages.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage_id === stage.id);
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={stageLeads}
              stages={sortedStages}
              isDragOver={dragOverStageId === stage.id}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onMove={onMoveLead}
              onSelect={onLeadSelect}
            />
          );
        })}
      </div>
    </div>
  );
}
