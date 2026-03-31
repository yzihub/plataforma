"use client";

import { useState, useMemo } from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LeadDrawer from "@/components/yzihub/LeadDrawer";
import type { Lead } from "@/lib/crm/types";
import { PlusIcon, UserCircleIcon } from "@/icons";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

// Cobre todos os status possíveis vindos do Supabase
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

const ALL_STATUS = [
  { value: "new",         label: "🔥 Novo Lead" },
  { value: "contacted",   label: "📞 Contato" },
  { value: "qualified",   label: "📅 Agendado" },
  { value: "proposal",    label: "💰 Proposta" },
  { value: "negotiation", label: "📋 Contrato" },
  { value: "won",         label: "✅ Fechado" },
  { value: "lost",        label: "❌ Perdido" },
];

const ALL_SOURCES = ["Instagram", "Site", "Indicação", "WhatsApp", "Zap Imóveis", "OLX", "LinkedIn", "Google Ads", "TikTok"];

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

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
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

// ─── ScoreBar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500" :
    score >= 50 ? "bg-amber-500" :
    "bg-rose-500";

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-6 text-right">
        {score}
      </span>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ lead }: { lead: Lead }) {
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${avatarColor(lead.id)}`}
    >
      {getInitials(lead.name)}
    </div>
  );
}

// ─── Search + Filters ─────────────────────────────────────────────────────────

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
          placeholder="Buscar lead por nome, email..."
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

// ─── Leads Table ──────────────────────────────────────────────────────────────

function LeadsTable({
  leads,
  onSelect,
}: {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow className="bg-gray-50 dark:bg-gray-800/40">
              {["Lead", "Origem", "Status", "Score", "Valor", "Data", ""].map((h) => (
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
                  <div className="flex flex-col items-center gap-2">
                    <UserCircleIcon className="size-10 text-gray-200 dark:text-gray-700" />
                    <span>Nenhum lead encontrado</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const badge = STATUS_BADGE[lead.status] ?? { color: "light" as BadgeColor, label: lead.status };
                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelect(lead)}
                    className="cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar lead={lead} />
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {lead.name}
                          </p>
                          <p className="text-xs text-gray-400">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-sm text-gray-500 dark:text-gray-400">
                      {lead.source ?? "—"}
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge size="sm" color={badge.color}>
                        {badge.label}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5">
                      <ScoreBar score={lead.score} />
                    </td>
                    <td className="py-3.5 px-5 text-sm font-medium text-gray-700 dark:text-gray-200">
                      {formatCurrency(lead.value)}
                    </td>
                    <td className="py-3.5 px-5 text-sm text-gray-400">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-xs text-brand-500 font-medium hover:underline">
                        Ver detalhes →
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── LeadsClient ──────────────────────────────────────────────────────────────

export default function LeadsClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filteredLeads = useMemo(() => {
    return initialLeads.filter((l) => {
      const matchSearch =
        !search ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.email ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || l.status === filterStatus;
      const matchSource = !filterSource || l.source === filterSource;
      return matchSearch && matchStatus && matchSource;
    });
  }, [initialLeads, search, filterStatus, filterSource]);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Leads</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredLeads.length} de {initialLeads.length} leads
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors self-start sm:self-auto">
            <PlusIcon className="size-4" />
            Novo Lead
          </button>
        </div>

        <SearchBar
          search={search}
          status={filterStatus}
          source={filterSource}
          onSearch={setSearch}
          onStatus={setFilterStatus}
          onSource={setFilterSource}
        />

        <LeadsTable leads={filteredLeads} onSelect={setSelectedLead} />
      </div>

      <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </>
  );
}
