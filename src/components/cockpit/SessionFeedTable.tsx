"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SessionSummary } from "@/lib/cockpit/types";
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
  "sessão",
  "estado",
  "objetivo",
  "sinal",
  "latência",
  "traços",
  "tempo",
] as const;

export default function SessionFeedTable() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState(false);
  const hasSessions = useRef(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/observabilidade/sessoes")
        .then((r) => {
          if (!r.ok) throw new Error(`status ${r.status}`);
          return r.json();
        })
        .then((d: { sessions: SessionSummary[] }) => {
          hasSessions.current = true;
          setSessions(d.sessions);
        })
        .catch(() => {
          if (!hasSessions.current) setError(true);
        });
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Catálogo de sessões indisponível.
      </div>
    );
  }

  if (!sessions) return <SkeletonFeedRows rows={6} />;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Sessões cognitivas
        </p>
        {sessions.length > 0 && (
          <span className="tabular-nums text-xs text-gray-400 dark:text-gray-500">
            {sessions.length} sessão{sessions.length !== 1 ? "ões" : ""}
          </span>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhuma sessão cognitiva registrada.
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
                      h === "tempo" || h === "traços" ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {sessions.map((s) => (
                <tr
                  key={s.conversation_id}
                  className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/30"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/cockpit/observabilidade/sessoes/${s.conversation_id}`}
                      className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
                      title={s.conversation_id}
                    >
                      {s.conversation_id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                      {s.runtime_state ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {s.objective_state ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <CognitiveSeverityBadge severity={s.worst_severity} />
                  </td>
                  <td className="px-4 py-2.5">
                    <LatencyBadge ms={s.avg_latency_ms} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
                      {s.trace_count}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className="tabular-nums text-xs text-gray-400 dark:text-gray-500"
                      title={s.last_trace_at}
                    >
                      {relativeTime(s.last_trace_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
