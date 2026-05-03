"use client";

import { useState, useEffect } from "react";
import {
  BoltIcon,
  ChatIcon,
  CheckCircleIcon,
  TableIcon,
  DocsIcon,
} from "@/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentMetricsResponse = {
  ok: true;
  tenant_id: string;
  generated_at: string;
  totals: {
    events_total: number;
    events_24h: number;
    events_7d: number;
    deals_total: number;
    deals_qualified: number;
    deals_in_corretor_stage: number;
  };
  by_event_type: Array<{
    event_type: string;
    count: number;
    count_24h: number;
    count_7d: number;
  }>;
  recent_events: Array<{
    id: string;
    agent_name: string;
    event_type: string;
    project_id: string | null;
    created_at: string;
  }>;
};

// ─── KPI Card (read-only) ────────────────────────────────────────────────────

type KpiCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  iconBg: string;
};

function KpiCard({ label, value, icon, accent, iconBg }: KpiCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <span className={`size-5 flex items-center justify-center ${accent}`}>
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium leading-tight truncate text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="text-xl font-bold leading-tight mt-0.5 text-gray-800 dark:text-white/90">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── AgentMetricsClient ───────────────────────────────────────────────────────

export default function AgentMetricsClient() {
  const [data, setData] = useState<AgentMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/observabilidade/agent-metrics");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error ?? `Erro ${res.status} ao carregar métricas`
          );
        }

        const json: AgentMetricsResponse = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Erro desconhecido"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* KPI strip skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[72px] rounded-2xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
        {/* Table skeletons */}
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-3"
          >
            <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="h-3 w-5/6 bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="h-3 w-4/6 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 p-6">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          Erro ao carregar métricas
        </p>
        <p className="mt-1 text-xs text-red-500 dark:text-red-300">{error}</p>
      </div>
    );
  }

  // ── Empty state (no events in last 30 days) ───────────────────────────────
  if (data && data.totals.events_total === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nenhum evento registrado nos últimos 30 dias para o agente Jurema.
          Quando a Ju começar a receber mensagens, eles aparecerão aqui.
        </p>
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Tenant: {data.tenant_id.slice(0, 8)}…
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { totals, by_event_type, recent_events, generated_at, tenant_id } =
    data;

  return (
    <div className="space-y-6">
      {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Eventos (30d)"
          value={totals.events_total}
          icon={<TableIcon />}
          accent="text-gray-500 dark:text-gray-400"
          iconBg="bg-gray-100 dark:bg-gray-800"
        />
        <KpiCard
          label="Eventos (7d)"
          value={totals.events_7d}
          icon={<BoltIcon />}
          accent="text-blue-500 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <KpiCard
          label="Eventos (24h)"
          value={totals.events_24h}
          icon={<BoltIcon />}
          accent="text-amber-500 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
        <KpiCard
          label="Deals totais"
          value={totals.deals_total}
          icon={<DocsIcon />}
          accent="text-gray-500 dark:text-gray-400"
          iconBg="bg-gray-100 dark:bg-gray-800"
        />
        <KpiCard
          label="Qualificados (≥70)"
          value={totals.deals_qualified}
          icon={<CheckCircleIcon />}
          accent="text-emerald-500 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <KpiCard
          label="Em Corretor"
          value={totals.deals_in_corretor_stage}
          icon={<ChatIcon />}
          accent="text-purple-500 dark:text-purple-400"
          iconBg="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* ── Tabela: Eventos por tipo ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 uppercase tracking-wider mb-4">
          Eventos por tipo (últimos 30 dias)
        </h2>
        {by_event_type.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum tipo de evento registrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 pr-4">
                    Tipo
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    24h
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    7d
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 pl-2">
                    30d
                  </th>
                </tr>
              </thead>
              <tbody>
                {by_event_type.map((row) => (
                  <tr
                    key={row.event_type}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 pr-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {row.event_type}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-400">
                      {row.count_24h}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-400">
                      {row.count_7d}
                    </td>
                    <td className="py-3 pl-2 text-right font-medium text-gray-800 dark:text-white/90">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Tabela: Eventos recentes ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 uppercase tracking-wider mb-4">
          Eventos recentes (últimos 50)
        </h2>
        {recent_events.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum evento recente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 pr-4">
                    Quando
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    Agente
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    Tipo
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 pl-2">
                    Project ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent_events.map((ev) => (
                  <tr
                    key={ev.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                      {ev.agent_name}
                    </td>
                    <td className="py-3 px-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {ev.event_type}
                    </td>
                    <td className="py-3 pl-2 font-mono text-xs text-gray-400 dark:text-gray-500">
                      {ev.project_id?.slice(0, 8) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Rodapé ───────────────────────────────────────────────────────── */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
        Atualizado em {new Date(generated_at).toLocaleString("pt-BR")} &middot;
        Tenant: {tenant_id.slice(0, 8)}…
      </p>
    </div>
  );
}
