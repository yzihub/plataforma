"use client";

import { useEffect, useRef, useState } from "react";
import type { CognitiveFeedRow } from "@/lib/cockpit/types";
import CognitiveSeverityBadge from "./CognitiveSeverityBadge";
import StateTransitionBadge from "./StateTransitionBadge";
import ObjectiveStateBadge from "./ObjectiveStateBadge";
import RetrievalPolicyBadge from "./RetrievalPolicyBadge";
import LatencyBadge from "./LatencyBadge";
import ConversationAnchor from "./ConversationAnchor";
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
  "transição",
  "objetivo",
  "recuperação",
  "latência",
  "sessão",
  "tempo",
] as const;

export default function CognitiveFeedTable() {
  const [rows, setRows] = useState<CognitiveFeedRow[] | null>(null);
  const [error, setError] = useState(false);
  const hasRows = useRef(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/observabilidade/feed")
        .then((r) => {
          if (!r.ok) throw new Error(`status ${r.status}`);
          return r.json();
        })
        .then((d: { rows: CognitiveFeedRow[] }) => {
          hasRows.current = true;
          setRows(d.rows);
        })
        .catch(() => {
          if (!hasRows.current) setError(true);
        });
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Feed operacional indisponível.
      </div>
    );
  }

  if (!rows) return <SkeletonFeedRows />;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Feed cognitivo
        </p>
        {rows.length > 0 && (
          <span className="tabular-nums text-xs text-gray-400 dark:text-gray-500">
            {rows.length} traço{rows.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhum trace cognitivo recente.
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
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {rows.map((row) => (
                <tr
                  key={row.runtime_trace_id}
                  className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/30"
                >
                  <td className="px-4 py-2.5">
                    <CognitiveSeverityBadge severity={row.severity} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <StateTransitionBadge
                      from={row.previous_runtime_state}
                      to={row.runtime_state}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <ObjectiveStateBadge objective={row.objective_state} />
                  </td>
                  <td className="px-4 py-2.5">
                    <RetrievalPolicyBadge policy={row.retrieval_policy} />
                  </td>
                  <td className="px-4 py-2.5">
                    <LatencyBadge ms={row.latency_ms} />
                  </td>
                  <td className="px-4 py-2.5">
                    <ConversationAnchor conversationId={row.conversation_id} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className="tabular-nums text-xs text-gray-400 dark:text-gray-500"
                      title={row.created_at}
                    >
                      {relativeTime(row.created_at)}
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
