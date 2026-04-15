"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Badge from "@/components/ui/badge/Badge";
import CommandButton, { CrmAction } from "@/components/yzihub/CommandButton";
import LeadDrawer from "@/components/yzihub/LeadDrawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cafePamData } from "@/lib/crm/mock-data";
import type { Lead, LeadStatus, PipelineStage } from "@/lib/crm/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_PAGAMENTO_CONFIRMADO = "stage-cafepam-04";

const STAGE_ACTIONS: Record<LeadStatus, CrmAction[]> = {
  new:         ["contact"],
  contacted:   ["schedule"],
  qualified:   ["schedule"],
  meeting:     ["send_proposal", "lose"],
  proposal:    ["close", "lose"],
  negotiation: ["close", "lose"],
  won:         [],
  lost:        [],
};

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

const STATUS_BADGE: Record<LeadStatus, { color: BadgeColor; label: string }> = {
  new:         { color: "info",    label: "🔥 Novo Lead" },
  contacted:   { color: "warning", label: "📅 Agendado" },
  qualified:   { color: "primary", label: "📅 Agendado" },
  meeting:     { color: "primary", label: "💬 Em Atendimento" },
  proposal:    { color: "success", label: "💳 Pag. Confirmado" },
  negotiation: { color: "warning", label: "📋 Contrato" },
  won:         { color: "dark",    label: "✅ Concluído" },
  lost:        { color: "error",   label: "❌ Cancelado" },
};

const ORIGEM_COLORS: Record<string, string> = {
  Instagram:    "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400",
  Site:         "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  Indicação:    "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  WhatsApp:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Zap Imóveis":"bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  OLX:          "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
};

const AVATAR_COLORS = [
  "bg-blue-500","bg-violet-500","bg-emerald-500",
  "bg-amber-500","bg-rose-500","bg-cyan-500","bg-orange-500",
];

// ─── Mock chat messages ───────────────────────────────────────────────────────

const MOCK_MSGS = [
  { id: "1", de: "agente" as const, texto: "Olá! Sou a Nina, assistente da Café com Pam. Vi seu interesse em design de interiores. Posso te ajudar?", hora: "10:02" },
  { id: "2", de: "lead" as const, texto: "Oi! Sim, quero reformar a sala e dois quartos do meu apê.", hora: "10:05" },
  { id: "3", de: "agente" as const, texto: "Que projeto incrível! Qual é o tamanho aproximado do apartamento?", hora: "10:06" },
  { id: "4", de: "lead" as const, texto: "Uns 90m². Fica no Itaim Bibi.", hora: "10:08" },
  { id: "5", de: "agente" as const, texto: "Perfeito! Vou passar seus dados para a Pam entrar em contato e agendar uma visita técnica. 🏡", hora: "10:09" },
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
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });
}

