export default function ObjectiveStateBadge({
  objective,
}: {
  objective: string | null;
}) {
  if (!objective)
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
    );
  return (
    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
      {objective}
    </span>
  );
}
