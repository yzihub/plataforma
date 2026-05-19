"use client";

import { useEffect, useRef, useState } from "react";
import type { CognitiveHealthData } from "@/lib/cockpit/types";
import SkeletonHealthStrip from "./SkeletonHealthStrip";

interface KpiConfig {
  key: keyof CognitiveHealthData;
  label: string;
  unit?: string;
  accent: (value: number | null) => string;
}

// Cor reativa ao dado: cada sinal muda de cor conforme o valor observado.
// nominal → neutro / irregular → âmbar / crítico → vermelho / contextual → azul
const STRIP: KpiConfig[] = [
  {
    key: "conversas_ativas",
    label: "Sessões Ativas",
    accent: () => "text-blue-600 dark:text-blue-400",
  },
  {
    key: "loops_detectados",
    label: "Loops Cognitivos",
    accent: (v) =>
      v !== null && v > 0
        ? "text-red-600 dark:text-red-400"
        : "text-gray-500 dark:text-gray-400",
  },
  {
    key: "fallbacks",
    label: "Recuos de Fallback",
    accent: (v) =>
      v !== null && v > 0
        ? "text-amber-600 dark:text-amber-400"
        : "text-gray-500 dark:text-gray-400",
  },
  {
    key: "erros",
    label: "Erros de Execução",
    accent: (v) =>
      v !== null && v > 0
        ? "text-red-600 dark:text-red-400"
        : "text-gray-500 dark:text-gray-400",
  },
  {
    key: "latencia_media_ms",
    label: "Latência Cognitiva",
    unit: "ms",
    accent: (v) => {
      if (v === null) return "text-gray-400 dark:text-gray-500";
      if (v < 400) return "text-gray-500 dark:text-gray-400";
      if (v < 800) return "text-amber-600 dark:text-amber-400";
      return "text-red-600 dark:text-red-400";
    },
  },
  {
    key: "recuperacoes_ativas",
    label: "Rec. de Memória",
    accent: (v) =>
      v !== null && v > 0
        ? "text-blue-600 dark:text-blue-400"
        : "text-gray-500 dark:text-gray-400",
  },
];

export default function CognitiveHealthStrip() {
  const [data, setData] = useState<CognitiveHealthData | null>(null);
  const [error, setError] = useState(false);
  const hasData = useRef(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/observabilidade/health")
        .then((r) => {
          if (!r.ok) throw new Error(`status ${r.status}`);
          return r.json();
        })
        .then((d: CognitiveHealthData) => {
          hasData.current = true;
          setData(d);
        })
        .catch(() => {
          if (!hasData.current) setError(true);
        });
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Sinais de saúde cognitiva indisponíveis.
      </div>
    );
  }

  if (!data) return <SkeletonHealthStrip />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {STRIP.map(({ key, label, unit, accent }) => {
        const raw = data[key] as number | null;
        const display =
          raw === null || raw === undefined
            ? "—"
            : unit
              ? `${raw}${unit}`
              : String(raw);
        return (
          <div
            key={key}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${accent(raw)}`}>
              {display}
            </p>
          </div>
        );
      })}
    </div>
  );
}
