"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { HandoffEvent, HandoffState } from "@/lib/cockpit/types";
import CognitiveSeverityBadge from "./CognitiveSeverityBadge";
import LatencyBadge from "./LatencyBadge";
import SkeletonFeedRows from "./SkeletonFeedRows";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const HEADERS = [
  "sinal",
  "entrega",
  "corretor",
  "estado",
  "deal",
  "sessão",
  "tempo",
] as const;

const HANDOFF_CONFIG: Record<
  HandoffState,
  { label: string; className: string; border: string }
> = {
  órfão: {
    label: "órfão",
    className: "text-amber-700 dark:text-amber-400 font-medium",
    border: "border-l-2 border-l-amber-400 dark:border-l-amber-600",
  },
  aguardando: {
    label: "aguardando",
    className: "text-blue-600 dark:text-blue-400",
    border: "border-l-2 border-l-blue-400 dark:border-l-blue-600",
  },
  ativo: {
    label: "ativo",
    className: "text-emerald-600 dark:text-emerald-400",
    border: "border-l-2 border-l-transparent",
  },
  encerrado: {
    label: "encerrado",
    className: "text-gray-400 dark:text-gray-500",
    border: "border-l-2 border-l-transparent",
  },
  sem_handoff: {
    label: "—",
    className: "text-gray-400 dark:text-gray-500",
    border: "border-l-2 border-l-transparent",
  },
};

const BROKER_STATUS_LABEL: Record<string, string> = {
  nao_atribuido: "não atribuído",
  aguardando_corretor: "aguardando",
  atribuido: "atribuído",
  em_atendimento: "em atendimento",
  encerrado: "encerrado",
};

export default function HandoffFeedTable() {
  const [events, setEvents] = useState<HandoffEvent[] | null>(null);
  const [error, setError] = useState(false);
  const hasEvents = useRef(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/observabilidade/handoffs")
        .then((r) => {
          if (!r.ok) throw new Error(`status ${r.status}`);
          return r.json();
        })
        .then((d: { events: HandoffEvent[] }) => {
          hasEvents.current = true;
          setEvents(d.events);
        })
        .catch(() => {
          if (!hasEvents.current) setError(true);
        });
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Handoffs indisponíveis.
      </div>
    );
  }

  if (!events) return <SkeletonFeedRows rows={6} />;

  const orphanCount = events.filter((e) => e.handoff_state === "órfão").length;
  const waitingCount = events.filter((e) => e.handoff_state === "aguardando").length;
  const activeCount = events.filter((e) => e.handoff_state === "ativo").length;

  return (
    <div className="space-y-3">
      {/* continuity summary */}
      {events.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {events.length} deal{events.length !== 1 ? "s" : ""}
          </span>
          {orphanCount > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              {orphanCount} órfão{orphanCount !== 1 ? "s" : ""}
            </span>
          )}
          {waitingCount > 0 && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              {waitingCount} aguardando
            </span>
          )}
          {activeCount > 0 && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
              {activeCount} ativo{activeCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Continuidade de entrega
          </p>
        </div>

        {events.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            Nenhum deal com handoff registrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800/80">
                  {HEADERS.map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 ${
                        h === "tempo" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const cfg = HANDOFF_CONFIG[e.handoff_state];
                  return (
                    <tr
                      key={e.runtime_trace_id}
                      className={`border-b border-gray-50 transition-colors hover:bg-gray-50/60 dark:border-gray-800/60 dark:hover:bg-gray-800/30 ${cfg.border}`}
                    >
                      {/* sinal */}
                      <td className="px-4 py-2.5">
                        <CognitiveSeverityBadge severity={e.severity} />
                      </td>

                      {/* entrega */}
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className={`text-xs ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </td>

                      {/* corretor — status + truncated broker_id */}
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {e.broker_status
                              ? (BROKER_STATUS_LABEL[e.broker_status] ?? e.broker_status)
                              : "—"}
                          </span>
                          {e.assigned_broker_id && (
                            <span className="font-mono text-xs text-gray-300 dark:text-gray-600">
                              {e.assigned_broker_id.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                      </td>

                      {/* estado */}
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                          {e.runtime_state ?? "—"}
                        </span>
                      </td>

                      {/* deal — links to kanban with ?deal= for future detail page */}
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <Link
                          href={`/cockpit/jurema?deal=${e.deal_id}`}
                          className="font-mono text-xs text-gray-500 hover:text-blue-600 hover:underline dark:text-gray-400 dark:hover:text-blue-400"
                          title={e.deal_id}
                        >
                          {e.deal_id.slice(0, 8)}…
                        </Link>
                      </td>

                      {/* sessão → replay */}
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {e.conversation_id ? (
                          <Link
                            href={`/cockpit/observabilidade/sessoes/${e.conversation_id}/replay`}
                            className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
                            title={e.conversation_id}
                          >
                            {e.conversation_id.slice(0, 8)}…
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>

                      {/* tempo */}
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className="tabular-nums text-xs text-gray-400 dark:text-gray-500"
                          title={e.last_trace_at}
                        >
                          {relativeTime(e.last_trace_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
