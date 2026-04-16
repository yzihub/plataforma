"use client";

import { useState, useEffect } from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCircleIcon } from "@/icons";
import type { Lead, LeadStatus } from "@/lib/crm/types";
import type { Corretor } from "@/components/yzihub/LeadsClient";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

const STATUS_BADGE: Record<string, { color: BadgeColor; label: string }> = {
  new:         { color: "info",    label: "🔥 Novo Lead" },
  contacted:   { color: "warning", label: "📞 Contato" },
  qualified:   { color: "primary", label: "📅 Agendado" },
  meeting:     { color: "primary", label: "📅 Reunião" },
  proposal:    { color: "warning", label: "💰 Proposta" },
  negotiation: { color: "warning", label: "📋 Contrato" },
  won:         { color: "success", label: "✅ Fechado" },
  lost:        { color: "dark",    label: "❌ Perdido" },
};

const STATUS_ORDER: LeadStatus[] = [
  "new", "contacted", "qualified", "meeting",
  "proposal", "negotiation", "won", "lost",
];

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}

function formatCurrency(v: number) {
  if (!v) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPhone(phone: string | null) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function scoreBadge(score: number): { color: BadgeColor; label: string } {
  if (score >= 80) return { color: "success", label: `★ ${score}` };
  if (score >= 60) return { color: "warning", label: `◆ ${score}` };
  return { color: "error", label: `▼ ${score}` };
}

function findCorretorName(assigned_to: string | null, corretores: Corretor[]): string {
  if (!assigned_to) return "—";
  const corretor = corretores.find((c) => c.id === assigned_to);
  if (corretor) return corretor.full_name;
  const isUuid = /^[0-9a-f-]{32,}$/i.test(assigned_to.replace(/-/g, ""));
  if (isUuid) return `@${assigned_to.slice(0, 8)}`;
  return assigned_to;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LeadAvatar({ lead }: { lead: Lead }) {
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarColor(lead.id)}`}
    >
      {getInitials(lead.name)}
    </div>
  );
}

// ─── Icon buttons ─────────────────────────────────────────────────────────────

function EditIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Qualify action ───────────────────────────────────────────────────────────

async function handleQualify(lead: Lead, e: React.MouseEvent) {
  e.stopPropagation();
  try {
    await fetch("/api/actions/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "qualify", lead_id: lead.id }),
    });
  } catch (err) {
    console.error(err);
  }
}

// ─── Inline Status Select ─────────────────────────────────────────────────────

// Badge color → Tailwind classes for inline select styling
const BADGE_COLOR_CLASSES: Record<BadgeColor, string> = {
  info:    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  primary: "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  dark:    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  error:   "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  light:   "bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800",
};

function InlineStatusSelect({
  lead,
  onInlineEdit,
}: {
  lead: Lead;
  onInlineEdit?: (leadId: string, patch: Partial<Lead>) => void | Promise<void>;
}) {
  const badge = STATUS_BADGE[lead.status] ?? { color: "light" as BadgeColor, label: lead.status };
  const [localStatus, setLocalStatus] = useState<string>(lead.status);

  // Sync when lead changes from parent
  useEffect(() => {
    setLocalStatus(lead.status);
  }, [lead.status]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    const newStatus = e.target.value as LeadStatus;
    setLocalStatus(newStatus); // optimistic
    onInlineEdit?.(lead.id, { status: newStatus, last_action_at: new Date().toISOString() });
  }

  if (!onInlineEdit) {
    return <Badge size="sm" color={badge.color}>{badge.label}</Badge>;
  }

  const currentBadge = STATUS_BADGE[localStatus] ?? { color: "light" as BadgeColor, label: localStatus };
  const colorCls = BADGE_COLOR_CLASSES[currentBadge.color] ?? BADGE_COLOR_CLASSES.light;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <select
        value={localStatus}
        onChange={handleChange}
        className={[
          "appearance-none cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors",
          colorCls,
        ].join(" ")}
        title="Alterar status"
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>{STATUS_BADGE[s]?.label ?? s}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Inline Corretor Select ───────────────────────────────────────────────────

function InlineCorretorSelect({
  lead,
  corretores,
  onInlineEdit,
}: {
  lead: Lead;
  corretores: Corretor[];
  onInlineEdit?: (leadId: string, patch: Partial<Lead>) => void | Promise<void>;
}) {
  const [localId, setLocalId] = useState<string>(lead.assigned_to ?? "");

  useEffect(() => {
    setLocalId(lead.assigned_to ?? "");
  }, [lead.assigned_to]);

  if (!onInlineEdit || corretores.length === 0) {
    return (
      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {findCorretorName(lead.assigned_to, corretores)}
      </span>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    const newId = e.target.value;
    setLocalId(newId); // optimistic
    onInlineEdit?.(lead.id, { assigned_to: newId || null });
  }

  const displayName = findCorretorName(localId || null, corretores);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <select
        value={localId}
        onChange={handleChange}
        className="appearance-none cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 pl-2 pr-6 text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 max-w-[120px] truncate"
        title="Atribuir corretor"
      >
        <option value="">— Sem corretor —</option>
        {corretores.map((c) => (
          <option key={c.id} value={c.id}>{c.full_name}</option>
        ))}
      </select>
      <span className="sr-only">{displayName}</span>
    </div>
  );
}

// ─── LeadsDataTable ───────────────────────────────────────────────────────────

interface LeadsDataTableProps {
  leads: Lead[];
  onSelect?: (lead: Lead) => void;
  headerActions?: React.ReactNode;
  // Status filter (controlled by parent / KPI strip)
  activeStatus: string;
  onStatusChange: (status: string) => void;
  // Search
  search: string;
  onSearchChange: (q: string) => void;
  // Source filter
  sources?: string[];
  activeSource?: string;
  onSourceChange?: (v: string) => void;
  // Inline editing
  corretores?: Corretor[];
  onInlineEdit?: (leadId: string, patch: Partial<Lead>) => void | Promise<void>;
  // Selected lead highlight
  selectedLeadId?: string | null;
}

export default function LeadsDataTable({
  leads,
  onSelect,
  headerActions,
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
  sources = [],
  activeSource = "",
  onSourceChange,
  corretores = [],
  onInlineEdit,
  selectedLeadId,
}: LeadsDataTableProps) {
  const [pageIndex, setPageIndex] = useState(0);

  // Reset page when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [activeStatus, search, activeSource]);

  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const start = leads.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const end = Math.min((pageIndex + 1) * PAGE_SIZE, leads.length);
  const paginated = leads.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

  // Visible page numbers (max 5 around current)
  function visiblePages() {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
    const half = 2;
    let lo = Math.max(0, pageIndex - half);
    let hi = Math.min(totalPages - 1, pageIndex + half);
    if (hi - lo < 4) {
      if (lo === 0) hi = Math.min(4, totalPages - 1);
      else lo = Math.max(0, hi - 4);
    }
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }

  const tableColumns = corretores.length > 0
    ? ["Lead", "WhatsApp", "Status", "Score", "Corretor", "Origem", "Valor Imóvel", "Ações"]
    : ["Lead", "WhatsApp", "Status", "Score", "Corretor", "Origem", "Valor Imóvel", "Ações"];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">

      {/* ── Card Header ─────────────────────────────────────────── */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        {/* Search + filters row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center px-5 py-3">
          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
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
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder-gray-500"
            />
          </div>

          {/* Source filter */}
          {sources.length > 0 && onSourceChange && (
            <select
              value={activeSource}
              onChange={(e) => onSourceChange(e.target.value)}
              className="min-w-[160px] rounded-xl border border-gray-200 bg-white py-2 px-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90"
            >
              <option value="">Todas as origens</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* Slot for external action button (e.g. Novo Lead) */}
          {headerActions && (
            <div className="ml-auto shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="max-w-full overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/40">
              {tableColumns.map((h) => (
                <TableCell
                  key={h}
                  isHeader
                  className="py-3 px-5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-left whitespace-nowrap"
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.length === 0 ? (
              <tr className="border-b-0">
                <td colSpan={tableColumns.length} className="py-16 px-5 text-center text-sm text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <UserCircleIcon className="size-14 text-gray-200 dark:text-gray-700" />
                    <span>Nenhum lead encontrado</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((lead) => {
                const score = scoreBadge(lead.score);
                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelect?.(lead)}
                    className={`cursor-pointer align-middle border-b border-gray-100 dark:border-gray-800/60 last:border-0 transition-colors ${
                      selectedLeadId === lead.id
                        ? "bg-brand-50 ring-1 ring-inset ring-brand-500 dark:bg-brand-500/10"
                        : "hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    {/* Lead: avatar + nome + telefone */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <LeadAvatar lead={lead} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                            {lead.name}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
                            {formatPhone(lead.phone)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* WhatsApp */}
                    <td className="py-3.5 px-5 text-sm text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                      {formatPhone(lead.phone)}
                    </td>

                    {/* Status — inline select */}
                    <td className="py-3.5 px-5">
                      <InlineStatusSelect lead={lead} onInlineEdit={onInlineEdit} />
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-5">
                      <Badge size="sm" color={score.color}>
                        {score.label}
                      </Badge>
                    </td>

                    {/* Corretor — inline select if corretores available */}
                    <td className="py-3.5 px-5">
                      <InlineCorretorSelect lead={lead} corretores={corretores} onInlineEdit={onInlineEdit} />
                    </td>

                    {/* Origem */}
                    <td className="py-3.5 px-5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {lead.source ?? "—"}
                    </td>

                    {/* Valor Imóvel */}
                    <td className="py-3.5 px-5 text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {formatCurrency(lead.value)}
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1">
                        {/* Editar → abre LeadDrawer */}
                        <button
                          type="button"
                          title="Editar lead"
                          onClick={(e) => { e.stopPropagation(); onSelect?.(lead); }}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-white/90 transition-colors"
                        >
                          <EditIcon />
                        </button>
                        {/* Qualificar → POST /api/actions/execute */}
                        <button
                          type="button"
                          title="Qualificar lead"
                          onClick={(e) => handleQualify(lead, e)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/[0.05] dark:hover:text-brand-400 transition-colors"
                        >
                          <BoltIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Footer: paginação ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-800">
        {/* Showing X to Y of Z */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {leads.length === 0
            ? "Nenhum resultado"
            : `Mostrando ${start} a ${end} de ${leads.length} leads`}
        </p>

        {/* Pagination buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((p) => p - 1)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon />
            <span className="hidden sm:inline">Ant.</span>
          </button>

          {visiblePages().map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPageIndex(p)}
              className={`min-w-[36px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                p === pageIndex
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
              }`}
            >
              {p + 1}
            </button>
          ))}

          <button
            type="button"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => setPageIndex((p) => p + 1)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline">Próx.</span>
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
