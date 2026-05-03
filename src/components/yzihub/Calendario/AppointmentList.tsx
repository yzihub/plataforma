"use client";

import type { Appointment } from "@/types/appointments";
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/types/appointments";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppointmentListProps {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
}

// ─── Status pill colors ───────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  agendado:   "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  confirmado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  realizado:  "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  cancelado:  "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  reagendado: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

const TYPE_PILL: Record<string, string> = {
  visita:   "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  reuniao:  "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  retorno:  "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  consulta: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  outro:    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

// ─── Date formatter ───────────────────────────────────────────────────────────

const dtFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatRange(start: string, end?: string | null): string {
  const startStr = dtFmt.format(new Date(start));
  if (!end) return startStr;
  return `${startStr} — ${dtFmt.format(new Date(end))}`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
        </div>
        <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
      </div>
    </div>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({ appointment: a }: { appointment: Appointment }) {
  const typeLabel   = APPOINTMENT_TYPE_LABELS[a.appointment_type] ?? a.appointment_type;
  const statusLabel = APPOINTMENT_STATUS_LABELS[a.status] ?? a.status;
  const typePill    = TYPE_PILL[a.appointment_type] ?? TYPE_PILL.outro;
  const statusPill  = STATUS_PILL[a.status] ?? STATUS_PILL.agendado;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Linha 1: título + tipo */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
              {a.title}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typePill}`}
            >
              {typeLabel}
            </span>
          </div>

          {/* Linha 2: data */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatRange(a.start_at, a.end_at)}
          </p>

          {/* Linha 3: local e descrição (opcionais) */}
          {(a.location || a.description) && (
            <div className="space-y-0.5">
              {a.location && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span aria-label="Local">📍</span>
                  <span className="truncate">{a.location}</span>
                </p>
              )}
              {a.description && (
                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2">
                  {a.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Pill de status */}
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusPill}`}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AppointmentList({
  appointments,
  loading,
  error,
}: AppointmentListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5 p-4">
        <p className="text-sm text-rose-700 dark:text-rose-400">
          Erro ao carregar compromissos: {error}
        </p>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-10 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nenhum compromisso futuro.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Clique em &ldquo;+ Novo compromisso&rdquo; para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((a) => (
        <AppointmentCard key={a.id} appointment={a} />
      ))}
    </div>
  );
}
