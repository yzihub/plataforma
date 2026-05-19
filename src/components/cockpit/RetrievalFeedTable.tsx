"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RetrievalEvent } from "@/lib/cockpit/types";
import CognitiveSeverityBadge from "./CognitiveSeverityBadge";
import RetrievalPolicyBadge from "./RetrievalPolicyBadge";
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
  "política",
  "objetivo",
  "estado",
  "sinal",
  "latência",
  "sessão",
  "tempo",
] as const;

// Left-border by retrieval_policy — policy is the primary signal on this board.
const POLICY_LEFT_BORDER: Record<string, string> = {
  required: "border-l-2 border-l-amber-400 dark:border-l-amber-600",
  lazy: "border-l-2 border-l-blue-400 dark:border-l-blue-600",
  disabled: "border-l-2 border-l-transparent",
};

function policyBorder(policy: string | null): string {
  if (!policy) return "border-l-2 border-l-transparent";
  return POLICY_LEFT_BORDER[policy] ?? "border-l-2 border-l-gray-200 dark:border-l-gray-700";
}

export default function RetrievalFeedTable() {
  const [events, setEvents] = useState<RetrievalEvent[] | null>(null);
  const [error, setError] = useState(false);
  const hasEvents = useRef(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/observabilidade/retrieval")
        .then((r) => {
          if (!r.ok) throw new Error(`status ${r.status}`);
          return r.json();
        })
        .then((d: { events: RetrievalEvent[] }) => {
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
        Retrieval indisponível.
      </div>
    );
  }

  if (!events) return <SkeletonFeedRows rows={6} />;

  const requiredCount = events.filter((e) => e.retrieval_policy === "required").length;
  const lazyCount = events.filter((e) => e.retrieval_policy === "lazy").length;

  return (
    <div className="space-y-3">
      {/* policy summary */}
      {events.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {events.length} evento{events.length !== 1 ? "s" : ""}
          </span>
          {requiredCount > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              {requiredCount} obrigatória{requiredCount !== 1 ? "s" : ""}
            </span>
          )}
          {lazyCount > 0 && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              {lazyCount} lazy
            </span>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Eventos de recuperação de memória
          </p>
        </div>

        {events.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            Nenhum evento de recuperação registrado.
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
                        h === "tempo" || h === "latência" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr
                    key={e.runtime_trace_id}
                    className={`border-b border-gray-50 transition-colors hover:bg-gray-50/60 dark:border-gray-800/60 dark:hover:bg-gray-800/30 ${policyBorder(e.retrieval_policy)}`}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <RetrievalPolicyBadge policy={e.retrieval_policy} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {e.objective_state ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                        {e.runtime_state ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <CognitiveSeverityBadge severity={e.severity} />
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
