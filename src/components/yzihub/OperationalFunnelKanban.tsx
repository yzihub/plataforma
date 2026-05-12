"use client";

import { useMemo, useState } from "react";
import type { OperationalKanbanBoard, OperationalKanbanCard, OperationalFunnelStage } from "@/lib/crm/operational-funnel";

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function prettyLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function matchCard(card: OperationalKanbanCard, query: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [
    card.lead.name,
    card.lead.phone,
    card.broker_name,
    card.property_label,
    card.latest_event_title,
    card.latest_event_description,
    card.follow_up_label,
    card.property_match_status,
    card.stage_id,
    ...card.badges,
    ...card.signals,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function metricCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "blue" | "violet" | "emerald" | "amber";
}) {
  const toneClasses: Record<string, string> = {
    slate: "border-slate-200 bg-white dark:border-slate-800 dark:bg-white/[0.03]",
    blue: "border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-500/10",
    violet: "border-violet-200 bg-violet-50/70 dark:border-violet-900/50 dark:bg-violet-500/10",
    emerald: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-500/10",
    amber: "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-500/10",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white/90">{value}</p>
    </div>
  );
}

function LeadCard({ card }: { card: OperationalKanbanCard }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm transition-colors hover:border-brand-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/30 dark:hover:border-brand-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white/90">{card.lead.name}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {card.latest_event_title || "Sem evento recente"}
            {card.latest_event_at ? ` · ${formatDate(card.latest_event_at)}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
          {card.lead.score ?? 0}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          {prettyLabel(card.property_match_status)}
        </span>
        <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
          {prettyLabel(card.stage_id)}
        </span>
      </div>

      <div className="mt-2 space-y-1.5 text-[12px]">
        <p className="truncate text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400">Corretor:</span> {card.broker_name || "sem corretor"}
        </p>
        <p className="truncate text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400">Imóvel:</span> {card.property_label || "sem imóvel"}
        </p>
        <p className="truncate text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400">Follow-up:</span> {card.follow_up_label || "ok"}
        </p>
      </div>

      {card.badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {card.badges.map((badge) => (
            <span key={badge} className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {badge}
            </span>
          ))}
        </div>
      )}

      {card.signals.length > 0 && (
        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          {card.signals.join(" · ")}
        </p>
      )}
    </article>
  );
}

function StageColumn({
  stage,
  cards,
}: {
  stage: OperationalFunnelStage;
  cards: OperationalKanbanCard[];
}) {
  return (
    <section className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-white/[0.03]">
      <div className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 size-2.5 shrink-0 rounded-full ${stage.color}`} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white/90">{stage.title}</h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{stage.description}</p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-white/5 dark:text-slate-300">
            {cards.length}
          </span>
        </div>
      </div>

      <div className="flex max-h-[calc(100vh-260px)] min-h-[140px] flex-col gap-2 overflow-y-auto p-3">
        {cards.length > 0 ? (
          cards.map((card) => <LeadCard key={card.lead.id} card={card} />)
        ) : (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-600">
            Sem leads
          </div>
        )}
      </div>
    </section>
  );
}

export function OperationalFunnelKanbanBoard({
  board,
  query = "",
}: {
  board: OperationalKanbanBoard;
  query?: string;
}) {
  const filteredCards = useMemo(
    () => board.cards.filter((card) => matchCard(card, query.trim())),
    [board.cards, query],
  );

  const grouped = useMemo(() => {
    const groups = Object.fromEntries(board.stages.map((stage) => [stage.id, [] as OperationalKanbanCard[]])) as Record<string, OperationalKanbanCard[]>;
    for (const card of filteredCards) {
      if (!groups[card.stage_id]) groups[card.stage_id] = [];
      groups[card.stage_id].push(card);
    }
    return groups as Record<typeof board.stages[number]["id"], OperationalKanbanCard[]>;
  }, [board.stages, filteredCards]);

  const visibleTotals = {
    total: filteredCards.length,
    hot: filteredCards.filter((card) => card.is_hot).length,
    with_visit: filteredCards.filter((card) => card.has_visit).length,
    juridico: filteredCards.filter((card) => card.stage_id === "juridico").length,
    fechados: filteredCards.filter((card) => card.stage_id === "fechado").length,
    pos_venda: filteredCards.filter((card) => card.stage_id === "pos_venda").length,
    overdue_48h: filteredCards.filter((card) => card.badges.includes("⏳ sem resposta 48h")).length,
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCard({ label: "Leads no funil", value: visibleTotals.total })}
        {metricCard({ label: "Lead quente", value: visibleTotals.hot, tone: "amber" })}
        {metricCard({ label: "Com visita", value: visibleTotals.with_visit, tone: "violet" })}
        {metricCard({ label: "Jurídico / Fechado", value: `${visibleTotals.juridico} / ${visibleTotals.fechados}`, tone: "emerald" })}
      </div>

      <div
        className="
          overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm
          [scrollbar-width:thin]
          [scrollbar-color:#cbd5e1_#f1f5f9]
          [&::-webkit-scrollbar]:h-2
          [&::-webkit-scrollbar-track]:rounded-full
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-track]:bg-[#f1f5f9]
          [&::-webkit-scrollbar-thumb]:bg-[#cbd5e1]
          hover:[&::-webkit-scrollbar-thumb]:bg-[#94a3b8]
          dark:border-slate-800 dark:bg-white/[0.03]
          dark:[scrollbar-color:#1e293b_#0f172a]
          dark:[&::-webkit-scrollbar-track]:bg-[#0f172a]
          dark:[&::-webkit-scrollbar-thumb]:bg-[#1e293b]
          dark:hover:[&::-webkit-scrollbar-thumb]:bg-[#334155]
        "
      >
        <div className="flex min-w-max gap-3">
          {board.stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              cards={grouped[stage.id] ?? []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function OperationalFunnelKanbanShell({
  board,
  title = "Funil Operacional Imobiliario",
  description = "Memoria operacional do tenant com timeline, contrato, visita e financeiro.",
}: {
  board: OperationalKanbanBoard;
  title?: string;
  description?: string;
}) {
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white/90">{title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <div className="w-full max-w-md">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar lead, corretor, imóvel, evento..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white/90"
          />
        </div>
      </div>

      <OperationalFunnelKanbanBoard board={board} query={query} />
    </div>
  );
}