function daysInStage(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (days === 0) return "hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

function Avatar({ lead, size = "sm" }: { lead: Lead; size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-bold text-white shrink-0 ${avatarColor(lead.id)}`}>
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

// ─── Scrollbar utility class ──────────────────────────────────────────────────
// Applied via className where needed
const SCROLLBAR_THIN =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600";

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({ lead }: { lead: Lead | null }) {
  const [input, setInput] = useState("");

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3 select-none">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">
          💬
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Selecione um lead</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[160px]">
          Clique em qualquer linha do grid para ver a conversa
        </p>
      </div>
    );
  }

  const actions = STAGE_ACTIONS[lead.status];
  const firstName = lead.name.split(" ")[0];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Lead header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <Avatar lead={lead} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">{lead.name}</p>
          <Badge size="sm" color={STATUS_BADGE[lead.status].color}>
            {STATUS_BADGE[lead.status].label}
          </Badge>
        </div>
      </div>

      {/* Ghost action buttons */}
      {actions.length > 0 && (
        <div className="py-2.5 flex flex-wrap gap-1.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
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

      {/* WhatsApp indicator */}
      <div className="py-2 flex items-center gap-1.5 shrink-0">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-[10px] text-gray-400">WhatsApp · Evolution API + n8n</span>
      </div>

      {/* Messages */}
      <div
        className={`flex-1 overflow-y-auto space-y-2.5 min-h-0 pr-1 ${SCROLLBAR_THIN}`}
      >
        {MOCK_MSGS.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.de === "agente" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 text-sm shadow-sm ${
                msg.de === "agente"
                  ? "rounded-xl rounded-tl-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  : "rounded-xl rounded-tr-sm bg-brand-500 text-white"
              }`}
              style={{ borderRadius: "12px", ...(msg.de === "agente" ? { borderTopLeftRadius: "4px" } : { borderTopRightRadius: "4px" }) }}
            >
              <p className="leading-relaxed">{msg.texto}</p>
              <p className={`text-[10px] mt-1.5 ${msg.de === "agente" ? "text-gray-400" : "text-white/60"}`}>
                {msg.hora} · {msg.de === "agente" ? "Nina" : firstName}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="pt-3 flex gap-2 shrink-0 border-t border-gray-100 dark:border-gray-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setInput("")}
          placeholder="Mensagem via WhatsApp..."
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={() => setInput("")}
          className="rounded-xl bg-brand-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          ▶
        </button>
      </div>
    </div>
  );
}

// ─── Grid View ────────────────────────────────────────────────────────────────

