"use client";

import { useState, useMemo } from "react";
import type { ComponentType } from "react";
import {
  GroupIcon,
  ShootingStarIcon,
  UserIcon,
  CloseLineIcon,
} from "@/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JuremaDeal = {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  deal_stage: string;
  qualification_status: string | null;
  client_name: string | null;
  client_phone: string | null;
  intent: string | null;
  property_type: string | null;
  location_preference: string | null;
  budget_max: number | null;
  bedrooms: string | null;
  lead_score: number | null;
  broker_status: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Stage definitions ────────────────────────────────────────────────────────

const STAGES = [
  { id: "qualificacao", name: "Qualificação",  color: "#6B7280" },
  { id: "perfil_busca", name: "Perfil / Busca", color: "#3B82F6" },
  { id: "curadoria",    name: "Curadoria",      color: "#F59E0B" },
  { id: "corretor",     name: "Corretor",        color: "#8B5CF6" },
  { id: "visita",       name: "Visita",          color: "#10B981" },
  { id: "proposta",     name: "Proposta",        color: "#F97316" },
  { id: "fechamento",   name: "Fechamento",      color: "#06B6D4" },
  { id: "nutricao",     name: "Nutrição",        color: "#84CC16" },
  { id: "perdido",      name: "Perdido",         color: "#EF4444" },
] as const;

// ─── Badge maps ───────────────────────────────────────────────────────────────

const QUAL_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  incompleto:     { bg: "bg-gray-100 dark:bg-gray-700",        text: "text-gray-600 dark:text-gray-300",     label: "Incompleto" },
  frio:           { bg: "bg-blue-100 dark:bg-blue-900/40",     text: "text-blue-700 dark:text-blue-400",     label: "Frio" },
  morno:          { bg: "bg-amber-100 dark:bg-amber-900/40",   text: "text-amber-700 dark:text-amber-400",   label: "Morno" },
  quente:         { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-400", label: "Quente" },
  desqualificado: { bg: "bg-red-100 dark:bg-red-900/40",       text: "text-red-700 dark:text-red-400",       label: "Desqual." },
};

const BROKER_LABELS: Record<string, string> = {
  nao_atribuido:       "Sem corretor",
  aguardando_corretor: "Aguardando",
  atribuido:           "Atribuído",
  em_atendimento:      "Em atendimento",
  encerrado:           "Encerrado",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBudget(value: number | null): string | null {
  if (!value) return null;
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function displayName(deal: JuremaDeal): string {
  return deal.client_name || deal.client_phone || "—";
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiAccent = "gray" | "orange" | "amber" | "purple" | "red";

const KPI_ICON_BG: Record<KpiAccent, string> = {
  gray:   "bg-gray-100 dark:bg-gray-800",
  orange: "bg-orange-50 dark:bg-orange-900/20",
  amber:  "bg-amber-50 dark:bg-amber-900/20",
  purple: "bg-purple-50 dark:bg-purple-900/20",
  red:    "bg-red-50 dark:bg-red-900/20",
};

const KPI_ICON_COLOR: Record<KpiAccent, string> = {
  gray:   "text-gray-500 dark:text-gray-400",
  orange: "text-orange-500 dark:text-orange-400",
  amber:  "text-amber-500 dark:text-amber-400",
  purple: "text-purple-500 dark:text-purple-400",
  red:    "text-red-500 dark:text-red-400",
};

const KPI_VALUE_COLOR: Record<KpiAccent, string> = {
  gray:   "text-gray-800 dark:text-white/90",
  orange: "text-orange-600 dark:text-orange-400",
  amber:  "text-amber-600 dark:text-amber-400",
  purple: "text-purple-600 dark:text-purple-400",
  red:    "text-red-600 dark:text-red-400",
};

function KpiCard({
  icon: Icon,
  label,
  value,
  accent = "gray",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent?: KpiAccent;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${KPI_ICON_BG[accent]}`}>
        <Icon className={`size-5 ${KPI_ICON_COLOR[accent]}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium leading-tight truncate text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className={`text-xl font-bold leading-tight mt-0.5 truncate ${KPI_VALUE_COLOR[accent]}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({ deal }: { deal: JuremaDeal }) {
  const qual = deal.qualification_status
    ? (QUAL_BADGE[deal.qualification_status] ?? QUAL_BADGE.incompleto)
    : null;
  const budget = formatBudget(deal.budget_max);
  const brokerLabel = deal.broker_status
    ? (BROKER_LABELS[deal.broker_status] ?? deal.broker_status)
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 space-y-1.5">
      <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
        {displayName(deal)}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {typeof deal.lead_score === "number" && (
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 tabular-nums">
            Score {deal.lead_score}
          </span>
        )}
        {qual && (
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${qual.bg} ${qual.text}`}>
            {qual.label}
          </span>
        )}
      </div>

      {(deal.intent || deal.property_type) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
          {[deal.intent, deal.property_type].filter(Boolean).join(" · ")}
        </p>
      )}

      {(deal.location_preference || budget) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {[deal.location_preference, budget].filter(Boolean).join(" · ")}
        </p>
      )}

      {deal.bedrooms && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{deal.bedrooms} quarto(s)</p>
      )}

      {brokerLabel && (
        <span className="inline-block rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] text-gray-600 dark:text-gray-300">
          {brokerLabel}
        </span>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  deals,
}: {
  stage: { id: string; name: string; color: string };
  deals: JuremaDeal[];
}) {
  return (
    <div className="flex flex-col w-60 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1 pb-2.5">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate flex-1">
          {stage.name}
        </span>
        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full shrink-0 tabular-nums">
          {deals.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-360px)] min-h-[56px]">
        {deals.length === 0 ? (
          <div className="flex items-center justify-center h-14 rounded-xl border border-dashed border-gray-200 dark:border-gray-700/60">
            <p className="text-[10px] text-gray-300 dark:text-gray-600">Vazio</p>
          </div>
        ) : (
          deals.map((deal) => <DealCard key={deal.id} deal={deal} />)
        )}
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  initialDeals: JuremaDeal[];
}

