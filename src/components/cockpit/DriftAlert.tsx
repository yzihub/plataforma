"use client";

import { useEffect, useState } from "react";
import type { CognitiveHealthData } from "@/lib/cockpit/types";

function formatSignals(data: CognitiveHealthData): string {
  const parts: string[] = [];
  if (data.loops_detectados > 0) {
    const n = data.loops_detectados;
    parts.push(`${n} loop${n > 1 ? "s" : ""} cognitivo${n > 1 ? "s" : ""}`);
  }
  if (data.fallbacks > 0) {
    const n = data.fallbacks;
    parts.push(`${n} recuo${n > 1 ? "s" : ""} de fallback`);
  }
  if (data.erros > 0) {
    const n = data.erros;
    parts.push(`${n} erro${n > 1 ? "s" : ""} de execução`);
  }
  if (data.transicoes_irregulares > 0) {
    const n = data.transicoes_irregulares;
    parts.push(`${n} transição${n > 1 ? "ões" : ""} irregular${n > 1 ? "es" : ""}`);
  }
  return parts.join(" · ");
}

export default function DriftAlert() {
  const [data, setData] = useState<CognitiveHealthData | null>(null);

  useEffect(() => {
    fetch("/api/observabilidade/health")
      .then((r) => r.json())
      .then((d: CognitiveHealthData) => setData(d))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const hasAnomaly =
    data.loops_detectados > 0 ||
    data.fallbacks > 0 ||
    data.erros > 0 ||
    data.transicoes_irregulares > 0;

  if (!hasAnomaly) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/10">
      <span className="mt-0.5 text-sm leading-none text-amber-500 dark:text-amber-400">
        ▲
      </span>
      <div>
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Estado cognitivo requer atenção · últimas 24h
        </p>
        <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400/80">
          {formatSignals(data)}
        </p>
      </div>
    </div>
  );
}
