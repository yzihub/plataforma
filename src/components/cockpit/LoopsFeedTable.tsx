"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LoopEvent } from "@/lib/cockpit/types";
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
  "estado",
  "objetivo",
  "repetições",
  "latência",
  "sessão",
  "tempo",
] as const;

const SEVERITY_LEFT_BORDER: Record<string, string> = {
  critical: "border-l-2 border-l-red-400 dark:border-l-red-600",
  warning: "border-l-2 border-l-amber-400 dark:border-l-amber-600",
  info: "border-l-2 border-l-blue-400 dark:border-l-blue-600",
  nominal: "border-l-2 border-l-transparent",
};

function RepetitionBadge({ count }: { count: number }) {
  if (count <= 1) {
    return (
      <span className="tabular-nums text-xs text-gray-400 dark:text-gray-500">
        1×
      </span>
    );
  }
  const accent =
    count >= 5
      ? "text-red-600 dark:text-red-400 font-semibold"
      : count >= 3
        ? "text-amber-600 dark:text-amber-400 font-medium"
        : "text-amber-500 dark:text-amber-500";
  return (
    <span className={`tabular-nums text-xs ${accent}`}>{count}×</span>
  );
}

export default function LoopsFeedTable() {
  const [events, setEvents] = useState<LoopEvent[] | null>(null);
  const [error, setError] = useState(false);
  const hasEvents = useRef(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/observabilidade/loops")
        .then((r) => {
          if (!r.ok) throw new Error(`status ${r.status}`);
          return r.json();
        })
        .then((d: { events: LoopEvent[] }) => {
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
        Loops indisponíveis.
      </div>
    );
  }

  if (!events) return <SkeletonFeedRows rows={6} />;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Repetições operacionais
        </p>
        {events.length > 0 && (
          <span className="tabular-nums text-xs text-gray-400 dark:text-gray-500">
            {events.length} ocorrência{events.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhuma repetição operacional detectada.
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
                      h === "tempo" || h === "repetições" || h === "latência"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const border =
                  SEVERITY_LEFT_BORDER[e.severity] ??
                  SEVERITY_LEFT_BORDER.nominal;
                return (
                  <tr
                    key={e.runtime_trace_id}
                    className={`border-b border-gray-50 transition-colors hover:bg-gray-50/60 dark:border-gray-800/60 dark:hover:bg-gray-800/30 ${border}`}
                  >
                    <td className="px-4 py-2.5">
                      <CognitiveSeverityBadge severity={e.severity} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                        {e.runtime_state ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {e.objective_state ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <RepetitionBadge count={e.repetition_count} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <LatencyBadge ms={e.latency_ms} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <Link
                        href={`/cockpit/observabilidade/sessoes/${e.conversation_id}/replay`}
                        className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
                        title={e.conversation_id}
                      >
                        {e.conversation_id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className="tabular-nums text-xs text-gray-400 dark:text-gray-500"
                        title={e.created_at}
                      >
                        {relativeTime(e.created_at)}
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
  );
}
