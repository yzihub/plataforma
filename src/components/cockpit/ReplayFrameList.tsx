"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReplayFrame, ReplayDirection } from "@/lib/cockpit/types";
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

const DIRECTION_CONFIG: Record<
  ReplayDirection,
  { label: string; symbol: string; className: string }
> = {
  "início": {
    label: "início",
    symbol: "•",
    className: "text-blue-500 dark:text-blue-400",
  },
  avanço: {
    label: "avanço",
    symbol: "→",
    className: "text-gray-400 dark:text-gray-500",
  },
  estável: {
    label: "estável",
    symbol: "–",
    className: "text-gray-300 dark:text-gray-600",
  },
  regressão: {
    label: "regressão",
    symbol: "↩",
    className: "text-amber-500 dark:text-amber-400",
  },
  loop: {
    label: "loop",
    symbol: "↺",
    className: "text-red-500 dark:text-red-400",
  },
};

const SEVERITY_LEFT_BORDER: Record<string, string> = {
  critical: "border-l-2 border-l-red-400 dark:border-l-red-600",
  warning: "border-l-2 border-l-amber-400 dark:border-l-amber-600",
  info: "border-l-2 border-l-blue-400 dark:border-l-blue-600",
  nominal: "border-l-2 border-l-transparent",
};

function ReplayFrameRow({ frame }: { frame: ReplayFrame }) {
  const dir = DIRECTION_CONFIG[frame.direction];
  const border = SEVERITY_LEFT_BORDER[frame.severity] ?? SEVERITY_LEFT_BORDER.nominal;

  const hasAnomaly = frame.loop_detected || frame.fallback_triggered;

  return (
    <div
      className={`flex items-start gap-4 px-4 py-3 transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/30 ${border}`}
    >
      {/* sequence + direction */}
      <div className="flex w-10 shrink-0 flex-col items-center gap-0.5 pt-0.5">
        <span className="tabular-nums text-xs text-gray-300 dark:text-gray-600">
          {frame.sequence}
        </span>
        <span className={`text-xs font-medium ${dir.className}`} title={dir.label}>
          {dir.symbol}
        </span>
      </div>

      {/* state transition */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* prev → curr */}
          <span className="inline-flex items-center gap-1 font-mono text-xs">
            <span className="text-gray-400 dark:text-gray-500">
              {frame.previous_runtime_state ?? "—"}
            </span>
            <span className="text-gray-300 dark:text-gray-600">→</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {frame.runtime_state ?? "—"}
            </span>
          </span>

          {/* objective change */}
          {(frame.previous_objective_state !== frame.objective_state ||
            frame.objective_state) && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {frame.previous_objective_state &&
              frame.previous_objective_state !== frame.objective_state ? (
                <>
                  <span className="text-gray-300 dark:text-gray-600">
                    {frame.previous_objective_state}
                  </span>
                  <span className="mx-1 text-gray-300 dark:text-gray-600">→</span>
                </>
              ) : null}
              {frame.objective_state && (
                <span className="text-gray-500 dark:text-gray-400">
                  {frame.objective_state}
                </span>
              )}
            </span>
          )}
        </div>

        {/* anomaly flags */}
        {hasAnomaly && (
          <div className="mt-1 flex items-center gap-2">
            {frame.loop_detected && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                loop detectado
              </span>
            )}
            {frame.fallback_triggered && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                fallback
              </span>
            )}
          </div>
        )}

        {/* retrieval */}
        {frame.retrieval_allowed === true && frame.retrieval_policy && (
          <div className="mt-1">
            <span className="text-xs text-blue-500 dark:text-blue-400">
              recuperação · {frame.retrieval_policy}
            </span>
          </div>
        )}

        {/* next action */}
        {frame.next_action && (
          <div className="mt-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              → {frame.next_action}
            </span>
          </div>
        )}
      </div>

      {/* latency + time */}
      <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
        <LatencyBadge ms={frame.latency_ms} />
        <span
          className="tabular-nums text-xs text-gray-400 dark:text-gray-500"
          title={frame.created_at}
        >
          {relativeTime(frame.created_at)}
        </span>
      </div>
    </div>
  );
}

export default function ReplayFrameList({
  conversationId,
}: {
  conversationId: string;
}) {
  const [frames, setFrames] = useState<ReplayFrame[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/observabilidade/sessoes/${conversationId}/replay`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((d: { frames: ReplayFrame[] } | null) => {
        if (d) setFrames(d.frames);
      })
      .catch(() => setError(true));
  }, [conversationId]);

  const backLink = (
    <Link
      href={`/cockpit/observabilidade/sessoes/${conversationId}`}
      className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
    >
      ← Sessão {conversationId.slice(0, 8)}…
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
          Replay indisponível.
        </div>
      </div>
    );
  }

  if (!frames) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-gray-50 px-4 py-3 dark:border-gray-800/60"
            >
              <div className="h-4 w-6 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="ml-auto h-4 w-14 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const criticalCount = frames.filter((f) => f.severity === "critical").length;
  const warningCount = frames.filter((f) => f.severity === "warning").length;

  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        {backLink}
        <h1 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
          Replay Causal
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Reconstrução causal stateful ·{" "}
          <span className="font-mono text-xs">{conversationId.slice(0, 8)}…</span>
        </p>
      </div>

      {/* summary chips */}
      {frames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {frames.length} frame{frames.length !== 1 ? "s" : ""}
          </span>
          {criticalCount > 0 && (
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {criticalCount} crítico{criticalCount !== 1 ? "s" : ""}
            </span>
          )}
          {warningCount > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              {warningCount} irregular{warningCount !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      )}

      {/* frames */}
      {frames.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500">
          Nenhum frame cognitivo registrado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Linha do tempo cognitiva · ordem cronológica
            </p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {frames.map((frame) => (
              <ReplayFrameRow key={frame.runtime_trace_id} frame={frame} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
