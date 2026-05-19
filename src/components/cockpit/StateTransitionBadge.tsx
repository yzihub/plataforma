interface Props {
  from: string | null;
  to: string | null;
}

export default function StateTransitionBadge({ from, to }: Props) {
  const prev = from ?? "—";
  const curr = to ?? "—";
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs">
      <span className="text-gray-400 dark:text-gray-500">{prev}</span>
      <span className="text-gray-300 dark:text-gray-600">→</span>
      <span className="font-medium text-gray-700 dark:text-gray-200">{curr}</span>
    </span>
  );
}
