"use client";

import React from "react";
import Badge from "@/components/ui/badge/Badge";
import CommandButton, { CrmAction } from "@/components/yzihub/CommandButton";
import { Lead, LeadStatus } from "@/lib/crm/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead;
  onActionSuccess?: (leadId: string, jobId: string, action: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-brand-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-orange-500",
] as const;

const STATUS_ACTIONS: Record<LeadStatus, CrmAction[]> = {
  new: ["contact"],
  contacted: ["schedule"],
  meeting: ["send_proposal", "lose"],
  proposal: ["close", "lose"],
  won: [],
  lost: [],
};

type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

const STATUS_BADGE: Record<LeadStatus, { color: BadgeColor; label: string }> = {
  new: { color: "light", label: "Novo" },
  contacted: { color: "info", label: "Contato" },
  meeting: { color: "primary", label: "Reunião" },
  proposal: { color: "warning", label: "Proposta" },
  won: { color: "success", label: "Fechado" },
  lost: { color: "error", label: "Perdido" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAvatarColor(name: string): string {
  const char = name.trim()[0]?.toLowerCase() ?? "a";
  const index = char.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getScoreColor(score: number): string {
  if (score <= 40) return "bg-error-500";
  if (score <= 70) return "bg-warning-500";
  return "bg-success-500";
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "agora";

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "há poucos segundos";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin}min`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `há ${diffHr}h`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `há ${diffWeeks} semana${diffWeeks > 1 ? "s" : ""}`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `há ${diffMonths} ${diffMonths > 1 ? "meses" : "mês"}`;

  const diffYears = Math.floor(diffDays / 365);
  return `há ${diffYears} ano${diffYears > 1 ? "s" : ""}`;
}

function formatShortDate(isoString: string): string {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg
      className="shrink-0"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 1h3l1.5 3.5L6 6a9.5 9.5 0 0 0 4 4l1.5-1.5L15 10v3a1 1 0 0 1-1 1C6.163 14 2 9.837 2 4a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      className="shrink-0"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="3"
        width="14"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M1 5l7 5 7-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadCard({ lead, onActionSuccess }: LeadCardProps) {
  const avatarColor = getAvatarColor(lead.name);
  const initials = getInitials(lead.name);
  const scoreColor = getScoreColor(lead.score);
  const statusBadge = STATUS_BADGE[lead.status];
  const actions = STATUS_ACTIONS[lead.status];
  const subline = lead.company ?? lead.source ?? null;

  function handleActionSuccess(jobId: string, action: CrmAction) {
    onActionSuccess?.(lead.id, jobId, action);
  }

  return (
    <article
      className="
        rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs
        dark:border-gray-700 dark:bg-gray-800
        hover:border-brand-300 hover:shadow-sm
        transition-all cursor-grab active:cursor-grabbing
        flex flex-col gap-3
      "
    >
      {/* ── Row 1: Avatar + Name + Status Badge ── */}
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div
          className={`
            flex items-center justify-center
            w-8 h-8 rounded-full shrink-0
            text-white text-xs font-semibold select-none
            ${avatarColor}
          `}
          aria-label={`Avatar de ${lead.name}`}
        >
          {initials}
        </div>

        {/* Name */}
        <span className="flex-1 font-medium text-theme-sm text-gray-800 dark:text-white/90 truncate">
          {lead.name}
        </span>

        {/* Status Badge */}
        <Badge color={statusBadge.color} size="sm" variant="light">
          {statusBadge.label}
        </Badge>
      </div>

      {/* ── Row 2: Company / Source ── */}
      {subline && (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400 truncate -mt-1">
          {subline}
        </p>
      )}

      {/* ── Row 3: Contact Info ── */}
      {(lead.phone || lead.email) && (
        <div className="flex flex-col gap-1">
          {lead.phone && (
            <span className="flex items-center gap-1.5 text-theme-xs text-gray-600 dark:text-gray-300">
              <PhoneIcon />
              <span>{lead.phone}</span>
            </span>
          )}
          {lead.email && (
            <span className="flex items-center gap-1.5 text-theme-xs text-gray-600 dark:text-gray-300">
              <EmailIcon />
              <span className="truncate">{lead.email}</span>
            </span>
          )}
        </div>
      )}

      {/* ── Row 4: Score + Value ── */}
      <div className="flex items-center gap-3">
        {/* Score bar */}
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-theme-xs text-gray-400 dark:text-gray-500">
            Score {lead.score}
          </span>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${scoreColor}`}
              style={{ width: `${Math.min(100, Math.max(0, lead.score))}%` }}
              role="progressbar"
              aria-valuenow={lead.score}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Value */}
        {lead.value > 0 && (
          <span className="text-theme-xs font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
            {formatCurrency(lead.value)}
          </span>
        )}
      </div>

      {/* ── Row 5: Action Buttons ── */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {actions.map((action) => (
            <CommandButton
              key={action}
              action={action}
              leadId={lead.id}
              tenantId={lead.tenant_id}
              onSuccess={(jobId) => handleActionSuccess(jobId, action)}
            />
          ))}
        </div>
      )}

      {/* ── Row 6: Footer ── */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
        <span className="text-theme-xs text-gray-400 dark:text-gray-500">
          {lead.last_action_at ? timeAgo(lead.last_action_at) : "Sem ações"}
        </span>
        <span className="text-theme-xs text-gray-400 dark:text-gray-500">
          Adicionado em {formatShortDate(lead.created_at)}
        </span>
      </div>
    </article>
  );
}
