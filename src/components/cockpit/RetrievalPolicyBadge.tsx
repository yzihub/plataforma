const POLICY: Record<string, { label: string; className: string }> = {
  disabled: {
    label: "desativada",
    className: "text-gray-400 dark:text-gray-500",
  },
  lazy: {
    label: "lazy",
    className: "text-blue-600 dark:text-blue-400",
  },
  required: {
    label: "obrigatória",
    className: "text-amber-700 dark:text-amber-400",
  },
};

export default function RetrievalPolicyBadge({
  policy,
}: {
  policy: string | null;
}) {
  if (!policy)
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
    );

  const cfg = POLICY[policy] ?? {
    label: policy,
    className: "text-gray-500 dark:text-gray-400",
  };
  return (
    <span className={`text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
  );
}