export default function JuremaKanbanClient({ initialDeals }: Props) {
  const [search, setSearch] = useState("");

  const kpis = useMemo(
    () => ({
      total:      initialDeals.length,
      quentes:    initialDeals.filter((d) => d.qualification_status === "quente").length,
      aguardando: initialDeals.filter((d) => d.broker_status === "aguardando_corretor").length,
      perdidos:   initialDeals.filter((d) => d.deal_stage === "perdido").length,
    }),
    [initialDeals]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialDeals;
    return initialDeals.filter(
      (d) =>
        (d.client_name ?? "").toLowerCase().includes(q) ||
        (d.client_phone ?? "").toLowerCase().includes(q) ||
        (d.location_preference ?? "").toLowerCase().includes(q) ||
        (d.intent ?? "").toLowerCase().includes(q)
    );
  }, [initialDeals, search]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white/90 leading-tight">
            Jurema Brokers
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            Kanban de deals da Ju
          </p>
        </div>

        {/* Search */}
        <div className="relative w-64 shrink-0">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
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
            placeholder="Buscar cliente, bairro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={GroupIcon}
          label="Total de Deals"
          value={kpis.total}
          accent="gray"
        />
        <KpiCard
          icon={ShootingStarIcon}
          label="Leads Quentes"
          value={kpis.quentes}
          accent="orange"
        />
        <KpiCard
          icon={UserIcon}
          label="Aguardando Corretor"
          value={kpis.aguardando}
          accent="purple"
        />
        <KpiCard
          icon={CloseLineIcon}
          label="Perdidos"
          value={kpis.perdidos}
          accent={kpis.perdidos > 0 ? "red" : "gray"}
        />
      </div>

      {/* Result count (only when filtering) */}
      {search.trim() && (
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
          {filtered.length} de {initialDeals.length} deals
        </p>
      )}

      {/* Kanban board — contained in a card so the scroll is clearly bounded */}
      <div className="relative rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
        <div
          className="overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-500"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#d1d5db transparent" }}
        >
          <div className="flex gap-3 p-4 pb-3 pr-14 min-w-max">
            {STAGES.map((stage) => {
              const stageDeals = filtered.filter((d) => d.deal_stage === stage.id);
              return (
                <KanbanColumn key={stage.id} stage={stage} deals={stageDeals} />
              );
            })}
          </div>
        </div>
        {/* fade hint — right edge */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-white/80 to-transparent dark:from-gray-950/50"
        />
      </div>
    </div>
  );
}
