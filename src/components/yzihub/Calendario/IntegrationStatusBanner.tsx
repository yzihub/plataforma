"use client";

import type { IntegrationProvider, IntegrationStatus } from "@/types/appointments";
import { InfoIcon, PlugInIcon } from "@/icons";

// ─── Props ────────────────────────────────────────────────────────────────────

interface IntegrationStatusBannerProps {
  provider?: IntegrationProvider;
  status?: IntegrationStatus;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Exclude<IntegrationStatus, null>,
  { pill: string; message: string }
> = {
  pendente: {
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    message:
      "Integração com Google Calendar ainda não configurada. Os compromissos ficam salvos no banco e podem ser sincronizados depois.",
  },
  configurado: {
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    message:
      "Integração configurada. Sincronização automática via n8n será ativada em breve.",
  },
  sincronizado: {
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    message: "Compromissos sincronizados com o Google Calendar.",
  },
  erro: {
    pill: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    message:
      "Erro na integração. Compromissos continuam sendo salvos localmente.",
  },
};

const PILL_LABELS: Record<Exclude<IntegrationStatus, null>, string> = {
  pendente:    "Pendente",
  configurado: "Configurado",
  sincronizado: "Sincronizado",
  erro:        "Erro",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntegrationStatusBanner({
  provider = null,
  status = "pendente",
}: IntegrationStatusBannerProps) {
  const cfg = STATUS_CONFIG[status ?? "pendente"];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className="shrink-0 mt-0.5 text-gray-400 dark:text-gray-500">
          {provider ? <PlugInIcon className="size-5" /> : <InfoIcon className="size-5" />}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Integração Google Calendar
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.pill}`}
            >
              {PILL_LABELS[status ?? "pendente"]}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {cfg.message}
          </p>
        </div>
      </div>
    </div>
  );
}
