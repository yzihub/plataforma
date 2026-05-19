export default function LatencyBadge({ ms }: { ms: number | null }) {
  if (ms === null)
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
    );

  // normal (<400ms) → neutro, irregular (400–800ms) → amarelo, crítico (>800ms) → vermelho
  const className =
    ms < 400
      ? "text-gray-500 dark:text-gray-400"
      : ms < 800
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <span className={`font-mono text-xs font-medium ${className}`}>{ms}ms</span>
  );
}
