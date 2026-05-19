"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SessionDetail } from "@/lib/cockpit/types";
import CognitiveSeverityBadge from "./CognitiveSeverityBadge";
import StateTransitionBadge from "./StateTransitionBadge";
import LatencyBadge from "./LatencyBadge";

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

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold tabular-nums ${accent ?? "text-gray-700 dark:text-gray-200"}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function SessionDetailPanel({
  conversationId,
}: {
  conversationId: string;
}) {
  const [data, setData] = useState<SessionDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/observabilidade/sessoes/${conversationId}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((d: SessionDetail | null) => { if (d) setData(d); })
      .catch(() => setError(true));
  }, [conversationId]);

  const backLink = (
    <Link
      href="/cockpit/observabilidade/sessoes"
      className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
    >
      ← Sessões
    </Link>
  );

  if (notFound) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Sessão não encontrada.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Detalhe da sessão indisponível.
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="mt-3 h-7 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
      </div>
    );
  }

  const latAvg = data.avg_latency_ms;
  const latAccent =
    latAvg === null
      ? "text-gray-400 dark:text-gray-500"
      : latAvg < 400
        ? "text-gray-500 dark:text-gray-400"
        : latAvg < 800
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {backLink}
          <h1 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
            Sessão{" "}
            <span className="font-mono text-lg font-semibold text-gray-500 dark:text-gray-400">
              {conversationId.slice(0, 8)}…
            </span>
          </h1>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500" title={conversationId}>
            {conversationId}
          </p>
        </div>
        <Link
          href={`/cockpit/observabilidade/sessoes/${conversationId}/replay`}
          className="mt-2 shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
        >
          Abrir replay causal
        </Link>
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Estado atual"
          value={data.current_runtime_state ?? "—"}
          accent="text-gray-700 dark:text-gray-200"
        />
        <StatCard
          label="Objetivo atual"
          value={data.current_objective_state ?? "—"}
          accent="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="Traços"
          value={String(data.trace_count)}
          accent="text-gray-500 dark:text-gray-400"
        />
        <StatCard
          label="Loops"
          value={String(data.loop_count)}
          accent={
            data.loop_count > 0
              ? "text-red-600 dark:text-red-400"
              : "text-gray-500 dark:text-gray-400"
          }
        />
        <StatCard
          label="Fallbacks"
          value={String(data.fallback_count)}
          accent={
            data.fallback_count > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-gray-500 dark:text-gray-400"
          }
        />
        <StatCard
          label="Latência média"
          value={latAvg !== null ? `${latAvg}ms` : "—"}
          accent={latAccent}
        />
      </div>

      {/* recent transitions */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Transições recentes
          </p>
          <span className="tabular-nums text-xs text-gray-400 dark:text-gray-500">
            {data.irregular_transitions > 0
              ? `${data.irregular_transitions} irregular${data.irregular_transitions !== 1 ? "es" : ""}`
              : "todas regulares"}
          </span>
        </div>
        {data.recent_transitions.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
            Nenhuma transição registrada.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-50 dark:border-gray-800/80">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 dark:text-gray-500">
                  transição
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 dark:text-gray-500">
                  objetivo
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 dark:text-gray-500">
                  sinal
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 dark:text-gray-500">
                  tempo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {data.recent_transitions.map((t) => (
                <tr
                  key={t.runtime_trace_id}
                  className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/30"
                >
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <StateTransitionBadge from={t.from} to={t.to} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t.objective_state ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <CognitiveSeverityBadge severity={t.severity} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className="tabular-nums text-xs text-gray-400 dark:text-gray-500"
                      title={t.created_at}
                    >
                      {relativeTime(t.created_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* footer meta */}
      <div className="flex items-center gap-6 text-xs text-gray-400 dark:text-gray-500">
        {data.lead_id && (
          <span>
            lead{" "}
            <span className="font-mono text-gray-500 dark:text-gray-400">
              {data.lead_id.slice(0, 8)}…
            </span>
          </span>
        )}
        {data.deal_id && (
          <span>
            deal{" "}
            <span className="font-mono text-gray-500 dark:text-gray-400">
              {data.deal_id.slice(0, 8)}…
            </span>
          </span>
        )}
        <span className="ml-auto" title={data.last_trace_at}>
          última atividade {relativeTime(data.last_trace_at)}
        </span>
      </div>
    </div>
  );
}
