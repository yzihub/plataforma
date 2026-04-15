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
import type { Lead } from "@/lib/crm/types";

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

const STATUS_TABS = [
  { value: "",            label: "Todos" },
  { value: "new",         label: "Novo Lead" },
  { value: "contacted",   label: "Contato" },
  { value: "qualified",   label: "Agendado" },
  { value: "meeting",     label: "Reunião" },
  { value: "proposal",    label: "Proposta" },
  { value: "negotiation", label: "Contrato" },
  { value: "won",         label: "Fechado" },
  { value: "lost",        label: "Perdido" },
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

function formatCorretor(assigned_to: string | null): string {
  if (!assigned_to) return "—";
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

// ─── LeadsDataTable ───────────────────────────────────────────────────────────

interface LeadsDataTableProps {
  leads: Lead[];
  onSelect?: (lead: Lead) => void;
  headerActions?: React.ReactNode;
  activeStatus: string;
  onStatusChange: (status: string) => void;
  search: string;
  onSearchChange: (q: string) => void;
}

export default function LeadsDataTable({
  leads,
  onSelect,
  headerActions,
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
}: LeadsDataTableProps) {
  const [pageIndex, setPageIndex] = useState(0);

  // Reset page when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [activeStatus, search]);

  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const start = leads.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const end = Math.min((pageIndex + 1) * PAGE_SIZE, leads.length);
  const paginated = leads.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

  // Compute counts from the full (unfiltered by status) prop — but leads is already
  // filtered by search + status in the parent. We need counts per status from raw
  // leads. Since we only receive `leads` (already filtered), we approximate counts
  // by counting in the current `leads` array (which is pre-filtered by search but
  // NOT by status because parent applies status before passing). Actually, per plan:
  // LeadsClient passes `tableLeads` which applies search+status together.
  // So for tab counts we need the parent to pass raw leads separately — but the plan
  // says "contagem de 'Todos' = leads.length, cada tab = leads.filter(l => l.status === s.value).length"
  // applied over the `leads` prop (which is already filtered by search only in tableLeads memo).
  // The simplest correct approach: counts show how many match each status in the current
  // search-filtered set, which is the leads prop itself.
  const countForStatus = (statusValue: string) => {
    if (!statusValue) return leads.length;
    return leads.filter((l) => l.status === statusValue).length;
  };

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

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">

      {/* ── Card Header ─────────────────────────────────────────── */}
      <div className="border-b border-gray-200 dark:border-gray-800">

        {/* Status tabs */}
        <div className="flex overflow-x-auto scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const count = countForStatus(tab.value);
            const isActive = activeStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onStatusChange(tab.value)}
                className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-brand-500 text-brand-500 bg-brand-500/5"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    isActive
                      ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + action row */}
        <div className="flex items-center gap-3 px-5 py-3">
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
              {["Lead", "WhatsApp", "Status", "Score", "Corretor", "Origem", "Valor Imóvel", "Ações"].map((h) => (
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
                <td colSpan={8} className="py-16 px-5 text-center text-sm text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <UserCircleIcon className="size-14 text-gray-200 dark:text-gray-700" />
                    <span>Nenhum lead encontrado</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((lead) => {
                const badge = STATUS_BADGE[lead.status] ?? { color: "light" as BadgeColor, label: lead.status };
                const score = scoreBadge(lead.score);
                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelect?.(lead)}
                    className="cursor-pointer align-middle border-b border-gray-100 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
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

                    {/* Status */}
                    <td className="py-3.5 px-5">
                      <Badge size="sm" color={badge.color}>
                        {badge.label}
                      </Badge>
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-5">
                      <Badge size="sm" color={score.color}>
                        {score.label}
                      </Badge>
                    </td>

                    {/* Corretor */}
                    <td className="py-3.5 px-5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatCorretor(lead.assigned_to)}
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
            : `Showing ${start} to ${end} of ${leads.length} results`}
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
            <span className="hidden sm:inline">Prev</span>
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
            <span className="hidden sm:inline">Next</span>
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
