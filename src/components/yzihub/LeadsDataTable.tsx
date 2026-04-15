"use client";

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

// ─── Types ────────────────────────────────────────────────────────────────────

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

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

const BAIRROS = ["Meireles", "Aldeota", "Eusébio", "Cocó", "Papicu"];

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
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPhone(phone: string | null) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    // +55 (XX) 9XXXX-XXXX
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

function bairroFromId(id: string): string {
  const lastChar = id.charCodeAt(id.length - 1);
  return BAIRROS[lastChar % BAIRROS.length];
}

function formatCorretor(assigned_to: string | null): string {
  if (!assigned_to) return "—";
  // UUID-like: contains hyphens or is 36 chars
  const isUuid = /^[0-9a-f-]{32,}$/i.test(assigned_to.replace(/-/g, ""));
  if (isUuid) return `@${assigned_to.slice(0, 8)}`;
  return assigned_to;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LeadAvatar({ lead }: { lead: Lead }) {
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${avatarColor(lead.id)}`}
    >
      {getInitials(lead.name)}
    </div>
  );
}

// ─── LeadsDataTable ───────────────────────────────────────────────────────────

interface LeadsDataTableProps {
  leads: Lead[];
  onSelect?: (lead: Lead) => void;
}

export default function LeadsDataTable({ leads, onSelect }: LeadsDataTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table className="w-full">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
            <col className="w-[11%]" />
            <col className="w-[10%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/40">
              {["Nome", "WhatsApp", "Status", "Score Luana", "Bairro Interesse", "Corretor", "Origem", "Valor Imóvel", "Ações"].map((h) => (
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

          <TableBody>
            {leads.length === 0 ? (
              <tr className="border-b-0">
                <td colSpan={9} className="py-16 px-5 text-center text-sm text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <UserCircleIcon className="size-14 text-gray-200 dark:text-gray-700" />
                    <span>Nenhum lead encontrado</span>
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const badge = STATUS_BADGE[lead.status] ?? { color: "light" as BadgeColor, label: lead.status };
                const score = scoreBadge(lead.score);
                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelect?.(lead)}
                    className="cursor-pointer align-middle border-b border-gray-50 dark:border-gray-800/60 last:border-0 hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Nome */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <LeadAvatar lead={lead} />
                        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {lead.name}
                        </span>
                      </div>
                    </td>

                    {/* WhatsApp */}
                    <td className="py-3.5 px-5 text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatPhone(lead.phone)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5">
                      <Badge size="sm" color={badge.color}>
                        {badge.label}
                      </Badge>
                    </td>

                    {/* Score Luana */}
                    <td className="py-3.5 px-5">
                      <Badge size="sm" color={score.color}>
                        {score.label}
                      </Badge>
                    </td>

                    {/* Bairro Interesse */}
                    <td className="py-3.5 px-5 text-sm text-gray-500 dark:text-gray-400">
                      {bairroFromId(lead.id)}
                    </td>

                    {/* Corretor */}
                    <td className="py-3.5 px-5 text-xs font-mono text-gray-500 truncate">
                      {formatCorretor(lead.assigned_to)}
                    </td>

                    {/* Origem */}
                    <td className="py-3.5 px-5 text-sm text-gray-500 dark:text-gray-400 truncate">
                      {lead.source ?? "—"}
                    </td>

                    {/* Valor Imóvel */}
                    <td className="py-3.5 px-5 text-sm font-medium text-gray-700 dark:text-gray-200">
                      {formatCurrency(lead.value)}
                    </td>

                    {/* Ação */}
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
