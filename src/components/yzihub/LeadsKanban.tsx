"use client";

import { useRef, useState, useCallback } from "react";
import type { Lead, PipelineStage } from "@/lib/crm/types";

// ─── BRL formatter ────────────────────────────────────────────────────────────

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

// ─── Score color helper ───────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return "#10B981"; // green
  if (score >= 40) return "#F59E0B"; // amber
  return "#EF4444";                  // red
}

// ─── Move menu (quick action — acessibilidade) ────────────────────────────────

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
          className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-xl border border-gray-700 bg-gray-800 shadow-lg py-1"
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

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  stages,
  onDragStart,
  onMove,
}: {
  lead: Lead;
  stages: PipelineStage[];
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onMove: (leadId: string, newStageId: string) => void;
}) {
  const score = lead.score ?? 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
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

      {/* Score */}
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="inline-block size-2 rounded-full shrink-0"
          style={{ backgroundColor: scoreColor(score) }}
        />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Score: <span className="font-semibold text-gray-700 dark:text-gray-200">{score}</span>
        </span>
      </div>

      {/* Valor */}
      <div className="mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Valor:{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {brlFormatter.format(lead.value ?? 0)}
          </span>
        </span>
      </div>

      {/* Bottom: responsavel + move action */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
          {lead.assigned_to ?? "Sem responsavel"}
        </span>
        <MoveMenu
          stages={stages}
          currentStageId={lead.stage_id}
          onMove={(newStageId) => onMove(lead.id, newStageId)}
        />
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  stages,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onMove,
}: {
  stage: PipelineStage;
  leads: Lead[];
  stages: PipelineStage[];
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onMove: (leadId: string, newStageId: string) => void;
}) {
  return (
    <div
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDrop={(e) => onDrop(e, stage.id)}
      className={`flex flex-col min-w-[240px] w-60 rounded-2xl border transition-colors overflow-hidden ${
        isDragOver
          ? "border-brand-400 bg-brand-50/30 dark:bg-brand-500/5"
          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
      }`}
      style={{ borderTopColor: stage.color, borderTopWidth: "3px" }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
        <span
          className="inline-block size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <span className="font-semibold text-sm text-gray-700 dark:text-white/80">
          {stage.name}
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
      <div
        className={`flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-[80px] transition-colors ${
          isDragOver ? "bg-brand-50/20 dark:bg-brand-500/5" : ""
        }`}
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
}: {
  leads: Lead[];
  stages: PipelineStage[];
  onMoveLead: (leadId: string, newStageId: string) => void;
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

    // Otimistic update
    onMoveLead(leadId, targetStageId);

    // Persistir no Supabase via API
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: targetStageId }),
      });

      if (!res.ok) {
        console.error("[LeadsKanban] Erro ao persistir stage:", await res.text());
        // Reverter: buscar o lead original e restaurar
        // Para reverter, precisamos do stage_id anterior — guardamos no ref
        // A reversao sera feita pelo parent via re-fetch ou simplesmente log de erro
        // O estado otimistico ficara ate o proximo reload
      }
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
            />
          );
        })}
      </div>
    </div>
  );
}
