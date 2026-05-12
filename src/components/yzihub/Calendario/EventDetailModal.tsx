"use client";

import type { Appointment } from "@/types/appointments";
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/types/appointments";
import { CloseIcon } from "@/icons";

// ─── Pill color maps (mesmo padrão de AppointmentList) ───────────────────────

const TYPE_PILL: Record<string, string> = {
  visita:   "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  reuniao:  "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  retorno:  "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  consulta: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  outro:    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

const STATUS_PILL: Record<string, string> = {
  agendado:   "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  confirmado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  realizado:  "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  cancelado:  "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  reagendado: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

const dtFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-24 shrink-0 text-xs text-gray-400 dark:text-gray-500 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 break-words">
        {children}
      </span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EventDetailModalProps {
  appointment: Appointment;
  onClose:     () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventDetailModal({
  appointment: a,
  onClose,
}: EventDetailModalProps) {
  const typeLabel   = APPOINTMENT_TYPE_LABELS[a.appointment_type] ?? a.appointment_type;
  const statusLabel = APPOINTMENT_STATUS_LABELS[a.status] ?? a.status;
  const typePill    = TYPE_PILL[a.appointment_type] ?? TYPE_PILL.outro;
  const statusPill  = STATUS_PILL[a.status] ?? STATUS_PILL.agendado;

  const startStr = dtFmt.format(new Date(a.start_at));
  const endStr   = a.end_at ? dtFmt.format(new Date(a.end_at)) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white/90 break-words">
                {a.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typePill}`}>
                  {typeLabel}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusPill}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-3">
            <Row label="Início">{startStr}</Row>
            {endStr && <Row label="Fim">{endStr}</Row>}
            {a.location && <Row label="Local">{a.location}</Row>}
            {a.description && (
              <Row label="Descrição">
                <span className="whitespace-pre-line">{a.description}</span>
              </Row>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              Fechar
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
