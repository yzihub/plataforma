"use client";

import { useState, useRef, useCallback } from "react";
import Badge from "@/components/ui/badge/Badge";
import CommandButton, { CrmAction } from "@/components/yzihub/CommandButton";
import LeadDrawer from "@/components/yzihub/LeadDrawer";
import { cafePamData } from "@/lib/crm/mock-data";
import type { Lead, LeadStatus, PipelineStage } from "@/lib/crm/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_ACTIONS: Record<LeadStatus, CrmAction[]> = {
  new: ["contact"],
  contacted: ["schedule"],
  meeting: ["send_proposal", "lose"],
  proposal: ["close", "lose"],
  won: [],
  lost: [],
};

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

const STATUS_BADGE: Record<LeadStatus, { color: BadgeColor; label: string }> = {
  new: { color: "info", label: "Novo" },
  contacted: { color: "warning", label: "Contato" },
  meeting: { color: "primary", label: "Reunião" },
  proposal: { color: "warning", label: "Proposta" },
  won: { color: "success", label: "Fechado" },
  lost: { color: "dark", label: "Perdido" },
};

const ORIGEM_COLORS: Record<string, string> = {
  Instagram: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400",
  Site: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  Indicação: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  WhatsApp: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Zap Imóveis": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  OLX: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
};

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-orange-500",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1).replace(".", ",")}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function daysInStage(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (days === 0) return "hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ lead }: { lead: Lead }) {
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarColor(lead.id)}`}
    >
      {getInitials(lead.name)}
    </div>
  );
}

function OrigemBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const cls = ORIGEM_COLORS[source] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {source}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full ${scoreColor(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 w-5 text-right">{score}</span>
    </div>
  );
}

// ─── Lead Card (draggable) ────────────────────────────────────────────────────

function PipelineLeadCard({
  lead,
  onDragStart,
  onClick,
}: {
  lead: Lead;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onClick: (lead: Lead) => void;
}) {
  const actions = STAGE_ACTIONS[lead.status];
  const badge = STATUS_BADGE[lead.status];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={() => onClick(lead)}
      className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800 cursor-grab active:cursor-grabbing hover:border-brand-300 hover:shadow-md transition-all space-y-2.5"
    >
      {/* Row 1: Avatar + Nome + Status */}
      <div className="flex items-center gap-2">
        <Avatar lead={lead} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{lead.name}</p>
          {lead.company && (
            <p className="text-[11px] text-gray-400 truncate">{lead.company}</p>
          )}
        </div>
        <Badge size="sm" color={badge.color}>{badge.label}</Badge>
      </div>

      {/* Row 2: Origem + Valor */}
      <div className="flex items-center justify-between gap-2">
        <OrigemBadge source={lead.source} />
        {lead.value > 0 && (
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
            {formatCurrency(lead.value)}
          </span>
        )}
      </div>

      {/* Row 3: Score */}
      <ScoreBar score={lead.score} />

      {/* Row 4: CommandButtons */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {actions.map((action) => (
            <CommandButton
              key={action}
              action={action}
              leadId={lead.id}
              tenantId={lead.tenant_id}
            />
          ))}
        </div>
      )}

      {/* Row 5: Tempo no stage */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50 dark:border-gray-700/60">
        <span className="text-[10px] text-gray-400">⏱ {daysInStage(lead.created_at)}</span>
        {lead.last_action_at && (
          <span className="text-[10px] text-gray-400">
            Última ação: {new Date(lead.last_action_at).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function PipelineColumn({
  stage,
  leads,
  totalLeads,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  onClickLead,
}: {
  stage: PipelineStage;
  leads: Lead[];
  totalLeads: number;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  isDragOver: boolean;
  onClickLead: (lead: Lead) => void;
}) {
  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0);
  const pct = totalLeads > 0 ? Math.round((leads.length / totalLeads) * 100) : 0;

  return (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.id)}
      className={`flex flex-col w-72 shrink-0 rounded-xl border transition-colors ${
        isDragOver
          ? "border-brand-400 bg-brand-50/30 dark:bg-brand-500/5"
          : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
      }`}
    >
      {/* Column header */}
      <div className="px-3.5 pt-3.5 pb-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
              {stage.name}
            </span>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full shrink-0">
              {leads.length}
            </span>
          </div>
          {leads.length > 0 && (
            <span className="text-[11px] text-gray-400 shrink-0">{formatCurrency(totalValue)}</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: stage.color }}
            />
          </div>
          <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
        </div>
      </div>

      {/* Lead cards */}
      <div
        className={`flex flex-col gap-2.5 p-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-260px)] min-h-[80px] transition-colors ${
          isDragOver ? "bg-brand-50/20 dark:bg-brand-500/5" : ""
        }`}
      >
        {leads.length === 0 && !isDragOver && (
          <div className="flex flex-col items-center justify-center h-20 text-center">
            <p className="text-xs text-gray-300 dark:text-gray-600">Arraste um card aqui</p>
          </div>
        )}
        {isDragOver && leads.length === 0 && (
          <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-brand-300 dark:border-brand-600">
            <p className="text-xs text-brand-400">Soltar aqui</p>
          </div>
        )}
        {leads.map((lead) => (
          <PipelineLeadCard key={lead.id} lead={lead} onDragStart={onDragStart} onClick={onClickLead} />
        ))}
      </div>

      {/* Column footer */}
      {leads.length > 0 && (
        <div className="px-3.5 py-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-[10px] text-gray-400">
            Total: {leads.reduce((s, l) => s + l.value, 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>(cafePamData.leads);
  const [search, setSearch] = useState("");
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const dragLeadId = useRef<string | null>(null);

  const stages = [...cafePamData.stages].sort((a, b) => a.position - b.position);

  const filtered = search.trim()
    ? leads.filter((l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.company ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : leads;

  const totalLeads = filtered.length;
  const totalValue = leads.reduce((s, l) => s + l.value, 0);
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const convRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // ── DnD handlers ──

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    dragLeadId.current = leadId;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStageId(stageId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = dragLeadId.current;
    if (!leadId) return;

    const targetStage = stages.find((s) => s.id === stageId);
    if (!targetStage) return;

    // Map stage position to LeadStatus
    const statusMap: Record<number, LeadStatus> = {
      1: "new",
      2: "contacted",
      3: "meeting",
      4: "proposal",
      5: "won",
      6: "lost",
    };
    const newStatus = statusMap[targetStage.position] ?? "new";

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, stage_id: stageId, status: newStatus, last_action_at: new Date().toISOString() }
          : l
      )
    );
    setDragOverStageId(null);
    dragLeadId.current = null;
  }, [stages]);

  const handleDragEnd = useCallback(() => {
    setDragOverStageId(null);
    dragLeadId.current = null;
  }, []);

  return (
    <div className="space-y-5" onDragEnd={handleDragEnd}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {cafePamData.tenant.name} • {totalLeads} leads
          </p>
        </div>

        {/* Busca */}
        <div className="relative w-full sm:w-64">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Leads", value: totalLeads },
          { label: "Valor Pipeline", value: formatCurrency(totalValue) },
          { label: "Fechados", value: wonLeads },
          { label: "Conversão", value: `${convRate}%` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-lg font-bold text-gray-800 dark:text-white/90">{value}</p>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = filtered.filter((l) => l.stage_id === stage.id);
          return (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              leads={stageLeads}
              totalLeads={totalLeads}
              onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDrop={handleDrop}
              isDragOver={dragOverStageId === stage.id}
              onClickLead={setSelectedLead}
            />
          );
        })}
      </div>

      {/* Lead Drawer */}
      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onStageChange={(leadId, newStatus) => {
          setLeads((prev) =>
            prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l)
          );
        }}
      />
    </div>
  );
}