function GridView({
  leads,
  onSelect,
  onOpenDrawer,
}: {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
  onOpenDrawer: (lead: Lead) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className={`max-w-full overflow-x-auto ${SCROLLBAR_THIN}`}>
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow className="bg-gray-50 dark:bg-gray-800/40">
              {["Nome do Cliente", "Status do Lead", "Valor Total", "Data", "Origem", ""].map((h) => (
                <TableCell
                  key={h}
                  isHeader
                  className="py-3 px-5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-left"
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-50 dark:divide-gray-800">
            {leads.length === 0 ? (
              <TableRow>
                <TableCell className="py-16 px-5 text-center text-sm text-gray-400">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead, i) => (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  onClick={() => onSelect(lead)}
                  className="cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <Avatar lead={lead} />
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">{lead.name}</p>
                        {lead.email && <p className="text-xs text-gray-400">{lead.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <Badge size="sm" color={STATUS_BADGE[lead.status].color}>
                      {STATUS_BADGE[lead.status].label}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5 text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                    {lead.value > 0 ? (
                      lead.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-sm text-gray-400 whitespace-nowrap">
                    {formatDate(lead.created_at)}
                  </td>
                  <td className="py-3.5 px-5">
                    <OrigemBadge source={lead.source} />
                  </td>
                  <td className="py-3.5 px-5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenDrawer(lead); }}
                      className="text-xs text-brand-500 font-medium hover:underline whitespace-nowrap"
                    >
                      Ver detalhes ↗
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({
  lead,
  onDragEnd,
  onClick,
}: {
  lead: Lead;
  onDragEnd: (leadId: string, point: { x: number; y: number }) => void;
  onClick: (lead: Lead) => void;
}) {
  return (
    <motion.div
      layout
      layoutId={`card-${lead.id}`}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      whileDrag={{ scale: 1.03, boxShadow: "0 20px 40px rgba(0,0,0,0.4)", zIndex: 50, cursor: "grabbing" }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      onDragEnd={(e, info) => onDragEnd(lead.id, info.point)}
      onClick={() => onClick(lead)}
      className="rounded-xl border border-gray-800 bg-gray-950 p-3 cursor-grab hover:border-gray-700 hover:bg-gray-900 transition-[border,background] select-none group"
    >
      {/* Row 1: Nome + 3-dot menu */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <p className="text-sm font-semibold text-white/90 truncate leading-snug">{lead.name}</p>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClick(lead); }}
          className="shrink-0 p-0.5 rounded text-gray-600 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
          title="Ver detalhes"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>

      {/* Row 2: Origem + Valor */}
      <div className="flex items-center justify-between gap-2">
        <OrigemBadge source={lead.source} />
        {lead.value > 0 && (
          <span className="text-xs font-bold text-white/70 whitespace-nowrap tabular-nums">
            {formatCurrency(lead.value)}
          </span>
        )}
      </div>

      {/* Row 3: Tempo (subtle footer) */}
      <p className="mt-2.5 text-[9px] text-gray-600 tracking-wide">
        ⏱ {daysInStage(lead.created_at)}
      </p>
    </motion.div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage, leads, totalLeads, columnRef, isDragOver, onDragEnd, onClickLead,
}: {
  stage: PipelineStage;
  leads: Lead[];
  totalLeads?: number;
  columnRef: (el: HTMLDivElement | null) => void;
  isDragOver: boolean;
  onDragEnd: (leadId: string, point: { x: number; y: number }) => void;
  onClickLead: (lead: Lead) => void;
}) {

  return (
    <motion.div
      ref={columnRef}
      layout
      className={`flex flex-col w-64 shrink-0 rounded-xl border transition-colors ${
        isDragOver
          ? "border-brand-500/50 bg-brand-500/5"
          : "border-gray-800 bg-gray-900/60"
      }`}
    >
      {/* Column header — sober, minimal */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
        <span className="text-xs font-semibold text-gray-300 truncate flex-1">{stage.name}</span>
        <span className="text-[10px] font-medium text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-full shrink-0">
          {leads.length}
        </span>
      </div>

      {/* Cards area — no-scrollbar */}
      <div
        className={`flex flex-col gap-2 p-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[72px] no-scrollbar transition-colors ${
          isDragOver ? "bg-brand-500/5" : ""
        }`}
      >
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-gray-800">
            <p className="text-[10px] text-gray-700">Arraste aqui</p>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} onDragEnd={onDragEnd} onClick={onClickLead} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({
  leads, onLeadsChange, onClickLead,
}: {
  leads: Lead[];
  onLeadsChange: (leads: Lead[]) => void;
  onClickLead: (lead: Lead) => void;
}) {
  const stages = [...cafePamData.stages].sort((a, b) => a.position - b.position);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const statusMap: Record<number, LeadStatus> = {
    1: "new", 2: "contacted", 3: "meeting", 4: "proposal", 5: "won", 6: "lost",
  };

  const handleDragEnd = useCallback(
    (leadId: string, point: { x: number; y: number }) => {
      let targetStageId: string | null = null;
      for (const [stageId, el] of Object.entries(columnRefs.current)) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
          targetStageId = stageId;
          break;
        }
      }
      setDragOverStageId(null);
      if (!targetStageId) return;
      const targetStage = stages.find((s) => s.id === targetStageId);
      if (!targetStage) return;
      const newStatus = statusMap[targetStage.position] ?? "new";
      onLeadsChange(
        leads.map((l) =>
          l.id === leadId
            ? { ...l, stage_id: targetStageId!, status: newStatus, last_action_at: new Date().toISOString() }
            : l
        )
      );
    },
    [leads, onLeadsChange, stages]
  );

  const totalLeads = leads.length;
  const pipelineValue = leads.filter((l) => l.stage_id === STAGE_PAGAMENTO_CONFIRMADO).reduce((s, l) => s + l.value, 0);
  const concludedLeads = leads.filter((l) => l.status === "won").length;
  const convRate = totalLeads > 0 ? Math.round((concludedLeads / totalLeads) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Leads",    value: totalLeads },
          { label: "Valor Pipeline", value: formatCurrency(pipelineValue), hint: "Pagamento Confirmado" },
          { label: "Concluídos",     value: concludedLeads },
          { label: "Conversão",      value: `${convRate}%` },
        ].map(({ label, value, hint }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-lg font-bold text-gray-800 dark:text-white/90">{value}</p>
            {hint && (
              <p className="mt-0.5 text-[10px] text-emerald-500 dark:text-emerald-400 font-medium">
                💳 {hint}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div className={`flex gap-4 overflow-x-auto pb-3 ${SCROLLBAR_THIN}`}>
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage_id === stage.id);
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={stageLeads}
              totalLeads={totalLeads}
              columnRef={(el) => { columnRefs.current[stage.id] = el; }}
              isDragOver={dragOverStageId === stage.id}
              onDragEnd={handleDragEnd}
              onClickLead={onClickLead}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const [tab, setTab] = useState<"grid" | "kanban">("grid");
  const [leads, setLeads] = useState<Lead[]>(cafePamData.leads);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [chatLead, setChatLead] = useState<Lead | null>(null);
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        !search ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.email ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || l.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [leads, search, filterStatus]);

  return (
    <>
      <div className="flex flex-col gap-4 h-[calc(100vh-7rem)]">

        {/* ── Header (single compact row) ── */}
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          {/* Title */}
          <div className="mr-1">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white/90 leading-tight">CRM</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {cafePamData.tenant.name} · {filteredLeads.length} leads
            </p>
          </div>

          {/* Search */}
          <div className="relative w-48 shrink-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Buscar lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder-gray-500"
            />
          </div>

          {/* Tabs: Grid / Kanban */}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-white/[0.03]">
            {(["grid", "kanban"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t
                    ? "text-gray-800 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab === t && (
                  <motion.span
                    layoutId="tab-bg"
                    className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-gray-800"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">
                  {t === "grid" ? (
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  ) : (
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="5" height="18" rx="1" />
                      <rect x="10" y="3" width="5" height="13" rx="1" />
                      <rect x="17" y="3" width="5" height="9" rx="1" />
                    </svg>
                  )}
                </span>
                <span className="relative z-10">{t === "grid" ? "Grid" : "Kanban"}</span>
              </button>
            ))}

            {/* Status filter — inline with the tab pill */}
            {tab === "grid" && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="ml-1 rounded-lg border border-gray-200 bg-white py-1.5 px-2 text-xs text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">Todos</option>
                {(Object.entries(STATUS_BADGE) as [LeadStatus, { label: string }][]).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ── Body: 70/30 split ── */}
        <div className="flex gap-0 flex-1 min-h-0 overflow-hidden">

          {/* Left 70% — Grid or Kanban */}
          <div className={`flex-[7] min-w-0 overflow-y-auto overflow-x-hidden ${SCROLLBAR_THIN}`}>
            <AnimatePresence mode="wait">
              {tab === "grid" ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <GridView
                    leads={filteredLeads}
                    onSelect={setChatLead}
                    onOpenDrawer={setDrawerLead}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="kanban"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-x-auto pb-2"
                >
                  <KanbanView
                    leads={filteredLeads}
                    onLeadsChange={setLeads}
                    onClickLead={setChatLead}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-200 dark:bg-gray-800 shrink-0 mx-4" />

          {/* Right 30% — Chat panel */}
          <div className="w-[30%] shrink-0 flex flex-col min-h-0 overflow-hidden">
            <ChatPanel lead={chatLead} />
          </div>
        </div>
      </div>

      {/* Full drawer — triggered by "Ver detalhes ↗" only */}
      <LeadDrawer
        lead={drawerLead}
        isOpen={drawerLead !== null}
        onClose={() => setDrawerLead(null)}
        onLeadSaved={(saved) => {
          setLeads((prev) => prev.map((l) => l.id === saved.id ? saved : l));
          setDrawerLead(saved);
        }}
        onLeadDeleted={(id) => {
          setLeads((prev) => prev.filter((l) => l.id !== id));
          setDrawerLead(null);
        }}
      />
    </>
  );
}
